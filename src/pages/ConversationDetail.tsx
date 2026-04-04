import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Clock, Hash, Bot, User, UserCheck, Send, Archive, AlertOctagon, Brain } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatPhoneDisplay } from "@/lib/formatters";
import GuidedTour from "@/components/GuidedTour";
import { CONVERSATION_DETAIL_STEPS, CONVERSATION_DETAIL_TOUR_KEY } from "@/lib/tour-steps";

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
  metadata?: {
    sentiment?: "positivo" | "neutro" | "negativo" | "frustrado";
    [key: string]: unknown;
  } | null;
}

interface Conversation {
  id: string;
  contact_name: string;
  contact_phone: string | null;
  channel: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  human_takeover: boolean;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Ativa", variant: "default" },
  resolved: { label: "Resolvida", variant: "secondary" },
  escalated: { label: "Escalada", variant: "destructive" },
};

const sentimentConfig: Record<string, { label: string; color: string }> = {
  positivo: { label: "Sentimento: Positivo", color: "bg-emerald-500" },
  neutro: { label: "Sentimento: Neutro", color: "bg-muted-foreground" },
  negativo: { label: "Sentimento: Negativo", color: "bg-amber-500" },
  frustrado: { label: "Sentimento: Frustrado", color: "bg-rose-500" },
};

export default function ConversationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [hasMemory, setHasMemory] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);

  const fetchConversation = useCallback(async (isInitial = false) => {
    if (!id) return;
    if (isInitial) setLoading(true);
    const [convRes, msgsRes] = await Promise.all([
      supabase.from("conversations").select("*").eq("id", id).single(),
      supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true }),
    ]);
    if (convRes.data) {
      setConversation({
        ...convRes.data,
        human_takeover: (convRes.data as any).human_takeover ?? false,
      });
    }
    const newMsgs = msgsRes.data ?? [];
    setMessages(newMsgs);
    // Auto-scroll only when new messages arrive
    if (newMsgs.length > prevMsgCount.current) {
      prevMsgCount.current = newMsgs.length;
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    if (isInitial) setLoading(false);
  }, [id]);

  // Initial load + polling every 5s for live conversation updates
  useEffect(() => {
    fetchConversation(true);
    const interval = setInterval(() => fetchConversation(false), 5000);
    return () => clearInterval(interval);
  }, [fetchConversation]);

  // Check if agent has memory of this contact
  useEffect(() => {
    if (!conversation?.contact_phone) return;
    const checkMemory = async () => {
      const { count } = await supabase
        .from("agent_memories")
        .select("id", { count: "exact", head: true })
        .eq("contact_phone", conversation.contact_phone!);
      setHasMemory((count ?? 0) > 0);
    };
    checkMemory();
  }, [conversation?.contact_phone]);

  const toggleHandover = async () => {
    if (!conversation || !id) return;
    setToggling(true);
    const newVal = !conversation.human_takeover;

    // Assumir: human_takeover → true (keep escalated status)
    // Devolver: human_takeover → false, status stays escalated (becomes log entry)
    //   Next message from contact will create a new active conversation (handled by webhook)
    const updateData: Record<string, unknown> = {
      human_takeover: newVal,
      takeover_by: newVal ? user?.id : null,
      takeover_at: newVal ? new Date().toISOString() : null,
    };

    // Only set status to escalated when assuming (in case it was active before)
    if (newVal) {
      updateData.status = "escalated";
    }

    const { error } = await supabase.from("conversations").update(updateData as any).eq("id", id);
    setToggling(false);

    if (!error) {
      const newStatus = newVal ? "escalated" : conversation.status;
      setConversation({ ...conversation, human_takeover: newVal, status: newStatus });
      if (newVal) {
        toast.success("Você assumiu a conversa");
      } else {
        toast.success("Conversa devolvida para a IA. Próxima mensagem do contato abrirá uma nova conversa.");
        navigate("/conversations");
      }
    } else {
      toast.error("Erro ao alterar modo");
    }
  };

  // Poll for new messages every 3s
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (data && data.length !== messages.length) {
        setMessages(data);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [id, messages.length]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async () => {
    if (!replyText.trim() || !conversation?.contact_phone || sending) return;
    setSending(true);

    try {
      // 1. Find connected instance for this tenant
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/evolution-api?action=send_message`;

      // Get instance name from whatsapp_instances
      const { data: tenant } = await supabase.from("tenants").select("id").eq("owner_id", user?.id).single();
      if (!tenant) throw new Error("Tenant não encontrado");

      const { data: instance } = await supabase
        .from("whatsapp_instances")
        .select("instance_name")
        .eq("tenant_id", tenant.id)
        .eq("status", "connected")
        .limit(1)
        .single();

      if (!instance) throw new Error("Nenhuma instância WhatsApp conectada");

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          instanceName: instance.instance_name,
          number: conversation.contact_phone,
          text: replyText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar");

      // 2. Save message in DB
      await supabase.from("messages").insert({
        conversation_id: id,
        role: "attendant",
        content: replyText.trim(),
      });

      setReplyText("");
      // Refresh messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (msgs) setMessages(msgs);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const duration = () => {
    if (!conversation) return "";
    const start = new Date(conversation.started_at).getTime();
    const end = conversation.ended_at ? new Date(conversation.ended_at).getTime() : Date.now();
    const mins = Math.floor((end - start) / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!conversation) {
    return <p className="text-center text-muted-foreground py-20">Conversa não encontrada</p>;
  }

  const st = statusMap[conversation.status] || statusMap.active;
  const isHuman = conversation.human_takeover;
  // Read-only: resolved always, escalated only when returned to agent (not during human takeover)
  const isReadOnly = conversation.status === "resolved" || (conversation.status === "escalated" && !conversation.human_takeover);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4" data-tour="conv-detail-header">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/conversations")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-lg font-display font-semibold truncate">{conversation.contact_name}</h1>
              <Badge variant={st.variant}>{st.label}</Badge>
              {hasMemory && (
                <Badge variant="outline" className="gap-1 pr-2.5 text-[10px] sm:text-[11px] font-medium border-cosmos-violet/30 text-cosmos-violet bg-cosmos-violet/10">
                  <Brain className="h-3 w-3" /> <span className="hidden sm:inline">Agente lembra deste contato</span><span className="sm:hidden">Lembra</span>
                </Badge>
              )}
              {!isReadOnly && (
                <Badge variant="outline" className={`gap-1 pr-2 sm:pr-3 text-[10px] sm:text-[11px] font-medium border ${isHuman ? "border-amber-500/30 text-amber-500 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/10" : "border-emerald-500/30 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/10"}`}>
                  {isHuman ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{isHuman ? "Atendimento Humano" : "IA Ativa"}</span>
                  <span className="sm:hidden">{isHuman ? "Humano" : "IA"}</span>
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground mt-1">
              {conversation.contact_phone && (
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {formatPhoneDisplay(conversation.contact_phone)}</span>
              )}
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {duration()}</span>
              <span className="flex items-center gap-1"><Hash className="h-3 w-3 capitalize" /> {conversation.channel}</span>
            </div>
          </div>
        </div>
        {!isReadOnly && (
          <Button
            data-tour="conv-detail-takeover"
            variant={isHuman ? "outline" : "default"}
            size="sm"
            onClick={toggleHandover}
            disabled={toggling}
            className={`gap-1.5 text-xs transition-colors shrink-0 self-end sm:self-auto ${
              !isHuman ? "bg-cosmos-indigo hover:bg-cosmos-indigo/90 text-white shadow-cosmos-sm hover:shadow-glow-indigo border-transparent" : "border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
            }`}
          >
            {isHuman ? <><Bot className="h-4 w-4" /> Devolver para Agente</> : <><UserCheck className="h-4 w-4" /> Assumir Conversa</>}
          </Button>
        )}
      </div>

      {/* Read-only banner */}
      {isReadOnly && (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium border ${
          conversation.status === "resolved"
            ? "bg-white/[0.02] border-white/[0.06] text-white/50"
            : "bg-red-500/[0.04] border-red-500/[0.1] text-red-400/70"
        }`}>
          {conversation.status === "resolved"
            ? <Archive className="h-4 w-4 shrink-0" />
            : <AlertOctagon className="h-4 w-4 shrink-0" />
          }
          {conversation.status === "resolved"
            ? "Conversa resolvida — historico de atendimento"
            : "Conversa escalada — historico de atendimento"
          }
        </div>
      )}

      {/* Chat */}
      <Card className="p-3 sm:p-4" data-tour="conv-detail-messages">
        <div className="space-y-4 max-h-[calc(100vh-300px)] sm:max-h-[calc(100vh-220px)] overflow-y-auto">
          {messages.map((msg) => {
            if (msg.role === "system") {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground font-mono">
                    {msg.content}
                  </span>
                </div>
              );
            }

            const isContact = msg.role === "contact";
            const sentiment = isContact && msg.metadata?.sentiment ? sentimentConfig[msg.metadata.sentiment] : null;
            return (
              <div key={msg.id} className={`flex ${isContact ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2.5 ${
                  isContact
                    ? "bg-muted text-foreground rounded-bl-md"
                    : "bg-primary text-primary-foreground rounded-br-md"
                }`}>
                  <p className="text-sm whitespace-pre-line">{msg.content.replace(/\[BREAK\]/g, "\n")}</p>
                  <p className={`mt-1 flex items-center gap-1.5 text-[10px] ${isContact ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                    {formatTime(msg.created_at)}
                    {sentiment && (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span data-tour="conv-detail-sentiment" className={`inline-block h-2 w-2 rounded-full ${sentiment.color}`} />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {sentiment.label}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhuma mensagem nesta conversa</p>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Reply input — visible only during human takeover on active conversations */}
        {isHuman && !isReadOnly && (
          <div className="flex items-center gap-2 pt-3 border-t border-border mt-2">
            <Input
              placeholder="Digite sua mensagem..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendReply();
                }
              }}
              disabled={sending}
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={sendReply}
              disabled={sending || !replyText.trim()}
              className="bg-cosmos-indigo hover:bg-cosmos-indigo/90 text-white shadow-cosmos-sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>

      <GuidedTour steps={CONVERSATION_DETAIL_STEPS} tourKey={CONVERSATION_DETAIL_TOUR_KEY} />
    </div>
  );
}

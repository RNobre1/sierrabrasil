import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Clock, Hash, Bot, User, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
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

export default function ConversationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetch = async () => {
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
      setMessages(msgsRes.data ?? []);
      setLoading(false);
    };

    fetch();
  }, [id]);

  const toggleHandover = async () => {
    if (!conversation || !id) return;
    setToggling(true);
    const newVal = !conversation.human_takeover;
    
    // Assumir ou devolver
    const updateData = {
      human_takeover: newVal,
      takeover_by: newVal ? user?.id : null,
      takeover_at: newVal ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from("conversations").update(updateData as any).eq("id", id);
    setToggling(false);
    
    if (!error) {
      setConversation({ ...conversation, human_takeover: newVal });
      toast.success(newVal ? "Você assumiu a conversa" : "Conversa devolvida para a IA");
    } else {
      toast.error("Erro ao alterar modo");
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/conversations")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-display font-semibold">{conversation.contact_name}</h1>
            <Badge variant={st.variant}>{st.label}</Badge>
            <Badge variant="outline" className={`gap-1 pr-3 text-[11px] font-medium border ${isHuman ? "border-amber-500/30 text-amber-500 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/10" : "border-emerald-500/30 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/10"}`}>
              {isHuman ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              {isHuman ? "Atendimento Humano" : "IA Ativa"}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            {conversation.contact_phone && (
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {conversation.contact_phone}</span>
            )}
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {duration()}</span>
            <span className="flex items-center gap-1"><Hash className="h-3 w-3 capitalize" /> {conversation.channel}</span>
          </div>
        </div>
        <Button
          variant={isHuman ? "outline" : "default"}
          size="sm"
          onClick={toggleHandover}
          disabled={toggling}
          className={`gap-1.5 text-xs transition-colors ${
            !isHuman ? "bg-cosmos-indigo hover:bg-cosmos-indigo/90 text-white shadow-cosmos-sm hover:shadow-glow-indigo border-transparent" : "border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
          }`}
        >
          {isHuman ? <><Bot className="h-4 w-4" /> Devolver para Agente</> : <><UserCheck className="h-4 w-4" /> Assumir Conversa</>}
        </Button>
      </div>

      {/* Chat */}
      <Card className="p-4">
        <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto">
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
            return (
              <div key={msg.id} className={`flex ${isContact ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isContact
                    ? "bg-muted text-foreground rounded-bl-md"
                    : "bg-primary text-primary-foreground rounded-br-md"
                }`}>
                  <p className="text-sm whitespace-pre-line">{msg.content.replace(/\[BREAK\]/g, "\n")}</p>
                  <p className={`mt-1 text-[10px] ${isContact ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhuma mensagem nesta conversa</p>
          )}
        </div>
      </Card>
    </div>
  );
}

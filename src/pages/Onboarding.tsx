import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Sparkles, Bot, User, Loader2, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-chat`;

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [configReady, setConfigReady] = useState(false);
  const [extractedConfig, setExtractedConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasStarted = useRef(false);

  // Auto-start the conversation
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    
    // Send initial empty message to trigger AI greeting
    setTimeout(() => {
      sendMessage("Olá! Acabei de criar minha conta e quero configurar meu atendente.");
    }, 500);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const checkForConfig = useCallback((text: string) => {
    const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.ready && parsed.config) {
          setExtractedConfig(parsed.config);
          setConfigReady(true);
          return true;
        }
      } catch {}
    }
    return false;
  }, []);

  const sendMessage = async (overrideInput?: string) => {
    const text = overrideInput || input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    
    // Don't show the auto-start message
    if (!overrideInput) {
      setMessages(prev => [...prev, userMsg]);
      setInput("");
    }
    setIsLoading(true);

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      const displayText = assistantSoFar.replace(/```json\s*\{[\s\S]*?\}\s*```/g, "").trim();
      
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: displayText } : m);
        }
        return [...prev, { role: "assistant", content: displayText }];
      });
    };

    try {
      const allMessages = overrideInput ? [userMsg] : [...messages, userMsg];
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          userName: profile?.full_name || "",
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        toast({ title: "Erro", description: errData.error || `Erro ${resp.status}`, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, idx);
          textBuffer = textBuffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Check if config was extracted
      checkForConfig(assistantSoFar);

    } catch (e) {
      console.error(e);
      toast({ title: "Erro de conexão", variant: "destructive" });
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  const applyConfig = async () => {
    if (!extractedConfig || !user) return;
    setSaving(true);

    try {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("owner_id", user.id).single();
      if (!tenant) throw new Error("Tenant not found");

      const { data: att } = await supabase.from("attendants").select("id").eq("tenant_id", tenant.id).limit(1).single();
      if (!att) throw new Error("Attendant not found");

      await supabase.from("attendants").update({
        name: extractedConfig.attendant_name || "Meu Atendente",
        persona: extractedConfig.persona || "",
        instructions: extractedConfig.instructions || "",
        channels: extractedConfig.channels || ["whatsapp", "web"],
        status: "online",
      }).eq("id", att.id);

      // Update tenant name if we got business info
      if (extractedConfig.instructions) {
        const bizMatch = extractedConfig.instructions.match(/SOBRE O NEG[ÓO]CIO[:\s]*([^\n]+)/i);
        if (bizMatch) {
          await supabase.from("tenants").update({ name: bizMatch[1].trim().slice(0, 50) }).eq("id", tenant.id);
        }
      }

      toast({ title: "Atendente configurado! 🎉", description: "Seu atendente já está online e pronto para atender." });
      navigate("/dashboard");
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-display font-semibold text-foreground">Configuração do seu Atendente</h1>
            <p className="text-xs text-muted-foreground">Conte sobre seu negócio e criaremos seu atendente IA</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-muted">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700"
            style={{ width: configReady ? "100%" : `${Math.min(90, messages.filter(m => m.role === "user").length * 15)}%` }}
          />
        </div>
      </header>

      {/* Chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className="flex items-start gap-2.5 max-w-[85%]">
                  {!isUser && (
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 mt-0.5 border border-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-3 ${
                    isUser
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-br-md shadow-lg shadow-primary/20"
                      : "bg-card border border-border text-foreground rounded-bl-md shadow-sm"
                  }`}>
                    <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                  </div>
                  {isUser && (
                    <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/40" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/40" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/40" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Config Ready CTA */}
          {configReady && extractedConfig && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <Check className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">Tudo pronto!</h3>
                    <p className="text-sm text-muted-foreground">Seu atendente <span className="font-medium text-foreground">{extractedConfig.attendant_name}</span> está configurado</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-card rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Persona</p>
                    <p className="font-medium text-foreground">{extractedConfig.persona}</p>
                  </div>
                  <div className="bg-card rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Canais</p>
                    <p className="font-medium text-foreground capitalize">{extractedConfig.channels?.join(", ")}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={applyConfig} disabled={saving} className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                    {saving ? "Ativando..." : "Ativar atendente e ir pro Dashboard"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      {!configReady && (
        <div className="border-t border-border bg-card/80 backdrop-blur-sm sticky bottom-0">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Descreva seu negócio, serviços, como quer que o atendente se comporte..."
                disabled={isLoading}
                rows={1}
                className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-xl border-border bg-background"
              />
              <Button
                onClick={() => sendMessage()}
                size="icon"
                disabled={isLoading || !input.trim()}
                className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Shift+Enter para nova linha · Enter para enviar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

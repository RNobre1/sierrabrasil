import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Sparkles, User, Loader2, Rocket, CheckCircle2, Bot, Play, ArrowLeft, Headphones, TrendingUp, ArrowRight, BookOpen, SkipForward } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SocialLinksSelector from "@/components/onboarding/SocialLinksSelector";
import ScrapingProgress from "@/components/onboarding/ScrapingProgress";
import { normalizeSocialUrl } from "@/lib/url-normalizer";

type Msg = { role: "user" | "assistant" | "system"; content: string };
type DisplayMsg = { role: "user" | "assistant"; content: string };

type Phase = "class-select" | "chat" | "saving" | "social-links" | "scraping" | "done";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const SCRAPE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-urls`;

const NEW_AGENT_SYSTEM_PROMPT = `## QUEM VOCE E
Voce e o assistente de criacao de agentes da plataforma O Agente (Meteora Digital).
Seu papel: conduzir uma conversa RAPIDA (4-5 mensagens) pra configurar um novo agente virtual.

## REGRAS
1. Respostas CURTAS: 2-3 frases no maximo.
2. UMA pergunta por mensagem. Nunca faca multiplas perguntas de uma vez.
3. Seja direto e objetivo — o usuario ja conhece a plataforma.
4. Use tom casual brasileiro: "pra", "ta", "ne", contracoes naturais.
5. Emojis com moderacao (0-2 por mensagem).

## FLUXO (siga nesta ordem)
1. Pergunte o NOME do agente (ex: "Qual vai ser o nome desse agente?")
2. Pergunte SOBRE O QUE ele vai atender (negocio, produto, servico)
3. Pergunte o TOM/PERSONALIDADE (formal, casual, amigavel, tecnico)
4. Pergunte se tem INSTRUCOES ESPECIFICAS (horarios, politicas, regras, precos)
5. Quando tiver tudo, gere o JSON de configuracao

## COMO FINALIZAR
Quando tiver coletado nome + descricao do negocio + tom + instrucoes (ou o usuario disser que nao tem mais nada), responda com uma mensagem confirmando os dados e INCLUA no final (INVISIVEL pro usuario) o bloco:

\`\`\`agent_config
{
  "name": "Nome do agente",
  "persona": "Descricao curta do tom/personalidade",
  "instructions": "Instrucoes completas compiladas do que foi dito"
}
\`\`\`

IMPORTANTE: O bloco agent_config deve vir DEPOIS do texto visivel. O usuario NAO deve ver o JSON.
Se o usuario pedir pra finalizar antes de voce ter todas as infos, tente preencher com o que tem.`;

// Recommend model based on agent class
function recommendModel(agentClass: string): string {
  if (agentClass === "sales") return "openai/gpt-4.1-mini";
  return "openai/gpt-4.1-mini";
}

export default function NewAgentOnboarding() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("class-select");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMsg[]>([]);
  const [chatHistory, setChatHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
  const [createdAgentName, setCreatedAgentName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantPlan, setTenantPlan] = useState("starter");
  const [agentCount, setAgentCount] = useState(0);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [scrapeUrls, setScrapeUrls] = useState<string[]>([]);
  const [scrapeResults, setScrapeResults] = useState<any[]>([]);
  const [scrapeComplete, setScrapeComplete] = useState(false);
  const scrapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior, block: "end" });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
        const scrollRoot = document.scrollingElement ?? document.documentElement;
        window.scrollTo({ top: scrollRoot.scrollHeight, behavior });
      });
    });
  }, []);

  useEffect(() => {
    scrollToBottom(messages.length > 2 ? "smooth" : "auto");
  }, [messages, isLoading, scrollToBottom]);

  // Fetch tenant info and check agent limit
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: t } = await supabase
        .from("tenants")
        .select("id, plan")
        .eq("owner_id", user.id)
        .single();
      if (!t) return;
      setTenantId(t.id);
      setTenantPlan(t.plan);
      const { count } = await supabase
        .from("attendants")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", t.id);
      setAgentCount(count ?? 0);
    })();
  }, [user]);

  const maxAgents = tenantPlan === "starter" ? 1 : tenantPlan === "professional" ? 3 : tenantPlan === "enterprise" ? 100 : 10;
  const canCreate = agentCount < maxAgents;

  // Streaming helper
  const streamChat = async (allMessages: Msg[], onChunk: (text: string) => void): Promise<string> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${resp.status}`);
      }
      if (!resp.body) throw new Error("No body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const rawLine of lines) {
          const line = rawLine.replace(/\r$/, "");
          if (!line || line.startsWith(":") || !line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              full += content;
              onChunk(full);
            }
          } catch { /* ignore malformed SSE chunks */ }
        }
      }

      return full;
    } finally {
      clearTimeout(timeout);
    }
  };

  // Clean display text — remove agent_config JSON block from visible text
  const cleanDisplay = (text: string) =>
    text
      .replace(/```agent_config\s*\{[\s\S]*?\}\s*```/g, "")
      .replace(/```json\s*\{[\s\S]*?\}\s*```/g, "")
      .trim();

  // Parse agent config from AI response
  const parseAgentConfig = (text: string): { name: string; persona: string; instructions: string } | null => {
    const match = text.match(/```agent_config\s*(\{[\s\S]*?\})\s*```/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.name) return parsed;
    } catch { /* ignore malformed JSON */ }
    return null;
  };

  // Handle class selection
  const handleClassSelect = (cls: string) => {
    setSelectedClass(cls);
    setPhase("chat");

    const className = cls === "sales" ? "Vendas" : "Suporte";
    const firstName = profile?.full_name?.split(" ")[0] || "";

    const greeting: DisplayMsg = {
      role: "assistant",
      content: firstName
        ? `Opa, ${firstName}! Vamos criar um agente de **${className}**. Qual vai ser o nome dele?`
        : `Vamos criar um agente de **${className}**! Qual vai ser o nome dele?`,
    };

    setMessages([greeting]);

    // Initialize chat history with system prompt + hidden context + greeting
    const systemMsg: Msg = { role: "system", content: NEW_AGENT_SYSTEM_PROMPT };
    const contextMsg: Msg = {
      role: "user",
      content: `[SISTEMA: O usuario escolheu um agente de ${className}. Ja cumprimente e pergunte o nome do agente. NAO repita a saudacao, ela ja foi mostrada.]`,
    };
    const assistantMsg: Msg = { role: "assistant", content: greeting.content };
    setChatHistory([systemMsg, contextMsg, assistantMsg]);
  };

  // Send message to AI
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: DisplayMsg = { role: "user", content: text };
    const userChatMsg: Msg = { role: "user", content: text };

    setMessages(prev => [...prev, userMsg]);
    const updatedHistory = [...chatHistory, userChatMsg];
    setChatHistory(updatedHistory);
    setInput("");
    setIsLoading(true);

    try {
      const fullText = await streamChat(updatedHistory, (chunk) => {
        const display = cleanDisplay(chunk);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: display } : m));
          }
          return [...prev, { role: "assistant", content: display }];
        });
      });

      const displayText = cleanDisplay(fullText);
      const assistantChatMsg: Msg = { role: "assistant", content: fullText };
      setChatHistory(prev => [...prev, assistantChatMsg]);

      // Update the last message with clean text
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: displayText } : m));
        }
        return prev;
      });

      // Check for agent_config marker
      const config = parseAgentConfig(fullText);
      if (config) {
        await saveAgent(config);
      }
    } catch (e: unknown) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "Erro desconhecido", variant: "destructive" });
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  // Save agent to database, then go to social-links phase
  const saveAgent = async (config: { name: string; persona: string; instructions: string }) => {
    if (!user || !tenantId || !selectedClass) return;
    setSaving(true);
    setPhase("saving");

    try {
      // Look up template_id
      const { data: tpl } = await supabase
        .from("agent_templates")
        .select("id")
        .eq("class", selectedClass)
        .limit(1)
        .single();

      const model = recommendModel(selectedClass);

      const { data: newAgent, error } = await supabase
        .from("attendants")
        .insert({
          tenant_id: tenantId,
          name: config.name,
          class: selectedClass,
          model,
          persona: config.persona,
          instructions: config.instructions,
          status: "online",
          active_skills: ["greeting", "escalation"],
          template_id: tpl?.id ?? null,
          channels: ["whatsapp"],
        })
        .select("id")
        .single();

      if (error) throw error;

      setCreatedAgentId(newAgent.id);
      setCreatedAgentName(config.name);
      setPhase("social-links");

      toast({ title: "Agente criado!", description: `Agora adicione redes sociais para turbinar ${config.name}.` });
    } catch (e: unknown) {
      toast({ title: "Erro ao criar agente", description: e instanceof Error ? e.message : "Erro desconhecido", variant: "destructive" });
      setPhase("chat");
    } finally {
      setSaving(false);
    }
  };

  // Handle social links submission — normalize URLs and start scraping
  const handleSocialLinksSubmit = (links: Record<string, string>) => {
    setSocialLinks(links);
    setScrapeResults([]);
    setScrapeComplete(false);

    const urls: string[] = [];
    Object.entries(links).forEach(([platform, val]) => {
      if (!val) return;
      const url = normalizeSocialUrl(platform, val);
      if (url) urls.push(url);
    });

    if (urls.length === 0) {
      setPhase("done");
      return;
    }

    setScrapeUrls(urls);
    setPhase("scraping");
    startScraping(urls);
  };

  // Start scraping in background
  const startScraping = async (urls: string[]) => {
    // Auto-transition after 30s regardless
    scrapeTimerRef.current = setTimeout(() => {
      setScrapeComplete(true);
      setPhase("done");
    }, 30000);

    try {
      const resp = await fetch(SCRAPE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          urls,
          tenantId,
          attendantId: createdAgentId,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (scrapeTimerRef.current) {
        clearTimeout(scrapeTimerRef.current);
        scrapeTimerRef.current = null;
      }

      setScrapeResults(data.results || []);
      setScrapeComplete(true);

      // Brief delay to show the completed state before transitioning
      setTimeout(() => {
        setPhase("done");
      }, 1500);
    } catch (e) {
      console.error("Scraping error:", e);
      if (scrapeTimerRef.current) {
        clearTimeout(scrapeTimerRef.current);
        scrapeTimerRef.current = null;
      }
      setScrapeComplete(true);
      setPhase("done");
    }
  };

  // Cleanup scrape timer on unmount
  useEffect(() => {
    return () => {
      if (scrapeTimerRef.current) clearTimeout(scrapeTimerRef.current);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const progressPct = phase === "done" ? 100
    : phase === "scraping" ? 85
    : phase === "social-links" ? 70
    : phase === "saving" ? 60
    : phase === "chat" ? Math.min(55, 20 + messages.filter(m => m.role === "user").length * 8)
    : 10;

  // Check limit before showing
  if (!canCreate && phase === "class-select") {
    return (
      <div className="min-h-screen bg-background flex flex-col touch-pan-x" style={{ overscrollBehavior: "none" }}>
        <OnboardingHeader title="Limite atingido" subtitle="Faca upgrade para criar mais agentes" progress={0} onBack={() => navigate("/agents")} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto border border-primary/20">
              <Bot className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground">Limite de agentes atingido</h2>
            <p className="text-sm text-muted-foreground">
              Seu plano atual permite ate <strong>{maxAgents}</strong> agente{maxAgents > 1 ? "s" : ""}. Faca upgrade para criar mais agentes.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/agents")}>Voltar</Button>
              <Button onClick={() => navigate("/integrations")}>Fazer Upgrade</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== CLASS SELECT PHASE ==========
  if (phase === "class-select") {
    const agentClasses = [
      {
        id: "support" as const,
        icon: <Headphones className="h-7 w-7" />,
        title: "Atendimento / Suporte",
        description: "FAQ, resolução de problemas, escalonamento, coleta de feedback e acompanhamento de chamados.",
        skills: ["Responder dúvidas frequentes", "Resolver problemas técnicos", "Escalonar para humanos", "Coletar feedback"],
      },
      {
        id: "sales" as const,
        icon: <TrendingUp className="h-7 w-7" />,
        title: "Vendas / Acompanhamento",
        description: "Qualificação de leads, follow-up, envio de propostas, fechamento de vendas e pós-venda.",
        skills: ["Qualificar leads", "Follow-up automático", "Enviar propostas", "Acompanhar pós-venda"],
      },
    ];

    return (
      <div className="min-h-screen bg-background flex flex-col touch-pan-x" style={{ overscrollBehavior: "none" }}>
        <OnboardingHeader title="Criar novo agente" subtitle="Configure um novo agente para seu negócio" progress={15} onBack={() => navigate("/agents")} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col items-center text-center space-y-8 px-4 py-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-3"
            >
              <h2 className="text-2xl font-display font-bold text-foreground leading-tight max-w-md mx-auto">
                Criar novo agente
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Configure um novo Agente de Inteligência Artificial para atender uma área diferente do seu negócio.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <p className="text-sm font-medium text-foreground">Escolha o perfil do agente:</p>
              <p className="text-xs text-muted-foreground">Você pode personalizar tudo depois.</p>
            </motion.div>

            <div className="grid gap-4 w-full max-w-lg sm:grid-cols-2">
              {agentClasses.map((cls, i) => (
                <motion.button
                  key={cls.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.12 }}
                  onClick={() => handleClassSelect(cls.id)}
                  className="group text-left rounded-2xl border border-border/40 bg-card/50 p-5 hover:border-primary/30 hover:bg-primary/5 active:scale-[0.97] transition-all duration-200 cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary/15 transition-colors">
                    {cls.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{cls.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{cls.description}</p>
                  <ul className="space-y-1">
                    {cls.skills.map(s => (
                      <li key={s} className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5">
                        <ArrowRight className="h-2.5 w-2.5 text-primary/60" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== SOCIAL LINKS PHASE ==========
  if (phase === "social-links") {
    return (
      <div className="min-h-screen bg-background flex flex-col touch-pan-x" style={{ overscrollBehavior: "none" }}>
        <OnboardingHeader
          title="Redes sociais do novo agente"
          subtitle="Adicione as redes sociais para turbinar a base de conhecimento deste agente"
          progress={progressPct}
        />
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-lg space-y-6 py-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-border bg-card/50 p-5"
            >
              <SocialLinksSelector onSubmit={handleSocialLinksSubmit} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center"
            >
              <Button
                variant="ghost"
                onClick={() => setPhase("done")}
                className="text-muted-foreground hover:text-foreground gap-2 text-sm"
              >
                <SkipForward className="h-4 w-4" />
                Pular — adicionar depois
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // ========== SCRAPING PHASE ==========
  if (phase === "scraping") {
    return (
      <div className="min-h-screen bg-background flex flex-col touch-pan-x" style={{ overscrollBehavior: "none" }}>
        <OnboardingHeader
          title="Vasculhando a web..."
          subtitle="Nossos robos estao trabalhando — relaxe e aproveite o show"
          progress={progressPct}
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-xl space-y-6">
            <ScrapingProgress urls={scrapeUrls} results={scrapeResults} isComplete={scrapeComplete} />
          </div>
        </div>
      </div>
    );
  }

  // ========== DONE PHASE ==========
  if (phase === "done" && createdAgentId) {
    const agentType = selectedClass === "sales" ? "vendas" : "suporte";
    const hasSocialLinks = Object.keys(socialLinks).length > 0;
    const achievements = [
      { icon: <CheckCircle2 className="h-4 w-4" />, text: `Agente de ${agentType} criado e configurado` },
      { icon: <Sparkles className="h-4 w-4" />, text: "Persona e instrucoes definidas pela conversa" },
      ...(hasSocialLinks
        ? [{ icon: <CheckCircle2 className="h-4 w-4" />, text: "Redes sociais processadas na base de conhecimento" }]
        : []),
      { icon: <Bot className="h-4 w-4" />, text: "Pronto para ser ativado e atender" },
    ];

    return (
      <div className="min-h-screen bg-background flex flex-col touch-pan-x" style={{ overscrollBehavior: "none" }}>
        <OnboardingHeader title="Agente criado!" subtitle="Seu novo agente esta pronto" progress={100} />
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-md space-y-8 text-center py-4">
            {/* Celebration header */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-cosmos-emerald/20 blur-xl" />
                <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-cosmos-emerald flex items-center justify-center shadow-lg shadow-primary/25">
                  <Rocket className="h-9 w-9 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-bold text-foreground">
                  {createdAgentName} esta pronto!
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Seu novo agente foi criado com sucesso. Configure os detalhes, adicione documentos a base de conhecimento e comece a atender.
                </p>
              </div>
            </motion.div>

            {/* Achievement list */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="space-y-2"
            >
              {achievements.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-cosmos-emerald/5 border border-cosmos-emerald/10 text-left"
                >
                  <span className="text-cosmos-emerald shrink-0">{a.icon}</span>
                  <span className="text-sm text-foreground">{a.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col gap-3"
            >
              <Button
                onClick={() => navigate(`/agents/detail?id=${createdAgentId}`)}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.97] transition-all duration-150 font-medium text-sm"
              >
                <Bot className="h-4 w-4 mr-2" /> Configurar agente
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate(`/agents/detail?id=${createdAgentId}&tab=knowledge`)}
                className="w-full h-10 rounded-xl text-xs gap-1.5 active:scale-[0.97] transition-all duration-150"
              >
                <BookOpen className="h-3.5 w-3.5" /> Adicionar documentos a base de conhecimento
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate("/attendant/playground")}
                  className="flex-1 h-10 rounded-xl text-xs gap-1.5 active:scale-[0.97] transition-all duration-150"
                >
                  <Play className="h-3.5 w-3.5" /> Testar no Playground
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/agents")}
                  className="flex-1 h-10 rounded-xl text-xs gap-1.5 active:scale-[0.97] transition-all duration-150"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar pra Agentes
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // ========== SAVING PHASE ==========
  if (phase === "saving") {
    return (
      <div className="min-h-screen bg-background flex flex-col touch-pan-x" style={{ overscrollBehavior: "none" }}>
        <OnboardingHeader title="Criando agente..." subtitle="Salvando configuracao" progress={90} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Criando seu agente...</p>
          </div>
        </div>
      </div>
    );
  }

  // ========== CHAT PHASE ==========
  return (
    <div className="min-h-screen bg-background flex flex-col touch-pan-x" style={{ overscrollBehavior: "none" }}>
      <OnboardingHeader
        title="Novo agente"
        subtitle="Conte sobre o agente que quer criar"
        progress={progressPct}
        onBack={() => {
          if (messages.length <= 1) {
            setPhase("class-select");
            setMessages([]);
            setChatHistory([]);
          } else {
            navigate("/agents");
          }
        }}
      />

      {/* Chat */}
      <div ref={scrollRef} className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-32 space-y-4">
          {messages.map((msg, i) => (
            <ChatBubble key={i} msg={msg} />
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} className="scroll-mb-32 md:scroll-mb-40" />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex gap-2 items-center">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva o agente que quer criar..."
              disabled={isLoading}
              rows={2}
              className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-xl border-border bg-background"
            />
            <Button
              onClick={sendMessage}
              size="icon"
              disabled={isLoading || !input.trim()}
              className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  );
}

// ========== SUB COMPONENTS ==========

function OnboardingHeader({ title, subtitle, progress, onBack }: { title: string; subtitle: string; progress: number; onBack?: () => void }) {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="h-9 w-9 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-display font-semibold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="h-0.5 bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
}

function ChatBubble({ msg }: { msg: DisplayMsg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className="flex items-start gap-2.5 max-w-[85%]">
        {!isUser && (
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 mt-0.5 border border-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-br-md shadow-lg shadow-primary/20"
              : "bg-card border border-border text-foreground rounded-bl-md shadow-sm"
          }`}
        >
          <div className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_p+p]:mt-2">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        </div>
        {isUser && (
          <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

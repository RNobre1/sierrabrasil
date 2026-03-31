import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Sparkles, User, Loader2, ArrowRight, Rocket, FileText, Lock, Wifi } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AudioRecorder from "@/components/onboarding/AudioRecorder";
import FileUploader from "@/components/onboarding/FileUploader";
import ScrapingProgress from "@/components/onboarding/ScrapingProgress";
import SocialLinksSelector from "@/components/onboarding/SocialLinksSelector";
import TextPasteModal from "@/components/onboarding/TextPasteModal";
import BusinessOverview from "@/components/onboarding/BusinessOverview";
import AgentClassSelector from "@/components/onboarding/AgentClassSelector";
import type { AgentTemplate } from "@/components/onboarding/AgentTemplateSelector";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-chat`;
const PROCESS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-knowledge`;
const SCRAPE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-urls`;

type OnboardingPhase =
  | "class-select"
  | "chat"
  | "social-links"
  | "scraping"
  | "post-scrape-chat"
  | "overview"
  | "docs"
  | "whatsapp-connect"
  | "finalizing"
  | "done";

type OverviewData = {
  businessName?: string;
  sector?: string;
  address?: string;
  hours?: string;
  products?: string;
  prices?: string;
  highlights?: string;
  description?: string;
  contactInfo?: string;
  tone?: string;
  socialLinks?: Record<string, string>;
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<OnboardingPhase>("chat");
  const [selectedAgentClass, setSelectedAgentClass] = useState<string | null>(null);
  const [agentTemplates, setAgentTemplates] = useState<AgentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [scrapeUrls, setScrapeUrls] = useState<string[]>([]);
  const [scrapeResults, setScrapeResults] = useState<any[]>([]);
  const [scrapeComplete, setScrapeComplete] = useState(false);
  const [overviewData, setOverviewData] = useState<OverviewData>({});
  const [sourcePreviews, setSourcePreviews] = useState<any[]>([]);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [textPasteOpen, setTextPasteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pastedTexts, setPastedTexts] = useState<string[]>([]);
  const [attendantNameFromChat, setAttendantNameFromChat] = useState("");
  const [personaFromChat, setPersonaFromChat] = useState("");
  // Background scraping state
  const scrapeDataRef = useRef<{ results: any[]; overview: any; sourcePreviews: any[]; done: boolean }>({ results: [], overview: null, sourcePreviews: [], done: false });
  const [postScrapeStep, setPostScrapeStep] = useState(0);
  const [waitingForScrape, setWaitingForScrape] = useState(false);
  const waitingForScrapeRef = useRef(false);
  const phaseRef = useRef<OnboardingPhase>("chat");
  const scrapeStartedAtRef = useRef<number | null>(null);
  const scrapeTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrapeDeadlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrapeAbortControllerRef = useRef<AbortController | null>(null);
  // Password collection state
  const [passwordPhase, setPasswordPhase] = useState<"none" | "awaiting" | "confirming" | "done">("none");
  const [tempPassword, setTempPassword] = useState("");
  const [isPasswordInput, setIsPasswordInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sensitiveInputRef = useRef<HTMLInputElement>(null);
  const hasStarted = useRef(false);
  const userMsgCount = messages.filter(m => m.role === "user").length;

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

  // Autoscroll
  useEffect(() => {
    scrollToBottom(messages.length > 2 ? "smooth" : "auto");
  }, [messages, isLoading, phase, isPasswordInput, scrollToBottom]);

  useEffect(() => {
    if (isPasswordInput) {
      sensitiveInputRef.current?.focus();
    }
  }, [isPasswordInput, passwordPhase]);

  useEffect(() => {
    waitingForScrapeRef.current = waitingForScrape;
  }, [waitingForScrape]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // === Persistencia do onboarding ===
  const persistKey = "theagent_onboarding";
  const didRestore = useRef(false);

  // Salvar estado no localStorage a cada mudanca relevante
  useEffect(() => {
    if (!didRestore.current) return;
    try {
      localStorage.setItem(persistKey, JSON.stringify({
        messages, phase, passwordPhase, selectedAgentClass, selectedTemplateId,
        overviewData, attendantNameFromChat, personaFromChat,
      }));
    } catch {}
  }, [messages, phase, passwordPhase, selectedAgentClass, selectedTemplateId, overviewData, attendantNameFromChat, personaFromChat]);

  // Limpar localStorage quando finalizar o onboarding
  const clearPersisted = useCallback(() => {
    try { localStorage.removeItem(persistKey); } catch {}
  }, []);

  const userName = user?.user_metadata?.full_name || profile?.full_name || "";
  const companyName = user?.user_metadata?.company_name || "";

  const isNewAgent = new URLSearchParams(window.location.search).get("newAgent") === "true";

  // Fetch agent templates from Supabase
  useEffect(() => {
    supabase.from("agent_templates").select("id, name, class, description, icon").then(({ data }) => {
      if (data) setAgentTemplates(data);
    });
  }, []);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    // Tentar restaurar estado persistido
    try {
      const raw = localStorage.getItem(persistKey);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.messages && p.messages.length > 0) {
          setMessages(p.messages);
          if (p.phase) setPhase(p.phase);
          if (p.passwordPhase) setPasswordPhase(p.passwordPhase);
          if (p.selectedAgentClass) setSelectedAgentClass(p.selectedAgentClass);
          if (p.selectedTemplateId) setSelectedTemplateId(p.selectedTemplateId);
          if (p.overviewData) setOverviewData(p.overviewData);
          if (p.attendantNameFromChat) setAttendantNameFromChat(p.attendantNameFromChat);
          if (p.personaFromChat) setPersonaFromChat(p.personaFromChat);
          didRestore.current = true;
          return;
        }
      }
    } catch {}
    didRestore.current = true;

    // If creating a new agent (returning user), skip password and go to class select
    if (isNewAgent) {
      const firstName = userName ? userName.split(" ")[0] : "";
      setMessages([{
        role: "assistant",
        content: firstName
          ? `Olá, ${firstName}! Vamos criar um novo agente. Escolha o tipo ideal para você:`
          : "Vamos criar um novo agente! Escolha o tipo ideal para você:",
      }]);
      setPasswordPhase("done");
      setPhase("class-select");
      return;
    }

    // First-time onboarding: skip password (auto-generated at signup), go to class select
    const firstName = userName ? userName.split(" ")[0] : "";
    setMessages([{
      role: "assistant",
      content: firstName
        ? `Olá, ${firstName}! Que bom ter você aqui${companyName ? ` com a **${companyName}**` : ""}. Vamos configurar seu agente de IA!\n\nEscolha o tipo ideal para o seu negócio:`
        : "Olá! Vamos configurar seu agente de IA!\n\nEscolha o tipo ideal para o seu negócio:",
    }]);
    setPasswordPhase("done");
    setPhase("class-select");
  }, []);

  // Streaming helper with timeout protection
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
        body: JSON.stringify({ messages: allMessages, userName: profile?.full_name || userName, companyName }),
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
          } catch {}
        }
      }

      return full;
    } finally {
      clearTimeout(timeout);
    }
  };

  const cleanDisplay = (text: string) =>
    text
      .replace(/```json\s*\{[\s\S]*?\}\s*```/g, "")
      .replace(/```choices\s*\{[\s\S]*?\}\s*```/g, "")
      .replace(/```social_links\s*```/g, "")
      .replace(/```docs_upload\s*```/g, "")
      .trim();

  const clearScrapeTimers = useCallback(() => {
    if (scrapeTransitionTimerRef.current) {
      clearTimeout(scrapeTransitionTimerRef.current);
      scrapeTransitionTimerRef.current = null;
    }

    if (scrapeDeadlineTimerRef.current) {
      clearTimeout(scrapeDeadlineTimerRef.current);
      scrapeDeadlineTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearScrapeTimers();
      scrapeAbortControllerRef.current?.abort();
    };
  }, [clearScrapeTimers]);

  const buildFallbackOverview = useCallback((links: Record<string, string>): OverviewData => {
    const firstValidLink = Object.values(links).find(Boolean) || "";

    return {
      businessName: companyName || profile?.full_name || userName || "Seu negócio",
      sector: "",
      address: "",
      hours: "",
      products: "",
      prices: "",
      highlights: "",
      description: "Preparei um diagnóstico inicial para você revisar e ajustar antes de continuar.",
      contactInfo: firstValidLink,
      tone: personaFromChat || "Profissional, claro e útil",
      socialLinks: links,
    };
  }, [companyName, personaFromChat, profile?.full_name, userName]);

  const completeWaitingFlow = useCallback(() => {
    if (waitingForScrapeRef.current) {
      waitingForScrapeRef.current = false;
      setWaitingForScrape(false);
      setPhase("overview");
    }
  }, []);

  const sendToChat = async (text: string) => {
    const userMsg: Msg = { role: "user", content: text };
    const prevMessages = [...messages];
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const allMessages = [...prevMessages, userMsg];

      const fullText = await streamChat(allMessages, (chunk) => {
        const display = cleanDisplay(chunk);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: display } : m));
          }
          return [...prev, { role: "assistant", content: display }];
        });
      });

      // Extract agent name & persona from conversation context
      const nameMatch = fullText.match(/(?:nome.*?agente|agente.*?(?:chamar|nome))[:\s]*["']?(\w+)["']?/i);
      if (nameMatch) setAttendantNameFromChat(nameMatch[1]);

      const personaMatch = fullText.match(/(?:tom|persona)[:\s]*([^\n.!?]+)/i);
      if (personaMatch) setPersonaFromChat(personaMatch[1].trim());

      // Check if AI is requesting social links
      if (fullText.includes("```social_links```")) {
        setPhase("social-links");
      }

      // Check for docs upload request
      if (fullText.includes("```docs_upload```")) {
        setShowDocUpload(true);
      }

      // Check for final config JSON
      const jsonMatch = fullText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.ready && parsed.config) {
            if (parsed.config.attendant_name) setAttendantNameFromChat(parsed.config.attendant_name);
            if (parsed.config.persona) setPersonaFromChat(parsed.config.persona);
          }
        } catch {}
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  // Also extract agent name from user messages
  useEffect(() => {
    const userMsgs = messages.filter(m => m.role === "user");
    for (const m of userMsgs) {
      const match = m.content.match(/(?:agente|assistente).*?(?:chamar|nome)[:\s]*["']?(\w+)["']?/i);
      if (match) setAttendantNameFromChat(match[1]);
      // Also check "pode ser X", "quero que se chame X"
      const match2 = m.content.match(/(?:pode ser|se chame?|nome dele?|nome dela?)[:\s]*["']?(\w+)["']?/i);
      if (match2) setAttendantNameFromChat(match2[1]);
    }
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // Handle password collection flow
    if (passwordPhase === "awaiting") {
      if (text.length < 8) {
        setMessages(prev => [...prev,
          { role: "user", content: "••••••••" },
          { role: "assistant", content: "Sua senha precisa ter pelo menos **8 caracteres**. Tente novamente." }
        ]);
        setInput("");
        return;
      }
      setTempPassword(text);
      setMessages(prev => [...prev,
        { role: "user", content: "••••••••" },
        { role: "assistant", content: "Perfeito! Agora confirme digitando a mesma senha novamente:" }
      ]);
      setInput("");
      setPasswordPhase("confirming");
      return;
    }

    if (passwordPhase === "confirming") {
      if (text !== tempPassword) {
        setMessages(prev => [...prev,
          { role: "user", content: "••••••••" },
          { role: "assistant", content: "As senhas não conferem. Vamos tentar de novo — digite sua senha:" }
        ]);
        setInput("");
        setPasswordPhase("awaiting");
        setTempPassword("");
        return;
      }
      // Password confirmed — mock save for testing, then proceed
      setInput("");
      setIsLoading(true);
      setIsPasswordInput(false);
      setMessages(prev => [...prev, { role: "user", content: "••••••••" }]);

      // Try real update if user is authenticated, otherwise mock it
      const doPasswordUpdate = user
        ? supabase.auth.updateUser({ password: text }).then(({ error }) => error)
        : Promise.resolve(null);

      doPasswordUpdate.then((error) => {
        if (error) {
          console.warn("Password update skipped (mock mode):", error.message);
        }
        setPasswordPhase("done");
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "Senha definida com sucesso! 🔒\n\nAgora vamos escolher o tipo de agente ideal para o seu negócio.",
        }]);
        setIsLoading(false);
        setPhase("class-select");
      });
      return;
    }

    // Handle post-scrape chat questions
    if (phase === "post-scrape-chat") {
      handlePostScrapeAnswer(text);
      setInput("");
      return;
    }

    sendToChat(text);
  };

  const handleAgentTemplateSelect = (cls: string) => {
    const template = agentTemplates.find(t => t.class === cls);
    if (!template) return;
    setSelectedTemplateId(template.id);
    const templateId = template.id;

    setSelectedAgentClass(template.class);
    setPhase("chat");

    if (user) {
      (async () => {
        const { data: tenant } = await supabase.from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
        if (tenant) {
          const { data: att } = await supabase.from("attendants").select("id").eq("tenant_id", tenant.id).limit(1).maybeSingle();
          if (att) {
            await supabase.from("attendants").update({ class: template.class, template_id: templateId }).eq("id", att.id);
          }
        }
      })();
    }

    // Show short message, send full context to AI hidden
    const visibleMsg: Msg = { role: "user", content: `Quero criar um agente de ${template.name}.` };
    const hiddenContext: Msg = { role: "user", content: `[SISTEMA: Template escolhido: ${template.name} (${template.class}). ${template.description || ""}. Nao mencione isso, siga a conversa.]` };
    const currentMessages = [...messages, visibleMsg];
    setMessages(currentMessages);
    setIsLoading(true);

    setTimeout(async () => {
      try {
        const fullText = await streamChat([...currentMessages, hiddenContext], (chunk) => {
          const display = cleanDisplay(chunk);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: display } : m));
            }
            return [...prev, { role: "assistant", content: display }];
          });
        });
        if (fullText.includes("```social_links```")) setPhase("social-links");
      } catch (e) {
        console.error("Template chat error:", e);
        toast({ title: "Erro", description: "Falha ao conectar com a IA. Tente de novo.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleAudioTranscribed = (text: string) => {
    sendToChat(`🎤 ${text}`);
  };

  const handleFileContent = (content: string, fileName: string) => {
    sendToChat(`📎 Arquivo: ${fileName}\n\n${content.slice(0, 3000)}`);
  };

  const handleTextPaste = (text: string) => {
    setPastedTexts(prev => [...prev, text]);
    sendToChat(`📎 Texto colado:\n\n${text.slice(0, 3000)}`);
  };

  // Social links confirmed
  const handleSocialLinksSubmit = (links: Record<string, string>) => {
    setSocialLinks(links);
    setScrapeResults([]);
    setSourcePreviews([]);
    setOverviewData({});
    setScrapeComplete(false);
    setPostScrapeStep(0);
    setWaitingForScrape(false);
    waitingForScrapeRef.current = false;
    scrapeDataRef.current = { results: [], overview: null, sourcePreviews: [], done: false };
    scrapeStartedAtRef.current = Date.now();
    clearScrapeTimers();
    scrapeAbortControllerRef.current?.abort();

    const urls: string[] = [];
    Object.entries(links).forEach(([platform, val]) => {
      if (!val) return;
      let url = val;
      if (platform === "instagram" && !url.startsWith("http")) url = `https://instagram.com/${url.replace(/^@+/, "")}`;
      if (platform === "facebook" && !url.startsWith("http")) url = `https://facebook.com/${url}`;
      if (platform === "tiktok" && !url.startsWith("http")) url = `https://tiktok.com/${url.replace("@", "@")}`;
      if (platform === "youtube" && !url.startsWith("http")) url = `https://youtube.com/${url}`;
      if (platform === "linkedin" && !url.startsWith("http")) url = `https://linkedin.com/company/${url}`;
      if (platform === "website" && !url.startsWith("http")) url = `https://${url}`;
      urls.push(url);
    });

    setScrapeUrls(urls);
    setPhase("scraping");

    const summary = Object.entries(links).map(([k, v]) => `${k}: ${v}`).join(", ");
    setMessages((prev) => [...prev, { role: "user", content: `Minhas redes: ${summary}` }]);

    // Fire-and-forget: start scraping in background
    startScrapingBackground(urls, links);

    // After 30s max, transition to post-scrape chat regardless
    scrapeTransitionTimerRef.current = setTimeout(() => {
      transitionToPostScrapeChat();
    }, 30000);

    // Hard deadline: never let the diagnosis exceed 1min30 total
    scrapeDeadlineTimerRef.current = setTimeout(() => {
      scrapeAbortControllerRef.current?.abort();

      const fallbackOverview = buildFallbackOverview(links);
      scrapeDataRef.current.overview = fallbackOverview;
      scrapeDataRef.current.done = true;

      setOverviewData(fallbackOverview);
      setScrapeComplete(true);

      if (waitingForScrapeRef.current) {
        completeWaitingFlow();
      }
    }, 90000);
  };

  const transitionToPostScrapeChat = () => {
    if (phaseRef.current !== "scraping") return;

    setPhase("post-scrape-chat");
    setScrapeComplete(true);
    setPostScrapeStep(0);

    // Add the first post-scrape question
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Enquanto nossos robôs finalizam a análise, me conta mais algumas coisas! 🚀\n\n**Qual é o principal diferencial do seu negócio?** O que faz seus clientes escolherem vocês ao invés da concorrência?",
      },
    ]);
  };

  const startScrapingBackground = async (urls: string[], links: Record<string, string>) => {
    const fallbackOverview = buildFallbackOverview(links);

    const finalizeScrape = ({
      results = [],
      overview,
      previews = [],
      autoAdvance = true,
    }: {
      results?: any[];
      overview?: Partial<OverviewData> | null;
      previews?: any[];
      autoAdvance?: boolean;
    } = {}) => {
      clearScrapeTimers();

      const mergedOverview: OverviewData = {
        ...fallbackOverview,
        ...(overview || {}),
        socialLinks: links,
      };

      scrapeDataRef.current = {
        results,
        overview: mergedOverview,
        sourcePreviews: previews,
        done: true,
      };

      setScrapeResults(results);
      setOverviewData(mergedOverview);
      setSourcePreviews(previews);
      setScrapeComplete(true);

      if (autoAdvance && phaseRef.current === "scraping") {
        setTimeout(() => {
          if (phaseRef.current === "scraping") {
            transitionToPostScrapeChat();
          }
        }, 1200);
      }

      completeWaitingFlow();
    };

    if (authLoading) {
      window.setTimeout(() => {
        if (!scrapeDataRef.current.done && phaseRef.current === "scraping") {
          startScrapingBackground(urls, links);
        }
      }, 800);
      return;
    }

    if (!user) {
      console.warn("Scraping skipped: no authenticated user/session found.");
      finalizeScrape({ overview: fallbackOverview });
      return;
    }

    try {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
      if (!tenant) {
        console.warn("Scraping fallback: tenant not found for user", user.id);
        finalizeScrape({ overview: fallbackOverview });
        return;
      }

      const { data: att } = await supabase.from("attendants").select("id").eq("tenant_id", tenant.id).limit(1).maybeSingle();
      if (!att) {
        console.warn("Scraping fallback: attendant not found for tenant", tenant.id);
        finalizeScrape({ overview: fallbackOverview });
        return;
      }

      const controller = new AbortController();
      scrapeAbortControllerRef.current = controller;

      const resp = await fetch(SCRAPE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          urls,
          tenantId: tenant.id,
          attendantId: att.id,
          pastedText: pastedTexts.join("\n\n---\n\n"),
        }),
        signal: controller.signal,
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || `Erro ${resp.status}`);
      }

      const overview: Partial<OverviewData> | null = data.overview ? {
        businessName: data.overview.businessName || "",
        sector: data.overview.sector || "",
        address: data.overview.address || "",
        hours: data.overview.hours || "",
        products: data.overview.products || "",
        prices: data.overview.prices || "",
        highlights: data.overview.highlights || "",
        description: data.overview.description || "",
        contactInfo: data.overview.contactInfo || "",
        tone: data.overview.tone || "",
      } : null;

      finalizeScrape({
        results: data.results || [],
        overview,
        previews: data.sourcePreviews || [],
      });
    } catch (e) {
      console.error("Scrape error:", e);
      finalizeScrape({ overview: fallbackOverview });
    } finally {
      scrapeAbortControllerRef.current = null;
    }
  };

  // Handle post-scrape chat answers
  const handlePostScrapeAnswer = (text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    const step = postScrapeStep + 1;
    setPostScrapeStep(step);

    const questions: Msg[] = [
      {
        role: "assistant",
        content: "Boa! 💪 E como seus clientes costumam entrar em contato? WhatsApp, ligação, presencial? **Qual o canal mais usado?**",
      },
      {
        role: "assistant",
        content: "Entendi! Última pergunta: **tem alguma regra importante** que seu agente precisa seguir? Por exemplo: não dar desconto, sempre pedir o nome do cliente, encaminhar para um humano em certos casos...",
      },
      {
        role: "assistant",
        content: "Perfeito! 🎯 Já tenho tudo que preciso. Deixa eu compilar o diagnóstico completo do seu negócio...",
      },
    ];

    if (step < questions.length) {
      setTimeout(() => {
        setMessages((prev) => [...prev, questions[step]]);
        if (step === questions.length - 1) {
          // Last question answered — check if scraping is done
          setTimeout(() => showOverviewWhenReady(), 2000);
        }
      }, 800);
    } else {
      showOverviewWhenReady();
    }
  };

  const showOverviewWhenReady = () => {
    const totalElapsed = scrapeStartedAtRef.current ? Date.now() - scrapeStartedAtRef.current : 0;

    if (scrapeDataRef.current.done) {
      waitingForScrapeRef.current = false;
      setWaitingForScrape(false);
      setPhase("overview");
    } else if (totalElapsed >= 90000) {
      const fallbackOverview = buildFallbackOverview(socialLinks);
      scrapeDataRef.current = {
        ...scrapeDataRef.current,
        overview: fallbackOverview,
        done: true,
      };
      waitingForScrapeRef.current = false;
      setWaitingForScrape(false);
      setOverviewData(fallbackOverview);
      setScrapeComplete(true);
      setPhase("overview");
    } else {
      if (!waitingForScrapeRef.current) {
        waitingForScrapeRef.current = true;
        setWaitingForScrape(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Quase lá! ⏳ Finalizando a análise das suas redes sociais...",
          },
        ]);
      }
    }
  };

  const handleOverviewConfirm = (data: OverviewData) => {
    setOverviewData(data);
    setPhase("docs");
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Ótimo! Agora, envie arquivos que descrevam seu negócio: catálogo, tabela de preços, cardápio, apresentação ou qualquer documento útil. 📄\n\n**Quanto mais informação, melhor seu agente atende.**\n\nVocê também pode colar texto direto no campo abaixo!",
      },
    ]);
    setShowDocUpload(true);
  };

  const handleOverviewGoBack = () => {
    setPhase("social-links");
  };

  const skipDocs = () => {
    setShowDocUpload(false);
    finalizeOnboarding();
  };

  const finishDocsAndContinue = () => {
    setShowDocUpload(false);
    finalizeOnboarding();
  };

  const finalizeOnboarding = async () => {
    if (!user) {
      toast({
        title: "Sessão não encontrada",
        description: "Refaça o cadastro/login para concluir a configuração do agente.",
        variant: "destructive",
      });
      navigate("/signup");
      return;
    }
    setSaving(true);

    try {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("owner_id", user.id).single();
      if (!tenant) throw new Error("Tenant not found");
      const { data: att } = await supabase.from("attendants").select("id").eq("tenant_id", tenant.id).limit(1).single();
      if (!att) throw new Error("Attendant not found");

      // Build actionable instructions (not just raw data)
      const rules: string[] = [];
      if (overviewData.businessName) rules.push(`Voce atende pela empresa "${overviewData.businessName}".`);
      if (overviewData.description) rules.push(`Sobre o negocio: ${overviewData.description}`);
      if (overviewData.address) rules.push(`Quando perguntarem o endereco, informe: ${overviewData.address}.`);
      if (overviewData.hours) rules.push(`Horario de funcionamento: ${overviewData.hours}. Se perguntarem, informe exatamente isso.`);
      if (overviewData.contactInfo) rules.push(`Contato da empresa: ${overviewData.contactInfo}.`);
      if (overviewData.products) rules.push(`Produtos e servicos oferecidos:\n${overviewData.products}`);
      if (overviewData.prices) rules.push(`Tabela de precos (use EXATAMENTE estes valores):\n${overviewData.prices}`);
      if (overviewData.highlights) rules.push(`Diferenciais e pontos fortes do negocio:\n${overviewData.highlights}`);
      const instructions = rules.join("\n\n");

      // Use agent name from chat, fallback to business name
      const finalAttendantName = attendantNameFromChat || overviewData.businessName || "Meu Agente";
      const finalPersona = personaFromChat || overviewData.tone || "Simpatico, profissional e direto";

      // Recommend best model based on sector
      let recommendedModel = "google/gemini-2.5-flash";
      let modelReason = "Modelo padrao";
      try {
        const recResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recommend-model`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ sector: overviewData.sector || "", agentClass: selectedAgentClass || "" }),
        });
        if (recResp.ok) {
          const rec = await recResp.json();
          recommendedModel = rec.model || recommendedModel;
          modelReason = rec.reason || modelReason;
        }
      } catch (e) {
        console.warn("Model recommendation failed, using default:", e);
      }

      await supabase.from("attendants").update({
        name: finalAttendantName,
        persona: finalPersona,
        instructions,
        channels: ["whatsapp", "web"],
        status: "online",
        model: recommendedModel,
        recommended_model: recommendedModel,
        model_selection_reason: modelReason,
      }).eq("id", att.id);

      if (overviewData.businessName) {
        await supabase.from("tenants").update({ name: overviewData.businessName }).eq("id", tenant.id);
      }

      if (instructions) {
        fetch(PROCESS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            tenantId: tenant.id,
            attendantId: att.id,
            content: instructions,
            sourceName: "Instruções do Onboarding",
            sourceType: "manual",
          }),
        }).catch(e => console.error("Process instructions error:", e));
      }

      // Process doc messages
      const docMessages = messages.filter(m => m.role === "user" && m.content.startsWith("📎"));
      for (const dm of docMessages) {
        fetch(PROCESS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            tenantId: tenant.id,
            attendantId: att.id,
            content: dm.content,
            sourceName: dm.content.split("\n")[0].replace("📎 ", ""),
            sourceType: "document",
          }),
        }).catch(e => console.error("Process knowledge error:", e));
      }

      toast({ title: "Agente configurado!", description: "Agora vamos conectar seu WhatsApp!" });
      setPhase("whatsapp-connect");
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

  const progressPct = phase === "done" ? 100
    : phase === "docs" ? 85
    : phase === "overview" ? 70
    : phase === "post-scrape-chat" ? 60
    : phase === "scraping" ? 50
    : phase === "social-links" ? 35
    : phase === "class-select" ? 15
    : `${Math.min(30, userMsgCount * 8)}`;

  // ========== CLASS SELECT PHASE ==========
  if (phase === "class-select") {
    return (
      <div className="min-h-screen bg-background flex flex-col touch-pan-x" style={{ overscrollBehavior: "none" }}>
        <OnboardingHeader title="Tipo de Agente" subtitle="Escolha o perfil ideal para o seu negócio" progress={15} />
        <div className="flex-1 flex items-center justify-center p-6">
          <AgentClassSelector onSelect={handleAgentTemplateSelect} />
        </div>
      </div>
    );
  }

  // ========== WHATSAPP CONNECT PHASE ==========
  if (phase === "whatsapp-connect") {
    return (
      <div className="min-h-screen bg-background flex flex-col touch-pan-x" style={{ overscrollBehavior: "none" }}>
        <OnboardingHeader title="Conectar WhatsApp" subtitle="Ultimo passo! Conecte seu numero" progress={95} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-cosmos-emerald/10 flex items-center justify-center mx-auto">
              <Wifi className="h-8 w-8 text-cosmos-emerald" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-display font-semibold text-foreground">
                Conecte seu WhatsApp
              </h2>
              <p className="text-sm text-muted-foreground">
                Seu agente esta pronto! Conecte o WhatsApp pra ele comecar a atender automaticamente.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  clearPersisted();
                  navigate("/channels");
                }}
                className="w-full h-12 rounded-xl bg-cosmos-emerald hover:bg-cosmos-emerald/90 text-white"
              >
                <Wifi className="h-4 w-4 mr-2" /> Conectar agora
              </Button>
              <button
                onClick={() => {
                  clearPersisted();
                  toast({ title: "Tudo certo!", description: "Voce pode conectar o WhatsApp depois em Canais." });
                  navigate("/dashboard");
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Fazer isso depois
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== SCRAPING PHASE ==========
  if (phase === "scraping") {
    return (
      <div className="min-h-screen bg-background flex flex-col touch-pan-x" style={{ overscrollBehavior: "none" }}>
        <OnboardingHeader title="Vasculhando a web..." subtitle="Nossos robôs estão trabalhando — relaxe e aproveite o show" progress={55} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-xl space-y-6">
            <ScrapingProgress urls={scrapeUrls} results={scrapeResults} isComplete={scrapeComplete} />
          </div>
        </div>
      </div>
    );
  }

  // ========== OVERVIEW PHASE ==========
  if (phase === "overview") {
    return (
      <div className="min-h-screen bg-background flex flex-col touch-pan-x" style={{ overscrollBehavior: "none" }}>
        <OnboardingHeader title="Revisão dos dados" subtitle="Confira o que encontramos e ajuste o que precisar" progress={70} />
        <div className="flex-1 overflow-y-auto p-6">
          <BusinessOverview
            data={overviewData}
            sourcePreviews={sourcePreviews}
            onConfirm={handleOverviewConfirm}
            onGoBack={handleOverviewGoBack}
            onDataChange={setOverviewData}
          />
        </div>
      </div>
    );
  }

  // ========== DOCS PHASE ==========
  if (phase === "docs") {
    return (
      <div className="min-h-screen bg-background flex flex-col touch-pan-x" style={{ overscrollBehavior: "none" }}>
        <OnboardingHeader title="Documentos da empresa" subtitle="Envie materiais para turbinar seu agente" progress={85} />
        <div ref={scrollRef} className="flex-1">
          <div className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-32 space-y-4">
            {messages.slice(-3).map((msg, i) => (
              <ChatBubble key={i} msg={msg} />
            ))}
          </div>
        </div>

        <div className="border-t border-border bg-card/80 backdrop-blur-sm sticky bottom-0">
          <div className="max-w-3xl mx-auto px-4 py-3 space-y-2">
            <div className="flex gap-2 items-center">
              <AudioRecorder onTranscribed={handleAudioTranscribed} disabled={isLoading} />
              <FileUploader onFileContent={handleFileContent} disabled={isLoading} />
              <Button variant="outline" size="icon" onClick={() => setTextPasteOpen(true)} className="h-11 w-11 rounded-xl shrink-0" title="Colar texto">
                <FileText className="h-4 w-4" />
              </Button>
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ou descreva aqui..."
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
            <div className="flex justify-between items-center">
              <p className="text-[10px] text-muted-foreground">PDF, DOC, DOCX, XLS, CSV, MD, TXT aceitos</p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={skipDocs} className="text-xs text-muted-foreground h-8">
                  Pular
                </Button>
                <Button size="sm" onClick={finishDocsAndContinue} className="text-xs bg-gradient-to-r from-primary to-primary/80 h-8">
                  <ArrowRight className="h-3 w-3 mr-1" /> Finalizar
                </Button>
              </div>
            </div>
          </div>
        </div>

        <TextPasteModal open={textPasteOpen} onClose={() => setTextPasteOpen(false)} onConfirm={handleTextPaste} />
      </div>
    );
  }

  // ========== CHAT PHASE (also handles post-scrape-chat) ==========
  const isPostScrape = phase === "post-scrape-chat";
  return (
    <div className="min-h-screen bg-background flex flex-col touch-pan-x" style={{ overscrollBehavior: "none" }}>
      <OnboardingHeader
        title={isPostScrape ? "Conhecendo seu negócio" : "Configuração do seu Agente"}
        subtitle={isPostScrape ? "Mais algumas perguntas enquanto analisamos seus dados" : "Conte sobre seu negócio — por texto ou áudio"}
        progress={Number(progressPct)}
      />

      {/* Chat */}
      <div ref={scrollRef} className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-32 space-y-4">
          {messages.map((msg, i) => (
            <ChatBubble key={i} msg={msg} />
          ))}

          {isPasswordInput && (
            <SensitiveConversationPanel
              inputRef={sensitiveInputRef}
              value={input}
              onChange={setInput}
              onSubmit={sendMessage}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={passwordPhase === "confirming" ? "Confirme sua senha" : "Digite sua senha"}
              title={passwordPhase === "confirming" ? "Confirme a senha para continuar" : "Crie sua senha de acesso"}
              description="Essa informação vai direto para a criação da conta e não fica salva em nenhuma IA."
            />
          )}

          {phase === "social-links" && (
            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start gap-2.5 max-w-[85%]">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 mt-0.5 border border-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-4 shadow-sm w-full max-w-lg">
                  <SocialLinksSelector onSubmit={handleSocialLinksSubmit} />
                </div>
              </div>
            </div>
          )}

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
      {!isPasswordInput && (
      <div className="border-t border-border bg-card/80 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex gap-2 items-center">
            <AudioRecorder onTranscribed={handleAudioTranscribed} disabled={isLoading} />
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva seu negócio, serviços, regras de atendimento..."
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
            🎤 Áudio · ⌨️ Texto — Shift+Enter para nova linha
          </p>
        </div>
      </div>
      )}
    </div>
  );
}

// ========== SUB COMPONENTS ==========

function OnboardingHeader({ title, subtitle, progress }: { title: string; subtitle: string; progress: number }) {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
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

function ChatBubble({ msg }: { msg: Msg }) {
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

function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  return strength;
}

function SensitiveConversationPanel({
  title,
  description,
  placeholder,
  value,
  onChange,
  onSubmit,
  onKeyDown,
  disabled,
  inputRef,
}: {
  title: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-300">
      <form
        className="w-full max-w-xl rounded-2xl border border-border bg-card/95 p-4 shadow-sm surface-glow"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Campo sensível
          </span>
          <span className="text-[10px] text-muted-foreground">Não fica salvo em nenhuma IA</span>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="password"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="new-password"
              className="h-11 rounded-xl border-border bg-background pl-10"
            />
          </div>
          <Button
            type="submit"
            disabled={disabled || !value.trim()}
            className="h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 px-4 shadow-lg shadow-primary/20"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Password strength indicator */}
        {value.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => {
                const strength = getPasswordStrength(value);
                const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];
                return (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      level <= strength ? colors[strength - 1] : "bg-muted-foreground/10"
                    }`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
              <span className={value.length >= 8 ? "text-emerald-500" : "text-muted-foreground/50"}>
                {value.length >= 8 ? "✓" : "○"} 8+ caracteres
              </span>
              <span className={/[A-Z]/.test(value) ? "text-emerald-500" : "text-muted-foreground/50"}>
                {/[A-Z]/.test(value) ? "✓" : "○"} Maiúscula
              </span>
              <span className={/[0-9]/.test(value) ? "text-emerald-500" : "text-muted-foreground/50"}>
                {/[0-9]/.test(value) ? "✓" : "○"} Número
              </span>
              <span className={/[^a-zA-Z0-9]/.test(value) ? "text-emerald-500" : "text-muted-foreground/50"}>
                {/[^a-zA-Z0-9]/.test(value) ? "✓" : "○"} Especial
              </span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

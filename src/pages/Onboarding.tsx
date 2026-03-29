import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Sparkles, User, Loader2, ArrowRight, Rocket, FileText, Lock } from "lucide-react";
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

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-chat`;
const PROCESS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-knowledge`;
const SCRAPE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-urls`;

type OnboardingPhase =
  | "chat"
  | "social-links"
  | "scraping"
  | "overview"
  | "docs"
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
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<OnboardingPhase>("chat");
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
  // Password collection state
  const [passwordPhase, setPasswordPhase] = useState<"none" | "awaiting" | "confirming" | "done">("none");
  const [tempPassword, setTempPassword] = useState("");
  const [isPasswordInput, setIsPasswordInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasStarted = useRef(false);
  const userMsgCount = messages.filter(m => m.role === "user").length;

  // Autoscroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      });
    }
  }, [messages, isLoading, phase]);

  const userName = user?.user_metadata?.full_name || profile?.full_name || "";
  const companyName = user?.user_metadata?.company_name || "";

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    // Start with user intro message, then agent greeting with password request
    setTimeout(() => {
      const firstName = userName ? userName.split(" ")[0] : "";
      const introMsg = firstName
        ? `Olá! Sou ${firstName}${companyName ? ` da ${companyName}` : ""} e quero configurar meu agente.`
        : "Olá! Acabei de criar minha conta e quero configurar meu agente.";
      const greeting = firstName
        ? `Olá, ${firstName}! Que bom ter você aqui${companyName ? ` com a **${companyName}**` : ""}. Antes de começarmos a configurar seu agente, vamos criar uma senha para seu acesso, tudo bem?!\n\nDigite sua senha abaixo:`
        : `Olá! Antes de começarmos a configurar seu agente, vamos criar uma senha para seu acesso, tudo bem?!\n\nDigite sua senha abaixo:`;
      setMessages([
        { role: "user", content: introMsg },
        { role: "assistant", content: greeting },
      ]);
      setPasswordPhase("awaiting");
      setIsPasswordInput(true);
    }, 500);
  }, []);

  // Streaming helper
  const streamChat = async (allMessages: Msg[], onChunk: (text: string) => void): Promise<string> => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: allMessages, userName: profile?.full_name || userName, companyName }),
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

      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            full += content;
            onChunk(full);
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    return full;
  };

  const cleanDisplay = (text: string) =>
    text
      .replace(/```json\s*\{[\s\S]*?\}\s*```/g, "")
      .replace(/```choices\s*\{[\s\S]*?\}\s*```/g, "")
      .replace(/```social_links\s*```/g, "")
      .replace(/```docs_upload\s*```/g, "")
      .trim();

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
          { role: "user", content: "•".repeat(text.length) },
          { role: "assistant", content: "A senha precisa ter pelo menos **8 caracteres**. Tente novamente:" }
        ]);
        setInput("");
        return;
      }
      setTempPassword(text);
      setMessages(prev => [...prev,
        { role: "user", content: "•".repeat(text.length) },
        { role: "assistant", content: "Perfeito! Agora confirme digitando a mesma senha novamente:" }
      ]);
      setInput("");
      setPasswordPhase("confirming");
      return;
    }

    if (passwordPhase === "confirming") {
      if (text !== tempPassword) {
        setMessages(prev => [...prev,
          { role: "user", content: "•".repeat(text.length) },
          { role: "assistant", content: "As senhas não conferem 😅 Tente digitar a senha novamente:" }
        ]);
        setInput("");
        setPasswordPhase("awaiting");
        setTempPassword("");
        return;
      }
      // Password confirmed — update via supabase auth
      setMessages(prev => [...prev, { role: "user", content: "•".repeat(text.length) }]);
      setInput("");
      setIsLoading(true);
      setIsPasswordInput(false);
      supabase.auth.updateUser({ password: text }).then(({ error }) => {
        if (error) {
          toast({ title: "Erro ao definir senha", description: error.message, variant: "destructive" });
          setMessages(prev => [...prev, { role: "assistant", content: "Ops, houve um erro ao salvar a senha. Tente novamente:" }]);
          setPasswordPhase("awaiting");
          setTempPassword("");
          setIsPasswordInput(true);
          setIsLoading(false);
          return;
        }
        setPasswordPhase("done");
        setMessages(prev => [...prev, { role: "assistant", content: "Senha definida com sucesso! 🔒\n\nAgora vamos ao que interessa — me conta sobre seu negócio!" }]);
        setIsLoading(false);
        // Kick off AI chat — send a silent trigger to the AI
        setTimeout(() => {
          const introMsg = userName
            ? `Olá! Sou ${userName.split(" ")[0]}${companyName ? ` da ${companyName}` : ""} e quero configurar meu agente.`
            : "Olá! Acabei de criar minha conta e quero configurar meu agente.";
          sendToChat(introMsg);
        }, 1000);
      });
      return;
    }

    sendToChat(text);
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

    startScraping(urls, links);
  };

  const startScraping = async (urls: string[], links: Record<string, string>) => {
    if (!user) return;
    try {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("owner_id", user.id).single();
      if (!tenant) throw new Error("Tenant not found");
      const { data: att } = await supabase.from("attendants").select("id").eq("tenant_id", tenant.id).limit(1).single();
      if (!att) throw new Error("Attendant not found");

      // Simulate progressive results while waiting for the single request
      const fakeProgressInterval = setInterval(() => {
        setScrapeResults(prev => {
          if (prev.length < urls.length - 1) {
            // Add a "processing" placeholder to show progress
            return prev;
          }
          return prev;
        });
      }, 3000);

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
      });

      clearInterval(fakeProgressInterval);
      const data = await resp.json();

      if (data.results) {
        setScrapeResults(data.results);

        // Use AI-generated overview if available
        const overview: OverviewData = { socialLinks: links };

        if (data.overview) {
          overview.businessName = data.overview.businessName || "";
          overview.sector = data.overview.sector || "";
          overview.address = data.overview.address || "";
          overview.hours = data.overview.hours || "";
          overview.products = data.overview.products || "";
          overview.prices = data.overview.prices || "";
          overview.highlights = data.overview.highlights || "";
          overview.description = data.overview.description || "";
          overview.contactInfo = data.overview.contactInfo || "";
          overview.tone = data.overview.tone || "";
        }

        setOverviewData(overview);
      }

      if (data.sourcePreviews) {
        setSourcePreviews(data.sourcePreviews);
      }

      setScrapeComplete(true);
      setTimeout(() => setPhase("overview"), 2000);
    } catch (e) {
      console.error("Scrape error:", e);
      setScrapeComplete(true);
      setTimeout(() => setPhase("overview"), 2000);
    }
  };

  const handleOverviewConfirm = (data: OverviewData) => {
    setOverviewData(data);
    setPhase("docs");
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Ótimo! Agora, você tem algum material que pode nos ajudar a treinar melhor seu agente? 📄\n\nPode ser catálogo, cardápio, tabela de preços, apresentação da empresa, FAQ... qualquer documento que descreva seu negócio.\n\nVocê também pode colar texto direto!",
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
    if (!user) return;
    setSaving(true);

    try {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("owner_id", user.id).single();
      if (!tenant) throw new Error("Tenant not found");
      const { data: att } = await supabase.from("attendants").select("id").eq("tenant_id", tenant.id).limit(1).single();
      if (!att) throw new Error("Attendant not found");

      // Build rich instructions from overview data
      const instructions = [
        overviewData.businessName ? `SOBRE O NEGÓCIO: ${overviewData.businessName}` : "",
        overviewData.description ? `DESCRIÇÃO: ${overviewData.description}` : "",
        overviewData.sector ? `SETOR: ${overviewData.sector}` : "",
        overviewData.address ? `ENDEREÇO: ${overviewData.address}` : "",
        overviewData.hours ? `HORÁRIO DE FUNCIONAMENTO: ${overviewData.hours}` : "",
        overviewData.contactInfo ? `CONTATO: ${overviewData.contactInfo}` : "",
        overviewData.products ? `PRODUTOS/SERVIÇOS:\n${overviewData.products}` : "",
        overviewData.prices ? `PREÇOS:\n${overviewData.prices}` : "",
        overviewData.highlights ? `DIFERENCIAIS E INFORMAÇÕES IMPORTANTES:\n${overviewData.highlights}` : "",
      ].filter(Boolean).join("\n\n");

      // Use agent name from chat, fallback to business name
      const finalAttendantName = attendantNameFromChat || overviewData.businessName || "Meu Agente";
      const finalPersona = personaFromChat || overviewData.tone || "Simpático, profissional e direto";

      await supabase.from("attendants").update({
        name: finalAttendantName,
        persona: finalPersona,
        instructions,
        channels: ["whatsapp", "web"],
        status: "online",
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

      toast({ title: "Agente configurado! 🎉", description: "Seu agente está online." });
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

  const progressPct = phase === "done" ? 100
    : phase === "docs" ? 85
    : phase === "overview" ? 70
    : phase === "scraping" ? 50
    : phase === "social-links" ? 35
    : `${Math.min(30, userMsgCount * 8)}`;

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
        <OnboardingHeader title="Documentos da empresa" subtitle="Envie materiais para turbinar seu atendente" progress={85} />
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
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

  // ========== SOCIAL LINKS PHASE ==========
  if (phase === "social-links") {
    return (
      <div className="min-h-screen bg-background flex flex-col touch-pan-x" style={{ overscrollBehavior: "none" }}>
        <OnboardingHeader title="Redes sociais e presença online" subtitle="Selecione as redes e insira os links ou @" progress={35} />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl mx-auto">
            <SocialLinksSelector onSubmit={handleSocialLinksSubmit} />
          </div>
        </div>
      </div>
    );
  }

  // ========== CHAT PHASE ==========
  return (
    <div className="min-h-screen bg-background flex flex-col touch-pan-x" style={{ overscrollBehavior: "none" }}>
      <OnboardingHeader
        title="Configuração do seu Atendente"
        subtitle="Conte sobre seu negócio — por texto ou áudio"
        progress={Number(progressPct)}
      />

      {/* Chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
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
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex gap-2 items-center">
            {!isPasswordInput && <AudioRecorder onTranscribed={handleAudioTranscribed} disabled={isLoading} />}
            {isPasswordInput ? (
              <div className="flex-1 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua senha..."
                  disabled={isLoading}
                  autoFocus
                  className="h-11 rounded-xl border-border bg-background pl-10 text-sm"
                />
              </div>
            ) : (
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
            )}
            <Button
              onClick={sendMessage}
              size="icon"
              disabled={isLoading || !input.trim()}
              className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {!isPasswordInput && (
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              🎤 Áudio · ⌨️ Texto — Shift+Enter para nova linha
            </p>
          )}
          {isPasswordInput && (
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              🔒 Sua senha não é enviada para a IA — apenas salva na sua conta
            </p>
          )}
        </div>
      </div>
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
}

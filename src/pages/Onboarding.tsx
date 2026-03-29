import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Sparkles, User, Loader2, ArrowRight, Rocket, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  | "chat"           // Initial conversation
  | "social-links"   // Selecting social networks + inputting links
  | "scraping"       // Scraping in progress
  | "overview"       // Show scraped data overview
  | "docs"           // Ask about documents
  | "finalizing"     // Saving config
  | "done";

type OverviewData = {
  businessName?: string;
  sector?: string;
  address?: string;
  hours?: string;
  products?: string;
  prices?: string;
  highlights?: string;
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
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [textPasteOpen, setTextPasteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<any>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasStarted = useRef(false);
  // Track how many user messages to decide when to show social links
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

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setTimeout(() => {
      sendToChat("Olá! Acabei de criar minha conta e quero configurar meu atendente.");
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
      body: JSON.stringify({ messages: allMessages, userName: profile?.full_name || "" }),
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
      let assistantText = "";

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

      assistantText = fullText;

      // Check if AI is requesting social links
      if (assistantText.includes("```social_links```")) {
        setPhase("social-links");
      }

      // Check for docs upload request
      if (assistantText.includes("```docs_upload```")) {
        setShowDocUpload(true);
      }

      // Check for final config JSON
      const jsonMatch = assistantText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.ready && parsed.config) {
            setBusinessInfo(parsed.config);
            await finalize(parsed.config);
          }
        } catch {}
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    sendToChat(text);
  };

  const handleAudioTranscribed = (text: string) => {
    sendToChat(`🎤 ${text}`);
  };

  const handleFileContent = (content: string, fileName: string) => {
    sendToChat(`📎 Arquivo: ${fileName}\n\n${content.slice(0, 3000)}`);
  };

  const handleTextPaste = (text: string) => {
    sendToChat(`📎 Texto colado:\n\n${text.slice(0, 3000)}`);
  };

  // Social links confirmed
  const handleSocialLinksSubmit = (links: Record<string, string>) => {
    setSocialLinks(links);
    
    // Build URLs for scraping
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

    // Tell the chat about the selection
    const summary = Object.entries(links).map(([k, v]) => `${k}: ${v}`).join(", ");
    setMessages((prev) => [...prev, { role: "user", content: `Minhas redes: ${summary}` }]);

    // Start scraping
    startScraping(urls, links);
  };

  const startScraping = async (urls: string[], links: Record<string, string>) => {
    if (!user) return;
    try {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("owner_id", user.id).single();
      if (!tenant) throw new Error("Tenant not found");
      const { data: att } = await supabase.from("attendants").select("id").eq("tenant_id", tenant.id).limit(1).single();
      if (!att) throw new Error("Attendant not found");

      const resp = await fetch(SCRAPE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ urls, tenantId: tenant.id, attendantId: att.id }),
      });
      const data = await resp.json();
      
      if (data.results) {
        setScrapeResults(data.results);
        
        // Build overview from scraped data
        const overview: OverviewData = {
          businessName: profile?.full_name || "",
          socialLinks: links,
        };

        // Extract info from scrape results
        for (const r of data.results) {
          if (r.enrichedContent) {
            const content = r.enrichedContent as string;
            // Try to extract structured info
            const nameMatch = content.match(/(?:nome|empresa|negócio)[:\s]*([^\n]+)/i);
            if (nameMatch && !overview.businessName) overview.businessName = nameMatch[1].trim();
            const sectorMatch = content.match(/(?:setor|ramo|segmento)[:\s]*([^\n]+)/i);
            if (sectorMatch) overview.sector = sectorMatch[1].trim();
            const addressMatch = content.match(/(?:endereço|localização|local)[:\s]*([^\n]+)/i);
            if (addressMatch) overview.address = addressMatch[1].trim();
            const hoursMatch = content.match(/(?:horário|funcionamento)[:\s]*([^\n]+)/i);
            if (hoursMatch) overview.hours = hoursMatch[1].trim();
            const productsMatch = content.match(/(?:produtos|serviços|cardápio)[:\s]*([\s\S]*?)(?:\n\n|$)/i);
            if (productsMatch) overview.products = productsMatch[1].trim().slice(0, 500);
            const pricesMatch = content.match(/(?:preços|valores|tabela)[:\s]*([\s\S]*?)(?:\n\n|$)/i);
            if (pricesMatch) overview.prices = pricesMatch[1].trim().slice(0, 500);
          }
        }

        // Also try AI summary
        if (data.results.some((r: any) => r.status === "success")) {
          const allContent = data.results
            .filter((r: any) => r.enrichedContent)
            .map((r: any) => r.enrichedContent)
            .join("\n\n");
          
          if (allContent) {
            overview.highlights = allContent.slice(0, 300);
          }
        }

        setOverviewData(overview);
      }
      
      setScrapeComplete(true);
      // Small delay then show overview
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
    // Add assistant message about docs
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Ótimo! Agora, você tem algum material que pode nos ajudar a treinar melhor seu atendente? 📄\n\nPode ser catálogo, cardápio, tabela de preços, apresentação da empresa, FAQ... qualquer documento que descreva seu negócio.\n\nFormatos aceitos: PDF, DOC, DOCX, XLS, XLSX, CSV, MD, TXT.\nVocê também pode colar texto direto!",
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

  const finalize = async (config: any) => {
    if (!user) return;
    setSaving(true);

    try {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("owner_id", user.id).single();
      if (!tenant) throw new Error("Tenant not found");
      const { data: att } = await supabase.from("attendants").select("id").eq("tenant_id", tenant.id).limit(1).single();
      if (!att) throw new Error("Attendant not found");

      await supabase.from("attendants").update({
        name: config.attendant_name || "Meu Atendente",
        persona: config.persona || "",
        instructions: config.instructions || "",
        channels: config.channels || ["whatsapp", "web"],
        status: "online",
      }).eq("id", att.id);

      if (config.instructions) {
        const bizMatch = config.instructions.match(/SOBRE O NEG[ÓO]CIO[:\s]*([^\n]+)/i);
        if (bizMatch) {
          await supabase.from("tenants").update({ name: bizMatch[1].trim().slice(0, 50) }).eq("id", tenant.id);
        }

        fetch(PROCESS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            tenantId: tenant.id,
            attendantId: att.id,
            content: config.instructions,
            sourceName: "Instruções do Onboarding",
            sourceType: "manual",
          }),
        }).catch(e => console.error("Process instructions error:", e));
      }

      toast({ title: "Atendente configurado! 🎉", description: "Seu atendente está online." });
      navigate("/dashboard");
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const finalizeOnboarding = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("owner_id", user.id).single();
      if (!tenant) throw new Error("Tenant not found");
      const { data: att } = await supabase.from("attendants").select("id").eq("tenant_id", tenant.id).limit(1).single();
      if (!att) throw new Error("Attendant not found");

      // Build instructions from overview + chat
      const instructions = [
        overviewData.businessName ? `SOBRE O NEGÓCIO: ${overviewData.businessName}` : "",
        overviewData.sector ? `SETOR: ${overviewData.sector}` : "",
        overviewData.address ? `ENDEREÇO: ${overviewData.address}` : "",
        overviewData.hours ? `HORÁRIO: ${overviewData.hours}` : "",
        overviewData.products ? `PRODUTOS/SERVIÇOS:\n${overviewData.products}` : "",
        overviewData.prices ? `PREÇOS:\n${overviewData.prices}` : "",
        overviewData.highlights ? `INFORMAÇÕES ADICIONAIS:\n${overviewData.highlights}` : "",
        overviewData.socialLinks ? `REDES SOCIAIS: ${Object.entries(overviewData.socialLinks).map(([k,v]) => `${k}: ${v}`).join(", ")}` : "",
      ].filter(Boolean).join("\n\n");

      await supabase.from("attendants").update({
        name: overviewData.businessName || "Meu Atendente",
        persona: "Simpático, profissional e direto",
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

      toast({ title: "Atendente configurado! 🎉", description: "Seu atendente está online." });
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
            {/* Show last messages */}
            {messages.slice(-3).map((msg, i) => (
              <ChatBubble key={i} msg={msg} />
            ))}
          </div>
        </div>

        <div className="border-t border-border bg-card/80 backdrop-blur-sm sticky bottom-0">
          <div className="max-w-3xl mx-auto px-4 py-3 space-y-3">
            <div className="flex gap-2 items-end">
              <AudioRecorder onTranscribed={handleAudioTranscribed} disabled={isLoading} />
              <FileUploader onFileContent={handleFileContent} disabled={isLoading} />
              <Button variant="outline" size="sm" onClick={() => setTextPasteOpen(true)} className="h-11 rounded-xl text-xs shrink-0">
                Colar texto
              </Button>
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ou descreva aqui..."
                disabled={isLoading}
                rows={2}
                className="flex-1 min-h-[52px] max-h-[120px] resize-none rounded-xl border-border bg-background"
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
              <Button size="sm" variant="ghost" onClick={skipDocs} className="text-xs text-muted-foreground">
                Pular — não tenho documentos
              </Button>
              <Button size="sm" onClick={finishDocsAndContinue} className="text-xs bg-gradient-to-r from-primary to-primary/80">
                <ArrowRight className="h-3 w-3 mr-1" /> Finalizar
              </Button>
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
      <div className="min-h-screen bg-background flex flex-col">
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
          <div className="flex gap-2 items-end">
            <AudioRecorder onTranscribed={handleAudioTranscribed} disabled={isLoading} />
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva seu negócio, serviços, regras de atendimento..."
              disabled={isLoading}
              rows={2}
              className="flex-1 min-h-[52px] max-h-[120px] resize-none rounded-xl border-border bg-background"
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

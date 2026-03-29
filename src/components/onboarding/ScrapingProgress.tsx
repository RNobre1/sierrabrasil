import { useState, useEffect } from "react";
import { Globe, Instagram, Facebook, Linkedin, Youtube, CheckCircle2, Loader2, Sparkles, Search, Brain, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ScrapeResult = {
  url: string;
  platform: string;
  status: string;
  chunks?: number;
  details?: string;
};

type Phase = "scanning" | "scraping" | "analyzing" | "storing" | "done";

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5" />,
  facebook: <Facebook className="h-5 w-5" />,
  linkedin: <Linkedin className="h-5 w-5" />,
  youtube: <Youtube className="h-5 w-5" />,
  tiktok: <span className="text-sm font-bold">TT</span>,
  website: <Globe className="h-5 w-5" />,
};

const platformColors: Record<string, string> = {
  instagram: "from-pink-500 to-purple-600",
  facebook: "from-blue-600 to-blue-700",
  linkedin: "from-blue-500 to-blue-600",
  youtube: "from-red-500 to-red-600",
  tiktok: "from-gray-900 to-gray-800",
  website: "from-primary to-primary/70",
};

const wittyMessages: Record<Phase, string[]> = {
  scanning: [
    "🔍 Localizando pegadas digitais...",
    "🕵️ Investigando a vida online do seu negócio...",
    "🌐 Rastreando presença digital como um detetive...",
    "📡 Escaneando a internet... sem mandado judicial.",
  ],
  scraping: [
    "🕷️ Nossos robôs estão devorando dados como se não houvesse amanhã...",
    "📊 Sugando informações mais rápido que seu concorrente copia seu cardápio...",
    "🤖 Apify trabalhando... e não cobra hora extra.",
    "⚡ Varrendo cada pixel das suas redes sociais...",
    "🔬 Analisando posts, likes, comentários... sim, até aquela selfie de 2019.",
  ],
  analyzing: [
    "🧠 IA processando tudo... está tendo um mini surto de inteligência.",
    "📝 Organizando informações... é tipo Marie Kondo, mas com dados.",
    "🎯 Extraindo o que importa e descartando o ruído...",
    "💡 Transformando dados brutos em conhecimento puro...",
  ],
  storing: [
    "💾 Armazenando na base de conhecimento do seu agente...",
    "📚 Seu agente tá estudando mais que vestibulando em Novembro...",
    "🧬 Criando DNA digital da sua empresa...",
  ],
  done: [
    "✅ Pronto! Seu agente agora sabe mais sobre sua empresa do que seus sócios.",
    "🎉 Missão cumprida! Base de conhecimento turbinada.",
    "🚀 Tudo processado. Seu agente virou expert no seu negócio.",
  ],
};

function getRandomMessage(phase: Phase): string {
  const msgs = wittyMessages[phase];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

export default function ScrapingProgress({
  urls,
  results,
  isComplete,
}: {
  urls: string[];
  results: ScrapeResult[];
  isComplete: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("scanning");
  const [currentMessage, setCurrentMessage] = useState(getRandomMessage("scanning"));
  const [progress, setProgress] = useState(0);

  // Smooth fake progress while waiting for the single request
  useEffect(() => {
    if (isComplete) {
      setPhase("done");
      setCurrentMessage(getRandomMessage("done"));
      setProgress(100);
      return;
    }

    // Simulate smooth progress over ~90 seconds
    const stages = [
      { at: 0, pct: 5, phase: "scanning" as Phase },
      { at: 3000, pct: 12, phase: "scanning" as Phase },
      { at: 6000, pct: 20, phase: "scraping" as Phase },
      { at: 12000, pct: 30, phase: "scraping" as Phase },
      { at: 20000, pct: 40, phase: "scraping" as Phase },
      { at: 30000, pct: 50, phase: "scraping" as Phase },
      { at: 40000, pct: 58, phase: "analyzing" as Phase },
      { at: 50000, pct: 65, phase: "analyzing" as Phase },
      { at: 60000, pct: 72, phase: "analyzing" as Phase },
      { at: 75000, pct: 80, phase: "storing" as Phase },
      { at: 90000, pct: 85, phase: "storing" as Phase },
      { at: 110000, pct: 90, phase: "storing" as Phase },
    ];

    const timers = stages.map(s =>
      setTimeout(() => {
        if (!isComplete) {
          setProgress(s.pct);
          setPhase(s.phase);
        }
      }, s.at)
    );

    return () => timers.forEach(clearTimeout);
  }, [isComplete]);

  // Cycle witty messages
  useEffect(() => {
    if (isComplete) return;
    const interval = setInterval(() => {
      setCurrentMessage(getRandomMessage(phase));
    }, 4000);
    return () => clearInterval(interval);
  }, [phase, isComplete]);

  const phaseIcons: Record<Phase, React.ReactNode> = {
    scanning: <Search className="h-5 w-5" />,
    scraping: <Globe className="h-5 w-5" />,
    analyzing: <Brain className="h-5 w-5" />,
    storing: <Database className="h-5 w-5" />,
    done: <CheckCircle2 className="h-5 w-5" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card p-6 space-y-5"
    >
      {/* Phase Header */}
      <div className="flex items-center gap-3">
        <motion.div
          key={phase}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className={`h-10 w-10 rounded-xl flex items-center justify-center ${
            isComplete
              ? "bg-green-500/10 text-green-500"
              : "bg-primary/10 text-primary"
          }`}
        >
          {isComplete ? <CheckCircle2 className="h-5 w-5" /> : (
            <motion.div animate={{ rotate: isComplete ? 0 : 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }}>
              {phaseIcons[phase]}
            </motion.div>
          )}
        </motion.div>
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentMessage}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-medium text-foreground"
            >
              {currentMessage}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary/60"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{results.length} de {urls.length} fontes processadas</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* URL Status List */}
      <div className="space-y-2">
        {urls.map((url, i) => {
          const result = results.find(r => r.url === url);
          const platform = detectPlatformFromUrl(url);
          const isProcessing = !result && i <= results.length;
          const isDone = !!result;
          const isSuccess = result?.status === "success";

          return (
            <motion.div
              key={url}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                isDone
                  ? isSuccess
                    ? "border-green-500/20 bg-green-500/5"
                    : "border-destructive/20 bg-destructive/5"
                  : isProcessing
                    ? "border-primary/20 bg-primary/5"
                    : "border-border bg-card"
              }`}
            >
              <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${platformColors[platform] || platformColors.website} flex items-center justify-center text-white shrink-0`}>
                {platformIcons[platform] || <Globe className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </p>
                <p className="text-xs text-muted-foreground truncate">{url.replace(/https?:\/\/(www\.)?/, "")}</p>
              </div>
              <div className="shrink-0">
                {isDone ? (
                  isSuccess ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </motion.div>
                  ) : (
                    <span className="text-xs text-destructive">Erro</span>
                  )
                ) : isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <span className="text-xs text-muted-foreground">Aguardando</span>
                )}
              </div>
              {isDone && isSuccess && result?.chunks && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full shrink-0"
                >
                  {result.chunks} chunks
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Summary when done */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20"
        >
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-foreground">
            <span className="font-medium">{results.filter(r => r.status === "success").length} fontes</span> processadas com sucesso.
            Seu atendente agora tem acesso a toda essa base de conhecimento.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

function detectPlatformFromUrl(url: string): string {
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("facebook.com") || url.includes("fb.com")) return "facebook";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("linkedin.com")) return "linkedin";
  return "website";
}

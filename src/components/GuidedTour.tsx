import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  X, ArrowRight, ArrowLeft, Bot, Play, Wifi, MessageSquare,
  BarChart3, Percent, CheckCircle2, Radio, Zap
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  selector: string;
}

// Default Dashboard steps (backward-compatible)
const DASHBOARD_STEPS: TourStep[] = [
  {
    title: "Seus indicadores",
    description: "Aqui voce ve o resumo geral: total de conversas, taxa de resolucao, agentes online e mensagens processadas. Tudo em tempo real.",
    icon: <Zap className="h-5 w-5" />,
    selector: "[data-tour='kpis']",
  },
  {
    title: "Conversas por dia",
    description: "Este grafico mostra o volume de conversas nos ultimos 7 dias. Acompanhe picos e tendencias do seu atendimento.",
    icon: <BarChart3 className="h-5 w-5" />,
    selector: "[data-tour='hero-chart']",
  },
  {
    title: "Distribuicao e resolucao",
    description: "Veja quantas conversas estao ativas, resolvidas ou escaladas. A barra de resolucao mostra a eficiencia do seu agente.",
    icon: <Percent className="h-5 w-5" />,
    selector: "[data-tour='status-panel']",
  },
  {
    title: "Conversas por canal",
    description: "Descubra de onde vem suas conversas: WhatsApp, Instagram ou Web. Ajuda a priorizar canais.",
    icon: <Radio className="h-5 w-5" />,
    selector: "[data-tour='channel-chart']",
  },
  {
    title: "Seus agentes",
    description: "Seus agentes de IA aparecem aqui. Clique em qualquer um pra ver detalhes, configurar ou testar no Playground.",
    icon: <Bot className="h-5 w-5" />,
    selector: "[data-tour='agent-card']",
  },
  {
    title: "Ultimas conversas",
    description: "Acompanhe em tempo real o que seus agentes estao respondendo. Clique em qualquer conversa pra ver os detalhes.",
    icon: <MessageSquare className="h-5 w-5" />,
    selector: "[data-tour='recent-convs']",
  },
  {
    title: "Conecte seu WhatsApp",
    description: "Va em Canais no menu lateral e conecte seu WhatsApp via QR Code. Seu agente comeca a atender na hora!",
    icon: <Wifi className="h-5 w-5" />,
    selector: "[data-tour='channels-link']",
  },
];

const DEFAULT_TOUR_KEY = "theagent_guided_tour_completed";

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface GuidedTourProps {
  steps?: TourStep[];
  tourKey?: string;
  delay?: number;
}

export default function GuidedTour({
  steps = DASHBOARD_STEPS,
  tourKey = DEFAULT_TOUR_KEY,
  delay = 1500,
}: GuidedTourProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);
  const { user } = useAuth();

  const measureElement = useCallback((el: Element) => {
    const rect = el.getBoundingClientRect();
    const pad = 10;
    setHighlight({
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    });
  }, []);

  const updateHighlight = useCallback(() => {
    const current = steps[step];
    if (!current?.selector) return;
    const el = document.querySelector(current.selector);
    if (!el) {
      setHighlight(null);
      return;
    }

    // Scroll element into view first, then measure after scroll settles.
    // scrollIntoView with "smooth" is async — we re-measure after a delay
    // to capture the element's final position.
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });

    // Measure immediately (best-effort for already-visible elements)
    measureElement(el);

    // Re-measure after smooth scroll finishes (~400ms is enough for most browsers)
    const timer = setTimeout(() => measureElement(el), 400);
    return timer;
  }, [step, steps, measureElement]);

  useEffect(() => {
    // Fast check: localStorage first
    if (localStorage.getItem(tourKey)) return;

    // DB check for logged-in users
    if (user) {
      supabase
        .from("profiles")
        .select("completed_tours")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.completed_tours?.includes(tourKey)) {
            // Sync to localStorage for future fast reads
            localStorage.setItem(tourKey, "true");
          } else {
            // Not completed in DB either — show the tour
            setTimeout(() => setVisible(true), delay);
          }
        });
    } else {
      // No user (unlikely on protected routes) — fall back to showing
      const t = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(t);
    }
  }, [tourKey, delay, user]);

  useEffect(() => {
    if (!visible) return;

    const scrollTimer = updateHighlight();

    // Re-measure on resize (layout shift) and scroll (position shift)
    const onResizeOrScroll = () => {
      const current = steps[step];
      if (!current?.selector) return;
      const el = document.querySelector(current.selector);
      if (el) measureElement(el);
    };

    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true); // capture phase for nested scrollables

    return () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
  }, [visible, step, updateHighlight, measureElement, steps]);

  const dismiss = () => {
    setVisible(false);
    // Dual-write: localStorage (fast) + DB (persistent)
    localStorage.setItem(tourKey, "true");
    if (user) {
      supabase.rpc("append_completed_tour", {
        p_user_id: user.id,
        p_tour_key: tourKey,
      });
    }
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  let cardStyle: React.CSSProperties = {};
  const useCenter = !highlight;

  if (highlight) {
    const spaceBelow = window.innerHeight - (highlight.top + highlight.height);
    const cardHeight = 220;

    if (spaceBelow > cardHeight + 24) {
      cardStyle = {
        top: highlight.top + highlight.height + 16,
        left: Math.max(16, Math.min(highlight.left, window.innerWidth - 400)),
      };
    } else {
      cardStyle = {
        top: Math.max(16, highlight.top - cardHeight - 16),
        left: Math.max(16, Math.min(highlight.left, window.innerWidth - 400)),
      };
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={dismiss}>
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <mask id="tour-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {highlight && (
                    <rect
                      x={highlight.left}
                      y={highlight.top}
                      width={highlight.width}
                      height={highlight.height}
                      rx="12"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                x="0" y="0" width="100%" height="100%"
                fill="rgba(0,0,0,0.65)"
                mask="url(#tour-mask)"
              />
            </svg>
          </div>

          {highlight && (
            <div
              className="fixed z-[101] rounded-xl pointer-events-none"
              style={{
                top: highlight.top,
                left: highlight.left,
                width: highlight.width,
                height: highlight.height,
                boxShadow: "0 0 0 3px rgba(99,102,241,0.6), 0 0 20px rgba(99,102,241,0.3)",
              }}
            />
          )}

          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed z-[102] w-[90vw] max-w-sm ${useCenter ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : ""}`}
            style={!useCenter ? cardStyle : undefined}
          >
            <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4">
                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted-foreground/20"
                      }`}
                    />
                  ))}
                </div>
                <button onClick={dismiss} aria-label="Fechar tutorial" className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 py-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                  {current.icon}
                </div>
                <h3 className="text-base font-display font-semibold text-foreground">{current.title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{current.description}</p>
              </div>

              <div className="px-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground/40">{step + 1}/{steps.length}</span>
                  <button onClick={dismiss} className="text-xs text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors">
                    Pular
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {step > 0 && (
                    <Button size="sm" variant="ghost" onClick={prev} className="gap-1 rounded-lg text-muted-foreground">
                      <ArrowLeft className="h-3.5 w-3.5" /> Anterior
                    </Button>
                  )}
                  <Button size="sm" onClick={next} className="gap-1.5 rounded-lg">
                    {isLast ? "Comecar!" : <>Proximo <ArrowRight className="h-3.5 w-3.5" /></>}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

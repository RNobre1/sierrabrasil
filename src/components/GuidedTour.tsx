import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, Bot, Play, Wifi, MessageSquare } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  selector: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Seu Agente esta aqui",
    description: "Ele foi criado durante o onboarding. Clique pra configurar nome, tom de voz e regras.",
    icon: <Bot className="h-5 w-5" />,
    selector: "[data-tour='agent-card']",
  },
  {
    title: "Teste antes de publicar",
    description: "Use o Playground pra conversar com seu agente como se fosse um cliente.",
    icon: <Play className="h-5 w-5" />,
    selector: "[data-tour='test-button']",
  },
  {
    title: "Conecte seu WhatsApp",
    description: "Va em Canais no menu e conecte seu WhatsApp via QR Code.",
    icon: <Wifi className="h-5 w-5" />,
    selector: "[data-tour='channels-link']",
  },
  {
    title: "Acompanhe as conversas",
    description: "Todas as conversas aparecem aqui. Veja em tempo real o que seu agente responde.",
    icon: <MessageSquare className="h-5 w-5" />,
    selector: "[data-tour='conversations-link']",
  },
];

const TOUR_KEY = "theagent_guided_tour_completed";

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function GuidedTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);

  const updateHighlight = useCallback(() => {
    const current = TOUR_STEPS[step];
    if (!current?.selector) return;
    const el = document.querySelector(current.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      const pad = 8;
      setHighlight({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setHighlight(null);
    }
  }, [step]);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    updateHighlight();
    window.addEventListener("resize", updateHighlight);
    return () => window.removeEventListener("resize", updateHighlight);
  }, [visible, step, updateHighlight]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(TOUR_KEY, "true");
  };

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = TOUR_STEPS[step];
  const cardTop = highlight ? highlight.top + highlight.height + 16 : "50%";
  const cardLeft = highlight ? Math.min(highlight.left, window.innerWidth - 400) : "50%";
  const useCenter = !highlight;

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
            style={!useCenter ? { top: cardTop, left: cardLeft } : undefined}
          >
            <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4">
                <div className="flex gap-1.5">
                  {TOUR_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted-foreground/20"
                      }`}
                    />
                  ))}
                </div>
                <button onClick={dismiss} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
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
                <span className="text-xs text-muted-foreground/40">{step + 1}/{TOUR_STEPS.length}</span>
                <Button size="sm" onClick={next} className="gap-1.5 rounded-lg">
                  {step < TOUR_STEPS.length - 1 ? (
                    <>Proximo <ArrowRight className="h-3.5 w-3.5" /></>
                  ) : (
                    "Comecar!"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, Bot, Play, Wifi, MessageSquare, HelpCircle } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  selector?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Seu Agente está aqui",
    description: "Ele foi criado durante o onboarding e já está pronto para trabalhar. Clique nele para configurar nome, tom de voz e regras.",
    icon: <Bot className="h-5 w-5" />,
  },
  {
    title: "Teste antes de publicar",
    description: "Clique em 'Testar' no card do agente para conversar com ele como se fosse um cliente. Assim você valida as respostas.",
    icon: <Play className="h-5 w-5" />,
  },
  {
    title: "Conecte seu WhatsApp",
    description: "Vá em 'Canais' no menu lateral e conecte seu WhatsApp via QR Code. Em 15 segundos seu agente já estará atendendo.",
    icon: <Wifi className="h-5 w-5" />,
  },
  {
    title: "Acompanhe as conversas",
    description: "Todas as conversas aparecem em 'Conversas' no menu. Você pode ver em tempo real o que seu agente está respondendo.",
    icon: <MessageSquare className="h-5 w-5" />,
  },
];

const TOUR_KEY = "meteora_guided_tour_completed";

export default function GuidedTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = sessionStorage.getItem(TOUR_KEY) || localStorage.getItem(TOUR_KEY);
    if (!done) {
      // Small delay so dashboard content loads first
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

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

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Tour Card */}
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md"
          >
            <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              {/* Progress dots */}
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

              {/* Content */}
              <div className="px-6 py-5">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                  {current.icon}
                </div>
                <h3 className="text-lg font-display font-semibold text-foreground">{current.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{current.description}</p>
              </div>

              {/* Actions */}
              <div className="px-6 pb-5 flex items-center justify-between">
                <a
                  href="https://wa.me/5511999999999?text=Preciso+de+ajuda+com+a+plataforma"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1"
                >
                  <HelpCircle className="h-3 w-3" /> Precisa de ajuda?
                </a>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground/40">{step + 1}/{TOUR_STEPS.length}</span>
                  <Button size="sm" onClick={next} className="gap-1.5 rounded-lg">
                    {step < TOUR_STEPS.length - 1 ? (
                      <>Próximo <ArrowRight className="h-3.5 w-3.5" /></>
                    ) : (
                      "Começar!"
                    )}
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

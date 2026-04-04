import { useState, useEffect } from "react";
import { Headphones, TrendingUp, ArrowRight, Zap, Clock, Shield } from "lucide-react";
import { motion } from "framer-motion";

type AgentClass = "support" | "sales";

interface AgentClassSelectorProps {
  onSelect: (cls: AgentClass) => void;
}

const classes = [
  {
    id: "support" as AgentClass,
    icon: <Headphones className="h-7 w-7" />,
    title: "Atendimento / Suporte",
    description: "FAQ, resolução de problemas, escalonamento, coleta de feedback e acompanhamento de chamados.",
    skills: ["Responder dúvidas frequentes", "Resolver problemas técnicos", "Escalonar para humanos", "Coletar feedback"],
  },
  {
    id: "sales" as AgentClass,
    icon: <TrendingUp className="h-7 w-7" />,
    title: "Vendas / Acompanhamento",
    description: "Qualificação de leads, follow-up, envio de propostas, fechamento de vendas e pós-venda.",
    skills: ["Qualificar leads", "Follow-up automático", "Enviar propostas", "Acompanhar pós-venda"],
  },
];

const highlights = [
  { icon: <Clock className="h-3.5 w-3.5" />, text: "Pronto em minutos" },
  { icon: <Zap className="h-3.5 w-3.5" />, text: "Atende 24h sem parar" },
  { icon: <Shield className="h-3.5 w-3.5" />, text: "Nunca perde um cliente" },
];

export default function AgentClassSelector({ onSelect }: AgentClassSelectorProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center text-center space-y-8 px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-3"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Falta pouco
        </p>
        <h2 className="text-2xl font-display font-bold text-foreground leading-tight max-w-md mx-auto">
          Seu negócio está prestes a ganhar um{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">
            funcionário incansável
          </span>
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Em poucos minutos você vai ter um Agente de Inteligência Artificial que atende seus clientes no automático. Funciona 24h, não tira férias e não deixa ninguém esperando.
        </p>

        <div className="flex items-center justify-center gap-4 pt-2">
          {highlights.map((h, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <span className="text-primary">{h.icon}</span>
              {h.text}
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-2"
      >
        <p className="text-sm font-medium text-foreground">Escolha o perfil do seu agente:</p>
        <p className="text-xs text-muted-foreground">Você pode personalizar tudo depois.</p>
      </motion.div>

      <div className="grid gap-4 w-full max-w-lg sm:grid-cols-2">
        {classes.map((cls, i) => (
          <motion.button
            key={cls.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.12 }}
            onClick={() => ready && onSelect(cls.id)}
            className="group text-left rounded-2xl border border-border/40 bg-card/50 p-5 hover:border-primary/30 hover:bg-primary/5 active:scale-[0.97] transition-all duration-200 cursor-pointer"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary/15 transition-colors">
              {cls.icon}
            </div>
            <h3 className="text-sm font-display font-semibold text-foreground mb-1">{cls.title}</h3>
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
  );
}

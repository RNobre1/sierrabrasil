import { Headphones, TrendingUp, ArrowRight } from "lucide-react";
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

export default function AgentClassSelector({ onSelect }: AgentClassSelectorProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-8 px-4 py-6">
      <div className="space-y-2">
        <h2 className="text-xl font-display font-semibold text-foreground">
          Qual tipo de agente você gostaria de criar?
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Cada tipo vem com habilidades específicas pré-configuradas. Você pode personalizar depois.
        </p>
      </div>

      <div className="grid gap-4 w-full max-w-lg sm:grid-cols-2">
        {classes.map((cls, i) => (
          <motion.button
            key={cls.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onSelect(cls.id)}
            className="group text-left rounded-2xl border border-border/40 bg-card/50 p-5 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
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
  );
}

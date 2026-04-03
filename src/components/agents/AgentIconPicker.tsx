import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AGENT_ICONS, AGENT_ICON_CATEGORIES, getAgentIcon } from "@/lib/agent-icons";
import { cn } from "@/lib/utils";

interface AgentIconPickerProps {
  /** Current icon id (e.g. "bot", "stethoscope") */
  value: string;
  /** Called when user picks a new icon */
  onChange: (iconId: string) => void;
  /** Size of the trigger button */
  size?: "sm" | "md" | "lg";
  /** Extra classes on the trigger wrapper */
  className?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
}

const SIZE_MAP = {
  sm: { trigger: "h-8 w-8 rounded-lg", icon: "h-3.5 w-3.5" },
  md: { trigger: "h-11 w-11 rounded-2xl", icon: "h-5 w-5" },
  lg: { trigger: "h-14 w-14 rounded-2xl", icon: "h-6 w-6" },
};

const CATEGORY_LABELS: Record<string, string> = {
  geral: "Geral",
  vendas: "Vendas",
  atendimento: "Atendimento",
  alimentacao: "Alimentacao",
  saude: "Saude",
  educacao: "Educacao",
  imobiliario: "Imobiliario",
  tecnologia: "Tecnologia",
  beleza: "Beleza",
  fitness: "Fitness",
  juridico: "Juridico",
  financeiro: "Financeiro",
  automotivo: "Automotivo",
  pet: "Pet",
  viagem: "Viagem",
};

export default function AgentIconPicker({
  value,
  onChange,
  size = "md",
  className,
  disabled = false,
}: AgentIconPickerProps) {
  const [open, setOpen] = useState(false);
  const s = SIZE_MAP[size];
  const CurrentIcon = getAgentIcon(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            s.trigger,
            "relative flex items-center justify-center border transition-all",
            "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/10",
            !disabled && "hover:border-primary/30 hover:from-primary/25 hover:to-primary/10 cursor-pointer",
            disabled && "opacity-60 cursor-not-allowed",
            className,
          )}
          title="Alterar icone"
        >
          <CurrentIcon className={cn(s.icon, "text-primary")} />
          {!disabled && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-card border border-border flex items-center justify-center">
              <svg width="7" height="7" viewBox="0 0 7 7" fill="none" className="text-muted-foreground">
                <path d="M5.5 1L6 1.5L2.5 5L1 5.5L1.5 4L5.5 1Z" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] sm:w-[380px] p-0 bg-card border-border"
        align="start"
        sideOffset={8}
      >
        <div className="px-3 pt-3 pb-2">
          <h4 className="text-xs font-semibold text-foreground">Escolher icone</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">Selecione um icone para o agente</p>
        </div>
        <ScrollArea className="h-[320px] px-3 pb-3">
          {AGENT_ICON_CATEGORIES.map((cat) => {
            const icons = AGENT_ICONS.filter((i) => i.category === cat);
            return (
              <div key={cat} className="mb-3">
                <span className="text-[9px] font-semibold uppercase tracking-[.08em] text-muted-foreground/60 mb-1.5 block">
                  {CATEGORY_LABELS[cat] ?? cat}
                </span>
                <div className="grid grid-cols-6 sm:grid-cols-7 gap-1">
                  {icons.map((iconDef) => {
                    const Icon = getAgentIcon(iconDef.id);
                    const selected = value === iconDef.id;
                    return (
                      <button
                        key={iconDef.id}
                        type="button"
                        onClick={() => {
                          onChange(iconDef.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg border transition-all",
                          selected
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/50 hover:border-border/50 hover:text-foreground",
                        )}
                        title={iconDef.label}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[7px] leading-tight truncate w-full text-center">{iconDef.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

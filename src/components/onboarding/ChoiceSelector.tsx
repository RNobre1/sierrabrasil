import { useState } from "react";
import { Check, Instagram, Facebook, Linkedin, Globe, Youtube, FileText, Table, Presentation, Type, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ChoiceOption = {
  label: string;
  icon?: string;
};

type ChoiceData = {
  question: string;
  multiSelect?: boolean;
  options: ChoiceOption[];
};

const iconMap: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4" />,
  tiktok: <span className="text-xs font-bold">TT</span>,
  youtube: <Youtube className="h-4 w-4" />,
  globe: <Globe className="h-4 w-4" />,
  file: <FileText className="h-4 w-4" />,
  table: <Table className="h-4 w-4" />,
  presentation: <Presentation className="h-4 w-4" />,
  text: <Type className="h-4 w-4" />,
  x: <X className="h-4 w-4" />,
};

export default function ChoiceSelector({
  data,
  onSubmit,
  disabled,
}: {
  data: ChoiceData;
  onSubmit: (selected: string[]) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (label: string) => {
    if (disabled) return;
    if (data.multiSelect) {
      setSelected((prev) =>
        prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
      );
    } else {
      setSelected([label]);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <p className="text-sm font-medium text-foreground">{data.question}</p>
      <div className="flex flex-wrap gap-2">
        {data.options.map((opt) => {
          const isSelected = selected.includes(opt.label);
          return (
            <button
              key={opt.label}
              onClick={() => toggle(opt.label)}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium
                border transition-all duration-200 cursor-pointer
                ${isSelected
                  ? "bg-primary/10 border-primary/40 text-primary shadow-sm shadow-primary/10"
                  : "bg-card border-border text-muted-foreground hover:border-primary/20 hover:bg-primary/5"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {opt.icon && iconMap[opt.icon] && (
                <span className={isSelected ? "text-primary" : "text-muted-foreground"}>
                  {iconMap[opt.icon]}
                </span>
              )}
              {opt.label}
              {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <Button
          onClick={() => onSubmit(selected)}
          disabled={disabled}
          size="sm"
          className="bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
        >
          Confirmar seleção
        </Button>
      )}
    </div>
  );
}

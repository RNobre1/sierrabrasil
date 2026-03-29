import { useState } from "react";
import { Instagram, Facebook, Linkedin, Globe, Youtube, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

type SocialPlatform = {
  id: string;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  gradient: string;
};

const platforms: SocialPlatform[] = [
  { id: "instagram", label: "Instagram", icon: <Instagram className="h-4 w-4" />, placeholder: "@seuuser", gradient: "from-pink-500 to-purple-600" },
  { id: "facebook", label: "Facebook", icon: <Facebook className="h-4 w-4" />, placeholder: "facebook.com/suapagina", gradient: "from-blue-600 to-blue-700" },
  { id: "linkedin", label: "LinkedIn", icon: <Linkedin className="h-4 w-4" />, placeholder: "linkedin.com/company/sua-empresa", gradient: "from-blue-500 to-cyan-600" },
  { id: "tiktok", label: "TikTok", icon: <span className="text-xs font-bold leading-none">TT</span>, placeholder: "@seuuser", gradient: "from-gray-800 to-gray-900" },
  { id: "youtube", label: "YouTube", icon: <Youtube className="h-4 w-4" />, placeholder: "youtube.com/@seucanal", gradient: "from-red-500 to-red-600" },
  { id: "website", label: "Site próprio", icon: <Globe className="h-4 w-4" />, placeholder: "https://seusite.com.br", gradient: "from-emerald-500 to-teal-600" },
];

export default function SocialLinksSelector({
  onSubmit,
  disabled,
}: {
  onSubmit: (links: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<Record<string, string>>({});

  const toggle = (id: string) => {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
      const v = { ...values };
      delete v[id];
      setValues(v);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const filledCount = Array.from(selected).filter((id) => values[id]?.trim()).length;
  const canSubmit = selected.size > 0 && filledCount === selected.size;

  const handleSubmit = () => {
    const links: Record<string, string> = {};
    selected.forEach((id) => {
      if (values[id]?.trim()) links[id] = values[id].trim();
    });
    onSubmit(links);
  };

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <p className="text-sm font-medium text-foreground">Quais redes sociais sua empresa possui?</p>
      <p className="text-xs text-muted-foreground">Clique para selecionar e preencha o link ou @</p>

      <div className="space-y-2">
        {platforms.map((p) => {
          const isSelected = selected.has(p.id);
          return (
            <div key={p.id}>
              <button
                onClick={() => toggle(p.id)}
                disabled={disabled}
                className={`
                  w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium
                  border transition-all duration-200 cursor-pointer text-left
                  ${isSelected
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/20 hover:bg-primary/5"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${p.gradient} flex items-center justify-center text-white shrink-0`}>
                  {p.icon}
                </div>
                <span className="flex-1">{p.label}</span>
                {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>

              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-10 pr-2 py-2">
                      <Input
                        value={values[p.id] || ""}
                        onChange={(e) => setValues({ ...values, [p.id]: e.target.value })}
                        placeholder={p.placeholder}
                        disabled={disabled}
                        className="h-9 text-sm bg-background border-border rounded-lg"
                        autoFocus
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {selected.size > 0 && (
        <Button
          onClick={handleSubmit}
          disabled={disabled || !canSubmit}
          size="sm"
          className="bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
        >
          {canSubmit
            ? `Confirmar ${selected.size} ${selected.size === 1 ? "rede" : "redes"}`
            : `Preencha os campos (${filledCount}/${selected.size})`
          }
        </Button>
      )}
    </div>
  );
}

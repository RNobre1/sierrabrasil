import { useState, useRef } from "react";
import { Info, Upload, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AGENT_ICONS, AGENT_ICON_CATEGORIES, getAgentIcon, isCustomIcon, getCustomIconUrl } from "@/lib/agent-icons";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AgentIconPickerProps {
  /** Current icon id (e.g. "bot", "stethoscope") or "custom:data:..." */
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

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 200 * 1024; // 200KB
const MIN_DIMENSION = 64;
const MAX_DIMENSION = 512;

function validateImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      resolve("Formato invalido. Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      resolve(`Arquivo muito grande (${(file.size / 1024).toFixed(0)}KB). Maximo: 200KB.`);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
        resolve(`Imagem muito pequena (${img.width}x${img.height}). Minimo: 64x64px.`);
      } else if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        resolve(`Imagem muito grande (${img.width}x${img.height}). Maximo: 512x512px.`);
      } else {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("Nao foi possivel carregar a imagem.");
    };
    img.src = url;
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AgentIconPicker({
  value,
  onChange,
  size = "md",
  className,
  disabled = false,
}: AgentIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const s = SIZE_MAP[size];

  const isCustom = isCustomIcon(value);
  const CurrentIcon = isCustom ? null : getAgentIcon(value);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = "";

    setUploading(true);
    try {
      const error = await validateImage(file);
      if (error) {
        toast({ title: "Imagem invalida", description: error, variant: "destructive" });
        return;
      }

      const dataUri = await fileToBase64(file);
      onChange(`custom:${dataUri}`);
      setOpen(false);
    } catch {
      toast({ title: "Erro ao processar imagem", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            s.trigger,
            "relative flex items-center justify-center border transition-all overflow-hidden",
            "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/10",
            !disabled && "hover:border-primary/30 hover:from-primary/25 hover:to-primary/10 cursor-pointer",
            disabled && "opacity-60 cursor-not-allowed",
            className,
          )}
          title="Alterar icone"
        >
          {isCustom ? (
            <img
              src={getCustomIconUrl(value)}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            CurrentIcon && <CurrentIcon className={cn(s.icon, "text-primary")} />
          )}
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
          <div className="flex items-start gap-1.5 mt-2 px-2 py-1.5 rounded-md bg-muted/40 border border-border/50">
            <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-px" />
            <p className="text-[10px] text-muted-foreground italic leading-tight">
              Este icone aparece apenas no sistema. Nao altera a foto do WhatsApp ou redes sociais.
            </p>
          </div>
        </div>
        <ScrollArea className="h-[280px] px-3 pb-1">
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
                        {Icon && <Icon className="h-4 w-4" />}
                        <span className="text-[7px] leading-tight truncate w-full text-center">{iconDef.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </ScrollArea>

        {/* Custom image upload section */}
        <div className="px-3 pb-3">
          <Separator className="mb-3" />
          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-muted-foreground">Ou use sua propria imagem</span>

            {/* Preview of current custom image */}
            {isCustom && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                <img
                  src={getCustomIconUrl(value)}
                  alt=""
                  className="h-8 w-8 rounded-md object-cover border border-border/50"
                />
                <span className="text-[10px] text-muted-foreground flex-1">Imagem personalizada ativa</span>
                <button
                  type="button"
                  onClick={() => {
                    onChange("bot");
                    setOpen(false);
                  }}
                  className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Remover imagem personalizada"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed transition-all text-[11px] font-medium",
                uploading
                  ? "border-border/50 text-muted-foreground/50 cursor-wait"
                  : "border-border/80 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 cursor-pointer",
              )}
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Processando..." : "Enviar imagem"}
            </button>
            <div className="text-[9px] text-muted-foreground/60 leading-relaxed space-y-0.5">
              <p>Formatos: JPG, PNG, WebP</p>
              <p>Tamanho: entre 64x64 e 512x512 pixels</p>
              <p>Peso maximo: 200KB</p>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

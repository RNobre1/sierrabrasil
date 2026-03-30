import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Clock, MapPin, ShoppingBag, DollarSign, Globe, Pencil, Check,
  ArrowRight, Sparkles, Phone, MessageCircle, Star, Instagram, Youtube,
  Linkedin, Globe2, ExternalLink, ChevronLeft, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type OverviewData = {
  businessName?: string;
  sector?: string;
  address?: string;
  hours?: string;
  products?: string;
  prices?: string;
  highlights?: string;
  description?: string;
  contactInfo?: string;
  tone?: string;
  socialLinks?: Record<string, string>;
};

type SourcePreview = {
  platform: string;
  url: string;
  displayName?: string;
  profilePic?: string;
  bio?: string;
  followers?: number;
  posts?: number;
  thumbnails?: string[];
};

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5" />,
  youtube: <Youtube className="h-5 w-5" />,
  linkedin: <Linkedin className="h-5 w-5" />,
  tiktok: <Globe2 className="h-5 w-5" />,
  facebook: <Globe2 className="h-5 w-5" />,
  twitter: <Globe2 className="h-5 w-5" />,
  website: <Globe className="h-5 w-5" />,
};

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  facebook: "Facebook",
  twitter: "Twitter / X",
  website: "Website",
};

type Step = { type: "source"; source: SourcePreview } | { type: "details" };

function buildSteps(sources: SourcePreview[]): Step[] {
  const steps: Step[] = sources.map(s => ({ type: "source" as const, source: s }));
  steps.push({ type: "details" as const });
  return steps;
}

/* ─── Source confirmation step ─── */
function SourceStep({
  source,
  onConfirm,
  onEdit,
}: {
  source: SourcePreview;
  onConfirm: () => void;
  onEdit: (url: string) => void;
}) {
  const [editUrl, setEditUrl] = useState(source.url);
  const [isEditing, setIsEditing] = useState(false);
  const icon = platformIcons[source.platform] || <Globe className="h-5 w-5" />;
  const label = platformLabels[source.platform] || source.platform;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col items-center text-center space-y-6 px-2"
    >
      {/* Platform icon */}
      <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-display font-semibold text-foreground">
          Encontrei seu <span className="text-primary">{label}</span>
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Confirma que essa é a conta certa? Você pode editar se precisar.
        </p>
      </div>

      {/* Preview card */}
      <div className="w-full max-w-md rounded-xl border border-border bg-card overflow-hidden">
        {/* Header with profile info */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-border">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 overflow-hidden">
            {source.profilePic ? (
              <img src={source.profilePic} alt="" className="h-full w-full object-cover" />
            ) : (
              icon
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-foreground truncate">
              {source.displayName || label}
            </p>
            {source.followers != null && source.followers > 0 && (
              <p className="text-xs text-muted-foreground">
                {source.followers.toLocaleString()} seguidores
              </p>
            )}
          </div>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Bio */}
        {source.bio && (
          <p className="px-5 py-3 text-sm text-muted-foreground text-left leading-relaxed border-b border-border">
            {source.bio}
          </p>
        )}

        {/* Thumbnails */}
        {source.thumbnails && source.thumbnails.length > 0 && (
          <div className="p-3 grid grid-cols-3 gap-1.5">
            {source.thumbnails.slice(0, 6).map((thumb, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={thumb}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={e => (e.currentTarget.style.display = "none")}
                />
              </div>
            ))}
          </div>
        )}

        {/* URL display / edit */}
        <div className="px-5 py-3 bg-muted/30">
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={editUrl}
                onChange={e => setEditUrl(e.target.value)}
                className="text-xs h-8 bg-background"
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setIsEditing(false); setEditUrl(source.url); }}
                className="h-8 text-xs shrink-0"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => { onEdit(editUrl); setIsEditing(false); }}
                className="h-8 text-xs shrink-0"
              >
                <Check className="h-3 w-3 mr-1" /> Salvar
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground truncate">
                {source.url.toLowerCase().replace(/https?:\/\/(www\.)?/, "")}
              </p>
              <button
                onClick={() => setIsEditing(true)}
                className="h-6 w-6 rounded bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={onConfirm}
        className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20 px-8"
      >
        Confirmar <ArrowRight className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}

/* ─── Details confirmation step ─── */
function DetailsStep({
  data,
  onDataChange,
  onConfirm,
}: {
  data: OverviewData;
  onDataChange: (d: OverviewData) => void;
  onConfirm: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const fields = [
    { icon: <Building2 className="h-4 w-4" />, label: "Negócio", key: "businessName", multiline: false },
    { icon: <MessageCircle className="h-4 w-4" />, label: "Descrição", key: "description", multiline: true },
    { icon: <ShoppingBag className="h-4 w-4" />, label: "Setor", key: "sector", multiline: false },
    { icon: <MapPin className="h-4 w-4" />, label: "Endereço", key: "address", multiline: false },
    { icon: <Clock className="h-4 w-4" />, label: "Horário", key: "hours", multiline: false },
    { icon: <Phone className="h-4 w-4" />, label: "Contato", key: "contactInfo", multiline: false },
    { icon: <ShoppingBag className="h-4 w-4" />, label: "Produtos / Serviços", key: "products", multiline: true },
    { icon: <DollarSign className="h-4 w-4" />, label: "Preços", key: "prices", multiline: true },
    { icon: <Star className="h-4 w-4" />, label: "Diferenciais", key: "highlights", multiline: true },
  ];

  const startEdit = (key: string) => {
    setEditing(key);
    setEditValue((data as any)[key] || "");
  };

  const save = () => {
    if (!editing) return;
    onDataChange({ ...data, [editing]: editValue });
    setEditing(null);
  };

  // Show all fields — filled ones with values, empty ones with placeholder for editing
  const visibleFields = fields;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="space-y-5 px-2"
    >
      <div className="text-center space-y-1.5">
        <h3 className="text-lg font-display font-semibold text-foreground">
          Resumo de{" "}
          <span className="text-primary">{data.businessName || "sua empresa"}</span>
        </h3>
        <p className="text-sm text-muted-foreground">
          Revise os dados e edite o que precisar.
        </p>
      </div>

      <div className="grid gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
        {visibleFields.map((f, i) => {
          const val = (data as any)[f.key] || "";
          const isEditing = editing === f.key;

          return (
            <motion.div
              key={f.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/15"
            >
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  {f.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-0.5">
                    {f.label}
                  </p>
                  {isEditing ? (
                    <div className="space-y-2 mt-1">
                      {f.multiline ? (
                        <Textarea
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="text-sm min-h-[80px] bg-background"
                          autoFocus
                        />
                      ) : (
                        <Input
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="text-sm h-8 bg-background"
                          autoFocus
                        />
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="h-7 text-xs">
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={save} className="h-7 text-xs">
                          <Check className="h-3 w-3 mr-1" /> Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm whitespace-pre-line leading-relaxed ${val ? "text-foreground" : "text-muted-foreground italic cursor-pointer"}`}
                      onClick={() => !val && startEdit(f.key)}
                    >
                      {val || "Clique para adicionar"}
                    </p>
                  )}
                </div>
                {!isEditing && (
                  <button
                    onClick={() => startEdit(f.key)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10"
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-center pt-2">
        <Button
          onClick={onConfirm}
          className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20 px-8"
        >
          Tudo certo, continuar <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

/* ─── Main overview component ─── */
export default function BusinessOverview({
  data,
  sourcePreviews,
  onConfirm,
  onGoBack,
  onDataChange,
}: {
  data: OverviewData;
  sourcePreviews?: SourcePreview[];
  onConfirm: (data: OverviewData) => void;
  onGoBack: () => void;
  onDataChange: (data: OverviewData) => void;
}) {
  const [localData, setLocalData] = useState<OverviewData>(data);
  const steps = buildSteps(sourcePreviews || []);
  const [currentStep, setCurrentStep] = useState(0);
  const total = steps.length;

  const handleDataChange = (d: OverviewData) => {
    setLocalData(d);
    onDataChange(d);
  };

  const next = () => {
    if (currentStep < total - 1) {
      setCurrentStep(s => s + 1);
    } else {
      onConfirm(localData);
    }
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
    else onGoBack();
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full max-w-lg mx-4 rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <button
            onClick={prev}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {currentStep === 0 ? "Voltar" : "Anterior"}
          </button>
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "w-6 bg-primary"
                    : i < currentStep
                    ? "w-1.5 bg-primary/40"
                    : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            {currentStep + 1}/{total}
          </span>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {step.type === "source" ? (
              <SourceStep
                key={`source-${currentStep}`}
                source={step.source}
                onConfirm={next}
                onEdit={(url) => {
                  // Update source URL in local state
                  next();
                }}
              />
            ) : (
              <DetailsStep
                key="details"
                data={localData}
                onDataChange={handleDataChange}
                onConfirm={next}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

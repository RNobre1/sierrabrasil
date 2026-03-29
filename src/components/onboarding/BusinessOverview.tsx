import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Clock, MapPin, ShoppingBag, DollarSign, Globe, Pencil, Check, ArrowLeft, ArrowRight, Sparkles, Phone, MessageCircle, Star, Instagram, Youtube, Linkedin, Globe2, ExternalLink } from "lucide-react";
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

type InfoCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  editKey: string;
  editing: string | null;
  onEdit: (key: string) => void;
  onSave: (key: string, val: string) => void;
  multiline?: boolean;
};

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4" />,
  tiktok: <Globe2 className="h-4 w-4" />,
  facebook: <Globe2 className="h-4 w-4" />,
  twitter: <Globe2 className="h-4 w-4" />,
  website: <Globe className="h-4 w-4" />,
};

const platformColors: Record<string, string> = {
  instagram: "from-pink-500 to-purple-500",
  youtube: "from-red-500 to-red-600",
  linkedin: "from-blue-600 to-blue-700",
  tiktok: "from-black to-gray-800",
  facebook: "from-blue-500 to-blue-600",
  twitter: "from-sky-400 to-sky-500",
  website: "from-emerald-500 to-teal-500",
};

function InfoCard({ icon, label, value, editKey, editing, onEdit, onSave, multiline }: InfoCardProps) {
  const [editValue, setEditValue] = useState(value);
  const isEditing = editing === editKey;

  if (!value && !isEditing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20"
    >
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{label}</p>
          {isEditing ? (
            <div className="space-y-2">
              {multiline ? (
                <Textarea value={editValue} onChange={e => setEditValue(e.target.value)} className="text-sm min-h-[80px] bg-background" autoFocus />
              ) : (
                <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="text-sm h-8 bg-background" autoFocus />
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => onEdit("")} className="h-7 text-xs">Cancelar</Button>
                <Button size="sm" onClick={() => onSave(editKey, editValue)} className="h-7 text-xs">
                  <Check className="h-3 w-3 mr-1" /> Salvar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground whitespace-pre-line">{value}</p>
          )}
        </div>
        {!isEditing && (
          <button
            onClick={() => { setEditValue(value); onEdit(editKey); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10"
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function SourcePreviewCard({ source }: { source: SourcePreview }) {
  const gradient = platformColors[source.platform] || platformColors.website;
  const icon = platformIcons[source.platform] || <Globe className="h-4 w-4" />;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${gradient} px-4 py-3 flex items-center gap-3`}>
        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
          {source.profilePic ? (
            <img src={source.profilePic} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            icon
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{source.displayName || source.platform}</p>
          {source.followers != null && source.followers > 0 && (
            <p className="text-[11px] text-white/70">{source.followers.toLocaleString()} seguidores</p>
          )}
        </div>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Bio */}
      {source.bio && (
        <p className="px-4 pt-3 text-xs text-muted-foreground line-clamp-2">{source.bio}</p>
      )}

      {/* Thumbnails grid */}
      {source.thumbnails && source.thumbnails.length > 0 && (
        <div className="p-3 grid grid-cols-3 gap-1.5">
          {source.thumbnails.slice(0, 6).map((thumb, i) => (
            <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted">
              <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" onError={e => (e.currentTarget.style.display = "none")} />
            </div>
          ))}
        </div>
      )}

      {!source.thumbnails?.length && !source.bio && (
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground italic">Dados coletados com sucesso</p>
        </div>
      )}
    </motion.div>
  );
}

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
  const [editing, setEditing] = useState<string | null>(null);
  const [localData, setLocalData] = useState<OverviewData>(data);

  const handleSave = (key: string, val: string) => {
    const updated = { ...localData, [key]: val };
    setLocalData(updated);
    onDataChange(updated);
    setEditing(null);
  };

  const hasAnyData = !!(
    localData.businessName || localData.sector || localData.address ||
    localData.hours || localData.products || localData.prices ||
    localData.highlights || localData.description || localData.contactInfo
  );

  const cards = [
    { icon: <Building2 className="h-4 w-4" />, label: "Negócio", value: localData.businessName || "", key: "businessName" },
    { icon: <MessageCircle className="h-4 w-4" />, label: "Descrição", value: localData.description || "", key: "description", multiline: true },
    { icon: <ShoppingBag className="h-4 w-4" />, label: "Setor", value: localData.sector || "", key: "sector" },
    { icon: <MapPin className="h-4 w-4" />, label: "Endereço", value: localData.address || "", key: "address" },
    { icon: <Clock className="h-4 w-4" />, label: "Horário de Funcionamento", value: localData.hours || "", key: "hours" },
    { icon: <Phone className="h-4 w-4" />, label: "Contato", value: localData.contactInfo || "", key: "contactInfo" },
    { icon: <ShoppingBag className="h-4 w-4" />, label: "Produtos / Serviços", value: localData.products || "", key: "products", multiline: true },
    { icon: <DollarSign className="h-4 w-4" />, label: "Preços", value: localData.prices || "", key: "prices", multiline: true },
    { icon: <Star className="h-4 w-4" />, label: "Diferenciais", value: localData.highlights || "", key: "highlights", multiline: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
          className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto shadow-lg shadow-primary/20"
        >
          <Sparkles className="h-7 w-7 text-primary-foreground" />
        </motion.div>
        <h2 className="text-xl font-display font-semibold text-foreground">
          {hasAnyData ? (
            <>Dá uma olhada no que encontrei sobre <span className="text-primary">{localData.businessName || "sua empresa"}</span></>
          ) : (
            "Não encontramos muitas informações"
          )}
        </h2>
        <p className="text-sm text-muted-foreground">
          {hasAnyData
            ? "Confira os dados e edite o que quiser. Clique no lápis para ajustar."
            : "Você pode preencher os campos manualmente ou enviar documentos na próxima etapa."
          }
        </p>
      </div>

      {/* Source Previews */}
      {sourcePreviews && sourcePreviews.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">Fontes analisadas</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {sourcePreviews.map((src, i) => (
              <SourcePreviewCard key={i} source={src} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Info Cards */}
      <div className="grid gap-3">
        {cards.map((c, i) => (
          <motion.div key={c.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
            <InfoCard
              icon={c.icon}
              label={c.label}
              value={c.value}
              editKey={c.key}
              editing={editing}
              onEdit={setEditing}
              onSave={handleSave}
              multiline={c.multiline}
            />
          </motion.div>
        ))}
      </div>

      {/* Social Links */}
      {localData.socialLinks && Object.keys(localData.socialLinks).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-primary" />
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Redes Sociais</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(localData.socialLinks).filter(([, v]) => v).map(([k, v]) => (
              <span key={k} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg capitalize font-medium">
                {k}: {String(v)}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onGoBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para as redes
        </Button>
        <Button onClick={() => onConfirm(localData)} className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20">
          Confirmar e continuar <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

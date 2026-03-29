import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Clock, MapPin, ShoppingBag, DollarSign, Globe, Pencil, Check, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
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
  socialLinks?: Record<string, string>;
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
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="text-sm min-h-[80px] bg-background"
                  autoFocus
                />
              ) : (
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="text-sm h-8 bg-background"
                  autoFocus
                />
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

export default function BusinessOverview({
  data,
  onConfirm,
  onGoBack,
  onDataChange,
}: {
  data: OverviewData;
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

  const cards = [
    { icon: <Building2 className="h-4 w-4" />, label: "Negócio", value: localData.businessName || "", key: "businessName" },
    { icon: <ShoppingBag className="h-4 w-4" />, label: "Setor", value: localData.sector || "", key: "sector" },
    { icon: <MapPin className="h-4 w-4" />, label: "Endereço", value: localData.address || "", key: "address" },
    { icon: <Clock className="h-4 w-4" />, label: "Horário de Funcionamento", value: localData.hours || "", key: "hours" },
    { icon: <ShoppingBag className="h-4 w-4" />, label: "Produtos / Serviços", value: localData.products || "", key: "products", multiline: true },
    { icon: <DollarSign className="h-4 w-4" />, label: "Preços", value: localData.prices || "", key: "prices", multiline: true },
    { icon: <Sparkles className="h-4 w-4" />, label: "Destaques", value: localData.highlights || "", key: "highlights", multiline: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto space-y-6"
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
          Olha o que encontrei sobre{" "}
          <span className="text-primary">{localData.businessName || "sua empresa"}</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Confira os dados e edite o que quiser. Clique no lápis para ajustar.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-3">
        {cards.map((c, i) => (
          <motion.div key={c.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-border bg-card p-4"
        >
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center justify-between pt-2"
      >
        <Button variant="ghost" onClick={onGoBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para as redes
        </Button>
        <Button
          onClick={() => onConfirm(localData)}
          className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
        >
          Confirmar e continuar <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

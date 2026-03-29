import { useEffect, useState } from "react";
import { Search, ArrowRight, Inbox, MessageSquare, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/* ─── Types ─────────────────────────────────── */

type FilterKey = "all" | "active" | "resolved" | "escalated";

interface ConversationRow {
  id: string;
  contact_name: string;
  contact_phone: string | null;
  channel: string;
  status: string;
  started_at: string;
  last_message?: string;
}

/* ─── Design tokens (inline, no external deps) ─── */

const STATUS: Record<string, { label: string; color: string; bg: string; border: string; glow: string }> = {
  active:    { label: "Ativa",     color: "#34D399", bg: "rgba(16,185,129,.10)", border: "rgba(16,185,129,.20)", glow: "0 0 8px rgba(16,185,129,.15)" },
  resolved:  { label: "Resolvida", color: "#8B8D9E", bg: "rgba(255,255,255,.04)", border: "rgba(255,255,255,.06)", glow: "none" },
  escalated: { label: "Escalada",  color: "#F87171", bg: "rgba(239,68,68,.10)",  border: "rgba(239,68,68,.20)",  glow: "0 0 8px rgba(239,68,68,.15)" },
};

const CHANNEL: Record<string, { bg: string; fg: string; border: string }> = {
  whatsapp:  { bg: "rgba(37,211,102,.08)",  fg: "#25D366", border: "rgba(37,211,102,.18)" },
  instagram: { bg: "rgba(225,48,108,.08)",  fg: "#E1306C", border: "rgba(225,48,108,.18)" },
  web:       { bg: "rgba(99,102,241,.08)",  fg: "#818CF8", border: "rgba(99,102,241,.18)" },
};

const AVATAR_GRAD = [
  "linear-gradient(135deg,#6366F1,#818CF8)",
  "linear-gradient(135deg,#10B981,#34D399)",
  "linear-gradient(135deg,#F59E0B,#FBBF24)",
  "linear-gradient(135deg,#F43F5E,#FB7185)",
  "linear-gradient(135deg,#06B6D4,#22D3EE)",
  "linear-gradient(135deg,#8B5CF6,#A78BFA)",
];

/* ─── Helpers ─────────────────────────────────── */

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function avatarGrad(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRAD[Math.abs(h) % AVATAR_GRAD.length];
}

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60)   return "agora";
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/* ─── Sub-components ─────────────────────────── */

function StatPill({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-white/[0.02] border border-white/[0.05]">
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-display font-semibold ml-auto" style={{ color }}>{value}</span>
    </div>
  );
}

/* ─── Page ────────────────────────────────────── */

export default function Conversations() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ── fetch (unchanged logic) ── */
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("owner_id", user.id).single();
      if (!tenant) { setLoading(false); return; }
      const { data } = await supabase
        .from("conversations")
        .select("id, contact_name, contact_phone, channel, status, started_at")
        .eq("tenant_id", tenant.id)
        .order("started_at", { ascending: false });
      if (data) {
        const withMsg = await Promise.all(
          data.map(async (c) => {
            const { data: m } = await supabase.from("messages").select("content")
              .eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1);
            return { ...c, last_message: m?.[0]?.content ?? "" };
          }),
        );
        setConversations(withMsg);
      }
      setLoading(false);
    })();
  }, [user]);

  /* ── derived ── */
  const counts: Record<FilterKey, number> = {
    all:       conversations.length,
    active:    conversations.filter(c => c.status === "active").length,
    resolved:  conversations.filter(c => c.status === "resolved").length,
    escalated: conversations.filter(c => c.status === "escalated").length,
  };

  const filtered = conversations.filter(c => {
    if (filter !== "all" && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.contact_name.toLowerCase().includes(q) || (c.contact_phone ?? "").includes(q);
    }
    return true;
  });

  /* ── loading ── */
  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl">
            <div className="h-10 w-10 rounded-xl skeleton-cosmos shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-36 skeleton-cosmos rounded" />
              <div className="h-3 w-56 skeleton-cosmos rounded" />
            </div>
            <div className="h-6 w-16 skeleton-cosmos rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  /* ── render ── */
  return (
    <div className="space-y-6">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[22px] font-display font-bold text-foreground tracking-[-0.03em]">
          Conversas
        </h1>
        <p className="text-[13px] text-muted-foreground/70">
          Todas as interações do seu agente — em tempo real.
        </p>
      </div>

      {/* ═══ SUMMARY STATS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatPill icon={MessageSquare} label="Total"     value={counts.all}       color="#818CF8" />
        <StatPill icon={Zap}           label="Ativas"    value={counts.active}    color="#34D399" />
        <StatPill icon={CheckCircle2}  label="Resolvidas" value={counts.resolved}  color="#8B8D9E" />
        <StatPill icon={AlertTriangle} label="Escaladas" value={counts.escalated} color="#F87171" />
      </div>

      {/* ═══ FILTER + SEARCH BAR ═══ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        {/* Segmented filter */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.025] border border-white/[0.06]">
          {(["all", "active", "resolved", "escalated"] as FilterKey[]).map(key => {
            const on = filter === key;
            const label = key === "all" ? "Todas" : STATUS[key]?.label ?? key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={[
                  "relative px-3.5 py-[6px] rounded-[9px] text-[12px] font-semibold transition-all duration-200",
                  on
                    ? "bg-white/[0.07] text-foreground shadow-[0_1px_3px_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.04)]"
                    : "text-muted-foreground/70 hover:text-foreground/60 hover:bg-white/[0.025]",
                ].join(" ")}
              >
                {label}
                {counts[key] > 0 && (
                  <span
                    className={[
                      "ml-1.5 text-[9px] font-mono tabular-nums px-[6px] py-[2px] rounded-full",
                      on ? "bg-cosmos-indigo/20 text-cosmos-indigo" : "bg-white/[0.05] text-muted-foreground/50",
                    ].join(" ")}
                  >
                    {counts[key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/35" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            className="pl-10 h-[34px] text-[12.5px] bg-white/[0.02]"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ═══ LIST ═══ */}
      <div className="cosmos-card overflow-hidden">
        {/* Column hint (desktop only) */}
        <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 border-b border-white/[0.04] text-[10px] font-mono uppercase tracking-[.08em] text-muted-foreground/35 select-none">
          <span className="w-10 shrink-0" />
          <span className="flex-1">Contato</span>
          <span className="w-20 text-center">Canal</span>
          <span className="w-24 text-center">Status</span>
          <span className="w-12 text-right">Tempo</span>
          <span className="w-5" />
        </div>

        {filtered.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.10)" }}
            >
              <Inbox className="h-6 w-6" style={{ color: "rgba(99,102,241,.35)" }} />
            </div>
            <p className="text-[13.5px] font-medium text-foreground/50">
              {search ? `Sem resultados para "${search}"` : "Nenhuma conversa ainda"}
            </p>
            <p className="text-[12px] text-muted-foreground/35 mt-1 max-w-xs">
              {search ? "Tente outro termo de busca." : "Quando seu atendente receber a primeira mensagem, ela aparecerá aqui."}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((c, i) => {
              const st = STATUS[c.status] ?? STATUS.resolved;
              const ch = CHANNEL[c.channel] ?? CHANNEL.web;

              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/conversations/${c.id}`)}
                  className="group flex items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-150 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]"
                  style={{ animation: `fadeInUp 350ms cubic-bezier(.16,1,.3,1) ${i * 35}ms both` }}
                >
                  {/* Avatar */}
                  <div
                    className="h-10 w-10 rounded-[10px] flex items-center justify-center text-white font-display font-semibold text-[11.5px] shrink-0"
                    style={{ background: avatarGrad(c.contact_name), boxShadow: "0 2px 6px rgba(0,0,0,.25)" }}
                  >
                    {initials(c.contact_name)}
                  </div>

                  {/* Name + preview */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate leading-snug">
                      {c.contact_name}
                    </p>
                    {c.last_message ? (
                      <p className="text-[11.5px] text-muted-foreground/45 truncate mt-[2px] leading-snug max-w-md">
                        {c.last_message}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/25 mt-[2px] italic">Sem mensagens</p>
                    )}
                  </div>

                  {/* Channel */}
                  <span
                    className="hidden sm:inline-flex items-center px-2 py-[3px] rounded-md text-[9px] font-bold uppercase tracking-[.06em] shrink-0 w-20 justify-center"
                    style={{ background: ch.bg, color: ch.fg, border: `1px solid ${ch.border}` }}
                  >
                    {c.channel}
                  </span>

                  {/* Status badge */}
                  <span
                    className="inline-flex items-center gap-[5px] px-2.5 py-[4px] rounded-full text-[10px] font-semibold shrink-0"
                    style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, boxShadow: st.glow }}
                  >
                    <span
                      className={`w-[5px] h-[5px] rounded-full ${c.status === "active" ? "animate-pulse-dot" : ""}`}
                      style={{ background: st.color }}
                    />
                    {st.label}
                  </span>

                  {/* Time */}
                  <span className="text-[10px] text-muted-foreground/30 font-mono tabular-nums w-10 text-right shrink-0">
                    {timeAgo(c.started_at)}
                  </span>

                  {/* Arrow */}
                  <ArrowRight className="h-3.5 w-3.5 text-white/[0.06] group-hover:text-white/[0.15] transition-colors shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

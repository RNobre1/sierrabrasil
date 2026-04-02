import { useEffect, useState } from "react";
import { Search, ArrowRight, Inbox, MessageSquare, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GuidedTour from "@/components/GuidedTour";
import { CONVERSATIONS_STEPS, CONVERSATIONS_TOUR_KEY } from "@/lib/tour-steps";

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

const AVATAR = [
  "bg-gradient-to-br from-indigo-500 to-indigo-400",
  "bg-gradient-to-br from-emerald-500 to-emerald-400",
  "bg-gradient-to-br from-amber-500 to-amber-400",
  "bg-gradient-to-br from-rose-500 to-rose-400",
  "bg-gradient-to-br from-cyan-500 to-cyan-400",
  "bg-gradient-to-br from-violet-500 to-violet-400",
];

function pick(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return AVATAR[Math.abs(h) % AVATAR.length]; }
function ini(n: string) { return n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }
function ago(d: string) { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 60) return "agora"; if (s < 3600) return `${Math.floor(s / 60)}min`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`; }

function Pill({ icon: I, label, value, cls }: { icon: any; label: string; value: number; cls: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.08] transition-colors">
      <I className={`h-3.5 w-3.5 shrink-0 ${cls}`} />
      <span className="text-[11px] text-white/40 font-medium">{label}</span>
      <span className={`text-[15px] font-display font-semibold tracking-tight ml-auto ${cls}`}>{value}</span>
    </div>
  );
}

function ChBadge({ ch }: { ch: string }) {
  const m: Record<string, string> = {
    whatsapp: "bg-green-500/10 text-green-400 border-green-500/20",
    instagram: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    web: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  };
  return <span className={`hidden sm:inline-flex items-center justify-center w-[82px] px-2 py-[3px] rounded-md text-[9px] font-bold uppercase tracking-[.06em] border ${m[ch] ?? m.web}`}>{ch}</span>;
}

function StBadge({ st }: { st: string }) {
  const m: Record<string, { l: string; c: string; d: string }> = {
    active:    { l: "Ativa",     c: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,.12)]", d: "bg-emerald-400 animate-pulse-dot" },
    resolved:  { l: "Resolvida", c: "bg-white/[0.04] text-white/40 border-white/[0.06]", d: "bg-white/30" },
    escalated: { l: "Escalada",  c: "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,.12)]", d: "bg-red-400" },
  };
  const cfg = m[st] ?? m.resolved;
  return (
    <span className={`inline-flex items-center gap-[5px] px-2.5 py-[3px] rounded-full text-[10px] font-semibold border ${cfg.c}`}>
      <span className={`w-[5px] h-[5px] rounded-full ${cfg.d}`} />
      {cfg.l}
    </span>
  );
}

export default function Conversations() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: t } = await supabase.from("tenants").select("id").eq("owner_id", user.id).single();
      if (!t) { setLoading(false); return; }
      const { data } = await supabase.from("conversations").select("id, contact_name, contact_phone, channel, status, started_at").eq("tenant_id", t.id).order("started_at", { ascending: false });
      if (data) {
        const enriched = await Promise.all(data.map(async c => {
          const { data: m } = await supabase.from("messages").select("content").eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1);
          return { ...c, last_message: m?.[0]?.content ?? "" };
        }));
        setRows(enriched);
      }
      setLoading(false);
    })();
  }, [user]);

  const cnt: Record<FilterKey, number> = {
    all: rows.length, active: rows.filter(c => c.status === "active").length,
    resolved: rows.filter(c => c.status === "resolved").length, escalated: rows.filter(c => c.status === "escalated").length,
  };
  const filtered = rows.filter(c => {
    if (filter !== "all" && c.status !== filter) return false;
    if (search) { const q = search.toLowerCase(); return c.contact_name.toLowerCase().includes(q) || (c.contact_phone ?? "").includes(q); }
    return true;
  });

  if (loading) return (
    <div className="space-y-5 pt-2">
      <div className="h-7 w-40 skeleton-cosmos rounded-lg" />
      <div className="grid grid-cols-4 gap-2">{[...Array(4)].map((_, i) => <div key={i} className="h-11 skeleton-cosmos rounded-[10px]" />)}</div>
      <div className="cosmos-card p-0 divide-y divide-white/[0.03]">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <div className="h-10 w-10 rounded-[10px] skeleton-cosmos shrink-0" />
            <div className="flex-1 space-y-1.5"><div className="h-3 w-32 skeleton-cosmos rounded" /><div className="h-2.5 w-52 skeleton-cosmos rounded" /></div>
            <div className="h-5 w-20 skeleton-cosmos rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-display font-bold text-white tracking-[-0.03em]">Conversas</h1>
        <p className="text-[13px] text-white/35 mt-0.5">Todas as interações do seu agente — em tempo real.</p>
      </div>

      <div data-tour="conversations-stats" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Pill icon={MessageSquare} label="Total" value={cnt.all} cls="text-indigo-400" />
        <Pill icon={Zap} label="Ativas" value={cnt.active} cls="text-emerald-400" />
        <Pill icon={CheckCircle2} label="Resolvidas" value={cnt.resolved} cls="text-white/40" />
        <Pill icon={AlertTriangle} label="Escaladas" value={cnt.escalated} cls="text-red-400" />
      </div>

      <div data-tour="conversations-filters" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.025] border border-white/[0.06]">
          {(["all", "active", "resolved", "escalated"] as FilterKey[]).map(k => {
            const on = filter === k;
            const lbl = k === "all" ? "Todas" : k === "active" ? "Ativa" : k === "resolved" ? "Resolvida" : "Escalada";
            return (
              <button key={k} onClick={() => setFilter(k)} className={`px-3.5 py-[5px] rounded-[9px] text-[11.5px] font-semibold transition-all duration-150 ${on ? "bg-white/[0.07] text-white shadow-[0_1px_2px_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.04)]" : "text-white/30 hover:text-white/50 hover:bg-white/[0.02]"}`}>
                {lbl}
                {cnt[k] > 0 && <span className={`ml-1.5 text-[9px] font-mono tabular-nums px-[5px] py-[1px] rounded-full ${on ? "bg-indigo-500/20 text-indigo-400" : "bg-white/[0.04] text-white/20"}`}>{cnt[k]}</span>}
              </button>
            );
          })}
        </div>
        <div data-tour="conversations-search" className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" />
          <Input placeholder="Buscar por nome ou telefone…" className="pl-9 h-[34px] text-[12px] bg-white/[0.015] border-white/[0.05] placeholder:text-white/20" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div data-tour="conversations-list" className="cosmos-card p-0 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[40px_1fr_82px_auto_48px_20px] items-center gap-4 px-4 py-2 border-b border-white/[0.04] text-[9px] font-mono uppercase tracking-[.1em] text-white/20 select-none">
          <span /><span>Contato</span><span className="text-center">Canal</span><span className="text-center w-24">Status</span><span className="text-right">Tempo</span><span />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/[0.06] border border-indigo-500/[0.1] flex items-center justify-center mb-4">
              <Inbox className="h-6 w-6 text-indigo-400/30" />
            </div>
            <p className="text-[13px] font-medium text-white/40">{search ? `Sem resultados para "${search}"` : "Nenhuma conversa ainda"}</p>
            <p className="text-[11px] text-white/20 mt-1 max-w-[260px]">{search ? "Tente outro termo." : "Quando seu atendente receber a primeira mensagem ela aparecerá aqui."}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {filtered.map((c, i) => (
              <div key={c.id} onClick={() => nav(`/conversations/${c.id}`)}
                className="group grid grid-cols-[40px_1fr_auto] sm:grid-cols-[40px_1fr_82px_auto_48px_20px] items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-150 hover:bg-white/[0.015]"
              >
                <div className={`h-10 w-10 rounded-[10px] flex items-center justify-center text-white font-display font-semibold text-[11px] shadow-lg shrink-0 ${pick(c.contact_name)}`}>{ini(c.contact_name)}</div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white/90 truncate leading-snug">{c.contact_name}</p>
                  {c.last_message ? <p className="text-[11px] text-white/25 truncate mt-[1px] max-w-md leading-snug">{c.last_message}</p> : <p className="text-[10px] text-white/15 italic mt-[1px]">Sem mensagens</p>}
                </div>
                <ChBadge ch={c.channel} />
                <StBadge st={c.status} />
                <span className="hidden sm:block text-[10px] text-white/20 font-mono tabular-nums text-right">{ago(c.started_at)}</span>
                <ArrowRight className="hidden sm:block h-3.5 w-3.5 text-white/[0.05] group-hover:text-white/[0.15] transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>
      <GuidedTour steps={CONVERSATIONS_STEPS} tourKey={CONVERSATIONS_TOUR_KEY} />
    </div>
  );
}

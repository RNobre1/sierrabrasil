import { useEffect, useState, useMemo } from "react";
import { MessageSquare, CheckCircle2, Clock, Play, Settings, Sparkles, ArrowRight, Zap, BarChart3, Crown, Activity } from "lucide-react";
import TrialTimer from "@/components/TrialTimer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { MeteoraWatermark } from "@/components/MeteoraBrand";

interface Attendant { id: string; name: string; status: string; channels: string[] | null; model: string | null; class: string | null; }
interface Conversation { id: string; contact_name: string; status: string; started_at: string; channel: string; }

/* ─── helpers ─── */
const AVATAR = [
  "bg-gradient-to-br from-indigo-500 to-indigo-400",
  "bg-gradient-to-br from-emerald-500 to-emerald-400",
  "bg-gradient-to-br from-amber-500 to-amber-400",
  "bg-gradient-to-br from-rose-500 to-rose-400",
  "bg-gradient-to-br from-cyan-500 to-cyan-400",
  "bg-gradient-to-br from-violet-500 to-violet-400",
];
function pick(n: string) { let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h); return AVATAR[Math.abs(h) % AVATAR.length]; }
function ini(n: string) { return n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }
function ago(d: string) { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 60) return "agora"; if (s < 3600) return `${Math.floor(s / 60)}min`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`; }

/* ─── KPI Card ─── */
function KPI({ icon: I, label, value, sub, accent, iconBg }: { icon: any; label: string; value: string; sub?: string; accent: string; iconBg: string }) {
  return (
    <div className="cosmos-card p-5 card-stagger group">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`h-9 w-9 rounded-[10px] flex items-center justify-center border ${iconBg} transition-shadow group-hover:shadow-lg`}>
          <I className={`w-[16px] h-[16px] ${accent}`} />
        </div>
        <span className="text-[11.5px] font-medium text-white/40">{label}</span>
      </div>
      <span className="text-[30px] font-display font-light text-white tracking-[-0.04em] leading-[1.1]">{value}</span>
      {sub && <p className="text-[10.5px] text-white/25 mt-1.5 font-mono">{sub}</p>}
    </div>
  );
}

/* ─── Chart ─── */
function MiniChart({ data, color }: { data: any[]; color: string }) {
  return (
    <div className="h-[140px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip contentStyle={{ backgroundColor: "#161822", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "11px", color: "#F0F0F5", fontFamily: "DM Sans", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }} />
          <Area type="monotone" dataKey="count" stroke={color} strokeWidth={2} fill="url(#cGrad)" dot={false} activeDot={{ r: 4, fill: color, stroke: "#161822", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Channel badge ─── */
function ChBadge({ ch }: { ch: string }) {
  const m: Record<string, string> = {
    whatsapp: "bg-green-500/10 text-green-400 border-green-500/20",
    instagram: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    web: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  };
  return <span className={`inline-flex items-center px-2 py-[2px] rounded-md text-[9px] font-bold uppercase tracking-[.05em] border ${m[ch] ?? m.web}`}>{ch}</span>;
}

/* ─── Status badge (compact) ─── */
function StBadge({ st }: { st: string }) {
  const m: Record<string, { l: string; c: string; d: string }> = {
    active: { l: "Ativa", c: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", d: "bg-emerald-400 animate-pulse-dot" },
    resolved: { l: "Resolvida", c: "bg-white/[0.04] text-white/35 border-white/[0.06]", d: "bg-white/25" },
    escalated: { l: "Escalada", c: "bg-red-500/10 text-red-400 border-red-500/20", d: "bg-red-400" },
  };
  const cfg = m[st] ?? m.resolved;
  return (
    <span className={`inline-flex items-center gap-[4px] px-2 py-[2px] rounded-full text-[9.5px] font-semibold border ${cfg.c}`}>
      <span className={`w-[4px] h-[4px] rounded-full ${cfg.d}`} />
      {cfg.l}
    </span>
  );
}

/* ═══════════════════════════════════════ */
/*               PAGE                      */
/* ═══════════════════════════════════════ */
export default function Dashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [tenantCreatedAt, setTenantCreatedAt] = useState("");
  const [tenantPlan, setTenantPlan] = useState("starter");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: tenant } = await supabase.from("tenants").select("id, created_at, plan").eq("owner_id", user.id).single();
      if (!tenant) { setLoading(false); return; }
      setTenantCreatedAt(tenant.created_at);
      setTenantPlan(tenant.plan || "starter");
      const [attRes, convRes, allConvRes, msgRes] = await Promise.all([
        supabase.from("attendants").select("id, name, status, channels, model").eq("tenant_id", tenant.id).limit(1).single(),
        supabase.from("conversations").select("id, contact_name, status, started_at, channel").eq("tenant_id", tenant.id).order("started_at", { ascending: false }).limit(6),
        supabase.from("conversations").select("id, contact_name, status, started_at, channel").eq("tenant_id", tenant.id),
        supabase.from("messages").select("id", { count: "exact", head: true }),
      ]);
      setAttendant(attRes.data);
      setConversations(convRes.data ?? []);
      setAllConversations(allConvRes.data ?? []);
      setTotalMessages(msgRes.count ?? 0);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const totalConv = allConversations.length;
  const activeCount = allConversations.filter(c => c.status === "active").length;
  const resolvedCount = allConversations.filter(c => c.status === "resolved").length;
  const resRate = totalConv ? Math.round(resolvedCount / totalConv * 100) : 0;

  const chartData = useMemo(() => {
    const d: Record<string, number> = {};
    allConversations.forEach(c => {
      const day = new Date(c.started_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      d[day] = (d[day] || 0) + 1;
    });
    return Object.entries(d).slice(-7).map(([date, count]) => ({ date, count }));
  }, [allConversations]);

  /* skeleton */
  if (loading) return (
    <div className="space-y-5">
      <div className="h-7 w-44 skeleton-cosmos rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-[110px] skeleton-cosmos rounded-[14px]" />)}</div>
      <div className="h-[80px] skeleton-cosmos rounded-[14px]" />
      <div className="grid lg:grid-cols-2 gap-4"><div className="h-[200px] skeleton-cosmos rounded-[14px]" /><div className="h-[200px] skeleton-cosmos rounded-[14px]" /></div>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── Enterprise Banner ── */}
      {tenantPlan === "enterprise" && (
        <div className="rounded-[14px] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 relative overflow-hidden bg-gradient-to-br from-[#1a1040] to-[#0f172a] border border-indigo-500/20">
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-indigo-500/15 blur-2xl" />
          <div className="h-[42px] w-[42px] shrink-0 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-violet-400 shadow-glow-indigo">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0 relative z-10">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-display font-semibold text-white">Enterprise</h2>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[.06em] bg-amber-500/15 border border-amber-500/25 text-amber-300">✦ VIP</span>
            </div>
            <p className="text-[11px] text-white/35 mt-0.5">Manager dedicado · Relatórios ilimitados · Até 100 agentes</p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 text-[11px] gap-1.5 border-indigo-400/25 text-indigo-400 hover:bg-indigo-500/10 w-full sm:w-auto rounded-[10px]">
            <MessageSquare className="h-3.5 w-3.5" /> Falar com Manager
          </Button>
        </div>
      )}

      {tenantCreatedAt && tenantPlan !== "enterprise" && <TrialTimer createdAt={tenantCreatedAt} />}

      {/* ── Header ── */}
      <div>
        <h1 className="text-[22px] font-display font-bold text-white tracking-[-0.03em]">Dashboard</h1>
        <p className="text-[13px] text-white/35 mt-0.5">Visão geral do seu agente inteligente</p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI icon={MessageSquare} label="Conversas" value={String(totalConv)} accent="text-indigo-400" iconBg="bg-indigo-500/10 border-indigo-500/20" sub={`${totalMessages} msgs trocadas`} />
        <KPI icon={CheckCircle2} label="Resolvidas" value={String(resolvedCount)} accent="text-emerald-400" iconBg="bg-emerald-500/10 border-emerald-500/20" sub={`${resRate}% resolução`} />
        <KPI icon={Clock} label="Ativas" value={String(activeCount)} accent="text-amber-400" iconBg="bg-amber-500/10 border-amber-500/20" />
        <KPI icon={Zap} label="Mensagens" value={String(totalMessages)} accent="text-violet-400" iconBg="bg-violet-500/10 border-violet-500/20" sub="total processadas" />
      </div>

      {/* ── Attendant Card ── */}
      {attendant && (
        <div className="cosmos-card p-5 surface-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="h-11 w-11 rounded-[12px] flex items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-violet-400 shadow-glow-indigo">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#161822] ${attendant.status === "online" ? "bg-emerald-400 animate-pulse-glow" : "bg-white/25"}`} />
              </div>
              <div>
                <h2 className="text-[15px] font-display font-semibold text-white">{attendant.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {attendant.channels?.map(ch => <ChBadge key={ch} ch={ch} />)}
                  <span className={`text-[11px] font-semibold flex items-center gap-1 ${attendant.status === "online" ? "text-emerald-400" : "text-white/30"}`}>
                    <Activity className="h-3 w-3" /> {attendant.status === "online" ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => nav("/attendant/playground")} className="gap-1.5 text-[11px] rounded-[9px] border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.1]">
                <Play className="h-3 w-3" /> Testar
              </Button>
              <Button size="sm" variant="outline" onClick={() => nav("/attendant/config")} className="gap-1.5 text-[11px] rounded-[9px] border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.1]">
                <Settings className="h-3 w-3" /> Configurar
              </Button>
              <Button size="sm" onClick={() => nav("/conversations")} className="gap-1.5 text-[11px] rounded-[9px]">
                <MessageSquare className="h-3 w-3" /> Conversas
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chart + Recent Conversations ── */}
      <div className="grid gap-4 lg:grid-cols-5">

        {/* Chart — wider */}
        <div className="cosmos-card p-5 lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-[8px] flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20">
              <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <span className="text-[12.5px] font-display font-semibold text-white/80">Conversas por dia</span>
          </div>
          {chartData.length > 0 ? (
            <MiniChart data={chartData} color="#6366F1" />
          ) : (
            <div className="flex items-center justify-center h-[140px]">
              <p className="text-[12px] text-white/20">Sem dados para exibir</p>
            </div>
          )}
        </div>

        {/* Recent Conversations — narrower */}
        <div className="cosmos-card p-0 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-[8px] flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20">
                <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
              </div>
              <span className="text-[12.5px] font-display font-semibold text-white/80">Últimas Conversas</span>
            </div>
            <button onClick={() => nav("/conversations")} className="text-[10px] font-medium text-white/25 hover:text-white/50 transition-colors flex items-center gap-1">
              Ver todas <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="flex-1 divide-y divide-white/[0.03]">
            {conversations.length === 0 && (
              <p className="text-[12px] text-white/20 text-center py-10">Nenhuma conversa ainda</p>
            )}
            {conversations.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all duration-150 hover:bg-white/[0.015]"
                onClick={() => nav(`/conversations/${c.id}`)}
              >
                <div className={`h-8 w-8 rounded-[8px] flex items-center justify-center text-white font-display font-semibold text-[10px] shrink-0 ${pick(c.contact_name)}`}>
                  {ini(c.contact_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-white/80 truncate">{c.contact_name}</p>
                  <p className="text-[9.5px] text-white/20 capitalize font-mono">{c.channel}</p>
                </div>
                <StBadge st={c.status} />
                <span className="text-[9px] text-white/15 font-mono w-7 text-right shrink-0">{ago(c.started_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <MeteoraWatermark />
    </div>
  );
}

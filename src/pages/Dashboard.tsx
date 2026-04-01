import { useEffect, useState, useMemo } from "react";
import {
  MessageSquare, CheckCircle2, Play, Settings, Sparkles, ArrowRight,
  Zap, BarChart3, Crown, Activity, TrendingUp, TrendingDown, Bot,
  ChevronRight, ArrowUpRight, ArrowDownRight, Percent, Radio
} from "lucide-react";
import TrialTimer from "@/components/TrialTimer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { MeteoraWatermark } from "@/components/MeteoraBrand";
import GuidedTour from "@/components/GuidedTour";
import WhatsAppConnectBanner from "@/components/WhatsAppConnectBanner";

/* ═══ Types ═══ */
interface Attendant { id: string; name: string; status: string; channels: string[] | null; model: string | null; class?: string | null; }
interface Conversation { id: string; contact_name: string; status: string; started_at: string; channel: string; }

/* ═══ Design tokens ═══ */
const NEON = "#39FF14";
const AVATAR = [
  "bg-gradient-to-br from-indigo-500 to-indigo-400",
  "bg-gradient-to-br from-emerald-500 to-emerald-400",
  "bg-gradient-to-br from-amber-500 to-amber-400",
  "bg-gradient-to-br from-rose-500 to-rose-400",
  "bg-gradient-to-br from-cyan-500 to-cyan-400",
  "bg-gradient-to-br from-violet-500 to-violet-400",
];
const PIE_COLORS = ["#6366F1", "#10B981", "#F59E0B"];

function pick(n: string) { let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h); return AVATAR[Math.abs(h) % AVATAR.length]; }
function ini(n: string) { return n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }
function ago(d: string) { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 60) return "agora"; if (s < 3600) return `${Math.floor(s / 60)}min`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`; }

/* ═══ Tooltip ═══ */
function CT({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-[11px] border border-white/[0.1] shadow-2xl backdrop-blur-sm" style={{ background: "rgba(22,24,34,.95)" }}>
      <p className="text-white/35 font-mono text-[9px] mb-0.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold text-white">{p.value} <span className="text-white/25 font-normal text-[10px]">{p.name || ""}</span></p>
      ))}
    </div>
  );
}

/* ═══ Status badge ═══ */
function StBadge({ st }: { st: string }) {
  const m: Record<string, { l: string; c: string; d: string }> = {
    active: { l: "Ativa", c: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", d: "bg-emerald-400 animate-pulse-dot" },
    resolved: { l: "Resolvida", c: "bg-white/[0.04] text-white/30 border-white/[0.06]", d: "bg-white/20" },
    escalated: { l: "Escalada", c: "bg-red-500/10 text-red-400 border-red-500/20", d: "bg-red-400" },
  };
  const cfg = m[st] ?? m.resolved;
  return <span className={`inline-flex items-center gap-[4px] px-2 py-[2px] rounded-full text-[9px] font-semibold border ${cfg.c}`}><span className={`w-[4px] h-[4px] rounded-full ${cfg.d}`} />{cfg.l}</span>;
}

/* ═══════════════════════════════════════ */
export default function Dashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [recentConvs, setRecentConvs] = useState<Conversation[]>([]);
  const [allConvs, setAllConvs] = useState<Conversation[]>([]);
  const [totalMsgs, setTotalMsgs] = useState(0);
  const [tenantCreatedAt, setTenantCreatedAt] = useState("");
  const [tenantPlan, setTenantPlan] = useState("starter");
  const [loading, setLoading] = useState(true);
  const [hasWhatsApp, setHasWhatsApp] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: t } = await supabase.from("tenants").select("id, created_at, plan").eq("owner_id", user.id).single();
      if (!t) { setLoading(false); return; }
      setTenantCreatedAt(t.created_at);
      setTenantPlan(t.plan || "starter");
      const [att, conv, allC, msg] = await Promise.all([
        supabase.from("attendants").select("id, name, status, channels, model, class").eq("tenant_id", t.id),
        supabase.from("conversations").select("id, contact_name, status, started_at, channel").eq("tenant_id", t.id).order("started_at", { ascending: false }).limit(10),
        supabase.from("conversations").select("id, contact_name, status, started_at, channel").eq("tenant_id", t.id),
        supabase.from("messages").select("id", { count: "exact", head: true }),
      ]);
      setAttendants(att.data ?? []);
      setRecentConvs(conv.data ?? []);
      setAllConvs(allC.data ?? []);
      setTotalMsgs(msg.count ?? 0);

      const { data: wpInstances } = await supabase
        .from("whatsapp_instances")
        .select("id, status")
        .eq("tenant_id", t.id)
        .eq("status", "connected")
        .limit(1);
      setHasWhatsApp((wpInstances ?? []).length > 0);

      setLoading(false);
    })();
  }, [user]);

  /* metrics */
  const total = allConvs.length;
  const active = allConvs.filter(c => c.status === "active").length;
  const resolved = allConvs.filter(c => c.status === "resolved").length;
  const escalated = allConvs.filter(c => c.status === "escalated").length;
  const resRate = total ? Math.round(resolved / total * 100) : 0;
  const onlineAg = attendants.filter(a => a.status === "online").length;

  /* chart data */
  const dayChart = useMemo(() => {
    const d: Record<string, number> = {};
    allConvs.forEach(c => { const k = new Date(c.started_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); d[k] = (d[k] || 0) + 1; });
    return Object.entries(d).slice(-7).map(([date, count]) => ({ date, count }));
  }, [allConvs]);

  const statusPie = useMemo(() => [
    { name: "Ativas", value: active },
    { name: "Resolvidas", value: resolved },
    { name: "Escaladas", value: escalated },
  ].filter(i => i.value > 0), [active, resolved, escalated]);

  const channelBars = useMemo(() => {
    const ch: Record<string, number> = {};
    allConvs.forEach(c => { ch[c.channel] = (ch[c.channel] || 0) + 1; });
    return Object.entries(ch).map(([k, v]) => ({ channel: k.charAt(0).toUpperCase() + k.slice(1), count: v }));
  }, [allConvs]);
  const CH_COLORS: Record<string, string> = { Whatsapp: "#25D366", Instagram: "#E1306C", Web: "#6366F1" };

  /* skeleton */
  if (loading) return (
    <div className="space-y-3">
      <div className="h-6 w-36 skeleton-cosmos rounded" />
      <div className="grid grid-cols-4 gap-2.5">{[...Array(4)].map((_, i) => <div key={i} className="h-[88px] skeleton-cosmos rounded-xl" />)}</div>
      <div className="grid grid-cols-5 gap-2.5"><div className="col-span-3 h-[260px] skeleton-cosmos rounded-xl" /><div className="col-span-2 h-[260px] skeleton-cosmos rounded-xl" /></div>
      <div className="grid grid-cols-3 gap-2.5">{[...Array(3)].map((_, i) => <div key={i} className="h-[160px] skeleton-cosmos rounded-xl" />)}</div>
    </div>
  );

  return (
    <div className="space-y-3">

      {/* ── Enterprise Banner ── */}
      {tenantPlan === "enterprise" && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3 relative overflow-hidden bg-gradient-to-r from-[#1a1040] to-[#0f172a] border border-indigo-500/15">
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-indigo-500/10 blur-2xl" />
          <div className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-500 shadow-glow-indigo">
            <Crown className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-display font-semibold text-white">Enterprise</span>
              <span className="px-1.5 py-[1px] rounded-full text-[8px] font-bold uppercase tracking-[.06em] bg-amber-500/15 border border-amber-500/25 text-amber-300">VIP</span>
            </div>
            <p className="text-[10px] text-white/25 mt-0.5">Manager dedicado · Relatórios ilimitados · Até 100 agentes</p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 text-[10px] gap-1 border-indigo-400/20 text-indigo-400 hover:bg-indigo-500/10 rounded-lg h-7 px-3">
            <MessageSquare className="h-3 w-3" /> Manager
          </Button>
        </div>
      )}
      {tenantCreatedAt && tenantPlan !== "enterprise" && <TrialTimer createdAt={tenantCreatedAt} />}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-display font-bold text-white tracking-[-0.03em]">Dashboard</h1>
          <p className="text-[11px] text-white/25">Visão geral dos seus agentes inteligentes</p>
        </div>
        <span className="text-[9px] font-mono text-white/10 hidden sm:block">Live · {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      {/* ═══ ROW 1: KPIs — compact, dense ═══ */}
      <div data-tour="kpis" className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {[
          { icon: MessageSquare, label: "Conversas", value: String(total), sub: `${totalMsgs} msgs`, accent: "text-indigo-400", bg: "bg-indigo-500/8 border-indigo-500/15", trend: total > 0 ? `+${total}` : null, up: true },
          { icon: CheckCircle2, label: "Resolvidas", value: String(resolved), sub: `${resRate}% resolução`, accent: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/15", trend: resRate > 0 ? `${resRate}%` : null, up: resRate >= 50 },
          { icon: Bot, label: "Agentes", value: `${onlineAg}/${attendants.length}`, sub: `${onlineAg} online`, accent: "text-cyan-400", bg: "bg-cyan-500/8 border-cyan-500/15", trend: null, up: true },
          { icon: Zap, label: "Mensagens", value: totalMsgs > 999 ? `${(totalMsgs / 1000).toFixed(1)}K` : String(totalMsgs), sub: "processadas", accent: "text-violet-400", bg: "bg-violet-500/8 border-violet-500/15", trend: totalMsgs > 0 ? `+${totalMsgs}` : null, up: true },
        ].map((k, i) => (
          <div key={i} className="cosmos-card px-4 py-3.5 card-stagger group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center border ${k.bg}`}>
                  <k.icon className={`w-3.5 h-3.5 ${k.accent}`} />
                </div>
                <span className="text-[10px] font-medium text-white/30 uppercase tracking-[.05em]">{k.label}</span>
              </div>
              {k.trend && (
                <span className={`flex items-center gap-0.5 text-[10px] font-mono font-bold ${k.up ? "text-emerald-400" : "text-red-400"}`}>
                  {k.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {k.trend}
                </span>
              )}
            </div>
            <span className="text-[26px] font-display font-light text-white tracking-[-0.04em] leading-[1]">{k.value}</span>
            <p className="text-[9.5px] text-white/15 mt-1 font-mono">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ═══ ROW 2: Hero Chart + Status Donut ═══ */}
      <div className="grid gap-2.5 lg:grid-cols-5">
        {/* Hero chart — 3 cols */}
        <div data-tour="hero-chart" className="cosmos-card p-4 lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[12px] font-display font-semibold text-white/70">Conversas por dia</span>
              <span className="text-[8px] text-white/15 font-mono ml-1">7d</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-[8px] text-white/20 font-mono">Conversas</span>
            </div>
          </div>
          <div className="h-[200px]">
            {dayChart.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dayChart} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="hG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.18)", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.12)", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<CT />} />
                  <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2.5} fill="url(#hG)" dot={{ r: 3, fill: "#6366F1", stroke: "#161822", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#818CF8", stroke: "#161822", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full"><p className="text-[10px] text-white/15">Dados insuficientes</p></div>
            )}
          </div>
        </div>

        {/* Status donut + Resolution — 2 cols */}
        <div data-tour="status-panel" className="lg:col-span-2 grid gap-2.5">
          {/* Status donut */}
          <div className="cosmos-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-3 w-3 text-violet-400" />
              <span className="text-[11px] font-display font-semibold text-white/60">Distribuição</span>
            </div>
            {statusPie.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="w-[80px] h-[80px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusPie} cx="50%" cy="50%" innerRadius={24} outerRadius={38} dataKey="value" stroke="none" strokeWidth={0}>
                        {statusPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 flex-1">
                  {statusPie.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                        <span className="text-[10px] text-white/40">{s.name}</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-white/60">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-[9px] text-white/10 py-4 text-center">Sem dados</p>}
          </div>

          {/* Resolution rate */}
          <div className="cosmos-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-[11px] font-display font-semibold text-white/60">Resolução</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-[36px] font-display font-light text-white tracking-[-0.04em] leading-[1]">{resRate}<span className="text-[18px] text-white/30">%</span></span>
              {resRate >= 70 && <span className="text-[9px] font-mono font-bold text-emerald-400 pb-1.5">Excelente</span>}
              {resRate >= 40 && resRate < 70 && <span className="text-[9px] font-mono font-bold text-amber-400 pb-1.5">Regular</span>}
              {resRate > 0 && resRate < 40 && <span className="text-[9px] font-mono font-bold text-red-400 pb-1.5">Baixa</span>}
            </div>
            <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden mt-2">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700" style={{ width: `${resRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ROW 3: Channel Bars + Agents Grid ═══ */}
      <div className="grid gap-2.5 lg:grid-cols-5">
        {/* Channel bars */}
        <div data-tour="channel-chart" className="cosmos-card p-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="h-3 w-3 text-cyan-400" />
            <span className="text-[11px] font-display font-semibold text-white/60">Por canal</span>
          </div>
          {channelBars.length > 0 ? (
            <div className="h-[110px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelBars} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)" vertical={false} />
                  <XAxis dataKey="channel" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CT />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {channelBars.map(e => <Cell key={e.channel} fill={CH_COLORS[e.channel] ?? "#6366F1"} fillOpacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-[9px] text-white/10 py-6 text-center">Sem dados</p>}
        </div>

        {/* Agents compact grid */}
        <div className="cosmos-card p-0 lg:col-span-3" data-tour="agent-card">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <Bot className="h-3 w-3 text-indigo-400" />
              <span className="text-[11px] font-display font-semibold text-white/60">Agentes</span>
              <span className="text-[9px] font-mono text-emerald-400 ml-1">{onlineAg} online</span>
            </div>
            <button data-tour="test-button" onClick={() => nav("/agents")} className="text-[8px] font-medium text-white/15 hover:text-white/30 transition-colors flex items-center gap-0.5">
              Ver todos <ArrowRight className="h-2.5 w-2.5" />
            </button>
          </div>
          <div className="px-3 pb-3">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {attendants.slice(0, 12).map(a => (
                <div key={a.id} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.07] hover:bg-white/[0.02] transition-all cursor-pointer" onClick={() => nav(`/agents/detail?id=${a.id}`)}>
                  <div className="relative">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white font-display font-semibold text-[9px] ${pick(a.name)}`}>{ini(a.name)}</div>
                    <span className={`absolute -right-0.5 -top-0.5 h-[7px] w-[7px] rounded-full border-[1.5px] border-[#161822] ${a.status === "online" ? "bg-emerald-400" : "bg-white/15"}`} />
                  </div>
                  <span className="text-[9px] font-medium text-white/50 truncate w-full text-center px-0.5">{a.name}</span>
                </div>
              ))}
              {attendants.length > 12 && (
                <div className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg border border-dashed border-white/[0.05] hover:border-white/[0.08] cursor-pointer" onClick={() => nav("/agents")}>
                  <span className="text-[12px] font-display text-white/20">+{attendants.length - 12}</span>
                  <span className="text-[7px] text-white/10">mais</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ROW 4: Recent Conversations — full width ═══ */}
      <div data-tour="recent-convs" className="cosmos-card p-0">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3 w-3 text-cyan-400" />
            <span className="text-[12px] font-display font-semibold text-white/70">Últimas Conversas</span>
            <span className="text-[9px] font-mono text-white/15">{total} total</span>
          </div>
          <button onClick={() => nav("/conversations")} className="text-[9px] font-medium text-white/15 hover:text-white/30 transition-colors flex items-center gap-0.5">
            Ver todas <ArrowRight className="h-2.5 w-2.5" />
          </button>
        </div>
        <div className="hidden sm:grid grid-cols-[32px_1fr_80px_auto_40px_16px] items-center gap-3 px-4 py-1 border-b border-white/[0.025] text-[8px] font-mono uppercase tracking-[.1em] text-white/12 select-none">
          <span /><span>Contato</span><span className="text-center">Canal</span><span className="text-center w-20">Status</span><span className="text-right">Tempo</span><span />
        </div>
        <div className="divide-y divide-white/[0.02]">
          {recentConvs.map(c => {
            const chColor: Record<string, string> = { whatsapp: "text-green-400/60 border-green-500/15", instagram: "text-pink-400/60 border-pink-500/15", web: "text-indigo-400/60 border-indigo-500/15" };
            return (
              <div key={c.id} className="group grid grid-cols-[32px_1fr_80px_auto_40px_16px] items-center gap-3 px-4 py-2 cursor-pointer hover:bg-white/[0.01] transition-all" onClick={() => nav(`/conversations/${c.id}`)}>
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-white font-display font-bold text-[8px] ${pick(c.contact_name)}`}>{ini(c.contact_name)}</div>
                <p className="text-[11px] font-medium text-white/75 truncate">{c.contact_name}</p>
                <span className={`inline-flex items-center justify-center px-1.5 py-[1px] rounded text-[8px] font-bold uppercase tracking-[.04em] border bg-white/[0.015] ${chColor[c.channel] ?? chColor.web}`}>{c.channel}</span>
                <StBadge st={c.status} />
                <span className="text-[8px] text-white/12 font-mono tabular-nums text-right">{ago(c.started_at)}</span>
                <ChevronRight className="h-3 w-3 text-white/[0.03] group-hover:text-white/[0.1] transition-colors" />
              </div>
            );
          })}
        </div>
      </div>

      <MeteoraWatermark />
      <WhatsAppConnectBanner isConnected={hasWhatsApp} />
      <GuidedTour />
    </div>
  );
}

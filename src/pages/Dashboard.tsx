import { useEffect, useState, useMemo } from "react";
import {
  MessageSquare, CheckCircle2, Clock, Play, Settings, Sparkles, ArrowRight,
  Zap, BarChart3, Crown, Activity, TrendingUp, TrendingDown, Bot,
  ChevronRight, Percent
} from "lucide-react";
import TrialTimer from "@/components/TrialTimer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import { MeteoraWatermark } from "@/components/MeteoraBrand";

/* ═══ Types ═══ */
interface Attendant { id: string; name: string; status: string; channels: string[] | null; model: string | null; class?: string | null; }
interface Conversation { id: string; contact_name: string; status: string; started_at: string; channel: string; }

/* ═══ Constants ═══ */
const AVATAR = [
  "bg-gradient-to-br from-indigo-500 to-indigo-400",
  "bg-gradient-to-br from-emerald-500 to-emerald-400",
  "bg-gradient-to-br from-amber-500 to-amber-400",
  "bg-gradient-to-br from-rose-500 to-rose-400",
  "bg-gradient-to-br from-cyan-500 to-cyan-400",
  "bg-gradient-to-br from-violet-500 to-violet-400",
];
const PIE_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#06B6D4", "#8B5CF6", "#F43F5E"];

function pick(n: string) { let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h); return AVATAR[Math.abs(h) % AVATAR.length]; }
function ini(n: string) { return n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }
function ago(d: string) { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 60) return "agora"; if (s < 3600) return `${Math.floor(s / 60)}min`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`; }

/* ═══ KPI with trend delta ═══ */
function KPI({ icon: I, label, value, sub, accent, iconBg, trend }: {
  icon: any; label: string; value: string; sub?: string; accent: string; iconBg: string; trend?: { value: string; up: boolean } | null;
}) {
  return (
    <div className="cosmos-card p-4 card-stagger group">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-[8px] flex items-center justify-center border ${iconBg} transition-shadow group-hover:shadow-lg`}>
            <I className={`w-[14px] h-[14px] ${accent}`} />
          </div>
          <span className="text-[11px] font-medium text-white/35 uppercase tracking-[.04em]">{label}</span>
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-[10px] font-mono font-bold ${trend.up ? "text-emerald-400" : "text-red-400"}`}>
            {trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value}
          </span>
        )}
      </div>
      <span className="text-[28px] font-display font-light text-white tracking-[-0.04em] leading-[1]">{value}</span>
      {sub && <p className="text-[10px] text-white/20 mt-1 font-mono">{sub}</p>}
    </div>
  );
}

/* ═══ Custom Tooltip ═══ */
function CTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[10px] px-3 py-2 text-[11px] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,.6)]" style={{ background: "#161822" }}>
      <p className="text-white/40 font-mono text-[9px] mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold text-white">{p.value} <span className="text-white/30 font-normal">{p.name || "conversas"}</span></p>
      ))}
    </div>
  );
}

/* ═══ Status badge ═══ */
function StBadge({ st }: { st: string }) {
  const m: Record<string, { l: string; c: string; d: string }> = {
    active: { l: "Ativa", c: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", d: "bg-emerald-400 animate-pulse-dot" },
    resolved: { l: "Resolvida", c: "bg-white/[0.04] text-white/35 border-white/[0.06]", d: "bg-white/25" },
    escalated: { l: "Escalada", c: "bg-red-500/10 text-red-400 border-red-500/20", d: "bg-red-400" },
  };
  const cfg = m[st] ?? m.resolved;
  return (
    <span className={`inline-flex items-center gap-[4px] px-2 py-[2px] rounded-full text-[9px] font-semibold border ${cfg.c}`}>
      <span className={`w-[4px] h-[4px] rounded-full ${cfg.d}`} />{cfg.l}
    </span>
  );
}

/* ═══════════════════════════════════════════════ */
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
    (async () => {
      const { data: tenant } = await supabase.from("tenants").select("id, created_at, plan").eq("owner_id", user.id).single();
      if (!tenant) { setLoading(false); return; }
      setTenantCreatedAt(tenant.created_at);
      setTenantPlan(tenant.plan || "starter");
      const [attRes, convRes, allConvRes, msgRes] = await Promise.all([
        supabase.from("attendants").select("id, name, status, channels, model, class").eq("tenant_id", tenant.id),
        supabase.from("conversations").select("id, contact_name, status, started_at, channel").eq("tenant_id", tenant.id).order("started_at", { ascending: false }).limit(8),
        supabase.from("conversations").select("id, contact_name, status, started_at, channel").eq("tenant_id", tenant.id),
        supabase.from("messages").select("id", { count: "exact", head: true }),
      ]);
      setAttendants(attRes.data ?? []);
      setConversations(convRes.data ?? []);
      setAllConversations(allConvRes.data ?? []);
      setTotalMessages(msgRes.count ?? 0);
      setLoading(false);
    })();
  }, [user]);

  const totalConv = allConversations.length;
  const activeCount = allConversations.filter(c => c.status === "active").length;
  const resolvedCount = allConversations.filter(c => c.status === "resolved").length;
  const escalatedCount = allConversations.filter(c => c.status === "escalated").length;
  const resRate = totalConv ? Math.round(resolvedCount / totalConv * 100) : 0;
  const onlineAgents = attendants.filter(a => a.status === "online").length;

  const chartData = useMemo(() => {
    const d: Record<string, number> = {};
    allConversations.forEach(c => {
      const day = new Date(c.started_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      d[day] = (d[day] || 0) + 1;
    });
    return Object.entries(d).slice(-7).map(([date, count]) => ({ date, count }));
  }, [allConversations]);

  const statusPie = useMemo(() => [
    { name: "Ativas", value: activeCount },
    { name: "Resolvidas", value: resolvedCount },
    { name: "Escaladas", value: escalatedCount },
  ].filter(i => i.value > 0), [activeCount, resolvedCount, escalatedCount]);

  const channelData = useMemo(() => {
    const ch: Record<string, number> = {};
    allConversations.forEach(c => { ch[c.channel] = (ch[c.channel] || 0) + 1; });
    return Object.entries(ch).map(([channel, count]) => ({ channel: channel.charAt(0).toUpperCase() + channel.slice(1), count }));
  }, [allConversations]);

  const CHANNEL_COLORS: Record<string, string> = { Whatsapp: "#25D366", Instagram: "#E1306C", Web: "#6366F1" };

  if (loading) return (
    <div className="space-y-4">
      <div className="h-7 w-44 skeleton-cosmos rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-[100px] skeleton-cosmos rounded-[14px]" />)}</div>
      <div className="h-[260px] skeleton-cosmos rounded-[14px]" />
      <div className="grid lg:grid-cols-3 gap-3">{[...Array(3)].map((_, i) => <div key={i} className="h-[170px] skeleton-cosmos rounded-[14px]" />)}</div>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── Enterprise Banner ── */}
      {tenantPlan === "enterprise" && (
        <div className="rounded-[12px] px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 relative overflow-hidden bg-gradient-to-br from-[#1a1040] to-[#0f172a] border border-indigo-500/20">
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-indigo-500/15 blur-2xl" />
          <div className="h-10 w-10 shrink-0 rounded-[10px] flex items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-violet-400 shadow-glow-indigo">
            <Crown className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0 relative z-10">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-display font-semibold text-white">Enterprise</h2>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[9px] font-bold uppercase tracking-[.06em] bg-amber-500/15 border border-amber-500/25 text-amber-300">✦ VIP</span>
            </div>
            <p className="text-[10.5px] text-white/30 mt-0.5">Manager dedicado · Relatórios ilimitados · Até 100 agentes</p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 text-[10.5px] gap-1.5 border-indigo-400/25 text-indigo-400 hover:bg-indigo-500/10 w-full sm:w-auto rounded-[9px] h-8">
            <MessageSquare className="h-3 w-3" /> Falar com Manager
          </Button>
        </div>
      )}

      {tenantCreatedAt && tenantPlan !== "enterprise" && <TrialTimer createdAt={tenantCreatedAt} />}

      {/* ── Header ── */}
      <div>
        <h1 className="text-[22px] font-display font-bold text-white tracking-[-0.03em]">Dashboard</h1>
        <p className="text-[12px] text-white/30 mt-0.5">Visão geral dos seus agentes inteligentes</p>
      </div>

      {/* ═══ KPIs ═══ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI icon={MessageSquare} label="Conversas" value={String(totalConv)} accent="text-indigo-400" iconBg="bg-indigo-500/10 border-indigo-500/20" sub={`${totalMessages} mensagens`} trend={totalConv > 0 ? { value: `+${totalConv}`, up: true } : null} />
        <KPI icon={CheckCircle2} label="Resolvidas" value={String(resolvedCount)} accent="text-emerald-400" iconBg="bg-emerald-500/10 border-emerald-500/20" sub={`${resRate}% resolução`} trend={resRate > 50 ? { value: `${resRate}%`, up: true } : resRate > 0 ? { value: `${resRate}%`, up: false } : null} />
        <KPI icon={Bot} label="Agentes" value={`${onlineAgents}/${attendants.length}`} accent="text-cyan-400" iconBg="bg-cyan-500/10 border-cyan-500/20" sub={`${onlineAgents} online agora`} />
        <KPI icon={Zap} label="Mensagens" value={totalMessages > 999 ? `${(totalMessages / 1000).toFixed(1)}K` : String(totalMessages)} accent="text-violet-400" iconBg="bg-violet-500/10 border-violet-500/20" sub="total processadas" trend={totalMessages > 0 ? { value: `+${totalMessages}`, up: true } : null} />
      </div>

      {/* ═══ HERO CHART ═══ */}
      <div className="cosmos-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-[8px] flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20">
              <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <div>
              <span className="text-[13px] font-display font-semibold text-white/80">Conversas por dia</span>
              <span className="text-[9px] text-white/20 font-mono ml-2">últimos 7 dias</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-[9px] text-white/25 font-mono">Conversas</span>
          </div>
        </div>
        <div className="h-[220px]">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="heroG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.15)", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<CTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} fill="url(#heroG)" dot={false} activeDot={{ r: 4, fill: "#6366F1", stroke: "#161822", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 text-white/[0.06] mx-auto mb-2" />
                <p className="text-[11px] text-white/20">Dados insuficientes para o gráfico</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECONDARY CHARTS ROW ═══ */}
      <div className="grid gap-3 lg:grid-cols-3">

        {/* Status pie */}
        <div className="cosmos-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-[6px] flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
              <Percent className="h-3 w-3 text-violet-400" />
            </div>
            <span className="text-[11.5px] font-display font-semibold text-white/70">Status</span>
          </div>
          {statusPie.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-[100px] h-[100px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={28} outerRadius={45} dataKey="value" stroke="none">
                      {statusPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-1">
                {statusPie.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-[10.5px] text-white/50">{s.name}</span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-white/70">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-[10px] text-white/15 text-center py-6">Sem dados</p>}
        </div>

        {/* Channel bars */}
        <div className="cosmos-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-[6px] flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20">
              <Activity className="h-3 w-3 text-cyan-400" />
            </div>
            <span className="text-[11.5px] font-display font-semibold text-white/70">Por canal</span>
          </div>
          {channelData.length > 0 ? (
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="channel" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.25)", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {channelData.map(e => <Cell key={e.channel} fill={CHANNEL_COLORS[e.channel] ?? "#6366F1"} fillOpacity={0.7} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-[10px] text-white/15 text-center py-6">Sem dados</p>}
        </div>

        {/* Resolution rate */}
        <div className="cosmos-card p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-[6px] flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            </div>
            <span className="text-[11.5px] font-display font-semibold text-white/70">Resolução</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-[42px] font-display font-light text-white tracking-[-0.04em] leading-[1]">{resRate}%</span>
            <div className="pb-2">
              {resRate >= 70 && <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold text-emerald-400"><TrendingUp className="w-3 h-3" />Excelente</span>}
              {resRate >= 40 && resRate < 70 && <span className="text-[10px] font-mono font-bold text-amber-400">Regular</span>}
              {resRate > 0 && resRate < 40 && <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold text-red-400"><TrendingDown className="w-3 h-3" />Baixa</span>}
            </div>
          </div>
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700" style={{ width: `${resRate}%` }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px] text-white/15 font-mono">{resolvedCount} resolvidas</span>
              <span className="text-[9px] text-white/15 font-mono">{totalConv} total</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ AGENTS GRID + CONVERSATIONS ═══ */}
      <div className="grid gap-4 lg:grid-cols-5">

        {/* Agents compact */}
        <div className="cosmos-card p-0 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-[6px] flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20">
                <Bot className="h-3 w-3 text-indigo-400" />
              </div>
              <span className="text-[12px] font-display font-semibold text-white/70">Agentes</span>
              <span className="text-[10px] font-mono text-emerald-400">{onlineAgents} online</span>
            </div>
            <button onClick={() => nav("/agents")} className="text-[9px] font-medium text-white/20 hover:text-white/40 transition-colors flex items-center gap-0.5">
              Ver todos <ArrowRight className="h-2.5 w-2.5" />
            </button>
          </div>
          <div className="flex-1 px-4 pb-4">
            <div className="grid grid-cols-3 gap-2">
              {attendants.slice(0, 9).map(a => (
                <div key={a.id} className="flex flex-col items-center gap-1.5 py-2.5 rounded-[10px] bg-white/[0.015] border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.025] transition-all cursor-pointer" onClick={() => nav(`/agents/detail?id=${a.id}`)}>
                  <div className="relative">
                    <div className={`h-9 w-9 rounded-[8px] flex items-center justify-center text-white font-display font-semibold text-[10px] ${pick(a.name)}`}>
                      {ini(a.name)}
                    </div>
                    <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-[1.5px] border-[#161822] ${a.status === "online" ? "bg-emerald-400" : "bg-white/15"}`} />
                  </div>
                  <span className="text-[10px] font-medium text-white/60 truncate w-full text-center px-1">{a.name}</span>
                  <span className="text-[8px] text-white/20 font-mono capitalize">{(a as any).class || "support"}</span>
                </div>
              ))}
              {attendants.length > 9 && (
                <div className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-[10px] bg-white/[0.01] border border-dashed border-white/[0.06] hover:border-white/[0.1] transition-all cursor-pointer" onClick={() => nav("/agents")}>
                  <span className="text-[14px] font-display font-light text-white/25">+{attendants.length - 9}</span>
                  <span className="text-[8px] text-white/15">mais agentes</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="cosmos-card p-0 lg:col-span-3 flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-[6px] flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20">
                <MessageSquare className="h-3 w-3 text-cyan-400" />
              </div>
              <span className="text-[12px] font-display font-semibold text-white/70">Últimas Conversas</span>
            </div>
            <button onClick={() => nav("/conversations")} className="text-[9px] font-medium text-white/20 hover:text-white/40 transition-colors flex items-center gap-0.5">
              Ver todas <ArrowRight className="h-2.5 w-2.5" />
            </button>
          </div>
          <div className="hidden sm:grid grid-cols-[32px_1fr_auto_auto_36px] items-center gap-3 px-4 py-1.5 border-b border-white/[0.03] text-[8px] font-mono uppercase tracking-[.1em] text-white/15 select-none">
            <span /><span>Contato</span><span>Status</span><span>Tempo</span><span />
          </div>
          <div className="flex-1 divide-y divide-white/[0.025]">
            {conversations.length === 0 && <p className="text-[11px] text-white/15 text-center py-10">Nenhuma conversa</p>}
            {conversations.map(c => (
              <div key={c.id} className="group grid grid-cols-[32px_1fr_auto_auto_20px] items-center gap-3 px-4 py-2 cursor-pointer hover:bg-white/[0.012] transition-all" onClick={() => nav(`/conversations/${c.id}`)}>
                <div className={`h-7 w-7 rounded-[7px] flex items-center justify-center text-white font-display font-semibold text-[9px] ${pick(c.contact_name)}`}>{ini(c.contact_name)}</div>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-medium text-white/80 truncate">{c.contact_name}</p>
                  <p className="text-[9px] text-white/15 font-mono capitalize">{c.channel}</p>
                </div>
                <StBadge st={c.status} />
                <span className="text-[9px] text-white/15 font-mono tabular-nums">{ago(c.started_at)}</span>
                <ChevronRight className="h-3 w-3 text-white/[0.04] group-hover:text-white/[0.12] transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <MeteoraWatermark />
    </div>
  );
}

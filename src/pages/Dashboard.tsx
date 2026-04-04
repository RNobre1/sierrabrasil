import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  MessageSquare, CheckCircle2, ArrowRight,
  Zap, BarChart3, Crown, Bot,
  ArrowUpRight, ArrowDownRight, Percent,
  Users, Phone, Mail
} from "lucide-react";
import { getAgentIcon, isCustomIcon, getCustomIconUrl } from "@/lib/agent-icons";
import TrialTimer from "@/components/TrialTimer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell
} from "recharts";
import { MeteoraWatermark } from "@/components/MeteoraBrand";
import GuidedTour from "@/components/GuidedTour";
import WhatsAppConnectBanner from "@/components/WhatsAppConnectBanner";
import { useImpersonatedTenant } from "@/hooks/use-tenant";

/* ═══ Types ═══ */
interface Attendant { id: string; name: string; status: string; channels: string[] | null; model: string | null; class?: string | null; active_skills?: string[] | null; icon?: string | null; }
interface Conversation { id: string; contact_name: string; status: string; started_at: string; channel: string; escalation_count?: number; }
interface Lead { id: string; contact_name: string | null; contact_email: string | null; contact_phone: string | null; source: string; created_at: string; }

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
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [recentConvs, setRecentConvs] = useState<Conversation[]>([]);
  const [allConvs, setAllConvs] = useState<Conversation[]>([]);
  const [totalMsgs, setTotalMsgs] = useState(0);
  const [tenantCreatedAt, setTenantCreatedAt] = useState("");
  const [tenantPlan, setTenantPlan] = useState("starter");
  const [loading, setLoading] = useState(true);
  const [hasWhatsApp, setHasWhatsApp] = useState(true);
  const [hasLeadCapture, setHasLeadCapture] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const isInitialLoad = useRef(true);
  const tenantIdRef = useRef<string | null>(null);
  const impersonatedTenant = useImpersonatedTenant();

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    // Only show loading spinner on initial load
    if (isInitialLoad.current) setLoading(true);

    // Cache tenant info after first fetch
    if (!tenantIdRef.current) {
      // When impersonating, fetch by tenant ID directly; otherwise by owner_id
      const query = impersonatedTenant
        ? supabase.from("tenants").select("id, created_at, plan").eq("id", impersonatedTenant).single()
        : supabase.from("tenants").select("id, created_at, plan").eq("owner_id", user.id).single();
      const { data: t } = await query;
      if (!t) { setLoading(false); isInitialLoad.current = false; return; }
      setTenantCreatedAt(t.created_at);
      setTenantPlan(t.plan || "starter");
      tenantIdRef.current = t.id;
    }

    const tid = tenantIdRef.current;
    const [att, conv, allC, msg] = await Promise.all([
      supabase.from("attendants").select("id, name, status, channels, model, class, active_skills, icon").eq("tenant_id", tid),
      supabase.from("conversations").select("id, contact_name, status, started_at, channel, escalation_count").eq("tenant_id", tid).order("started_at", { ascending: false }).limit(10),
      supabase.from("conversations").select("id, contact_name, status, started_at, channel, escalation_count").eq("tenant_id", tid),
      supabase.from("messages").select("id", { count: "exact", head: true }),
    ]);
    const attendantList = att.data ?? [];
    setAttendants(attendantList);
    setRecentConvs(conv.data ?? []);
    setAllConvs(allC.data ?? []);
    setTotalMsgs(msg.count ?? 0);

    // Check if any attendant has lead-capture skill active
    const leadCaptureActive = attendantList.some(
      a => a.active_skills?.includes("lead-capture")
    );
    setHasLeadCapture(leadCaptureActive);

    if (leadCaptureActive) {
      const [recentLeads, leadsCount] = await Promise.all([
        supabase
          .from("agent_leads")
          .select("id, contact_name, contact_email, contact_phone, source, created_at")
          .eq("tenant_id", tid)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("agent_leads")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tid),
      ]);
      setLeads(recentLeads.data ?? []);
      setTotalLeads(leadsCount.count ?? 0);
    }

    const { data: wpInstances } = await supabase
      .from("whatsapp_instances")
      .select("id, status")
      .eq("tenant_id", tid)
      .eq("status", "connected")
      .limit(1);
    setHasWhatsApp((wpInstances ?? []).length > 0);

    setLoading(false);
    isInitialLoad.current = false;
  }, [user, impersonatedTenant]);

  // Reset cached tenant when impersonation changes
  useEffect(() => {
    tenantIdRef.current = null;
    isInitialLoad.current = true;
  }, [impersonatedTenant]);

  // Initial load + polling every 30s
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Check for recent admin access (only for non-admin users)
  useEffect(() => {
    if (!user || isAdmin) return;
    (async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("owner_id", user.id)
        .single();
      if (!tenant) return;
      const { data: recentAccess } = await supabase
        .from("audit_logs")
        .select("admin_user_id, created_at, details")
        .eq("tenant_id", tenant.id)
        .eq("action", "impersonation_start")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (recentAccess && recentAccess.length > 0) {
        toast({
          title: "Acesso administrativo",
          description: `A equipe de suporte da Meteora acessou sua conta em ${new Date(recentAccess[0].created_at).toLocaleDateString("pt-BR")} para verificação/suporte.`,
        });
      }
    })();
  }, [user, isAdmin]);

  /* metrics — deduplicate by contact where appropriate */
  const uniqueContacts = new Set(allConvs.map(c => c.contact_name));
  const total = uniqueContacts.size;
  const activeContacts = new Set(allConvs.filter(c => c.status === "active").map(c => c.contact_name));
  const active = activeContacts.size;
  const resolved = allConvs.filter(c => c.status === "resolved").length;
  const escalated = allConvs.filter(c => c.status === "escalated").length;
  const totalEscalations = allConvs.reduce((sum, c) => sum + ((c as any).escalation_count || 0), 0);
  const resRate = allConvs.length ? Math.round(resolved / allConvs.length * 100) : 0;
  const escRate = allConvs.length ? Math.round(totalEscalations / allConvs.length * 100) : 0;
  const onlineAg = attendants.filter(a => a.status === "online").length;

  /* chart data — unique contacts per day */
  const dayChart = useMemo(() => {
    const d: Record<string, Set<string>> = {};
    allConvs.forEach(c => {
      const k = new Date(c.started_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (!d[k]) d[k] = new Set();
      d[k].add(c.contact_name);
    });
    return Object.entries(d).slice(-7).map(([date, contacts]) => ({ date, count: contacts.size }));
  }, [allConvs]);

  /* deduplicate recent conversations — one per contact, most recent wins */
  const dedupedRecent = useMemo(() => {
    const seen = new Set<string>();
    return recentConvs.filter(c => {
      if (seen.has(c.contact_name)) return false;
      seen.add(c.contact_name);
      return true;
    });
  }, [recentConvs]);

  const statusPie = useMemo(() => [
    { name: "Ativas", value: active },
    { name: "Resolvidas", value: resolved },
    { name: "Escaladas", value: escalated },
  ].filter(i => i.value > 0), [active, resolved, escalated]);


  /* skeleton */
  if (loading) return (
    <div className="space-y-3">
      <div className="h-6 w-36 skeleton-cosmos rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">{[...Array(4)].map((_, i) => <div key={i} className="h-[88px] skeleton-cosmos rounded-xl" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-2.5"><div className="lg:col-span-3 h-[260px] skeleton-cosmos rounded-xl" /><div className="lg:col-span-2 h-[260px] skeleton-cosmos rounded-xl" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">{[...Array(3)].map((_, i) => <div key={i} className="h-[160px] skeleton-cosmos rounded-xl" />)}</div>
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
          { icon: MessageSquare, label: "Contatos", value: String(total), sub: `${totalMsgs} msgs`, accent: "text-indigo-400", bg: "bg-indigo-500/8 border-indigo-500/15", trend: total > 0 ? `+${total}` : null, up: true },
          { icon: CheckCircle2, label: "Resolvidas", value: String(resolved), sub: `${resRate}% resolução`, accent: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/15", trend: resRate > 0 ? `${resRate}%` : null, up: resRate >= 50 },
          { icon: Bot, label: "Agentes", value: `${onlineAg}/${attendants.length}`, sub: `${onlineAg} online`, accent: "text-cyan-400", bg: "bg-cyan-500/8 border-cyan-500/15", trend: null, up: true },
          { icon: Zap, label: "Escalações", value: String(totalEscalations), sub: `${escRate}% das conversas`, accent: "text-rose-400", bg: "bg-rose-500/8 border-rose-500/15", trend: totalEscalations > 0 ? `${escRate}%` : null, up: escRate <= 20 },
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

      {/* ═══ ROW 2: Agents + Recent Conversations ═══ */}
      <div className="grid gap-2.5 lg:grid-cols-5">
        {/* Agents compact grid — 3 cols */}
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
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {attendants.slice(0, 12).map(a => {
                const isCustom = isCustomIcon(a.icon);
                const AIcon = isCustom ? null : getAgentIcon(a.icon);
                return (
                  <div key={a.id} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.07] hover:bg-white/[0.02] transition-all cursor-pointer" onClick={() => nav(`/agents/detail?id=${a.id}`)}>
                    <div className="relative">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center overflow-hidden ${pick(a.name)}`}>
                        {isCustom ? (
                          <img src={getCustomIconUrl(a.icon!)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          AIcon && <AIcon className="h-3.5 w-3.5 text-white" />
                        )}
                      </div>
                      <span className={`absolute -right-0.5 -top-0.5 h-[7px] w-[7px] rounded-full border-[1.5px] border-[#161822] ${a.status === "online" ? "bg-emerald-400" : "bg-white/15"}`} />
                    </div>
                    <span className="text-[9px] font-medium text-white/50 truncate w-full text-center px-0.5">{a.name}</span>
                  </div>
                );
              })}
              {attendants.length > 12 && (
                <div className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg border border-dashed border-white/[0.05] hover:border-white/[0.08] cursor-pointer" onClick={() => nav("/agents")}>
                  <span className="text-[12px] font-display text-white/20">+{attendants.length - 12}</span>
                  <span className="text-[7px] text-white/10">mais</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Conversations — 2 cols */}
        <div data-tour="recent-convs" className="cosmos-card p-0 lg:col-span-2">
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
          <div className="divide-y divide-white/[0.02]">
            {dedupedRecent.map(c => {
              const chColor: Record<string, string> = { whatsapp: "text-green-400/60 border-green-500/15", instagram: "text-pink-400/60 border-pink-500/15", web: "text-indigo-400/60 border-indigo-500/15" };
              return (
                <div key={c.id} className="group flex items-center gap-2.5 px-4 py-2 cursor-pointer hover:bg-white/[0.01] transition-all" onClick={() => nav(`/conversations/${c.id}`)}>
                  <div className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-white font-display font-bold text-[8px] ${pick(c.contact_name)}`}>{ini(c.contact_name)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-white/75 truncate">{c.contact_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-flex items-center px-1 py-[0.5px] rounded text-[7px] font-bold uppercase tracking-[.04em] border bg-white/[0.015] ${chColor[c.channel] ?? chColor.web}`}>{c.channel}</span>
                      <StBadge st={c.status} />
                    </div>
                  </div>
                  <span className="text-[8px] text-white/12 font-mono tabular-nums shrink-0">{ago(c.started_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ ROW 3: Hero Chart + Status Donut ═══ */}
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


      {/* ═══ ROW 4: Leads (only if lead-capture skill active) ═══ */}
      {hasLeadCapture && (
        <div data-tour="dashboard-leads" className="cosmos-card p-0">
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 text-violet-400" />
              <span className="text-[12px] font-display font-semibold text-white/70">Leads Capturados</span>
              <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[9px] font-mono font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20">{totalLeads}</span>
            </div>
          </div>
          {leads.length === 0 ? (
            <div className="px-4 pb-4 pt-2">
              <p className="text-[10px] text-white/20 text-center py-4">
                Nenhum lead capturado ainda. Quando seus clientes interagirem, os dados aparecerão aqui.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-[1fr_130px_130px_60px_70px] items-center gap-3 px-4 py-1 border-b border-white/[0.025] text-[8px] font-mono uppercase tracking-[.1em] text-white/12 select-none">
                <span>Nome</span><span>Telefone</span><span>Email</span><span>Fonte</span><span className="text-right">Quando</span>
              </div>
              <div className="divide-y divide-white/[0.02]">
                {leads.map(l => (
                  <div key={l.id} className="flex flex-col gap-1.5 px-4 py-2.5 hover:bg-white/[0.01] transition-all sm:grid sm:grid-cols-[1fr_130px_130px_60px_70px] sm:items-center sm:gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-6 w-6 shrink-0 rounded-md flex items-center justify-center text-white font-display font-bold text-[7px] ${pick(l.contact_name || "?")}`}>
                        {ini(l.contact_name || "?")}
                      </div>
                      <span className="text-[11px] font-medium text-white/70 truncate">{l.contact_name || "Sem nome"}</span>
                      <span className="sm:hidden text-[8px] text-white/12 font-mono tabular-nums ml-auto">{ago(l.created_at)}</span>
                    </div>
                    <span className="text-[10px] text-white/30 font-mono flex items-center gap-1 truncate pl-8 sm:pl-0">
                      {l.contact_phone ? <><Phone className="h-2.5 w-2.5 shrink-0 text-white/15" /><a href={`https://wa.me/${l.contact_phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline transition-colors">{l.contact_phone}</a></> : <span className="text-white/10">—</span>}
                    </span>
                    <span className="text-[10px] text-white/30 font-mono flex items-center gap-1 truncate pl-8 sm:pl-0">
                      {l.contact_email ? <><Mail className="h-2.5 w-2.5 shrink-0 text-white/15" /><a href={`mailto:${l.contact_email}`} className="hover:text-primary hover:underline transition-colors">{l.contact_email}</a></> : <span className="text-white/10">—</span>}
                    </span>
                    <span className="hidden sm:block text-[8px] text-white/15 font-mono uppercase">{l.source}</span>
                    <span className="hidden sm:block text-[8px] text-white/12 font-mono tabular-nums text-right">{ago(l.created_at)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <MeteoraWatermark />
      <WhatsAppConnectBanner isConnected={hasWhatsApp} hasAgents={attendants.length > 0} />
      <GuidedTour />
    </div>
  );
}

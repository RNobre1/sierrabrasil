import { useEffect, useState, useMemo } from "react";
import {
  DollarSign, Users, Bot, Cpu, TrendingUp, ArrowRight, BarChart3,
  Activity, Zap, Globe, RefreshCw, Clock, Sparkles, ChevronUp, ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/formatters";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

interface TenantRow {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: string;
}

interface AttendantRow {
  id: string;
  name: string;
  status: string;
  tenant_id: string;
}

// ─── Hero KPI ──────────────────────────────
function HeroKPI({ icon: Icon, label, value, gradient, sub, trend, recentItems }: {
  icon: any; label: string; value: string; gradient: string; sub?: string; trend?: string;
  recentItems?: { text: string; detail: string }[];
}) {
  const isPositive = trend?.startsWith("+");
  return (
    <div className="relative rounded-xl p-4 sm:p-5 flex flex-col gap-1 overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] cursor-default" style={{ background: gradient }}>
      <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(ellipse at top right, white 0%, transparent 70%)" }} />
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-1.5">
          <Icon className="w-4 h-4 text-white/70" />
          <span className="text-[11px] font-medium text-white/70 font-mono uppercase tracking-wider">{label}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-[10px] font-mono font-bold ${isPositive ? "text-emerald-200" : "text-red-200"}`}>
            {isPositive ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <span className="text-2xl sm:text-3xl font-display font-bold text-white relative mt-0.5">{value}</span>
      {sub && <span className="text-[10px] text-white/50 relative font-mono">{sub}</span>}
      {recentItems && recentItems.length > 0 && (
        <div className="relative mt-1.5 space-y-0.5 border-t border-white/10 pt-1.5">
          {recentItems.map((item, i) => (
            <p key={i} className="text-[10px] text-white/50 truncate leading-tight">
              <span className="text-white/70">{item.text}</span> · {item.detail}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section Divider ──────────────────────────────
function DashDivider({ label, icon: Icon }: { label: string; icon?: any }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest font-mono">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

// ─── Stat Card (secondary) ──────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 flex flex-col gap-1.5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-[11px] font-medium text-muted-foreground font-mono uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-xl font-display font-bold" style={{ color }}>{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

const PIE_COLORS = ["hsl(217, 91%, 60%)", "hsl(152, 69%, 41%)", "hsl(38, 92%, 55%)", "hsl(280, 67%, 55%)"];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [attendants, setAttendants] = useState<AttendantRow[]>([]);
  const [conversationCount, setConversationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = async () => {
    const [tenantsRes, attendantsRes, convsRes, msgsRes, plansRes] = await Promise.all([
      supabase.from("tenants").select("id, name, plan, status, created_at").order("created_at", { ascending: false }),
      supabase.from("attendants").select("id, name, status, tenant_id"),
      supabase.from("conversations").select("id", { count: "exact", head: true }),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("plans").select("id, price_monthly"),
    ]);
    setTenants(tenantsRes.data ?? []);
    setAttendants(attendantsRes.data ?? []);
    setConversationCount(convsRes.count ?? 0);
    setMessageCount(msgsRes.count ?? 0);

    // Build plan prices from DB (price_monthly is in cents, convert to BRL)
    const prices: Record<string, number> = {};
    plansRes.data?.forEach(p => { prices[p.id] = (p.price_monthly || 0) / 100; });
    setPlanPrices(prices);

    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const mrr = tenants.reduce((sum, t) => sum + (planPrices[t.plan] || 0), 0);
  const activeTenants = tenants.filter(t => t.status === "active").length;
  const trialTenants = tenants.filter(t => t.status === "trial").length;
  const onlineAgents = attendants.filter(a => a.status === "online").length;
  const avgMsgPerConv = conversationCount > 0 ? (messageCount / conversationCount).toFixed(1) : "0";
  const estimatedCost = `$${(messageCount * 0.002).toFixed(2)}`;

  // Recent tenants for hero card
  const recentTenants = tenants.slice(0, 3).map(t => ({
    text: t.name,
    detail: timeAgo(t.created_at),
  }));

  // Revenue by plan
  const planChartData = useMemo(() => {
    const plans: Record<string, { count: number; revenue: number }> = {};
    tenants.forEach(t => {
      if (!plans[t.plan]) plans[t.plan] = { count: 0, revenue: 0 };
      plans[t.plan].count++;
      plans[t.plan].revenue += planPrices[t.plan] || 0;
    });
    return Object.entries(plans).map(([plan, d]) => ({ plan: plan.charAt(0).toUpperCase() + plan.slice(1), ...d }));
  }, [tenants, planPrices]);

  // Growth chart
  const growthData = useMemo(() => {
    const days: Record<string, number> = {};
    tenants.forEach(t => {
      const day = new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      days[day] = (days[day] || 0) + 1;
    });
    return Object.entries(days).map(([date, count]) => ({ date, count }));
  }, [tenants]);

  // Plan distribution for pie
  const planDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    tenants.forEach(t => { map[t.plan] = (map[t.plan] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [tenants]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const active = tenants.filter(t => t.status === "active").length;
    const trial = tenants.filter(t => t.status === "trial").length;
    const other = tenants.length - active - trial;
    return [
      { name: "Ativos", value: active },
      { name: "Trial", value: trial },
      ...(other > 0 ? [{ name: "Outros", value: other }] : []),
    ];
  }, [tenants]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground font-mono">Carregando Mission Control...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-display font-bold tracking-tight">Mission Control</h1>
          <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">Meteora Digital — Painel Administrativo</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">
            {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => { setLoading(true); fetchData(); }}>
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <HeroKPI
          icon={DollarSign} label="MRR"
          value={formatCurrency(mrr)}
          gradient="linear-gradient(135deg, hsl(152 69% 31%), hsl(168 76% 36%))"
          sub={`${tenants.length} clientes · ${Object.keys(planPrices).length} planos`}
          trend={`+${tenants.length}`}
          recentItems={recentTenants}
        />
        <HeroKPI
          icon={Users} label="Clientes"
          value={String(tenants.length)}
          gradient="linear-gradient(135deg, hsl(217 91% 55%), hsl(260 67% 55%))"
          sub={`${activeTenants} ativos · ${trialTenants} trial`}
        />
        <HeroKPI
          icon={Bot} label="Agentes"
          value={String(attendants.length)}
          gradient="linear-gradient(135deg, hsl(280 67% 50%), hsl(320 72% 55%))"
          sub={`${onlineAgents} online agora`}
        />
        <HeroKPI
          icon={Cpu} label="Interações"
          value={String(conversationCount)}
          gradient="linear-gradient(135deg, hsl(38 92% 50%), hsl(24 95% 53%))"
          sub={`${messageCount.toLocaleString("pt-BR")} msgs · ${avgMsgPerConv} msg/conv`}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:grid-cols-6">
        <StatCard icon={Activity} label="Online" value={String(onlineAgents)} color="hsl(152, 69%, 41%)" sub="agentes ativos" />
        <StatCard icon={Zap} label="Msg/Conv" value={avgMsgPerConv} color="hsl(217, 91%, 60%)" sub="média geral" />
        <StatCard icon={DollarSign} label="Custo IA" value={estimatedCost} color="hsl(38, 92%, 55%)" sub="estimado" />
        <StatCard icon={Globe} label="Trial" value={String(trialTenants)} color="hsl(280, 67%, 55%)" sub="em teste" />
        <StatCard icon={TrendingUp} label="Ticket Médio" value={formatCurrency(tenants.length ? Math.round(mrr / tenants.length) : 0)} color="hsl(152, 69%, 41%)" sub="/mês por cliente" />
        <StatCard icon={Clock} label="Mensagens" value={messageCount.toLocaleString("pt-BR")} color="hsl(217, 91%, 60%)" sub="total processadas" />
      </div>

      <DashDivider label="Análises" icon={BarChart3} />

      {/* Charts Row */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Growth */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Crescimento de clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                  <Area type="monotone" dataKey="count" stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill="url(#growthGrad)" dot={false} activeDot={{ r: 3, fill: "hsl(217, 91%, 60%)" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Distribuição por plano
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                    {planDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {planDistribution.map((p, i) => (
                <div key={p.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {p.name} ({p.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue + Status Row */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              Receita por plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planChartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="plan" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={50} tickFormatter={(v: number) => formatCurrency(v)} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} formatter={(v: number) => [formatCurrency(v), "Receita"]} />
                  <Bar dataKey="revenue" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Agent Status Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Bot className="h-3.5 w-3.5 text-primary" />
              Status dos agentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Online</span>
              <span className="font-mono font-bold text-emerald-400">{onlineAgents}</span>
            </div>
            <Progress value={attendants.length ? (onlineAgents / attendants.length) * 100 : 0} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Offline</span>
              <span className="font-mono font-bold text-muted-foreground">{attendants.length - onlineAgents}</span>
            </div>
            <Progress value={attendants.length ? ((attendants.length - onlineAgents) / attendants.length) * 100 : 0} className="h-2 [&>div]:bg-muted-foreground" />

            <div className="border-t border-border pt-3 mt-3 space-y-2">
              {attendants.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${a.status === "online" ? "bg-emerald-400 animate-pulse-dot" : "bg-muted-foreground"}`} />
                    <span className="text-xs font-medium truncate max-w-[140px]">{a.name}</span>
                  </div>
                  <Badge variant={a.status === "online" ? "default" : "secondary"} className="text-[9px] h-5">
                    {a.status === "online" ? "Online" : "Offline"}
                  </Badge>
                </div>
              ))}
              {attendants.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full text-[10px] text-muted-foreground h-7" onClick={() => navigate("/admin/attendants")}>
                  Ver todos ({attendants.length}) <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <DashDivider label="Clientes" icon={Users} />

      {/* Tenant List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Últimos clientes ({tenants.length})
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-7" onClick={() => navigate("/admin/tenants")}>
              Ver todos <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Cliente</th>
                  <th className="text-left py-2 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Plano</th>
                  <th className="text-left py-2 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Status</th>
                  <th className="text-right py-2 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">MRR</th>
                  <th className="text-right py-2 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Criado</th>
                </tr>
              </thead>
              <tbody>
                {tenants.slice(0, 10).map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => navigate("/admin/tenants")}>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                          <span className="text-[10px] font-bold text-primary">{t.name.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-xs">{t.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <Badge variant="outline" className="font-mono text-[9px] capitalize h-5">{t.plan}</Badge>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === "active" ? "bg-emerald-400" : "bg-amber-400"}`} />
                        <span className="text-[10px] text-muted-foreground capitalize">{t.status === "active" ? "Ativo" : t.status === "trial" ? "Trial" : t.status}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-mono text-xs font-medium">
                      {formatCurrency(planPrices[t.plan] || 0)}
                    </td>
                    <td className="py-2.5 text-right text-[10px] text-muted-foreground font-mono">
                      {timeAgo(t.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tenants.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum cliente cadastrado</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}sem`;
}

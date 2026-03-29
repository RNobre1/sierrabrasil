import { useEffect, useState, useMemo } from "react";
import { DollarSign, Users, Bot, Cpu, TrendingUp, ArrowRight, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

interface TenantRow {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: string;
}

function HeroKPI({ icon: Icon, label, value, gradient, sub }: { icon: any; label: string; value: string; gradient: string; sub?: string }) {
  return (
    <div className="relative rounded-2xl p-5 flex flex-col gap-1 overflow-hidden transition-all hover:scale-[1.02]" style={{ background: gradient }}>
      <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(ellipse at top right, white 0%, transparent 70%)" }} />
      <div className="flex items-center gap-2 relative">
        <Icon className="w-4 h-4 text-white/70" />
        <span className="text-xs font-medium text-white/70 font-mono uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-3xl font-display font-semibold text-white relative mt-1">{value}</span>
      {sub && <span className="text-[11px] text-white/50 relative">{sub}</span>}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [attendantCount, setAttendantCount] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [tenantsRes, attendantsRes, convsRes, msgsRes] = await Promise.all([
        supabase.from("tenants").select("id, name, plan, status, created_at").order("created_at", { ascending: false }),
        supabase.from("attendants").select("id", { count: "exact", head: true }),
        supabase.from("conversations").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
      ]);

      setTenants(tenantsRes.data ?? []);
      setAttendantCount(attendantsRes.count ?? 0);
      setConversationCount(convsRes.count ?? 0);
      setMessageCount(msgsRes.count ?? 0);
      setLoading(false);
    };

    fetchData();
  }, []);

  const planPrices: Record<string, number> = { starter: 197, professional: 497, enterprise: 997 };
  const mrr = tenants.reduce((sum, t) => sum + (planPrices[t.plan] || 197), 0);
  const activeTenants = tenants.filter(t => t.status === "active").length;
  const trialTenants = tenants.filter(t => t.status === "trial").length;

  // Revenue by plan chart
  const planChartData = useMemo(() => {
    const plans: Record<string, { count: number; revenue: number }> = {};
    tenants.forEach(t => {
      if (!plans[t.plan]) plans[t.plan] = { count: 0, revenue: 0 };
      plans[t.plan].count++;
      plans[t.plan].revenue += planPrices[t.plan] || 197;
    });
    return Object.entries(plans).map(([plan, d]) => ({ plan: plan.charAt(0).toUpperCase() + plan.slice(1), ...d }));
  }, [tenants]);

  // Tenants by creation date chart
  const growthData = useMemo(() => {
    const days: Record<string, number> = {};
    tenants.forEach(t => {
      const day = new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      days[day] = (days[day] || 0) + 1;
    });
    return Object.entries(days).map(([date, count]) => ({ date, count }));
  }, [tenants]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "hoje";
    if (days === 1) return "ontem";
    if (days < 7) return `${days}d atrás`;
    return `${Math.floor(days / 7)} sem`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Mission Control</h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">Meteora Digital — Painel Administrativo</p>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <HeroKPI icon={DollarSign} label="MRR" value={`R$ ${mrr.toLocaleString("pt-BR")}`} gradient="linear-gradient(135deg, hsl(152 69% 31%), hsl(168 76% 36%))" sub={`${tenants.length} clientes`} />
        <HeroKPI icon={Users} label="Ativos" value={String(activeTenants)} gradient="linear-gradient(135deg, hsl(217 91% 55%), hsl(260 67% 55%))" sub={`${trialTenants} em trial`} />
        <HeroKPI icon={Bot} label="Agentes" value={String(attendantCount)} gradient="linear-gradient(135deg, hsl(280 67% 50%), hsl(320 72% 55%))" sub="rodando agora" />
        <HeroKPI icon={Cpu} label="Conversas" value={String(conversationCount)} gradient="linear-gradient(135deg, hsl(38 92% 50%), hsl(24 95% 53%))" sub={`${messageCount} msgs`} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Crescimento de clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[160px]">
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
                  <YAxis hide />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="count" stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill="url(#growthGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Receita por plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planChartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="plan" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`R$ ${v}`, "Receita"]} />
                  <Bar dataKey="revenue" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant list */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-display">Clientes ({tenants.length})</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/admin/tenants")}>
              Ver todos <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tenants.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-accent/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                    <span className="text-xs font-semibold text-primary">{t.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{timeAgo(t.created_at)} · R$ {planPrices[t.plan] || 197}/mês</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px] capitalize">{t.plan}</Badge>
                  <Badge variant={t.status === "trial" ? "secondary" : "default"} className="text-[10px]">
                    {t.status === "trial" ? "Trial" : "Ativo"}
                  </Badge>
                </div>
              </div>
            ))}
            {tenants.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente cadastrado</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

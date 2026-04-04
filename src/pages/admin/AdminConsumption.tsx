import { useEffect, useState, useMemo } from "react";
import { Cpu, MessageSquare, Users, DollarSign, BarChart3, TrendingUp, Zap, RefreshCw, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface TenantConsumption {
  name: string;
  conversations: number;
  messages: number;
  cost: number;
  pct: number;
}

function HeroKPI({ icon: Icon, label, value, gradient, sub }: { icon: any; label: string; value: string; gradient: string; sub?: string }) {
  return (
    <div className="relative rounded-xl p-4 sm:p-5 flex flex-col gap-1 overflow-hidden" style={{ background: gradient }}>
      <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(ellipse at top right, white 0%, transparent 70%)" }} />
      <div className="flex items-center gap-1.5 relative">
        <Icon className="w-4 h-4 text-white/70" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-white/70">{label}</span>
      </div>
      <span className="text-2xl sm:text-3xl font-display font-bold text-white relative mt-0.5">{value}</span>
      {sub && <span className="text-[10px] text-white/50 relative font-mono">{sub}</span>}
    </div>
  );
}

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

const PIE_COLORS = ["hsl(217, 91%, 60%)", "hsl(152, 69%, 41%)", "hsl(38, 92%, 55%)", "hsl(280, 67%, 55%)", "hsl(320, 72%, 55%)", "hsl(200, 80%, 50%)"];

export default function AdminConsumption() {
  const [tenantData, setTenantData] = useState<TenantConsumption[]>([]);
  const [totalConvs, setTotalConvs] = useState(0);
  const [totalMsgs, setTotalMsgs] = useState(0);
  const [totalTenants, setTotalTenants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<"messages" | "conversations" | "cost" | "name">("messages");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // TODO: Move to server-side aggregation for large datasets (>10K conversations)
  const fetchData = async () => {
    const [tenantsRes, convsRes, msgsRes] = await Promise.all([
      supabase.from("tenants").select("id, name"),
      supabase.from("conversations").select("id, tenant_id"),
      supabase.from("messages").select("id, conversation_id"),
    ]);

    const tenants = tenantsRes.data ?? [];
    const convs = convsRes.data ?? [];
    const msgs = msgsRes.data ?? [];

    setTotalTenants(tenants.length);
    setTotalConvs(convs.length);
    setTotalMsgs(msgs.length);

    const convsByTenant: Record<string, number> = {};
    const convIdToTenant: Record<string, string> = {};
    convs.forEach(c => {
      convsByTenant[c.tenant_id] = (convsByTenant[c.tenant_id] || 0) + 1;
      convIdToTenant[c.id] = c.tenant_id;
    });

    const msgsByTenant: Record<string, number> = {};
    msgs.forEach(m => {
      const tid = convIdToTenant[m.conversation_id];
      if (tid) msgsByTenant[tid] = (msgsByTenant[tid] || 0) + 1;
    });

    const data = tenants.map(t => ({
      name: t.name.length > 20 ? t.name.slice(0, 20) + "…" : t.name,
      conversations: convsByTenant[t.id] || 0,
      messages: msgsByTenant[t.id] || 0,
      cost: (msgsByTenant[t.id] || 0) * 0.002,
      pct: msgs.length > 0 ? ((msgsByTenant[t.id] || 0) / msgs.length) * 100 : 0,
    })).sort((a, b) => b.messages - a.messages);

    setTenantData(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const sorted = useMemo(() => {
    return [...tenantData].sort((a, b) => {
      const val = sortField === "name" ? a.name.localeCompare(b.name) : (a[sortField] as number) - (b[sortField] as number);
      return sortDir === "desc" ? -val : val;
    });
  }, [tenantData, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const totalCost = totalMsgs * 0.002;
  const avgMsgPerTenant = totalTenants > 0 ? Math.round(totalMsgs / totalTenants) : 0;

  // Pie data for consumption share
  const pieData = useMemo(() => tenantData.filter(t => t.messages > 0).slice(0, 6), [tenantData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground font-mono">Calculando consumo...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-display font-bold tracking-tight">Consumo de IA</h1>
          <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">Monitoramento de uso por tenant</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 self-end sm:self-auto" onClick={() => { setLoading(true); fetchData(); }}>
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <HeroKPI icon={Users} label="Tenants" value={String(totalTenants)} gradient="linear-gradient(135deg, hsl(217 91% 55%), hsl(260 67% 55%))" sub="utilizando a plataforma" />
        <HeroKPI icon={MessageSquare} label="Conversas" value={totalConvs.toLocaleString("pt-BR")} gradient="linear-gradient(135deg, hsl(152 69% 31%), hsl(168 76% 36%))" sub={`${avgMsgPerTenant} msgs/tenant média`} />
        <HeroKPI icon={Zap} label="Mensagens" value={totalMsgs.toLocaleString("pt-BR")} gradient="linear-gradient(135deg, hsl(280 67% 50%), hsl(320 72% 55%))" sub="total processadas" />
        <HeroKPI icon={DollarSign} label="Custo IA" value={`$${totalCost.toFixed(2)}`} gradient="linear-gradient(135deg, hsl(38 92% 50%), hsl(24 95% 53%))" sub="estimativa total" />
      </div>

      <DashDivider label="Visualizações" icon={BarChart3} />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              Mensagens por tenant
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tenantData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tenantData.slice(0, 10)} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                    <Bar dataKey="messages" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} name="Mensagens" />
                    <Bar dataKey="conversations" fill="hsl(152, 69%, 41%)" radius={[4, 4, 0, 0]} name="Conversas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-xs text-muted-foreground text-center py-12">Sem dados de consumo</p>}
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              Share de consumo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {pieData.length > 0 ? (
              <>
                <div className="h-[160px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="messages" strokeWidth={0}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {pieData.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {p.name}
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-xs text-muted-foreground text-center py-12">Sem dados</p>}
          </CardContent>
        </Card>
      </div>

      <DashDivider label="Detalhamento" icon={TrendingUp} />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("name")}>
                    Tenant <ArrowUpDown className={`inline w-3 h-3 ml-0.5 ${sortField === "name" ? "text-primary" : ""}`} />
                  </th>
                  <th className="text-right px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("conversations")}>
                    Conversas <ArrowUpDown className={`inline w-3 h-3 ml-0.5 ${sortField === "conversations" ? "text-primary" : ""}`} />
                  </th>
                  <th className="text-right px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("messages")}>
                    Mensagens <ArrowUpDown className={`inline w-3 h-3 ml-0.5 ${sortField === "messages" ? "text-primary" : ""}`} />
                  </th>
                  <th className="text-right px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Share</th>
                  <th className="text-right px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("cost")}>
                    Custo Est. <ArrowUpDown className={`inline w-3 h-3 ml-0.5 ${sortField === "cost" ? "text-primary" : ""}`} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-primary">{t.name.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-xs">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{t.conversations}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-medium">{t.messages.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-16">
                          <Progress value={t.pct} className="h-1.5" />
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground w-10 text-right">{t.pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">${t.cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tenantData.length === 0 && <p className="text-center text-xs text-muted-foreground py-12">Sem dados de consumo</p>}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState, useMemo } from "react";
import { Search, Users, Eye, Filter, Download, ArrowUpDown, X, UserCheck, UserX, DollarSign, LogIn } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { startImpersonation } from "@/hooks/use-tenant";
import { toast } from "sonner";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  owner_id: string;
  created_at: string;
}

interface TenantDetail extends Tenant {
  attendant_count: number;
  conversation_count: number;
  owner_email?: string;
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <span className="text-xl font-display font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

export default function AdminTenants() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TenantDetail | null>(null);
  const [sortField, setSortField] = useState<"created_at" | "name" | "plan">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const enterTenant = async (tenant: Tenant) => {
    if (!user) return;

    // Log the impersonation in audit_logs
    await supabase.from("audit_logs").insert({
      admin_user_id: user.id,
      tenant_id: tenant.id,
      action: "impersonation_start",
      details: { tenant_name: tenant.name },
    });

    // Fetch admin profile name for the notification message
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    // Notify the tenant owner about the access (transparency)
    await supabase.from("notifications").insert({
      user_id: tenant.owner_id,
      type: "admin_access_request",
      title: "Acesso administrativo solicitado",
      message: `A equipe de suporte da Meteora Digital (${adminProfile?.full_name || "Admin"}) está acessando sua conta para verificação/suporte.`,
      action_type: "approve_deny",
      action_data: {
        admin_user_id: user.id,
        admin_name: adminProfile?.full_name || "Admin",
        tenant_id: tenant.id,
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    startImpersonation(tenant.id, user.id);
    toast.success(`Acessando dashboard de ${tenant.name}`);
    navigate("/dashboard");
  };

  useEffect(() => {
    const fetchTenants = async () => {
      const [tenantsRes, plansRes] = await Promise.all([
        supabase.from("tenants").select("*").order("created_at", { ascending: false }),
        supabase.from("plans").select("id, price_monthly"),
      ]);
      setTenants(tenantsRes.data ?? []);

      // Build plan prices from DB (price_monthly is in cents, convert to BRL)
      const prices: Record<string, number> = {};
      plansRes.data?.forEach(p => { prices[p.id] = (p.price_monthly || 0) / 100; });
      setPlanPrices(prices);

      setLoading(false);
    };
    fetchTenants();
  }, []);

  const openDetail = async (tenant: Tenant) => {
    const [attRes, convRes, profRes] = await Promise.all([
      supabase.from("attendants").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("profiles").select("full_name").eq("user_id", tenant.owner_id).single(),
    ]);
    setSelected({
      ...tenant,
      attendant_count: attRes.count ?? 0,
      conversation_count: convRes.count ?? 0,
      owner_email: profRes.data?.full_name ?? "—",
    });
  };

  const filtered = useMemo(() => {
    let result = tenants;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(s) || t.slug.toLowerCase().includes(s));
    }
    if (planFilter !== "all") result = result.filter(t => t.plan === planFilter);
    if (statusFilter !== "all") result = result.filter(t => t.status === statusFilter);

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "plan") cmp = (planPrices[a.plan] || 0) - (planPrices[b.plan] || 0);
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [tenants, search, planFilter, statusFilter, sortField, sortDir]);

  const stats = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter(t => t.status === "active").length,
    trial: tenants.filter(t => t.status === "trial").length,
    mrr: tenants.reduce((s, t) => s + (planPrices[t.plan] || 0), 0),
  }), [tenants, planPrices]);

  const uniquePlans = [...new Set(tenants.map(t => t.plan))];
  const hasActiveFilters = search || planFilter !== "all" || statusFilter !== "all";

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const timeAgo = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return "hoje";
    if (days === 1) return "ontem";
    if (days < 7) return `${days}d atrás`;
    return `${Math.floor(days / 7)}sem`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground font-mono">Carregando clientes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold tracking-tight">Clientes</h1>
          <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">{tenants.length} tenants cadastrados</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total" value={String(stats.total)} color="hsl(var(--foreground))" />
        <StatCard icon={UserCheck} label="Ativos" value={String(stats.active)} color="hsl(152, 69%, 41%)" />
        <StatCard icon={UserX} label="Trial" value={String(stats.trial)} color="hsl(38, 92%, 55%)" />
        <StatCard icon={DollarSign} label="MRR" value={`R$ ${stats.mrr.toLocaleString("pt-BR")}`} color="hsl(152, 69%, 41%)" />
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" /> Filtros
          </div>
          {hasActiveFilters && (
            <button onClick={() => { setSearch(""); setPlanFilter("all"); setStatusFilter("all"); }} className="text-[10px] text-primary hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Nome, slug..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background border-border text-xs h-8" />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[130px] bg-background border-border h-8 text-[11px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Plano: Todos</SelectItem>
              {uniquePlans.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] bg-background border-border h-8 text-[11px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-[10px] text-muted-foreground font-mono">{filtered.length} de {tenants.length} resultado{filtered.length !== 1 && "s"}</p>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("name")}>
                    Cliente <ArrowUpDown className={`inline w-3 h-3 ml-0.5 ${sortField === "name" ? "text-primary" : ""}`} />
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Slug</th>
                  <th className="text-left px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("plan")}>
                    Plano <ArrowUpDown className={`inline w-3 h-3 ml-0.5 ${sortField === "plan" ? "text-primary" : ""}`} />
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">MRR</th>
                  <th className="text-right px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("created_at")}>
                    Criado <ArrowUpDown className={`inline w-3 h-3 ml-0.5 ${sortField === "created_at" ? "text-primary" : ""}`} />
                  </th>
                  <th className="text-center px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                          <span className="text-[10px] font-bold text-primary">{t.name.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-xs">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-muted-foreground font-mono">{t.slug}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="font-mono text-[9px] capitalize h-5">{t.plan}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === "active" ? "bg-emerald-400" : "bg-amber-400"}`} />
                        <span className="text-[10px] capitalize">{t.status === "active" ? "Ativo" : t.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">R$ {(planPrices[t.plan] || 0).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2.5 text-right text-[10px] text-muted-foreground font-mono">{timeAgo(t.created_at)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(t)} title="Ver detalhes">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10" onClick={() => enterTenant(t)} title="Acessar dashboard do cliente">
                          <LogIn className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-12">Nenhum tenant encontrado</p>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{selected?.name}</DialogTitle>
            <DialogDescription className="font-mono text-xs">{selected?.slug}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Plano", value: selected.plan },
                  { label: "Status", value: selected.status },
                  { label: "Agentes", value: String(selected.attendant_count) },
                  { label: "Conversas", value: String(selected.conversation_count) },
                ].map(item => (
                  <div key={item.label} className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{item.label}</p>
                    <p className="text-lg font-display font-bold capitalize mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Owner</p>
                <p className="text-sm font-medium mt-0.5">{selected.owner_email}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Criado em</p>
                <p className="text-sm font-mono mt-0.5">{new Date(selected.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

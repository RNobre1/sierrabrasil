import { useEffect, useState } from "react";
import { DollarSign, Users, Bot, Cpu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface TenantRow {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [attendantCount, setAttendantCount] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [tenantsRes, attendantsRes, convsRes] = await Promise.all([
        supabase.from("tenants").select("id, name, plan, status, created_at").order("created_at", { ascending: false }),
        supabase.from("attendants").select("id", { count: "exact", head: true }),
        supabase.from("conversations").select("id", { count: "exact", head: true }),
      ]);

      setTenants(tenantsRes.data ?? []);
      setAttendantCount(attendantsRes.count ?? 0);
      setConversationCount(convsRes.count ?? 0);
      setLoading(false);
    };

    fetchData();
  }, []);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "hoje";
    if (days === 1) return "ontem";
    if (days < 7) return `${days} dias atrás`;
    if (days < 30) return `${Math.floor(days / 7)} semana(s)`;
    return `${Math.floor(days / 30)} mês(es)`;
  };

  const planPrices: Record<string, number> = { starter: 197, professional: 497, enterprise: 997 };
  const mrr = tenants.reduce((sum, t) => sum + (planPrices[t.plan] || 197), 0);

  const adminKpis = [
    { label: "MRR", value: `R$ ${mrr.toLocaleString("pt-BR")}`, icon: DollarSign },
    { label: "Clientes ativos", value: String(tenants.filter(t => t.status === "active").length), icon: Users },
    { label: "Agentes rodando", value: String(attendantCount), icon: Bot },
    { label: "Conversas totais", value: String(conversationCount), icon: Cpu },
  ];

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {adminKpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <kpi.icon className="h-5 w-5 text-muted-foreground" />
                <span className="flex items-center gap-1 text-xs font-medium text-meteora-success">
                  <ArrowUpRight className="h-3 w-3" />
                  {kpi.delta}
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-light">{kpi.value}</p>
              <p className="mt-1 text-xs text-muted-foreground font-mono uppercase tracking-wider">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Clientes ({tenants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tenants.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(t.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-[10px] capitalize">{t.plan}</Badge>
                  <Badge variant={t.status === "trial" ? "secondary" : "default"}>
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

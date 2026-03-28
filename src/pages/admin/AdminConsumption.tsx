import { useEffect, useState } from "react";
import { Cpu, MessageSquare, Users, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface TenantConsumption {
  name: string;
  conversations: number;
  messages: number;
}

export default function AdminConsumption() {
  const [tenantData, setTenantData] = useState<TenantConsumption[]>([]);
  const [totalConvs, setTotalConvs] = useState(0);
  const [totalMsgs, setTotalMsgs] = useState(0);
  const [totalTenants, setTotalTenants] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
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

      // Map conversations to tenants
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
        name: t.name.length > 15 ? t.name.slice(0, 15) + "…" : t.name,
        conversations: convsByTenant[t.id] || 0,
        messages: msgsByTenant[t.id] || 0,
      })).sort((a, b) => b.messages - a.messages);

      setTenantData(data);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  const kpis = [
    { label: "Tenants ativos", value: String(totalTenants), icon: Users },
    { label: "Conversas totais", value: String(totalConvs), icon: MessageSquare },
    { label: "Mensagens totais", value: String(totalMsgs), icon: Cpu },
    { label: "Custo estimado", value: `$${(totalMsgs * 0.002).toFixed(2)}`, icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Consumo de IA</h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">Monitoramento de uso por tenant</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <kpi.icon className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="font-display text-3xl font-light">{kpi.value}</p>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Mensagens por tenant</CardTitle>
        </CardHeader>
        <CardContent>
          {tenantData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tenantData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Mensagens" />
                <Bar dataKey="conversations" fill="hsl(var(--meteora-success))" radius={[4, 4, 0, 0]} name="Conversas" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-12">Sem dados de consumo</p>}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Detalhamento por tenant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs text-muted-foreground font-mono uppercase">Tenant</th>
                  <th className="text-right py-2 text-xs text-muted-foreground font-mono uppercase">Conversas</th>
                  <th className="text-right py-2 text-xs text-muted-foreground font-mono uppercase">Mensagens</th>
                  <th className="text-right py-2 text-xs text-muted-foreground font-mono uppercase">Custo Est.</th>
                </tr>
              </thead>
              <tbody>
                {tenantData.map((t, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2.5 font-medium">{t.name}</td>
                    <td className="py-2.5 text-right font-mono">{t.conversations}</td>
                    <td className="py-2.5 text-right font-mono">{t.messages}</td>
                    <td className="py-2.5 text-right font-mono">${(t.messages * 0.002).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

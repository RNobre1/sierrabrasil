import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const COLORS = ["hsl(var(--primary))", "hsl(var(--meteora-success))", "hsl(var(--meteora-danger))", "hsl(var(--meteora-warning))"];

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [channelData, setChannelData] = useState<{ name: string; value: number }[]>([]);
  const [dailyData, setDailyData] = useState<{ date: string; count: number }[]>([]);
  const [totalConvs, setTotalConvs] = useState(0);
  const [totalMsgs, setTotalMsgs] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("owner_id", user.id).single();
      if (!tenant) { setLoading(false); return; }

      const { data: convs } = await supabase.from("conversations").select("id, status, channel, started_at").eq("tenant_id", tenant.id);
      const { count: msgCount } = await supabase.from("messages").select("id", { count: "exact", head: true });

      if (convs) {
        setTotalConvs(convs.length);
        setTotalMsgs(msgCount ?? 0);

        // Status breakdown
        const statusMap: Record<string, number> = {};
        const channelMap: Record<string, number> = {};
        const dayMap: Record<string, number> = {};

        convs.forEach(c => {
          statusMap[c.status] = (statusMap[c.status] || 0) + 1;
          channelMap[c.channel] = (channelMap[c.channel] || 0) + 1;
          const day = new Date(c.started_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
          dayMap[day] = (dayMap[day] || 0) + 1;
        });

        const statusLabels: Record<string, string> = { active: "Ativas", resolved: "Resolvidas", escalated: "Escaladas" };
        setStatusData(Object.entries(statusMap).map(([k, v]) => ({ name: statusLabels[k] || k, value: v })));
        setChannelData(Object.entries(channelMap).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v })));
        setDailyData(Object.entries(dayMap).map(([k, v]) => ({ date: k, count: v })).slice(-14));
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground mt-1">Métricas e análises do seu atendente</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Total de conversas</p><p className="mt-1 font-display text-3xl font-light">{totalConvs}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Total de mensagens</p><p className="mt-1 font-display text-3xl font-light">{totalMsgs}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Taxa de resolução</p><p className="mt-1 font-display text-3xl font-light">{totalConvs ? Math.round((statusData.find(s => s.name === "Resolvidas")?.value || 0) / totalConvs * 100) : 0}%</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Msg/conversa média</p><p className="mt-1 font-display text-3xl font-light">{totalConvs ? (totalMsgs / totalConvs).toFixed(1) : "0"}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Conversations */}
        <Card>
          <CardHeader><CardTitle className="text-base font-display">Conversas por dia</CardTitle></CardHeader>
          <CardContent>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-12">Sem dados suficientes</p>}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-base font-display">Distribuição por status</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>}
          </CardContent>
        </Card>

        {/* Channel Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-base font-display">Canais de atendimento</CardTitle></CardHeader>
          <CardContent>
            {channelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={channelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="hsl(var(--meteora-success))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

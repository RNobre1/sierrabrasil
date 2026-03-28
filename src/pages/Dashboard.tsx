import { useEffect, useState } from "react";
import { MessageSquare, ShoppingCart, CalendarCheck, Star, Play, Pause, Settings, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Ativa", variant: "default" },
    resolved: { label: "Resolvida", variant: "secondary" },
    escalated: { label: "Escalada", variant: "destructive" },
  };
  const s = map[status] || map.active;
  return <Badge variant={s.variant}>{s.label}</Badge>;
};

const insights = [
  { title: "Horário de pico detectado", desc: "80% das conversas ocorrem entre 10h-14h. Considere aumentar capacidade.", action: "Aceitar" },
  { title: "FAQ mais comum", desc: "\"Qual o prazo de entrega?\" apareceu 23 vezes hoje. Sugestão: resposta automática.", action: "Aceitar" },
];

interface Attendant {
  id: string;
  name: string;
  status: string;
  channels: string[] | null;
}

interface Conversation {
  id: string;
  contact_name: string;
  status: string;
  started_at: string;
  channel: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [attendant, setAttendant] = useState<Attendant | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [totalConversations, setTotalConversations] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Get tenant for this user
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!tenant) {
        setLoading(false);
        return;
      }

      // Fetch attendant, conversations in parallel
      const [attRes, convRes] = await Promise.all([
        supabase.from("attendants").select("id, name, status, channels").eq("tenant_id", tenant.id).limit(1).single(),
        supabase.from("conversations").select("id, contact_name, status, started_at, channel").eq("tenant_id", tenant.id).order("started_at", { ascending: false }).limit(5),
      ]);

      setAttendant(attRes.data);
      setConversations(convRes.data ?? []);
      setTotalConversations(convRes.data?.length ?? 0);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const activeCount = conversations.filter(c => c.status === "active").length;
  const resolvedCount = conversations.filter(c => c.status === "resolved").length;

  const kpis = [
    { label: "Conversas totais", value: String(totalConversations), icon: MessageSquare },
    { label: "Resolvidas", value: String(resolvedCount), icon: ShoppingCart },
    { label: "Ativas", value: String(activeCount), icon: CalendarCheck },
    { label: "Taxa de resolução", value: totalConversations ? `${Math.round(resolvedCount / totalConversations * 100)}%` : "—", icon: Star },
  ];

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
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
        <h1 className="text-2xl font-display font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do seu atendente inteligente</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <kpi.icon className="h-5 w-5 text-muted-foreground" />
                <span className={`flex items-center gap-1 text-xs font-medium ${kpi.up ? "text-meteora-success" : "text-meteora-danger"}`}>
                  {kpi.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {kpi.delta}
                </span>
              </div>
              <p className="mt-3 font-display text-[40px] font-light leading-none text-foreground">{kpi.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attendant Hero Card */}
      {attendant && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <span className={`absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-card animate-pulse-dot ${attendant.status === "online" ? "bg-meteora-success" : "bg-muted-foreground"}`} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold">{attendant.name} — Atendente IA</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {attendant.channels?.map((ch) => (
                      <Badge key={ch} variant="outline" className="text-[10px] capitalize">{ch}</Badge>
                    ))}
                    <span className={`text-xs font-medium ${attendant.status === "online" ? "text-meteora-success" : "text-muted-foreground"}`}>
                      ● {attendant.status === "online" ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => navigate("/attendant/playground")}>
                  <Play className="h-4 w-4 mr-1" /> Testar
                </Button>
                <Button size="sm" variant="outline">
                  <Pause className="h-4 w-4 mr-1" /> Pausar
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate("/attendant/config")}>
                  <Settings className="h-4 w-4 mr-1" /> Configurar
                </Button>
                <Button size="sm" onClick={() => navigate("/conversations")}>
                  <MessageSquare className="h-4 w-4 mr-1" /> Ver conversas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Conversations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Últimas Conversas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma conversa ainda</p>
            )}
            {conversations.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate(`/conversations/${c.id}`)}>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground">{c.contact_name.split(" ").map(n => n[0]).join("")}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.contact_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{c.channel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(c.status)}
                  <span className="text-xs text-muted-foreground">{timeAgo(c.started_at)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Explorer Insights */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Insights do Explorer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold">{insight.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{insight.desc}</p>
                <Button size="sm" variant="outline" className="mt-3">
                  {insight.action}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { MessageSquare, ShoppingCart, CalendarCheck, Star, Play, Pause, Settings, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const kpis = [
  { label: "Conversas hoje", value: "47", delta: "+12%", up: true, icon: MessageSquare },
  { label: "Vendas realizadas", value: "8", delta: "+25%", up: true, icon: ShoppingCart },
  { label: "Agendamentos", value: "15", delta: "+5%", up: true, icon: CalendarCheck },
  { label: "Satisfação média", value: "4.8", delta: "-0.1", up: false, icon: Star },
];

const recentConversations = [
  { name: "Maria Silva", action: "Agendamento confirmado", time: "2 min", status: "resolved" },
  { name: "João Santos", action: "Pedido #1234 realizado", time: "8 min", status: "resolved" },
  { name: "Ana Costa", action: "Aguardando resposta", time: "15 min", status: "active" },
  { name: "Pedro Oliveira", action: "Escalado para humano", time: "22 min", status: "escalated" },
  { name: "Lucia Ferreira", action: "Dúvida sobre produto", time: "30 min", status: "active" },
];

const insights = [
  { title: "Horário de pico detectado", desc: "80% das conversas ocorrem entre 10h-14h. Considere aumentar capacidade.", action: "Aceitar" },
  { title: "FAQ mais comum", desc: "\"Qual o prazo de entrega?\" apareceu 23 vezes hoje. Sugestão: resposta automática.", action: "Aceitar" },
];

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Ativa", variant: "default" },
    resolved: { label: "Resolvida", variant: "secondary" },
    escalated: { label: "Escalada", variant: "destructive" },
  };
  const s = map[status] || map.active;
  return <Badge variant={s.variant}>{s.label}</Badge>;
};

export default function Dashboard() {
  const navigate = useNavigate();

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
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-meteora-success border-2 border-card animate-pulse-dot" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">Luna — Atendente IA</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">WhatsApp</Badge>
                  <Badge variant="outline" className="text-[10px]">Instagram</Badge>
                  <span className="text-xs text-meteora-success font-medium">● Online</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Conversations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Últimas Conversas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentConversations.map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate("/conversations")}>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground">{c.name.split(" ").map(n => n[0]).join("")}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.action}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(c.status)}
                  <span className="text-xs text-muted-foreground">{c.time}</span>
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

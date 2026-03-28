import { DollarSign, Users, Bot, Cpu, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const adminKpis = [
  { label: "MRR", value: "R$ 28.400", delta: "+18%", icon: DollarSign },
  { label: "Clientes ativos", value: "42", delta: "+3", icon: Users },
  { label: "Agentes rodando", value: "38", delta: "90%", icon: Bot },
  { label: "Consumo IA (mês)", value: "1.2M tok", delta: "+22%", icon: Cpu },
];

const recentTenants = [
  { name: "Clínica Sorriso", plan: "Professional", status: "active", agents: 2, created: "2 dias atrás" },
  { name: "Pizzaria do Zé", plan: "Starter", status: "active", agents: 1, created: "5 dias atrás" },
  { name: "Studio Beauty", plan: "Professional", status: "trial", agents: 1, created: "1 semana" },
  { name: "Auto Peças Silva", plan: "Starter", status: "active", agents: 1, created: "2 semanas" },
  { name: "Restaurante Mar", plan: "Enterprise", status: "active", agents: 3, created: "3 semanas" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6 dark">
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
          <CardTitle className="text-base font-display">Clientes Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTenants.map((t, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.created}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-[10px]">{t.plan}</Badge>
                  <Badge variant={t.status === "trial" ? "secondary" : "default"}>
                    {t.status === "trial" ? "Trial" : "Ativo"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{t.agents} agent{t.agents > 1 ? "s" : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

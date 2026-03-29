import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import UpgradeGate from "@/components/UpgradeGate";
import { cn } from "@/lib/utils";
import {
  Bot, FileText, TrendingUp, Users, Clock, MessageSquare,
  DollarSign, BarChart3, Calendar, Mail, Phone, Send,
  Presentation, Lock, ArrowRight, Zap, Star, ChevronRight,
  CheckCircle2, Download
} from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--meteora-cyan))", "hsl(var(--meteora-green))", "hsl(var(--meteora-warning))"];

// Report templates for Brazilian SMBs
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  minPlan: "starter" | "professional" | "enterprise";
  fields: string[];
}

const reportTemplates: ReportTemplate[] = [
  {
    id: "atendimento-geral",
    name: "Resumo de Atendimento",
    description: "Volume de conversas, tempo médio de resposta, taxa de resolução e satisfação geral.",
    icon: <MessageSquare className="h-5 w-5" />,
    category: "Atendimento",
    minPlan: "starter",
    fields: ["conversas", "tempo_resposta", "resolucao", "satisfacao"],
  },
  {
    id: "leads-captados",
    name: "Leads Captados",
    description: "Quantidade de leads novos, origem (WhatsApp, Instagram, Web), taxa de conversão.",
    icon: <Users className="h-5 w-5" />,
    category: "Vendas",
    minPlan: "starter",
    fields: ["total_leads", "origem", "conversao"],
  },
  {
    id: "performance-vendas",
    name: "Performance de Vendas",
    description: "Propostas enviadas, fechamentos, ticket médio, funil completo do agente de vendas.",
    icon: <DollarSign className="h-5 w-5" />,
    category: "Vendas",
    minPlan: "professional",
    fields: ["propostas", "fechamentos", "ticket_medio", "funil"],
  },
  {
    id: "agendamentos",
    name: "Agendamentos Realizados",
    description: "Total de agendamentos, taxa de no-show, horários mais procurados, ocupação.",
    icon: <Calendar className="h-5 w-5" />,
    category: "Agenda",
    minPlan: "starter",
    fields: ["total_agendamentos", "no_show", "horarios_pico"],
  },
  {
    id: "analise-sentimento",
    name: "Análise de Sentimento",
    description: "Sentimento das conversas (positivo, neutro, negativo), temas recorrentes, alertas.",
    icon: <TrendingUp className="h-5 w-5" />,
    category: "Inteligência",
    minPlan: "professional",
    fields: ["sentimento", "temas", "alertas"],
  },
  {
    id: "cobranca-financeiro",
    name: "Cobranças & Financeiro",
    description: "Links de pagamento enviados, cobranças realizadas, inadimplência, receita recuperada.",
    icon: <DollarSign className="h-5 w-5" />,
    category: "Financeiro",
    minPlan: "professional",
    fields: ["cobrancas", "inadimplencia", "receita_recuperada"],
  },
  {
    id: "comparativo-agentes",
    name: "Comparativo entre Agentes",
    description: "Performance lado a lado de todos os agentes: volume, velocidade, satisfação.",
    icon: <BarChart3 className="h-5 w-5" />,
    category: "Inteligência",
    minPlan: "enterprise",
    fields: ["comparativo_volume", "comparativo_velocidade", "comparativo_satisfacao"],
  },
  {
    id: "relatorio-executivo",
    name: "Relatório Executivo",
    description: "Visão completa do negócio: atendimento, vendas, financeiro e recomendações da IA.",
    icon: <Star className="h-5 w-5" />,
    category: "Estratégico",
    minPlan: "enterprise",
    fields: ["overview", "recomendacoes_ia", "projecoes"],
  },
];

// Plan limits for automated reports
const planLimits = {
  starter: { reportsPerWeek: 1, channels: ["whatsapp"], templates: ["atendimento-geral", "leads-captados", "agendamentos"] },
  professional: { reportsPerWeek: 5, channels: ["whatsapp", "email"], templates: ["atendimento-geral", "leads-captados", "agendamentos", "performance-vendas", "analise-sentimento", "cobranca-financeiro"] },
  enterprise: { reportsPerWeek: 999, channels: ["whatsapp", "email", "presentation"], templates: reportTemplates.map(r => r.id) },
};

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<"starter" | "professional" | "enterprise">("starter");
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("all");

  // Data
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [channelData, setChannelData] = useState<{ name: string; value: number }[]>([]);
  const [dailyData, setDailyData] = useState<{ date: string; count: number }[]>([]);
  const [totalConvs, setTotalConvs] = useState(0);
  const [totalMsgs, setTotalMsgs] = useState(0);

  // Report config
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [deliveryDay, setDeliveryDay] = useState("monday");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [extraPhone, setExtraPhone] = useState("");
  const [extraEmail, setExtraEmail] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: tenant } = await supabase.from("tenants").select("id, plan").eq("owner_id", user.id).single();
      if (!tenant) { setLoading(false); return; }
      setPlan((tenant.plan as "starter" | "professional" | "enterprise") || "starter");

      // Fetch agents
      const { data: agentData } = await supabase.from("attendants").select("id, name").eq("tenant_id", tenant.id);
      if (agentData) setAgents(agentData);

      // Fetch conversations
      let query = supabase.from("conversations").select("id, status, channel, started_at, attendant_id").eq("tenant_id", tenant.id);
      const { data: convs } = await query;
      const { count: msgCount } = await supabase.from("messages").select("id", { count: "exact", head: true });

      if (convs) {
        const filtered = selectedAgent === "all" ? convs : convs.filter(c => c.attendant_id === selectedAgent);
        setTotalConvs(filtered.length);
        setTotalMsgs(msgCount ?? 0);

        const statusMap: Record<string, number> = {};
        const channelMap: Record<string, number> = {};
        const dayMap: Record<string, number> = {};

        filtered.forEach(c => {
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
    fetchData();
  }, [user, selectedAgent]);

  const limits = planLimits[plan];
  const isTemplateAvailable = (templateId: string) => limits.templates.includes(templateId);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  const daysOfWeek = [
    { value: "monday", label: "Segunda-feira" },
    { value: "tuesday", label: "Terça-feira" },
    { value: "wednesday", label: "Quarta-feira" },
    { value: "thursday", label: "Quinta-feira" },
    { value: "friday", label: "Sexta-feira" },
    { value: "saturday", label: "Sábado" },
    { value: "sunday", label: "Domingo" },
  ];

  return (
    <div className="space-y-8">
      {/* Header + Agent Filter */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-semibold">Relatórios</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Métricas, análises e relatórios automáticos</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="space-y-1 w-full sm:w-auto">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">Agente</Label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm bg-card border-border/40">
                <Bot className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Selecionar agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os agentes</SelectItem>
                {agents.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary h-6">
            {plan === "starter" ? "Starter" : plan === "professional" ? "Professional" : "Enterprise"}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">Conversas</p><p className="mt-1.5 font-display text-2xl font-light">{totalConvs}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">Mensagens</p><p className="mt-1.5 font-display text-2xl font-light">{totalMsgs}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">Resolução</p><p className="mt-1.5 font-display text-2xl font-light">{totalConvs ? Math.round((statusData.find(s => s.name === "Resolvidas")?.value || 0) / totalConvs * 100) : 0}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">Msg/conversa</p><p className="mt-1.5 font-display text-2xl font-light">{totalConvs ? (totalMsgs / totalConvs).toFixed(1) : "0"}</p></CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base font-display">Conversas por dia</CardTitle></CardHeader>
          <CardContent>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-12">Sem dados suficientes</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-display">Distribuição por status</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>}
          </CardContent>
        </Card>
      </div>

      {/* Report Templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Modelos de Relatório</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Escolha um modelo para receber automaticamente · Seu plano permite <span className="text-primary font-medium">{limits.reportsPerWeek === 999 ? "ilimitados" : `${limits.reportsPerWeek}/semana`}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reportTemplates.map((template) => {
            const available = isTemplateAvailable(template.id);
            const isSelected = selectedTemplate === template.id;
            return (
              <div
                key={template.id}
                onClick={() => available && setSelectedTemplate(isSelected ? "" : template.id)}
                className={cn(
                  "relative group rounded-xl border p-4 transition-all duration-200 cursor-pointer",
                  available
                    ? isSelected
                      ? "border-primary/30 bg-primary/5 shadow-[0_0_20px_-8px_hsl(var(--primary)/0.2)]"
                      : "border-border/40 bg-card hover:border-border/80 hover:bg-card/80"
                    : "border-border/20 bg-card/30 opacity-50 cursor-default"
                )}
              >
                {!available && (
                  <div className="absolute top-3 right-3">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40"
                  )}>
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-foreground truncate">{template.name}</h3>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0 font-mono border-border/30 text-muted-foreground/60">
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 line-clamp-2">{template.description}</p>
                    {!available && (
                      <p className="text-[10px] text-primary mt-1.5 font-medium">
                        Requer plano {template.minPlan === "professional" ? "Professional" : "Enterprise"}
                      </p>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery Configuration */}
      {selectedTemplate && (
        <Card className="border-primary/10 bg-primary/[0.02]">
          <CardHeader>
            <CardTitle className="text-base font-display">Configurar Entrega Automática</CardTitle>
            <CardDescription>
              Configure como e quando receber o relatório "{reportTemplates.find(r => r.id === selectedTemplate)?.name}"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Day */}
              <div className="space-y-1.5">
                <Label className="text-xs">Dia de recebimento</Label>
                <Select value={deliveryDay} onValueChange={setDeliveryDay}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Agent */}
              <div className="space-y-1.5">
                <Label className="text-xs">Agente</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os agentes</SelectItem>
                    {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Format placeholder */}
              <div className="space-y-1.5">
                <Label className="text-xs">Formato</Label>
                <Select defaultValue="resumo">
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resumo">Resumo rápido</SelectItem>
                    <SelectItem value="detalhado">Detalhado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Channels */}
            <div className="space-y-3">
              <Label className="text-xs">Canais de entrega</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border/40 bg-card p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">WhatsApp</p>
                      <p className="text-[10px] text-muted-foreground">Receba direto no seu WhatsApp</p>
                    </div>
                  </div>
                  <Switch checked={sendWhatsApp} onCheckedChange={setSendWhatsApp} />
                </div>

                {sendWhatsApp && (
                  <div className="pl-11">
                    <Input
                      value={extraPhone}
                      onChange={e => setExtraPhone(e.target.value)}
                      placeholder="Enviar cópia para outro número (opcional)"
                      className="text-xs h-8 bg-secondary/30 border-border/30"
                    />
                  </div>
                )}

                <div className={cn(
                  "flex items-center justify-between rounded-lg border border-border/40 bg-card p-3",
                  !limits.channels.includes("email") && "opacity-50"
                )}>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-[10px] text-muted-foreground">
                        {limits.channels.includes("email") ? "Receba em PDF no seu email" : "Disponível no plano Professional"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={sendEmail}
                    onCheckedChange={setSendEmail}
                    disabled={!limits.channels.includes("email")}
                  />
                </div>

                {sendEmail && limits.channels.includes("email") && (
                  <div className="pl-11">
                    <Input
                      value={extraEmail}
                      onChange={e => setExtraEmail(e.target.value)}
                      placeholder="Enviar cópia para outro email (opcional)"
                      className="text-xs h-8 bg-secondary/30 border-border/30"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Gerar Agora
              </Button>
              <Button size="sm" className="gap-1.5 text-xs bg-gradient-to-r from-primary to-[hsl(var(--meteora-cyan))]">
                <Send className="h-3.5 w-3.5" /> Salvar Automação
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Presentation Mockup */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Presentation className="h-4 w-4 text-primary" />
                Apresentação Visual
              </CardTitle>
              <CardDescription>Gere um relatório visual profissional para reuniões e apresentações</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mockup slides */}
          <div className="relative rounded-xl border border-border/30 bg-secondary/20 p-6 overflow-hidden">
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {/* Slide 1 — Cover */}
              <div className="shrink-0 w-[280px] h-[158px] rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--meteora-cyan))] p-5 flex flex-col justify-between shadow-lg">
                <div>
                  <div className="h-3 w-16 rounded bg-white/20 mb-2" />
                  <div className="h-4 w-32 rounded bg-white/40" />
                </div>
                <div>
                  <p className="text-[9px] text-white/60 font-mono">RELATÓRIO SEMANAL</p>
                  <p className="text-sm text-white font-semibold mt-0.5">Resumo de Atendimento</p>
                  <p className="text-[10px] text-white/50 mt-0.5">Março 2026 · Agente Principal</p>
                </div>
              </div>

              {/* Slide 2 — KPIs */}
              <div className="shrink-0 w-[280px] h-[158px] rounded-lg bg-card border border-border/30 p-4 flex flex-col shadow-lg">
                <p className="text-[9px] text-muted-foreground/60 font-mono uppercase tracking-wider mb-3">Métricas Principais</p>
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <div className="rounded-md bg-primary/5 p-2">
                    <p className="text-[8px] text-muted-foreground">Conversas</p>
                    <p className="text-lg font-bold text-foreground">847</p>
                  </div>
                  <div className="rounded-md bg-primary/5 p-2">
                    <p className="text-[8px] text-muted-foreground">Resolução</p>
                    <p className="text-lg font-bold text-primary">94%</p>
                  </div>
                  <div className="rounded-md bg-primary/5 p-2">
                    <p className="text-[8px] text-muted-foreground">Tempo médio</p>
                    <p className="text-lg font-bold text-foreground">2.3m</p>
                  </div>
                  <div className="rounded-md bg-primary/5 p-2">
                    <p className="text-[8px] text-muted-foreground">Satisfação</p>
                    <p className="text-lg font-bold text-foreground">4.8</p>
                  </div>
                </div>
              </div>

              {/* Slide 3 — Chart */}
              <div className="shrink-0 w-[280px] h-[158px] rounded-lg bg-card border border-border/30 p-4 flex flex-col shadow-lg">
                <p className="text-[9px] text-muted-foreground/60 font-mono uppercase tracking-wider mb-2">Evolução Semanal</p>
                <div className="flex-1 flex items-end gap-1.5 px-2">
                  {[40, 55, 48, 72, 65, 80, 90].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/60 to-primary/20" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="flex justify-between mt-1.5 px-1">
                  {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => (
                    <span key={d} className="text-[7px] text-muted-foreground/40">{d}</span>
                  ))}
                </div>
              </div>

              {/* Slide 4 — Insights */}
              <div className="shrink-0 w-[280px] h-[158px] rounded-lg bg-card border border-border/30 p-4 flex flex-col shadow-lg">
                <p className="text-[9px] text-muted-foreground/60 font-mono uppercase tracking-wider mb-3">Recomendações IA</p>
                <div className="space-y-2 flex-1">
                  <div className="flex items-start gap-2">
                    <div className="h-4 w-4 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="h-2.5 w-2.5 text-primary" />
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-tight">Horário de pico: 14h-16h. Considere ativar um segundo agente.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-4 w-4 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <TrendingUp className="h-2.5 w-2.5 text-primary" />
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-tight">Taxa de conversão subiu 12% com follow-up automático.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-4 w-4 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Star className="h-2.5 w-2.5 text-primary" />
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-tight">Clientes elogiaram velocidade de resposta esta semana.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Overlay for non-enterprise */}
            {plan !== "enterprise" && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/80 via-background/30 to-transparent rounded-xl">
                <div className="text-center space-y-2">
                  <p className="text-xs text-foreground font-medium">Gere apresentações visuais profissionais</p>
                  <Button size="sm" className="gap-1.5 text-xs bg-gradient-to-r from-primary to-[hsl(var(--meteora-cyan))] shadow-lg shadow-primary/20">
                    <ArrowRight className="h-3.5 w-3.5" /> Upgrade para Enterprise
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

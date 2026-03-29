import { useEffect, useState, useMemo } from "react";
import { MessageSquare, CheckCircle2, Clock, TrendingUp, Play, Settings, Sparkles, ArrowRight, Zap, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Attendant {
  id: string;
  name: string;
  status: string;
  channels: string[] | null;
  model: string | null;
}

interface Conversation {
  id: string;
  contact_name: string;
  status: string;
  started_at: string;
  channel: string;
}

function HeroKPI({ icon: Icon, label, value, gradient, sub }: { icon: any; label: string; value: string; gradient: string; sub?: string }) {
  return (
    <div className="relative rounded-2xl p-5 flex flex-col gap-1 overflow-hidden transition-all hover:scale-[1.02]" style={{ background: gradient }}>
      <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(ellipse at top right, white 0%, transparent 70%)" }} />
      <div className="flex items-center gap-2 relative">
        <Icon className="w-4 h-4 text-white/70" />
        <span className="text-xs font-medium text-white/70">{label}</span>
      </div>
      <span className="text-3xl font-display font-semibold text-white relative mt-1">{value}</span>
      {sub && <span className="text-[11px] text-white/50 relative">{sub}</span>}
    </div>
  );
}

function MiniChart({ data, color }: { data: any[]; color: string }) {
  return (
    <div className="h-[100px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
          />
          <Area type="monotone" dataKey="count" stroke={color} strokeWidth={2} fill="url(#miniGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [attendant, setAttendant] = useState<Attendant | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("owner_id", user.id).single();
      if (!tenant) { setLoading(false); return; }

      const [attRes, convRes, allConvRes, msgRes] = await Promise.all([
        supabase.from("attendants").select("id, name, status, channels, model").eq("tenant_id", tenant.id).limit(1).single(),
        supabase.from("conversations").select("id, contact_name, status, started_at, channel").eq("tenant_id", tenant.id).order("started_at", { ascending: false }).limit(5),
        supabase.from("conversations").select("id, contact_name, status, started_at, channel").eq("tenant_id", tenant.id),
        supabase.from("messages").select("id", { count: "exact", head: true }),
      ]);

      setAttendant(attRes.data);
      setConversations(convRes.data ?? []);
      setAllConversations(allConvRes.data ?? []);
      setTotalMessages(msgRes.count ?? 0);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const totalConversations = allConversations.length;
  const activeCount = allConversations.filter(c => c.status === "active").length;
  const resolvedCount = allConversations.filter(c => c.status === "resolved").length;
  const resolutionRate = totalConversations ? Math.round(resolvedCount / totalConversations * 100) : 0;

  // Build chart data from conversations by day
  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    allConversations.forEach(c => {
      const day = new Date(c.started_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      days[day] = (days[day] || 0) + 1;
    });
    return Object.entries(days).slice(-7).map(([date, count]) => ({ date, count }));
  }, [allConversations]);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral do seu atendente inteligente</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/attendant/playground")}>
          <Play className="h-3.5 w-3.5" /> Testar atendente
        </Button>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <HeroKPI icon={MessageSquare} label="Conversas" value={String(totalConversations)} gradient="linear-gradient(135deg, hsl(217 91% 55%), hsl(260 67% 55%))" sub={`${totalMessages} mensagens trocadas`} />
        <HeroKPI icon={CheckCircle2} label="Resolvidas" value={String(resolvedCount)} gradient="linear-gradient(135deg, hsl(152 69% 31%), hsl(168 76% 36%))" sub={`${resolutionRate}% taxa de resolução`} />
        <HeroKPI icon={Clock} label="Ativas agora" value={String(activeCount)} gradient="linear-gradient(135deg, hsl(38 92% 50%), hsl(24 95% 53%))" />
        <HeroKPI icon={Zap} label="Mensagens" value={String(totalMessages)} gradient="linear-gradient(135deg, hsl(280 67% 50%), hsl(320 72% 55%))" sub="total processadas" />
      </div>

      {/* Attendant Hero Card */}
      {attendant && (
        <Card className="overflow-hidden border-primary/10">
          <CardContent className="p-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <span className={`absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-card animate-pulse-dot ${attendant.status === "online" ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">{attendant.name}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {attendant.channels?.map((ch) => (
                      <Badge key={ch} variant="outline" className="text-[10px] capitalize font-mono">{ch}</Badge>
                    ))}
                    <span className={`text-xs font-medium ${attendant.status === "online" ? "text-emerald-500" : "text-muted-foreground"}`}>
                      ● {attendant.status === "online" ? "Online" : "Offline"}
                    </span>
                    {attendant.model && (
                      <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{attendant.model.split("/").pop()}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => navigate("/attendant/playground")} className="gap-1.5">
                  <Play className="h-3.5 w-3.5" /> Testar
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate("/attendant/config")} className="gap-1.5">
                  <Settings className="h-3.5 w-3.5" /> Configurar
                </Button>
                <Button size="sm" onClick={() => navigate("/conversations")} className="gap-1.5 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20">
                  <MessageSquare className="h-3.5 w-3.5" /> Ver conversas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Conversas por dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <MiniChart data={chartData} color="hsl(217, 91%, 60%)" />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Últimas Conversas
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/conversations")}>
                Ver todas <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {conversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma conversa ainda</p>
            )}
            {conversations.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-accent/50 cursor-pointer transition-all hover:shadow-sm" onClick={() => navigate(`/conversations/${c.id}`)}>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                    <span className="text-xs font-semibold text-primary">{c.contact_name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.contact_name}</p>
                    <p className="text-[11px] text-muted-foreground capitalize font-mono">{c.channel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === "resolved" ? "secondary" : c.status === "escalated" ? "destructive" : "default"} className="text-[10px]">
                    {c.status === "active" ? "Ativa" : c.status === "resolved" ? "Resolvida" : "Escalada"}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono">{timeAgo(c.started_at)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

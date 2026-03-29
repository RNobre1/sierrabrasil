import { useEffect, useState, useMemo } from "react";
import { MessageSquare, CheckCircle2, Clock, TrendingUp, Play, Settings, Sparkles, ArrowRight, Zap, BarChart3 } from "lucide-react";
import TrialTimer from "@/components/TrialTimer";
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

function KPICard({ icon: Icon, label, value, sub, accentColor }: { icon: any; label: string; value: string; accentColor: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border/30 bg-card/50 p-5 backdrop-blur-sm hover:border-border/60 transition-all group">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}15` }}>
          <Icon className="w-4 h-4" style={{ color: accentColor }} />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <span className="text-3xl font-bold text-foreground tracking-tight">{value}</span>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function MiniChart({ data, color }: { data: any[]; color: string }) {
  return (
    <div className="h-[120px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 15% 14%)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215 15% 50%)" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(222 25% 9%)", border: "1px solid hsl(222 15% 14%)", borderRadius: "12px", fontSize: "12px", color: "hsl(210 40% 95%)" }}
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
    if (mins < 60) return `${mins}min`;
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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visão geral do seu agente inteligente</p>
        </div>
        <Button size="sm" className="gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20" onClick={() => navigate("/attendant/playground")}>
          <Play className="h-3.5 w-3.5" /> Testar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard icon={MessageSquare} label="Conversas" value={String(totalConversations)} accentColor="hsl(225, 80%, 56%)" sub={`${totalMessages} msgs trocadas`} />
        <KPICard icon={CheckCircle2} label="Resolvidas" value={String(resolvedCount)} accentColor="hsl(152, 69%, 40%)" sub={`${resolutionRate}% resolução`} />
        <KPICard icon={Clock} label="Ativas" value={String(activeCount)} accentColor="hsl(38, 92%, 50%)" />
        <KPICard icon={Zap} label="Mensagens" value={String(totalMessages)} accentColor="hsl(280, 67%, 50%)" sub="total processadas" />
      </div>

      {/* Attendant Card */}
      {attendant && (
        <div className="rounded-2xl border border-border/30 bg-card/50 p-6 backdrop-blur-sm surface-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <span className={`absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-card animate-pulse-dot ${attendant.status === "online" ? "bg-meteora-green" : "bg-muted-foreground"}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{attendant.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {attendant.channels?.map((ch) => (
                    <Badge key={ch} variant="outline" className="text-[10px] capitalize font-mono border-border/50">{ch}</Badge>
                  ))}
                  <span className={`text-xs font-medium ${attendant.status === "online" ? "text-meteora-green" : "text-muted-foreground"}`}>
                    ● {attendant.status === "online" ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => navigate("/attendant/playground")} className="gap-1.5 rounded-xl border-border/50">
                <Play className="h-3.5 w-3.5" /> Testar
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/attendant/config")} className="gap-1.5 rounded-xl border-border/50">
                <Settings className="h-3.5 w-3.5" /> Configurar
              </Button>
              <Button size="sm" onClick={() => navigate("/conversations")} className="gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20">
                <MessageSquare className="h-3.5 w-3.5" /> Conversas
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart */}
        <div className="rounded-2xl border border-border/30 bg-card/50 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Conversas por dia</span>
          </div>
          {chartData.length > 0 ? (
            <MiniChart data={chartData} color="hsl(225, 80%, 56%)" />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Sem dados para exibir</p>
          )}
        </div>

        {/* Recent Conversations */}
        <div className="rounded-2xl border border-border/30 bg-card/50 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Últimas Conversas</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => navigate("/conversations")}>
              Ver todas <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {conversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conversa ainda</p>
            )}
            {conversations.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-border/20 p-3 hover:bg-accent/30 cursor-pointer transition-all" onClick={() => navigate(`/conversations/${c.id}`)}>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-border/30">
                    <span className="text-xs font-semibold text-primary">{c.contact_name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.contact_name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize font-mono">{c.channel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === "resolved" ? "secondary" : c.status === "escalated" ? "destructive" : "default"} className="text-[10px]">
                    {c.status === "active" ? "Ativa" : c.status === "resolved" ? "Resolvida" : "Escalada"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">{timeAgo(c.started_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

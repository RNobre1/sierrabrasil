import { useEffect, useState, useMemo } from "react";
import { MessageSquare, CheckCircle2, Clock, TrendingUp, Play, Settings, Sparkles, ArrowRight, Zap, BarChart3, Crown } from "lucide-react";
import TrialTimer from "@/components/TrialTimer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { MeteoraWatermark } from "@/components/MeteoraBrand";

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

function KPICard({ icon: Icon, label, value, sub, color, delay }: { icon: any; label: string; value: string; color: string; sub?: string; delay?: number }) {
  return (
    <div
      className="cosmos-card p-5 card-stagger interactive-hover"
    >
      {/* Icon container with glow */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="h-[38px] w-[38px] rounded-[10px] flex items-center justify-center border"
          style={{
            background: `${color}15`,
            borderColor: `${color}30`,
          }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color }} />
        </div>
        <span className="text-[12.5px] font-medium text-muted-foreground">{label}</span>
      </div>
      <span className="text-[32px] font-display font-light text-foreground tracking-[-0.04em] leading-[1.1]">{value}</span>
      {sub && <p className="text-xs text-muted-foreground mt-1 font-mono">{sub}</p>}
    </div>
  );
}

function MiniChart({ data, color }: { data: any[]; color: string }) {
  return (
    <div className="h-[130px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="cosmosGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(230 16% 13%)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              fontSize: "12px",
              color: "#F0F0F5",
              fontFamily: "DM Sans",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          />
          <Area type="monotone" dataKey="count" stroke={color} strokeWidth={2} fill="url(#cosmosGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const avatarColors = [
  "linear-gradient(135deg, #6366F1, #818CF8)",
  "linear-gradient(135deg, #10B981, #34D399)",
  "linear-gradient(135deg, #F59E0B, #FBBF24)",
  "linear-gradient(135deg, #F43F5E, #FB7185)",
  "linear-gradient(135deg, #06B6D4, #22D3EE)",
  "linear-gradient(135deg, #8B5CF6, #A78BFA)",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [attendant, setAttendant] = useState<Attendant | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [tenantCreatedAt, setTenantCreatedAt] = useState("");
  const [tenantPlan, setTenantPlan] = useState("starter");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: tenant } = await supabase.from("tenants").select("id, created_at, plan").eq("owner_id", user.id).single();
      if (!tenant) { setLoading(false); return; }
      setTenantCreatedAt(tenant.created_at);
      setTenantPlan(tenant.plan || "starter");
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cosmos-indigo border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enterprise VIP Banner */}
      {tenantPlan === "enterprise" && (
        <div
          className="rounded-[14px] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1a1040 0%, #0f172a 100%)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
          }}
        >
          {/* Decorative glow */}
          <div className="absolute -top-[30px] -right-[30px] w-[150px] h-[150px] rounded-full" style={{ background: "radial-gradient(circle, rgba(99, 102, 241, 0.2), transparent 70%)" }} />
          <div
            className="h-[42px] w-[42px] shrink-0 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6, #A78BFA)", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.4)" }}
          >
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0 relative z-10">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-display font-semibold text-foreground">Enterprise</h2>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em]"
                style={{
                  background: "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(234, 88, 12, 0.2))",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#FCD34D",
                }}
              >
                ✦ VIP
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Manager dedicado · Relatórios ilimitados · Até 100 agentes</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 text-xs gap-1.5 border-cosmos-indigo/30 text-cosmos-indigo hover:bg-cosmos-indigo/10 w-full sm:w-auto rounded-[10px]"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Falar com Manager
          </Button>
        </div>
      )}

      {/* Trial Timer */}
      {tenantCreatedAt && tenantPlan !== "enterprise" && <TrialTimer createdAt={tenantCreatedAt} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-[-0.025em]">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visão geral do seu agente inteligente</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard icon={MessageSquare} label="Conversas" value={String(totalConversations)} color="#6366F1" sub={`${totalMessages} msgs trocadas`} />
        <KPICard icon={CheckCircle2} label="Resolvidas" value={String(resolvedCount)} color="#10B981" sub={`${resolutionRate}% resolução`} />
        <KPICard icon={Clock} label="Ativas" value={String(activeCount)} color="#F59E0B" />
        <KPICard icon={Zap} label="Mensagens" value={String(totalMessages)} color="#8B5CF6" sub="total processadas" />
      </div>

      {/* Attendant Card */}
      {attendant && (
        <div className="cosmos-card p-6 surface-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  className="h-12 w-12 rounded-[14px] flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6, #A78BFA)", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.4)" }}
                >
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <span
                  className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card ${attendant.status === "online" ? "bg-cosmos-emerald animate-pulse-glow" : "bg-muted-foreground"}`}
                />
              </div>
              <div>
                <h2 className="text-lg font-display font-semibold text-foreground">{attendant.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {attendant.channels?.map((ch) => (
                    <span
                      key={ch}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold capitalize bg-white/[0.05] border border-white/[0.06] text-muted-foreground"
                    >
                      {ch}
                    </span>
                  ))}
                  <span className={`text-xs font-medium ${attendant.status === "online" ? "text-cosmos-emerald" : "text-muted-foreground"}`}>
                    ● {attendant.status === "online" ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => navigate("/attendant/playground")} className="gap-1.5 rounded-[10px] border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.12]">
                <Play className="h-3.5 w-3.5" /> Testar
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/attendant/config")} className="gap-1.5 rounded-[10px] border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.12]">
                <Settings className="h-3.5 w-3.5" /> Configurar
              </Button>
              <button
                onClick={() => navigate("/conversations")}
                className="inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 relative overflow-hidden group"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6, #A78BFA)", boxShadow: "0 2px 8px rgba(99, 102, 241, 0.4)" }}
              >
                <MessageSquare className="h-3.5 w-3.5" /> Conversas
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart */}
        <div className="cosmos-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
              <BarChart3 className="h-4 w-4 text-cosmos-indigo" />
            </div>
            <span className="text-sm font-display font-semibold text-foreground">Conversas por dia</span>
          </div>
          {chartData.length > 0 ? (
            <MiniChart data={chartData} color="#6366F1" />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Sem dados para exibir</p>
          )}
        </div>

        {/* Recent Conversations */}
        <div className="cosmos-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.2)" }}>
                <MessageSquare className="h-4 w-4 text-cosmos-cyan" />
              </div>
              <span className="text-sm font-display font-semibold text-foreground">Últimas Conversas</span>
            </div>
            <button
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              onClick={() => navigate("/conversations")}
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {conversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conversa ainda</p>
            )}
            {conversations.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-[10px] p-3 cursor-pointer transition-all duration-150 border border-transparent hover:bg-white/[0.03] hover:border-white/[0.06]"
                onClick={() => navigate(`/conversations/${c.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-[10px] flex items-center justify-center text-white font-display font-semibold text-[13px] shrink-0"
                    style={{ background: avatarColors[i % avatarColors.length] }}
                  >
                    {c.contact_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.contact_name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize font-mono">{c.channel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.status === "active" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#34D399", border: "1px solid rgba(16, 185, 129, 0.2)", boxShadow: "0 0 8px rgba(16, 185, 129, 0.1)" }}>
                      Ativa
                    </span>
                  )}
                  {c.status === "resolved" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-white/[0.06] text-muted-foreground border border-white/[0.06]">
                      Resolvida
                    </span>
                  )}
                  {c.status === "escalated" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#F87171", border: "1px solid rgba(239, 68, 68, 0.2)", boxShadow: "0 0 8px rgba(239, 68, 68, 0.1)" }}>
                      Escalada
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground font-mono">{timeAgo(c.started_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <MeteoraWatermark />
    </div>
  );
}

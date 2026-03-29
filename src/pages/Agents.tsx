import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Plus, Play, Settings, Shield, Headphones, Lock, TrendingUp, Zap, BookOpen, Brain, ChevronRight, Wifi, WifiOff } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

interface Attendant {
  id: string;
  name: string;
  status: string;
  channels: string[] | null;
  model: string | null;
  persona: string | null;
  class: string | null;
}

const classConfig: Record<string, { label: string; shortLabel: string; icon: React.ReactNode; dotColor: string; textColor: string }> = {
  support: { label: "Atendimento / Suporte", shortLabel: "Suporte", icon: <Headphones className="h-3.5 w-3.5" />, dotColor: "bg-blue-500", textColor: "text-blue-400" },
  sales: { label: "Vendas / Acompanhamento", shortLabel: "Vendas", icon: <TrendingUp className="h-3.5 w-3.5" />, dotColor: "bg-emerald-500", textColor: "text-emerald-400" },
};

export default function Agents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agents, setAgents] = useState<Attendant[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantPlan, setTenantPlan] = useState("starter");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: tenant } = await supabase.from("tenants").select("id, plan").eq("owner_id", user.id).single();
      if (!tenant) { setLoading(false); return; }
      setTenantPlan(tenant.plan);
      const { data } = await supabase.from("attendants").select("id, name, status, channels, model, persona, class").eq("tenant_id", tenant.id);
      setAgents((data as any) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const maxAgents = tenantPlan === "starter" ? 1 : tenantPlan === "professional" ? 3 : tenantPlan === "enterprise" ? 100 : 10;
  const canCreateMore = agents.length < maxAgents;
  const onlineCount = agents.filter(a => a.status === "online").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const renderAgentCard = (agent: Attendant, i: number) => {
    const cls = classConfig[agent.class || "support"] || classConfig.support;
    const isSupport = (agent.class || "support") === "support";
    const modelShort = agent.model ? agent.model.split("/").pop()?.replace("-preview", "") : "default";

    return (
      <motion.div
        key={agent.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
        className="group relative rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer overflow-hidden"
        onClick={() => navigate(`/agents/detail?id=${agent.id}`)}
      >
        {/* Top accent line */}
        <div className={`h-0.5 w-full ${isSupport ? "bg-gradient-to-r from-blue-500/50 to-transparent" : "bg-gradient-to-r from-emerald-500/50 to-transparent"}`} />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${agent.status === "online" ? "bg-emerald-400 animate-pulse-dot" : "bg-muted-foreground/40"}`} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">{agent.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${cls.dotColor}`} />
                  <span className={`text-[10px] ${cls.textColor}`}>{cls.shortLabel}</span>
                  <span className="text-[10px] text-muted-foreground/40">·</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{modelShort}</span>
                </div>
              </div>
            </div>
            <Badge
              variant={agent.status === "online" ? "default" : "secondary"}
              className={`text-[9px] h-5 ${agent.status === "online" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : ""}`}
            >
              {agent.status === "online" ? "Online" : "Offline"}
            </Badge>
          </div>

          {/* Channels */}
          <div className="flex items-center gap-1.5 mb-4">
            {agent.channels?.map(ch => (
              <Badge key={ch} variant="outline" className="text-[9px] capitalize font-mono border-border/30 bg-muted/30 h-5">{ch}</Badge>
            ))}
            {(!agent.channels || agent.channels.length === 0) && (
              <span className="text-[10px] text-muted-foreground/50">Nenhum canal configurado</span>
            )}
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-lg bg-muted/20 px-2.5 py-1.5 text-center">
              <Zap className="h-3 w-3 text-primary mx-auto mb-0.5" />
              <p className="text-[9px] text-muted-foreground">Skills</p>
            </div>
            <div className="rounded-lg bg-muted/20 px-2.5 py-1.5 text-center">
              <BookOpen className="h-3 w-3 text-primary mx-auto mb-0.5" />
              <p className="text-[9px] text-muted-foreground">KB</p>
            </div>
            <div className="rounded-lg bg-muted/20 px-2.5 py-1.5 text-center">
              <Brain className="h-3 w-3 text-primary mx-auto mb-0.5" />
              <p className="text-[9px] text-muted-foreground">Memória</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border/20">
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground px-2"
                onClick={(e) => { e.stopPropagation(); navigate("/attendant/playground"); }}
              >
                <Play className="h-3 w-3" /> Testar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground px-2"
                onClick={(e) => { e.stopPropagation(); navigate(`/agents/detail?id=${agent.id}`); }}
              >
                <Settings className="h-3 w-3" /> Configurar
              </Button>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Seus Agentes</h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
            <span>{agents.length}/{maxAgents} agentes</span>
            <span className="text-muted-foreground/30">|</span>
            <span className="flex items-center gap-1"><Wifi className="h-3 w-3 text-emerald-400" /> {onlineCount} online</span>
            <span className="flex items-center gap-1"><WifiOff className="h-3 w-3 text-muted-foreground/50" /> {agents.length - onlineCount} offline</span>
          </p>
        </div>
        {canCreateMore ? (
          <Button
            onClick={() => navigate("/onboarding?newAgent=true")}
            className="gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" /> Novo Agente
          </Button>
        ) : (
          <Button
            variant="outline"
            className="gap-2 rounded-xl border-[hsl(var(--meteora-cyan))]/30 text-[hsl(var(--meteora-cyan))] hover:bg-[hsl(var(--meteora-cyan))]/5"
            onClick={() => navigate("/integrations")}
          >
            <Zap className="h-4 w-4" /> Fazer Upgrade
          </Button>
        )}
      </div>

      {!canCreateMore && (
        <div className="rounded-xl border border-[hsl(var(--meteora-cyan))]/15 bg-[hsl(var(--meteora-cyan))]/5 p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-[hsl(var(--meteora-cyan))] shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Limite de agentes atingido</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Faça upgrade para criar mais agentes e desbloquear superpoderes.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4 overflow-x-auto">
        <TabsList className="bg-muted/30 border border-border/30 h-9 w-full sm:w-auto flex-nowrap overflow-x-auto">
          <TabsTrigger value="all" className="text-[11px] gap-1.5 data-[state=active]:bg-background">
            <Bot className="h-3.5 w-3.5" /> Todos <Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-1">{agents.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="support" className="text-[11px] gap-1.5 data-[state=active]:bg-background">
            <Headphones className="h-3.5 w-3.5" /> Suporte
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-1">{agents.filter(a => (a.class || "support") === "support").length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sales" className="text-[11px] gap-1.5 data-[state=active]:bg-background">
            <TrendingUp className="h-3.5 w-3.5" /> Vendas
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-1">{agents.filter(a => a.class === "sales").length}</Badge>
          </TabsTrigger>
        </TabsList>

        {["all", "support", "sales"].map(tab => {
          const filtered = tab === "all" ? agents : agents.filter(a => (a.class || "support") === tab);
          return (
            <TabsContent key={tab} value={tab}>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((agent, i) => renderAgentCard(agent, i))}
                {filtered.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <Bot className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhum agente nesta categoria</p>
                  </div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

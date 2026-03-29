import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Plus, Play, Settings, Sparkles, Shield, Headphones, Lock, TrendingUp } from "lucide-react";
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

const classLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  support: { label: "Atendimento / Suporte", icon: <Headphones className="h-3.5 w-3.5" />, color: "text-blue-400" },
  sales: { label: "Vendas / Acompanhamento", icon: <Sparkles className="h-3.5 w-3.5" />, color: "text-emerald-400" },
};

export default function Agents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agents, setAgents] = useState<Attendant[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantPlan, setTenantPlan] = useState("starter");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: tenant } = await supabase.from("tenants").select("id, plan").eq("owner_id", user.id).single();
      if (!tenant) { setLoading(false); return; }
      setTenantPlan(tenant.plan);
      const { data } = await supabase.from("attendants").select("id, name, status, channels, model, persona, class").eq("tenant_id", tenant.id);
      setAgents((data as any) ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const maxAgents = tenantPlan === "starter" ? 1 : tenantPlan === "professional" ? 3 : 10;
  const canCreateMore = agents.length < maxAgents;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Seus Agentes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {agents.length} de {maxAgents} {maxAgents === 1 ? "agente" : "agentes"}
          </p>
        </div>
        {canCreateMore ? (
          <Button
            onClick={() => navigate("/onboarding?newAgent=true")}
            className="gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" /> Criar Novo Agente
          </Button>
        ) : (
          <Button
            variant="outline"
            className="gap-2 rounded-xl border-meteora-warning/30 text-meteora-warning hover:bg-meteora-warning/10"
            onClick={() => {/* TODO: navigate to upgrade */}}
          >
            <Lock className="h-4 w-4" /> Fazer Upgrade
          </Button>
        )}
      </div>

      {!canCreateMore && (
        <div className="rounded-xl border border-meteora-warning/20 bg-meteora-warning/5 p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-meteora-warning shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Limite de agentes atingido</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Faça upgrade para criar mais agentes e desbloquear recursos avançados.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-muted/50 border border-border/30">
          <TabsTrigger value="all" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Bot className="h-3.5 w-3.5" /> Todos
          </TabsTrigger>
          <TabsTrigger value="support" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Headphones className="h-3.5 w-3.5" /> Atendimento
          </TabsTrigger>
          <TabsTrigger value="sales" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <TrendingUp className="h-3.5 w-3.5" /> Vendas
          </TabsTrigger>
        </TabsList>

        {["all", "support", "sales"].map(tab => {
          const filtered = tab === "all" ? agents : agents.filter(a => (a.class || "support") === tab);
          return (
            <TabsContent key={tab} value={tab}>
              <div className="grid gap-4 sm:grid-cols-2">
                {filtered.map((agent, i) => {
                  const cls = classLabels[agent.class || "support"] || classLabels.support;
                  const isSupport = (agent.class || "support") === "support";
                  return (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="group rounded-2xl border border-border/30 bg-card/50 p-5 backdrop-blur-sm hover:border-border/60 transition-all cursor-pointer surface-glow"
                      onClick={() => navigate(`/attendant/config?id=${agent.id}`)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                              <Bot className="h-5 w-5 text-primary" />
                            </div>
                            <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card ${agent.status === "online" ? "bg-meteora-green animate-pulse-dot" : "bg-muted-foreground/50"}`} />
                            {/* Class indicator dot */}
                            <span
                              className={`absolute -left-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-card flex items-center justify-center ${isSupport ? "bg-blue-500" : "bg-emerald-500"}`}
                              title={cls.label}
                            >
                              {isSupport
                                ? <Headphones className="h-1.5 w-1.5 text-white" />
                                : <TrendingUp className="h-1.5 w-1.5 text-white" />
                              }
                            </span>
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-foreground">{agent.name}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={cls.color}>{cls.icon}</span>
                              <span className="text-[11px] text-muted-foreground">{cls.label}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant={agent.status === "online" ? "default" : "secondary"} className="text-[10px]">
                          {agent.status === "online" ? "● Online" : "○ Offline"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {agent.channels?.map((ch) => (
                          <Badge key={ch} variant="outline" className="text-[10px] capitalize font-mono border-border/40">{ch}</Badge>
                        ))}
                      </div>

                      <div className="flex gap-2 mt-4 pt-3 border-t border-border/20">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); navigate("/attendant/playground"); }}
                        >
                          <Play className="h-3 w-3" /> Testar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); navigate(`/attendant/config?id=${agent.id}`); }}
                        >
                          <Settings className="h-3 w-3" /> Configurar
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="col-span-2 text-center py-12">
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

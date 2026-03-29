import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bot, Power, PowerOff, Settings, Play, Zap, BookOpen, Brain, Sparkles, Headphones, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AgentSkillsTab from "@/components/agents/AgentSkillsTab";
import AgentKnowledgeTab from "@/components/agents/AgentKnowledgeTab";
import AgentMemoryTab from "@/components/agents/AgentMemoryTab";
import AgentConfigTab from "@/components/agents/AgentConfigTab";

const classLabels: Record<string, { label: string; color: string }> = {
  support: { label: "Atendimento / Suporte", color: "text-blue-400" },
  sales: { label: "Vendas / Acompanhamento", color: "text-emerald-400" },
};

export default function AgentDetail() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const agentId = searchParams.get("id");
  const [agent, setAgent] = useState<any>(null);
  const [tenantPlan, setTenantPlan] = useState("starter");
  const [tenantId, setTenantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("config");

  useEffect(() => {
    if (!user || !agentId) return;
    const load = async () => {
      const { data: tenant } = await supabase.from("tenants").select("id, plan").eq("owner_id", user.id).single();
      if (!tenant) { setLoading(false); return; }
      setTenantPlan(tenant.plan);
      setTenantId(tenant.id);
      const { data } = await supabase.from("attendants").select("*").eq("id", agentId).single();
      if (data) setAgent(data);
      setLoading(false);
    };
    load();
  }, [user, agentId]);

  const toggleStatus = async () => {
    if (!agent) return;
    const newStatus = agent.status === "online" ? "offline" : "online";
    await supabase.from("attendants").update({ status: newStatus }).eq("id", agent.id);
    setAgent({ ...agent, status: newStatus });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Agente não encontrado</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/agents")}>Voltar</Button>
      </div>
    );
  }

  const cls = classLabels[agent.class || "support"] || classLabels.support;
  const isSupport = (agent.class || "support") === "support";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/agents")} className="shrink-0 h-8 w-8 sm:h-9 sm:w-9">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 border-card ${agent.status === "online" ? "bg-meteora-green animate-pulse-dot" : "bg-muted-foreground/50"}`} />
              <span className={`absolute -left-0.5 -bottom-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 border-card flex items-center justify-center ${isSupport ? "bg-blue-500" : "bg-emerald-500"}`}>
                {isSupport ? <Headphones className="h-1.5 w-1.5 sm:h-2 sm:w-2 text-white" /> : <TrendingUp className="h-1.5 w-1.5 sm:h-2 sm:w-2 text-white" />}
              </span>
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">{agent.name}</h1>
              <p className={`text-[10px] sm:text-xs ${cls.color} mt-0.5`}>{cls.label}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-11 sm:pl-0">
          <Button variant="ghost" size="sm" className="gap-1.5 text-[10px] sm:text-xs h-8" onClick={() => navigate("/attendant/playground")}>
            <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Testar
          </Button>
          <Button
            variant={agent.status === "online" ? "destructive" : "default"}
            size="sm"
            className="gap-1.5 text-[10px] sm:text-xs h-8"
            onClick={toggleStatus}
          >
            {agent.status === "online" ? <><PowerOff className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Pausar</> : <><Power className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Ativar</>}
          </Button>
          <Badge variant={agent.status === "online" ? "default" : "secondary"} className="text-[9px] sm:text-[10px] hidden sm:inline-flex">
            {agent.status === "online" ? "● Online" : "○ Offline"}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 border border-border/30 h-10">
          <TabsTrigger value="config" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Settings className="h-3.5 w-3.5" /> Configuração
          </TabsTrigger>
          <TabsTrigger value="skills" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Zap className="h-3.5 w-3.5" /> Superpoderes
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <BookOpen className="h-3.5 w-3.5" /> Base de Conhecimento
          </TabsTrigger>
          <TabsTrigger value="memory" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Brain className="h-3.5 w-3.5" /> Memória
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <AgentConfigTab agent={agent} onUpdate={(updated) => setAgent({ ...agent, ...updated })} />
        </TabsContent>
        <TabsContent value="skills">
          <AgentSkillsTab agentId={agent.id} agentClass={agent.class || "support"} plan={tenantPlan} />
        </TabsContent>
        <TabsContent value="knowledge">
          <AgentKnowledgeTab agentId={agent.id} tenantId={tenantId} plan={tenantPlan} />
        </TabsContent>
        <TabsContent value="memory">
          <AgentMemoryTab agentId={agent.id} plan={tenantPlan} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Power, PowerOff, Settings, Play, Zap, BookOpen, Brain, Sparkles, Headphones, TrendingUp, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonatedTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AgentSkillsTab from "@/components/agents/AgentSkillsTab";
import AgentKnowledgeTab from "@/components/agents/AgentKnowledgeTab";
import AgentMemoryTab from "@/components/agents/AgentMemoryTab";
import AgentConfigTab from "@/components/agents/AgentConfigTab";
import AgentIconPicker from "@/components/agents/AgentIconPicker";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import GuidedTour from "@/components/GuidedTour";
import { AGENT_DETAIL_STEPS, AGENT_DETAIL_TOUR_KEY } from "@/lib/tour-steps";

const classLabels: Record<string, { label: string; color: string }> = {
  support: { label: "Atendimento / Suporte", color: "text-blue-400" },
  sales: { label: "Vendas / Acompanhamento", color: "text-emerald-400" },
};

export default function AgentDetail() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const impersonatedTenant = useImpersonatedTenant();
  const [searchParams] = useSearchParams();
  const agentId = searchParams.get("id");
  const [agent, setAgent] = useState<any>(null);
  const [tenantPlan, setTenantPlan] = useState("starter");
  const [tenantId, setTenantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("config");
  const [knowledgeBase, setKnowledgeBase] = useState<any[]>([]);
  const [kbLoading, setKbLoading] = useState(true);
  const [agentCount, setAgentCount] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const loadKnowledgeBase = useCallback(async () => {
    if (!agentId) return;
    const { data: kbData } = await supabase
      .from("knowledge_base")
      .select("id, source_type, source_name, source_url, content, created_at")
      .eq("attendant_id", agentId)
      .eq("is_archived", false);
    if (kbData) {
      setKnowledgeBase(kbData);
    }
    setKbLoading(false);
  }, [agentId]);

  useEffect(() => {
    if (!user || !agentId) return;
    const load = async () => {
      const tenantQuery = impersonatedTenant
        ? supabase.from("tenants").select("id, plan").eq("id", impersonatedTenant).single()
        : supabase.from("tenants").select("id, plan").eq("owner_id", user.id).single();
      const { data: tenant } = await tenantQuery;
      if (!tenant) { setLoading(false); return; }
      setTenantPlan(tenant.plan);
      setTenantId(tenant.id);
      const { data } = await supabase.from("attendants").select("*").eq("id", agentId).single();
      if (data) setAgent(data);

      const { count } = await supabase
        .from("attendants")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id);
      setAgentCount(count ?? 0);

      await loadKnowledgeBase();

      setLoading(false);
    };
    load();
  }, [user, agentId, loadKnowledgeBase, impersonatedTenant]);

  // Poll knowledge base every 30s as a fallback for stale data
  useEffect(() => {
    if (!agentId) return;
    const interval = setInterval(loadKnowledgeBase, 30000);
    return () => clearInterval(interval);
  }, [agentId, loadKnowledgeBase]);

  const toggleStatus = async () => {
    if (!agent) return;
    const newStatus = agent.status === "online" ? "offline" : "online";
    await supabase.from("attendants").update({ status: newStatus }).eq("id", agent.id);
    setAgent({ ...agent, status: newStatus });
  };

  const handleIconChange = async (iconId: string) => {
    if (!agent) return;
    await supabase.from("attendants").update({ icon: iconId }).eq("id", agent.id);
    setAgent({ ...agent, icon: iconId });
  };

  const isLastAgent = agentCount <= 1;

  const handleDeleteAgent = async () => {
    if (!agent || isLastAgent) return;
    setDeleting(true);
    try {
      // Unlink whatsapp instances tied to this agent
      await supabase
        .from("whatsapp_instances")
        .update({ attendant_id: null })
        .eq("attendant_id", agent.id);

      // Delete the agent (CASCADE handles conversations, messages, knowledge_base, agent_faqs, agent_leads)
      const { error } = await supabase
        .from("attendants")
        .delete()
        .eq("id", agent.id);

      if (error) throw error;

      toast.success("Agente excluído com sucesso.");
      navigate("/agents");
    } catch (err: any) {
      console.error("Erro ao excluir agente:", err);
      toast.error("Erro ao excluir agente. Tente novamente.");
    } finally {
      setDeleting(false);
    }
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

  const groupedSources = Object.values(
    knowledgeBase.reduce((acc, curr) => {
      const name = curr.source_name || "Desconhecido";
      if (!acc[name]) {
        acc[name] = { ...curr, source_name: name, chunks: 0 };
      }
      acc[name].chunks += 1;
      // Mantém a data do chunk mais recente
      if (new Date(curr.created_at) > new Date(acc[name].created_at)) {
        acc[name].created_at = curr.created_at;
      }
      return acc;
    }, {} as Record<string, any>)
  ).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
              <AgentIconPicker
                value={agent.icon || "bot"}
                onChange={handleIconChange}
                size="lg"
              />
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
            data-tour="agent-detail-status"
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

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] xl:grid-cols-[1fr_400px] gap-6 items-start">
        {/* Esquerda: Conteúdo existente */}
        <div className="min-w-0">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50 border border-border/30 h-9 sm:h-10 w-full sm:w-auto flex-nowrap overflow-x-auto" data-tour="agent-detail-tabs">
          <TabsTrigger value="config" className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 data-[state=active]:bg-background px-2 sm:px-3">
            <Settings className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden xs:inline">Configuração</span><span className="xs:hidden">Config</span>
          </TabsTrigger>
          <TabsTrigger value="skills" className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 data-[state=active]:bg-background px-2 sm:px-3">
            <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Superpoderes</span><span className="sm:hidden">Skills</span>
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 data-[state=active]:bg-background px-2 sm:px-3">
            <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Conhecimento</span><span className="sm:hidden">KB</span>
          </TabsTrigger>
          <TabsTrigger value="memory" className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 data-[state=active]:bg-background px-2 sm:px-3">
            <Brain className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Memória
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <AgentConfigTab agent={agent} onUpdate={(updated) => setAgent({ ...agent, ...updated })} />
        </TabsContent>
        <TabsContent value="skills">
          <AgentSkillsTab agentId={agent.id} agentClass={agent.class || "support"} plan={tenantPlan} tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="knowledge">
          <AgentKnowledgeTab agentId={agent.id} tenantId={tenantId} plan={tenantPlan} onRefresh={loadKnowledgeBase} />
        </TabsContent>
        <TabsContent value="memory">
            <AgentMemoryTab agentId={agent.id} plan={tenantPlan} />
          </TabsContent>
        </Tabs>
        </div>

        {/* Direita: Painel Base de Conhecimento */}
        <div className="hidden lg:block">
          <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm relative overflow-hidden flex flex-col max-h-[calc(100vh-200px)] h-full" data-tour="agent-detail-kb">
            <CardHeader className="border-b border-border/10 pb-4 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Base de Conhecimento
                </CardTitle>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">{groupedSources.length} {groupedSources.length === 1 ? "doc" : "docs"}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-[calc(100vh-270px)] px-4 py-4">
                {kbLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : groupedSources.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <p className="text-sm text-muted-foreground">Nenhuma fonte adicionada ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {groupedSources.map((kb: any) => (
                      <div key={kb.id || kb.source_name} className="p-3 rounded-lg border border-border/50 bg-background/50 flex flex-col gap-2 relative group hover:border-border/80 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-[9px] font-medium border-0 px-1.5 py-0 rounded uppercase tracking-wider ${
                              kb.source_type === 'document' ? 'bg-cosmos-indigo/10 text-cosmos-indigo' :
                              kb.source_type === 'website' ? 'bg-cosmos-cyan/10 text-cosmos-cyan' :
                              kb.source_type === 'social' ? 'bg-cosmos-violet/10 text-cosmos-violet' :
                              kb.source_type === 'manual' ? 'bg-cosmos-emerald/10 text-cosmos-emerald' : 
                              'bg-muted text-muted-foreground'
                            }`}
                          >
                            {kb.source_type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(kb.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        <div>
                          {kb.source_url ? (
                            <a href={kb.source_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-foreground hover:text-primary hover:underline line-clamp-2">
                              {kb.source_name}
                            </a>
                          ) : (
                            <p className="text-xs font-medium text-foreground line-clamp-2">{kb.source_name}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {kb.chunks} chunk{kb.chunks !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive/20 bg-destructive/[0.02] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Zona de perigo
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-foreground font-medium">Excluir este agente</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Essa ação é irreversível e removerá todos os dados associados.
            </p>
          </div>

          {isLastAgent ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="inline-flex">
                    <Button variant="destructive" size="sm" className="gap-1.5 text-xs" disabled>
                      <Trash2 className="h-3.5 w-3.5" /> Excluir agente
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você precisa ter pelo menos um agente.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5 text-xs">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir agente
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">
                    Excluir agente permanentemente
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>Ao excluir este agente, você perderá permanentemente:</p>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        <li>Todas as conversas e mensagens deste agente</li>
                        <li>A base de conhecimento (documentos, redes sociais)</li>
                        <li>As configurações, instruções e personalidade</li>
                        <li>O número de WhatsApp vinculado será desconectado</li>
                        <li>Os leads capturados por este agente</li>
                        <li>As perguntas frequentes (FAQ) configuradas</li>
                      </ul>
                      <p className="font-medium text-foreground">Esta ação não pode ser desfeita.</p>
                      <p className="text-xs text-muted-foreground/80">
                        Você pode criar um novo agente a qualquer momento clicando em "Novo Agente" na página de Agentes.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAgent}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Excluindo...
                      </>
                    ) : (
                      "Excluir permanentemente"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

      <GuidedTour steps={AGENT_DETAIL_STEPS} tourKey={AGENT_DETAIL_TOUR_KEY} />
    </div>
  );
}

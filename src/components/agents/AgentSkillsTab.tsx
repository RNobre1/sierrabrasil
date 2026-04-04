import { useState, useEffect } from "react";
import { Zap, Lock, Info, Check, ShoppingCart, Crown, MessageSquare, Calendar, FileText, Globe, BarChart3, Users, Mail, Bell, Shield, Sparkles, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuditLog } from "@/hooks/use-audit";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import AgentFaqManager from "./AgentFaqManager";
import AgentLeadsPanel from "./AgentLeadsPanel";

interface Skill {
  id: string;
  name: string;
  description: string;
  detail: string;
  icon: React.ReactNode;
  category: "core" | "advanced" | "premium";
  includedIn: string[]; // plans that include it
  addonPrice?: string;
  comingSoon?: boolean;
}

const SKILLS: Skill[] = [
  // Core — included in all plans
  { id: "auto-reply", name: "Resposta Automática", description: "Responde perguntas automaticamente via IA", detail: "O agente utiliza inteligência artificial para entender a pergunta do cliente e gerar uma resposta contextualizada, usando sua base de conhecimento e instruções configuradas.", icon: <MessageSquare className="h-4 w-4" />, category: "core", includedIn: ["starter", "professional", "business", "enterprise"] },
  { id: "faq", name: "FAQ Inteligente", description: "Respostas instantâneas para perguntas frequentes", detail: "Identifica automaticamente perguntas recorrentes e responde instantaneamente sem precisar processar via IA generativa, economizando tokens e tempo de resposta.", icon: <FileText className="h-4 w-4" />, category: "core", includedIn: ["starter", "professional", "business", "enterprise"] },
  { id: "escalation", name: "Escalonamento Humano", description: "Transfere para atendente quando necessário", detail: "Detecta quando o cliente precisa de ajuda humana (frustração, pedido explícito, assunto fora do escopo) e transfere automaticamente para um atendente real, notificando via WhatsApp.", icon: <Users className="h-4 w-4" />, category: "core", includedIn: ["starter", "professional", "business", "enterprise"] },
  { id: "greeting", name: "Saudação Personalizada", description: "Mensagem de boas-vindas customizada", detail: "Envia uma saudação personalizada quando o cliente inicia uma conversa, usando o nome dele e adaptando o tom conforme horário e contexto.", icon: <Sparkles className="h-4 w-4" />, category: "core", includedIn: ["starter", "professional", "business", "enterprise"] },

  // Advanced — Professional+
  { id: "lead-capture", name: "Captura de Leads", description: "Coleta dados do cliente automaticamente", detail: "Durante a conversa, o agente identifica oportunidades para coletar nome, email, telefone e interesse do cliente, salvando tudo estruturado no CRM.", icon: <Users className="h-4 w-4" />, category: "advanced", includedIn: ["professional", "business", "enterprise"], addonPrice: "R$47/mês" },
  { id: "scheduling", name: "Agendamento Inteligente", description: "Agenda reuniões e compromissos pelo chat", detail: "Integra com Google Calendar e permite que o agente sugira horários disponíveis, confirme agendamentos e envie lembretes automáticos.", icon: <Calendar className="h-4 w-4" />, category: "advanced", includedIn: ["professional", "business", "enterprise"], addonPrice: "R$67/mês", comingSoon: true },
  { id: "sentiment", name: "Análise de Sentimento", description: "Detecta emoções e adapta respostas", detail: "Analisa o tom da mensagem do cliente em tempo real (feliz, frustrado, urgente) e ajusta automaticamente o tom e prioridade da resposta.", icon: <BarChart3 className="h-4 w-4" />, category: "advanced", includedIn: ["professional", "business", "enterprise"], addonPrice: "R$37/mês" },
  { id: "follow-up", name: "Follow-up Automático", description: "Reengaja clientes após inatividade", detail: "Envia mensagens de acompanhamento inteligentes para clientes que não responderam, lembretes de carrinho abandonado e check-ins pós-venda.", icon: <Bell className="h-4 w-4" />, category: "advanced", includedIn: ["professional", "business", "enterprise"], addonPrice: "R$57/mês" },

  // Premium — Business/Enterprise
  { id: "multi-language", name: "Multilíngue", description: "Atende em português, inglês, espanhol e mais", detail: "Detecta automaticamente o idioma do cliente e responde no mesmo idioma, com tradução em tempo real de toda a base de conhecimento.", icon: <Globe className="h-4 w-4" />, category: "premium", includedIn: ["business", "enterprise"], addonPrice: "R$97/mês" },
  { id: "email-integration", name: "Integração com Email", description: "Envia emails transacionais e follow-ups", detail: "O agente pode enviar emails formatados profissionalmente — confirmações, propostas, resumos de conversa — tudo integrado ao fluxo do chat.", icon: <Mail className="h-4 w-4" />, category: "premium", includedIn: ["business", "enterprise"], addonPrice: "R$77/mês", comingSoon: true },
  { id: "advanced-analytics", name: "Analytics Avançado", description: "Relatórios detalhados de performance", detail: "Painel com métricas granulares: tempo de resposta por skill, taxa de resolução por tipo de pergunta, heatmap de horários e funil de conversão completo.", icon: <BarChart3 className="h-4 w-4" />, category: "premium", includedIn: ["business", "enterprise"], addonPrice: "R$87/mês", comingSoon: true },
  { id: "custom-actions", name: "Ações Customizadas", description: "Webhooks e integrações via API", detail: "Crie ações personalizadas que o agente pode executar durante a conversa: consultar estoque, verificar status de pedido, criar ticket no seu sistema.", icon: <Zap className="h-4 w-4" />, category: "premium", includedIn: ["enterprise"], addonPrice: "R$147/mês", comingSoon: true },
];

const categoryLabels = {
  core: { label: "Habilidades Base", color: "text-primary" },
  advanced: { label: "Avançado", color: "text-[hsl(var(--meteora-cyan))]" },
  premium: { label: "Premium", color: "text-amber-400" },
};

interface Props {
  agentId: string;
  agentClass: string;
  plan: string;
  tenantId?: string;
}

// Skill tier mapping: which tier each skill category requires
const CATEGORY_TO_TIER: Record<string, string> = {
  core: "base",
  advanced: "avancado",
  premium: "premium",
};

// Tier hierarchy: higher index = higher tier
const TIER_HIERARCHY = ["base", "avancado", "premium"];

function isTierIncluded(planTier: string, requiredTier: string): boolean {
  const planIdx = TIER_HIERARCHY.indexOf(planTier);
  const reqIdx = TIER_HIERARCHY.indexOf(requiredTier);
  if (planIdx === -1 || reqIdx === -1) return false;
  return planIdx >= reqIdx;
}

export default function AgentSkillsTab({ agentId, agentClass, plan, tenantId }: Props) {
  const [enabledSkills, setEnabledSkills] = useState<Set<string>>(new Set());
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { logEdit } = useAuditLog();
  const { limits: planLimits } = usePlanLimits(plan);

  // Determine the plan's skill tier from features
  const planSkillTier = (planLimits.features?.skill_tiers as string) || "base";

  // Load saved skills from DB
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("attendants").select("active_skills").eq("id", agentId).single();
      const saved = (data as any)?.active_skills as string[] | null;
      if (saved && saved.length > 0) {
        setEnabledSkills(new Set(saved));
      } else {
        // Default: enable core skills included in plan
        setEnabledSkills(new Set(SKILLS.filter(s => s.category === "core" && s.includedIn.includes(plan)).map(s => s.id)));
      }
      setLoaded(true);
    })();
  }, [agentId, plan]);

  const isIncluded = (skill: Skill) => {
    const requiredTier = CATEGORY_TO_TIER[skill.category] || "base";
    return isTierIncluded(planSkillTier, requiredTier);
  };
  const isEnabled = (id: string) => enabledSkills.has(id);

  const toggleSkill = (skill: Skill) => {
    if (!isIncluded(skill)) return;
    setEnabledSkills(prev => {
      const next = new Set(prev);
      if (next.has(skill.id)) next.delete(skill.id); else next.add(skill.id);
      return next;
    });
  };

  const saveSkills = async () => {
    setSaving(true);
    const skillsArray = Array.from(enabledSkills);
    const { error } = await supabase.from("attendants").update({
      active_skills: skillsArray,
    } as any).eq("id", agentId);
    setSaving(false);
    if (!error) {
      toast.success("Skills salvas com sucesso");
      await logEdit("agent_skills", { agent_id: agentId, enabled_skills: skillsArray });
    } else {
      toast.error("Erro ao salvar skills");
    }
  };

  const grouped = {
    core: SKILLS.filter(s => s.category === "core"),
    advanced: SKILLS.filter(s => s.category === "advanced"),
    premium: SKILLS.filter(s => s.category === "premium"),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Superpoderes do Agente
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ative ou desative as habilidades do seu agente · {enabledSkills.size} de {SKILLS.length} ativas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-mono capitalize border-border/40">
            Plano {plan}
          </Badge>
          <Button onClick={saveSkills} disabled={saving} size="sm" className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            {saving ? "Salvando..." : "Salvar Skills"}
          </Button>
        </div>
      </div>

      {/* FAQ Manager — visible when FAQ skill is enabled */}
      {isEnabled("faq") && tenantId && (
        <AgentFaqManager agentId={agentId} tenantId={tenantId} />
      )}

      {/* Leads Panel — visible when lead-capture skill is enabled */}
      {isEnabled("lead-capture") && (
        <AgentLeadsPanel agentId={agentId} />
      )}

      {(["core", "advanced", "premium"] as const).map(cat => {
        const catInfo = categoryLabels[cat];
        return (
          <div key={cat} className="space-y-3">
            <h3 className={`text-xs font-mono uppercase tracking-wider ${catInfo.color} flex items-center gap-2`}>
              {cat === "premium" && <Crown className="h-3 w-3" />}
              {catInfo.label}
            </h3>
            <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2">
              {grouped[cat].map((skill, i) => {
                const included = isIncluded(skill);
                const enabled = isEnabled(skill.id);
                const expanded = expandedSkill === skill.id;
                return (
                  <motion.div
                    key={skill.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`relative rounded-xl border p-4 transition-all ${
                      included
                        ? enabled
                          ? "border-primary/20 bg-primary/5"
                          : "border-border/30 bg-card/50"
                        : "border-border/20 bg-card/20 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${
                          included && enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {skill.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-display font-medium text-foreground truncate">{skill.name}</h4>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="shrink-0 h-4 w-4 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); setExpandedSkill(expanded ? null : skill.id); }}
                                >
                                  <Info className="h-2.5 w-2.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[280px] text-xs">
                                {skill.detail}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{skill.description}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {skill.comingSoon ? (
                          <Badge variant="outline" className="text-[9px] font-mono border-amber-500/30 text-amber-400 bg-amber-500/5">
                            Em breve
                          </Badge>
                        ) : included ? (
                          <Switch
                            checked={enabled}
                            onCheckedChange={() => toggleSkill(skill)}
                            className="scale-90"
                          />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] gap-1 border-[hsl(var(--meteora-cyan))]/20 text-[hsl(var(--meteora-cyan))] hover:bg-[hsl(var(--meteora-cyan))]/5"
                          >
                            <ShoppingCart className="h-3 w-3" /> {skill.addonPrice}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-border/20">
                            <p className="text-xs text-muted-foreground leading-relaxed">{skill.detail}</p>
                            {!included && (
                              <div className="mt-3 flex items-center gap-2">
                                <Button size="sm" className="h-7 text-[10px] gap-1.5 bg-gradient-to-r from-[hsl(var(--meteora-cyan))] to-primary text-white">
                                  <Zap className="h-3 w-3" /> Ativar por {skill.addonPrice}
                                </Button>
                                <span className="text-[9px] text-muted-foreground">Cobrança imediata no cartão cadastrado</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Lock overlay for non-included */}
                    {!included && (
                      <div className="absolute top-2 right-2">
                        <Lock className="h-3 w-3 text-muted-foreground/40" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

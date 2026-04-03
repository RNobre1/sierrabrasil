import { useEffect, useState, useCallback } from "react";
import {
  Brain, Trash2, User, Building2, ChevronDown, ChevronUp,
  MessageSquare, Clock, Search, Loader2, Sparkles, Target,
  AlertTriangle, Save, Hash,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonatedTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

/** Token limits per plan (fallback if RPC fails) */
const PLAN_TOKEN_LIMITS: Record<string, number> = {
  starter: 0,
  professional: 2000,
  business: 8000,
  enterprise: 16000,
  trial: 2000,
};

interface KeyFacts {
  nome?: string;
  empresa?: string;
  necessidade?: string;
  pain_points?: string[];
  preferencias?: string[];
  sentimento?: string;
  proximos_passos?: string;
  [key: string]: unknown;
}

interface MemoryRow {
  id: string;
  attendant_id: string;
  contact_phone: string;
  summary: string | null;
  key_facts: KeyFacts;
  first_interaction_at: string;
  last_interaction_at: string;
  conversations_count: number | null;
  token_count: number | null;
  consent_given: boolean | null;
}

interface Props {
  agentId: string;
  plan: string;
}

/** Format phone for display: +5511999998888 -> +55 (11) 99999-8888 */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const p1 = digits.slice(4, 9);
    const p2 = digits.slice(9);
    return `+55 (${ddd}) ${p1}-${p2}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const p1 = digits.slice(4, 8);
    const p2 = digits.slice(8);
    return `+55 (${ddd}) ${p1}-${p2}`;
  }
  return phone;
}

const SENTIMENT_STYLES: Record<string, { label: string; color: string }> = {
  positivo: { label: "Positivo", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  neutro: { label: "Neutro", color: "bg-white/[0.06] text-white/50 border-white/10" },
  negativo: { label: "Negativo", color: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
  frustrado: { label: "Frustrado", color: "bg-rose-500/15 text-rose-400 border-rose-500/25" },
};

export default function AgentMemoryTab({ agentId, plan }: Props) {
  const { user } = useAuth();
  const impersonatedTenant = useImpersonatedTenant();
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingFacts, setEditingFacts] = useState<Record<string, KeyFacts>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tokenLimit, setTokenLimit] = useState<number>(PLAN_TOKEN_LIMITS[plan] || 2000);

  const fetchMemories = useCallback(async () => {
    if (!agentId) return;
    const { data, error } = await supabase
      .from("agent_memories")
      .select("id, attendant_id, contact_phone, summary, key_facts, first_interaction_at, last_interaction_at, conversations_count, token_count, consent_given")
      .eq("attendant_id", agentId)
      .order("last_interaction_at", { ascending: false });

    if (error) {
      console.error("Error fetching memories:", error);
    } else if (data) {
      setMemories(data.map(d => ({
        ...d,
        key_facts: (d.key_facts as KeyFacts) ?? {},
      })));
    }
    setLoading(false);
  }, [agentId]);

  // Fetch token limit from RPC
  useEffect(() => {
    if (!user) return;
    const fetchLimit = async () => {
      const tenantQuery = impersonatedTenant
        ? supabase.from("tenants").select("id").eq("id", impersonatedTenant).single()
        : supabase.from("tenants").select("id").eq("owner_id", user.id).single();
      const { data: tenant } = await tenantQuery;
      if (!tenant) return;
      const { data: limit } = await supabase.rpc("get_memory_token_limit", { p_tenant_id: tenant.id });
      if (typeof limit === "number" && limit > 0) {
        setTokenLimit(limit);
      }
    };
    fetchLimit();
  }, [user, impersonatedTenant]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const filtered = memories.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    const facts = m.key_facts;
    return (
      m.contact_phone.includes(q) ||
      (facts.nome ?? "").toLowerCase().includes(q) ||
      (facts.empresa ?? "").toLowerCase().includes(q)
    );
  });

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      // Initialize editing facts from current data
      const mem = memories.find(m => m.id === id);
      if (mem) {
        setEditingFacts(prev => ({ ...prev, [id]: { ...mem.key_facts } }));
      }
    }
  };

  const updateFact = (memId: string, field: string, value: unknown) => {
    setEditingFacts(prev => ({
      ...prev,
      [memId]: { ...(prev[memId] ?? {}), [field]: value },
    }));
  };

  const saveFacts = async (memId: string) => {
    const facts = editingFacts[memId];
    if (!facts) return;
    setSavingId(memId);
    const { error } = await supabase
      .from("agent_memories")
      .update({ key_facts: facts as unknown as Json })
      .eq("id", memId);
    setSavingId(null);
    if (error) {
      toast.error("Erro ao salvar alteracoes.");
      console.error(error);
    } else {
      toast.success("Memoria atualizada com sucesso.");
      setMemories(prev => prev.map(m => m.id === memId ? { ...m, key_facts: facts } : m));
    }
  };

  const deleteMemory = async (memId: string) => {
    setDeletingId(memId);
    const { error } = await supabase
      .from("agent_memories")
      .delete()
      .eq("id", memId);
    setDeletingId(null);
    if (error) {
      toast.error("Erro ao apagar memoria.");
      console.error(error);
    } else {
      toast.success("Memoria do contato apagada permanentemente.");
      setMemories(prev => prev.filter(m => m.id !== memId));
      if (expandedId === memId) setExpandedId(null);
    }
  };

  const memoryDisabled = plan === "starter";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (memoryDisabled) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> Memoria do Agente
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Memoria persistente entre conversas
          </p>
        </div>
        <Card className="border-border/30 bg-card/50">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-cosmos-violet/10 border border-cosmos-violet/20 flex items-center justify-center mb-4">
              <Brain className="h-6 w-6 text-cosmos-violet/40" />
            </div>
            <p className="text-sm font-medium text-foreground">Memoria nao disponivel no plano Starter</p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
              Faca upgrade para o plano Profissional ou superior para que seu agente lembre de clientes entre conversas.
            </p>
            <Button variant="outline" size="sm" className="mt-4 text-xs gap-1.5 border-cosmos-cyan/20 text-cosmos-cyan hover:bg-cosmos-cyan/5">
              <Sparkles className="h-3.5 w-3.5" /> Fazer upgrade
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> Memoria do Agente
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Seu agente lembra de <span className="text-foreground font-medium">{memories.length}</span> contato{memories.length !== 1 ? "s" : ""}
          </p>
        </div>
        {memories.length > 0 && (
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              className="pl-8 h-8 text-xs bg-white/[0.02] border-white/[0.06]"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Empty state */}
      {memories.length === 0 && (
        <Card className="border-border/30 bg-card/50">
          <CardContent className="py-14 flex flex-col items-center justify-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-cosmos-indigo/10 border border-cosmos-indigo/20 flex items-center justify-center mb-4">
              <Brain className="h-6 w-6 text-cosmos-indigo/40" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhuma memoria ainda</p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-md">
              Quando seu agente conversar com clientes e as conversas forem resolvidas, as memorias aparecerão aqui automaticamente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No search results */}
      {memories.length > 0 && filtered.length === 0 && (
        <Card className="border-border/30 bg-card/50">
          <CardContent className="py-10 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">Nenhum contato encontrado para "{search}"</p>
          </CardContent>
        </Card>
      )}

      {/* Contact list */}
      <div className="space-y-2">
        {filtered.map(mem => {
          const isExpanded = expandedId === mem.id;
          const facts = isExpanded ? (editingFacts[mem.id] ?? mem.key_facts) : mem.key_facts;
          const displayName = facts.nome || formatPhone(mem.contact_phone);
          const sentiment = facts.sentimento?.toLowerCase();
          const sentimentStyle = sentiment ? SENTIMENT_STYLES[sentiment] : null;
          const tokenPct = tokenLimit > 0 && mem.token_count
            ? Math.min((mem.token_count / tokenLimit) * 100, 100)
            : 0;

          return (
            <Card key={mem.id} className="border-border/30 bg-card/50 overflow-hidden">
              {/* Collapsed row */}
              <button
                onClick={() => toggleExpand(mem.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.015] transition-colors"
              >
                {/* Avatar */}
                <div className="h-10 w-10 rounded-xl bg-cosmos-indigo/10 border border-cosmos-indigo/20 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-cosmos-indigo/60" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                    {sentimentStyle && (
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border ${sentimentStyle.color}`}>
                        {sentimentStyle.label}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {facts.empresa && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Building2 className="h-3 w-3" /> {facts.empresa}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MessageSquare className="h-3 w-3" /> {mem.conversations_count ?? 0} conversa{(mem.conversations_count ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(mem.last_interaction_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>

                {/* Token bar (compact) */}
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="hidden sm:block w-16 shrink-0">
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${tokenPct > 80 ? "bg-amber-500" : "bg-cosmos-indigo"}`}
                            style={{ width: `${Math.max(tokenPct, 3)}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-muted-foreground/60 text-right mt-0.5">
                          {mem.token_count ?? 0}t
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Tokens: {mem.token_count ?? 0} / {tokenLimit}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Chevron */}
                <div className="shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground/40" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 border-t border-border/20 space-y-4">
                      {/* Phone */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span className="font-mono">{formatPhone(mem.contact_phone)}</span>
                      </div>

                      {/* Summary */}
                      {mem.summary && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Resumo</label>
                          <p className="text-xs text-foreground/80 leading-relaxed bg-white/[0.02] rounded-lg p-3 border border-border/20">
                            {mem.summary}
                          </p>
                        </div>
                      )}

                      {/* Editable key facts */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Nome */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <User className="h-3 w-3" /> Nome
                          </label>
                          <Input
                            className="h-8 text-xs bg-white/[0.02] border-white/[0.06]"
                            value={facts.nome ?? ""}
                            onChange={e => updateFact(mem.id, "nome", e.target.value)}
                            placeholder="Nome do contato"
                          />
                        </div>

                        {/* Empresa */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> Empresa
                          </label>
                          <Input
                            className="h-8 text-xs bg-white/[0.02] border-white/[0.06]"
                            value={facts.empresa ?? ""}
                            onChange={e => updateFact(mem.id, "empresa", e.target.value)}
                            placeholder="Empresa do contato"
                          />
                        </div>

                        {/* Necessidade */}
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Target className="h-3 w-3" /> Necessidade
                          </label>
                          <Input
                            className="h-8 text-xs bg-white/[0.02] border-white/[0.06]"
                            value={facts.necessidade ?? ""}
                            onChange={e => updateFact(mem.id, "necessidade", e.target.value)}
                            placeholder="O que o contato precisa"
                          />
                        </div>

                        {/* Pain points (tags) */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Pain Points
                          </label>
                          <Input
                            className="h-8 text-xs bg-white/[0.02] border-white/[0.06]"
                            value={(facts.pain_points ?? []).join(", ")}
                            onChange={e => updateFact(mem.id, "pain_points", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                            placeholder="Separados por virgula"
                          />
                          {(facts.pain_points ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {facts.pain_points!.map((p, i) => (
                                <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 bg-rose-500/10 text-rose-400 border-rose-500/20">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Preferencias (tags) */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Preferencias
                          </label>
                          <Input
                            className="h-8 text-xs bg-white/[0.02] border-white/[0.06]"
                            value={(facts.preferencias ?? []).join(", ")}
                            onChange={e => updateFact(mem.id, "preferencias", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                            placeholder="Separadas por virgula"
                          />
                          {(facts.preferencias ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {facts.preferencias!.map((p, i) => (
                                <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 bg-cosmos-cyan/10 text-cosmos-cyan border-cosmos-cyan/20">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Sentimento */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sentimento</label>
                          <Input
                            className="h-8 text-xs bg-white/[0.02] border-white/[0.06]"
                            value={facts.sentimento ?? ""}
                            onChange={e => updateFact(mem.id, "sentimento", e.target.value)}
                            placeholder="positivo, neutro, negativo..."
                          />
                        </div>

                        {/* Proximos passos */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Proximos Passos</label>
                          <Input
                            className="h-8 text-xs bg-white/[0.02] border-white/[0.06]"
                            value={facts.proximos_passos ?? ""}
                            onChange={e => updateFact(mem.id, "proximos_passos", e.target.value)}
                            placeholder="Proxima acao planejada"
                          />
                        </div>
                      </div>

                      {/* Token usage bar (expanded) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Uso de tokens</span>
                          <span className="font-mono">{mem.token_count ?? 0} / {tokenLimit}</span>
                        </div>
                        <Progress
                          value={tokenPct}
                          className="h-1.5 bg-white/[0.04]"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1.5"
                              disabled={deletingId === mem.id}
                            >
                              {deletingId === mem.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              Esquecer contato
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-destructive">Esquecer contato permanentemente?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza? Esta acao e irreversivel. Todas as memorias deste contato serao apagadas permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMemory(mem.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Esquecer permanentemente
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button
                          size="sm"
                          className="text-xs gap-1.5 bg-cosmos-indigo hover:bg-cosmos-indigo/90 text-white"
                          onClick={() => saveFacts(mem.id)}
                          disabled={savingId === mem.id}
                        >
                          {savingId === mem.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                          Salvar alteracoes
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Search, ArrowRight, Inbox, MessageSquare, Zap, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GuidedTour from "@/components/GuidedTour";
import { CONVERSATIONS_STEPS, CONVERSATIONS_TOUR_KEY } from "@/lib/tour-steps";

type FilterKey = "all" | "active" | "resolved" | "escalated";

interface ConversationRow {
  id: string;
  contact_name: string;
  contact_phone: string | null;
  channel: string;
  status: string;
  started_at: string;
  last_message?: string;
}

const AVATAR = [
  "bg-gradient-to-br from-indigo-500 to-indigo-400",
  "bg-gradient-to-br from-emerald-500 to-emerald-400",
  "bg-gradient-to-br from-amber-500 to-amber-400",
  "bg-gradient-to-br from-rose-500 to-rose-400",
  "bg-gradient-to-br from-cyan-500 to-cyan-400",
  "bg-gradient-to-br from-violet-500 to-violet-400",
];

function pick(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return AVATAR[Math.abs(h) % AVATAR.length]; }
function ini(n: string) { return n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }
function ago(d: string) { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 60) return "agora"; if (s < 3600) return `${Math.floor(s / 60)}min`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`; }

const SENTIMENT_SCORES: Record<string, number> = {
  positivo: 1.0,
  neutro: 0.5,
  negativo: 0.25,
  frustrado: 0.0,
};

function computeSentimentScore(sentiments: string[]): number | null {
  if (sentiments.length === 0) return null;
  const total = sentiments.reduce((sum, s) => sum + (SENTIMENT_SCORES[s] ?? 0.5), 0);
  return total / sentiments.length;
}

function sentimentLabel(score: number): string {
  if (score >= 0.75) return "Positivo";
  if (score >= 0.4) return "Neutro";
  if (score >= 0.15) return "Negativo";
  return "Frustrado";
}

function sentimentBarColor(score: number): string {
  if (score >= 0.75) return "bg-emerald-500";
  if (score >= 0.4) return "bg-amber-500";
  return "bg-rose-500";
}

function SentimentBar({ score }: { score: number | null }) {
  if (score === null) return null;
  const label = sentimentLabel(score);
  const color = sentimentBarColor(score);
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-12 h-1.5 rounded-full bg-white/[0.06] overflow-hidden shrink-0">
            <div
              className={`h-full rounded-full transition-all duration-300 ${color}`}
              style={{ width: `${Math.max(score * 100, 6)}%` }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[11px]">
          Sentimento medio: {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Pill({ icon: I, label, value, cls }: { icon: any; label: string; value: number; cls: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.08] transition-colors">
      <I className={`h-3.5 w-3.5 shrink-0 ${cls}`} />
      <span className="text-[11px] text-white/40 font-medium">{label}</span>
      <span className={`text-[15px] font-display font-semibold tracking-tight ml-auto ${cls}`}>{value}</span>
    </div>
  );
}

function ChBadge({ ch }: { ch: string }) {
  const m: Record<string, string> = {
    whatsapp: "bg-green-500/10 text-green-400 border-green-500/20",
    instagram: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    web: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  };
  return <span className={`hidden sm:inline-flex items-center justify-center w-[82px] px-2 py-[3px] rounded-md text-[9px] font-bold uppercase tracking-[.06em] border ${m[ch] ?? m.web}`}>{ch}</span>;
}

function StBadge({ st }: { st: string }) {
  const m: Record<string, { l: string; c: string; d: string }> = {
    active:    { l: "Ativa",     c: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,.12)]", d: "bg-emerald-400 animate-pulse-dot" },
    resolved:  { l: "Resolvida", c: "bg-white/[0.04] text-white/40 border-white/[0.06]", d: "bg-white/30" },
    escalated: { l: "Escalada",  c: "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,.12)]", d: "bg-red-400" },
  };
  const cfg = m[st] ?? m.resolved;
  return (
    <span className={`inline-flex items-center gap-[5px] px-2.5 py-[3px] rounded-full text-[10px] font-semibold border ${cfg.c}`}>
      <span className={`w-[5px] h-[5px] rounded-full ${cfg.d}`} />
      {cfg.l}
    </span>
  );
}

/** Grouping key: prefer contact_phone, fall back to contact_name */
function contactKey(c: ConversationRow) {
  return c.contact_phone?.trim() || c.contact_name;
}

export default function Conversations() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [sentimentMap, setSentimentMap] = useState<Map<string, number | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const nav = useNavigate();
  const { user } = useAuth();
  const isInitialLoad = useRef(true);
  const tenantIdRef = useRef<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    // Only show loading spinner on initial load
    if (isInitialLoad.current) setLoading(true);

    // Cache tenant ID after first fetch
    if (!tenantIdRef.current) {
      const { data: t } = await supabase.from("tenants").select("id").eq("owner_id", user.id).single();
      if (!t) { setLoading(false); isInitialLoad.current = false; return; }
      tenantIdRef.current = t.id;
    }

    const tid = tenantIdRef.current;
    const { data } = await supabase.from("conversations").select("id, contact_name, contact_phone, channel, status, started_at").eq("tenant_id", tid).order("started_at", { ascending: false });
    if (data) {
      const conversationIds = data.map(c => c.id);

      // Fetch last messages + sentiment data in parallel
      const [enriched, sentimentResult] = await Promise.all([
        Promise.all(data.map(async c => {
          const { data: m } = await supabase.from("messages").select("content").eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1);
          return { ...c, last_message: m?.[0]?.content ?? "" };
        })),
        // Single query: all attendant messages with sentiment metadata for visible conversations
        supabase
          .from("messages")
          .select("conversation_id, metadata")
          .in("conversation_id", conversationIds)
          .eq("role", "attendant")
          .not("metadata", "is", null),
      ]);

      setRows(enriched);

      // Build sentiment score map per conversation
      const sentimentsByConv = new Map<string, string[]>();
      if (sentimentResult.data) {
        for (const msg of sentimentResult.data) {
          const s = (msg.metadata as any)?.sentiment;
          if (s && typeof s === "string") {
            const arr = sentimentsByConv.get(msg.conversation_id) ?? [];
            arr.push(s.toLowerCase());
            sentimentsByConv.set(msg.conversation_id, arr);
          }
        }
      }
      const scoreMap = new Map<string, number | null>();
      for (const id of conversationIds) {
        scoreMap.set(id, computeSentimentScore(sentimentsByConv.get(id) ?? []));
      }
      setSentimentMap(scoreMap);
    }
    setLoading(false);
    isInitialLoad.current = false;
  }, [user]);

  // Initial load + polling every 10s
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Reset expanded state when filter changes
  useEffect(() => { setExpanded(new Set()); }, [filter]);

  const toggle = (key: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  /**
   * For "all" and "active" filters: deduplicate by contact, showing the active
   * conversation or the most recent one per contact.
   */
  const deduplicatedRows = useMemo(() => {
    const byContact = new Map<string, ConversationRow>();
    // rows are already sorted by started_at DESC from Supabase
    for (const c of rows) {
      const key = contactKey(c);
      const existing = byContact.get(key);
      if (!existing) {
        byContact.set(key, c);
      } else if (c.status === "active" && existing.status !== "active") {
        // Active always wins
        byContact.set(key, c);
      }
      // Otherwise keep the first (most recent) one
    }
    return Array.from(byContact.values());
  }, [rows]);

  /**
   * For "resolved" and "escalated" filters: group conversations by contact.
   * Returns a Map of contactKey -> conversation[] (all matching the filter status).
   */
  const groupedByContact = useMemo(() => {
    const groups = new Map<string, ConversationRow[]>();
    const statusFilter = filter; // "resolved" or "escalated"
    for (const c of rows) {
      if (c.status !== statusFilter) continue;
      const key = contactKey(c);
      const arr = groups.get(key) ?? [];
      arr.push(c);
      groups.set(key, arr);
    }
    return groups;
  }, [rows, filter]);

  /** Aggregate sentiment score per contact key (across all their conversations) */
  const contactSentimentMap = useMemo(() => {
    const result = new Map<string, number | null>();
    const byContact = new Map<string, (number | null)[]>();
    for (const c of rows) {
      const key = contactKey(c);
      const arr = byContact.get(key) ?? [];
      arr.push(sentimentMap.get(c.id) ?? null);
      byContact.set(key, arr);
    }
    for (const [key, scores] of byContact) {
      const valid = scores.filter((s): s is number => s !== null);
      result.set(key, valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null);
    }
    return result;
  }, [rows, sentimentMap]);

  /** Whether we should use grouped/expandable view */
  const isGroupedView = filter === "resolved" || filter === "escalated";

  /** Count raw conversations per status for resolved/escalated badges */
  const rawCounts = useMemo(() => {
    return {
      resolved: rows.filter(c => c.status === "resolved").length,
      escalated: rows.filter(c => c.status === "escalated").length,
    };
  }, [rows]);

  const cnt: Record<FilterKey, number> = {
    all: deduplicatedRows.length,
    active: deduplicatedRows.filter(c => c.status === "active").length,
    resolved: rawCounts.resolved,
    escalated: rawCounts.escalated,
  };

  /** Apply search filter to the deduplicated list */
  const filteredFlat = useMemo(() => {
    let list = filter === "all" ? deduplicatedRows
      : filter === "active" ? deduplicatedRows.filter(c => c.status === "active")
      : deduplicatedRows; // unused for grouped, but kept for safety
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.contact_name.toLowerCase().includes(q) || (c.contact_phone ?? "").includes(q));
    }
    return list;
  }, [deduplicatedRows, filter, search]);

  /** Apply search filter to grouped view */
  const filteredGroups = useMemo(() => {
    if (!isGroupedView) return new Map<string, ConversationRow[]>();
    const result = new Map<string, ConversationRow[]>();
    for (const [key, convs] of groupedByContact) {
      const rep = convs[0];
      if (search) {
        const q = search.toLowerCase();
        if (!rep.contact_name.toLowerCase().includes(q) && !(rep.contact_phone ?? "").includes(q)) continue;
      }
      result.set(key, convs);
    }
    return result;
  }, [groupedByContact, isGroupedView, search]);

  if (loading) return (
    <div className="space-y-5 pt-2">
      <div className="h-7 w-40 skeleton-cosmos rounded-lg" />
      <div className="grid grid-cols-4 gap-2">{[...Array(4)].map((_, i) => <div key={i} className="h-11 skeleton-cosmos rounded-[10px]" />)}</div>
      <div className="cosmos-card p-0 divide-y divide-white/[0.03]">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <div className="h-10 w-10 rounded-[10px] skeleton-cosmos shrink-0" />
            <div className="flex-1 space-y-1.5"><div className="h-3 w-32 skeleton-cosmos rounded" /><div className="h-2.5 w-52 skeleton-cosmos rounded" /></div>
            <div className="h-5 w-20 skeleton-cosmos rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-display font-bold text-white tracking-[-0.03em]">Conversas</h1>
        <p className="text-[13px] text-white/35 mt-0.5">Todas as interações do seu agente — em tempo real.</p>
      </div>

      <div data-tour="conversations-stats" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Pill icon={MessageSquare} label="Total" value={cnt.all} cls="text-indigo-400" />
        <Pill icon={Zap} label="Ativas" value={cnt.active} cls="text-emerald-400" />
        <Pill icon={CheckCircle2} label="Resolvidas" value={cnt.resolved} cls="text-white/40" />
        <Pill icon={AlertTriangle} label="Escaladas" value={cnt.escalated} cls="text-red-400" />
      </div>

      <div data-tour="conversations-filters" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.025] border border-white/[0.06]">
          {(["all", "active", "resolved", "escalated"] as FilterKey[]).map(k => {
            const on = filter === k;
            const lbl = k === "all" ? "Todas" : k === "active" ? "Ativa" : k === "resolved" ? "Resolvida" : "Escalada";
            return (
              <button key={k} onClick={() => setFilter(k)} className={`px-3.5 py-[5px] rounded-[9px] text-[11.5px] font-semibold transition-all duration-150 ${on ? "bg-white/[0.07] text-white shadow-[0_1px_2px_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.04)]" : "text-white/30 hover:text-white/50 hover:bg-white/[0.02]"}`}>
                {lbl}
                {cnt[k] > 0 && <span className={`ml-1.5 text-[9px] font-mono tabular-nums px-[5px] py-[1px] rounded-full ${on ? "bg-indigo-500/20 text-indigo-400" : "bg-white/[0.04] text-white/20"}`}>{cnt[k]}</span>}
              </button>
            );
          })}
        </div>
        <div data-tour="conversations-search" className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" />
          <Input placeholder="Buscar por nome ou telefone…" className="pl-9 h-[34px] text-[12px] bg-white/[0.015] border-white/[0.05] placeholder:text-white/20" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div data-tour="conversations-list" className="cosmos-card p-0 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[40px_1fr_82px_auto_48px_20px] items-center gap-4 px-4 py-2 border-b border-white/[0.04] text-[9px] font-mono uppercase tracking-[.1em] text-white/20 select-none">
          <span /><span>Contato</span><span className="text-center">Canal</span><span className="text-center w-24">Status</span><span className="text-right">Tempo</span><span />
        </div>

        {/* Empty state */}
        {(isGroupedView ? filteredGroups.size === 0 : filteredFlat.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/[0.06] border border-indigo-500/[0.1] flex items-center justify-center mb-4">
              <Inbox className="h-6 w-6 text-indigo-400/30" />
            </div>
            <p className="text-[13px] font-medium text-white/40">{search ? `Sem resultados para "${search}"` : "Nenhuma conversa ainda"}</p>
            <p className="text-[11px] text-white/20 mt-1 max-w-[260px]">{search ? "Tente outro termo." : "Quando seu atendente receber a primeira mensagem ela aparecerá aqui."}</p>
          </div>
        ) : isGroupedView ? (
          /* ── Grouped / expandable view (resolved & escalated) ── */
          <div className="divide-y divide-white/[0.03]">
            {Array.from(filteredGroups.entries()).map(([key, convs]) => {
              const rep = convs[0]; // representative row (most recent)
              const isOpen = expanded.has(key);
              return (
                <div key={key}>
                  {/* Contact header row */}
                  <div
                    onClick={() => toggle(key)}
                    className="group grid grid-cols-[20px_40px_1fr_auto_48px] sm:grid-cols-[20px_40px_1fr_82px_auto_48px_20px] items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-150 hover:bg-white/[0.015]"
                  >
                    <div className="flex items-center justify-center">
                      <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.15 }}>
                        <ChevronRight className="h-3.5 w-3.5 text-white/25" />
                      </motion.div>
                    </div>
                    <div className={`h-10 w-10 rounded-[10px] flex items-center justify-center text-white font-display font-semibold text-[11px] shadow-lg shrink-0 ${pick(rep.contact_name)}`}>{ini(rep.contact_name)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-white/90 truncate leading-snug">{rep.contact_name}</p>
                        <SentimentBar score={contactSentimentMap.get(key) ?? null} />
                      </div>
                      <p className="text-[10px] text-white/25 mt-[1px]">
                        {convs.length} conversa{convs.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <ChBadge ch={rep.channel} />
                    <StBadge st={rep.status} />
                    <span className="hidden sm:block text-[10px] text-white/20 font-mono tabular-nums text-right">{ago(rep.started_at)}</span>
                    <span className="hidden sm:block" />
                  </div>

                  {/* Expanded sub-rows */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        {convs.map(c => (
                          <div
                            key={c.id}
                            onClick={() => nav(`/conversations/${c.id}`)}
                            className="group grid grid-cols-[20px_40px_1fr_auto_48px] sm:grid-cols-[20px_40px_1fr_82px_auto_48px_20px] items-center gap-4 pl-6 pr-4 py-2.5 cursor-pointer transition-all duration-150 bg-white/[0.008] hover:bg-white/[0.025] border-t border-white/[0.02]"
                          >
                            <span />
                            <div className="h-7 w-7 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
                              <MessageSquare className="h-3 w-3 text-white/20" />
                            </div>
                            <div className="min-w-0">
                              {c.last_message ? <p className="text-[11px] text-white/30 truncate max-w-md leading-snug">{c.last_message}</p> : <p className="text-[10px] text-white/15 italic">Sem mensagens</p>}
                            </div>
                            <span className="hidden sm:block" />
                            <span className="hidden sm:block" />
                            <span className="hidden sm:block text-[10px] text-white/20 font-mono tabular-nums text-right">{ago(c.started_at)}</span>
                            <ArrowRight className="hidden sm:block h-3 w-3 text-white/[0.05] group-hover:text-white/[0.15] transition-colors" />
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Flat / deduplicated view (all & active) ── */
          <div className="divide-y divide-white/[0.03]">
            {filteredFlat.map(c => (
              <div key={c.id} onClick={() => nav(`/conversations/${c.id}`)}
                className="group grid grid-cols-[40px_1fr_auto] sm:grid-cols-[40px_1fr_82px_auto_48px_20px] items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-150 hover:bg-white/[0.015]"
              >
                <div className={`h-10 w-10 rounded-[10px] flex items-center justify-center text-white font-display font-semibold text-[11px] shadow-lg shrink-0 ${pick(c.contact_name)}`}>{ini(c.contact_name)}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-white/90 truncate leading-snug">{c.contact_name}</p>
                    <span data-tour="conv-sentiment">
                      <SentimentBar score={contactSentimentMap.get(contactKey(c)) ?? null} />
                    </span>
                  </div>
                  {c.last_message ? <p className="text-[11px] text-white/25 truncate mt-[1px] max-w-md leading-snug">{c.last_message}</p> : <p className="text-[10px] text-white/15 italic mt-[1px]">Sem mensagens</p>}
                </div>
                <ChBadge ch={c.channel} />
                <StBadge st={c.status} />
                <span className="hidden sm:block text-[10px] text-white/20 font-mono tabular-nums text-right">{ago(c.started_at)}</span>
                <ArrowRight className="hidden sm:block h-3.5 w-3.5 text-white/[0.05] group-hover:text-white/[0.15] transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>
      <GuidedTour steps={CONVERSATIONS_STEPS} tourKey={CONVERSATIONS_TOUR_KEY} />
    </div>
  );
}

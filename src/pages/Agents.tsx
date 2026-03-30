import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Plus, Play, Settings, Headphones, TrendingUp, Zap, ChevronRight, Wifi, WifiOff, Shield, Activity, Search, X, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Attendant {
  id: string;
  name: string;
  status: string;
  channels: string[] | null;
  model: string | null;
  persona: string | null;
  class: string | null;
}

const CLASS_CFG: Record<string, { short: string; dot: string; text: string; accent: string }> = {
  support: { short: "Suporte", dot: "bg-blue-400", text: "text-blue-400", accent: "from-blue-500/15 to-blue-500/5 border-blue-500/10" },
  sales:   { short: "Vendas",  dot: "bg-emerald-400", text: "text-emerald-400", accent: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/10" },
};

function ChBadge({ ch }: { ch: string }) {
  const m: Record<string, string> = {
    whatsapp: "text-green-400/70 border-green-500/15",
    instagram: "text-pink-400/70 border-pink-500/15",
    web: "text-indigo-400/70 border-indigo-500/15",
  };
  return <span className={`inline-flex items-center px-1.5 py-[1px] rounded text-[8px] font-bold uppercase tracking-[.05em] border bg-white/[0.02] ${m[ch] ?? m.web}`}>{ch}</span>;
}

export default function Agents() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [agents, setAgents] = useState<Attendant[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantPlan, setTenantPlan] = useState("starter");
  const [search, setSearch] = useState("");
  const [classFilters, setClassFilters] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: t } = await supabase.from("tenants").select("id, plan").eq("owner_id", user.id).single();
      if (!t) { setLoading(false); return; }
      setTenantPlan(t.plan);
      const { data } = await supabase.from("attendants").select("id, name, status, channels, model, persona, class").eq("tenant_id", t.id);
      setAgents((data as any) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const maxAgents = tenantPlan === "starter" ? 1 : tenantPlan === "professional" ? 3 : tenantPlan === "enterprise" ? 100 : 10;
  const canCreate = agents.length < maxAgents;
  const online = agents.filter(a => a.status === "online").length;
  const [showLimitModal, setShowLimitModal] = useState(false);

  const handleCreateAgent = () => {
    if (canCreate) {
      nav("/onboarding?newAgent=true");
    } else {
      setShowLimitModal(true);
    }
  };

  const toggleClass = (cls: string) => {
    setClassFilters(prev => {
      const next = new Set(prev);
      next.has(cls) ? next.delete(cls) : next.add(cls);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = agents;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(s));
    }
    if (classFilters.size > 0) {
      result = result.filter(a => classFilters.has(a.class || "support"));
    }
    if (statusFilter !== "all") {
      result = result.filter(a => a.status === statusFilter);
    }
    return result;
  }, [agents, search, classFilters, statusFilter]);

  const hasFilters = search || classFilters.size > 0 || statusFilter !== "all";
  const clearFilters = () => { setSearch(""); setClassFilters(new Set()); setStatusFilter("all"); };

  if (loading) return (
    <div className="space-y-5">
      <div className="h-7 w-44 skeleton-cosmos rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-[180px] skeleton-cosmos rounded-[14px]" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-display font-bold text-white tracking-[-0.03em]">Agentes</h1>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-white/30">
            <span className="font-mono">{agents.length}/{maxAgents} agentes</span>
            <span className="w-px h-3 bg-white/10" />
            <span className="flex items-center gap-1"><Wifi className="h-3 w-3 text-emerald-400" /> {online} online</span>
            {agents.length - online > 0 && (
              <span className="flex items-center gap-1"><WifiOff className="h-3 w-3 text-white/20" /> {agents.length - online} offline</span>
            )}
          </div>
        </div>
        <Button onClick={handleCreateAgent} className="gap-1.5 text-[12px] rounded-[10px]">
          <Plus className="h-3.5 w-3.5" /> Novo Agente
        </Button>
      </div>

      {/* ── Limit modal ── */}
      <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <div className="flex flex-col items-center text-center py-4 space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold text-foreground">Limite de agentes atingido</h3>
              <p className="text-sm text-muted-foreground mt-2">Seu plano atual permite até <strong>{maxAgents}</strong> agente{maxAgents > 1 ? "s" : ""}. Faça upgrade para criar mais agentes e desbloquear superpoderes.</p>
            </div>
            <Button onClick={() => { setShowLimitModal(false); nav("/integrations"); }} className="gap-2">
              Fazer Upgrade <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar agente..."
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/[0.12] transition-colors"
          />
        </div>

        {/* Class toggles */}
        {Object.entries(CLASS_CFG).map(([key, cfg]) => {
          const active = classFilters.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleClass(key)}
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[10px] font-semibold border transition-all ${
                active
                  ? `bg-gradient-to-r ${cfg.accent} ${cfg.text} border-current/20`
                  : "bg-white/[0.02] text-white/30 border-white/[0.06] hover:bg-white/[0.04] hover:text-white/50"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${active ? cfg.dot : "bg-white/20"}`} />
              {cfg.short}
            </button>
          );
        })}

        {/* Status toggles */}
        {(["online", "offline"] as const).map(s => {
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(active ? "all" : s)}
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[10px] font-semibold border transition-all ${
                active
                  ? s === "online"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-white/[0.06] text-white/50 border-white/[0.1]"
                  : "bg-white/[0.02] text-white/30 border-white/[0.06] hover:bg-white/[0.04] hover:text-white/50"
              }`}
            >
              {s === "online" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {s === "online" ? "Online" : "Offline"}
            </button>
          );
        })}

        {/* Clear */}
        {hasFilters && (
          <button onClick={clearFilters} className="inline-flex items-center gap-1 px-2 h-8 rounded-lg text-[10px] text-white/30 hover:text-white/60 transition-colors">
            <X className="h-3 w-3" /> Limpar
          </button>
        )}

        {/* Count */}
        {hasFilters && (
          <span className="text-[10px] text-white/20 font-mono ml-auto">{filtered.length} de {agents.length}</span>
        )}
      </div>

      {/* ── Agent Grid ── */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a, i) => {
          const cls = CLASS_CFG[a.class || "support"] || CLASS_CFG.support;
          const model = a.model ? a.model.split("/").pop()?.replace("-preview", "") : "default";

          return (
            <div
              key={a.id}
              onClick={() => nav(`/agents/detail?id=${a.id}`)}
              className="group cosmos-card p-0 cursor-pointer"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Top accent */}
              <div className={`h-[2px] w-full bg-gradient-to-r ${a.status === "online" ? "from-emerald-500/50 via-emerald-400/30 to-transparent" : "from-white/[0.06] to-transparent"}`} />

              <div className="p-4">
                {/* Row 1: Avatar + Name + Status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`h-10 w-10 rounded-[10px] flex items-center justify-center border bg-gradient-to-br ${cls.accent}`}>
                        <Bot className="h-4.5 w-4.5 text-white/70" />
                      </div>
                      <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#161822] ${a.status === "online" ? "bg-emerald-400 animate-pulse-dot" : "bg-white/20"}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-white/90 truncate">{a.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${cls.dot}`} />
                        <span className={`text-[9.5px] font-medium ${cls.text}`}>{cls.short}</span>
                        <span className="text-white/10">·</span>
                        <span className="text-[9.5px] text-white/25 font-mono">{model}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[9px] font-semibold border ${a.status === "online" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/[0.03] text-white/25 border-white/[0.06]"}`}>
                    <Activity className="h-2.5 w-2.5" />
                    {a.status === "online" ? "Online" : "Offline"}
                  </span>
                </div>

                {/* Row 2: Channels */}
                <div className="flex items-center gap-1.5 mb-3">
                  {a.channels?.map(ch => <ChBadge key={ch} ch={ch} />)}
                  {(!a.channels || a.channels.length === 0) && <span className="text-[9px] text-white/15 italic">Nenhum canal</span>}
                </div>

                {/* Row 3: Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                  <div className="flex gap-1">
                    <button
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-white/30 hover:text-white/60 hover:bg-white/[0.03] transition-all"
                      onClick={e => { e.stopPropagation(); nav("/attendant/playground"); }}
                    >
                      <Play className="h-3 w-3" /> Testar
                    </button>
                    <button
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-white/30 hover:text-white/60 hover:bg-white/[0.03] transition-all"
                      onClick={e => { e.stopPropagation(); nav(`/agents/detail?id=${a.id}`); }}
                    >
                      <Settings className="h-3 w-3" /> Config
                    </button>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-white/[0.06] group-hover:text-white/[0.15] transition-colors" />
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty */}
        {agents.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/[0.06] border border-indigo-500/[0.1] flex items-center justify-center mb-4">
              <Bot className="h-6 w-6 text-indigo-400/30" />
            </div>
            <p className="text-[13px] font-medium text-white/40">Nenhum agente criado</p>
            <p className="text-[11px] text-white/20 mt-1">Crie seu primeiro agente para começar a atender.</p>
          </div>
        )}
      </div>
    </div>
  );
}

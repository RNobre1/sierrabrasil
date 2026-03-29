import { useEffect, useState, useMemo } from "react";
import { Bot, Search, Power, PowerOff, Filter, X, Activity, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Attendant {
  id: string;
  name: string;
  status: string;
  model: string | null;
  channels: string[] | null;
  tenant_id: string;
  tenant_name?: string;
  created_at: string;
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <span className="text-xl font-display font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

export default function AdminAttendants() {
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAttendants = async () => {
    const { data: atts } = await supabase.from("attendants").select("*").order("created_at", { ascending: false });
    if (atts) {
      const tenantIds = [...new Set(atts.map(a => a.tenant_id))];
      const { data: tenants } = await supabase.from("tenants").select("id, name").in("id", tenantIds);
      const tenantMap = Object.fromEntries((tenants ?? []).map(t => [t.id, t.name]));
      setAttendants(atts.map(a => ({ ...a, tenant_name: tenantMap[a.tenant_id] ?? "—" })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchAttendants(); }, []);

  const toggleStatus = async (att: Attendant) => {
    const newStatus = att.status === "online" ? "offline" : "online";
    await supabase.from("attendants").update({ status: newStatus }).eq("id", att.id);
    toast({ title: `${att.name} ${newStatus === "online" ? "ativado" : "pausado"}` });
    fetchAttendants();
  };

  const filtered = useMemo(() => {
    let result = attendants;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(s) || (a.tenant_name ?? "").toLowerCase().includes(s));
    }
    if (statusFilter !== "all") result = result.filter(a => a.status === statusFilter);
    return result;
  }, [attendants, search, statusFilter]);

  const online = attendants.filter(a => a.status === "online").length;
  const offline = attendants.length - online;
  const hasActiveFilters = search || statusFilter !== "all";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground font-mono">Carregando agentes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-xl font-display font-bold tracking-tight">Atendentes</h1>
        <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">{attendants.length} atendentes no sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Bot} label="Total" value={String(attendants.length)} color="hsl(var(--foreground))" />
        <StatCard icon={Wifi} label="Online" value={String(online)} color="hsl(152, 69%, 41%)" />
        <StatCard icon={WifiOff} label="Offline" value={String(offline)} color="hsl(var(--muted-foreground))" />
        <StatCard icon={Activity} label="Uptime" value={attendants.length ? `${Math.round((online / attendants.length) * 100)}%` : "0%"} color="hsl(217, 91%, 60%)" />
      </div>

      {/* Health bar */}
      <div className="bg-card rounded-lg p-4 border border-border">
        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-2">Status geral</p>
        <div className="flex gap-1 h-6 rounded overflow-hidden">
          {online > 0 && (
            <div className="bg-emerald-500 flex items-center justify-center text-[9px] font-bold text-white transition-all" style={{ width: `${Math.max((online / attendants.length) * 100, 5)}%` }}>
              {online} online
            </div>
          )}
          {offline > 0 && (
            <div className="bg-muted-foreground/30 flex items-center justify-center text-[9px] font-medium text-muted-foreground transition-all" style={{ width: `${Math.max((offline / attendants.length) * 100, 5)}%` }}>
              {offline} offline
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" /> Filtros
          </div>
          {hasActiveFilters && (
            <button onClick={() => { setSearch(""); setStatusFilter("all"); }} className="text-[10px] text-primary hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Nome do atendente ou tenant..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background border-border text-xs h-8" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] bg-background border-border h-8 text-[11px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: Todos</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground font-mono">{filtered.length} de {attendants.length} resultado{filtered.length !== 1 && "s"}</p>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Agente</th>
                  <th className="text-left px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Tenant</th>
                  <th className="text-left px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Modelo</th>
                  <th className="text-left px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Canais</th>
                  <th className="text-left px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-2.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(att => (
                  <tr key={att.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${att.status === "online" ? "bg-emerald-400 animate-pulse-dot" : "bg-muted-foreground"}`} />
                        </div>
                        <span className="font-medium text-xs">{att.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{att.tenant_name}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                        {att.model ? att.model.split("/").pop() : "default"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        {att.channels?.map(ch => <Badge key={ch} variant="outline" className="text-[9px] capitalize h-5">{ch}</Badge>) ?? <span className="text-[10px] text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={att.status === "online" ? "default" : "secondary"} className="text-[9px] h-5">
                        {att.status === "online" ? "● Online" : "○ Offline"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleStatus(att)}>
                        {att.status === "online" ? <PowerOff className="h-3.5 w-3.5 text-destructive" /> : <Power className="h-3.5 w-3.5 text-emerald-400" />}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <p className="text-center text-xs text-muted-foreground py-12">Nenhum atendente encontrado</p>}
        </CardContent>
      </Card>
    </div>
  );
}

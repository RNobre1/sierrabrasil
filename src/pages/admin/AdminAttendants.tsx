import { useEffect, useState } from "react";
import { Bot, Search, Power, PowerOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function AdminAttendants() {
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAttendants = async () => {
    const { data: atts } = await supabase.from("attendants").select("*").order("created_at", { ascending: false });
    if (atts) {
      // Fetch tenant names
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

  const filtered = attendants.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.tenant_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Atendentes</h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">{attendants.length} atendentes no sistema</p>
      </div>

      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar atendente ou tenant..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filtered.map(att => (
          <Card key={att.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card ${att.status === "online" ? "bg-meteora-success animate-pulse-dot" : "bg-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{att.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{att.tenant_name} · {att.model ?? "gpt-4o-mini"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {att.channels?.map(ch => <Badge key={ch} variant="outline" className="text-[10px] capitalize">{ch}</Badge>)}
                <Badge variant={att.status === "online" ? "default" : "secondary"}>
                  {att.status === "online" ? "Online" : "Offline"}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => toggleStatus(att)}>
                  {att.status === "online" ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">Nenhum atendente encontrado</p>}
      </div>
    </div>
  );
}

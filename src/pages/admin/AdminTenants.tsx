import { useEffect, useState } from "react";
import { Search, Users, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  owner_id: string;
  created_at: string;
}

interface TenantDetail extends Tenant {
  attendant_count: number;
  conversation_count: number;
  owner_email?: string;
}

export default function AdminTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TenantDetail | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      const { data } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });
      setTenants(data ?? []);
      setLoading(false);
    };
    fetchTenants();
  }, []);

  const openDetail = async (tenant: Tenant) => {
    const [attRes, convRes, profRes] = await Promise.all([
      supabase.from("attendants").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("profiles").select("full_name").eq("user_id", tenant.owner_id).single(),
    ]);
    setSelected({
      ...tenant,
      attendant_count: attRes.count ?? 0,
      conversation_count: convRes.count ?? 0,
      owner_email: profRes.data?.full_name ?? "—",
    });
  };

  const filtered = tenants.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase())
  );

  const timeAgo = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return "hoje";
    if (days === 1) return "ontem";
    if (days < 7) return `${days}d atrás`;
    return `${Math.floor(days / 7)}sem atrás`;
  };

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
          <h1 className="text-2xl font-display font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{tenants.length} tenants cadastrados</p>
        </div>
      </div>

      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar tenant..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filtered.map(t => (
          <Card key={t.id} className="p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{t.slug} · {timeAgo(t.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-[10px] capitalize">{t.plan}</Badge>
                <Badge variant={t.status === "active" ? "default" : "secondary"}>
                  {t.status === "active" ? "Ativo" : t.status}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => openDetail(t)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhum tenant encontrado</p>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{selected?.name}</DialogTitle>
            <DialogDescription className="font-mono">{selected?.slug}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Plano</p>
                  <p className="text-lg font-display font-semibold capitalize">{selected.plan}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-lg font-display font-semibold capitalize">{selected.status}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Atendentes</p>
                  <p className="text-lg font-display font-semibold">{selected.attendant_count}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Conversas</p>
                  <p className="text-lg font-display font-semibold">{selected.conversation_count}</p>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Owner</p>
                <p className="text-sm font-medium">{selected.owner_email}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="text-sm font-mono">{new Date(selected.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

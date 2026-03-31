import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Plus, Trash2, QrCode, CheckCircle2, XCircle, AlertTriangle, Wifi, WifiOff, LogOut, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WhatsAppInstance {
  id: string;
  tenant_id: string;
  instance_name: string;
  display_name: string | null;
  phone_number: string | null;
  status: string;
  qr_code: string | null;
  profile_pic_url: string | null;
  connected_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

async function callEvolutionApi(action: string, body?: Record<string, unknown>, params?: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão expirada");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = new URL(`https://${projectId}.supabase.co/functions/v1/evolution-api`);
  url.searchParams.set("action", action);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body || {}),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro na requisição");
  return data;
}

const statusConfig: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  connected: { color: "bg-emerald-500", text: "Conectado", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  connecting: { color: "bg-amber-500", text: "Conectando", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  disconnected: { color: "bg-muted-foreground/50", text: "Desconectado", icon: <XCircle className="h-3.5 w-3.5" /> },
  created: { color: "bg-blue-500", text: "Criado", icon: <QrCode className="h-3.5 w-3.5" /> },
  error: { color: "bg-destructive", text: "Erro", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
};

export default function WhatsAppTab({ plan }: { plan: string }) {
  const { user } = useAuth();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [qrData, setQrData] = useState<{ instanceName: string; qr: string } | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const fetchInstances = useCallback(async () => {
    if (!user) return;
    try {
      const data = await callEvolutionApi("list");
      setInstances(data.instances || []);
    } catch (e) {
      console.error("Fetch instances error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  // Poll status for connecting instances
  useEffect(() => {
    const connectingInstances = instances.filter(i => i.status === "connecting");
    if (connectingInstances.length === 0) return;

    const interval = setInterval(async () => {
      for (const inst of connectingInstances) {
        try {
          const result = await callEvolutionApi("status", {}, { instanceName: inst.instance_name });
          if (result.status === "connected") {
            toast.success(`${inst.display_name || inst.instance_name} conectado!`);
            setQrData(null);
            fetchInstances();
          }
        } catch (e) {
          console.error("Poll error:", e);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [instances, fetchInstances]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await callEvolutionApi("create_instance", {
        instanceName: newName.trim(),
        displayName: newDisplayName.trim() || newName.trim(),
      });
      toast.success("Instância criada com sucesso!");
      setShowCreate(false);
      setNewName("");
      setNewDisplayName("");
      fetchInstances();
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar instância");
    } finally {
      setCreating(false);
    }
  };

  const handleConnect = async (inst: WhatsAppInstance) => {
    setConnectingId(inst.id);
    try {
      const result = await callEvolutionApi("connect", { instanceName: inst.instance_name });
      console.log("Connect result:", result);
      if (result.alreadyConnected) {
        toast.success("Instância já está conectada!");
        fetchInstances();
        return;
      }
      if (result.qrCode) {
        setQrData({ instanceName: inst.instance_name, qr: result.qrCode });
      } else {
        toast.warning("QR Code não retornado. Verifique os logs da Evolution API.");
      }
      fetchInstances();
    } catch (e: any) {
      toast.error(e.message || "Erro ao conectar");
    } finally {
      setConnectingId(null);
    }
  };

  const handleRefreshStatus = async (inst: WhatsAppInstance) => {
    setRefreshingId(inst.id);
    try {
      const result = await callEvolutionApi("status", {}, { instanceName: inst.instance_name });
      toast.info(`Status: ${result.status}`);
      fetchInstances();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleLogout = async (inst: WhatsAppInstance) => {
    try {
      await callEvolutionApi("logout", { instanceName: inst.instance_name });
      toast.success("Desconectado com sucesso");
      fetchInstances();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (inst: WhatsAppInstance) => {
    if (!confirm(`Excluir instância "${inst.display_name || inst.instance_name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await callEvolutionApi("delete", { instanceName: inst.instance_name });
      toast.success("Instância removida");
      fetchInstances();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-display">Instâncias WhatsApp</CardTitle>
              <CardDescription>
                Gerencie suas conexões WhatsApp via Evolution API
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={fetchInstances} className="gap-1.5">
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                Atualizar
              </Button>
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Nova Instância
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Instância WhatsApp</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome da Instância (identificador)</Label>
                      <Input
                        value={newName}
                        onChange={e => setNewName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                        placeholder="ex: loja-principal"
                        className="font-mono text-sm"
                      />
                      <p className="text-[10px] text-muted-foreground">Apenas letras, números, - e _</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome de Exibição</Label>
                      <Input
                        value={newDisplayName}
                        onChange={e => setNewDisplayName(e.target.value)}
                        placeholder="ex: Loja Principal"
                        className="text-sm"
                      />
                    </div>
                    <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="w-full">
                      {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      Criar Instância
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* QR Code Modal */}
      {qrData && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-6 flex flex-col items-center gap-4">
            <div className="text-center">
              <h3 className="text-sm font-semibold">Escaneie o QR Code</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Siga os passos abaixo para conectar:
              </p>
            </div>
            {/* Step-by-step guide */}
            <div className="flex flex-col gap-2 text-xs text-muted-foreground w-full max-w-sm">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/30">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                Abra o <strong className="text-foreground">WhatsApp</strong> no celular
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/30">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                Vá em <strong className="text-foreground">Aparelhos conectados</strong>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/30">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                Aponte a câmera para o <strong className="text-foreground">QR Code</strong> abaixo
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl">
              <img
                src={qrData.qr.startsWith("data:") ? qrData.qr : `data:image/png;base64,${qrData.qr}`}
                alt="QR Code WhatsApp"
                className="w-64 h-64 object-contain"
              />
            </div>
            <Button size="sm" variant="ghost" onClick={() => setQrData(null)}>
              Fechar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instances List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : instances.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center">
            <WifiOff className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma instância criada</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Nova Instância" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {instances.map((inst) => {
            const sc = statusConfig[inst.status] || statusConfig.created;
            return (
              <Card key={inst.id} className="group hover:border-border/60 transition-all">
                <CardContent className="pt-5 pb-4 space-y-3">
                  {/* Status + Name */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {inst.profile_pic_url ? (
                        <img
                          src={inst.profile_pic_url}
                          alt={inst.display_name || inst.instance_name}
                          className="h-9 w-9 rounded-full object-cover shrink-0 border border-border/40"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {inst.display_name || inst.instance_name}
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                          {inst.instance_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className={cn("h-2 w-2 rounded-full", sc.color, inst.status === "connected" && "animate-pulse")} />
                      <span className="text-[10px] font-medium text-muted-foreground">{sc.text}</span>
                    </div>
                  </div>

                  {/* Phone */}
                  {inst.phone_number && (
                    <p className="text-xs text-muted-foreground font-mono">📱 {inst.phone_number}</p>
                  )}

                  {/* Connected at */}
                  {inst.connected_at && (
                    <p className="text-[10px] text-muted-foreground/60">
                      Conectado em {new Date(inst.connected_at).toLocaleString("pt-BR")}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {inst.status !== "connected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleConnect(inst)}
                        disabled={connectingId === inst.id}
                      >
                        {connectingId === inst.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <QrCode className="h-3 w-3" />
                        )}
                        Conectar
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleRefreshStatus(inst)}
                      disabled={refreshingId === inst.id}
                    >
                      <RefreshCw className={cn("h-3 w-3", refreshingId === inst.id && "animate-spin")} />
                    </Button>

                    {inst.status === "connected" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1 text-amber-600"
                        onClick={() => handleLogout(inst)}
                      >
                        <LogOut className="h-3 w-3" /> Desconectar
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1 text-destructive opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                      onClick={() => handleDelete(inst)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

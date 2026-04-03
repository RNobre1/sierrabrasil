import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Plus, Trash2, QrCode, CheckCircle2, XCircle, AlertTriangle, Wifi, WifiOff, LogOut, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  attendant_id: string | null;
  connected_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface Attendant {
  id: string;
  name: string;
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

const QR_LIFETIME_SECONDS = 40;
const CONNECTING_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export default function WhatsAppTab({ plan }: { plan: string }) {
  const { user } = useAuth();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [qrData, setQrData] = useState<{ instanceName: string; qr: string } | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(0);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [deletingInstance, setDeletingInstance] = useState<WhatsAppInstance | null>(null);

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

  // Fetch attendants for agent binding (scoped to user's tenant)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("owner_id", user.id)
        .single();
      if (!tenant) return;
      const { data } = await supabase
        .from("attendants")
        .select("id, name")
        .eq("tenant_id", tenant.id);
      if (data) setAttendants(data);
    })();
  }, [user]);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  // QR code countdown timer
  useEffect(() => {
    if (!qrData) return;
    setQrSecondsLeft(QR_LIFETIME_SECONDS);
    const interval = setInterval(() => {
      setQrSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [qrData?.instanceName, qrData?.qr]);

  // Poll status for connecting instances + auto-expire stale ones
  useEffect(() => {
    const connectingInstances = instances.filter(i => i.status === "connecting");
    if (connectingInstances.length === 0) return;

    // On mount, auto-expire instances stuck in "connecting" for > 2 minutes
    for (const inst of connectingInstances) {
      const updatedAt = new Date(inst.updated_at).getTime();
      if (Date.now() - updatedAt > CONNECTING_TIMEOUT_MS) {
        callEvolutionApi("status", {}, { instanceName: inst.instance_name })
          .then(() => fetchInstances())
          .catch(console.error);
      }
    }

    const interval = setInterval(async () => {
      for (const inst of connectingInstances) {
        try {
          const result = await callEvolutionApi("status", {}, { instanceName: inst.instance_name });
          if (result.status === "connected") {
            toast.success(`${inst.display_name || inst.instance_name} conectado!`);
            setQrData(null);
            fetchInstances();
          } else if (result.status === "disconnected") {
            fetchInstances();
          }
        } catch (e) {
          console.error("Poll error:", e);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [instances, fetchInstances]);

  // Check if there's an available agent (no number assigned yet)
  const availableAgents = attendants.filter(
    a => !instances.some(i => i.attendant_id === a.id)
  );

  const handleCreate = async () => {
    if (!newDisplayName.trim()) return;
    if (availableAgents.length === 0) {
      toast.error("Todos os seus agentes já possuem um número vinculado. Crie um novo agente primeiro.");
      return;
    }
    setCreating(true);
    try {
      // Auto-generate instance identifier from display name
      const instanceName = newDisplayName
        .trim()
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
      await callEvolutionApi("create_instance", {
        instanceName,
        displayName: newDisplayName.trim(),
      });
      // Auto-assign to first available agent
      if (availableAgents.length > 0) {
        await supabase
          .from("whatsapp_instances")
          .update({ attendant_id: availableAgents[0].id })
          .eq("instance_name", instanceName);
      }
      toast.success("Número adicionado com sucesso!");
      setShowCreate(false);
      setNewDisplayName("");
      fetchInstances();
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar número");
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

  const handleChangeAgent = async (inst: WhatsAppInstance, attendantId: string) => {
    // 1. Update instance binding
    const { error } = await supabase
      .from("whatsapp_instances")
      .update({ attendant_id: attendantId })
      .eq("id", inst.id);
    if (error) {
      toast.error("Erro ao vincular agente");
      return;
    }

    // 2. Archive active conversations from the OLD agent (so new messages go to new agent)
    if (inst.attendant_id && inst.attendant_id !== attendantId) {
      await supabase
        .from("conversations")
        .update({ status: "resolved", ended_at: new Date().toISOString() })
        .eq("tenant_id", inst.tenant_id)
        .eq("attendant_id", inst.attendant_id)
        .eq("status", "active");
    }

    const agentName = attendants.find(a => a.id === attendantId)?.name || "Agente";
    toast.success(`Número vinculado a ${agentName}. Conversas ativas do agente anterior foram encerradas.`);
    fetchInstances();
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
    try {
      await callEvolutionApi("delete", { instanceName: inst.instance_name });
      toast.success("Número removido");
      fetchInstances();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeletingInstance(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-display">Números WhatsApp</CardTitle>
              <CardDescription>
                Gerencie os números conectados ao seu agente
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={fetchInstances} className="gap-1.5">
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                Atualizar
              </Button>
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5" disabled={availableAgents.length === 0} title={availableAgents.length === 0 ? "Todos os agentes já possuem um número. Crie um novo agente primeiro." : undefined}>
                    <Plus className="h-3.5 w-3.5" /> Adicionar número
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar número WhatsApp</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome do número</Label>
                      <Input
                        value={newDisplayName}
                        onChange={e => setNewDisplayName(e.target.value)}
                        placeholder="ex: Loja Principal"
                        className="text-sm"
                      />
                      <p className="text-[10px] text-muted-foreground">Um nome para identificar este WhatsApp</p>
                    </div>
                    {availableAgents.length > 0 && (
                      <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                          Este número será usado pelo agente <span className="font-medium text-foreground">{availableAgents[0].name}</span>
                        </p>
                      </div>
                    )}
                    <Button onClick={handleCreate} disabled={creating || !newDisplayName.trim()} className="w-full">
                      {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      Adicionar
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
              <h3 className="text-sm font-semibold">
                {qrSecondsLeft > 0 ? "Escaneie o QR Code" : "QR Code expirado"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {qrSecondsLeft > 0
                  ? "Siga os passos abaixo para conectar:"
                  : "O QR Code expirou. Gere um novo para conectar."}
              </p>
            </div>

            {qrSecondsLeft > 0 && (
              <>
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

                {/* Timer */}
                <div className={cn(
                  "text-xs font-medium px-3 py-1 rounded-full",
                  qrSecondsLeft > 10 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                )}>
                  Expira em {qrSecondsLeft}s
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm">
                  <img
                    src={qrData.qr.startsWith("data:") ? qrData.qr : `data:image/png;base64,${qrData.qr}`}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64 object-contain"
                    style={{ filter: "grayscale(100%) contrast(1.5)" }}
                  />
                </div>
              </>
            )}

            {qrSecondsLeft === 0 && (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <RefreshCw className="h-7 w-7 text-muted-foreground" />
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const inst = instances.find(i => i.instance_name === qrData.instanceName);
                    if (inst) {
                      setQrData(null);
                      handleConnect(inst);
                    }
                  }}
                  className="gap-1.5"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  Gerar novo QR Code
                </Button>
              </div>
            )}

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
            <p className="text-sm text-muted-foreground">Nenhum número conectado</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Adicionar número" para começar</p>
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
                        {inst.phone_number && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {inst.phone_number}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className={cn("h-2 w-2 rounded-full", sc.color, inst.status === "connected" && "animate-pulse")} />
                      <span className="text-[10px] font-medium text-muted-foreground">{sc.text}</span>
                    </div>
                  </div>

                  {/* Agent binding */}
                  <div className="flex items-center gap-2 text-[11px]" data-tour="channels-agent-binding">
                    <span className="text-muted-foreground">Agente:</span>
                    {attendants.length <= 1 ? (
                      <span className="font-medium text-foreground">
                        {attendants.find(a => a.id === inst.attendant_id)?.name || attendants[0]?.name || "Nenhum"}
                      </span>
                    ) : (
                      <Select value={inst.attendant_id || ""} onValueChange={(val) => handleChangeAgent(inst, val)}>
                        <SelectTrigger className="h-7 w-auto text-[11px] bg-muted border-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {attendants.map(a => (
                            <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

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
                      onClick={() => setDeletingInstance(inst)}
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
      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingInstance} onOpenChange={(open) => !open && setDeletingInstance(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover numero</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{deletingInstance?.display_name || deletingInstance?.instance_name}"? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingInstance && handleDelete(deletingInstance)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

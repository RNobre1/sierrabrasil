import { useState } from "react";
import { RefreshCw, CheckCircle2, XCircle, Instagram, MessageSquare, Users, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type ConnectionStatus = "connected" | "disconnected";

export default function InstagramTab() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [pageId, setPageId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1200));
    if (pageId && accessToken) setStatus("connected");
    setRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* Connection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-display">Conexão Instagram</CardTitle>
              <CardDescription>Conecte sua conta profissional do Instagram</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-card">
                <div className={`h-2 w-2 rounded-full ${status === "connected" ? "bg-meteora-green animate-pulse-dot" : "bg-muted-foreground/50"}`} />
                <span className="text-xs font-medium">{status === "connected" ? "Conectado" : "Desconectado"}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Page ID</Label>
              <Input value={pageId} onChange={e => setPageId(e.target.value)} placeholder="ID da página do Facebook vinculada" className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Access Token</Label>
              <Input type="password" value={accessToken} onChange={e => setAccessToken(e.target.value)} placeholder="Token de acesso..." className="font-mono text-xs" />
            </div>
          </div>
          <Button size="sm" onClick={handleRefresh} disabled={!pageId || !accessToken}>
            Conectar
          </Button>
        </CardContent>
      </Card>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Visão Geral</CardTitle>
          <CardDescription>Métricas básicas da sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-border/30 bg-card/30 p-4 text-center">
              <MessageSquare className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">—</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">DMs Recebidas</p>
            </div>
            <div className="rounded-xl border border-border/30 bg-card/30 p-4 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">—</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Seguidores</p>
            </div>
            <div className="rounded-xl border border-border/30 bg-card/30 p-4 text-center">
              <Image className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">—</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Posts</p>
            </div>
          </div>
          {status === "disconnected" && (
            <p className="text-xs text-muted-foreground text-center mt-4">Conecte sua conta para visualizar as métricas</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

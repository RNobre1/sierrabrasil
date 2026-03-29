import { useState } from "react";
import { Brain, Trash2, Lock, Zap, Database, Clock, Shield, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
import { useToast } from "@/hooks/use-toast";

const PLAN_MEMORY: Record<string, { maxConversations: number; retentionDays: number; contextWindow: number; label: string }> = {
  starter: { maxConversations: 100, retentionDays: 7, contextWindow: 5, label: "Starter" },
  professional: { maxConversations: 1000, retentionDays: 30, contextWindow: 15, label: "Profissional" },
  business: { maxConversations: 10000, retentionDays: 90, contextWindow: 30, label: "Empresarial" },
  enterprise: { maxConversations: -1, retentionDays: 365, contextWindow: 50, label: "Enterprise" },
};

interface Props {
  agentId: string;
  plan: string;
}

export default function AgentMemoryTab({ agentId, plan }: Props) {
  const limits = PLAN_MEMORY[plan] || PLAN_MEMORY.starter;
  const isUnlimited = limits.maxConversations === -1;
  const { toast } = useToast();

  // Mock state
  const [rememberClients, setRememberClients] = useState(true);
  const [contextMessages, setContextMessages] = useState(Math.min(10, limits.contextWindow));
  const [autoForget, setAutoForget] = useState(true);
  const usedConversations = 47; // mock

  const clearMemory = () => {
    toast({ title: "Memória limpa", description: "Todas as conversas anteriores foram removidas do contexto do agente." });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> Memória do Agente
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Controle o que seu agente lembra entre conversas
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono capitalize border-border/40">
          {limits.label}
        </Badge>
      </div>

      {/* Usage */}
      <Card className="border-border/30 bg-card/50">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Database className="h-3 w-3" /> Conversas armazenadas
            </span>
            <span>{usedConversations}/{isUnlimited ? "∞" : limits.maxConversations}</span>
          </div>
          <Progress value={isUnlimited ? 5 : (usedConversations / limits.maxConversations) * 100} className="h-1.5" />
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{usedConversations}</p>
              <p className="text-[9px] text-muted-foreground">Conversas</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{limits.retentionDays}d</p>
              <p className="text-[9px] text-muted-foreground">Retenção</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{contextMessages}</p>
              <p className="text-[9px] text-muted-foreground">Contexto</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="border-border/30 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display">Configurações de Memória</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Remember clients */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-foreground">Lembrar clientes</p>
              <p className="text-[10px] text-muted-foreground">O agente reconhece clientes que já conversaram antes</p>
            </div>
            <Switch checked={rememberClients} onCheckedChange={setRememberClients} />
          </div>

          {/* Context window */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">Janela de contexto</p>
                <p className="text-[10px] text-muted-foreground">
                  Quantas mensagens anteriores o agente considera ({contextMessages} de {limits.contextWindow} máx)
                </p>
              </div>
              {contextMessages >= limits.contextWindow && plan !== "enterprise" && (
                <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1 border-[hsl(var(--meteora-cyan))]/20 text-[hsl(var(--meteora-cyan))] hover:bg-[hsl(var(--meteora-cyan))]/5">
                  <Zap className="h-3 w-3" /> Expandir
                </Button>
              )}
            </div>
            <Slider
              value={[contextMessages]}
              onValueChange={v => setContextMessages(v[0])}
              min={1}
              max={limits.contextWindow}
              step={1}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Mínimo (1)</span>
              <span>Máximo ({limits.contextWindow})</span>
            </div>
          </div>

          {/* Auto-forget */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-muted-foreground" /> Auto-limpeza
              </p>
              <p className="text-[10px] text-muted-foreground">
                Apaga conversas automaticamente após {limits.retentionDays} dias
                {plan === "starter" && " (fixo no plano Starter)"}
              </p>
            </div>
            <Switch
              checked={autoForget}
              onCheckedChange={setAutoForget}
              disabled={plan === "starter"}
            />
          </div>

          {/* Retention upgrade */}
          {plan !== "enterprise" && (
            <div className="rounded-lg bg-muted/20 border border-border/20 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[11px] text-foreground font-medium">Retenção estendida</p>
                  <p className="text-[10px] text-muted-foreground">Até 365 dias no plano Enterprise</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-[hsl(var(--meteora-cyan))]/20 text-[hsl(var(--meteora-cyan))] hover:bg-[hsl(var(--meteora-cyan))]/5">
                <Zap className="h-3 w-3" /> Upgrade
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Zona de Perigo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-foreground">Limpar toda a memória</p>
              <p className="text-[10px] text-muted-foreground">Remove todas as conversas armazenadas. Ação irreversível.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="h-7 text-[10px] gap-1">
                  <Trash2 className="h-3 w-3" /> Limpar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar memória do agente?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é irreversível. Todas as conversas armazenadas serão apagadas e o agente não reconhecerá clientes anteriores.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={clearMemory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Limpar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

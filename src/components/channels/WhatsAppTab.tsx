import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Plus, Trash2, Send, Upload, Calendar, Lock, CheckCircle2, XCircle, Clock, Eye, MailCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UpgradeGate from "@/components/UpgradeGate";

type ConnectionStatus = "connected" | "disconnected" | "error";

interface Template {
  id: string;
  name: string;
  status: "approved" | "pending" | "rejected";
  category: string;
  language: string;
  body: string;
  sent: number;
  delivered: number;
  read: number;
}

const mockTemplates: Template[] = [
  { id: "1", name: "boas_vindas", status: "approved", category: "MARKETING", language: "pt_BR", body: "Olá {{1}}, bem-vindo(a) à {{2}}! 🎉", sent: 1240, delivered: 1198, read: 876 },
  { id: "2", name: "agendamento_confirmacao", status: "approved", category: "UTILITY", language: "pt_BR", body: "{{1}}, seu agendamento para {{2}} está confirmado! ✅", sent: 890, delivered: 872, read: 654 },
  { id: "3", name: "promocao_mensal", status: "pending", category: "MARKETING", language: "pt_BR", body: "{{1}}, temos uma oferta especial para você! 🔥", sent: 0, delivered: 0, read: 0 },
];

export default function WhatsAppTab({ plan }: { plan: string }) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState("MARKETING");
  const [newTemplateBody, setNewTemplateBody] = useState("");

  // Bulk messaging
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");

  const isPremium = plan !== "starter";

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate API check
    await new Promise(r => setTimeout(r, 1500));
    setLastRefresh(new Date());
    if (phoneNumberId && apiToken) setStatus("connected");
    setRefreshing(false);
  }, [phoneNumberId, apiToken]);

  // Auto-refresh every 5 min
  useEffect(() => {
    const interval = setInterval(handleRefresh, 300000);
    return () => clearInterval(interval);
  }, [handleRefresh]);

  const statusConfig = {
    connected: { color: "bg-meteora-green", text: "Conectado", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    disconnected: { color: "bg-muted-foreground/50", text: "Desconectado", icon: <XCircle className="h-3.5 w-3.5" /> },
    error: { color: "bg-destructive", text: "Erro", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  };

  const sc = statusConfig[status];

  const handleCreateTemplate = () => {
    if (!newTemplateName || !newTemplateBody) return;
    setTemplates(prev => [...prev, {
      id: String(Date.now()),
      name: newTemplateName.toLowerCase().replace(/\s+/g, "_"),
      status: "pending",
      category: newTemplateCategory,
      language: "pt_BR",
      body: newTemplateBody,
      sent: 0, delivered: 0, read: 0,
    }]);
    setShowNewTemplate(false);
    setNewTemplateName("");
    setNewTemplateBody("");
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-display">Status da Conexão</CardTitle>
              <CardDescription>API do WhatsApp Business</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-card">
                <div className={`h-2 w-2 rounded-full ${sc.color} ${status === "connected" ? "animate-pulse-dot" : ""}`} />
                <span className="text-xs font-medium text-foreground">{sc.text}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "" : "Atualizar"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Phone Number ID</Label>
              <Input value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} placeholder="Ex: 123456789..." className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Business Account ID</Label>
              <Input value={businessAccountId} onChange={e => setBusinessAccountId(e.target.value)} placeholder="Ex: 987654321..." className="font-mono text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">API Token</Label>
            <Input type="password" value={apiToken} onChange={e => setApiToken(e.target.value)} placeholder="EAA..." className="font-mono text-xs" />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground font-mono">
              Último refresh: {lastRefresh.toLocaleTimeString("pt-BR")} · Auto-refresh a cada 5min
            </p>
            <Button size="sm" onClick={handleRefresh} disabled={!phoneNumberId || !apiToken}>
              Conectar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-display">Templates de Mensagem</CardTitle>
              <CardDescription>{templates.length} templates configurados</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowNewTemplate(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Novo Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showNewTemplate && (
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome do Template</Label>
                  <Input value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} placeholder="ex: lembrete_pagamento" className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Categoria</Label>
                  <Select value={newTemplateCategory} onValueChange={setNewTemplateCategory}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="UTILITY">Utilidade</SelectItem>
                      <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Corpo da Mensagem</Label>
                <Textarea value={newTemplateBody} onChange={e => setNewTemplateBody(e.target.value)} placeholder="Use {{1}}, {{2}} para variáveis..." rows={3} className="text-sm" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setShowNewTemplate(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleCreateTemplate} className="gap-1.5">
                  <Send className="h-3 w-3" /> Enviar para Aprovação
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {templates.map((t) => {
              const readRate = t.delivered > 0 ? Math.round((t.read / t.delivered) * 100) : 0;
              return (
                <div key={t.id} className="group rounded-xl border border-border/30 bg-card/30 p-4 hover:border-border/60 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground font-mono">{t.name}</span>
                        <Badge
                          variant={t.status === "approved" ? "default" : t.status === "pending" ? "secondary" : "destructive"}
                          className="text-[9px]"
                        >
                          {t.status === "approved" ? "✓ Aprovado" : t.status === "pending" ? "⏳ Pendente" : "✕ Rejeitado"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.category} · {t.language}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive/60 hover:text-destructive h-7 w-7 p-0" onClick={() => handleDeleteTemplate(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 mb-3 font-mono">{t.body}</p>
                  <div className="flex gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Send className="h-3 w-3" /> {t.sent.toLocaleString()} envios</span>
                    <span className="flex items-center gap-1"><MailCheck className="h-3 w-3" /> {t.delivered.toLocaleString()} entregas</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {t.read.toLocaleString()} leituras</span>
                    <span className="flex items-center gap-1 font-medium text-foreground">{readRate}% leitura</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Messaging */}
      <div className="relative">
        <Card className={!isPremium ? "opacity-60 pointer-events-none select-none" : ""}>
          <CardHeader>
            <CardTitle className="text-base font-display">Envio em Massa</CardTitle>
            <CardDescription>Envie mensagens para múltiplos contatos de uma vez</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Template da Mensagem</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                  <SelectContent>
                    {templates.filter(t => t.status === "approved").map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Agendar Envio</Label>
                <Input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mensagem personalizada</Label>
              <Textarea value={bulkMessage} onChange={e => setBulkMessage(e.target.value)} placeholder="Olá {nome}, temos uma novidade para você..." rows={3} className="text-sm" />
              <p className="text-[10px] text-muted-foreground">Use {"{nome}"} para personalizar com o nome do contato</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Planilha de Contatos</Label>
              <div className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center hover:border-primary/30 transition-colors cursor-pointer">
                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Arraste um arquivo CSV ou XLSX aqui</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Colunas: nome, telefone</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Agendar
              </Button>
              <Button className="gap-1.5 bg-gradient-to-r from-primary to-primary/80">
                <Send className="h-3.5 w-3.5" /> Enviar Agora
              </Button>
            </div>
          </CardContent>
        </Card>
        {!isPremium && <UpgradeGate message="Para usar envio em massa, faça upgrade do seu plano" />}
      </div>
    </div>
  );
}

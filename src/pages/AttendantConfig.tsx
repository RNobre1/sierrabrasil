import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, ArrowLeft, Power, PowerOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CHANNELS = ["whatsapp", "instagram", "web"] as const;

export default function AttendantConfig() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendantId, setAttendantId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [instructions, setInstructions] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState(0.7);
  const [channels, setChannels] = useState<string[]>([]);
  const [status, setStatus] = useState("offline");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("owner_id", user.id).single();
      if (!tenant) { setLoading(false); return; }

      const { data: att } = await supabase.from("attendants").select("*").eq("tenant_id", tenant.id).limit(1).single();
      if (att) {
        setAttendantId(att.id);
        setName(att.name);
        setPersona(att.persona ?? "");
        setInstructions(att.instructions ?? "");
        setModel(att.model ?? "gpt-4o-mini");
        setTemperature(att.temperature ?? 0.7);
        setChannels(att.channels ?? []);
        setStatus(att.status);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleSave = async () => {
    if (!attendantId) return;
    setSaving(true);
    const { error } = await supabase.from("attendants").update({
      name, persona, instructions, model, temperature, channels, status,
    }).eq("id", attendantId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvo!", description: "Configurações do atendente atualizadas." });
    }
  };

  const toggleChannel = (ch: string) => {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  const toggleStatus = async () => {
    const newStatus = status === "online" ? "offline" : "online";
    setStatus(newStatus);
    if (attendantId) {
      await supabase.from("attendants").update({ status: newStatus }).eq("id", attendantId);
      toast({ title: newStatus === "online" ? "Atendente ativado!" : "Atendente pausado" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!attendantId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-lg">Nenhum atendente encontrado</p>
        <p className="text-sm mt-2">Faça logout e login novamente para provisionar seu atendente automaticamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-semibold">Configurar Atendente</h1>
            <p className="text-sm text-muted-foreground mt-1">Personalize o comportamento do seu atendente IA</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={status === "online" ? "destructive" : "default"} size="sm" onClick={toggleStatus}>
            {status === "online" ? <><PowerOff className="h-4 w-4 mr-1" /> Pausar</> : <><Power className="h-4 w-4 mr-1" /> Ativar</>}
          </Button>
          <Badge variant={status === "online" ? "default" : "secondary"}>
            {status === "online" ? "● Online" : "○ Offline"}
          </Badge>
        </div>
      </div>

      {/* Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Identidade</CardTitle>
          <CardDescription>Nome e personalidade do atendente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do atendente</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Luna, Sofia, Max" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="persona">Persona / Tom de voz</Label>
            <Input id="persona" value={persona} onChange={e => setPersona(e.target.value)} placeholder="Ex: Assistente simpática e profissional" />
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Instruções</CardTitle>
          <CardDescription>Regras e contexto para o atendente. Descreva seu negócio, produtos, horários e regras de atendimento.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="Você é a atendente virtual da minha clínica de estética. Nossos serviços são: limpeza de pele (R$120), peeling (R$250)..."
            rows={8}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">{instructions.length} caracteres</p>
        </CardContent>
      </Card>

      {/* Model Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Modelo de IA</CardTitle>
          <CardDescription>Configurações do modelo que alimenta as respostas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini (rápido, econômico)</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o (equilibrado)</SelectItem>
                <SelectItem value="claude-sonnet">Claude Sonnet (conversacional)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Temperatura: {temperature.toFixed(1)}</Label>
            <Slider value={[temperature]} onValueChange={v => setTemperature(v[0])} min={0} max={1} step={0.1} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Preciso (0.0)</span>
              <span>Criativo (1.0)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Canais</CardTitle>
          <CardDescription>Em quais canais o atendente opera</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {CHANNELS.map(ch => (
              <label key={ch} className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={channels.includes(ch)} onCheckedChange={() => toggleChannel(ch)} />
                <span className="text-sm capitalize">{ch}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </div>
  );
}

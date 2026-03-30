import { useState, useMemo } from "react";
import { Save, Check, Brain, Smile, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const CHANNELS = ["whatsapp", "instagram", "web"] as const;

const CONVERSATION_MODES = [
  { id: "precise", label: "Preciso", desc: "Respostas objetivas e técnicas", icon: Brain, model: "google/gemini-2.5-pro", temperature: 0.3 },
  { id: "friendly", label: "Amigável", desc: "Tom leve e simpático", icon: Smile, model: "google/gemini-3-flash-preview", temperature: 0.7 },
  { id: "formal", label: "Formal", desc: "Linguagem corporativa", icon: Briefcase, model: "openai/gpt-5-mini", temperature: 0.4 },
] as const;

function detectMode(model: string | null, temp: number | null): string {
  const m = model ?? "";
  const t = temp ?? 0.7;
  if (m.includes("2.5-pro") && t <= 0.4) return "precise";
  if (m.includes("gpt-5") && t <= 0.5) return "formal";
  return "friendly";
}

interface AgentConfigTabProps {
  agent: any;
  onUpdate: (values: any) => void;
}

export default function AgentConfigTab({ agent, onUpdate }: AgentConfigTabProps) {
  const [name, setName] = useState(agent.name);
  const [persona, setPersona] = useState(agent.persona ?? "");
  const [instructions, setInstructions] = useState(agent.instructions ?? "");
  const [mode, setMode] = useState(() => detectMode(agent.model, agent.temperature));
  const [channels, setChannels] = useState<string[]>(agent.channels ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedMode = CONVERSATION_MODES.find(m => m.id === mode) ?? CONVERSATION_MODES[1];

  const isDirty = useMemo(() => {
    const origMode = detectMode(agent.model, agent.temperature);
    return name !== agent.name || persona !== (agent.persona ?? "") || instructions !== (agent.instructions ?? "") ||
      mode !== origMode ||
      JSON.stringify([...channels].sort()) !== JSON.stringify([...(agent.channels ?? [])].sort());
  }, [name, persona, instructions, mode, channels, agent]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const { error } = await supabase.from("attendants").update({
      name, persona, instructions, model: selectedMode.model, temperature: selectedMode.temperature, channels,
    }).eq("id", agent.id);
    setSaving(false);
    if (!error) {
      setSaved(true);
      onUpdate({ name, persona, instructions, model: selectedMode.model, temperature: selectedMode.temperature, channels });
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const toggleChannel = (ch: string) => {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Identity */}
      <Card className="border-border/30 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display">Identidade</CardTitle>
          <CardDescription className="text-xs">Nome e personalidade do agente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do agente</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Luna, Sofia, Max" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Persona / Tom de voz</Label>
            <Input value={persona} onChange={e => setPersona(e.target.value)} placeholder="Ex: Assistente simpática e profissional" className="text-sm" />
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="border-border/30 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display">Instruções</CardTitle>
          <CardDescription className="text-xs">Regras e contexto para o agente</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="Você é o agente virtual da minha clínica..."
            rows={6}
            className="font-mono text-xs"
          />
          <p className="text-[10px] text-muted-foreground mt-1.5">{instructions.length} caracteres</p>
        </CardContent>
      </Card>

      {/* Conversation Mode */}
      <Card className="border-border/30 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display">Modo de Conversa</CardTitle>
          <CardDescription className="text-xs">Define o tom e estilo das respostas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {CONVERSATION_MODES.map(m => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    active
                      ? "border-primary/40 bg-primary/10 ring-1 ring-primary/20"
                      : "border-border/30 bg-card/30 hover:border-border/50 hover:bg-card/50"
                  }`}
                >
                  <m.icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}>{m.label}</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Channels */}
      <Card className="border-border/30 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display">Canais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {CHANNELS.map(ch => (
              <label key={ch} className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={channels.includes(ch)} onCheckedChange={() => toggleChannel(ch)} />
                <span className="text-xs capitalize">{ch}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3 pb-4">
        <Button onClick={handleSave} disabled={saving || !isDirty} size="sm" className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        <AnimatePresence>
          {saved && (
            <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
              <Check className="h-3.5 w-3.5" /> Salvo
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

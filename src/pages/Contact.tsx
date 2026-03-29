import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import meteoraLogo from "@/assets/meteora-branca.png";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [agents, setAgents] = useState("");
  const [volume, setVolume] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: send to backend
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto border border-primary/20">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Recebemos sua solicitação!</h1>
          <p className="text-sm text-muted-foreground">Nosso time entrará em contato em até 24 horas úteis para montar um plano sob medida para seu negócio.</p>
          <Link to="/">
            <Button variant="outline" className="mt-4 gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar ao site
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background meteora-noise">
      <div className="mx-auto max-w-xl px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <img src={meteoraLogo} alt="Meteora Digital" className="h-6 mb-8 opacity-80" />

        <h1 className="text-2xl font-bold text-foreground tracking-tight">Plano personalizado</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-8">
          Conte um pouco sobre sua operação e montamos o plano ideal para escalar seu negócio com IA.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Seu nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="João Silva" required className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email corporativo</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@empresa.com" required className="text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nome da empresa</Label>
            <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Sua empresa" required className="text-sm" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Quantos agentes IA precisa?</Label>
              <Select value={agents} onValueChange={setAgents}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5-10">5 a 10</SelectItem>
                  <SelectItem value="10-25">10 a 25</SelectItem>
                  <SelectItem value="25-50">25 a 50</SelectItem>
                  <SelectItem value="50-100">50 a 100</SelectItem>
                  <SelectItem value="100+">Mais de 100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Volume mensal de conversas</Label>
              <Select value={volume} onValueChange={setVolume}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5k-10k">5.000 a 10.000</SelectItem>
                  <SelectItem value="10k-50k">10.000 a 50.000</SelectItem>
                  <SelectItem value="50k-100k">50.000 a 100.000</SelectItem>
                  <SelectItem value="100k+">Mais de 100.000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">O que você precisa? (opcional)</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Conte sobre suas necessidades específicas, integrações, volume de atendimento..." rows={3} className="text-sm" />
          </div>

          <Button type="submit" className="w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-[hsl(var(--meteora-cyan))] text-white shadow-lg shadow-primary/20">
            <Send className="h-4 w-4" /> Solicitar Contato
          </Button>

          <p className="text-[10px] text-muted-foreground/60 text-center">Resposta em até 24h úteis · Sem compromisso</p>
        </form>
      </div>
    </div>
  );
}

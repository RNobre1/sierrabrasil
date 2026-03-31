import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone } from "lucide-react";

interface PhoneCollectStepProps {
  onSubmit: (phone: string) => void;
  userName?: string;
}

function formatWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function PhoneCollectStep({ onSubmit, userName }: PhoneCollectStepProps) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Numero invalido. Precisa ter pelo menos 10 digitos.");
      return;
    }
    setError("");
    onSubmit(`+55${digits}`);
  };

  return (
    <div className="flex flex-col items-center text-center space-y-6 px-4 py-8 max-w-sm mx-auto">
      <div className="h-14 w-14 rounded-2xl bg-cosmos-emerald/10 flex items-center justify-center">
        <Phone className="h-7 w-7 text-cosmos-emerald" />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-display font-semibold text-foreground">
          {userName ? `Oi, ${userName}!` : "Quase la!"} Qual seu WhatsApp?
        </h2>
        <p className="text-sm text-muted-foreground">
          Precisamos do seu numero pra conectar o agente ao WhatsApp do seu negocio.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5" /> +55
          </span>
          <Input
            value={phone}
            onChange={(e) => { setPhone(formatWhatsApp(e.target.value)); setError(""); }}
            placeholder="(00) 00000-0000"
            className="h-12 rounded-xl bg-secondary/50 border-border/50 pl-16 text-sm"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full h-11 rounded-xl">
          Continuar
        </Button>
      </form>
    </div>
  );
}

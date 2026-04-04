import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { ArrowRight, Building2, Phone } from "lucide-react";
import { motion } from "framer-motion";

interface GoogleCompanyStepProps {
  userName: string;
  onSubmit: (companyName: string, whatsapp: string) => void;
}

export default function GoogleCompanyStep({ userName, onSubmit }: GoogleCompanyStepProps) {
  const [companyName, setCompanyName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappDigits, setWhatsappDigits] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || whatsappDigits.length < 10) return;
    onSubmit(companyName, whatsapp);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="space-y-1.5">
        <h2 className="text-xl font-display font-bold tracking-tight text-foreground">
          Olá, {userName?.split(" ")[0]}! 👋
        </h2>
        <p className="text-sm text-muted-foreground">
          Só mais alguns dados para configurar sua conta
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="company" className="text-xs font-medium text-muted-foreground">
            <Building2 className="inline h-3 w-3 mr-1" />
            Empresa
          </Label>
          <Input
            id="company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            placeholder="Nome da sua empresa"
            className="h-11 rounded-xl bg-secondary/50 border-border/50 text-sm placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="whatsapp" className="text-xs font-medium text-muted-foreground">
            <Phone className="inline h-3 w-3 mr-1" />
            WhatsApp
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-muted-foreground">
              +55
            </span>
            <PhoneInput
              id="whatsapp"
              value={whatsapp}
              onAccept={(val, unmasked) => { setWhatsapp(val); setWhatsappDigits(unmasked); }}
              required
              className="h-11 rounded-xl bg-secondary/50 border-border/50 pl-12 text-sm placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="group w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-medium shadow-lg shadow-primary/20 transition-all"
          disabled={!companyName.trim() || whatsappDigits.length < 10}
        >
          Continuar
          <span className="relative ml-2 inline-flex items-center justify-center h-6 w-6 rounded-md bg-white/10 shadow-[0_0_8px_rgba(255,255,255,0.15)] group-hover:translate-x-0.5 transition-all duration-300">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Button>
      </form>
    </motion.div>
  );
}

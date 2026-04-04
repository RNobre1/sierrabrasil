import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, ArrowRight, RotateCcw, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface WhatsAppOTPStepProps {
  phone: string;
  onVerified: () => void;
  onBack: () => void;
}

export default function WhatsAppOTPStep({ phone, onVerified, onBack }: WhatsAppOTPStepProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    text.split("").forEach((char, i) => { newOtp[i] = char; });
    setOtp(newOtp);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Digite o código completo"); return; }
    setVerifying(true);
    // Mock verification — accepts any 6-digit code
    await new Promise((r) => setTimeout(r, 1500));
    setVerifying(false);
    onVerified();
  };

  const handleResend = () => {
    setTimer(60);
    setOtp(["", "", "", "", "", ""]);
    setError("");
    inputRefs.current[0]?.focus();
  };

  const maskedPhone = phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$4").replace(/(\d{3})(\d)/, "$1•$2").slice(0, -2) + "••";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <Phone className="h-6 w-6 text-emerald-500" />
        </div>
        <h3 className="text-lg font-display font-bold text-foreground">Verificação WhatsApp</h3>
        <p className="text-sm text-muted-foreground">
          Enviamos um código de 6 dígitos para<br />
          <span className="font-medium text-foreground">+55 {maskedPhone}</span>
        </p>
      </div>

      <div className="flex justify-center gap-2">
        {otp.map((digit, i) => (
          <Input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            maxLength={1}
            inputMode="numeric"
            className={`w-11 h-13 text-center text-lg font-semibold rounded-xl border-border/60 bg-secondary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
              error ? "border-destructive/50" : ""
            }`}
          />
        ))}
      </div>

      {error && <p className="text-xs text-destructive text-center">{error}</p>}

      <Button
        onClick={handleVerify}
        disabled={verifying || otp.join("").length < 6}
        className="group w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 font-medium shadow-lg shadow-emerald-500/20 transition-all text-white"
      >
        {verifying ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <ShieldCheck className="h-4 w-4 mr-2" />
            Verificar número
          </>
        )}
      </Button>

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Alterar número
        </button>
        {timer > 0 ? (
          <span className="text-xs text-muted-foreground">
            Reenviar em <span className="font-medium text-foreground">{timer}s</span>
          </span>
        ) : (
          <button onClick={handleResend} className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
            <RotateCcw className="h-3 w-3" /> Reenviar código
          </button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
        Ao verificar, você confirma que este número é seu e aceita receber mensagens da plataforma via WhatsApp.
      </p>
    </motion.div>
  );
}

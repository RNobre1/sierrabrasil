import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { maskPhoneForOtp } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, ShieldCheck, RotateCcw, Zap, Brain, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import PhoneCollectStep from "@/components/onboarding/PhoneCollectStep";
import meteoraLogo from "@/assets/meteora-branca.png";
import meteoraLogoPreta from "@/assets/meteora-preta.png";

function Particles({ count = 40 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width / dpr,
      y: Math.random() * canvas.height / dpr,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.4 + 0.1,
    }));
    const draw = () => {
      const w = canvas.width / dpr, h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, [count]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

export default function VerifyPhone() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phone, setPhone] = useState("");
  const [collectingPhone, setCollectingPhone] = useState(false);
  const sendingOtp = useRef(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Set phone from user metadata, or flag for collection (Google OAuth)
  useEffect(() => {
    if (!user) return;
    const savedPhone = user.user_metadata?.whatsapp || "";
    if (savedPhone) {
      setPhone(savedPhone);
    } else {
      setCollectingPhone(true);
    }
  }, [user]);

  // Redirect to login if no session
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user]);

  // Send OTP once we have a phone (guard against double-fire + already-verified redirect)
  useEffect(() => {
    if (!user || !phone || otpSent || collectingPhone || sendingOtp.current) return;
    sendingOtp.current = true;
    // Check if already verified (prevents resend on redirect loop from onboarding guard)
    supabase
      .from("profiles")
      .select("phone_verified")
      .eq("user_id", user.id)
      .single()
      .then(async ({ data }) => {
        if (data?.phone_verified) {
          // Check if user already completed onboarding (has a configured attendant)
          const { data: att } = await supabase
            .from("attendants")
            .select("id, status")
            .eq("status", "online")
            .limit(1)
            .maybeSingle();
          if (att) {
            navigate("/dashboard");
          } else {
            navigate("/onboarding");
          }
        } else {
          sendOtp();
        }
      })
      .catch(() => {
        sendOtp();
      });
  }, [user, phone, collectingPhone]);

  // Handle phone submission from Google OAuth users
  async function handlePhoneCollected(collectedPhone: string) {
    setPhone(collectedPhone);
    setCollectingPhone(false);
    // Save phone to user metadata
    await supabase.auth.updateUser({
      data: { whatsapp: collectedPhone },
    });
  }

  async function sendOtp() {
    const { error } = await supabase.functions.invoke("send-otp", {
      body: { phone },
    });
    if (error) {
      toast({ title: "Erro ao enviar código", description: error.message, variant: "destructive" });
    } else {
      setOtpSent(true);
      setTimer(60);
    }
  }

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Auto-focus first input
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
    setError("");

    const { data, error: invokeError } = await supabase.functions.invoke("verify-otp", {
      body: { code },
    });

    setVerifying(false);

    if (invokeError) {
      setError(invokeError.message || "Erro ao verificar");
      return;
    }

    if (data?.error) {
      setError(data.error);
      return;
    }

    if (data?.success) {
      // Check if user already completed onboarding (returning user on new device)
      const { data: att } = await supabase
        .from("attendants")
        .select("id, status")
        .eq("status", "online")
        .limit(1)
        .maybeSingle();

      if (att) {
        toast({ title: "Número verificado!", description: "Bem-vindo de volta!" });
        navigate("/dashboard");
      } else {
        toast({ title: "Número verificado!", description: "Vamos configurar seu agente." });
        navigate("/onboarding");
      }
    }
  };

  const handleResend = () => {
    setOtp(["", "", "", "", "", ""]);
    setError("");
    inputRefs.current[0]?.focus();
    sendOtp();
  };

  const handleChangeNumber = () => {
    navigate("/signup");
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden"
        style={{ background: "linear-gradient(160deg, hsl(225 80% 28%), hsl(225 75% 18%), hsl(222 30% 8%))" }}
      >
        <Particles />
        <div className="relative z-10 max-w-md">
          <img src={meteoraLogo} alt="Meteora Digital" className="h-8 mb-12" />
          <h1 className="text-4xl font-display font-bold leading-tight tracking-tight text-white">
            Quase lá! Só falta{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">
              verificar seu número
            </span>.
          </h1>
          <p className="mt-6 text-white/60 leading-relaxed">
            Precisamos confirmar que o WhatsApp é seu para conectar seu Agente de Inteligência Artificial.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              { icon: <Zap className="h-5 w-5" />, label: "Setup em 5min" },
              { icon: <Brain className="h-5 w-5" />, label: "IA Avançada" },
              { icon: <MessageSquare className="h-5 w-5" />, label: "WhatsApp + IG" },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 text-center flex flex-col items-center gap-2">
                <div className="text-white/40">{item.icon}</div>
                <p className="text-xs text-white/50">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right verification panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 bg-background overflow-y-auto">
        <div className="w-full max-w-[380px] py-4">
          <div className="lg:hidden mb-8">
            <img src={meteoraLogo} alt="Meteora Digital" className="h-7 dark:block hidden" />
            <img src={meteoraLogoPreta} alt="Meteora Digital" className="h-7 dark:hidden block" />
          </div>

          {/* Phase 1: Collect phone (Google OAuth users) */}
          {collectingPhone ? (
            <PhoneCollectStep
              onSubmit={handlePhoneCollected}
              userName={user?.user_metadata?.full_name?.split(" ")[0] || user?.user_metadata?.name?.split(" ")[0]}
            />
          ) : (
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
                <span className="font-medium text-foreground">+55 {maskPhoneForOtp(phone)}</span>
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
                  aria-label={`Dígito ${i + 1}`}
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
              <button onClick={handleChangeNumber} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
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
          )}
        </div>
      </div>
    </div>
  );
}

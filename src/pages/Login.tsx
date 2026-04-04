import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
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
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
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
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [count]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  };

  const handleGoogleSSO = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      toast({ title: "Erro com Google", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel — static gradient */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden"
        style={{ background: "linear-gradient(160deg, hsl(225 80% 28%), hsl(225 75% 18%), hsl(222 30% 8%))" }}
      >
        <Particles />
        <div className="relative z-10 max-w-md">
          <img src={meteoraLogo} alt="Meteora Digital" className="h-8 mb-12" />
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
            Entregamos <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">soluções</span> que fazem sua empresa{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">vender mais</span>.
          </h1>
          <p className="mt-6 text-white/60 leading-relaxed">
            Agente inteligente que conversa, vende, agenda e resolve pelo WhatsApp e Instagram. 24h por dia, 7 dias por semana.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-12">
            <img src={meteoraLogo} alt="Meteora Digital" className="h-7 dark:block hidden" />
            <img src={meteoraLogoPreta} alt="Meteora Digital" className="h-7 dark:hidden block" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-foreground">Bem-vindo de volta</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Entre na sua conta para continuar</p>

          <Button
            variant="outline"
            className="w-full mt-7 h-11 gap-3 rounded-xl border-border/60 hover:bg-accent transition-all"
            onClick={handleGoogleSSO}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar com Google
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-4 text-muted-foreground/70">ou entre com e-mail</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">E-mail</Label>
              <Input
                id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="seu@email.com"
                className="h-11 rounded-xl bg-secondary/50 border-border/50 focus:border-primary/50 placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Senha</Label>
              <div className="relative">
                <Input
                  id="password" type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                  className="h-11 rounded-xl bg-secondary/50 border-border/50 focus:border-primary/50 pr-10 placeholder:text-muted-foreground/50"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit"
              className="group w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-medium shadow-lg shadow-primary/20 transition-all"
              disabled={loading}>
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  Entrar
                  <span className="relative ml-2 inline-flex items-center justify-center h-6 w-6 rounded-md bg-white/10 shadow-[0_0_8px_rgba(255,255,255,0.15)] group-hover:shadow-[0_0_12px_rgba(255,255,255,0.25)] group-hover:translate-x-0.5 transition-all duration-300">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

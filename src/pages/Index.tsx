import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Star, Bot, MessageSquare, Zap, Shield, Clock, BarChart3, Crown, Send } from "lucide-react";
import meteoraLogo from "@/assets/meteora-branca.png";
import meteoraLogoPreta from "@/assets/meteora-preta.png";
import { MeteoraSeal, MeteorTrail } from "@/components/MeteoraBrand";

const features = [
  { icon: Bot, title: "Agente Autônomo", desc: "Não é chatbot. É um funcionário digital que conversa, vende, agenda e resolve." },
  { icon: MessageSquare, title: "WhatsApp + Instagram", desc: "Opera nos canais que seus clientes já usam. Sem apps novos, sem fricção." },
  { icon: Zap, title: "Ações Reais", desc: "Agenda compromissos, envia links de pagamento, faz follow-up automático." },
  { icon: BarChart3, title: "Insights Inteligentes", desc: "O Explorer analisa conversas e sugere melhorias toda semana." },
  { icon: Shield, title: "Seguro e Confiável", desc: "Dados criptografados, isolamento por tenant, audit trail completo." },
  { icon: Clock, title: "24h por dia", desc: "Nunca falta, nunca atrasa, nunca tem dia ruim. Atende sábado, domingo e feriado." },
];

const plans = [
  { name: "Essencial", price: "97", features: ["1 agente IA", "100 conversas/mês", "WhatsApp", "Dashboard básico"], popular: false },
  { name: "Profissional", price: "497", features: ["3 agentes IA", "900 conversas/mês", "WhatsApp + Instagram", "Relatórios avançados", "Explorer com insights", "Ações automáticas"], popular: true },
  { name: "Empresarial", price: "997", features: ["5 agentes IA", "1.800 conversas/mês", "Todos os canais", "API dedicada", "Suporte prioritário", "Onboarding assistido"], popular: false },
  { name: "Scale", price: null, features: ["Agentes ilimitados", "Conversas ilimitadas", "Todos os canais + API", "Relatórios ilimitados + IA", "Manager dedicado", "Estratégias mensais de vendas", "SLA garantido", "Onboarding white-glove"], popular: false, enterprise: true },
];

const testimonials = [
  { name: "Dr. Carlos Mendes", role: "Clínica Sorriso — Manaus", text: "Em 2 semanas, a Luna agendou mais consultas do que minha recepcionista em um mês." },
  { name: "Fernanda Lima", role: "Studio Beauty — São Paulo", text: "Meus clientes acham que é uma pessoa real atendendo. A taxa de agendamento subiu 40%." },
  { name: "Roberto Silva", role: "Auto Peças Silva — BH", text: "Antes eu perdia cliente por não responder rápido. Agora o agente responde em 3 segundos." },
];

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="min-h-screen bg-background meteora-noise relative">
      {/* Ambient */}
      <div className="ambient-glow" style={{ background: "hsl(225 80% 56%)", top: "-300px", left: "20%" }} />
      <div className="ambient-glow" style={{ background: "hsl(190 90% 50%)", top: "200px", right: "-200px", animationDelay: "4s" }} />

      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/30 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <img src={meteoraLogo} alt="Meteora Digital" className="h-7 dark:block hidden" />
            <img src={meteoraLogoPreta} alt="Meteora Digital" className="h-7 dark:hidden block" />
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Entrar</Button></Link>
            <Link to="/signup">
              <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20 rounded-lg">
                Começar grátis <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <MeteorTrail interval={6000}>
      <section className="pt-36 pb-24 px-6 relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-1.5 text-xs text-muted-foreground mb-8 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-meteora-lime animate-pulse" />
            INFRAESTRUTURA DE CRESCIMENTO EMPRESARIAL
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-foreground">
            Entregamos <span className="text-gradient">soluções</span> que fazem sua empresa{" "}
            <span className="text-gradient">vender mais</span> e escalar{" "}
            com <span className="text-gradient">inteligência</span>.
          </h1>
          <p className="mt-8 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Implementamos operações completas de marketing, dados e IA que transformam processos lentos em máquinas previsíveis de crescimento.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="text-base px-8 h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                Começar grátis por 7 dias <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-base px-8 h-12 rounded-xl border-border/50 hover:bg-accent">
              Ver demonstração
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground/60">Setup em 5 minutos · Cancele quando quiser</p>
        </div>
      </section>
      </MeteorTrail>

      {/* Stats */}
      <section className="border-y border-border/30 bg-card/30 backdrop-blur-sm py-10 relative z-10">
        <div className="mx-auto max-w-4xl grid grid-cols-2 gap-6 sm:grid-cols-4 px-6 text-center">
          {[
            { value: "+R$42M", label: "Gerados para clientes" },
            { value: "84%", label: "Taxa de conversão" },
            { value: "12x", label: "ROI médio" },
            { value: "3s", label: "Tempo de resposta" },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-xl sm:text-3xl font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 relative z-10">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Tudo que seu negócio precisa</h2>
            <p className="mt-4 text-muted-foreground">Não é mais um chatbot. É uma revolução no seu negócio.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div key={i} className="group rounded-2xl border border-border/30 bg-card/50 p-6 hover:border-primary/20 hover:bg-card/80 transition-all backdrop-blur-sm surface-glow">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 relative z-10">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Planos simples, resultado real</h2>
            <p className="mt-4 text-muted-foreground">Comece com 7 dias grátis. Sem surpresas.</p>
          </div>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan, i) => (
              <div key={i} className={`relative rounded-2xl border p-6 pt-8 transition-all ${
                (plan as any).enterprise
                  ? "border-[hsl(var(--meteora-cyan))]/30 bg-gradient-to-b from-[hsl(var(--meteora-cyan))]/5 to-card/40 shadow-lg shadow-[hsl(var(--meteora-cyan))]/5"
                  : plan.popular
                    ? "border-primary/40 bg-card/80 shadow-lg shadow-primary/10 scale-[1.02]"
                    : "border-border/30 bg-card/30"
              }`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-gradient-to-r from-primary to-primary/80 px-4 py-1 text-[11px] font-medium text-primary-foreground shadow-lg shadow-primary/20">Mais popular</span>
                  </div>
                )}
                {(plan as any).enterprise && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[hsl(var(--meteora-cyan))] to-primary px-4 py-1 text-[11px] font-medium text-white shadow-lg shadow-primary/20">
                      <Crown className="h-3 w-3" /> Exclusivo
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{plan.name}</h3>
                  {(plan as any).enterprise && <Crown className="h-4 w-4 text-[hsl(var(--meteora-cyan))]" />}
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  {plan.price ? (
                    <>
                      <span className="text-xs text-muted-foreground">R$</span>
                      <span className="text-3xl sm:text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-xs text-muted-foreground">/mês</span>
                    </>
                  ) : (
                    <span className="text-2xl sm:text-3xl font-bold text-foreground">Sob consulta</span>
                  )}
                </div>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${(plan as any).enterprise ? "text-[hsl(var(--meteora-cyan))]" : "text-meteora-green"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup">
                  <Button className={`w-full mt-6 rounded-xl ${
                    (plan as any).enterprise
                      ? "bg-gradient-to-r from-[hsl(var(--meteora-cyan))] to-primary text-white shadow-lg shadow-primary/20"
                      : plan.popular
                        ? "bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
                        : ""
                  }`} variant={plan.popular || (plan as any).enterprise ? "default" : "outline"}>
                    {(plan as any).enterprise ? "Fale com especialista" : plan.popular ? "Começar agora" : "Escolher plano"}
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          {/* Custom Plan CTA */}
          <div className="mt-12 rounded-2xl border border-border/30 bg-card/30 p-8 text-center backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-foreground">Precisa de mais escala ou um plano personalizado?</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
              Empresas com alto volume de atendimento, múltiplos times ou necessidades específicas de integração podem ter um plano sob medida.
            </p>
            <Link to="/contact">
              <Button variant="outline" className="mt-6 gap-2 rounded-xl border-primary/30 hover:bg-primary/5">
                <Send className="h-4 w-4" /> Fale com nosso time
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 relative z-10">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">O que nossos clientes dizem</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl border border-border/30 bg-card/50 p-6 backdrop-blur-sm">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-meteora-warning text-meteora-warning" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">"{t.text}"</p>
                <div className="mt-5 pt-4 border-t border-border/30">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <MeteorTrail>
        <section className="py-24 px-6 relative z-10">
          <div className="mx-auto max-w-3xl text-center rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-12 surface-glow">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Pronto para transformar seu negócio?</h2>
            <p className="mt-4 text-muted-foreground">Em 5 minutos seu agente está no ar. Teste grátis por 7 dias.</p>
            <Link to="/signup">
              <Button size="lg" className="mt-8 text-base px-8 h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25">
                Criar meu agente agora <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <div className="mt-6 flex justify-center">
              <MeteoraSeal />
            </div>
          </div>
        </section>
      </MeteorTrail>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-6 relative z-10">
        <div className="mx-auto max-w-6xl flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src={meteoraLogo} alt="Meteora Digital" className="h-5 dark:block hidden" />
            <img src={meteoraLogoPreta} alt="Meteora Digital" className="h-5 dark:hidden block" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">© 2026 Meteora Digital</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <MeteoraSeal size="small" />
            <div className="flex gap-6 text-xs text-muted-foreground">
              <Link to="/termos" className="hover:text-foreground transition-colors">Termos</Link>
              <Link to="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
              <a href="#" className="hover:text-foreground transition-colors">Suporte</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

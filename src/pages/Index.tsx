import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Bot, BarChart3, Shield, Zap, Clock, CheckCircle2, ArrowRight, Star } from "lucide-react";

const features = [
  { icon: Bot, title: "Atendente Autônomo", desc: "Não é chatbot. É um funcionário digital que conversa, vende, agenda e resolve." },
  { icon: MessageSquare, title: "WhatsApp + Instagram", desc: "Opera nos canais que seus clientes já usam. Sem apps novos, sem fricção." },
  { icon: Zap, title: "Ações Reais", desc: "Agenda compromissos, envia links de pagamento, faz follow-up automático." },
  { icon: BarChart3, title: "Insights Inteligentes", desc: "O Explorer analisa conversas e sugere melhorias toda semana." },
  { icon: Shield, title: "Seguro e Confiável", desc: "Dados criptografados, isolamento por tenant, audit trail completo." },
  { icon: Clock, title: "24h por dia", desc: "Nunca falta, nunca atrasa, nunca tem dia ruim. Atende sábado, domingo e feriado." },
];

const plans = [
  {
    name: "Essencial",
    price: "97",
    features: ["1 atendente IA", "1.000 conversas/mês", "WhatsApp", "Dashboard básico"],
    cta: "Começar agora",
    popular: false,
  },
  {
    name: "Profissional",
    price: "247",
    features: ["3 atendentes IA", "5.000 conversas/mês", "WhatsApp + Instagram", "Relatórios avançados", "Explorer com insights", "Ações automáticas"],
    cta: "Mais popular",
    popular: true,
  },
  {
    name: "Empresarial",
    price: "597",
    features: ["5 atendentes IA", "Conversas ilimitadas", "Todos os canais", "API dedicada", "Suporte prioritário", "Onboarding assistido"],
    cta: "Falar com vendas",
    popular: false,
  },
];

const testimonials = [
  { name: "Dr. Carlos Mendes", role: "Clínica Sorriso — Manaus", text: "Em 2 semanas, a Luna agendou mais consultas do que minha recepcionista em um mês. Impressionante." },
  { name: "Fernanda Lima", role: "Studio Beauty — São Paulo", text: "Meus clientes acham que é uma pessoa real atendendo. A taxa de agendamento subiu 40%." },
  { name: "Roberto Silva", role: "Auto Peças Silva — BH", text: "Antes eu perdia cliente por não responder rápido. Agora o atendente responde em 3 segundos, 24h." },
];

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">M</span>
            </div>
            <span className="font-display font-semibold text-lg">Meteora Digital</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/signup"><Button size="sm">Criar conta grátis</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs font-medium">
            🚀 Inspirado pela Sierra.ai — agora para o Brasil
          </Badge>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Seu melhor funcionário.
            <br />
            <span className="text-primary">Trabalha 24h. Nunca falta.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Atendente inteligente que conversa, vende, agenda e resolve pelo WhatsApp e Instagram.
            Não é chatbot — é um funcionário digital que age nos seus sistemas.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="text-base px-8 h-12">
                Começar grátis por 7 dias <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-base px-8 h-12">
              Ver demonstração
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Sem cartão de crédito · Setup em 5 minutos · Cancele quando quiser</p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y border-border bg-muted/30 py-8">
        <div className="mx-auto max-w-4xl flex items-center justify-center gap-8 px-4 text-center">
          <div>
            <p className="font-display text-2xl font-semibold">150+</p>
            <p className="text-xs text-muted-foreground">Empresas ativas</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="font-display text-2xl font-semibold">50K+</p>
            <p className="text-xs text-muted-foreground">Conversas/mês</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="font-display text-2xl font-semibold">4.8★</p>
            <p className="text-xs text-muted-foreground">Satisfação</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="font-display text-2xl font-semibold">3s</p>
            <p className="text-xs text-muted-foreground">Tempo de resposta</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-semibold">Tudo que seu negócio precisa</h2>
            <p className="mt-3 text-muted-foreground">Não é mais um chatbot. É uma revolução no atendimento.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Card key={i} className="border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-base">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 bg-muted/30" id="pricing">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-semibold">Planos simples, resultado real</h2>
            <p className="mt-3 text-muted-foreground">Comece com 7 dias grátis. Sem surpresas.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {plans.map((plan, i) => (
              <Card key={i} className={`relative ${plan.popular ? "border-primary shadow-lg scale-[1.02]" : "border-border/50"}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="px-3 py-1">Mais popular</Badge>
                  </div>
                )}
                <CardContent className="p-6 pt-8">
                  <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <span className="font-display text-4xl font-light">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">/mês</span>
                  </div>
                  <ul className="mt-6 space-y-2.5">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-meteora-success shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/signup">
                    <Button className="w-full mt-6" variant={plan.popular ? "default" : "outline"}>
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-semibold">O que nossos clientes dizem</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 fill-meteora-warning text-meteora-warning" />)}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.text}"</p>
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-semibold">Pronto para transformar seu atendimento?</h2>
          <p className="mt-4 text-primary-foreground/80">
            Em 5 minutos seu atendente está no ar. Teste grátis por 7 dias.
          </p>
          <Link to="/signup">
            <Button size="lg" variant="secondary" className="mt-8 text-base px-8 h-12">
              Criar meu atendente agora <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-[10px]">M</span>
            </div>
            <span className="text-sm text-muted-foreground">© 2026 Meteora Digital. Todos os direitos reservados.</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Termos</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
            <a href="#" className="hover:text-foreground transition-colors">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

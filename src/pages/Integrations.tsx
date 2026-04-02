import { useState } from "react";
import { Search, Puzzle, Zap, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import GuidedTour from "@/components/GuidedTour";
import { INTEGRATIONS_STEPS, INTEGRATIONS_TOUR_KEY } from "@/lib/tour-steps";

type Priority = "p0" | "p1" | "p2" | "p3";

interface Integration {
  name: string;
  description: string;
  logo: string;
  priority: Priority;
  connected?: boolean;
}

interface Category {
  title: string;
  icon: string;
  integrations: Integration[];
}

const priorityLabel: Record<Priority, { label: string; className: string }> = {
  p0: { label: "Disponível", className: "bg-primary/10 text-primary border-primary/20" },
  p1: { label: "Em breve", className: "bg-muted text-muted-foreground border-border" },
  p2: { label: "Em breve", className: "bg-muted text-muted-foreground border-border" },
  p3: { label: "Em breve", className: "bg-muted text-muted-foreground border-border" },
};

const categories: Category[] = [
  {
    title: "Onde seu atendente trabalha",
    icon: "💬",
    integrations: [
      { name: "WhatsApp Business", description: "Conecte com a API oficial do WhatsApp para atender seus clientes", logo: "https://cdn.jsdelivr.net/gh/nicehash/icons@latest/whatsapp.svg", priority: "p0" },
      { name: "Instagram DM", description: "Responda mensagens do Instagram automaticamente", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/instagram.svg", priority: "p0" },
      { name: "Webchat Widget", description: "Balãozinho de chat no site do seu negócio", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/livechat.svg", priority: "p1" },
      { name: "Telegram", description: "Atenda clientes via Telegram Bot", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/telegram.svg", priority: "p2" },
      { name: "Facebook Messenger", description: "Responda mensagens do Facebook automaticamente", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/messenger.svg", priority: "p2" },
      { name: "Email (SMTP)", description: "Receba e responda emails com seu atendente", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/gmail.svg", priority: "p3" },
      { name: "Voz / Telefone", description: "Atendimento telefônico com inteligência artificial", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/vonage.svg", priority: "p3" },
    ],
  },
  {
    title: "Receba pagamentos",
    icon: "💳",
    integrations: [
      { name: "Mercado Pago", description: "Link de pagamento, Pix e QR Code direto na conversa", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/mercadopago.svg", priority: "p0" },
      { name: "Asaas", description: "Cobranças recorrentes, boletos e Pix automatizados", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/asana.svg", priority: "p0" },
      { name: "Stripe", description: "Checkout embutido e gestão de assinaturas", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/stripe.svg", priority: "p1" },
      { name: "PagSeguro", description: "Link de pagamento rápido para comércio local", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/pagseguro.svg", priority: "p1" },
      { name: "iFood", description: "Receba pedidos e informe status de delivery", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/ifood.svg", priority: "p3" },
    ],
  },
  {
    title: "Agende compromissos",
    icon: "📅",
    integrations: [
      { name: "Google Calendar", description: "Verifique disponibilidade e crie eventos automaticamente", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/googlecalendar.svg", priority: "p0" },
      { name: "Calendly", description: "Envie links de agendamento ou agende via API", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/calendly.svg", priority: "p1" },
      { name: "Cal.com", description: "Alternativa open source para agendamentos", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/caldotcom.svg", priority: "p2" },
    ],
  },
  {
    title: "Organize seus contatos",
    icon: "👥",
    integrations: [
      { name: "Google Sheets", description: "Leads caem direto na sua planilha — simples e poderoso", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/googlesheets.svg", priority: "p0" },
      { name: "RD Station", description: "Integre com o CRM mais popular do Brasil", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/rdstation.svg", priority: "p1" },
      { name: "HubSpot", description: "CRM completo para equipes estruturadas", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/hubspot.svg", priority: "p1" },
      { name: "Pipedrive", description: "Pipeline de vendas visual para times comerciais", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/pipedrive.svg", priority: "p2" },
      { name: "Kommo", description: "CRM focado em WhatsApp e Instagram", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/kongregate.svg", priority: "p2" },
      { name: "Notion", description: "Registre leads na sua base do Notion", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/notion.svg", priority: "p2" },
      { name: "Airtable", description: "Base de dados visual para clientes organizados", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/airtable.svg", priority: "p2" },
    ],
  },
  {
    title: "Envie documentos",
    icon: "📁",
    integrations: [
      { name: "Google Drive", description: "Envie orçamentos, cardápios e PDFs direto do Drive", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/googledrive.svg", priority: "p1" },
    ],
  },
  {
    title: "Automatize tudo",
    icon: "⚡",
    integrations: [
      { name: "Webhook Genérico", description: "Conecte com qualquer sistema via webhook personalizado", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/webhook.svg", priority: "p0" },
      { name: "Zapier", description: "Conecte com 7.000+ apps sem escrever código", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/zapier.svg", priority: "p1" },
      { name: "Make", description: "Crie automações visuais poderosas", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/make.svg", priority: "p1" },
      { name: "n8n", description: "Automação open source — o motor da Meteora", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/n8n.svg", priority: "p0" },
    ],
  },
  {
    title: "E-commerce",
    icon: "🛒",
    integrations: [
      { name: "Hotmart", description: "Consulte compras e envie links de checkout", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/hotmart.svg", priority: "p1" },
      { name: "Shopify", description: "Consulte estoque, pedidos e envie links de produto", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/shopify.svg", priority: "p2" },
      { name: "Nuvemshop", description: "E-commerce brasileiro com milhares de lojas", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/nuvemshop.svg", priority: "p2" },
      { name: "WooCommerce", description: "A loja do WordPress — comum no Brasil", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/woocommerce.svg", priority: "p2" },
      { name: "Mercado Livre", description: "O maior marketplace da América Latina", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/mercadolibre.svg", priority: "p3" },
    ],
  },
];

function IntegrationCard({ integration }: { integration: Integration }) {
  const isComingSoon = integration.priority !== "p0";
  const prio = priorityLabel[integration.priority];

  return (
    <div
      className={cn(
        "group relative flex items-start gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all duration-200",
        isComingSoon
          ? "opacity-50 grayscale hover:opacity-70 hover:grayscale-[50%]"
          : "hover:border-primary/20 hover:bg-card/80 hover:shadow-[0_0_20px_-8px_hsl(var(--primary)/0.15)]"
      )}
    >
      {/* Logo */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/50 p-2">
        <img
          src={integration.logo}
          alt={integration.name}
          className="h-5 w-5 object-contain invert opacity-70"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-sm font-medium text-foreground truncate">{integration.name}</h3>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 shrink-0 font-mono", prio.className)}>
            {prio.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground/70 line-clamp-1">{integration.description}</p>
      </div>

      {/* Action */}
      {!isComingSoon && (
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 h-8 px-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Conectar
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  );
}

export default function Integrations() {
  const [search, setSearch] = useState("");
  const query = search.toLowerCase();

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      integrations: cat.integrations.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.description.toLowerCase().includes(query)
      ),
    }))
    .filter((cat) => cat.integrations.length > 0);

  const totalCount = categories.reduce((acc, c) => acc + c.integrations.length, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-primary/5 via-card to-card p-6 md:p-8" data-tour="integrations-header">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/10">
              <Puzzle className="h-5 w-5 text-primary" />
            </div>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary">
              {totalCount} integrações
            </Badge>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight mt-3">
            Conecte seus agentes com dezenas de ferramentas
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg">
            Dê superpoderes ao seu atendente. Pagamentos, agendamentos, CRMs, automações — tudo integrado numa única conversa.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md" data-tour="integrations-search">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input
          placeholder="Buscar integração..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border/40 h-10 text-sm"
        />
      </div>

      {/* Categories */}
      <div className="space-y-10" data-tour="integrations-categories">
        {filteredCategories.map((category) => (
          <section key={category.title}>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-base">{category.icon}</span>
              <h2 className="text-sm font-semibold text-foreground/90 tracking-tight">
                {category.title}
              </h2>
              <span className="text-[10px] text-muted-foreground/50 font-mono">
                {category.integrations.length}
              </span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {category.integrations.map((integration) => (
                <IntegrationCard key={integration.name} integration={integration} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {search && filteredCategories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Zap className="h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma integração encontrada para "{search}"</p>
        </div>
      )}

      <GuidedTour steps={INTEGRATIONS_STEPS} tourKey={INTEGRATIONS_TOUR_KEY} />
    </div>
  );
}

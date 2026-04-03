/**
 * Tour step definitions for each page of the system.
 * Each page has its own tour with contextual steps.
 *
 * Convention:
 * - tourKey format: "theagent_tour_{pageName}_completed"
 * - data-tour attribute format: data-tour="{pageName}-{element}"
 */

import {
  MessageSquare, Filter, Search, Users, Bot, Play, Settings,
  Zap, BookOpen, Brain, Wifi, Instagram, BarChart3, FileText,
  Puzzle, User, Shield, Phone, Mail, Camera, Globe
} from "lucide-react";
import type { TourStep } from "@/components/GuidedTour";

// === CONVERSATIONS ===
export const CONVERSATIONS_TOUR_KEY = "theagent_tour_conversations_completed";
export const CONVERSATIONS_STEPS: TourStep[] = [
  {
    title: "Visao geral das conversas",
    description: "Aqui voce ve o total de conversas por status: ativas, resolvidas e escaladas. Use pra acompanhar a carga do seu atendimento.",
    icon: <MessageSquare className="h-5 w-5" />,
    selector: "[data-tour='conversations-stats']",
  },
  {
    title: "Filtrar por status",
    description: "Filtre conversas por status (ativas, resolvidas, escaladas) pra encontrar rapidamente o que precisa.",
    icon: <Filter className="h-5 w-5" />,
    selector: "[data-tour='conversations-filters']",
  },
  {
    title: "Buscar conversas",
    description: "Pesquise pelo nome ou telefone do contato. Encontre qualquer conversa em segundos.",
    icon: <Search className="h-5 w-5" />,
    selector: "[data-tour='conversations-search']",
  },
  {
    title: "Sentimento do contato",
    description: "A barra colorida mostra o sentimento médio do contato nas conversas. Verde = positivo, amarelo = neutro, vermelho = negativo. É calculada automaticamente pela IA.",
    icon: <MessageSquare className="h-5 w-5" />,
    selector: "[data-tour='conv-sentiment']",
  },
  {
    title: "Detalhes da conversa",
    description: "Clique em qualquer conversa pra ver o historico completo, status e opção de assumir o atendimento.",
    icon: <MessageSquare className="h-5 w-5" />,
    selector: "[data-tour='conversations-list']",
  },
];

// === CONVERSATION DETAIL ===
export const CONVERSATION_DETAIL_TOUR_KEY = "theagent_tour_conversation_detail_completed";
export const CONVERSATION_DETAIL_STEPS: TourStep[] = [
  {
    title: "Info do contato",
    description: "Veja o nome, telefone, canal e status da conversa. O badge mostra se a IA esta atendendo ou se um humano assumiu.",
    icon: <Users className="h-5 w-5" />,
    selector: "[data-tour='conv-detail-header']",
  },
  {
    title: "Assumir atendimento",
    description: "Use este botao pra alternar entre IA e atendimento humano. Quando voce assume, a IA para de responder e voce pode digitar diretamente.",
    icon: <Shield className="h-5 w-5" />,
    selector: "[data-tour='conv-detail-takeover']",
  },
  {
    title: "Análise de sentimento",
    description: "Os pontos coloridos ao lado das mensagens do cliente indicam o sentimento detectado pela IA. Verde = positivo, amarelo = neutro, vermelho = negativo, rosa = frustrado. Passe o mouse para ver o detalhe.",
    icon: <MessageSquare className="h-5 w-5" />,
    selector: "[data-tour='conv-detail-sentiment']",
  },
  {
    title: "Historico de mensagens",
    description: "Todo o historico da conversa aparece aqui. Mensagens do cliente a esquerda, do agente a direita.",
    icon: <MessageSquare className="h-5 w-5" />,
    selector: "[data-tour='conv-detail-messages']",
  },
];

// === AGENTS ===
export const AGENTS_TOUR_KEY = "theagent_tour_agents_completed";
export const AGENTS_STEPS: TourStep[] = [
  {
    title: "Seus agentes de IA",
    description: "Todos os seus agentes aparecem aqui. Cada card mostra o nome, classe (Vendas/Suporte), modelo de IA e status.",
    icon: <Bot className="h-5 w-5" />,
    selector: "[data-tour='agents-grid']",
  },
  {
    title: "Filtrar agentes",
    description: "Filtre por classe (Vendas ou Suporte), status (Online/Offline) ou busque pelo nome.",
    icon: <Filter className="h-5 w-5" />,
    selector: "[data-tour='agents-filters']",
  },
  {
    title: "Acoes rapidas",
    description: "Em cada card, voce pode ir direto pro Playground (testar) ou pra Configuracao do agente.",
    icon: <Play className="h-5 w-5" />,
    selector: "[data-tour='agents-card-actions']",
  },
];

// === AGENT DETAIL ===
export const AGENT_DETAIL_TOUR_KEY = "theagent_tour_agent_detail_completed";
export const AGENT_DETAIL_STEPS: TourStep[] = [
  {
    title: "Status do agente",
    description: "Ative ou pause seu agente aqui. Quando online, ele responde automaticamente no WhatsApp.",
    icon: <Zap className="h-5 w-5" />,
    selector: "[data-tour='agent-detail-status']",
  },
  {
    title: "Abas de configuracao",
    description: "Configure seu agente em 4 areas: Configuracao (nome, persona, modelo), Skills (superpoderes), Conhecimento (base de dados) e Memoria.",
    icon: <Settings className="h-5 w-5" />,
    selector: "[data-tour='agent-detail-tabs']",
  },
  {
    title: "Base de conhecimento",
    description: "No painel lateral, veja todas as fontes de informacao do seu agente: documentos, sites e redes sociais.",
    icon: <BookOpen className="h-5 w-5" />,
    selector: "[data-tour='agent-detail-kb']",
  },
];

// === PLAYGROUND ===
export const PLAYGROUND_TOUR_KEY = "theagent_tour_playground_completed";
export const PLAYGROUND_STEPS: TourStep[] = [
  {
    title: "Teste seu agente",
    description: "O Playground e um chat de teste. Converse com seu agente de IA pra ver como ele responde antes de colocar no ar.",
    icon: <Play className="h-5 w-5" />,
    selector: "[data-tour='playground-chat']",
  },
  {
    title: "Enviar mensagem",
    description: "Digite uma mensagem e clique em enviar. A resposta e gerada em tempo real pelo modelo de IA configurado no seu agente.",
    icon: <MessageSquare className="h-5 w-5" />,
    selector: "[data-tour='playground-input']",
  },
];

// === CHANNELS ===
export const CHANNELS_TOUR_KEY = "theagent_tour_channels_completed";
export const CHANNELS_STEPS: TourStep[] = [
  {
    title: "Canais de conexao",
    description: "Conecte seu agente a plataformas de mensagens. WhatsApp e o canal principal — Instagram vem em breve.",
    icon: <Wifi className="h-5 w-5" />,
    selector: "[data-tour='channels-tabs']",
  },
  {
    title: "WhatsApp",
    description: "Conecte seu WhatsApp via QR Code. Seu agente comeca a atender na hora, respondendo automaticamente todas as mensagens.",
    icon: <Phone className="h-5 w-5" />,
    selector: "[data-tour='channels-whatsapp']",
  },
  {
    title: "Vinculo agente-numero",
    description: "Cada numero WhatsApp e vinculado a um agente. Voce pode trocar qual agente usa este numero a qualquer momento.",
    icon: <Bot className="h-5 w-5" />,
    selector: "[data-tour='channels-agent-binding']",
  },
];

// === REPORTS ===
export const REPORTS_TOUR_KEY = "theagent_tour_reports_completed";
export const REPORTS_STEPS: TourStep[] = [
  {
    title: "Metricas principais",
    description: "Acompanhe conversas, mensagens, taxa de resolucao e media de mensagens por conversa. Tudo atualizado em tempo real.",
    icon: <BarChart3 className="h-5 w-5" />,
    selector: "[data-tour='reports-metrics']",
  },
  {
    title: "Graficos",
    description: "Visualize tendencias de conversas por dia e a distribuicao por status. Identifique picos e padroes de atendimento.",
    icon: <BarChart3 className="h-5 w-5" />,
    selector: "[data-tour='reports-charts']",
  },
  {
    title: "Templates de relatorio",
    description: "Escolha entre templates prontos: resumo executivo, analise de sentimento, performance do agente e mais. Disponibilidade varia por plano.",
    icon: <FileText className="h-5 w-5" />,
    selector: "[data-tour='reports-templates']",
  },
];

// === INTEGRATIONS ===
export const INTEGRATIONS_TOUR_KEY = "theagent_tour_integrations_completed";
export const INTEGRATIONS_STEPS: TourStep[] = [
  {
    title: "Marketplace de integracoes",
    description: "Conecte seus agentes com dezenas de ferramentas: CRM, pagamentos, calendarios, e-commerce e mais.",
    icon: <Puzzle className="h-5 w-5" />,
    selector: "[data-tour='integrations-header']",
  },
  {
    title: "Buscar integracoes",
    description: "Pesquise pelo nome da ferramenta que voce quer conectar.",
    icon: <Search className="h-5 w-5" />,
    selector: "[data-tour='integrations-search']",
  },
  {
    title: "Categorias",
    description: "As integracoes estao organizadas por categoria. Algumas ja estao disponiveis, outras chegam em breve.",
    icon: <Globe className="h-5 w-5" />,
    selector: "[data-tour='integrations-categories']",
  },
];

// === ACCOUNT ===
export const ACCOUNT_TOUR_KEY = "theagent_tour_account_completed";
export const ACCOUNT_STEPS: TourStep[] = [
  {
    title: "Seu perfil",
    description: "Atualize sua foto, nome e username. Seu username e unico e pode ser alterado a cada 60 dias.",
    icon: <User className="h-5 w-5" />,
    selector: "[data-tour='account-profile']",
  },
  {
    title: "Contato verificado",
    description: "Mantenha seu email e WhatsApp verificados. Sao usados pra notificacoes e recuperacao de conta.",
    icon: <Mail className="h-5 w-5" />,
    selector: "[data-tour='account-contact']",
  },
  {
    title: "Seu plano",
    description: "Veja seu plano atual e limites de conversas. Faca upgrade quando precisar de mais capacidade.",
    icon: <Zap className="h-5 w-5" />,
    selector: "[data-tour='account-plan']",
  },
];

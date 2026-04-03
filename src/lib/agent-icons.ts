import * as LucideIcons from "lucide-react";
import { type LucideIcon } from "lucide-react";

export interface AgentIconDef {
  id: string;
  label: string;
  category: string;
}

export const AGENT_ICONS: AgentIconDef[] = [
  // General
  { id: "bot", label: "Robo", category: "geral" },
  { id: "brain", label: "Cerebro IA", category: "geral" },
  { id: "sparkles", label: "Magica", category: "geral" },
  { id: "zap", label: "Raio", category: "geral" },
  { id: "message-square", label: "Chat", category: "geral" },

  // Sales / Commerce
  { id: "shopping-cart", label: "Carrinho", category: "vendas" },
  { id: "store", label: "Loja", category: "vendas" },
  { id: "trending-up", label: "Vendas", category: "vendas" },
  { id: "receipt", label: "Recibo", category: "vendas" },
  { id: "credit-card", label: "Pagamento", category: "vendas" },
  { id: "package", label: "Pacote", category: "vendas" },

  // Support / Service
  { id: "headphones", label: "Suporte", category: "atendimento" },
  { id: "life-buoy", label: "Ajuda", category: "atendimento" },
  { id: "shield", label: "Protecao", category: "atendimento" },
  { id: "help-circle", label: "FAQ", category: "atendimento" },

  // Food / Restaurant
  { id: "utensils", label: "Restaurante", category: "alimentacao" },
  { id: "coffee", label: "Cafe", category: "alimentacao" },
  { id: "pizza", label: "Pizza", category: "alimentacao" },
  { id: "cake", label: "Confeitaria", category: "alimentacao" },

  // Health
  { id: "stethoscope", label: "Saude", category: "saude" },
  { id: "heart-pulse", label: "Cardiologia", category: "saude" },
  { id: "pill", label: "Farmacia", category: "saude" },
  { id: "baby", label: "Pediatria", category: "saude" },

  // Education
  { id: "graduation-cap", label: "Educacao", category: "educacao" },
  { id: "book-open", label: "Livro", category: "educacao" },
  { id: "pencil", label: "Escrita", category: "educacao" },

  // Real Estate / Construction
  { id: "building-2", label: "Imoveis", category: "imobiliario" },
  { id: "home", label: "Casa", category: "imobiliario" },
  { id: "hard-hat", label: "Construcao", category: "imobiliario" },

  // Tech / Internet
  { id: "wifi", label: "Internet", category: "tecnologia" },
  { id: "monitor", label: "Computador", category: "tecnologia" },
  { id: "smartphone", label: "Mobile", category: "tecnologia" },
  { id: "globe", label: "Web", category: "tecnologia" },

  // Beauty / Wellness
  { id: "scissors", label: "Salao", category: "beleza" },
  { id: "sparkle", label: "Estetica", category: "beleza" },
  { id: "flower-2", label: "Spa", category: "beleza" },

  // Fitness
  { id: "dumbbell", label: "Academia", category: "fitness" },
  { id: "bike", label: "Esporte", category: "fitness" },

  // Legal / Finance
  { id: "scale", label: "Juridico", category: "juridico" },
  { id: "landmark", label: "Governo", category: "juridico" },
  { id: "banknote", label: "Financeiro", category: "financeiro" },

  // Auto
  { id: "car", label: "Automotivo", category: "automotivo" },
  { id: "wrench", label: "Mecanica", category: "automotivo" },

  // Pet
  { id: "paw-print", label: "Pet", category: "pet" },

  // Travel
  { id: "plane", label: "Viagem", category: "viagem" },
  { id: "map-pin", label: "Local", category: "viagem" },
];

/** All unique categories in display order */
export const AGENT_ICON_CATEGORIES = [
  ...new Set(AGENT_ICONS.map((i) => i.category)),
];

/**
 * Convert kebab-case icon id to PascalCase component name.
 * e.g. "shopping-cart" -> "ShoppingCart"
 */
function kebabToPascal(str: string): string {
  return str
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

/**
 * Check if the icon id represents a custom uploaded image.
 */
export function isCustomIcon(iconId: string | null | undefined): boolean {
  return !!iconId && iconId.startsWith("custom:");
}

/**
 * Extract the data URI from a custom icon id.
 */
export function getCustomIconUrl(iconId: string): string {
  return iconId.replace("custom:", "");
}

/**
 * Get the lucide-react icon component for a given icon id.
 * Falls back to Bot if the icon is not found.
 * Returns null for custom icons (the component should render <img> instead).
 */
export function getAgentIcon(iconId: string | null | undefined): LucideIcon | null {
  if (!iconId) return LucideIcons.Bot;
  if (isCustomIcon(iconId)) return null;
  const name = kebabToPascal(iconId);
  const Icon = (LucideIcons as Record<string, unknown>)[name] as
    | LucideIcon
    | undefined;
  return Icon ?? LucideIcons.Bot;
}

/**
 * Given a business sector string, return a sensible default icon id.
 */
export function getAgentIconId(sector?: string): string {
  const sectorMap: Record<string, string> = {
    internet: "wifi",
    telecom: "wifi",
    provedor: "wifi",
    restaurante: "utensils",
    food: "utensils",
    delivery: "package",
    saude: "stethoscope",
    clinica: "stethoscope",
    hospital: "stethoscope",
    educacao: "graduation-cap",
    escola: "graduation-cap",
    curso: "book-open",
    imobiliaria: "building-2",
    imoveis: "building-2",
    beleza: "scissors",
    estetica: "sparkle",
    salao: "scissors",
    academia: "dumbbell",
    fitness: "dumbbell",
    juridico: "scale",
    advocacia: "scale",
    financeiro: "banknote",
    contabilidade: "banknote",
    automotivo: "car",
    mecanica: "wrench",
    pet: "paw-print",
    veterinaria: "paw-print",
    marketing: "trending-up",
    agencia: "trending-up",
    tecnologia: "monitor",
    software: "monitor",
    loja: "store",
    comercio: "shopping-cart",
    cafe: "coffee",
    padaria: "cake",
  };

  if (!sector) return "bot";
  const lower = sector.toLowerCase();
  for (const [key, icon] of Object.entries(sectorMap)) {
    if (lower.includes(key)) return icon;
  }
  return "bot";
}

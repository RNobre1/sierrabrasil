/**
 * Skill instruction builder — shared logic for building the "HABILIDADES ATIVAS"
 * section of the 4-layer system prompt.
 *
 * Used by edge functions (whatsapp-webhook, chat) to inject skill-specific
 * instructions into the AI system prompt based on active_skills[] from attendants table.
 */

export interface SkillContext {
  /** Greeting based on time of day (e.g. "Bom dia", "Boa tarde") */
  greeting?: string;
  /** Contact name for personalized greeting */
  contactName?: string;
}

/**
 * Maps skill IDs to their prompt instructions.
 * Only skills with actual implementations are included.
 * Coming-soon skills (scheduling, email-integration, etc.) are intentionally excluded.
 */
export const SKILL_INSTRUCTION_MAP: Record<string, string | ((ctx: SkillContext) => string)> = {
  greeting: (ctx) => {
    const g = ctx.greeting || "Bom dia";
    const name = ctx.contactName ? ` com o nome do cliente (${ctx.contactName})` : " com o nome do cliente";
    return `Use "${g}" personalizado${name} na primeira interacao.`;
  },

  escalation:
    "Se o cliente pedir humano ou demonstrar frustracao extrema, diga que vai transferir e encerre com a tag [ESCALATE]. Nao explique a tag pro cliente.",

  "lead-capture":
    "Identifique oportunidades naturais pra coletar nome, email e telefone do cliente. Faca de forma sutil e conversacional. Quando coletar qualquer dado, adicione no FINAL da resposta (invisivel pro cliente): [LEAD: nome=X | email=Y | telefone=Z]. Preencha apenas os campos que conseguiu.",

  sentiment:
    "Analise o sentimento do cliente em cada mensagem. Adapte o tom: frustrado = mais empatico e cuidadoso, positivo = mais animado e casual, neutro = equilibrado. No FINAL da resposta, adicione (invisivel pro cliente): [SENTIMENT: positivo|neutro|negativo|frustrado].",

  "follow-up":
    "Se o cliente volta apos um tempo, faca referencia a conversa anterior de forma natural (ex: 'E ai, resolveu aquela questao?'). Mostre que lembra do contexto.",

  "multi-language":
    `REGRA PRIORITARIA DE IDIOMA (sobrepoe a secao de humanizacao PT-BR acima):
Detecte o idioma da ULTIMA mensagem do cliente. Se NAO for portugues, IGNORE todas as instrucoes de tom PT-BR e responda INTEIRAMENTE no idioma do cliente. NUNCA misture idiomas.
Naturalidade por idioma:
- Ingles: use contracoes (I'm, don't, gonna, wanna), girias (sure thing, no worries, got it, sounds good), tom casual de texting.
- Espanhol: use contracoes (pa' que, ta' bien), girias (vale, genial, dale, tranqui, mola), tom natural latinoamericano/espanhol.
- Frances: use contracoes (j'suis, t'inquiete, c'est), girias (super, nickel, impec, bref), tom casual.
- Italiano: use contracoes (com'e, dov'e), girias (figurati, dai, boh, magari), tom casual.
- Alemao: use tom casual (klar, na klar, alles klar, genau, passt), contracoes informais.
Mantenha o MESMO nivel de informalidade e emojis que usaria em portugues, mas adaptado ao idioma detectado.`,

  faq:
    "Quando houver dados de FAQ fornecidos no contexto, priorize respostas da FAQ antes de elaborar com IA generativa. Respostas de FAQ devem ser usadas diretamente, adaptando apenas o tom conversacional.",
};

/**
 * Builds the "HABILIDADES ATIVAS" prompt section from a list of active skill IDs.
 *
 * @param activeSkills - Array of skill IDs enabled for the attendant
 * @param context - Optional context (greeting, contactName) for dynamic skills
 * @returns Formatted prompt section string, or empty string if no skills match
 */
export function buildSkillInstructions(
  activeSkills: string[] | null | undefined,
  context: SkillContext = {},
): string {
  if (!activeSkills || activeSkills.length === 0) return "";

  const lines: string[] = [];

  for (const skillId of activeSkills) {
    const instruction = SKILL_INSTRUCTION_MAP[skillId];
    if (!instruction) continue;

    const text = typeof instruction === "function" ? instruction(context) : instruction;
    lines.push(`- ${text}`);
  }

  if (lines.length === 0) return "";

  return `\n\n## HABILIDADES ATIVAS\n${lines.join("\n")}`;
}

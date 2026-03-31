import { describe, it, expect } from "vitest";

// Logica extraida do whatsapp-webhook para teste unitario

// --- Message splitting (mesma logica da edge function) ---
function splitOnBreak(reply: string): string[] {
  return reply.split("[BREAK]").map(p => p.trim()).filter(p => p.length > 0);
}

// --- Layer 1 prompt builder (mesma logica) ---
function getLayer1(agentName: string): string {
  return `## QUEM VOCE E
Voce e ${agentName}, agente virtual atendendo pelo WhatsApp.
Voce e reativo: responde mensagens, nunca inicia conversa.`;
}

// --- Greeting by time (mesma logica) ---
function getGreeting(utcHour: number): string {
  const tzHour = (utcHour - 3 + 24) % 24;
  if (tzHour >= 12 && tzHour < 18) return "Boa tarde";
  if (tzHour >= 18 || tzHour < 6) return "Boa noite";
  return "Bom dia";
}

// --- Contact phone extraction (mesma logica) ---
function extractPhone(remoteJid: string): string {
  return remoteJid.replace("@s.whatsapp.net", "");
}

// --- Should skip message (mesma logica) ---
function shouldSkipMessage(remoteJid: string, fromMe: boolean): { skip: boolean; reason?: string } {
  if (fromMe) return { skip: true, reason: "fromMe" };
  if (remoteJid.includes("@g.us")) return { skip: true, reason: "group" };
  if (remoteJid === "status@broadcast") return { skip: true, reason: "status" };
  return { skip: false };
}

// --- Extract text from message (mesma logica) ---
function extractTextContent(message: any): string {
  return message?.conversation
    || message?.extendedTextMessage?.text
    || "";
}

describe("splitOnBreak", () => {
  it("retorna mensagem unica quando nao tem [BREAK]", () => {
    expect(splitOnBreak("Oi, tudo bem?")).toEqual(["Oi, tudo bem?"]);
  });

  it("divide em multiplas mensagens no [BREAK]", () => {
    const result = splitOnBreak("Oi! [BREAK] Tudo bem? [BREAK] Posso ajudar?");
    expect(result).toEqual(["Oi!", "Tudo bem?", "Posso ajudar?"]);
  });

  it("remove partes vazias", () => {
    const result = splitOnBreak("[BREAK] Oi! [BREAK] [BREAK]");
    expect(result).toEqual(["Oi!"]);
  });

  it("faz trim das partes", () => {
    const result = splitOnBreak("  Oi!  [BREAK]  Tchau!  ");
    expect(result).toEqual(["Oi!", "Tchau!"]);
  });
});

describe("getLayer1", () => {
  it("inclui nome do agente no prompt", () => {
    const prompt = getLayer1("Luna");
    expect(prompt).toContain("Voce e Luna");
  });

  it("declara que e reativo", () => {
    const prompt = getLayer1("Bot");
    expect(prompt).toContain("reativo");
    expect(prompt).toContain("nunca inicia conversa");
  });
});

describe("getGreeting", () => {
  it("retorna Bom dia para manha (UTC 12 = BRT 9)", () => {
    expect(getGreeting(12)).toBe("Bom dia");
  });

  it("retorna Boa tarde para tarde (UTC 17 = BRT 14)", () => {
    expect(getGreeting(17)).toBe("Boa tarde");
  });

  it("retorna Boa noite para noite (UTC 23 = BRT 20)", () => {
    expect(getGreeting(23)).toBe("Boa noite");
  });

  it("retorna Boa noite para madrugada (UTC 5 = BRT 2)", () => {
    expect(getGreeting(5)).toBe("Boa noite");
  });

  it("retorna Bom dia para inicio da manha (UTC 9 = BRT 6)", () => {
    expect(getGreeting(9)).toBe("Bom dia");
  });
});

describe("extractPhone", () => {
  it("remove sufixo @s.whatsapp.net", () => {
    expect(extractPhone("5511999998888@s.whatsapp.net")).toBe("5511999998888");
  });

  it("retorna string original se nao tem sufixo", () => {
    expect(extractPhone("5511999998888")).toBe("5511999998888");
  });
});

describe("shouldSkipMessage", () => {
  it("pula mensagens proprias (fromMe)", () => {
    expect(shouldSkipMessage("123@s.whatsapp.net", true)).toEqual({ skip: true, reason: "fromMe" });
  });

  it("pula mensagens de grupo", () => {
    expect(shouldSkipMessage("123@g.us", false)).toEqual({ skip: true, reason: "group" });
  });

  it("pula status broadcast", () => {
    expect(shouldSkipMessage("status@broadcast", false)).toEqual({ skip: true, reason: "status" });
  });

  it("nao pula mensagens normais de contato", () => {
    expect(shouldSkipMessage("5511999@s.whatsapp.net", false)).toEqual({ skip: false });
  });
});

describe("extractTextContent", () => {
  it("extrai de conversation", () => {
    expect(extractTextContent({ conversation: "Oi" })).toBe("Oi");
  });

  it("extrai de extendedTextMessage", () => {
    expect(extractTextContent({ extendedTextMessage: { text: "Link aqui" } })).toBe("Link aqui");
  });

  it("prioriza conversation sobre extendedTextMessage", () => {
    expect(extractTextContent({
      conversation: "Texto direto",
      extendedTextMessage: { text: "Texto extendido" },
    })).toBe("Texto direto");
  });

  it("retorna vazio quando nao tem texto", () => {
    expect(extractTextContent({ imageMessage: {} })).toBe("");
  });

  it("retorna vazio para undefined", () => {
    expect(extractTextContent(undefined)).toBe("");
  });
});

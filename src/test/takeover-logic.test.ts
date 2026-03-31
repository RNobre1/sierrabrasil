import { describe, it, expect } from "vitest";

// Logica de takeover extraida do ConversationDetail para teste unitario
// (o componente em si depende de muitos providers, entao testamos a logica pura)

interface Conversation {
  id: string;
  human_takeover: boolean;
}

interface TakeoverUpdate {
  human_takeover: boolean;
  takeover_by: string | null;
  takeover_at: string | null;
}

function buildTakeoverUpdate(conversation: Conversation, userId: string): TakeoverUpdate {
  const newVal = !conversation.human_takeover;
  return {
    human_takeover: newVal,
    takeover_by: newVal ? userId : null,
    takeover_at: newVal ? new Date().toISOString() : null,
  };
}

function getTakeoverLabel(isHuman: boolean): { buttonText: string; badgeText: string; badgeColor: string } {
  if (isHuman) {
    return {
      buttonText: "Devolver para Agente",
      badgeText: "Atendimento Humano",
      badgeColor: "amber",
    };
  }
  return {
    buttonText: "Assumir Conversa",
    badgeText: "IA Ativa",
    badgeColor: "emerald",
  };
}

describe("buildTakeoverUpdate", () => {
  it("ativa takeover quando estava desativado", () => {
    const conv: Conversation = { id: "c1", human_takeover: false };
    const update = buildTakeoverUpdate(conv, "user-123");

    expect(update.human_takeover).toBe(true);
    expect(update.takeover_by).toBe("user-123");
    expect(update.takeover_at).toBeTruthy();
  });

  it("desativa takeover quando estava ativado", () => {
    const conv: Conversation = { id: "c1", human_takeover: true };
    const update = buildTakeoverUpdate(conv, "user-123");

    expect(update.human_takeover).toBe(false);
    expect(update.takeover_by).toBeNull();
    expect(update.takeover_at).toBeNull();
  });

  it("gera takeover_at como ISO string valida", () => {
    const conv: Conversation = { id: "c1", human_takeover: false };
    const update = buildTakeoverUpdate(conv, "user-123");

    const date = new Date(update.takeover_at!);
    expect(date.getTime()).not.toBeNaN();
  });
});

describe("getTakeoverLabel", () => {
  it("mostra 'Devolver para Agente' quando humano assumiu", () => {
    const labels = getTakeoverLabel(true);
    expect(labels.buttonText).toBe("Devolver para Agente");
    expect(labels.badgeText).toBe("Atendimento Humano");
    expect(labels.badgeColor).toBe("amber");
  });

  it("mostra 'Assumir Conversa' quando IA esta ativa", () => {
    const labels = getTakeoverLabel(false);
    expect(labels.buttonText).toBe("Assumir Conversa");
    expect(labels.badgeText).toBe("IA Ativa");
    expect(labels.badgeColor).toBe("emerald");
  });
});

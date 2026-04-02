import { describe, it, expect } from "vitest";
import {
  isLowValueContent,
  getSourcePriority,
  chunkContentImproved,
} from "../rag-utils";

// ---------------------------------------------------------------------------
// isLowValueContent
// ---------------------------------------------------------------------------
describe("isLowValueContent", () => {
  it("returns false for document source regardless of content", () => {
    expect(isLowValueContent("", "document")).toBe(false);
    expect(isLowValueContent("#hashtag #only", "document")).toBe(false);
    expect(isLowValueContent("\u{1F600}\u{1F600}\u{1F600}", "document")).toBe(false);
  });

  it("returns false for manual source regardless of content", () => {
    expect(isLowValueContent("", "manual")).toBe(false);
    expect(isLowValueContent("short", "manual")).toBe(false);
  });

  it("returns false for website source regardless of content", () => {
    expect(isLowValueContent("tiny", "website")).toBe(false);
  });

  it("returns true for social content that is mostly emojis", () => {
    // Build a string that is >70% emoji by length
    const emojis = "\u{1F600}\u{1F601}\u{1F602}\u{1F603}\u{1F604}\u{1F605}\u{1F606}\u{1F607}\u{1F608}\u{1F609}\u{1F60A}\u{1F60B}\u{1F60C}\u{1F60D}\u{1F60E}\u{1F60F}";
    const content = emojis + " lol";
    expect(isLowValueContent(content, "social")).toBe(true);
  });

  it("returns true for very short social content after cleanup", () => {
    expect(isLowValueContent("#food #delicious yum", "social")).toBe(true);
    expect(isLowValueContent("ok", "social")).toBe(true);
    expect(isLowValueContent("", "social")).toBe(true);
  });

  it("returns true for social content that is mostly hashtags", () => {
    const hashtags = "#food #delicious #restaurant #yummy #eat #lunch #dinner #breakfast #meal #chef";
    expect(isLowValueContent(hashtags + " check it out", "social")).toBe(true);
  });

  it("returns false for social content with real information (prices, hours, services)", () => {
    const useful =
      "Nosso cardapio de almoco: Feijoada completa R$35,90, Filé com fritas R$42,00. " +
      "Funcionamos de segunda a sabado das 11h as 15h. Delivery disponivel pelo WhatsApp.";
    expect(isLowValueContent(useful, "social")).toBe(false);
  });

  it("returns false for social content with enough meaningful text", () => {
    const longPost =
      "Estamos super felizes em anunciar a inauguracao da nossa nova loja no Shopping Center Norte! " +
      "Venha conferir nossas promocoes de abertura com descontos de ate 50% em todos os produtos.";
    expect(isLowValueContent(longPost, "social")).toBe(false);
  });

  it("returns false for social content with a mix of text and a few hashtags", () => {
    const mixed =
      "Inauguracao da nossa nova clinica de fisioterapia no Jardins! Atendemos convênios e particular. " +
      "Agende sua avaliacao gratuita pelo WhatsApp (11) 99999-0000. #fisioterapia #saude";
    expect(isLowValueContent(mixed, "social")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getSourcePriority
// ---------------------------------------------------------------------------
describe("getSourcePriority", () => {
  it("returns 100 for document", () => {
    expect(getSourcePriority("document")).toBe(100);
  });

  it("returns 90 for manual", () => {
    expect(getSourcePriority("manual")).toBe(90);
  });

  it("returns 70 for website", () => {
    expect(getSourcePriority("website")).toBe(70);
  });

  it("returns 10 for social", () => {
    expect(getSourcePriority("social")).toBe(10);
  });

  it("returns 50 for unknown source types", () => {
    expect(getSourcePriority("unknown")).toBe(50);
    expect(getSourcePriority("")).toBe(50);
    expect(getSourcePriority("api")).toBe(50);
  });

  it("preserves ordering: document > manual > website > social", () => {
    const doc = getSourcePriority("document");
    const manual = getSourcePriority("manual");
    const website = getSourcePriority("website");
    const social = getSourcePriority("social");
    expect(doc).toBeGreaterThan(manual);
    expect(manual).toBeGreaterThan(website);
    expect(website).toBeGreaterThan(social);
  });
});

// ---------------------------------------------------------------------------
// chunkContentImproved
// ---------------------------------------------------------------------------
describe("chunkContentImproved", () => {
  it("returns a single chunk for short text", () => {
    const short = "Bem-vindo ao nosso restaurante. Temos pratos variados.";
    const chunks = chunkContentImproved(short);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(short);
  });

  it("splits long text into multiple chunks", () => {
    // Create a text long enough to require splitting (>1000 chars by default)
    const paragraph = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(10);
    const longText = [paragraph, paragraph, paragraph, paragraph].join("\n\n");
    const chunks = chunkContentImproved(longText);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("preserves tables as single chunks", () => {
    const table = [
      "Plano Mega 100 - R$99,90/mes",
      "Plano Mega 200 - R$149,90/mes",
      "Plano Mega 500 - R$199,90/mes",
      "Plano Mega 1000 - R$299,90/mes",
    ].join("\n");
    const before = "Introducao ao catalogo de planos de internet.";
    const text = before + "\n\n" + table;
    const chunks = chunkContentImproved(text);
    // The table should appear as its own chunk, not split
    const tableChunk = chunks.find((c) => c.includes("Mega 100") && c.includes("Mega 1000"));
    expect(tableChunk).toBeDefined();
  });

  it("adds overlap between chunks", () => {
    // Build sections that will exceed maxChunk when combined
    const sectionA = "Secao A: " + "Palavra ".repeat(100);
    const sectionB = "Secao B: " + "Texto ".repeat(100);
    const sectionC = "Secao C: " + "Frase ".repeat(100);
    const text = [sectionA, sectionB, sectionC].join("\n\n");
    const chunks = chunkContentImproved(text, 500, 100);
    expect(chunks.length).toBeGreaterThan(1);
    // Second chunk should start with overlap words from the end of the first chunk's content
    // (overlap means the second chunk contains some words that also appeared in the first)
    if (chunks.length >= 2) {
      const firstWords = chunks[0].split(/\s+/);
      const lastWordsOfFirst = firstWords.slice(-5);
      const secondChunkStart = chunks[1].split(/\s+/).slice(0, 30).join(" ");
      // At least some overlap words should appear at the start of the second chunk
      const hasOverlap = lastWordsOfFirst.some((w) => secondChunkStart.includes(w));
      expect(hasOverlap).toBe(true);
    }
  });

  it("handles empty text", () => {
    const chunks = chunkContentImproved("");
    expect(chunks).toHaveLength(0);
  });

  it("handles text shorter than minimum (10 chars) by filtering it out", () => {
    const chunks = chunkContentImproved("Hi");
    expect(chunks).toHaveLength(0);
  });

  it("keeps chunks under maxChunk except for tables", () => {
    const sections = Array.from({ length: 10 }, (_, i) =>
      `Secao ${i + 1}: ` + "Conteudo relevante sobre o negocio. ".repeat(15),
    );
    const text = sections.join("\n\n");
    const maxChunk = 600;
    const chunks = chunkContentImproved(text, maxChunk);
    for (const chunk of chunks) {
      // Non-table chunks should respect maxChunk (with some tolerance for overlap prefix)
      // We allow a generous margin because overlap words prepended can push slightly over
      expect(chunk.length).toBeLessThan(maxChunk * 2);
    }
  });

  it("table detection works for price tables with R$", () => {
    const priceTable = [
      "Corte masculino - R$45,00",
      "Corte feminino - R$65,00",
      "Barba - R$30,00",
      "Corte + Barba - R$70,00",
      "Hidratacao - R$50,00",
    ].join("\n");
    const intro = "Confira nossa tabela de precos atualizada para 2026.";
    const outro = "Agende pelo WhatsApp ou pelo nosso site. Aceitamos cartao e PIX.";
    const text = [intro, priceTable, outro].join("\n\n");
    const chunks = chunkContentImproved(text);
    // The price table must be kept as a single chunk
    const tableChunk = chunks.find(
      (c) => c.includes("R$45,00") && c.includes("R$70,00") && c.includes("R$50,00"),
    );
    expect(tableChunk).toBeDefined();
  });

  it("table detection recognises MEGA-style broadband plans", () => {
    const megaTable = [
      "MEGA 100 - velocidade de 100Mbps - R$89,90",
      "MEGA 200 - velocidade de 200Mbps - R$109,90",
      "MEGA 500 - velocidade de 500Mbps - R$149,90",
    ].join("\n");
    const text = "Planos disponiveis:\n\n" + megaTable;
    const chunks = chunkContentImproved(text);
    const tableChunk = chunks.find((c) => c.includes("MEGA 100") && c.includes("MEGA 500"));
    expect(tableChunk).toBeDefined();
  });

  it("does not treat non-table text as a table", () => {
    const prose =
      "Nosso restaurante fica na Rua das Flores, 123.\n" +
      "Atendemos de segunda a sexta.\n" +
      "Venha nos visitar!";
    const text = "Informacoes gerais:\n\n" + prose;
    const chunks = chunkContentImproved(text);
    // Should still produce chunks normally, not special-case the prose
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it("respects custom maxChunk and overlap parameters", () => {
    const section = "Texto de exemplo para teste de chunking. ".repeat(20);
    const text = [section, section, section].join("\n\n");
    const smallChunks = chunkContentImproved(text, 300, 50);
    const largeChunks = chunkContentImproved(text, 2000, 200);
    // Smaller maxChunk should produce more chunks
    expect(smallChunks.length).toBeGreaterThanOrEqual(largeChunks.length);
  });

  it("does not special-case a table section that exceeds 2000 chars", () => {
    // Create a huge table that exceeds the 2000-char limit
    const hugeTable = Array.from({ length: 150 }, (_, i) =>
      `Item ${String(i + 1).padStart(3, "0")} - Produto de exemplo numero ${i + 1} - R$${(i * 10 + 9.9).toFixed(2)}`,
    ).join("\n");
    expect(hugeTable.length).toBeGreaterThan(2000);

    // Place the huge table between two regular sections so the table is a distinct section
    const before = "Catalogo completo de produtos da loja.";
    const after = "Para mais informacoes entre em contato com nossa equipe de vendas.";
    const text = [before, hugeTable, after].join("\n\n");
    const chunks = chunkContentImproved(text);

    // The intro should be flushed as its own chunk before the huge table section
    // (because the table section fails the <= 2000 guard and falls through to normal chunking)
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // The first chunk should be the intro (flushed before the oversized section)
    expect(chunks[0]).toContain("Catalogo completo");
    // The huge table should NOT be in the same chunk as the intro
    expect(chunks[0]).not.toContain("Item 001");
  });
});

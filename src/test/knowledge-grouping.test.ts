import { describe, it, expect } from "vitest";

// Logica de agrupamento de knowledge base extraida do AgentDetail

interface KBItem {
  id: string;
  source_type: string;
  source_name: string | null;
  source_url: string | null;
  created_at: string;
}

interface GroupedSource {
  source_name: string;
  source_type: string;
  source_url: string | null;
  created_at: string;
  chunks: number;
}

function groupKnowledgeSources(items: KBItem[]): GroupedSource[] {
  const grouped: Record<string, GroupedSource> = {};

  for (const item of items) {
    const key = item.source_name || item.id;
    if (!grouped[key]) {
      grouped[key] = {
        source_name: item.source_name || "Sem nome",
        source_type: item.source_type,
        source_url: item.source_url,
        created_at: item.created_at,
        chunks: 0,
      };
    }
    grouped[key].chunks++;
  }

  return Object.values(grouped);
}

const MOCK_ITEMS: KBItem[] = [
  { id: "1", source_type: "document", source_name: "Cardapio.pdf", source_url: null, created_at: "2026-03-30T10:00:00Z" },
  { id: "2", source_type: "document", source_name: "Cardapio.pdf", source_url: null, created_at: "2026-03-30T10:00:00Z" },
  { id: "3", source_type: "document", source_name: "Cardapio.pdf", source_url: null, created_at: "2026-03-30T10:00:00Z" },
  { id: "4", source_type: "website", source_name: "Site Principal", source_url: "https://example.com", created_at: "2026-03-30T11:00:00Z" },
  { id: "5", source_type: "website", source_name: "Site Principal", source_url: "https://example.com", created_at: "2026-03-30T11:00:00Z" },
  { id: "6", source_type: "social", source_name: "Instagram @empresa", source_url: "https://instagram.com/empresa", created_at: "2026-03-30T12:00:00Z" },
];

describe("groupKnowledgeSources", () => {
  it("agrupa items pelo source_name", () => {
    const grouped = groupKnowledgeSources(MOCK_ITEMS);
    expect(grouped.length).toBe(3);
  });

  it("conta chunks corretamente", () => {
    const grouped = groupKnowledgeSources(MOCK_ITEMS);
    const cardapio = grouped.find(g => g.source_name === "Cardapio.pdf");
    expect(cardapio?.chunks).toBe(3);

    const site = grouped.find(g => g.source_name === "Site Principal");
    expect(site?.chunks).toBe(2);

    const insta = grouped.find(g => g.source_name === "Instagram @empresa");
    expect(insta?.chunks).toBe(1);
  });

  it("preserva source_type de cada grupo", () => {
    const grouped = groupKnowledgeSources(MOCK_ITEMS);
    const cardapio = grouped.find(g => g.source_name === "Cardapio.pdf");
    expect(cardapio?.source_type).toBe("document");

    const insta = grouped.find(g => g.source_name === "Instagram @empresa");
    expect(insta?.source_type).toBe("social");
  });

  it("preserva source_url quando existe", () => {
    const grouped = groupKnowledgeSources(MOCK_ITEMS);
    const site = grouped.find(g => g.source_name === "Site Principal");
    expect(site?.source_url).toBe("https://example.com");

    const cardapio = grouped.find(g => g.source_name === "Cardapio.pdf");
    expect(cardapio?.source_url).toBeNull();
  });

  it("retorna array vazio para input vazio", () => {
    expect(groupKnowledgeSources([])).toEqual([]);
  });

  it("usa id como fallback quando source_name e null", () => {
    const items: KBItem[] = [
      { id: "abc", source_type: "manual", source_name: null, source_url: null, created_at: "2026-03-30T10:00:00Z" },
    ];
    const grouped = groupKnowledgeSources(items);
    expect(grouped.length).toBe(1);
    expect(grouped[0].source_name).toBe("Sem nome");
    expect(grouped[0].chunks).toBe(1);
  });
});

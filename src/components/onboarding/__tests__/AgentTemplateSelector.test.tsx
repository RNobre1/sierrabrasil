import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AgentTemplateSelector from "../AgentTemplateSelector";
import type { AgentTemplate } from "../AgentTemplateSelector";

const MOCK_TEMPLATES: AgentTemplate[] = [
  { id: "t1", name: "Vendas", class: "sales", description: "Converter leads", icon: "ShoppingBag" },
  { id: "t2", name: "Suporte", class: "support", description: "Resolver problemas", icon: "Headphones" },
  { id: "t3", name: "Agendamento", class: "scheduling", description: "Agendar consultas", icon: "Calendar" },
];

describe("AgentTemplateSelector", () => {
  it("renderiza todos os templates fornecidos", () => {
    render(
      <AgentTemplateSelector templates={MOCK_TEMPLATES} selectedId={null} onSelect={vi.fn()} />
    );

    expect(screen.getByText("Vendas")).toBeInTheDocument();
    expect(screen.getByText("Suporte")).toBeInTheDocument();
    expect(screen.getByText("Agendamento")).toBeInTheDocument();
  });

  it("exibe descricao de cada template", () => {
    render(
      <AgentTemplateSelector templates={MOCK_TEMPLATES} selectedId={null} onSelect={vi.fn()} />
    );

    expect(screen.getByText("Converter leads")).toBeInTheDocument();
    expect(screen.getByText("Resolver problemas")).toBeInTheDocument();
    expect(screen.getByText("Agendar consultas")).toBeInTheDocument();
  });

  it("chama onSelect com o id correto ao clicar num template", () => {
    const onSelect = vi.fn();
    render(
      <AgentTemplateSelector templates={MOCK_TEMPLATES} selectedId={null} onSelect={onSelect} />
    );

    fireEvent.click(screen.getByText("Suporte"));
    expect(onSelect).toHaveBeenCalledWith("t2");
  });

  it("aplica estilo de selecao no template selecionado", () => {
    const { container } = render(
      <AgentTemplateSelector templates={MOCK_TEMPLATES} selectedId="t1" onSelect={vi.fn()} />
    );

    const cards = container.querySelectorAll("[class*='cursor-pointer']");
    const selectedCard = cards[0];
    expect(selectedCard.className).toContain("border-cosmos-indigo");
    expect(selectedCard.className).toContain("shadow-glow-indigo");
  });

  it("nao aplica estilo de selecao nos templates nao selecionados", () => {
    const { container } = render(
      <AgentTemplateSelector templates={MOCK_TEMPLATES} selectedId="t1" onSelect={vi.fn()} />
    );

    const cards = container.querySelectorAll("[class*='cursor-pointer']");
    const unselectedCard = cards[1];
    expect(unselectedCard.className).not.toContain("border-cosmos-indigo");
  });

  it("renderiza lista vazia sem erros", () => {
    const { container } = render(
      <AgentTemplateSelector templates={[]} selectedId={null} onSelect={vi.fn()} />
    );

    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    expect(grid?.children.length).toBe(0);
  });

  it("usa icone fallback quando icon string nao e reconhecida", () => {
    const templates: AgentTemplate[] = [
      { id: "t1", name: "Custom", class: "custom", description: "Teste", icon: "IconeInexistente" },
    ];

    render(
      <AgentTemplateSelector templates={templates} selectedId={null} onSelect={vi.fn()} />
    );

    expect(screen.getByText("Custom")).toBeInTheDocument();
  });
});

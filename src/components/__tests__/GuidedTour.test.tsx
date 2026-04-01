import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import GuidedTour from "../GuidedTour";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderAndShow() {
  const result = render(<GuidedTour />);
  act(() => { vi.advanceTimersByTime(2000); });
  return result;
}

describe("GuidedTour", () => {
  it("nao renderiza se tour ja foi completado", () => {
    localStorage.setItem("theagent_guided_tour_completed", "true");
    const { container } = render(<GuidedTour />);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(container.innerHTML).toBe("");
  });

  it("renderiza titulo do primeiro step apos delay", () => {
    renderAndShow();
    expect(screen.getByText(/indicadores/i)).toBeInTheDocument();
  });

  it("avanca para proximo step ao clicar Proximo", () => {
    renderAndShow();
    fireEvent.click(screen.getByRole("button", { name: /proximo/i }));
    expect(screen.getByText(/conversas por dia/i)).toBeInTheDocument();
  });

  it("volta para step anterior ao clicar Anterior", () => {
    renderAndShow();
    fireEvent.click(screen.getByRole("button", { name: /proximo/i }));
    fireEvent.click(screen.getByRole("button", { name: /anterior/i }));
    expect(screen.getByText(/indicadores/i)).toBeInTheDocument();
  });

  it("mostra indicador de progresso (step/total)", () => {
    renderAndShow();
    expect(screen.getByText(/1\//)).toBeInTheDocument();
  });

  it("fecha ao clicar no X e salva no localStorage", () => {
    renderAndShow();
    fireEvent.click(screen.getByLabelText(/fechar/i));
    expect(localStorage.getItem("theagent_guided_tour_completed")).toBe("true");
  });

  it("mostra botao Pular", () => {
    renderAndShow();
    expect(screen.getByText(/pular/i)).toBeInTheDocument();
  });

  it("nao mostra botao Anterior no primeiro step", () => {
    renderAndShow();
    expect(screen.queryByRole("button", { name: /anterior/i })).not.toBeInTheDocument();
  });

  it("mostra Comecar no ultimo step", () => {
    renderAndShow();
    // Avanca ate o ultimo step
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByRole("button", { name: /proximo/i }));
    }
    expect(screen.getByRole("button", { name: /comecar/i })).toBeInTheDocument();
  });
});

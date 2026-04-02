import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import GuidedTour from "../GuidedTour";
import { Zap, BarChart3 } from "lucide-react";
import { createElement } from "react";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// --- Default (Dashboard) mode ---

function renderAndShow() {
  const result = render(createElement(GuidedTour));
  act(() => { vi.advanceTimersByTime(2000); });
  return result;
}

describe("GuidedTour (default Dashboard)", () => {
  it("nao renderiza se tour ja foi completado", () => {
    localStorage.setItem("theagent_guided_tour_completed", "true");
    const { container } = render(createElement(GuidedTour));
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
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByRole("button", { name: /proximo/i }));
    }
    expect(screen.getByRole("button", { name: /comecar/i })).toBeInTheDocument();
  });
});

// --- Custom steps mode (reusable per-page) ---

const customSteps = [
  {
    title: "Step A",
    description: "Descricao A",
    icon: createElement(Zap, { className: "h-5 w-5" }),
    selector: "[data-tour='a']",
  },
  {
    title: "Step B",
    description: "Descricao B",
    icon: createElement(BarChart3, { className: "h-5 w-5" }),
    selector: "[data-tour='b']",
  },
];

describe("GuidedTour (custom steps)", () => {
  it("uses custom tourKey for localStorage", () => {
    localStorage.setItem("tour_custom_page", "true");
    const { container } = render(
      createElement(GuidedTour, { steps: customSteps, tourKey: "tour_custom_page" }),
    );
    act(() => { vi.advanceTimersByTime(2000); });
    expect(container.innerHTML).toBe("");
  });

  it("renders custom steps", () => {
    render(createElement(GuidedTour, { steps: customSteps, tourKey: "tour_custom" }));
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText("Step A")).toBeInTheDocument();
  });

  it("navigates through custom steps", () => {
    render(createElement(GuidedTour, { steps: customSteps, tourKey: "tour_custom" }));
    act(() => { vi.advanceTimersByTime(2000); });
    fireEvent.click(screen.getByRole("button", { name: /proximo/i }));
    expect(screen.getByText("Step B")).toBeInTheDocument();
  });

  it("shows Comecar on last custom step", () => {
    render(createElement(GuidedTour, { steps: customSteps, tourKey: "tour_custom" }));
    act(() => { vi.advanceTimersByTime(2000); });
    fireEvent.click(screen.getByRole("button", { name: /proximo/i }));
    expect(screen.getByRole("button", { name: /comecar/i })).toBeInTheDocument();
  });

  it("saves custom tourKey on dismiss", () => {
    render(createElement(GuidedTour, { steps: customSteps, tourKey: "tour_custom" }));
    act(() => { vi.advanceTimersByTime(2000); });
    fireEvent.click(screen.getByLabelText(/fechar/i));
    expect(localStorage.getItem("tour_custom")).toBe("true");
  });

  it("shows correct step count for custom steps", () => {
    render(createElement(GuidedTour, { steps: customSteps, tourKey: "tour_custom" }));
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });
});

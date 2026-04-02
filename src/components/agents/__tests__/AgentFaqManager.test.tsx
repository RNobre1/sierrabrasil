import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AgentFaqManager from "../AgentFaqManager";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: "new-id", question: "Test?", answer: "Answer", is_active: true, match_count: 0 },
            error: null,
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("AgentFaqManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the FAQ manager title", () => {
    render(<AgentFaqManager agentId="agent-1" tenantId="tenant-1" />);
    expect(screen.getByText(/FAQ/i)).toBeDefined();
  });

  it("shows empty state when no FAQs exist", async () => {
    render(<AgentFaqManager agentId="agent-1" tenantId="tenant-1" />);
    await waitFor(() => {
      expect(screen.getByText(/nenhuma pergunta/i)).toBeDefined();
    });
  });

  it("has input fields for question and answer", () => {
    render(<AgentFaqManager agentId="agent-1" tenantId="tenant-1" />);
    expect(screen.getByPlaceholderText(/pergunta/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/resposta/i)).toBeDefined();
  });

  it("has an add button", () => {
    render(<AgentFaqManager agentId="agent-1" tenantId="tenant-1" />);
    expect(screen.getByRole("button", { name: /adicionar/i })).toBeDefined();
  });

  it("disables add button when fields are empty", () => {
    render(<AgentFaqManager agentId="agent-1" tenantId="tenant-1" />);
    const addBtn = screen.getByRole("button", { name: /adicionar/i });
    expect(addBtn).toHaveProperty("disabled", true);
  });
});

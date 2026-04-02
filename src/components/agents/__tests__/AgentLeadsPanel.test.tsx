import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AgentLeadsPanel from "../AgentLeadsPanel";

const mockLeads = [
  {
    id: "1",
    contact_name: "Maria Silva",
    contact_email: "maria@email.com",
    contact_phone: "5511999999999",
    source: "whatsapp",
    created_at: "2026-04-01T10:00:00Z",
  },
  {
    id: "2",
    contact_name: "Joao Santos",
    contact_email: null,
    contact_phone: "5511888888888",
    source: "whatsapp",
    created_at: "2026-04-01T09:00:00Z",
  },
];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: mockLeads, error: null })),
          })),
        })),
      })),
    })),
  },
}));

describe("AgentLeadsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the leads panel title", () => {
    render(<AgentLeadsPanel agentId="agent-1" />);
    expect(screen.getByText("Leads Capturados")).toBeDefined();
  });

  it("displays lead names after loading", async () => {
    render(<AgentLeadsPanel agentId="agent-1" />);
    await waitFor(() => {
      expect(screen.getByText("Maria Silva")).toBeDefined();
      expect(screen.getByText("Joao Santos")).toBeDefined();
    });
  });

  it("displays lead contact info", async () => {
    render(<AgentLeadsPanel agentId="agent-1" />);
    await waitFor(() => {
      expect(screen.getByText("maria@email.com")).toBeDefined();
    });
  });
});

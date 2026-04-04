import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WhatsAppConnectBanner from "../WhatsAppConnectBanner";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

describe("WhatsAppConnectBanner", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renderiza banner quando nao esta conectado e tem agentes", () => {
    render(<WhatsAppConnectBanner isConnected={false} hasAgents={true} />);
    expect(screen.getByText(/nenhum numero whatsapp conectado/i)).toBeInTheDocument();
  });

  it("nao renderiza quando ja esta conectado", () => {
    const { container } = render(<WhatsAppConnectBanner isConnected={true} hasAgents={true} />);
    expect(container.firstChild).toBeNull();
  });

  it("nao renderiza quando nao tem agentes", () => {
    const { container } = render(<WhatsAppConnectBanner isConnected={false} hasAgents={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza quando hasAgents nao e passado (default true)", () => {
    render(<WhatsAppConnectBanner isConnected={false} />);
    expect(screen.getByText(/nenhum numero whatsapp conectado/i)).toBeInTheDocument();
  });

  it("mostra botao Conectar WhatsApp", () => {
    render(<WhatsAppConnectBanner isConnected={false} hasAgents={true} />);
    const button = screen.getByRole("button", { name: /conectar whatsapp/i });
    expect(button).toBeInTheDocument();
  });

  it("navega para /channels ao clicar no botao", () => {
    render(<WhatsAppConnectBanner isConnected={false} hasAgents={true} />);
    fireEvent.click(screen.getByRole("button", { name: /conectar whatsapp/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/channels");
  });

  it("mostra mensagem explicativa", () => {
    render(<WhatsAppConnectBanner isConnected={false} hasAgents={true} />);
    expect(screen.getByText(/seus agentes nao podem receber mensagens/i)).toBeInTheDocument();
  });

  it("permite fechar o banner", () => {
    render(<WhatsAppConnectBanner isConnected={false} hasAgents={true} />);
    const closeButton = screen.getByLabelText(/fechar/i);
    fireEvent.click(closeButton);
    expect(screen.queryByText(/nenhum numero whatsapp conectado/i)).not.toBeInTheDocument();
  });
});

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

  it("renderiza banner quando nao esta conectado", () => {
    render(<WhatsAppConnectBanner isConnected={false} />);
    expect(screen.getByText(/conecte seu whatsapp/i)).toBeInTheDocument();
  });

  it("nao renderiza nada quando ja esta conectado", () => {
    const { container } = render(<WhatsAppConnectBanner isConnected={true} />);
    expect(container.firstChild).toBeNull();
  });

  it("mostra botao para ir ate a pagina de canais", () => {
    render(<WhatsAppConnectBanner isConnected={false} />);
    const button = screen.getByRole("button", { name: /conectar/i });
    expect(button).toBeInTheDocument();
  });

  it("navega para /channels ao clicar no botao", () => {
    render(<WhatsAppConnectBanner isConnected={false} />);
    fireEvent.click(screen.getByRole("button", { name: /conectar/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/channels");
  });

  it("mostra titulo com WhatsApp", () => {
    render(<WhatsAppConnectBanner isConnected={false} />);
    expect(screen.getByRole("heading", { name: /conecte seu whatsapp/i })).toBeInTheDocument();
  });

  it("permite fechar o banner", () => {
    render(<WhatsAppConnectBanner isConnected={false} />);
    const closeButton = screen.getByLabelText(/fechar/i);
    fireEvent.click(closeButton);
    expect(screen.queryByText(/conecte seu whatsapp/i)).not.toBeInTheDocument();
  });
});

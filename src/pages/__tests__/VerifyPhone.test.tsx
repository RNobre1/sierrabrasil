import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VerifyPhone from "../VerifyPhone";

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock useAuth
const mockUser = { id: "user-123", user_metadata: { whatsapp: "+5535999998888" } };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, session: { access_token: "token-abc" }, loading: false }),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock supabase functions invoke + from (for phone_verified check)
const mockInvoke = vi.fn();
const mockSingle = vi.fn().mockResolvedValue({ data: { phone_verified: false }, error: null });
const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }) },
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <VerifyPhone />
    </MemoryRouter>
  );
}

describe("VerifyPhone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it("renderiza titulo de verificacao", () => {
    renderPage();
    expect(screen.getByText(/verificação whatsapp/i)).toBeInTheDocument();
  });

  it("mostra numero mascarado do usuario", () => {
    renderPage();
    expect(screen.getByText(/\+55/)).toBeInTheDocument();
  });

  it("renderiza 6 inputs para o codigo OTP", () => {
    renderPage();
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(6);
  });

  it("envia OTP automaticamente ao montar", async () => {
    renderPage();
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("send-otp", {
        body: { phone: "+5535999998888" },
      });
    });
  });

  it("botao verificar desabilitado com codigo incompleto", () => {
    renderPage();
    const button = screen.getByRole("button", { name: /verificar/i });
    expect(button).toBeDisabled();
  });

  it("chama verify-otp ao submeter codigo completo", async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: { success: true }, error: null }) // send-otp
      .mockResolvedValueOnce({ data: { success: true }, error: null }); // verify-otp

    renderPage();
    const inputs = screen.getAllByRole("textbox");
    "123456".split("").forEach((digit, i) => {
      fireEvent.change(inputs[i], { target: { value: digit } });
    });

    const button = screen.getByRole("button", { name: /verificar/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("verify-otp", {
        body: { code: "123456" },
      });
    });
  });

  it("redireciona para /onboarding apos verificacao bem-sucedida", async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: { success: true }, error: null }) // send-otp
      .mockResolvedValueOnce({ data: { success: true }, error: null }); // verify-otp

    renderPage();
    const inputs = screen.getAllByRole("textbox");
    "123456".split("").forEach((digit, i) => {
      fireEvent.change(inputs[i], { target: { value: digit } });
    });

    fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("mostra erro quando codigo esta incorreto", async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: { success: true }, error: null }) // send-otp
      .mockResolvedValueOnce({
        data: { error: "Codigo incorreto. 2 tentativas restantes.", remaining: 2 },
        error: null,
      }); // verify-otp

    renderPage();

    // Wait for send-otp to be called (now async due to phone_verified check)
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("send-otp", expect.anything());
    });

    const inputs = screen.getAllByRole("textbox");
    "999999".split("").forEach((digit, i) => {
      fireEvent.change(inputs[i], { target: { value: digit } });
    });

    fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

    await waitFor(() => {
      expect(screen.getByText(/incorreto|tentativa/i)).toBeInTheDocument();
    });
  });

  it("mostra link para alterar numero", () => {
    renderPage();
    expect(screen.getByText(/alterar número/i)).toBeInTheDocument();
  });

  it("mostra countdown de reenvio", () => {
    renderPage();
    expect(screen.getByText(/reenviar em/i)).toBeInTheDocument();
  });
});

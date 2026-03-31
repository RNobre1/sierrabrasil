import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PhoneCollectStep from "../PhoneCollectStep";

describe("PhoneCollectStep", () => {
  it("renderiza campo de WhatsApp", () => {
    render(<PhoneCollectStep onSubmit={vi.fn()} />);
    expect(screen.getByPlaceholderText(/00000-0000/)).toBeInTheDocument();
  });

  it("mostra titulo pedindo o numero", () => {
    render(<PhoneCollectStep onSubmit={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /qual seu whatsapp/i })).toBeInTheDocument();
  });

  it("nao chama onSubmit com numero invalido (menos de 10 digitos)", () => {
    const onSubmit = vi.fn();
    render(<PhoneCollectStep onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText(/00000-0000/);
    fireEvent.change(input, { target: { value: "(11) 9999" } });
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("chama onSubmit com numero formatado quando valido", () => {
    const onSubmit = vi.fn();
    render(<PhoneCollectStep onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText(/00000-0000/);
    fireEvent.change(input, { target: { value: "(11) 99999-8888" } });
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(onSubmit).toHaveBeenCalledWith("+5511999998888");
  });

  it("mostra nome do usuario quando fornecido", () => {
    render(<PhoneCollectStep onSubmit={vi.fn()} userName="Rafael" />);
    expect(screen.getByText(/rafael/i)).toBeInTheDocument();
  });
});

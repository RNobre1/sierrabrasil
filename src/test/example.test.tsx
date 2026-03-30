import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BusinessOverview from "@/components/onboarding/BusinessOverview";

describe("BusinessOverview", () => {
  it("avança da revisão final para o próximo passo ao confirmar", () => {
    const onConfirm = vi.fn();

    render(
      <BusinessOverview
        data={{ businessName: "Empresa Teste" }}
        sourcePreviews={[
          { platform: "instagram", url: "https://instagram.com/empresa", displayName: "Empresa Teste" },
        ]}
        onConfirm={onConfirm}
        onGoBack={vi.fn()}
        onDataChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    fireEvent.click(screen.getByRole("button", { name: /tudo certo, continuar/i }));

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ businessName: "Empresa Teste" }));
  });
});

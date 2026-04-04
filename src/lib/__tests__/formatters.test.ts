import { describe, it, expect } from "vitest";
import {
  formatPhoneDisplay,
  formatPhoneInput,
  maskPhoneForOtp,
  formatCurrency,
} from "../formatters";

// ─── formatPhoneDisplay ───────────────────────────

describe("formatPhoneDisplay", () => {
  it("returns empty string for falsy input", () => {
    expect(formatPhoneDisplay("")).toBe("");
  });

  it("formats 13-digit mobile with country code", () => {
    expect(formatPhoneDisplay("5511999887766")).toBe("+55 (11) 99988-7766");
  });

  it("formats 13-digit mobile with + prefix", () => {
    expect(formatPhoneDisplay("+5511999887766")).toBe("+55 (11) 99988-7766");
  });

  it("formats 12-digit landline with country code", () => {
    expect(formatPhoneDisplay("551140041234")).toBe("+55 (11) 4004-1234");
  });

  it("formats 11-digit mobile without country code", () => {
    expect(formatPhoneDisplay("11999887766")).toBe("(11) 99988-7766");
  });

  it("formats 10-digit landline without country code", () => {
    expect(formatPhoneDisplay("1140041234")).toBe("(11) 4004-1234");
  });

  it("falls back to original for unknown patterns", () => {
    expect(formatPhoneDisplay("123")).toBe("123");
  });

  it("handles already-formatted input by stripping non-digits first", () => {
    expect(formatPhoneDisplay("+55 (11) 99988-7766")).toBe("+55 (11) 99988-7766");
  });
});

// ─── formatPhoneInput ─────────────────────────────

describe("formatPhoneInput", () => {
  it("returns empty for empty input", () => {
    expect(formatPhoneInput("")).toBe("");
  });

  it("formats 2-digit DDD only", () => {
    expect(formatPhoneInput("11")).toBe("(11");
  });

  it("formats partial number (5 digits)", () => {
    expect(formatPhoneInput("11999")).toBe("(11) 999");
  });

  it("formats complete 11-digit mobile", () => {
    expect(formatPhoneInput("11999887766")).toBe("(11) 99988-7766");
  });

  it("strips non-digit chars before formatting", () => {
    expect(formatPhoneInput("(11) 999")).toBe("(11) 999");
  });

  it("caps at 11 digits", () => {
    expect(formatPhoneInput("119998877661234")).toBe("(11) 99988-7766");
  });
});

// ─── maskPhoneForOtp ──────────────────────────────

describe("maskPhoneForOtp", () => {
  it("masks 13-digit phone (with 55 prefix)", () => {
    expect(maskPhoneForOtp("+5535999998888")).toBe("(35) 99999-8***");
  });

  it("masks 12-digit phone", () => {
    expect(maskPhoneForOtp("553540041234")).toBe("(35) 40041-2***");
  });

  it("masks 11-digit phone without country code", () => {
    const result = maskPhoneForOtp("35999998888");
    expect(result).toContain("(35)");
    expect(result).toContain("*");
  });

  it("returns original for very short numbers", () => {
    expect(maskPhoneForOtp("123")).toBe("123");
  });
});

// ─── formatCurrency ───────────────────────────────

describe("formatCurrency", () => {
  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("R$ 0,00");
  });

  it("formats simple value", () => {
    expect(formatCurrency(97)).toBe("R$ 97,00");
  });

  it("formats value with cents", () => {
    expect(formatCurrency(1234.56)).toBe("R$ 1.234,56");
  });

  it("formats large value with thousands separator", () => {
    expect(formatCurrency(30000)).toBe("R$ 30.000,00");
  });

  it("formats negative value", () => {
    const result = formatCurrency(-50);
    expect(result).toContain("50,00");
  });

  it("formats cents from integer (price_monthly in cents)", () => {
    // price_monthly = 9700 means R$97.00
    expect(formatCurrency(9700 / 100)).toBe("R$ 97,00");
  });
});

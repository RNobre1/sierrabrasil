/**
 * Centralized formatting utilities for the application.
 * All phone formatting logic lives here to avoid duplication.
 */

/**
 * Formats a raw phone number string for display.
 * Handles Brazilian numbers with or without country code.
 *
 * Examples:
 *   "5511999887766"  -> "+55 (11) 99988-7766"
 *   "+5511999887766" -> "+55 (11) 99988-7766"
 *   "11999887766"    -> "(11) 99988-7766"
 *   "1140041234"     -> "(11) 4004-1234"
 *   "5511999887766"  -> "+55 (11) 99988-7766" (13 digits, mobile)
 *   "551140041234"   -> "+55 (11) 4004-1234" (12 digits, landline)
 *
 * Falls back to the original string if it doesn't match known patterns.
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");

  // 13 digits: country code (55) + DDD (2) + mobile (9)
  if (digits.length === 13 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const p1 = digits.slice(4, 9);
    const p2 = digits.slice(9);
    return `+55 (${ddd}) ${p1}-${p2}`;
  }

  // 12 digits: country code (55) + DDD (2) + landline (8)
  if (digits.length === 12 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const p1 = digits.slice(4, 8);
    const p2 = digits.slice(8);
    return `+55 (${ddd}) ${p1}-${p2}`;
  }

  // 11 digits: DDD (2) + mobile (9) — no country code
  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const p1 = digits.slice(2, 7);
    const p2 = digits.slice(7);
    return `(${ddd}) ${p1}-${p2}`;
  }

  // 10 digits: DDD (2) + landline (8) — no country code
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const p1 = digits.slice(2, 6);
    const p2 = digits.slice(6);
    return `(${ddd}) ${p1}-${p2}`;
  }

  // Fallback: return as-is
  return phone;
}

/**
 * Formats a phone input value as the user types.
 * Used for controlled inputs without IMask.
 * Only handles the local part (without country code +55).
 *
 * Input: raw or partially formatted string
 * Output: formatted like "(XX) XXXXX-XXXX"
 */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Formats a number as Brazilian Real (BRL) currency.
 *
 * Examples:
 *   0        -> "R$ 0,00"
 *   97       -> "R$ 97,00"
 *   1234.56  -> "R$ 1.234,56"
 *   30000    -> "R$ 30.000,00"
 */
export function formatCurrency(value: number): string {
  return value
    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    .replace(/\u00A0|\u202F/g, " "); // normalize non-breaking spaces
}

/**
 * Masks a phone number for partial display (privacy).
 * Used when showing the user's own number in OTP screens.
 *
 * Example: "+5535999998888" -> "(35) 99999-8***"
 */
export function maskPhoneForOtp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Expect at least 12 digits (55 + DDD + number)
  if (digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9, 10);
    return `(${ddd}) ${part1}-${part2}${"*".repeat(3)}`;
  }
  // Fallback for shorter numbers
  if (digits.length >= 10) {
    const ddd = digits.slice(0, 2);
    const part1 = digits.slice(2, 7);
    const part2 = digits.slice(7, 8);
    return `(${ddd}) ${part1}-${part2}${"*".repeat(Math.max(0, digits.length - 8))}`;
  }
  return phone;
}

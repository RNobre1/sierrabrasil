/**
 * AI Response Tag Parser — extracts control tags from AI responses.
 *
 * Tags are invisible to the end user and are stripped before sending.
 * Used by edge functions (whatsapp-webhook) to extract structured data
 * from AI responses.
 *
 * Supported tags:
 * - [ESCALATE] — conversation should be escalated to human
 * - [RESOLVED] — conversation is resolved
 * - [SENTIMENT: positivo|neutro|negativo|frustrado]
 * - [LEAD: nome=X | email=Y | telefone=Z]
 */

export interface ParsedTags {
  escalate: boolean;
  resolved: boolean;
  sentiment: string | null;
  lead: Record<string, string> | null;
}

/**
 * Parses all control tags from an AI response string.
 */
export function parseAiTags(text: string): ParsedTags {
  const escalate = text.includes("[ESCALATE]");
  const resolved = text.includes("[RESOLVED]");

  // Parse [SENTIMENT: value]
  const sentimentMatch = text.match(/\[SENTIMENT:\s*(positivo|neutro|negativo|frustrado)\s*\]/i);
  const sentiment = sentimentMatch ? sentimentMatch[1].toLowerCase() : null;

  // Parse [LEAD: key=value | key=value | ...]
  const leadMatch = text.match(/\[LEAD:\s*([^\]]+)\]/);
  let lead: Record<string, string> | null = null;
  if (leadMatch) {
    lead = {};
    for (const part of leadMatch[1].split("|")) {
      const [key, ...val] = part.split("=");
      if (key && val.length > 0) {
        lead[key.trim().toLowerCase()] = val.join("=").trim();
      }
    }
    if (Object.keys(lead).length === 0) lead = null;
  }

  return { escalate, resolved, sentiment, lead };
}

/**
 * Removes all control tags from the AI response, returning clean text
 * suitable for sending to the end user.
 */
export function cleanAiResponse(text: string): string {
  return text
    .replace(/\s*\[ESCALATE\]\s*/g, "")
    .replace(/\s*\[RESOLVED\]\s*/g, "")
    .replace(/\s*\[LEAD:\s*[^\]]*\]\s*/g, "")
    .replace(/\s*\[SENTIMENT:\s*[^\]]*\]\s*/g, "")
    .trim();
}

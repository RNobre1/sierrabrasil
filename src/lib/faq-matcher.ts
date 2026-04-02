/**
 * FAQ Matcher — lightweight keyword-based matching for FAQ entries.
 *
 * Used before calling the LLM to check if the user's message matches
 * a known FAQ question. If it does, the FAQ answer is returned directly,
 * saving LLM tokens and reducing latency.
 *
 * Algorithm: normalized keyword overlap with configurable threshold.
 * No external dependencies — works in both Node and Deno.
 */

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

/** Minimum ratio of matching keywords to consider it a match (0–1) */
const MATCH_THRESHOLD = 0.5;

/** Minimum keywords in the query for matching (stop words already filter "oi", "sim", etc.) */
const MIN_QUERY_KEYWORDS = 1;

/** Common Portuguese stop words to ignore during matching */
const STOP_WORDS = new Set([
  "a", "o", "e", "de", "da", "do", "em", "um", "uma", "que", "para", "pra",
  "com", "por", "no", "na", "se", "os", "as", "dos", "das", "nos", "nas",
  "ao", "aos", "ou", "mas", "ja", "eh", "ta", "ne", "eu", "me", "te",
  "voce", "voces", "ele", "ela", "nos", "eles", "elas", "seu", "sua",
  "meu", "minha", "isso", "este", "esta", "esse", "essa", "aqui", "ai",
  "la", "bem", "sim", "nao", "oi", "ola", "bom", "boa", "tudo",
  "dia", "tarde", "noite", "qual", "como", "onde", "quando",
  "muito", "mais", "tambem", "so", "tem", "ter",
]);

/**
 * Removes accents, lowercases, strips punctuation, and splits into keywords.
 */
function normalize(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // remove punctuation
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Calculates the similarity score between query keywords and FAQ keywords.
 * Returns a value between 0 and 1.
 */
function similarity(queryWords: string[], faqWords: string[]): number {
  if (queryWords.length === 0 || faqWords.length === 0) return 0;

  const faqSet = new Set(faqWords);
  let matches = 0;

  for (const word of queryWords) {
    // Exact match
    if (faqSet.has(word)) {
      matches++;
      continue;
    }
    // Partial match (substring >= 4 chars)
    if (word.length >= 4) {
      for (const faqWord of faqSet) {
        if (faqWord.length >= 4 && (faqWord.includes(word) || word.includes(faqWord))) {
          matches++;
          break;
        }
      }
    }
  }

  // Score is ratio of matching keywords relative to the shorter list
  const denominator = Math.min(queryWords.length, faqWords.length);
  return matches / denominator;
}

/**
 * Finds the best matching FAQ entry for a given user message.
 *
 * @param message - The user's incoming message
 * @param faqs - Array of FAQ entries to match against
 * @returns The best matching FaqEntry, or null if no match exceeds threshold
 */
export function findFaqMatch(
  message: string | null | undefined,
  faqs: FaqEntry[],
): FaqEntry | null {
  if (!message || message.trim().length === 0 || !faqs || faqs.length === 0) {
    return null;
  }

  const queryWords = normalize(message);
  if (queryWords.length < MIN_QUERY_KEYWORDS) return null;

  let bestMatch: FaqEntry | null = null;
  let bestScore = 0;

  for (const faq of faqs) {
    const faqWords = normalize(faq.question);
    const score = similarity(queryWords, faqWords);

    if (score > bestScore && score >= MATCH_THRESHOLD) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  return bestMatch;
}

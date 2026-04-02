/**
 * RAG retrieval pipeline utilities.
 *
 * Shared helpers for content filtering, source prioritisation, and improved
 * chunking with overlap.  These run in the browser (Playground) and are also
 * importable from Edge Functions (Deno-compatible, no DOM deps).
 */

/**
 * Determines if content should be filtered as low-value (for social media curation).
 * Returns true if the content is mostly emojis, hashtags, or too short.
 */
export function isLowValueContent(content: string, sourceType: string): boolean {
  // Only filter social media, not documents/manual/website
  if (sourceType !== 'social') return false;

  // Remove hashtags and mentions
  const withoutTags = content.replace(/[#@]\S+/g, '').trim();
  // Remove emojis
  const withoutEmojis = withoutTags.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

  // Too short after cleanup
  if (withoutEmojis.length < 50) return true;

  // More than 70% was emojis/hashtags
  const usefulRatio = withoutEmojis.length / Math.max(content.length, 1);
  if (usefulRatio < 0.3) return true;

  return false;
}

/**
 * Returns the source_priority value for a given source_type.
 */
export function getSourcePriority(sourceType: string): number {
  switch (sourceType) {
    case 'document': return 100;
    case 'manual': return 90;
    case 'website': return 70;
    case 'social': return 10;
    default: return 50;
  }
}

/**
 * Improved chunking: splits text into chunks with overlap.
 * Preserves table-like content as single chunks (up to 2000 chars).
 */
export function chunkContentImproved(text: string, maxChunk = 1000, overlap = 150): string[] {
  // Detect if text looks like a table (has multiple lines with numbers/prices)
  const isTable = (block: string) => {
    const lines = block.split('\n');
    const numericLines = lines.filter(l => /R\$|[0-9]{2,}[,.]|mega|MEGA/i.test(l));
    return numericLines.length >= 3;
  };

  // Split by double newlines first (section boundaries)
  const sections = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const section of sections) {
    // If section looks like a table, keep it whole
    if (isTable(section) && section.length <= 2000) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = '';
      }
      chunks.push(section.trim());
      continue;
    }

    if ((current + '\n\n' + section).length > maxChunk && current.length > 0) {
      chunks.push(current.trim());
      // Overlap: keep last part of current
      const words = current.split(/\s+/);
      const overlapWords = words.slice(-Math.ceil(overlap / 5)); // approximate word count for overlap
      current = overlapWords.join(' ') + '\n\n' + section;
    } else {
      current += (current ? '\n\n' : '') + section;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(c => c.length > 10);
}

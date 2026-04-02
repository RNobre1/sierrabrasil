/**
 * RAG retrieval observability — shared utility for building metadata about
 * knowledge base retrieval quality.
 *
 * Used by edge functions (whatsapp-webhook, chat) to attach RAG metadata
 * to messages.metadata for monitoring and tuning retrieval over time.
 */

export interface RAGMetadata {
  chunks_used: number;
  top_source_type: string | null;
  max_relevance: number;
  fallback_used: boolean;
  query_length: number;
}

export function buildRAGMetadata(
  chunks: Array<{ source_type?: string; relevance?: number }> | null,
  fallbackUsed: boolean,
  queryLength: number,
): RAGMetadata {
  if (!chunks || chunks.length === 0) {
    return {
      chunks_used: 0,
      top_source_type: null,
      max_relevance: 0,
      fallback_used: fallbackUsed,
      query_length: queryLength,
    };
  }

  return {
    chunks_used: chunks.length,
    top_source_type: chunks[0]?.source_type || null,
    max_relevance: Math.max(...chunks.map(c => c.relevance || 0)),
    fallback_used: fallbackUsed,
    query_length: queryLength,
  };
}

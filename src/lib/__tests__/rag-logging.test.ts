import { describe, it, expect } from "vitest";
import { buildRAGMetadata } from "../rag-logging";

describe("buildRAGMetadata", () => {
  it("returns zeros and null source for null chunks", () => {
    const result = buildRAGMetadata(null, false, 42);
    expect(result).toEqual({
      chunks_used: 0,
      top_source_type: null,
      max_relevance: 0,
      fallback_used: false,
      query_length: 42,
    });
  });

  it("returns zeros and null source for empty chunks array", () => {
    const result = buildRAGMetadata([], false, 10);
    expect(result).toEqual({
      chunks_used: 0,
      top_source_type: null,
      max_relevance: 0,
      fallback_used: false,
      query_length: 10,
    });
  });

  it("computes correct count, top source, and max relevance for normal chunks", () => {
    const chunks = [
      { source_type: "document", relevance: 0.85 },
      { source_type: "website", relevance: 0.92 },
      { source_type: "document", relevance: 0.78 },
    ];
    const result = buildRAGMetadata(chunks, false, 55);
    expect(result.chunks_used).toBe(3);
    expect(result.top_source_type).toBe("document");
    expect(result.max_relevance).toBe(0.92);
  });

  it("propagates fallback_used = true correctly", () => {
    const result = buildRAGMetadata(null, true, 20);
    expect(result.fallback_used).toBe(true);
  });

  it("propagates fallback_used = false correctly", () => {
    const chunks = [{ source_type: "website", relevance: 0.5 }];
    const result = buildRAGMetadata(chunks, false, 30);
    expect(result.fallback_used).toBe(false);
  });

  it("captures query_length accurately", () => {
    const result = buildRAGMetadata(null, false, 128);
    expect(result.query_length).toBe(128);

    const chunks = [{ source_type: "faq", relevance: 0.99 }];
    const result2 = buildRAGMetadata(chunks, false, 7);
    expect(result2.query_length).toBe(7);
  });

  it("handles chunks with missing source_type gracefully", () => {
    const chunks = [{ relevance: 0.8 }, { source_type: "document", relevance: 0.6 }];
    const result = buildRAGMetadata(chunks, false, 15);
    expect(result.top_source_type).toBeNull();
    expect(result.chunks_used).toBe(2);
  });

  it("handles chunks with missing relevance gracefully", () => {
    const chunks = [{ source_type: "website" }, { source_type: "document" }];
    const result = buildRAGMetadata(chunks, false, 20);
    expect(result.max_relevance).toBe(0);
    expect(result.top_source_type).toBe("website");
  });

  it("uses first chunk source_type as top_source_type regardless of relevance order", () => {
    const chunks = [
      { source_type: "faq", relevance: 0.5 },
      { source_type: "document", relevance: 0.99 },
    ];
    const result = buildRAGMetadata(chunks, false, 25);
    expect(result.top_source_type).toBe("faq");
    expect(result.max_relevance).toBe(0.99);
  });
});

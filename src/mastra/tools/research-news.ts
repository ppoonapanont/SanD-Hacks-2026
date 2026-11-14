import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { fetchNewsForConfig } from "@/services/news";

/**
 * Bright Data (+ mock fallback) news research tool for Mastra agents.
 */
export const researchNewsTool = createTool({
  id: "research-news",
  description:
    "Search and enrich recent news for a topic/region. Use when a user question needs fresh facts or citations.",
  inputSchema: z.object({
    query: z.string().min(1).describe("Search query or topic"),
    region: z.string().default("Global"),
    language: z.string().default("English"),
  }),
  outputSchema: z.object({
    usedMock: z.boolean(),
    sourceCount: z.number(),
    errors: z.array(z.string()),
    sources: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        publisher: z.string(),
        url: z.string(),
        summary: z.string(),
        isMock: z.boolean().optional(),
      }),
    ),
  }),
  execute: async ({ query, region, language }) => {
    const result = await fetchNewsForConfig(
      {
        topics: [query.slice(0, 120)],
        region,
        language,
      },
      {
        resultsPerTopic: 3,
        maxEnrichArticles: 1,
      },
    );

    return {
      usedMock: result.usedMock,
      sourceCount: result.sources.length,
      errors: result.errors,
      sources: result.sources.slice(0, 5).map((source) => ({
        id: source.id,
        title: source.title,
        publisher: source.publisher,
        url: source.url,
        summary: source.summary.slice(0, 280),
        isMock: source.isMock,
      })),
    };
  },
});

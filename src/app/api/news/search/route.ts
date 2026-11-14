import { NextResponse } from "next/server";

import { fetchNewsForConfig } from "@/services/news";

/**
 * POST /api/news/search
 * Developer 1 — News Engine endpoint (SERP + Unlocker + Gemini analysis).
 *
 * Body: {
 *   topics: string[],
 *   region?: string,
 *   language?: string,
 *   forceMock?: boolean,
 *   skipEnrichment?: boolean,
 *   maxEnrichArticles?: number
 * }
 */
export async function POST(request: Request) {
  let body: {
    topics?: string[];
    region?: string;
    language?: string;
    forceMock?: boolean;
    skipEnrichment?: boolean;
    maxEnrichArticles?: number;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.topics) || body.topics.length === 0) {
    return NextResponse.json(
      { error: "topics must be a non-empty array" },
      { status: 400 },
    );
  }

  const result = await fetchNewsForConfig(
    {
      topics: body.topics,
      region: body.region?.trim() || "us",
      language: body.language?.trim() || "en",
    },
    {
      forceMock: body.forceMock === true,
      skipEnrichment: body.skipEnrichment === true,
      maxEnrichArticles:
        typeof body.maxEnrichArticles === "number"
          ? body.maxEnrichArticles
          : undefined,
    },
  );

  return NextResponse.json({
    sources: result.sources,
    usedMock: result.usedMock,
    relatedGroups: result.relatedGroups,
    crossReferences: result.crossReferences,
    enrichment: result.enrichment,
    errors: result.errors,
    count: result.sources.length,
  });
}

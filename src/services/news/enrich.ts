import {
  isUnlockerConfigured,
  scrapeArticleAsMarkdown,
  toGoogleCountryCode,
} from "@/services/bright-data";
import { isGeminiConfigured } from "@/services/gemini";
import type { NewsSource } from "@/types";

import { analyzeArticleContent } from "./articleAnalysis";
import { isScrapableArticleUrl, sanitizeArticleMarkdown } from "./sanitize";

export interface EnrichNewsOptions {
  region?: string;
  /** Max articles to scrape + analyze (keeps latency/cost bounded). */
  maxArticles?: number;
  /** Skip Unlocker/Gemini enrichment. */
  skipEnrichment?: boolean;
}

export interface EnrichNewsResult {
  sources: NewsSource[];
  errors: string[];
  enrichedCount: number;
  usedUnlocker: boolean;
  usedGemini: boolean;
}

/**
 * Scrape article bodies (Unlocker) and analyze with Gemini when configured.
 * Falls back to SERP snippet heuristics when scrape/analysis fails.
 */
export async function enrichNewsSources(
  sources: NewsSource[],
  options: EnrichNewsOptions = {},
): Promise<EnrichNewsResult> {
  const errors: string[] = [];
  const maxArticles = options.maxArticles ?? 4;

  if (options.skipEnrichment || sources.length === 0) {
    return {
      sources,
      errors,
      enrichedCount: 0,
      usedUnlocker: false,
      usedGemini: false,
    };
  }

  const canScrape = isUnlockerConfigured();
  const canAnalyze = isGeminiConfigured();

  if (!canScrape && !canAnalyze) {
    return {
      sources,
      errors: [
        "Skipping enrichment: set BRIGHT_DATA_UNLOCKER_ZONE and/or GOOGLE_GENERATIVE_AI_API_KEY",
      ],
      enrichedCount: 0,
      usedUnlocker: false,
      usedGemini: false,
    };
  }

  const candidates = sources
    .filter((source) => isScrapableArticleUrl(source.url))
    .slice(0, maxArticles);

  if (candidates.length === 0) {
    // Still allow Gemini on SERP snippets for top sources.
    return enrichFromSnippets(sources.slice(0, maxArticles), sources, errors);
  }

  const enrichedById = new Map<string, NewsSource>();
  let enrichedCount = 0;
  let usedUnlocker = false;
  let usedGemini = false;

  for (const source of candidates) {
    let content = source.summary;
    let scraped = false;

    if (canScrape) {
      try {
        const article = await scrapeArticleAsMarkdown({
          url: source.url,
          country: toGoogleCountryCode(options.region ?? "us"),
        });
        const markdown = sanitizeArticleMarkdown(article.markdown, 3_500);
        if (markdown.length > 200) {
          content = `${source.title}\n\n${markdown}`;
          scraped = true;
          usedUnlocker = usedUnlocker || article.usedUnlocker;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unlocker scrape failed";
        errors.push(`Scrape failed for ${source.publisher}: ${message}`);
      }
    }

    try {
      const analysis = await analyzeArticleContent({
        title: source.title,
        publisher: source.publisher,
        url: source.url,
        content,
      });

      if (analysis.analyzedBy === "gemini") {
        usedGemini = true;
      } else if (analysis.error) {
        errors.push(
          `Gemini fallback for ${source.publisher}: ${analysis.error}`,
        );
      }

      enrichedById.set(source.id, {
        ...source,
        summary: analysis.summary,
        keyClaims: analysis.keyClaims,
      });
      enrichedCount += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Article analysis failed";
      errors.push(`Analysis failed for ${source.publisher}: ${message}`);
    }
  }

  const merged = sources.map(
    (source) => enrichedById.get(source.id) ?? source,
  );

  return {
    sources: merged,
    errors,
    enrichedCount,
    usedUnlocker,
    usedGemini,
  };
}

async function enrichFromSnippets(
  targets: NewsSource[],
  all: NewsSource[],
  errors: string[],
): Promise<EnrichNewsResult> {
  if (!isGeminiConfigured()) {
    return {
      sources: all,
      errors: [
        ...errors,
        "No scrapable article URLs and Gemini is not configured",
      ],
      enrichedCount: 0,
      usedUnlocker: false,
      usedGemini: false,
    };
  }

  const enrichedById = new Map<string, NewsSource>();
  let enrichedCount = 0;

  for (const source of targets) {
    const analysis = await analyzeArticleContent({
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      content: `${source.title}. ${source.summary}`,
    });

    enrichedById.set(source.id, {
      ...source,
      summary: analysis.summary,
      keyClaims: analysis.keyClaims,
    });
    enrichedCount += 1;
  }

  return {
    sources: all.map((source) => enrichedById.get(source.id) ?? source),
    errors,
    enrichedCount,
    usedUnlocker: false,
    usedGemini: true,
  };
}

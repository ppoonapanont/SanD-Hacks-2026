import { MOCK_NEWS_SOURCES } from "@/data/mock";
import {
  BrightDataError,
  isBrightDataConfigured,
  searchNews,
  toGoogleCountryCode,
} from "@/services/bright-data";
import { isGeminiConfigured } from "@/services/gemini";
import type { NewsSource, PodcastConfig } from "@/types";

import {
  enrichSourcesWithClaims,
  findMultiSourceStories,
  type ConflictingClaimGroup,
} from "./analyze";
import {
  crossReferenceSources,
  type CrossReferenceReport,
} from "./crossReference";
import { dedupeNewsSources } from "./dedupe";
import { enrichNewsSources } from "./enrich";
import { mapHitToNewsSource } from "./map";

export interface NewsSearchParams {
  topics: string[];
  region: string;
  language: string;
}

export interface FetchNewsOptions {
  forceMock?: boolean;
  resultsPerTopic?: number;
  /** Max articles to scrape/analyze. Default 4. */
  maxEnrichArticles?: number;
  skipEnrichment?: boolean;
}

export interface FetchNewsResult {
  sources: NewsSource[];
  usedMock: boolean;
  relatedGroups: ConflictingClaimGroup[];
  crossReferences: CrossReferenceReport[];
  errors: string[];
  enrichment: {
    enrichedCount: number;
    usedUnlocker: boolean;
    usedGemini: boolean;
  };
}

export {
  enrichSourcesWithClaims,
  extractKeyClaims,
  findMultiSourceStories,
} from "./analyze";

export { crossReferenceSources } from "./crossReference";
export type { CrossReferenceReport } from "./crossReference";
export { dedupeNewsSources, groupRelatedStories } from "./dedupe";
export { enrichNewsSources } from "./enrich";

/**
 * News Engine entry point — Developer 1.
 * 1) Bright Data SERP news search
 * 2) Dedupe / source management
 * 3) Unlocker scrape + Gemini article analysis
 * 4) Claim cross-referencing across related stories
 */
export async function fetchNewsForConfig(
  config: Pick<PodcastConfig, "topics" | "region" | "language">,
  options: FetchNewsOptions = {},
): Promise<FetchNewsResult> {
  const params: NewsSearchParams = {
    topics: config.topics,
    region: config.region,
    language: config.language,
  };

  if (options.forceMock || !isBrightDataConfigured()) {
    const sources = enrichSourcesWithClaims(MOCK_NEWS_SOURCES);
    const crossReferences = await crossReferenceSources(sources);

    return {
      sources,
      usedMock: true,
      relatedGroups: findMultiSourceStories(sources),
      crossReferences,
      errors: isBrightDataConfigured()
        ? []
        : ["Bright Data not configured; using mock news"],
      enrichment: {
        enrichedCount: 0,
        usedUnlocker: false,
        usedGemini: isGeminiConfigured(),
      },
    };
  }

  const errors: string[] = [];
  const collected: NewsSource[] = [];
  const perTopic = options.resultsPerTopic ?? 5;

  for (const topic of params.topics) {
    const query = buildNewsQuery(topic, params.region);

    try {
      const hits = await searchNews({
        query,
        region: params.region,
        language: params.language,
        limit: perTopic,
      });

      collected.push(...hits.map(mapHitToNewsSource));
    } catch (error) {
      const message =
        error instanceof BrightDataError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown Bright Data error";
      errors.push(`Failed news search for "${topic}": ${message}`);
    }
  }

  if (collected.length === 0) {
    const sources = enrichSourcesWithClaims(MOCK_NEWS_SOURCES);
    const crossReferences = await crossReferenceSources(sources);

    return {
      sources,
      usedMock: true,
      relatedGroups: findMultiSourceStories(sources),
      crossReferences,
      errors: [
        ...errors,
        "No live news results; falling back to mock news",
      ],
      enrichment: {
        enrichedCount: 0,
        usedUnlocker: false,
        usedGemini: false,
      },
    };
  }

  const deduped = enrichSourcesWithClaims(dedupeNewsSources(collected));

  const enrichment = await enrichNewsSources(deduped, {
    region: params.region,
    maxArticles: options.maxEnrichArticles ?? 4,
    skipEnrichment: options.skipEnrichment,
  });
  errors.push(...enrichment.errors);

  const sources = enrichment.sources;
  const crossReferences = await crossReferenceSources(sources);

  return {
    sources,
    usedMock: false,
    relatedGroups: findMultiSourceStories(sources),
    crossReferences,
    errors,
    enrichment: {
      enrichedCount: enrichment.enrichedCount,
      usedUnlocker: enrichment.usedUnlocker,
      usedGemini: enrichment.usedGemini,
    },
  };
}

function buildNewsQuery(topic: string, region: string): string {
  const country = toGoogleCountryCode(region);
  const trimmed = topic.trim();
  if (!trimmed) return "latest news";

  if (country === "us") {
    return `${trimmed} news`;
  }

  return `${trimmed} news ${region}`;
}

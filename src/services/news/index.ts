import { MOCK_NEWS_SOURCES } from "@/data/mock";
import type { NewsSource, PodcastConfig } from "@/types";

export interface NewsSearchParams {
  topics: string[];
  region: string;
  language: string;
}

/**
 * News Engine entry point — Developer 1.
 * Phase 0: returns clearly labeled mock sources.
 * Next: Bright Data retrieval, dedup, grouping, claim extraction.
 */
export async function fetchNewsForConfig(
  config: Pick<PodcastConfig, "topics" | "region" | "language">,
): Promise<{ sources: NewsSource[]; usedMock: boolean }> {
  const params: NewsSearchParams = {
    topics: config.topics,
    region: config.region,
    language: config.language,
  };

  // TODO(dev1): replace with Bright Data-backed retrieval.
  void params;

  return {
    sources: MOCK_NEWS_SOURCES,
    usedMock: true,
  };
}

import type { NewsSource } from "@/types";

import { groupRelatedStories } from "./dedupe";

/**
 * Heuristic claim extraction from summaries (no LLM yet).
 * Treats content as untrusted — returns plain text claims only.
 */
export function extractKeyClaims(summary: string, maxClaims = 3): string[] {
  const cleaned = summary
    .replace(/\s+/g, " ")
    .replace(/\[\d+\]/g, "")
    .trim();

  if (!cleaned) return [];

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 40 && part.length <= 280)
    .filter((part) => !isBoilerplateClaim(part));

  const unique: string[] = [];
  for (const sentence of sentences) {
    if (unique.some((existing) => existing.toLowerCase() === sentence.toLowerCase())) {
      continue;
    }
    unique.push(sentence);
    if (unique.length >= maxClaims) break;
  }

  return unique;
}

function isBoilerplateClaim(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("we may earn a commission") ||
    lower.includes("subscribe") ||
    lower.includes("cookie") ||
    lower.includes("all rights reserved") ||
    lower.includes("sign up for")
  );
}

export function enrichSourcesWithClaims(sources: NewsSource[]): NewsSource[] {
  return sources.map((source) => ({
    ...source,
    keyClaims:
      source.keyClaims && source.keyClaims.length > 0
        ? source.keyClaims
        : extractKeyClaims(source.summary),
  }));
}

export interface ConflictingClaimGroup {
  topicLabel: string;
  sourceIds: string[];
  claims: Array<{ sourceId: string; claim: string; publisher: string }>;
}

/**
 * Surface groups where multiple publishers cover a similar story.
 * Full fact-checking arrives with the Fact-Checking agent (Gemini/Mastra).
 */
export function findMultiSourceStories(
  sources: NewsSource[],
): ConflictingClaimGroup[] {
  return groupRelatedStories(sources)
    .filter((group) => group.length >= 2)
    .map((group) => ({
      topicLabel: group[0]?.title ?? "Related story",
      sourceIds: group.map((item) => item.id),
      claims: group.flatMap((item) =>
        (item.keyClaims ?? []).slice(0, 2).map((claim) => ({
          sourceId: item.id,
          claim,
          publisher: item.publisher,
        })),
      ),
    }));
}

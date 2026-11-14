import type { NewsSource } from "@/types";

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    // Strip common tracking params
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(
      (key) => parsed.searchParams.delete(key),
    );
    return parsed.toString().toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Remove duplicate stories by URL, then near-duplicate titles.
 */
export function dedupeNewsSources(sources: NewsSource[]): NewsSource[] {
  const byUrl = new Map<string, NewsSource>();

  for (const source of sources) {
    const key = normalizeUrl(source.url);
    if (!byUrl.has(key)) {
      byUrl.set(key, source);
    }
  }

  const unique = Array.from(byUrl.values());
  const result: NewsSource[] = [];
  const seenTitles: string[] = [];

  for (const source of unique) {
    const title = normalizeTitle(source.title);
    const isDuplicate = seenTitles.some(
      (existing) => titleSimilarity(existing, title) >= 0.85,
    );
    if (isDuplicate) continue;
    seenTitles.push(title);
    result.push(source);
  }

  return result;
}

function titleSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const aTokens = new Set(a.split(" ").filter(Boolean));
  const bTokens = new Set(b.split(" ").filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }

  return overlap / Math.max(aTokens.size, bTokens.size);
}

/**
 * Group related stories by title similarity for multi-source comparison.
 */
export function groupRelatedStories(
  sources: NewsSource[],
): NewsSource[][] {
  const groups: NewsSource[][] = [];
  const assigned = new Set<string>();

  for (const source of sources) {
    if (assigned.has(source.id)) continue;

    const group = [source];
    assigned.add(source.id);
    const base = normalizeTitle(source.title);

    for (const other of sources) {
      if (assigned.has(other.id)) continue;
      if (titleSimilarity(base, normalizeTitle(other.title)) >= 0.55) {
        group.push(other);
        assigned.add(other.id);
      }
    }

    groups.push(group);
  }

  return groups;
}

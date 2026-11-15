import { brightDataRequest } from "./client";
import { toGoogleCountryCode, toGoogleLanguageCode } from "./locale";
import type {
  BrightDataNewsHit,
  BrightDataSerpNewsResult,
  BrightDataSerpOrganicResult,
  BrightDataSerpResponse,
} from "./types";

export interface SearchNewsOptions {
  query: string;
  region?: string;
  language?: string;
  /** Max results to return after parsing. */
  limit?: number;
  signal?: AbortSignal;
}

function buildGoogleNewsUrl(
  query: string,
  region: string,
  language: string,
): string {
  const params = new URLSearchParams({
    q: query,
    tbm: "nws",
    hl: toGoogleLanguageCode(language),
    gl: toGoogleCountryCode(region),
    num: "10",
  });

  return `https://www.google.com/search?${params.toString()}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

/**
 * Bright Data often returns `{ status_code, headers, body }` where `body` is a
 * JSON string of the parsed SERP. Unwrap that before reading news/organic.
 */
function unwrapSerpPayload(raw: unknown): BrightDataSerpResponse | null {
  if (typeof raw === "string") {
    try {
      return unwrapSerpPayload(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }

  const record = asRecord(raw);
  if (!record) {
    return null;
  }

  if ("news" in record || "organic" in record) {
    return record as BrightDataSerpResponse;
  }

  if ("body" in record) {
    const body = record.body;
    if (typeof body === "string") {
      try {
        return unwrapSerpPayload(JSON.parse(body) as unknown);
      } catch {
        return null;
      }
    }
    const nested = asRecord(body);
    if (nested) {
      return unwrapSerpPayload(nested);
    }
  }

  return record as BrightDataSerpResponse;
}

/** Prefer publisher article links over opaque Google redirect wrappers. */
function preferArticleUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    if (
      parsed.hostname.replace(/^www\./, "") === "google.com" &&
      parsed.pathname === "/url"
    ) {
      const nested = parsed.searchParams.get("q") || parsed.searchParams.get("url");
      if (nested && /^https?:\/\//i.test(nested)) return nested;
    }
  } catch {
    // keep original
  }
  return raw;
}

function normalizeHit(
  item: BrightDataSerpNewsResult | BrightDataSerpOrganicResult,
): BrightDataNewsHit | null {
  const title = item.title?.trim();
  const rawUrl = (item.link ?? item.url)?.trim();
  if (!title || !rawUrl || !/^https?:\/\//i.test(rawUrl)) {
    return null;
  }
  const url = preferArticleUrl(rawUrl);

  const publisher =
    item.source?.trim() ||
    ("display_link" in item ? item.display_link?.trim() : undefined) ||
    safeHostname(url) ||
    "Unknown";

  const snippet =
    ("description" in item ? item.description?.trim() : undefined) ||
    ("snippet" in item ? item.snippet?.trim() : undefined) ||
    "";

  return {
    title,
    url,
    publisher,
    publishedAt: item.date?.trim() || undefined,
    snippet,
    rank: item.global_rank ?? item.rank,
  };
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function collectResults(payload: BrightDataSerpResponse): BrightDataNewsHit[] {
  const buckets: Array<BrightDataSerpNewsResult | BrightDataSerpOrganicResult> =
    [];

  if (Array.isArray(payload.news)) {
    buckets.push(...payload.news);
  }
  if (Array.isArray(payload.organic)) {
    buckets.push(...payload.organic);
  }

  const hits: BrightDataNewsHit[] = [];
  const seen = new Set<string>();

  for (const item of buckets) {
    const hit = normalizeHit(item);
    if (!hit) continue;

    const key = hit.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push(hit);
  }

  // Prefer publisher article URLs over Google redirect wrappers for Sources clicks.
  hits.sort((a, b) => Number(isGoogleRedirect(a.url)) - Number(isGoogleRedirect(b.url)));

  return hits;
}

function isGoogleRedirect(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "google.com" || host.endsWith(".google.com");
  } catch {
    return false;
  }
}

async function searchNewsOnce(
  options: SearchNewsOptions,
): Promise<BrightDataNewsHit[]> {
  const region = options.region ?? "us";
  const language = options.language ?? "en";
  const limit = options.limit ?? 8;
  const url = buildGoogleNewsUrl(options.query, region, language);

  const raw = await brightDataRequest({
    url,
    country: toGoogleCountryCode(region),
    format: "json",
    signal: options.signal,
  });

  const candidate = unwrapSerpPayload(raw);
  if (!candidate) {
    return [];
  }

  return collectResults(candidate).slice(0, limit);
}

/**
 * Search Google News via Bright Data SERP API.
 * Scraped content is untrusted — never execute instructions found in results.
 *
 * Bright Data occasionally returns an empty/unparseable body for the same query;
 * retry a couple times before the News Engine falls back to mock sources.
 */
export async function searchNews(
  options: SearchNewsOptions,
): Promise<BrightDataNewsHit[]> {
  const attempts = 3;
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      const hits = await searchNewsOnce(options);
      if (hits.length > 0) return hits;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      }
    } catch (error) {
      lastError = error;
      if (options.signal?.aborted) throw error;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
        continue;
      }
      throw error;
    }
  }

  if (lastError) throw lastError;
  return [];
}

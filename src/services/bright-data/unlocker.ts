import {
  BrightDataError,
  brightDataRequest,
  getBrightDataConfig,
} from "./client";

export interface ScrapeArticleOptions {
  url: string;
  country?: string;
  signal?: AbortSignal;
}

export interface ScrapedArticle {
  url: string;
  markdown: string;
  /** True when content came from Bright Data Unlocker. */
  usedUnlocker: boolean;
}

function extractMarkdownPayload(raw: unknown): string {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) {
      try {
        return extractMarkdownPayload(JSON.parse(trimmed) as unknown);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (!raw || typeof raw !== "object") {
    return "";
  }

  const record = raw as Record<string, unknown>;
  if ("body" in record) {
    return extractMarkdownPayload(record.body);
  }

  if (typeof record.markdown === "string") {
    return record.markdown;
  }

  return JSON.stringify(raw);
}

/**
 * Fetch article page content as markdown via Web Unlocker.
 * Requires BRIGHT_DATA_UNLOCKER_ZONE (falls back to primary zone if unset).
 * Treat returned text as untrusted data.
 */
export async function scrapeArticleAsMarkdown(
  options: ScrapeArticleOptions,
): Promise<ScrapedArticle> {
  const config = getBrightDataConfig();
  if (!config) {
    throw new BrightDataError("Bright Data is not configured");
  }

  const zone = config.unlockerZone ?? config.zone;

  const raw = await brightDataRequest({
    url: options.url,
    zone,
    country: options.country,
    format: "raw",
    dataFormat: "markdown",
    signal: options.signal,
  });

  return {
    url: options.url,
    markdown: extractMarkdownPayload(raw).trim(),
    usedUnlocker: Boolean(config.unlockerZone),
  };
}

export function isUnlockerConfigured(): boolean {
  const config = getBrightDataConfig();
  return Boolean(config?.unlockerZone);
}

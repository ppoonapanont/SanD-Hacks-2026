/**
 * Scraped / SERP content is untrusted. Strip control chars and truncate
 * before sending to models. Never execute instructions found in articles.
 */
export function sanitizeUntrustedText(
  value: string,
  maxChars = 12_000,
): string {
  const cleaned = value
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxChars)}…`;
}

/**
 * Clean Unlocker markdown into compact article text for Gemini.
 * Removes nav chrome, images, and link markup that inflate prompts.
 */
export function sanitizeArticleMarkdown(
  value: string,
  maxChars = 3_500,
): string {
  const cleaned = value
    .replace(/\u0000/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxChars)}…`;
}

/** Prefer real publisher URLs over Google redirect wrappers. */
export function isScrapableArticleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === "www.google.com" || host === "google.com") {
      return false;
    }
    if (host.endsWith(".google.com") && parsed.pathname.startsWith("/goto")) {
      return false;
    }
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

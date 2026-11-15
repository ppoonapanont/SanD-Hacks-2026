/**
 * Final boundary before TTS / transcript: strip planning labels and citation
 * markers while keeping real numbers, percentages, and model names.
 */

const PLANNING_PREFIX =
  /^(new angle|quick redirect|quick close|building on [^:]{1,40}|question for [^:]{1,40}|take [^']{1,40} beat further|respectfully,? [^:]{1,40}|i'?d push back on [^—-]{1,40}\s*[—-]|let me reframe for a second|stepping in|devil'?s advocate for a beat)\s*:?\s*/i;

const CITATION_MARKERS = [
  /\[\d+\]/g,
  /\(\s*sources?\s*\d+(?:\s*[,&]\s*\d+)*\s*\)/gi,
  /\bsources?\s*\[\d+\]/gi,
  /\bcite(?:d|s)?\s*:\s*\d+(?:\s*,\s*\d+)*/gi,
];

/** True when text looks like an internal planning instruction, not podcast speech. */
export function looksLikePlanningSpeech(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (PLANNING_PREFIX.test(t)) return true;
  if (/^question for\b/i.test(t)) return true;
  if (
    /\bon (Business|Technology|Politics|Science|Health|Climate|Sports|Arts|World)\b/i.test(
      t,
    ) && /when you say ['"]/.test(t)
  ) {
    return true;
  }
  // Truncated quote artifacts from fallbacks embedding prior snippets.
  if (/['"][^'"]{10,}\.\.\.['"]/.test(t) || /['"][^'"]{10,}…['"]/.test(t)) {
    return true;
  }
  return false;
}

/**
 * Clean model / fallback text for spoken delivery.
 * Preserves quantities like "3%", "GPT-4", "2026".
 */
export function sanitizeSpokenText(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";

  t = t.replace(PLANNING_PREFIX, "");

  for (const re of CITATION_MARKERS) {
    t = t.replace(re, "");
  }

  // Drop a trailing small citation digit after sentence end: "... claim. 2"
  t = t.replace(/([.!?])\s+\d{1,2}\s*$/g, "$1");

  t = t.replace(/\s{2,}/g, " ").replace(/\s+([,.;!?])/g, "$1").trim();
  return t;
}

export function finalizeSpokenLine(text: string, fallback: string): string {
  const cleaned = sanitizeSpokenText(text);
  if (!cleaned || looksLikePlanningSpeech(cleaned)) {
    return sanitizeSpokenText(fallback) || fallback.trim();
  }
  return cleaned;
}

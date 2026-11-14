/**
 * Mastra model router id for Gemini.
 * Accepts either `google/…` or a bare Gemini model name from GEMINI_MODEL.
 */
export function getMastraGeminiModel(): `${string}/${string}` {
  const raw = process.env.GEMINI_MODEL?.trim();
  if (raw?.includes("/")) return raw as `${string}/${string}`;
  if (raw) return `google/${raw}` as `${string}/${string}`;
  // Stable, widely available flash-lite for hackathon demos.
  return "google/gemini-2.5-flash-lite";
}

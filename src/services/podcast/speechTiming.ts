/**
 * Speech timing helpers for live podcast turns.
 *
 * Transcript timestamps should reflect spoken length (estimated or measured TTS),
 * not wall-clock waits for model generation and not artificial padding to fill
 * the requested episode duration.
 */

/** Comfortable narration pace for ElevenLabs-style TTS (~words per second). */
export const SPEECH_WORDS_PER_SEC = 2.4;

/** Floor/ceiling so tiny/huge lines still produce sane timeline gaps. */
export const MIN_SPEECH_SEC = 2.5;
export const MAX_SPEECH_SEC = 28;

/**
 * Estimate spoken duration from transcript text.
 * ~50 words ≈ 21s at 2.4 w/s — not 41s (which usually means wait/padding).
 */
export function estimateSpeechSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 0) return MIN_SPEECH_SEC;
  const raw = words / SPEECH_WORDS_PER_SEC;
  return Math.min(MAX_SPEECH_SEC, Math.max(MIN_SPEECH_SEC, raw));
}

/**
 * Next line start time = previous start + previous spoken duration.
 * Prefers measured TTS duration when provided.
 */
export function nextSpeechTimestamp(input: {
  previousStartSec: number;
  previousText: string;
  measuredDurationSec?: number | null;
  episodeDurationSec: number;
}): number {
  const spoken =
    typeof input.measuredDurationSec === "number" &&
    Number.isFinite(input.measuredDurationSec) &&
    input.measuredDurationSec > 0
      ? Math.min(MAX_SPEECH_SEC * 1.5, input.measuredDurationSec)
      : estimateSpeechSeconds(input.previousText);

  const next = input.previousStartSec + spoken;
  const cap = Math.max(1, input.episodeDurationSec - 0.5);
  return Math.min(cap, Math.max(0, next));
}

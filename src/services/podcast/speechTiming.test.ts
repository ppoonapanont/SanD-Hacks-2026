import { describe, expect, it } from "vitest";

import {
  estimateSpeechSeconds,
  nextSpeechTimestamp,
  SPEECH_WORDS_PER_SEC,
} from "./speechTiming";

describe("estimateSpeechSeconds", () => {
  it("scales roughly with word count at narration pace", () => {
    const fifty =
      "alpha beta gamma delta epsilon zeta eta theta iota kappa ".repeat(5).trim();
    // 50 words / 2.4 wps ≈ 20.8s
    const words = fifty.split(/\s+/).length;
    expect(words).toBe(50);
    const sec = estimateSpeechSeconds(fifty);
    expect(sec).toBeCloseTo(words / SPEECH_WORDS_PER_SEC, 5);
    expect(sec).toBeLessThan(30);
    expect(sec).toBeGreaterThan(15);
  });

  it("does not invent a ~41s span for a ~50 word line", () => {
    const text = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ");
    expect(estimateSpeechSeconds(text)).toBeLessThan(35);
  });

  it("floors empty text", () => {
    expect(estimateSpeechSeconds("")).toBeGreaterThan(0);
  });
});

describe("nextSpeechTimestamp", () => {
  it("prefers measured TTS duration over word estimate", () => {
    const next = nextSpeechTimestamp({
      previousStartSec: 10,
      previousText: Array.from({ length: 50 }, (_, i) => `w${i}`).join(" "),
      measuredDurationSec: 12.5,
      episodeDurationSec: 120,
    });
    expect(next).toBeCloseTo(22.5, 5);
  });

  it("falls back to word estimate when measurement is missing", () => {
    const text = Array.from({ length: 24 }, (_, i) => `w${i}`).join(" ");
    const next = nextSpeechTimestamp({
      previousStartSec: 0,
      previousText: text,
      episodeDurationSec: 120,
    });
    expect(next).toBeCloseTo(estimateSpeechSeconds(text), 5);
  });

  it("does not pad forward just to fill episode duration", () => {
    const next = nextSpeechTimestamp({
      previousStartSec: 5,
      previousText: "Short line here.",
      measuredDurationSec: 3,
      episodeDurationSec: 120,
    });
    expect(next).toBeCloseTo(8, 5);
    expect(next).toBeLessThan(20);
  });
});

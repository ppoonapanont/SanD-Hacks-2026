import { describe, expect, it } from "vitest";

import {
  finalizeSpokenLine,
  looksLikePlanningSpeech,
  sanitizeSpokenText,
} from "./spokenText";

describe("sanitizeSpokenText", () => {
  it("strips bracket citation markers", () => {
    expect(sanitizeSpokenText("Guidance fell [2] after the ban [3].")).toBe(
      "Guidance fell after the ban.",
    );
  });

  it("strips trailing citation digits after a sentence", () => {
    expect(sanitizeSpokenText("That is the real risk. 2")).toBe(
      "That is the real risk.",
    );
  });

  it("preserves real quantities and years", () => {
    expect(sanitizeSpokenText("Spending rose 3% in 2026.")).toBe(
      "Spending rose 3% in 2026.",
    );
  });

  it("strips planning prefixes", () => {
    expect(
      sanitizeSpokenText("New angle: the downside still looks underpriced."),
    ).toBe("the downside still looks underpriced.");
  });
});

describe("looksLikePlanningSpeech", () => {
  it("flags instruction-like templates from old fallbacks", () => {
    expect(
      looksLikePlanningSpeech(
        "Question for Ava Chen: on Business, are we talking incentives when you say 'Jordan…'?",
      ),
    ).toBe(true);
    expect(
      looksLikePlanningSpeech(
        "Quick redirect: what's the one fact under 'Question for Ava…' we should not gloss over?",
      ),
    ).toBe(true);
    expect(
      looksLikePlanningSpeech(
        "New angle: once you accept 'Welcome in — today we're live on Business.', the investor follow-on is who absorbs the downside.",
      ),
    ).toBe(true);
  });

  it("allows natural podcast lines", () => {
    expect(
      looksLikePlanningSpeech(
        "Honestly, you need to believe the technology can solve a problem simpler approaches can't.",
      ),
    ).toBe(false);
  });
});

describe("finalizeSpokenLine", () => {
  it("replaces planning speech with the natural fallback", () => {
    const fallback =
      "From an investor angle, the hard part is proving the mechanism, not the headline.";
    expect(
      finalizeSpokenLine(
        "New angle: once you accept 'Welcome in…', the follow-on is downside.",
        fallback,
      ),
    ).toBe(fallback);
  });

  it("keeps clean model output", () => {
    const line = "But that's the difficult part, right?";
    expect(finalizeSpokenLine(line, "fallback")).toBe(line);
  });
});

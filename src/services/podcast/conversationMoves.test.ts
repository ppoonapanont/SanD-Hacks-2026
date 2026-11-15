import { describe, expect, it } from "vitest";

import type { ConversationTurn, Guest, PodcastSession } from "@/types";

import {
  guestEngagementRules,
  guestStreakSinceHost,
  heuristicNextMove,
  hostEngagementRules,
  planNextTurn,
} from "./conversationMoves";

const guestA: Guest = {
  id: "economist",
  name: "Marcus Wells",
  type: "fictional",
  expertise: "Economics",
  personality: "Measured",
  perspective: "Markets",
  communicationStyle: "Analytical",
  voiceId: "voice-a",
};

const guestB: Guest = {
  id: "founder",
  name: "Ava Chen",
  type: "fictional",
  expertise: "Technology",
  personality: "Direct",
  perspective: "Builders",
  communicationStyle: "Candid",
  voiceId: "voice-b",
};

function turn(
  partial: Pick<ConversationTurn, "speakerId" | "speakerName" | "speakerType"> & {
    text?: string;
  },
): ConversationTurn {
  return {
    id: `t-${partial.speakerId}-${Math.random().toString(36).slice(2, 6)}`,
    text: partial.text ?? "A point.",
    ...partial,
  };
}

function sessionLike(turns: ConversationTurn[]): Pick<
  PodcastSession,
  "turns" | "outline" | "sources" | "config" | "currentTopicId"
> {
  return {
    turns,
    config: {
      topics: ["Business"],
      region: "us",
      language: "en",
      durationMinutes: 5,
      depth: "intermediate",
      guests: [guestA, guestB],
    },
    sources: [
      {
        id: "s1",
        title: "Chipmakers revise guidance after export curbs",
        publisher: "Wire",
        url: "https://example.com/chips",
        publishedAt: "2026-11-14T00:00:00.000Z",
        summary: "Guidance cuts follow new licensing rules.",
      },
    ],
    outline: {
      title: "Export curbs",
      description: "Panel on chip export rules",
      topics: [
        {
          id: "topic-1",
          title: "Chipmakers revise guidance after export curbs",
          description: "What the guidance cut means",
          estimatedDurationMinutes: 5,
          sourceIds: ["s1"],
        },
      ],
      estimatedDurationMinutes: 5,
    },
    currentTopicId: "topic-1",
  };
}

describe("guestStreakSinceHost", () => {
  it("counts guests since the last host line", () => {
    const turns = [
      turn({ speakerId: "host", speakerName: "Mira", speakerType: "host" }),
      turn({ speakerId: "economist", speakerName: "Marcus", speakerType: "guest" }),
      turn({ speakerId: "founder", speakerName: "Ava", speakerType: "guest" }),
      turn({ speakerId: "economist", speakerName: "Marcus", speakerType: "guest" }),
    ];
    expect(guestStreakSinceHost(turns)).toBe(3);
  });

  it("resets after a host turn", () => {
    const turns = [
      turn({ speakerId: "economist", speakerName: "Marcus", speakerType: "guest" }),
      turn({ speakerId: "host", speakerName: "Mira", speakerType: "host" }),
      turn({ speakerId: "founder", speakerName: "Ava", speakerType: "guest" }),
    ];
    expect(guestStreakSinceHost(turns)).toBe(1);
  });
});

describe("planNextTurn", () => {
  it("routes an addressed host question to that guest", () => {
    const turns = [
      turn({
        speakerId: "host",
        speakerName: "Mira",
        speakerType: "host",
        text: "Ava, what makes a risky engineering project worth funding?",
      }),
    ];
    const plan = planNextTurn({
      forceClose: false,
      preferClose: false,
      session: sessionLike(turns),
    });
    expect(plan.speakerId).toBe("founder");
    expect(plan.move).toBe("react");
    expect(plan.shouldClose).toBe(false);
  });

  it("does not close while a pending addressed question is open", () => {
    const turns = [
      turn({
        speakerId: "host",
        speakerName: "Mira",
        speakerType: "host",
        text: "Marcus, is the guidance cut already priced in?",
      }),
    ];
    const plan = planNextTurn({
      forceClose: false,
      preferClose: true,
      session: sessionLike(turns),
    });
    expect(plan.speakerId).toBe("economist");
    expect(plan.shouldClose).toBe(false);
  });

  it("inserts the host after a guest streak instead of after every turn", () => {
    const turns = [
      turn({ speakerId: "host", speakerName: "Mira", speakerType: "host" }),
      turn({ speakerId: "economist", speakerName: "Marcus", speakerType: "guest" }),
      turn({ speakerId: "founder", speakerName: "Ava", speakerType: "guest" }),
      turn({ speakerId: "economist", speakerName: "Marcus", speakerType: "guest" }),
    ];
    const plan = planNextTurn({
      forceClose: false,
      preferClose: false,
      session: sessionLike(turns),
    });
    expect(plan.speakerId).toBe("host");
    expect(plan.move).toBe("moderate");
  });

  it("does not mechanically ping-pong the same two guests after a claim", () => {
    const turns = [
      turn({
        speakerId: "economist",
        speakerName: "Marcus",
        speakerType: "guest",
        text: "Rates will stay restrictive.",
      }),
    ];
    const plan = planNextTurn({
      forceClose: false,
      preferClose: false,
      session: sessionLike(turns),
    });
    expect(plan.speakerId).toBe("founder");
    expect(["react", "challenge", "question", "advance"]).toContain(plan.move);
    // Internal focus only — never a spoken template label.
    expect(plan.focus.toLowerCase()).not.toMatch(/^new angle|^question for|^quick redirect/);
  });

  it("closes with the host when forced", () => {
    const plan = planNextTurn({
      forceClose: true,
      preferClose: false,
      session: sessionLike([]),
    });
    expect(plan.speakerId).toBe("host");
    expect(plan.move).toBe("close");
    expect(plan.shouldClose).toBe(true);
  });
});

describe("heuristicNextMove compat", () => {
  it("still returns a speaker and move for legacy callers", () => {
    const plan = heuristicNextMove({
      forceClose: true,
      turns: [],
      lastSpeakerId: "",
      guests: [guestA],
    });
    expect(plan.speakerId).toBe("host");
    expect(plan.move).toBe("close");
  });
});

describe("engagement rule copy", () => {
  it("grounds guests in the story without demanding literal quotes", () => {
    const rules = guestEngagementRules({
      move: "react",
      lastSpeakerName: "Marcus",
      addressingName: "Marcus",
      storyFocus: "chip export guidance cuts",
    });
    expect(rules.some((r) => /chip export/i.test(r))).toBe(true);
    expect(rules.some((r) => /answer it first|own words|distinct take/i.test(r))).toBe(
      true,
    );
  });

  it("keeps host moderation from becoming a news monologue", () => {
    const rules = hostEngagementRules({
      move: "moderate",
      closing: false,
      storyFocus: "chip export guidance cuts",
      addressingName: "Ava",
    });
    expect(rules.some((r) => /follow-up|clarify|invite/i.test(r))).toBe(true);
    expect(rules.some((r) => /not monologue|do not monologue/i.test(r))).toBe(
      true,
    );
  });
});

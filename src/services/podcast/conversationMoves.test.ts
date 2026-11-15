import { describe, expect, it } from "vitest";

import type { ConversationTurn, Guest } from "@/types";

import {
  guestEngagementRules,
  guestStreakSinceHost,
  heuristicNextMove,
  hostEngagementRules,
} from "./conversationMoves";

const guestA: Guest = {
  id: "economist",
  name: "Marcus",
  type: "fictional",
  expertise: "Economics",
  personality: "Measured",
  perspective: "Markets",
  communicationStyle: "Analytical",
  voiceId: "voice-a",
};

const guestB: Guest = {
  id: "founder",
  name: "Ava",
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
    id: `t-${partial.speakerId}`,
    text: partial.text ?? "A point.",
    ...partial,
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

describe("heuristicNextMove", () => {
  it("inserts the host after a guest streak instead of after every turn", () => {
    const turns = [
      turn({ speakerId: "host", speakerName: "Mira", speakerType: "host" }),
      turn({ speakerId: "economist", speakerName: "Marcus", speakerType: "guest" }),
      turn({ speakerId: "founder", speakerName: "Ava", speakerType: "guest" }),
      turn({ speakerId: "economist", speakerName: "Marcus", speakerType: "guest" }),
    ];
    const plan = heuristicNextMove({
      forceClose: false,
      turns,
      lastSpeakerId: "economist",
      guests: [guestA, guestB],
    });
    expect(plan.speakerId).toBe("host");
    expect(plan.move).toBe("moderate");
  });

  it("asks guests to engage the prior speaker rather than only advance", () => {
    const turns = [
      turn({
        speakerId: "economist",
        speakerName: "Marcus",
        speakerType: "guest",
        text: "Rates will stay restrictive.",
      }),
    ];
    const plan = heuristicNextMove({
      forceClose: false,
      turns,
      lastSpeakerId: "economist",
      guests: [guestA, guestB],
    });
    expect(plan.speakerId).toBe("founder");
    expect(["react", "challenge", "question", "advance"]).toContain(plan.move);
    expect(plan.direction.toLowerCase()).toContain("marcus");
  });

  it("closes with the host when forced", () => {
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
  it("requires concrete acknowledgment for react moves", () => {
    const rules = guestEngagementRules({
      move: "react",
      lastSpeakerName: "Marcus",
    });
    expect(rules.some((r) => /marcus/i.test(r))).toBe(true);
    expect(rules.some((r) => /concrete|claim/i.test(r))).toBe(true);
  });

  it("keeps host moderation from becoming a news monologue", () => {
    const rules = hostEngagementRules({ move: "moderate", closing: false });
    expect(rules.some((r) => /follow-up|clarify|invite/i.test(r))).toBe(true);
    expect(rules.some((r) => /not monologue|do not monologue/i.test(r))).toBe(
      true,
    );
  });
});

import { describe, expect, it } from "vitest";

import type { ConversationTurn, Guest, PodcastSession } from "@/types";

import {
  deriveConversationState,
  findAddressedGuestId,
  isRepetitiveClaim,
  resolveStoryFocus,
} from "./conversationState";

const guests: Guest[] = [
  {
    id: "jordan",
    name: "Jordan Blake",
    type: "fictional",
    expertise: "Investor",
    personality: "Direct",
    perspective: "Markets",
    communicationStyle: "Blunt",
    voiceId: "v1",
  },
  {
    id: "ava",
    name: "Ava Chen",
    type: "fictional",
    expertise: "Tech Founder",
    personality: "Curious",
    perspective: "Builders",
    communicationStyle: "Clear",
    voiceId: "v2",
  },
];

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

describe("findAddressedGuestId", () => {
  it("detects a guest addressed by first name", () => {
    expect(
      findAddressedGuestId("Ava, what makes this worth funding?", guests),
    ).toBe("ava");
  });

  it("detects full-name address", () => {
    expect(
      findAddressedGuestId("Jordan Blake, is that priced in?", guests),
    ).toBe("jordan");
  });
});

describe("resolveStoryFocus", () => {
  it("prefers a concrete headline over a category chip", () => {
    const session: Pick<
      PodcastSession,
      "outline" | "sources" | "config" | "currentTopicId"
    > = {
      config: {
        topics: ["Business"],
        region: "us",
        language: "en",
        durationMinutes: 5,
        depth: "intermediate",
        guests,
      },
      sources: [
        {
          id: "s1",
          title: "Nvidia director sold nearly $1B in stock",
          publisher: "Yahoo Finance",
          url: "https://example.com/n",
          publishedAt: "2026-11-14T00:00:00.000Z",
          summary: "Large insider sale hit the tape Friday.",
        },
      ],
      outline: {
        title: "Markets",
        description: "",
        topics: [
          {
            id: "t1",
            title: "Business",
            description: "Opening segment",
            estimatedDurationMinutes: 5,
            sourceIds: ["s1"],
          },
        ],
        estimatedDurationMinutes: 5,
      },
      currentTopicId: "t1",
    };
    expect(resolveStoryFocus(session).storyFocus).toMatch(/Nvidia/i);
  });
});

describe("deriveConversationState", () => {
  it("tracks pending questions for the addressed guest", () => {
    const state = deriveConversationState({
      turns: [
        turn({
          speakerId: "host",
          speakerName: "Mira",
          speakerType: "host",
          text: "Ava, what makes a risky project worth funding?",
        }),
      ],
      config: {
        topics: ["Technology"],
        region: "us",
        language: "en",
        durationMinutes: 5,
        depth: "intermediate",
        guests,
      },
      sources: [],
      outline: undefined,
      currentTopicId: undefined,
    });
    expect(state.lastWasQuestion).toBe(true);
    expect(state.pendingAnswerGuestId).toBe("ava");
    expect(state.pendingQuestion).toMatch(/worth funding/i);
  });
});

describe("isRepetitiveClaim", () => {
  it("flags near-duplicate claims", () => {
    const prior = [
      "the hard part is proving the mechanism not the headline on export curbs",
    ];
    expect(
      isRepetitiveClaim(
        "The hard part is proving the mechanism, not the headline, on export curbs.",
        prior,
      ),
    ).toBe(true);
  });
});

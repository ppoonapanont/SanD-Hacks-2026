import type { ConversationTurn, Guest, PodcastSession } from "@/types";

import {
  deriveConversationState,
  type ConversationState,
} from "./conversationState";

/** How the next speaker should engage the prior turn (internal only). */
export type ConversationMove =
  | "react"
  | "challenge"
  | "question"
  | "advance"
  | "moderate"
  | "close";

export const CONVERSATION_MOVES: ConversationMove[] = [
  "react",
  "challenge",
  "question",
  "advance",
  "moderate",
  "close",
];

export function isConversationMove(value: string): value is ConversationMove {
  return (CONVERSATION_MOVES as string[]).includes(value);
}

/**
 * Internal planning object for the next live turn.
 * Never stringify this into the transcript or TTS.
 */
export interface TurnPlan {
  speakerId: string;
  addressingSpeakerId: string | null;
  move: ConversationMove;
  /** Short internal focus — planning metadata only. */
  focus: string;
  shouldClose: boolean;
}

/** How many guest turns have run since the last host line. */
export function guestStreakSinceHost(turns: ConversationTurn[]): number {
  let streak = 0;
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i]?.speakerType === "host" || turns[i]?.speakerId === "host") {
      break;
    }
    streak += 1;
  }
  return streak;
}

/**
 * Pick the next speaker + move from lightweight conversation state.
 * Prefers answering pending addressed questions over mechanical alternation.
 */
export function planNextTurn(input: {
  forceClose: boolean;
  preferClose: boolean;
  session: Pick<
    PodcastSession,
    "turns" | "outline" | "sources" | "config" | "currentTopicId"
  >;
}): TurnPlan {
  const state = deriveConversationState(input.session);
  const guests = input.session.config.guests;

  if (input.forceClose) {
    return {
      speakerId: "host",
      addressingSpeakerId: null,
      move: "close",
      focus: "warm takeaway; acknowledge uncertainty; invite listeners back",
      shouldClose: true,
    };
  }

  // Never cut off an open, addressed question — let that guest answer first.
  if (state.pendingAnswerGuestId && state.pendingQuestion) {
    const guest = guests.find((g) => g.id === state.pendingAnswerGuestId);
    if (guest) {
      return {
        speakerId: guest.id,
        addressingSpeakerId: state.lastSpeakerId || null,
        move: "react",
        focus: `answer the open question about ${state.storyFocus}`,
        shouldClose: false,
      };
    }
  }

  // Soft close only when nothing is pending.
  if (input.preferClose) {
    return {
      speakerId: "host",
      addressingSpeakerId: null,
      move: "close",
      focus: `resolve ${state.storyFocus}: one takeaway, note what's still uncertain`,
      shouldClose: true,
    };
  }

  // Host periodically — follow-up / invite, not after every guest line.
  if (state.guestStreak >= 3) {
    const inviteId = leastHeardGuest(guests, state, state.lastSpeakerId);
    const invite = guests.find((g) => g.id === inviteId);
    return {
      speakerId: "host",
      addressingSpeakerId: inviteId,
      move: "moderate",
      focus: invite
        ? `ask ${invite.name} a concrete follow-up on ${state.storyFocus}`
        : `clarify the last claim on ${state.storyFocus}`,
      shouldClose: false,
    };
  }

  if (!guests.length) {
    return {
      speakerId: "host",
      addressingSpeakerId: null,
      move: "question",
      focus: `pose one concrete question about ${state.storyFocus}`,
      shouldClose: false,
    };
  }

  const speakerId = pickGuestSpeaker(guests, state);
  const addressingSpeakerId =
    state.lastSpeakerId && state.lastSpeakerId !== speakerId
      ? state.lastSpeakerId
      : null;
  const move = pickGuestMove(state);

  return {
    speakerId,
    addressingSpeakerId,
    move,
    focus: focusForMove(move, state),
    shouldClose: false,
  };
}

/**
 * @deprecated Prefer planNextTurn — kept for older tests/callers.
 * Returns a direction string for prompts; do not speak it aloud.
 */
export function heuristicNextMove(input: {
  forceClose: boolean;
  turns: ConversationTurn[];
  lastSpeakerId: string;
  guests: Guest[];
}): { speakerId: string; move: ConversationMove; direction: string } {
  const plan = planNextTurn({
    forceClose: input.forceClose,
    preferClose: false,
    session: {
      turns: input.turns,
      config: {
        topics: [],
        region: "us",
        language: "en",
        durationMinutes: 5,
        depth: "intermediate",
        guests: input.guests,
      },
      sources: [],
      outline: undefined,
      currentTopicId: undefined,
    },
  });
  return {
    speakerId: plan.speakerId,
    move: plan.move,
    direction: plan.focus,
  };
}

function leastHeardGuest(
  guests: Guest[],
  state: ConversationState,
  excludeId: string,
): string | null {
  const pool = guests.filter((g) => g.id !== excludeId);
  if (!pool.length) return guests[0]?.id ?? null;
  pool.sort(
    (a, b) =>
      (state.guestSpeakCounts[a.id] ?? 0) -
        (state.guestSpeakCounts[b.id] ?? 0) ||
      a.name.localeCompare(b.name),
  );
  return pool[0]?.id ?? null;
}

function pickGuestSpeaker(guests: Guest[], state: ConversationState): string {
  // Prefer someone other than the last speaker, weighted toward less-heard guests.
  const pool = guests.filter((g) => g.id !== state.lastSpeakerId);
  const candidates = pool.length ? pool : guests;
  candidates.sort(
    (a, b) =>
      (state.guestSpeakCounts[a.id] ?? 0) -
        (state.guestSpeakCounts[b.id] ?? 0) ||
      a.name.localeCompare(b.name),
  );
  // Soft mix: usually least-heard, occasionally second-least to avoid a fixed duo loop.
  if (candidates.length >= 2 && state.turnCount % 5 === 0) {
    return candidates[1]!.id;
  }
  return candidates[0]!.id;
}

function pickGuestMove(state: ConversationState): ConversationMove {
  if (state.lastWasQuestion) return "react";
  // Favor natural responses; challenge sparingly so disagreement isn't forced.
  const cycle: ConversationMove[] = [
    "react",
    "advance",
    "react",
    "question",
    "advance",
    "challenge",
  ];
  return cycle[state.turnCount % cycle.length] ?? "react";
}

function focusForMove(move: ConversationMove, state: ConversationState): string {
  const story = state.storyFocus;
  const prior = state.lastSpeakerName || "the last speaker";
  switch (move) {
    case "react":
      return `respond to ${prior} on ${story} with your own take`;
    case "challenge":
      return `push on one weak assumption in ${prior}'s point about ${story}`;
    case "question":
      return `ask ${prior} one clarifying question about ${story}`;
    case "advance":
      return `add a new implication on ${story} without restating the headline`;
    case "moderate":
      return `facilitate a sharper beat on ${story}`;
    case "close":
      return `close cleanly on ${story}`;
  }
}

/** Shared spoken-style rules for host/guest line generation. */
export function spokenDialogueStyleRules(): string[] {
  return [
    "Sound like a real podcast: conversational sentences, natural transitions.",
    "Do not write essay-like paragraphs or formal briefing language.",
    "Avoid filler (um, you know, look), slang piles, and fake enthusiasm.",
    "Do not restate points already made in recent turns.",
    "Do not narrate your role or say phrases like 'new angle', 'quick redirect', or 'question for'.",
    "Do not mention source numbers, brackets like [2], or citation indexes aloud.",
    "Paraphrase prior ideas; do not read truncated quotes from earlier turns.",
    "Talk about the concrete news story, not a category label like 'Business'.",
    "Variable length is good: sometimes one short sentence, sometimes two.",
    "Output only words to say aloud — no labels or stage directions.",
  ];
}

export function guestEngagementRules(input: {
  move: ConversationMove;
  lastSpeakerName: string | null;
  addressingName: string | null;
  storyFocus: string;
}): string[] {
  const prior = input.lastSpeakerName;
  const rules = [
    "Stay in character with your expertise and perspective.",
    `Stay on the story: ${input.storyFocus}.`,
    "If answering a question, answer it first — then optionally add one beat.",
  ];
  if (input.addressingName) {
    rules.push(`You are responding to ${input.addressingName}.`);
  }
  if (!prior || prior === "You") return rules;

  switch (input.move) {
    case "react":
      rules.push(
        `Acknowledge ${prior}'s idea in your own words, then add your distinct take.`,
      );
      break;
    case "challenge":
      rules.push(
        `Disagree with ${prior} only if you have a substantive reason (mechanism, tradeoff, or evidence).`,
      );
      break;
    case "question":
      rules.push(
        `Ask ${prior} one pointed question, then optionally offer how you'd frame it.`,
      );
      break;
    case "advance":
      rules.push(
        `Extend ${prior}'s thread with a new implication — do not summarize the same headline again.`,
      );
      break;
    default:
      rules.push(`Connect to what ${prior} just said when it helps listeners.`);
  }
  return rules;
}

export function hostEngagementRules(input: {
  move: ConversationMove;
  closing: boolean;
  storyFocus: string;
  addressingName: string | null;
}): string[] {
  if (input.closing || input.move === "close") {
    return [
      `Closing beat on ${input.storyFocus}: thank the panel briefly, one takeaway, acknowledge uncertainty, no new facts.`,
      "First person to the listener. Never address yourself by name.",
    ];
  }
  const invite = input.addressingName
    ? ` Prefer inviting ${input.addressingName} by name.`
    : "";
  return [
    `You are moderating a discussion of: ${input.storyFocus}.`,
    "Ask a specific follow-up, clarify a claim, or invite a named guest to respond." +
      invite,
    "Do not monologue a news summary. Do not announce internal moves.",
    "First person. Never address yourself by name or say 'back to you' to yourself.",
  ];
}

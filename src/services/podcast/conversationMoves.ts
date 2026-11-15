import type { ConversationTurn, Guest } from "@/types";

/** How the next speaker should engage the prior turn. */
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
 * Heuristic when the moderator LLM is unavailable: keep the panel talking,
 * insert the host periodically (not every turn), and close when forced.
 */
export function heuristicNextMove(input: {
  forceClose: boolean;
  turns: ConversationTurn[];
  lastSpeakerId: string;
  guests: Guest[];
}): { speakerId: string; move: ConversationMove; direction: string } {
  if (input.forceClose) {
    return {
      speakerId: "host",
      move: "close",
      direction:
        "Close the episode: one warm takeaway, no new claims, invite listeners back.",
    };
  }

  const streak = guestStreakSinceHost(input.turns);
  const last = input.turns[input.turns.length - 1];
  const lastName = last?.speakerName ?? "the last speaker";

  // Host every ~3 guest turns — follow-up / redirect, not after every line.
  if (streak >= 3) {
    return {
      speakerId: "host",
      move: "moderate",
      direction: `Ask ${lastName} a precise follow-up, or invite another guest to respond to their last point — one short spoken line.`,
    };
  }

  const nextGuest =
    input.guests.find((g) => g.id !== input.lastSpeakerId) ?? input.guests[0];
  const speakerId = nextGuest?.id ?? "host";

  if (speakerId === "host") {
    return {
      speakerId: "host",
      move: "question",
      direction: `Pose one concrete question to the panel about what ${lastName} just claimed.`,
    };
  }

  // Alternate react / challenge / advance so we don't only monologue forward.
  const pattern: ConversationMove[] = ["react", "advance", "challenge", "question"];
  const move = pattern[input.turns.length % pattern.length] ?? "react";
  const directionByMove: Record<ConversationMove, string> = {
    react: `Respond directly to ${lastName}: name their point, then add your expertise in one beat.`,
    challenge: `Push back on ${lastName} with a substantive disagreement from your expertise — no generic "I hear you".`,
    question: `Ask ${lastName} one sharp clarifying question, then offer a short take of your own.`,
    advance: `Build on ${lastName}'s last point with a new angle from your expertise — do not restate the news.`,
    moderate: `Facilitate: clarify the claim and hand a specific question to another guest.`,
    close: `Wrap the thread cleanly for listeners.`,
  };

  return {
    speakerId,
    move,
    direction: directionByMove[move],
  };
}

/** Shared spoken-style rules for host/guest line generation. */
export function spokenDialogueStyleRules(): string[] {
  return [
    "Sound like a real podcast: conversational sentences, natural transitions.",
    "Do not write essay-like paragraphs or formal briefing language.",
    "Avoid filler (um, you know, look), slang piles, and fake enthusiasm.",
    "Do not restate points already made in recent turns.",
    "Examples or analogies are welcome when they clarify — keep them short.",
    "1–3 spoken sentences only. Output words to say aloud — no labels or stage directions.",
  ];
}

export function guestEngagementRules(input: {
  move: ConversationMove;
  lastSpeakerName: string | null;
}): string[] {
  const prior = input.lastSpeakerName;
  const rules = [
    "Stay in character with your expertise and perspective.",
    "If you engage a prior speaker, be specific — quote or paraphrase their claim, not a vague 'great point'.",
  ];
  if (!prior || prior === "You") return rules;

  switch (input.move) {
    case "react":
      rules.push(
        `Open by acknowledging ${prior}'s last claim in concrete terms, then add your distinct take.`,
      );
      break;
    case "challenge":
      rules.push(
        `Disagree with ${prior} on substance (mechanism, tradeoff, or evidence) — respectful, not performative.`,
      );
      break;
    case "question":
      rules.push(
        `Ask ${prior} one pointed question, then optionally answer how you'd frame it.`,
      );
      break;
    case "advance":
      rules.push(
        `Extend ${prior}'s thread with a new implication from your lane — do not summarize the same headline again.`,
      );
      break;
    default:
      rules.push(`Connect your line to what ${prior} just said when it helps the listener.`);
  }
  return rules;
}

export function hostEngagementRules(input: {
  move: ConversationMove;
  closing: boolean;
}): string[] {
  if (input.closing || input.move === "close") {
    return [
      "Closing beat only: thank the panel briefly, one takeaway, no new facts.",
      "First person to the listener. Never address yourself by name.",
    ];
  }
  return [
    "You are moderating live: ask a specific follow-up, clarify a claim, or invite a named guest to respond.",
    "Do not monologue a news summary. Do not speak after every guest turn — this turn is intentional.",
    "First person. Never address yourself by name or say 'back to you' to yourself.",
  ];
}

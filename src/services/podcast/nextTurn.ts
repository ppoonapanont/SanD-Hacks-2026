import { getSession, updateSession } from "@/lib/sessions";
import { generateJson, isGeminiConfigured } from "@/services/gemini";
import type {
  ConversationTurn,
  Guest,
  NewsSource,
  PodcastSession,
} from "@/types";
import { createId } from "@/utils/id";

import {
  guestEngagementRules,
  hostEngagementRules,
  planNextTurn,
  spokenDialogueStyleRules,
  type ConversationMove,
  type TurnPlan,
} from "./conversationMoves";
import {
  deriveConversationState,
  isRepetitiveClaim,
  resolveStoryFocus,
} from "./conversationState";
import { hostDisplayName } from "./guestMap";
import { sanitizeHostSpokenLine } from "./hostLines";
import { estimateSpeechSeconds, nextSpeechTimestamp } from "./speechTiming";
import { finalizeSpokenLine } from "./spokenText";

/** Live /next must finish inside a spoken line (~8–12s). Keep LLM calls tight. */
const LINE_TIMEOUT_MS = 12_000;

export interface NextTurnResult {
  session: PodcastSession;
  turn: ConversationTurn;
  generated: boolean;
  done: boolean;
  errors: string[];
}

const LINE_SCHEMA = {
  type: "object",
  properties: {
    text: { type: "string" },
    sourceIndexes: {
      type: "array",
      items: { type: "number" },
      description: "1-based indexes into the session sources list — metadata only, never speak these",
    },
  },
  required: ["text", "sourceIndexes"],
} as const;

/**
 * Soft target for live turn count from requested duration.
 * Timestamps themselves use speech estimates — we do not pad gaps to fill time.
 */
export function targetTurnCount(durationMinutes: number): number {
  const totalSec = Math.max(60, durationMinutes * 60);
  return Math.max(8, Math.min(48, Math.round(totalSec / 12) + 1));
}

/** Hard ceiling so generation cannot run forever if lines stay short. */
export function hardTurnCap(durationMinutes: number): number {
  return Math.max(
    targetTurnCount(durationMinutes),
    Math.min(56, Math.round((durationMinutes * 60) / 8) + 2),
  );
}

function episodeDurationSec(session: PodcastSession): number {
  return Math.max(60, session.config.durationMinutes * 60);
}

function formatSources(sources: NewsSource[]): string {
  return sources
    .map((s, i) => {
      const claims = (s.keyClaims ?? []).slice(0, 2).join(" | ");
      return [
        `Source ${i + 1}: ${s.title} — ${s.publisher}${s.isMock ? " (mock)" : ""}`,
        s.summary.slice(0, 220),
        claims ? `claims: ${claims}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function hostTurn(text: string, timestamp: number, topicId?: string): ConversationTurn {
  return {
    id: createId("turn"),
    speakerId: "host",
    speakerName: hostDisplayName(),
    speakerType: "host",
    text,
    timestamp,
    ...(topicId ? { topicId } : {}),
  };
}

function guestTurn(
  guest: Guest,
  text: string,
  timestamp: number,
  sourceIds: string[],
  topicId?: string,
): ConversationTurn {
  return {
    id: createId("turn"),
    speakerId: guest.id,
    speakerName: guest.name,
    speakerType: "guest",
    text,
    voiceId: guest.voiceId,
    timestamp,
    ...(sourceIds.length ? { sourceIds } : {}),
    ...(topicId ? { topicId } : {}),
  };
}

/** Natural host fallbacks — never planning labels or truncated quotes. */
function fallbackHostLine(
  session: PodcastSession,
  plan: TurnPlan,
  closing: boolean,
): string {
  const { storyFocus } = resolveStoryFocus(session);
  if (closing || plan.move === "close") {
    return `That's our take on ${storyFocus} for now — thanks for listening, and stay curious.`;
  }
  const guests = session.config.guests;
  const addressed =
    guests.find((g) => g.id === plan.addressingSpeakerId)?.name ??
    session.turns[session.turns.length - 1]?.speakerName ??
    "the panel";
  const variants = [
    `${addressed}, what would actually change if that claim about ${storyFocus} is right?`,
    `Hold on — what's the one fact under ${storyFocus} we should not gloss over?`,
    `${addressed}, give me the sharper version: what's the real tradeoff here?`,
  ];
  return variants[session.turns.length % variants.length]!;
}

/** Natural guest fallbacks grounded in the story — never "New angle" / truncated quotes. */
function fallbackGuestLine(
  session: PodcastSession,
  guest: Guest,
  plan: TurnPlan,
): string {
  const { storyFocus } = resolveStoryFocus(session);
  const last = session.turns[session.turns.length - 1];
  const who =
    last && last.speakerId !== guest.id ? last.speakerName : null;
  const seat = guest.expertise.toLowerCase();

  if (plan.move === "react" && who) {
    return `I hear ${who} — from a ${seat} view, the hard part with ${storyFocus} is still proving the mechanism, not the headline.`;
  }
  if (plan.move === "question" && who) {
    return `${who}, what evidence would actually change your mind on ${storyFocus}?`;
  }
  if (plan.move === "challenge" && who) {
    return `I'm not sure that holds, ${who}. On ${storyFocus}, the downside still looks underpriced from a ${seat} seat.`;
  }
  if (plan.move === "advance") {
    return `The next beat on ${storyFocus}, for me, is who absorbs the cost if this takes longer than expected.`;
  }
  return `From a ${seat} angle, ${storyFocus} comes down to incentives versus capability — and those aren't the same thing.`;
}

/** Placeholder start time from prior text length (Experience overwrites with measured TTS). */
export function timestampForNewTurn(session: PodcastSession): number {
  const last = session.turns[session.turns.length - 1];
  if (!last) return 0;
  return nextSpeechTimestamp({
    previousStartSec: typeof last.timestamp === "number" ? last.timestamp : 0,
    previousText: last.text,
    episodeDurationSec: episodeDurationSec(session),
  });
}

/**
 * Advance a live session by one generated turn (plan → speaker writes).
 */
export async function advancePodcastTurn(sessionId: string): Promise<NextTurnResult> {
  const errors: string[] = [];
  const session = getSession(sessionId);
  if (!session) {
    throw new Error("Podcast not found");
  }

  if ((session.generationMode ?? "script") !== "live") {
    throw new Error("advancePodcastTurn requires a live session");
  }

  const softTarget = targetTurnCount(session.config.durationMinutes);
  const hardMax = hardTurnCap(session.config.durationMinutes);

  if (session.turns.length >= hardMax) {
    const completed =
      updateSession(sessionId, (current) => ({
        ...current,
        status: "completed",
      })) ?? session;
    const last = completed.turns[completed.turns.length - 1];
    if (!last) {
      throw new Error("Episode complete");
    }
    return {
      session: completed,
      turn: last,
      generated: false,
      done: true,
      errors: ["Episode complete"],
    };
  }

  const state = deriveConversationState(session);
  // Prefer closing near the end, but never before an addressed question is answered.
  const preferClose =
    session.turns.length >= softTarget - 1 && !state.pendingAnswerGuestId;
  const forceClose = session.turns.length >= hardMax - 1;

  const plan = planNextTurn({
    forceClose,
    preferClose,
    session,
  });

  const timestamp = timestampForNewTurn(session);
  const topicId =
    session.currentTopicId ?? session.outline?.topics[0]?.id;

  let turn: ConversationTurn;

  if (
    plan.shouldClose ||
    plan.speakerId === "host" ||
    !session.config.guests.some((g) => g.id === plan.speakerId)
  ) {
    const text = await generateHostLine(session, plan, errors);
    turn = hostTurn(text, timestamp, topicId);
  } else {
    const guest = session.config.guests.find((g) => g.id === plan.speakerId)!;
    const { text, sourceIds } = await generateGuestLine(
      session,
      guest,
      plan,
      errors,
    );
    turn = guestTurn(guest, text, timestamp, sourceIds, topicId);
  }

  const done =
    plan.shouldClose || session.turns.length + 1 >= hardMax;
  const updated =
    updateSession(sessionId, (current) => ({
      ...current,
      turns: [...current.turns, turn],
      status: done ? "completed" : "playing",
      currentTopicId: topicId ?? current.currentTopicId,
    })) ?? session;

  return {
    session: updated,
    turn,
    generated: true,
    done,
    errors,
  };
}

async function generateHostLine(
  session: PodcastSession,
  plan: TurnPlan,
  errors: string[],
): Promise<string> {
  const hostName = hostDisplayName();
  const closing = plan.shouldClose || plan.move === "close";
  const fallback = fallbackHostLine(session, plan, closing);
  const state = deriveConversationState(session);

  if (!isGeminiConfigured()) {
    errors.push("Host line: Gemini not configured");
    return finalizeSpokenLine(fallback, fallback);
  }

  const addressedName =
    session.config.guests.find((g) => g.id === plan.addressingSpeakerId)?.name ??
    null;

  try {
    const result = await generateJson<{ text: string; sourceIndexes: number[] }>(
      [
        `You are ${hostName}, podcast host.`,
        ...spokenDialogueStyleRules(),
        ...hostEngagementRules({
          move: plan.move,
          closing,
          storyFocus: state.storyFocus,
          addressingName: addressedName,
        }),
        "",
        "Internal plan (do not speak these words):",
        `move=${plan.move}; focus=${plan.focus}`,
        state.storyWhy ? `Why it matters: ${state.storyWhy}` : "",
        "",
        "Recent turns:",
        formatRecentTurns(session.turns),
        "",
        "Background sources (use for grounding; put indexes only in sourceIndexes JSON field):",
        formatSources(session.sources),
      ]
        .filter(Boolean)
        .join("\n"),
      LINE_SCHEMA,
      { timeoutMs: LINE_TIMEOUT_MS },
    );
    const raw =
      sanitizeHostSpokenLine(String(result.text ?? "").trim(), hostName) ||
      fallback;
    return finalizeSpokenLine(raw, fallback);
  } catch (error) {
    errors.push(
      error instanceof Error ? `Host line: ${error.message}` : "Host line failed",
    );
    return finalizeSpokenLine(fallback, fallback);
  }
}

async function generateGuestLine(
  session: PodcastSession,
  guest: Guest,
  plan: TurnPlan,
  errors: string[],
): Promise<{ text: string; sourceIds: string[] }> {
  const fallbackText = fallbackGuestLine(session, guest, plan);
  const fallback = {
    text: finalizeSpokenLine(fallbackText, fallbackText),
    sourceIds: [] as string[],
  };

  if (!isGeminiConfigured()) {
    errors.push(`Guest line ${guest.name}: Gemini not configured`);
    return fallback;
  }

  const state = deriveConversationState(session);
  const last = session.turns[session.turns.length - 1];
  const lastSpeakerName =
    last && last.speakerId !== guest.id ? last.speakerName : null;
  const addressingName =
    session.config.guests.find((g) => g.id === plan.addressingSpeakerId)?.name ??
    lastSpeakerName;

  try {
    const structured = await generateJson<{
      text: string;
      sourceIndexes: number[];
    }>(
      [
        `You are ${guest.name}, a guest on a live multi-guest news podcast.`,
        `Expertise: ${guest.expertise}`,
        `Personality: ${guest.personality}`,
        `Perspective: ${guest.perspective}`,
        `Communication style: ${guest.communicationStyle}`,
        guest.background ? `Background: ${guest.background}` : "",
        "",
        ...spokenDialogueStyleRules(),
        ...guestEngagementRules({
          move: plan.move,
          lastSpeakerName,
          addressingName,
          storyFocus: state.storyFocus,
        }),
        "",
        "Internal plan (do not speak these words):",
        `move=${plan.move}; focus=${plan.focus}`,
        state.pendingQuestion
          ? `Open question to answer: ${state.pendingQuestion}`
          : "",
        state.storyWhy ? `Why it matters: ${state.storyWhy}` : "",
        "",
        "Recent turns:",
        formatRecentTurns(session.turns),
        "",
        "Research sources (ground claims here; sourceIndexes are JSON metadata only — never say [1] or 'source 2' aloud):",
        formatSources(session.sources) || "(none)",
        `Source count N=${session.sources.length}`,
        "",
        "Return JSON with spoken words only.",
      ]
        .filter(Boolean)
        .join("\n"),
      LINE_SCHEMA,
      { timeoutMs: LINE_TIMEOUT_MS },
    );

    let text = finalizeSpokenLine(String(structured.text ?? "").trim(), fallbackText);
    if (isRepetitiveClaim(text, state.recentClaimFingerprints)) {
      errors.push(`Guest line ${guest.name}: repetitive; using alternate fallback`);
      text = finalizeSpokenLine(
        fallbackGuestLine(session, guest, {
          ...plan,
          move: plan.move === "react" ? "advance" : "react",
        }),
        fallbackText,
      );
    }

    const sourceIds = (structured.sourceIndexes ?? [])
      .map((n) => session.sources[Number(n) - 1]?.id)
      .filter((id): id is string => Boolean(id));

    return { text, sourceIds };
  } catch (error) {
    errors.push(
      error instanceof Error
        ? `Guest line ${guest.name}: ${error.message}`
        : `Guest line ${guest.name} failed`,
    );
    return fallback;
  }
}

function formatRecentTurns(turns: ConversationTurn[]): string {
  return (
    turns
      .slice(-6)
      .map((t) => `${t.speakerName}: ${t.text}`)
      .join("\n") || "(none)"
  );
}

/**
 * Seed turns for a live episode (cold open) before /next takes over.
 * Prefer a concrete story headline over "live on Business".
 */
export function buildLiveSeedTurns(
  sessionLike: Pick<PodcastSession, "config" | "outline" | "sources">,
  coldOpenHook: string,
): ConversationTurn[] {
  const { storyFocus } = resolveStoryFocus(sessionLike);
  const raw = coldOpenHook.trim();
  const genericCategoryOpen =
    !raw ||
    /today we're live on\b/i.test(raw) ||
    /welcome in — we've got a sharp panel/i.test(raw);

  const hook = genericCategoryOpen
    ? `Welcome in — we're opening on ${storyFocus}.`
    : raw;

  const topicId = sessionLike.outline?.topics[0]?.id;
  const text =
    sanitizeHostSpokenLine(hook, hostDisplayName()) || hook;
  return [hostTurn(finalizeSpokenLine(text, hook), 0, topicId)];
}

export { estimateSpeechSeconds };
export type { ConversationMove, TurnPlan };

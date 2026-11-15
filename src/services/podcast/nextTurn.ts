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
  heuristicNextMove,
  hostEngagementRules,
  spokenDialogueStyleRules,
  type ConversationMove,
} from "./conversationMoves";
import { hostDisplayName } from "./guestMap";
import { sanitizeHostSpokenLine } from "./hostLines";
import { estimateSpeechSeconds, nextSpeechTimestamp } from "./speechTiming";

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
      description: "1-based indexes into the session sources list",
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
  // ~12s average spoken line → fewer padded turns than the old 10s fixed grid.
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
        `[${i + 1}] ${s.title} — ${s.publisher}${s.isMock ? " (mock)" : ""}`,
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

/** Short hook from the prior turn so heuristic fallbacks stay specific. */
function priorClaimSnippet(session: PodcastSession, max = 72): string {
  const last = session.turns[session.turns.length - 1];
  const raw = (last?.text ?? "").replace(/\s+/g, " ").trim();
  if (!raw) {
    const topic =
      session.outline?.topics.find((t) => t.id === session.currentTopicId) ??
      session.outline?.topics[0];
    return (
      topic?.title?.trim() ||
      session.config.topics[0]?.trim() ||
      "this thread"
    );
  }
  return raw.length <= max ? raw : `${raw.slice(0, max - 1)}…`;
}

function topicTitle(session: PodcastSession): string {
  const topic =
    session.outline?.topics.find((t) => t.id === session.currentTopicId) ??
    session.outline?.topics[0];
  return (
    topic?.title?.trim() ||
    session.config.topics[0]?.trim() ||
    "today's story"
  );
}

/** Varied host lines when Gemini fails — never reuse one stock phrase every turn. */
function fallbackHostLine(
  session: PodcastSession,
  move: ConversationMove,
  closing: boolean,
): string {
  if (closing) {
    return "That's our rundown for now — thanks for listening, and stay curious.";
  }
  const last = session.turns[session.turns.length - 1];
  const who = last?.speakerName ?? "the panel";
  const claim = priorClaimSnippet(session);
  const variants: Record<Exclude<ConversationMove, "close">, string[]> = {
    moderate: [
      `Hold on — ${who}, can you pressure-test that last claim for a second?`,
      `Quick redirect: what's the one fact under "${claim}" we should not gloss over?`,
      `${who}, give me the sharper version of that — what actually changes if you're right?`,
    ],
    question: [
      `${who}, what would change your mind about "${claim}"?`,
      `For listeners: what's the open question still hanging after that point?`,
      `${who}, who on the panel should answer the other side of that?`,
    ],
    react: [
      `Okay, I'm tracking "${claim}" — someone push on the mechanism.`,
      `That's a clear stake. Who wants to answer ${who} directly?`,
    ],
    challenge: [
      `I'm going to pause us there — is "${claim}" settled, or still contested?`,
      `Devil's advocate for a beat: what if ${who} has the causation backwards?`,
    ],
    advance: [
      `Let's move the thread forward — implications of "${claim}" for ${topicTitle(session)}?`,
      `Useful beat. What's the next concrete angle we haven't covered?`,
    ],
  };
  const pool = variants[move === "close" ? "moderate" : move] ?? variants.moderate;
  return pool[session.turns.length % pool.length] ?? pool[0]!;
}

/** Varied guest lines when Gemini fails — keyed by move + prior claim, not one template. */
function fallbackGuestLine(
  session: PodcastSession,
  guest: Guest,
  move: ConversationMove,
): string {
  const seat = guest.expertise.toLowerCase();
  const last = session.turns[session.turns.length - 1];
  const who =
    last && last.speakerId !== guest.id ? last.speakerName : "the last point";
  const claim = priorClaimSnippet(session);
  const topic = topicTitle(session);

  const byMove: Record<ConversationMove, string[]> = {
    react: [
      `${who}'s point on "${claim}" lands — from a ${seat} seat, the missing piece is how it scales for ${topic}.`,
      `Building on ${who}: if "${claim}" is right, the ${seat} implication is we still need a clearer operator.`,
    ],
    challenge: [
      `I'd push back on ${who} — from a ${seat} seat, "${claim}" overstates the mechanism.`,
      `Respectfully, ${who}: that headline isn't the same as the mechanism. ${seat} lens says prove the causal step.`,
    ],
    question: [
      `${who}, one clarifying ask from the ${seat} side: what evidence would flip "${claim}"?`,
      `Question for ${who}: on ${topic}, are we talking incentives or capability when you say "${claim}"?`,
    ],
    advance: [
      `Take ${who}'s beat further — ${seat} angle on ${topic} is the second-order effect after "${claim}".`,
      `New angle: once you accept "${claim}", the ${seat} follow-on is who absorbs the downside.`,
    ],
    moderate: [
      `Let me reframe for a second — ${seat} view of ${topic} starts from the constraint behind "${claim}".`,
      `Stepping in: the ${seat} cut on "${claim}" is simpler than we're making it.`,
    ],
    close: [
      `Quick close from my ${seat} lane: watch the mechanism on ${topic}, not just the headline.`,
    ],
  };

  const pool = byMove[move] ?? byMove.react;
  return pool[session.turns.length % pool.length] ?? pool[0]!;
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
 * Advance a live session by one generated turn (Moderator routes → speaker writes).
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

  const shouldPreferClose = session.turns.length >= softTarget - 1;
  const plan = planNextSpeaker(session, shouldPreferClose);
  const timestamp = timestampForNewTurn(session);
  const topicId =
    plan.topicId && session.outline?.topics.some((t) => t.id === plan.topicId)
      ? plan.topicId
      : session.currentTopicId ?? session.outline?.topics[0]?.id;

  let turn: ConversationTurn;

  if (
    plan.shouldClose ||
    plan.speakerId === "host" ||
    !session.config.guests.some((g) => g.id === plan.speakerId)
  ) {
    const text = await generateHostLine(
      session,
      plan.direction,
      plan.move,
      plan.shouldClose,
      errors,
    );
    turn = hostTurn(text, timestamp, topicId);
  } else {
    const guest = session.config.guests.find((g) => g.id === plan.speakerId)!;
    const { text, sourceIds } = await generateGuestLine(
      session,
      guest,
      plan.direction,
      plan.move,
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

/**
 * Route the next live turn with the local heuristic.
 * A Moderator agent + JSON rewrite used to cost 2 sequential LLM calls (~5–15s)
 * and left playback stalled; interrupt routing still uses the Mastra Moderator.
 */
function planNextSpeaker(
  session: PodcastSession,
  forceClose: boolean,
): {
  speakerId: string;
  topicId: string;
  move: ConversationMove;
  direction: string;
  shouldClose: boolean;
} {
  const last = session.turns[session.turns.length - 1];
  const lastId = last?.speakerId ?? "";
  const topicFallback =
    session.currentTopicId ?? session.outline?.topics[0]?.id ?? "";
  const heuristic = heuristicNextMove({
    forceClose,
    turns: session.turns,
    lastSpeakerId: lastId,
    guests: session.config.guests,
  });

  return {
    speakerId: heuristic.speakerId,
    topicId: topicFallback,
    move: heuristic.move,
    direction: heuristic.direction,
    shouldClose: forceClose || heuristic.move === "close",
  };
}

async function generateHostLine(
  session: PodcastSession,
  direction: string,
  move: ConversationMove,
  closing: boolean,
  errors: string[],
): Promise<string> {
  const hostName = hostDisplayName();
  const fallback = fallbackHostLine(session, move, closing);

  if (!isGeminiConfigured()) {
    errors.push("Host line: Gemini not configured");
    return fallback;
  }

  const last = session.turns[session.turns.length - 1];

  try {
    const result = await generateJson<{ text: string; sourceIndexes: number[] }>(
      [
        `You are ${hostName}, podcast host.`,
        ...spokenDialogueStyleRules(),
        ...hostEngagementRules({ move, closing }),
        "",
        `Conversation move: ${move}`,
        `Direction: ${direction}`,
        last ? `Prior speaker: ${last.speakerName}` : "",
        "",
        "Recent turns:",
        session.turns
          .slice(-5)
          .map((t) => `${t.speakerName}: ${t.text}`)
          .join("\n") || "(none)",
        "",
        "Sources (optional citations):",
        formatSources(session.sources),
      ]
        .filter(Boolean)
        .join("\n"),
      LINE_SCHEMA,
      { timeoutMs: LINE_TIMEOUT_MS },
    );
    return (
      sanitizeHostSpokenLine(String(result.text ?? "").trim(), hostName) ||
      fallback
    );
  } catch (error) {
    errors.push(
      error instanceof Error ? `Host line: ${error.message}` : "Host line failed",
    );
    return fallback;
  }
}

async function generateGuestLine(
  session: PodcastSession,
  guest: Guest,
  direction: string,
  move: ConversationMove,
  errors: string[],
): Promise<{ text: string; sourceIds: string[] }> {
  const fallback = {
    text: fallbackGuestLine(session, guest, move),
    sourceIds: [] as string[],
  };

  if (!isGeminiConfigured()) {
    errors.push(`Guest line ${guest.name}: Gemini not configured`);
    return fallback;
  }

  const last = session.turns[session.turns.length - 1];
  const lastSpeakerName =
    last && last.speakerId !== guest.id ? last.speakerName : null;

  try {
    // One structured call — Mastra Guest agent + rewrite was 2 sequential LLMs
    // and routinely exceeded a spoken line's length. Interrupt path still uses agents.
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
        ...guestEngagementRules({ move, lastSpeakerName }),
        "",
        `Conversation move: ${move}`,
        `Direction: ${direction}`,
        "",
        "Recent turns (respond to these — do not ignore them):",
        session.turns
          .slice(-5)
          .map((t) => `${t.speakerName}: ${t.text}`)
          .join("\n") || "(none)",
        "",
        "Research sources (cite with 1-based sourceIndexes, or []):",
        formatSources(session.sources) || "(none)",
        `Source count N=${session.sources.length}`,
        "",
        "Return JSON: 1–3 spoken sentences in character. Do not invent facts.",
      ]
        .filter(Boolean)
        .join("\n"),
      LINE_SCHEMA,
      { timeoutMs: LINE_TIMEOUT_MS },
    );

    const text = String(structured.text ?? "").trim();
    if (!text) {
      errors.push(`Guest line ${guest.name}: empty`);
      return fallback;
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

/** Seed turns for a live episode (cold open) before /next takes over. */
export function buildLiveSeedTurns(
  sessionLike: Pick<PodcastSession, "config" | "outline" | "sources">,
  coldOpenHook: string,
): ConversationTurn[] {
  const hook =
    coldOpenHook.trim() ||
    "Welcome in — we've got a sharp panel and fresh headlines to unpack.";
  const topicId = sessionLike.outline?.topics[0]?.id;
  const text =
    sanitizeHostSpokenLine(hook, hostDisplayName()) || hook;
  return [hostTurn(text, 0, topicId)];
}

export { estimateSpeechSeconds };

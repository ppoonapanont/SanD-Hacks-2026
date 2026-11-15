import { getSession, updateSession } from "@/lib/sessions";
import { isGeminiConfigured } from "@/services/gemini";
import { fetchNewsForConfig } from "@/services/news";
import type {
  ConversationTurn,
  Guest,
  NewsSource,
  PodcastSession,
  SpeakerType,
} from "@/types";
import { createId } from "@/utils/id";

import { hostDisplayName } from "./guestMap";
import {
  fallbackGuestReply,
  runGuestReplies,
} from "./guestReplies";
import { clearInterruptRecord, setInterruptRecord } from "./interruptStore";
import {
  heuristicModeratorPlan,
  runModeratorPlan,
  type ModeratorPlan,
} from "./moderatorPlan";

export interface InteractResult {
  session: PodcastSession;
  turns: ConversationTurn[];
  usedMockResearch: boolean;
  /** True when Mastra Moderator shaped the interrupt routing plan. */
  moderatorUsed: boolean;
  /** Short moderator routing summary for UI notes. */
  moderatorSummary?: string;
  /** True when Mastra Guest agents produced interrupt replies. */
  guestsUsed: boolean;
  /** Short guest-agent summary for UI notes. */
  guestsSummary?: string;
  errors: string[];
}

/** Re-export for callers that imported sanitize from this module. */
export { sanitizeHostSpokenLine } from "./hostLines";

/**
 * Multi-step interruption workflow:
 * 1) Mastra Moderator plans who answers and whether to research
 * 2) Optional Bright Data / mock news lookup
 * 3) Mastra Guest agents (+ host) generate grounded reply turns
 * 4) Session marked interrupted; episode script turns left intact
 */
export async function handlePodcastInteraction(input: {
  sessionId: string;
  message: string;
  targetGuestId?: string;
}): Promise<InteractResult> {
  const errors: string[] = [];
  const session = getSession(input.sessionId);
  if (!session) {
    throw new Error("Podcast not found");
  }

  const message = input.message.trim();
  if (!message) {
    throw new Error("message is required");
  }

  const guests = session.config.guests;
  if (!guests.length) {
    throw new Error("Session has no guests");
  }

  const targetGuestId =
    input.targetGuestId && guests.some((g) => g.id === input.targetGuestId)
      ? input.targetGuestId
      : undefined;

  const mastraPlan = await runModeratorPlan(
    session,
    message,
    targetGuestId,
    errors,
  );
  const plan =
    mastraPlan ?? heuristicModeratorPlan(session, message, targetGuestId);
  if (!mastraPlan) {
    errors.push("Using heuristic moderator plan");
  }

  const research = plan.needsResearch
    ? await runInterruptResearch(session, plan.researchQuery || message, errors)
    : { sources: [] as NewsSource[], usedMock: false };

  const { turns: replyTurns, guestsUsed, guestsSummary } = await buildReplyTurns({
    session,
    message,
    plan,
    researchSources: research.sources,
    errors,
  });

  const userTurn = toUserTurn(message);
  const allNewTurns = [userTurn, ...replyTurns];

  const mergedSources = mergeSources(session.sources, research.sources);
  const addedSourceIds = research.sources.map((s) => s.id);

  const updated =
    updateSession(input.sessionId, (current) => ({
      ...current,
      status: "interrupted",
      sources: mergedSources,
    })) ?? session;

  clearInterruptRecord(input.sessionId);
  setInterruptRecord(input.sessionId, {
    message,
    targetGuestId,
    turns: allNewTurns,
    addedSourceIds,
    createdAt: new Date().toISOString(),
  });

  return {
    session: updated,
    turns: allNewTurns,
    usedMockResearch: research.usedMock,
    moderatorUsed: Boolean(mastraPlan),
    moderatorSummary: plan.summary,
    guestsUsed,
    guestsSummary,
    errors,
  };
}

async function runInterruptResearch(
  session: PodcastSession,
  query: string,
  errors: string[],
): Promise<{ sources: NewsSource[]; usedMock: boolean }> {
  try {
    const result = await fetchNewsForConfig(
      {
        ...session.config,
        topics: [query.slice(0, 120)],
      },
      {
        resultsPerTopic: 3,
        maxEnrichArticles: 1,
      },
    );
    errors.push(...result.errors);
    return {
      sources: result.sources.slice(0, 4),
      usedMock: result.usedMock,
    };
  } catch (error) {
    errors.push(
      error instanceof Error
        ? `Interrupt research failed: ${error.message}`
        : "Interrupt research failed",
    );
    return { sources: [], usedMock: true };
  }
}

async function buildReplyTurns(input: {
  session: PodcastSession;
  message: string;
  plan: ModeratorPlan;
  researchSources: NewsSource[];
  errors: string[];
}): Promise<{
  turns: ConversationTurn[];
  guestsUsed: boolean;
  guestsSummary?: string;
}> {
  const { session, message, plan, researchSources, errors } = input;
  const guestById = new Map(session.config.guests.map((g) => [g.id, g]));
  const responders = plan.respondingGuestIds
    .map((id) => guestById.get(id))
    .filter((g): g is Guest => Boolean(g));

  const host = hostSpeaker();
  const turns: ConversationTurn[] = [
    {
      id: createId("turn"),
      speakerId: host.id,
      speakerName: host.name,
      speakerType: "host",
      text: plan.hostAck,
      voiceId: host.voiceId,
    },
  ];

  const panel =
    responders.length > 0 ? responders : session.config.guests.slice(0, 2);

  if (!isGeminiConfigured() || panel.length === 0) {
    errors.push("Using fallback guest replies");
    for (const guest of panel) {
      turns.push({
        id: createId("turn"),
        speakerId: guest.id,
        speakerName: guest.name,
        speakerType: "guest",
        text: fallbackGuestReply(guest, message),
        voiceId: guest.voiceId,
      });
    }
    turns.push({
      id: createId("turn"),
      speakerId: host.id,
      speakerName: host.name,
      speakerType: "host",
      text: "Want a follow-up, or should we head back to where we were?",
      voiceId: host.voiceId,
    });
    return { turns, guestsUsed: false, guestsSummary: "Fallback guest lines" };
  }

  const guestResult = await runGuestReplies({
    responders: panel,
    message,
    researchSources,
    errors,
  });

  for (const reply of guestResult.replies) {
    const guest = guestById.get(reply.guestId);
    if (!guest) continue;
    const sourceIds = reply.sourceIndexes
      .map((n) => researchSources[n - 1]?.id)
      .filter((id): id is string => Boolean(id));
    turns.push({
      id: createId("turn"),
      speakerId: guest.id,
      speakerName: guest.name,
      speakerType: "guest",
      text: reply.text,
      voiceId: guest.voiceId,
      ...(sourceIds.length ? { sourceIds } : {}),
    });
  }

  turns.push({
    id: createId("turn"),
    speakerId: host.id,
    speakerName: host.name,
    speakerType: "host",
    text: guestResult.closingHost,
    voiceId: host.voiceId,
  });

  return {
    turns,
    guestsUsed: guestResult.guestsUsed,
    guestsSummary: guestResult.summary,
  };
}

function toUserTurn(message: string): ConversationTurn {
  return {
    id: createId("turn"),
    speakerId: "user",
    speakerName: "You",
    speakerType: "user" as SpeakerType,
    text: message,
  };
}

function hostSpeaker(): { id: string; name: string; voiceId?: string } {
  return {
    id: "host",
    name: hostDisplayName(),
    // Experience maps host via HOST_PROFILE voice; optional here.
  };
}

function mergeSources(existing: NewsSource[], incoming: NewsSource[]): NewsSource[] {
  if (!incoming.length) return existing;
  const seen = new Set(existing.map((s) => s.url || s.id));
  const merged = [...existing];
  for (const source of incoming) {
    const key = source.url || source.id;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(source);
  }
  return merged;
}

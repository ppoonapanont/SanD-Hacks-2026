import { getSession, updateSession } from "@/lib/sessions";
import { generateJson, isGeminiConfigured } from "@/services/gemini";
import type { ConversationTurn, PodcastSession } from "@/types";
import { createId } from "@/utils/id";

import { hostDisplayName } from "./guestMap";
import { clearInterruptRecord, getInterruptRecord } from "./interruptStore";

export interface ResumeResult {
  session: PodcastSession;
  turn: ConversationTurn;
}

const BRIDGE_SCHEMA = {
  type: "object",
  properties: {
    text: {
      type: "string",
      description: "One short host line bridging back into the episode",
    },
  },
  required: ["text"],
} as const;

/**
 * Resume the original episode after an interruption.
 * Clears interrupt side-state and returns a short host bridge turn.
 */
export async function resumePodcastEpisode(sessionId: string): Promise<ResumeResult> {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error("Podcast not found");
  }

  const interrupt = getInterruptRecord(sessionId);
  const bridgeText = await buildBridgeLine(session, interrupt?.message);
  clearInterruptRecord(sessionId);

  const turn: ConversationTurn = {
    id: createId("turn"),
    speakerId: "host",
    speakerName: hostDisplayName(),
    speakerType: "host",
    text: bridgeText,
  };

  const updated =
    updateSession(sessionId, (current) => ({
      ...current,
      status: "playing",
    })) ?? { ...session, status: "playing" as const };

  return { session: updated, turn };
}

async function buildBridgeLine(
  session: PodcastSession,
  lastQuestion?: string,
): Promise<string> {
  const fallback = "Alright — let's pick the episode back up where we left off.";

  if (!isGeminiConfigured()) return fallback;

  try {
    const result = await generateJson<{ text: string }>(
      [
        "You are the podcast host. Write one short spoken sentence bridging from a user interruption back to the main episode.",
        "Do not invent news facts.",
        `Episode: ${session.outline?.title ?? "current discussion"}`,
        lastQuestion ? `User had asked: ${lastQuestion}` : "",
        "Return JSON only.",
      ].join("\n"),
      BRIDGE_SCHEMA,
      { timeoutMs: 15_000 },
    );
    const text = String(result.text ?? "").trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

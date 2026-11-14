import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { handlePodcastInteraction } from "@/services/podcast/interact";
import { resumePodcastEpisode } from "@/services/podcast/resume";

/**
 * Run the full interruption pipeline (moderator → research → guest replies).
 */
export const interactPodcastTool = createTool({
  id: "interact-podcast",
  description:
    "Handle a live user interruption for an existing podcast session. Returns new conversation turns.",
  inputSchema: z.object({
    sessionId: z.string().min(1),
    message: z.string().min(1),
    targetGuestId: z.string().optional(),
  }),
  outputSchema: z.object({
    sessionId: z.string(),
    status: z.string(),
    turnCount: z.number(),
    usedMockResearch: z.boolean(),
    errors: z.array(z.string()),
    turns: z.array(
      z.object({
        id: z.string(),
        speakerId: z.string(),
        speakerName: z.string(),
        speakerType: z.string(),
        text: z.string(),
      }),
    ),
  }),
  execute: async ({ sessionId, message, targetGuestId }) => {
    const result = await handlePodcastInteraction({
      sessionId,
      message,
      targetGuestId,
    });
    return {
      sessionId: result.session.id,
      status: result.session.status,
      turnCount: result.turns.length,
      usedMockResearch: result.usedMockResearch,
      errors: result.errors,
      turns: result.turns.map((turn) => ({
        id: turn.id,
        speakerId: turn.speakerId,
        speakerName: turn.speakerName,
        speakerType: turn.speakerType,
        text: turn.text,
      })),
    };
  },
});

/**
 * Resume the original episode after an interruption.
 */
export const resumePodcastTool = createTool({
  id: "resume-podcast",
  description: "Resume a podcast session after a user interruption.",
  inputSchema: z.object({
    sessionId: z.string().min(1),
  }),
  outputSchema: z.object({
    sessionId: z.string(),
    status: z.string(),
    bridgeText: z.string(),
  }),
  execute: async ({ sessionId }) => {
    const result = await resumePodcastEpisode(sessionId);
    return {
      sessionId: result.session.id,
      status: result.session.status,
      bridgeText: result.turn.text,
    };
  },
});

import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import { handlePodcastInteraction } from "@/services/podcast/interact";
import { resumePodcastEpisode } from "@/services/podcast/resume";

const interactInputSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  targetGuestId: z.string().optional(),
});

const interactOutputSchema = z.object({
  sessionId: z.string(),
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
});

const resumeInputSchema = z.object({
  sessionId: z.string().min(1),
});

const resumeOutputSchema = z.object({
  sessionId: z.string(),
  status: z.string(),
  bridgeText: z.string(),
});

/** Step: moderator/research/guest replies for a live interruption. */
export const interactStep = createStep({
  id: "interact",
  description: "Handle user interruption with research + guest replies",
  inputSchema: interactInputSchema,
  outputSchema: interactOutputSchema,
  execute: async ({ inputData }) => {
    const result = await handlePodcastInteraction(inputData);
    return {
      sessionId: result.session.id,
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

/** Step: bridge back into the original episode. */
export const resumeStep = createStep({
  id: "resume",
  description: "Resume original episode after interruption",
  inputSchema: resumeInputSchema,
  outputSchema: resumeOutputSchema,
  execute: async ({ inputData }) => {
    const result = await resumePodcastEpisode(inputData.sessionId);
    return {
      sessionId: result.session.id,
      status: result.session.status,
      bridgeText: result.turn.text,
    };
  },
});

/**
 * Interruption workflow — typed Mastra steps over the existing podcast services.
 * HTTP routes still call the services directly; Studio can run this workflow.
 */
export const interruptionWorkflow = createWorkflow({
  id: "user-interruption",
  description: "Live user interrupt → panel replies",
  inputSchema: interactInputSchema,
  outputSchema: interactOutputSchema,
})
  .then(interactStep)
  .commit();

export const resumeWorkflow = createWorkflow({
  id: "resume-episode",
  description: "Resume episode after interrupt",
  inputSchema: resumeInputSchema,
  outputSchema: resumeOutputSchema,
})
  .then(resumeStep)
  .commit();

/** @deprecated Prefer `interruptionWorkflow` / service imports. */
export const interruptionWorkflowMeta = {
  id: "user-interruption",
  steps: ["interact", "resume"],
  mastraPackage: true,
  note: "Registered on the Mastra instance; HTTP APIs still use services/podcast.",
} as const;

export {
  handlePodcastInteraction as runInterruptionWorkflow,
  resumePodcastEpisode as runResumeWorkflow,
};

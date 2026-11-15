import { Mastra } from "@mastra/core";

import { moderatorAgent } from "./agents/moderator-agent";
import { producerAgent } from "./agents/producer-agent";
import { researchAgent } from "./agents/research-agent";
import {
  interruptionWorkflow,
  interruptionWorkflowMeta,
  resumeWorkflow,
  runInterruptionWorkflow,
  runResumeWorkflow,
} from "./workflows/interruption";

/**
 * Mastra entry — agents + interruption workflows for Studio and server use.
 * Experience `/generate` uses Producer for the episode brief (v1+).
 * Experience `/interact` uses Moderator for interrupt routing (v1+).
 */
export const mastra = new Mastra({
  agents: {
    researchAgent,
    moderatorAgent,
    producerAgent,
  },
  workflows: {
    interruptionWorkflow,
    resumeWorkflow,
  },
});

export {
  interruptionWorkflowMeta,
  runInterruptionWorkflow,
  runResumeWorkflow,
};

export const mastraStatus = {
  configured: true,
  packageInstalled: true,
  note: "Mastra: Producer (generate brief) + Moderator (interact routing) + research; interrupt/resume workflows. Studio: npm run mastra:dev",
} as const;

import { Mastra } from "@mastra/core";

import { demoGuestAgents } from "./agents/guest-agent";
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
 * Experience `/interact` uses Moderator routing + Guest agents for replies (v1+).
 */
export const mastra = new Mastra({
  agents: {
    researchAgent,
    moderatorAgent,
    producerAgent,
    ...demoGuestAgents,
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
  note: "Mastra: Producer + Moderator + Guest agents + research; interrupt/resume workflows. Studio: npm run mastra:dev",
} as const;

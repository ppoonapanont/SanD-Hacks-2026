import { Mastra } from "@mastra/core";

import { moderatorAgent } from "./agents/moderator-agent";
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
 * Experience HTTP routes continue to call `services/podcast` directly.
 */
export const mastra = new Mastra({
  agents: {
    researchAgent,
    moderatorAgent,
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
  note: "Mastra agents + interruption/resume workflows registered. Studio: npm run mastra:dev",
} as const;

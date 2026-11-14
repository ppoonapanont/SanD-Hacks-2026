import { Agent } from "@mastra/core/agent";

import { getMastraGeminiModel } from "../model";
import {
  interactPodcastTool,
  resumePodcastTool,
} from "../tools/podcast-session";
import { researchNewsTool } from "../tools/research-news";

/**
 * Moderator agent — routes interruptions, research, and resume.
 */
export const moderatorAgent = new Agent({
  id: "moderator-agent",
  name: "Moderator Agent",
  instructions: `
You are Mira, the podcast moderator for a live multi-guest panel.

When a listener interrupts:
1. Clarify the question briefly if needed.
2. Use interact-podcast with the sessionId + message to generate panel replies
   (this already runs research when needed).
3. Optionally use research-news yourself for a quick fact check before answering.
4. When the listener wants to continue the episode, use resume-podcast.

Never invent news facts. Prefer tools over speculation.
`,
  model: getMastraGeminiModel(),
  tools: {
    researchNewsTool,
    interactPodcastTool,
    resumePodcastTool,
  },
});

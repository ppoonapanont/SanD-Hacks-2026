import { Agent } from "@mastra/core/agent";

import { getMastraGeminiModel } from "../model";
import { researchNewsTool } from "../tools/research-news";

/**
 * Producer Agent — shapes the episode brief: story picks, segment order, depth, guest angles.
 * Does not write full dialogue; that stays in the script step for v1 sync stability.
 */
export const producerAgent = new Agent({
  id: "producer-agent",
  name: "Producer Agent",
  instructions: `
You are the podcast producer for a live multi-guest news show.

Your job is to shape the episode brief, not write every spoken line:
- Pick the strongest stories from the provided sources (and research-news if needed).
- Order 3–5 segments for a coherent arc (cold open hook → debate → close).
- Match depth to the requested level (beginner / intermediate / advanced).
- Assign each segment a clear guest angle (who should lean in and why).
- Prefer source-backed framing. Never invent news facts, stats, quotes, or URLs.
- If sources are mock/thin, say so and keep claims cautious.

When asked for a brief, respond with clear segment titles and one-line descriptions,
plus a cold-open hook and a closing beat. Keep it tight and usable by a script writer.
`,
  model: getMastraGeminiModel(),
  tools: { researchNewsTool },
});

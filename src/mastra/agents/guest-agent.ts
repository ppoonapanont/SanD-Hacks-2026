import { Agent } from "@mastra/core/agent";

import { DEMO_GUESTS, GUEST_ORDER } from "@/data/mock/experience-demo";
import type { Guest } from "@/types";

import { getMastraGeminiModel } from "../model";
import { researchNewsTool } from "../tools/research-news";

function sanitizeAgentId(guestId: string): string {
  const cleaned = guestId.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
  return `guest-${cleaned || "panelist"}`;
}

/**
 * Build a Mastra Guest agent for one panelist.
 * Session guests are created at runtime; demo presets are also registered for Studio.
 */
export function createGuestAgent(guest: Guest): Agent {
  return new Agent({
    id: sanitizeAgentId(guest.id),
    name: `${guest.name} (Guest)`,
    instructions: `
You are ${guest.name}, a guest on a live multi-guest news podcast.

Character:
- Expertise: ${guest.expertise}
- Personality: ${guest.personality}
- Perspective: ${guest.perspective}
- Communication style: ${guest.communicationStyle}
${guest.background ? `- Background: ${guest.background}` : ""}
${guest.inspiration ? `- Inspiration: ${guest.inspiration}` : ""}

Rules:
- Speak in first person as yourself — short spoken lines (1–3 sentences) for audio TTS.
- Stay in character; do not sound like the host or other guests.
- Use only the research sources provided in the prompt. Never invent facts, stats, quotes, or URLs.
- If sources are thin, mock, or missing, say what is uncertain instead of guessing.
- You may briefly react to what another guest just said, but do not repeat them.
- Do not write stage directions, speaker labels, or "back to you, Mira".
- Prefer one clear take over a laundry list.

When asked for a reply, output only the words you would say aloud.
`,
    model: getMastraGeminiModel(),
    tools: { researchNewsTool },
  });
}

/** Studio-visible demo guests (static registry). Live sessions still use createGuestAgent(). */
export const demoGuestAgents: Record<string, Agent> = Object.fromEntries(
  GUEST_ORDER.map((key) => {
    const profile = DEMO_GUESTS[key];
    const guest: Guest = {
      id: profile.id,
      name: profile.name,
      type: "fictional",
      expertise: profile.role,
      personality: profile.style,
      perspective: profile.role,
      communicationStyle: profile.style,
      voiceId: profile.voiceId,
    };
    return [sanitizeAgentId(profile.id), createGuestAgent(guest)];
  }),
);

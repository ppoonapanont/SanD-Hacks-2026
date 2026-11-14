import type { Guest } from "@/types";

/**
 * Starter guest catalog for configuration UI (Developer 2).
 * voiceId values are placeholders — replace with real ElevenLabs voice IDs.
 */
export const MOCK_GUESTS: Guest[] = [
  {
    id: "guest-tech-entrepreneur",
    name: "Ava Chen",
    type: "fictional",
    expertise: "Technology entrepreneurship and product strategy",
    personality: "Optimistic, direct, and product-obsessed",
    perspective: "Focuses on user value, shipping speed, and market timing",
    communicationStyle: "Concise analogies and concrete product examples",
    background: "Former startup founder and operator",
    voiceId: "PLACEHOLDER_VOICE_AVA",
    avatarUrl: "/guests/ava-chen.svg",
  },
  {
    id: "guest-economist",
    name: "Marcus Hale",
    type: "fictional",
    expertise: "Macroeconomics and market structure",
    personality: "Measured, skeptical, and precise",
    perspective: "Emphasizes incentives, trade-offs, and second-order effects",
    communicationStyle: "Data-aware explanations with careful caveats",
    background: "Policy researcher and economics commentator",
    voiceId: "PLACEHOLDER_VOICE_MARCUS",
    avatarUrl: "/guests/marcus-hale.svg",
  },
  {
    id: "guest-journalist",
    name: "Sofia Reyes",
    type: "fictional",
    expertise: "Investigative journalism and media literacy",
    personality: "Curious, fair-minded, and probing",
    perspective: "Prioritizes source quality and competing narratives",
    communicationStyle: "Asks clarifying questions and surfaces uncertainty",
    background: "Newsroom editor covering technology and politics",
    voiceId: "PLACEHOLDER_VOICE_SOFIA",
    avatarUrl: "/guests/sofia-reyes.svg",
  },
];

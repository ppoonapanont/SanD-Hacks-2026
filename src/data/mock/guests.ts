import type { Guest } from "@/types";

import { DEMO_GUESTS, GUEST_ORDER } from "./experience-demo";

/**
 * Starter guest catalog for configuration UI (Developer 2).
 * Mirrors the Experience preset panelists.
 */
export const MOCK_GUESTS: Guest[] = GUEST_ORDER.map((id) => {
  const profile = DEMO_GUESTS[id];
  return {
    id: profile.id,
    name: profile.name,
    type: "fictional",
    expertise: profile.role,
    personality: profile.style,
    perspective: profile.style,
    communicationStyle: profile.style,
    voiceId: profile.voiceId,
  };
});

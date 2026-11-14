/**
 * ElevenLabs stock voices for custom panelists.
 * These 10 options are intentionally disjoint from Mira + the six preset guests.
 */

import { DEMO_GUESTS, HOST_PROFILE } from "./experience-demo";

export interface GuestVoiceOption {
  id: string;
  label: string;
  hint: string;
}

/** Voices reserved by Mira + the six preset panelists — never offered for custom guests. */
export const PRESET_VOICE_IDS: ReadonlySet<string> = new Set([
  HOST_PROFILE.voiceId,
  ...Object.values(DEMO_GUESTS).map((guest) => guest.voiceId),
]);

/**
 * Exactly 10 custom-guest voices, none shared with presets.
 * (Rachel, Lily, Daniel, Adam, Matilda, Callum, Antoni, Elli, Josh, Arnold)
 */
export const GUEST_VOICE_OPTIONS: GuestVoiceOption[] = [
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel", hint: "Calm, clear" },
  { id: "pFZP5JQG7iQjIQuC4Bku", label: "Lily", hint: "Warm, British" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel", hint: "Steady, authoritative" },
  { id: "pNInz6obpgDQGcFmaJgB", label: "Adam", hint: "Deep, narrative" },
  { id: "XrExE9yKIg1WjnnlVkGX", label: "Matilda", hint: "Bright, expressive" },
  { id: "N2lVS1w4EtoT3dr4eOWO", label: "Callum", hint: "Husky, intimate" },
  { id: "ErXwobaYiN019PkySvjV", label: "Antoni", hint: "Well-rounded, warm" },
  { id: "MF3mGyEYCl7XYWbV9V6O", label: "Elli", hint: "Emotional, young" },
  { id: "TxGEqnHWrfWFTfGW9XjX", label: "Josh", hint: "Deep, young" },
  { id: "VR6AewLTigWG4xSOukaG", label: "Arnold", hint: "Crisp, middle-aged" },
];

if (GUEST_VOICE_OPTIONS.length !== 10) {
  throw new Error("Custom guest voice picker must offer exactly 10 voices");
}

for (const voice of GUEST_VOICE_OPTIONS) {
  if (PRESET_VOICE_IDS.has(voice.id)) {
    throw new Error(
      `Custom voice "${voice.label}" (${voice.id}) collides with a preset guest voice`,
    );
  }
}

const uniqueIds = new Set(GUEST_VOICE_OPTIONS.map((voice) => voice.id));
if (uniqueIds.size !== GUEST_VOICE_OPTIONS.length) {
  throw new Error("Custom guest voices must all be unique");
}

export const DEFAULT_CUSTOM_VOICE_ID = GUEST_VOICE_OPTIONS[0].id;

/** Prefer a custom voice not already taken by another custom guest on the panel. */
export function pickUnusedVoiceId(usedVoiceIds: Iterable<string> = []): string {
  const taken = new Set(usedVoiceIds);
  const unused = GUEST_VOICE_OPTIONS.find((voice) => !taken.has(voice.id));
  return unused?.id ?? DEFAULT_CUSTOM_VOICE_ID;
}

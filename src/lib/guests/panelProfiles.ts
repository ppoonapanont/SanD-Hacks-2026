import type { AvatarKey } from "@/components/guests/avatarCharacters";
import {
  DEMO_GUESTS,
  HOST_PROFILE,
  type DemoGuestProfile,
  type GuestKey,
} from "@/data/mock/experience-demo";
import { DEFAULT_CUSTOM_VOICE_ID, pickUnusedVoiceId } from "@/data/mock/guestVoices";
import type { Guest, GuestType } from "@/types";
import { createId } from "@/utils/id";

/** Panelist profile used by the Experience UI (demo presets + freeform customs). */
export interface PanelGuestProfile {
  id: string;
  name: string;
  short: string;
  role: string;
  style: string;
  color: string;
  radius: string;
  initials: string;
  avatarKey: AvatarKey;
  voiceId: string;
  /** Extra fields mapped into the PodcastConfig Guest contract. */
  personality: string;
  perspective: string;
  communicationStyle: string;
  type: GuestType;
  inspiration?: string;
  background?: string;
  isCustom: boolean;
}

export type HostOrGuestProfile = PanelGuestProfile | typeof HOST_PROFILE;

export const CUSTOM_AVATAR_OPTIONS: {
  key: Exclude<AvatarKey, "host" | "you">;
  label: string;
  color: string;
  radius: string;
}[] = [
  { key: "founder", label: "Cube", color: "#8fcaa8", radius: "16px" },
  { key: "economist", label: "Cylinder", color: "#e3b98a", radius: "50% 50% 50% 12px" },
  { key: "historian", label: "Diamond", color: "#e29fb0", radius: "12px 50% 12px 50%" },
  { key: "politician", label: "Cone", color: "#b6a6e6", radius: "50% 50% 12px 12px" },
  { key: "investor", label: "Capsule", color: "#e8d27a", radius: "6px" },
  { key: "diplomat", label: "Trapezoid", color: "#97acc8", radius: "18px 18px 6px 18px" },
];

export function isDemoGuestKey(id: string): id is GuestKey {
  return Object.prototype.hasOwnProperty.call(DEMO_GUESTS, id);
}

function demoToPanel(profile: DemoGuestProfile): PanelGuestProfile {
  return {
    id: profile.id,
    name: profile.name,
    short: profile.short,
    role: profile.role,
    style: profile.style,
    color: profile.color,
    radius: profile.radius,
    initials: profile.initials,
    avatarKey: profile.avatarKey,
    voiceId: profile.voiceId,
    personality: profile.style,
    perspective: profile.role,
    communicationStyle: profile.style,
    type: "fictional",
    isCustom: false,
  };
}

export function resolvePanelProfile(
  id: string,
  customGuests: Record<string, PanelGuestProfile>,
): HostOrGuestProfile {
  if (id === "host") return HOST_PROFILE;
  if (isDemoGuestKey(id)) return demoToPanel(DEMO_GUESTS[id]);
  return customGuests[id] ?? demoToPanel(DEMO_GUESTS.economist);
}

export function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "CG";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

const NAME_TITLES = new Set([
  "dr",
  "dr.",
  "prof",
  "prof.",
  "mr",
  "mr.",
  "mrs",
  "mrs.",
  "ms",
  "ms.",
  "mx",
  "mx.",
]);

export function shortNameFromFull(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstMeaningful =
    parts.find((part) => !NAME_TITLES.has(part.toLowerCase())) ?? parts[0];
  return firstMeaningful || "Guest";
}

export interface CustomGuestInput {
  name: string;
  expertise: string;
  personality: string;
  perspective?: string;
  communicationStyle?: string;
  voiceId: string;
  avatarKey: Exclude<AvatarKey, "host" | "you">;
  type?: GuestType;
  inspiration?: string;
  background?: string;
}

export function buildCustomGuestProfile(input: CustomGuestInput): PanelGuestProfile {
  const avatar =
    CUSTOM_AVATAR_OPTIONS.find((option) => option.key === input.avatarKey) ??
    CUSTOM_AVATAR_OPTIONS[0];
  const name = input.name.trim();
  const expertise = input.expertise.trim();
  const personality = input.personality.trim();
  const perspective = (input.perspective ?? expertise).trim();
  const communicationStyle = (input.communicationStyle ?? personality).trim();

  return {
    id: createId("guest"),
    name,
    short: shortNameFromFull(name),
    role: expertise,
    style: personality,
    color: avatar.color,
    radius: avatar.radius,
    initials: initialsFromName(name),
    avatarKey: avatar.key,
    voiceId: input.voiceId || DEFAULT_CUSTOM_VOICE_ID,
    personality,
    perspective,
    communicationStyle,
    type: input.type ?? "fictional",
    inspiration: input.inspiration?.trim() || undefined,
    background: input.background?.trim() || undefined,
    isCustom: true,
  };
}

export function panelProfileToGuest(profile: PanelGuestProfile): Guest {
  return {
    id: profile.id,
    name: profile.name,
    type: profile.type,
    expertise: profile.role,
    personality: profile.personality,
    perspective: profile.perspective,
    communicationStyle: profile.communicationStyle,
    background: profile.background,
    inspiration: profile.inspiration,
    voiceId: profile.voiceId,
  };
}

export function emptyCustomGuestDraft(
  usedVoiceIds: Iterable<string> = [],
): CustomGuestInput {
  return {
    name: "",
    expertise: "",
    personality: "",
    perspective: "",
    communicationStyle: "",
    voiceId: pickUnusedVoiceId(usedVoiceIds),
    avatarKey: "founder",
    type: "fictional",
    inspiration: "",
    background: "",
  };
}

export const EMPTY_CUSTOM_GUEST_DRAFT: CustomGuestInput = emptyCustomGuestDraft();

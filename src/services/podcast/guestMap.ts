import {
  DEMO_TOPICS,
  HOST_PROFILE,
  type GuestKey,
} from "@/data/mock/experience-demo";
import {
  panelProfileToGuest,
  resolvePanelProfile,
  type PanelGuestProfile,
} from "@/lib/guests/panelProfiles";
import type { DiscussionDepth, Guest, PodcastConfig } from "@/types";

const DEPTH_MAP: Record<string, DiscussionDepth> = {
  Headlines: "beginner",
  Balanced: "intermediate",
  "Deep dive": "advanced",
};

export function mapDepthLabel(label: string): DiscussionDepth {
  return DEPTH_MAP[label] ?? "intermediate";
}

export function mapTopicIdsToLabels(topicIds: string[]): string[] {
  return topicIds.map((id) => {
    const match = DEMO_TOPICS.find((topic) => topic.id === id);
    return match?.label ?? id;
  });
}

export function mapGuestKeyToGuest(key: GuestKey): Guest {
  return panelProfileToGuest(resolvePanelProfile(key, {}) as PanelGuestProfile);
}

export function buildPodcastConfig(input: {
  topics: string[];
  region: string;
  language: string;
  durationMinutes: number;
  depthLabel: string;
  guestIds: string[];
  customGuests: Record<string, PanelGuestProfile>;
}): PodcastConfig {
  const guests = input.guestIds.map((id) =>
    panelProfileToGuest(resolvePanelProfile(id, input.customGuests) as PanelGuestProfile),
  );
  return {
    topics: mapTopicIdsToLabels(input.topics),
    region: input.region,
    language: input.language,
    durationMinutes: input.durationMinutes,
    depth: mapDepthLabel(input.depthLabel),
    guests: guests.length ? guests : [mapGuestKeyToGuest("economist")],
  };
}

export function hostDisplayName(): string {
  return HOST_PROFILE.name;
}

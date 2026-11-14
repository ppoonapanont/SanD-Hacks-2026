import {
  DEMO_GUESTS,
  DEMO_TOPICS,
  HOST_PROFILE,
  type GuestKey,
} from "@/data/mock/experience-demo";
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
  const profile = DEMO_GUESTS[key];
  return {
    id: key,
    name: profile.name,
    type: "fictional",
    expertise: profile.role,
    personality: profile.style,
    perspective: profile.role,
    communicationStyle: profile.style,
    voiceId: profile.voiceId,
  };
}

export function buildPodcastConfig(input: {
  topics: string[];
  region: string;
  language: string;
  durationMinutes: number;
  depthLabel: string;
  guestKeys: GuestKey[];
}): PodcastConfig {
  const guests = input.guestKeys.map(mapGuestKeyToGuest);
  return {
    topics: mapTopicIdsToLabels(input.topics),
    region: input.region,
    language: input.language,
    durationMinutes: input.durationMinutes,
    depth: mapDepthLabel(input.depthLabel),
    guests: guests.length ? guests : [mapGuestKeyToGuest("ada")],
  };
}

export function hostDisplayName(): string {
  return HOST_PROFILE.name;
}

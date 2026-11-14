/**
 * Shared podcast domain types.
 * Contract between Developer 1 (AI/backend) and Developer 2 (frontend/audio).
 * Extend carefully — keep frontend and API routes compatible.
 */

export type DiscussionDepth = "beginner" | "intermediate" | "advanced";

export type GuestType = "fictional" | "inspired" | "authorized";

export type SpeakerType = "host" | "guest" | "user";

export type PodcastSessionStatus =
  | "generating"
  | "ready"
  | "playing"
  | "paused"
  | "interrupted"
  | "completed"
  | "error";

export interface Guest {
  id: string;
  name: string;
  type: GuestType;
  expertise: string;
  personality: string;
  perspective: string;
  communicationStyle: string;
  background?: string;
  inspiration?: string;
  voiceId: string;
  avatarUrl?: string;
}

export interface PodcastConfig {
  topics: string[];
  region: string;
  language: string;
  durationMinutes: number;
  depth: DiscussionDepth;
  guests: Guest[];
}

export interface NewsSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;
  summary: string;
  keyClaims?: string[];
  /** True when the source came from mock/fallback data, not live retrieval. */
  isMock?: boolean;
}

export interface EpisodeTopic {
  id: string;
  title: string;
  description: string;
  estimatedDurationMinutes: number;
  sourceIds: string[];
}

export interface EpisodeOutline {
  title: string;
  description: string;
  topics: EpisodeTopic[];
  estimatedDurationMinutes: number;
}

export interface ConversationTurn {
  id: string;
  speakerId: string;
  speakerName: string;
  speakerType: SpeakerType;
  text: string;
  voiceId?: string;
  sourceIds?: string[];
  audioUrl?: string;
  timestamp?: number;
  topicId?: string;
}

export interface PodcastSession {
  id: string;
  config: PodcastConfig;
  outline?: EpisodeOutline;
  turns: ConversationTurn[];
  sources: NewsSource[];
  currentTopicId?: string;
  status: PodcastSessionStatus;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

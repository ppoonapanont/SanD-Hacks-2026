/**
 * Shared API request/response contracts for podcast and audio routes.
 */

import type {
  ConversationTurn,
  Guest,
  PodcastConfig,
  PodcastSession,
} from "./podcast";

/** POST /api/podcast/generate */
export interface GeneratePodcastRequest {
  config: PodcastConfig;
}

export interface GeneratePodcastResponse {
  session: PodcastSession;
  usedMockNews?: boolean;
  errors?: string[];
}

/** POST /api/podcast/next */
export interface NextTurnRequest {
  sessionId: string;
}

export interface NextTurnResponse {
  session: PodcastSession;
  turn: ConversationTurn;
}

/** POST /api/podcast/interact */
export interface InteractRequest {
  sessionId: string;
  message: string;
  /** Optional: address a specific guest */
  targetGuestId?: string;
}

export interface InteractResponse {
  session: PodcastSession;
  turns: ConversationTurn[];
}

/** POST /api/podcast/resume */
export interface ResumeRequest {
  sessionId: string;
}

export interface ResumeResponse {
  session: PodcastSession;
  turn: ConversationTurn;
}

/** GET /api/podcast/:id */
export interface GetPodcastResponse {
  session: PodcastSession;
}

/** GET /api/podcast/history */
export interface PodcastHistoryResponse {
  sessions: PodcastSession[];
}

/** POST /api/audio/generate — Developer 2 */
export interface GenerateAudioRequest {
  text: string;
  voiceId: string;
  turnId?: string;
}

export interface GenerateAudioResponse {
  audioUrl: string;
  turnId?: string;
}

/** POST /api/audio/transcribe — Developer 2 */
export interface TranscribeAudioResponse {
  text: string;
}

/** Shared API error shape */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/** Guest catalog helpers for configuration UI */
export interface GuestCatalogResponse {
  guests: Guest[];
}

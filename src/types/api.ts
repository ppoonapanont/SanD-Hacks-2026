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
  /** When true, seed the episode and generate further lines via POST /next. */
  live?: boolean;
}

export interface GeneratePodcastResponse {
  session: PodcastSession;
  usedMockNews?: boolean;
  errors?: string[];
  /** True when the Mastra Producer shaped the episode brief before scripting. */
  producerUsed?: boolean;
  /** Short producer arc summary for UI notes. */
  producerSummary?: string;
  /** True when this session expects live POST /next turn generation. */
  live?: boolean;
}

/** POST /api/podcast/next */
export interface NextTurnRequest {
  sessionId: string;
}

export interface NextTurnResponse {
  session: PodcastSession;
  turn: ConversationTurn;
  /** True when the turn was freshly generated (live mode). */
  generated?: boolean;
  /** True when the episode should end after this turn. */
  done?: boolean;
  /** Soft failures (e.g. Gemini quota → heuristic fallback line). */
  errors?: string[];
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
  /** True when interrupt research fell back to mock news. */
  usedMockResearch?: boolean;
  /** True when Mastra Moderator shaped the interrupt routing plan. */
  moderatorUsed?: boolean;
  /** Short moderator routing summary for UI notes. */
  moderatorSummary?: string;
  /** True when Mastra Guest agents produced interrupt replies. */
  guestsUsed?: boolean;
  /** Short guest-agent summary for UI notes. */
  guestsSummary?: string;
  errors?: string[];
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

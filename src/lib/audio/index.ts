/**
 * Audio helpers — Developer 2.
 * Queue management, playback utilities, and client-side audio helpers live here.
 */

export type PlaybackSpeed = 0.75 | 1 | 1.25 | 1.5 | 2;

export interface AudioQueueItem {
  turnId: string;
  audioUrl: string;
  speakerId: string;
  speakerName: string;
}

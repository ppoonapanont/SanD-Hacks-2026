"use client";

import { useCallback, useRef } from "react";

import { generateAudio } from "@/lib/api/client";
import type { AudioQueueItem } from "@/lib/audio";

import { useAudioQueue } from "./useAudioQueue";

export interface SpeakableLine {
  turnId: string;
  text: string;
  voiceId: string;
  speakerId: string;
  speakerName: string;
}

/**
 * Generates ElevenLabs audio for a conversation turn (via POST /api/audio/generate)
 * and queues it for playback. Turns are cached by turnId so re-speaking the same
 * line (e.g. a repeated interruption) replays instantly instead of re-generating.
 *
 * Generation failures (no API key configured, request error) are swallowed —
 * the transcript keeps advancing silently rather than breaking the demo.
 */
export function useTurnAudio() {
  const audioQueue = useAudioQueue();
  const cacheRef = useRef<Map<string, string>>(new Map());
  const pendingRef = useRef<Set<string>>(new Set());

  const speak = useCallback(
    // `shouldPlay` is read when the (possibly async) audio is actually ready, not when `speak`
    // was called — otherwise a generation request that resolves after the user hits pause would
    // force playback back on.
    (line: SpeakableLine, shouldPlay: () => boolean) => {
      const cached = cacheRef.current.get(line.turnId);
      if (cached) {
        audioQueue.enqueue({
          turnId: line.turnId,
          audioUrl: cached,
          speakerId: line.speakerId,
          speakerName: line.speakerName,
        });
        if (shouldPlay()) audioQueue.play();
        return;
      }
      if (pendingRef.current.has(line.turnId)) return;
      pendingRef.current.add(line.turnId);

      void generateAudio({ text: line.text, voiceId: line.voiceId, turnId: line.turnId })
        .then((response) => {
          cacheRef.current.set(line.turnId, response.audioUrl);
          const item: AudioQueueItem = {
            turnId: line.turnId,
            audioUrl: response.audioUrl,
            speakerId: line.speakerId,
            speakerName: line.speakerName,
          };
          audioQueue.enqueue(item);
          if (shouldPlay()) audioQueue.play();
        })
        .catch((error: unknown) => {
          console.warn(`[useTurnAudio] audio generation skipped for "${line.turnId}":`, error);
        })
        .finally(() => {
          pendingRef.current.delete(line.turnId);
        });
    },
    [audioQueue],
  );

  const clear = useCallback(() => {
    audioQueue.clear();
    cacheRef.current.clear();
    pendingRef.current.clear();
  }, [audioQueue]);

  return { ...audioQueue, speak, clear };
}

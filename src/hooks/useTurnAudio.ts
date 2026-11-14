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
 * and plays it exclusively so the audible clip always matches the active transcript line.
 *
 * Late TTS responses for a previous line are dropped (generation token).
 * Prefetch only warms the cache — it never starts playback.
 */
export function useTurnAudio() {
  const audioQueue = useAudioQueue();
  const cacheRef = useRef<Map<string, string>>(new Map());
  const pendingRef = useRef<Set<string>>(new Set());
  const onSpeakFailedRef = useRef<((turnId: string) => void) | null>(null);
  /** Only the latest speak() call may start playback. */
  const speakGenerationRef = useRef(0);
  const desiredTurnRef = useRef<string | null>(null);

  const generateAndCache = useCallback(async (line: SpeakableLine): Promise<string | null> => {
    const cached = cacheRef.current.get(line.turnId);
    if (cached) return cached;
    if (!line.voiceId?.trim() || !line.text?.trim()) return null;

    if (pendingRef.current.has(line.turnId)) {
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 250));
        const ready = cacheRef.current.get(line.turnId);
        if (ready) return ready;
        if (!pendingRef.current.has(line.turnId)) break;
      }
      return cacheRef.current.get(line.turnId) ?? null;
    }

    pendingRef.current.add(line.turnId);
    try {
      const response = await generateAudio({
        text: line.text,
        voiceId: line.voiceId,
        turnId: line.turnId,
      });
      cacheRef.current.set(line.turnId, response.audioUrl);
      return response.audioUrl;
    } catch (error: unknown) {
      console.warn(`[useTurnAudio] audio generation skipped for "${line.turnId}":`, error);
      return null;
    } finally {
      pendingRef.current.delete(line.turnId);
    }
  }, []);

  const speak = useCallback(
    // `shouldPlay` is read when the (possibly async) audio is actually ready, not when `speak`
    // was called — otherwise a generation request that resolves after the user hits pause would
    // force playback back on.
    (line: SpeakableLine, shouldPlay: () => boolean) => {
      const generation = ++speakGenerationRef.current;
      desiredTurnRef.current = line.turnId;

      void generateAndCache(line).then((audioUrl) => {
        // A newer speak() won, or the UI moved on — drop this result.
        if (generation !== speakGenerationRef.current) return;
        if (desiredTurnRef.current !== line.turnId) return;

        if (!audioUrl) {
          if (shouldPlay()) onSpeakFailedRef.current?.(line.turnId);
          return;
        }

        const item: AudioQueueItem = {
          turnId: line.turnId,
          audioUrl,
          speakerId: line.speakerId,
          speakerName: line.speakerName,
        };
        // Load it as the current clip either way (so a later resume finds it via
        // `turnAudio.current`), but don't let it become audible if we were paused
        // by the time it finished generating.
        audioQueue.playExclusive(item);
        if (!shouldPlay()) audioQueue.pause();
      });
    },
    [audioQueue, generateAndCache],
  );

  /** Warm the cache for upcoming lines without starting playback. */
  const prefetch = useCallback(
    (line: SpeakableLine) => {
      void generateAndCache(line);
    },
    [generateAndCache],
  );

  const clear = useCallback(() => {
    speakGenerationRef.current += 1;
    desiredTurnRef.current = null;
    audioQueue.clear();
    cacheRef.current.clear();
    pendingRef.current.clear();
  }, [audioQueue]);

  const setOnSpeakFailed = useCallback((cb: ((turnId: string) => void) | null) => {
    onSpeakFailedRef.current = cb;
  }, []);

  const setOnClipEnded = useCallback((cb: ((turnId: string) => void) | null) => {
    if (!cb) {
      audioQueue.setOnClipEnded(null);
      return;
    }
    audioQueue.setOnClipEnded((turnId) => {
      // Only the line we intentionally started may advance the transcript.
      if (desiredTurnRef.current !== turnId) return;
      cb(turnId);
    });
  }, [audioQueue]);

  return {
    ...audioQueue,
    speak,
    prefetch,
    clear,
    setOnSpeakFailed,
    setOnClipEnded,
  };
}

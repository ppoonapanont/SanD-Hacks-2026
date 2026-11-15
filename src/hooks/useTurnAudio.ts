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

function cacheKey(line: SpeakableLine): string {
  // Include text + voice so a reused turnId never plays the wrong words.
  return `${line.turnId}::${line.voiceId}::${line.text}`;
}

/**
 * Generates ElevenLabs audio for a conversation turn (via POST /api/audio/generate)
 * and plays it exclusively so the audible clip always matches the active transcript line.
 *
 * Prefer `preload` before playback so TTS finishes before the episode starts.
 * Prefetch only warms the cache — it never starts playback.
 */
export function useTurnAudio() {
  const audioQueue = useAudioQueue();
  const cacheRef = useRef<Map<string, string>>(new Map());
  const pendingRef = useRef<Map<string, Promise<string | null>>>(new Map());
  const onSpeakFailedRef = useRef<((turnId: string) => void) | null>(null);
  /** Only the latest speak() call may start playback. */
  const speakGenerationRef = useRef(0);
  const desiredTurnRef = useRef<string | null>(null);

  const generateAndCache = useCallback(async (line: SpeakableLine): Promise<string | null> => {
    const key = cacheKey(line);
    const cached = cacheRef.current.get(key);
    if (cached) return cached;
    if (!line.voiceId?.trim() || !line.text?.trim()) return null;

    const inflight = pendingRef.current.get(key);
    if (inflight) return inflight;

    const promise = (async () => {
      try {
        const response = await generateAudio({
          text: line.text,
          voiceId: line.voiceId,
          turnId: line.turnId,
        });
        cacheRef.current.set(key, response.audioUrl);
        return response.audioUrl;
      } catch (error: unknown) {
        console.warn(`[useTurnAudio] audio generation skipped for "${line.turnId}":`, error);
        return null;
      } finally {
        pendingRef.current.delete(key);
      }
    })();

    pendingRef.current.set(key, promise);
    return promise;
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

  /**
   * Block until every line has TTS (or has failed). Call this during the
   * generating phase so playback never waits mid-episode for ElevenLabs.
   */
  const preload = useCallback(
    async (
      lines: SpeakableLine[],
      options?: { concurrency?: number; onProgress?: (done: number, total: number) => void },
    ): Promise<{ ready: number; failed: number }> => {
      const concurrency = Math.max(1, options?.concurrency ?? 3);
      let done = 0;
      let ready = 0;
      let failed = 0;
      const total = lines.length;
      const queue = [...lines];

      const worker = async () => {
        while (queue.length) {
          const line = queue.shift();
          if (!line) break;
          const url = await generateAndCache(line);
          if (url) ready += 1;
          else failed += 1;
          done += 1;
          options?.onProgress?.(done, total);
        }
      };

      await Promise.all(Array.from({ length: Math.min(concurrency, total || 1) }, () => worker()));
      return { ready, failed };
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
    // Always forward clip-end. Experience advance*PastTurn is a no-op when the
    // turnId doesn't match the active line — the old desiredTurn guard could
    // drop a real `ended` and freeze interrupt playback on "X is responding…".
    audioQueue.setOnClipEnded(cb);
  }, [audioQueue]);

  const setOnTimeUpdate = useCallback(
    (cb: ((info: { turnId: string; currentTime: number; duration: number }) => void) | null) => {
      audioQueue.setOnTimeUpdate(cb);
    },
    [audioQueue],
  );

  return {
    ...audioQueue,
    speak,
    prefetch,
    preload,
    clear,
    setOnSpeakFailed,
    setOnClipEnded,
    setOnTimeUpdate,
  };
}

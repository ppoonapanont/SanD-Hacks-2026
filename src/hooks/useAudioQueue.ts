"use client";

import { useCallback, useState } from "react";

import type { AudioQueueItem } from "@/lib/audio";

/**
 * Audio queue scaffold — Developer 2.
 * Extend with ElevenLabs generation + playback controls.
 */
export function useAudioQueue() {
  const [queue, setQueue] = useState<AudioQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const enqueue = useCallback((item: AudioQueueItem) => {
    setQueue((prev) => [...prev, item]);
  }, []);

  const clear = useCallback(() => {
    setQueue([]);
    setCurrentIndex(0);
  }, []);

  const skipForward = useCallback(() => {
    setCurrentIndex((index) => Math.min(index + 1, Math.max(queue.length - 1, 0)));
  }, [queue.length]);

  const skipBackward = useCallback(() => {
    setCurrentIndex((index) => Math.max(index - 1, 0));
  }, []);

  return {
    queue,
    currentIndex,
    current: queue[currentIndex] ?? null,
    enqueue,
    clear,
    skipForward,
    skipBackward,
    setCurrentIndex,
  };
}

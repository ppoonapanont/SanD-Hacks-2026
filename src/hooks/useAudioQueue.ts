"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AudioQueueItem } from "@/lib/audio";

/**
 * Plays a queue of generated turn audio through one shared <audio> element.
 * Items are appended as they're generated; playback advances to the next
 * item automatically when the current clip finishes.
 */
export function useAudioQueue() {
  const [queue, setQueue] = useState<AudioQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create the shared element once, after mount (never during render).
  useEffect(() => {
    const el = new Audio();
    audioRef.current = el;
    return () => {
      el.pause();
      audioRef.current = null;
    };
  }, []);

  const current = queue[currentIndex] ?? null;

  const enqueue = useCallback((item: AudioQueueItem) => {
    setQueue((prev) => [...prev, item]);
  }, []);

  const clear = useCallback(() => {
    audioRef.current?.pause();
    setQueue([]);
    setCurrentIndex(0);
    setPlaying(false);
  }, []);

  const skipForward = useCallback(() => {
    setCurrentIndex((index) => Math.min(index + 1, Math.max(queue.length - 1, 0)));
  }, [queue.length]);

  const skipBackward = useCallback(() => {
    setCurrentIndex((index) => Math.max(index - 1, 0));
  }, []);

  // Swap the audio source whenever the current item changes.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (el.src !== current.audioUrl) {
      el.src = current.audioUrl;
    }
    if (playing) {
      void el.play().catch(() => {
        // Autoplay can be blocked until the user interacts with the page; ignore.
      });
    }
  }, [current, playing]);

  // Mirror the playing flag onto the element (covers pause/resume with no item change).
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) void el.play().catch(() => {});
    else el.pause();
  }, [playing]);

  // Auto-advance once a clip finishes.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const handleEnded = () => skipForward();
    el.addEventListener("ended", handleEnded);
    return () => el.removeEventListener("ended", handleEnded);
  }, [skipForward]);

  return {
    queue,
    currentIndex,
    current,
    playing,
    play: useCallback(() => setPlaying(true), []),
    pause: useCallback(() => setPlaying(false), []),
    enqueue,
    clear,
    skipForward,
    skipBackward,
    setCurrentIndex,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AudioQueueItem } from "@/lib/audio";

/**
 * Plays turn audio through one shared <audio> element.
 *
 * Prefer `playExclusive` for transcript-synced playback: it replaces whatever
 * is currently queued/playing so the audible clip always matches the active UI line.
 */
export function useAudioQueue() {
  const [queue, setQueue] = useState<AudioQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<AudioQueueItem[]>([]);
  const currentIndexRef = useRef(0);
  const onClipEndedRef = useRef<((turnId: string) => void) | null>(null);
  const onTimeUpdateRef = useRef<((info: { turnId: string; currentTime: number; duration: number }) => void) | null>(null);
  /** When true, ignore `ended` (programmatic pause/src swap must not advance the transcript). */
  const ignoreEndedRef = useRef(false);
  /**
   * After a clip finishes naturally, block play()/effect resume from restarting
   * it from t=0 until a new playExclusive() loads the next line.
   */
  const clipExhaustedRef = useRef(false);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

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
    setQueue((prev) => {
      const next = [...prev, item];
      queueRef.current = next;
      return next;
    });
  }, []);

  /** Replace the queue with a single clip and start it. Use for line-synced TTS. */
  const playExclusive = useCallback((item: AudioQueueItem) => {
    ignoreEndedRef.current = true;
    clipExhaustedRef.current = false;
    const el = audioRef.current;
    if (el) el.pause();

    queueRef.current = [item];
    currentIndexRef.current = 0;
    setQueue([item]);
    setCurrentIndex(0);
    setPlaying(true);

    // Src swap happens in the effect below; keep ignoring ended until after that.
    queueMicrotask(() => {
      ignoreEndedRef.current = false;
    });
  }, []);

  const clear = useCallback(() => {
    ignoreEndedRef.current = true;
    clipExhaustedRef.current = false;
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
    queueRef.current = [];
    currentIndexRef.current = 0;
    setQueue([]);
    setCurrentIndex(0);
    setPlaying(false);
    queueMicrotask(() => {
      ignoreEndedRef.current = false;
    });
  }, []);

  const skipForward = useCallback(() => {
    setCurrentIndex((index) => {
      const nextIndex = Math.min(index + 1, Math.max(queueRef.current.length - 1, 0));
      currentIndexRef.current = nextIndex;
      return nextIndex;
    });
  }, []);

  const skipBackward = useCallback(() => {
    setCurrentIndex((index) => {
      const nextIndex = Math.max(index - 1, 0);
      currentIndexRef.current = nextIndex;
      return nextIndex;
    });
  }, []);

  const setOnClipEnded = useCallback((cb: ((turnId: string) => void) | null) => {
    onClipEndedRef.current = cb;
  }, []);

  const setOnTimeUpdate = useCallback(
    (cb: ((info: { turnId: string; currentTime: number; duration: number }) => void) | null) => {
      onTimeUpdateRef.current = cb;
    },
    [],
  );

  const play = useCallback(() => {
    if (clipExhaustedRef.current) return;
    setPlaying(true);
  }, []);

  const pause = useCallback(() => setPlaying(false), []);

  /** True after natural `ended` until a new clip is loaded or a seek resets it. */
  const isClipExhausted = useCallback(() => clipExhaustedRef.current, []);

  /** Seek within the current clip (0..1). Used by scrub without restarting TTS. */
  const seekFraction = useCallback((fraction: number) => {
    const el = audioRef.current;
    if (!el) return false;
    const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    if (!duration) return false;
    clipExhaustedRef.current = false;
    el.currentTime = Math.max(0, Math.min(duration, fraction * duration));
    return true;
  }, []);

  /** Seek within the current clip to an absolute offset in real seconds. */
  const seekToSeconds = useCallback((seconds: number) => {
    const el = audioRef.current;
    if (!el) return false;
    const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    if (!duration) return false;
    clipExhaustedRef.current = false;
    el.currentTime = Math.max(0, Math.min(duration, seconds));
    return true;
  }, []);

  const getPlaybackPosition = useCallback(() => {
    const el = audioRef.current;
    if (!el) return { currentTime: 0, duration: 0 };
    return {
      currentTime: Number.isFinite(el.currentTime) ? el.currentTime : 0,
      duration: Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0,
    };
  }, []);

  // Swap the audio source whenever the current item changes.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !current) return;

    const nextSrc = current.audioUrl;
    // el.src is absolute; compare against resolved form to avoid reload loops.
    const alreadyLoaded = el.src === nextSrc || el.src.endsWith(nextSrc);
    if (!alreadyLoaded) {
      ignoreEndedRef.current = true;
      clipExhaustedRef.current = false;
      el.src = nextSrc;
      el.load();
      queueMicrotask(() => {
        ignoreEndedRef.current = false;
      });
    }
    if (playing && !clipExhaustedRef.current) {
      void el.play().catch(() => {
        // Autoplay can be blocked until the user interacts with the page; ignore.
      });
    }
  }, [current, playing]);

  // Mirror the playing flag onto the element (covers pause/resume with no item change).
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      if (clipExhaustedRef.current) return;
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [playing]);

  // Natural end + timeline ticks while a clip plays.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const handleEnded = () => {
      if (ignoreEndedRef.current) return;
      clipExhaustedRef.current = true;
      setPlaying(false);
      const finished = queueRef.current[currentIndexRef.current];
      if (finished) onClipEndedRef.current?.(finished.turnId);
    };

    const handleTimeUpdate = () => {
      if (ignoreEndedRef.current || clipExhaustedRef.current) return;
      const item = queueRef.current[currentIndexRef.current];
      if (!item) return;
      const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
      onTimeUpdateRef.current?.({
        turnId: item.turnId,
        currentTime: el.currentTime,
        duration,
      });
    };

    el.addEventListener("ended", handleEnded);
    el.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      el.removeEventListener("ended", handleEnded);
      el.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  return {
    queue,
    currentIndex,
    current,
    playing,
    play,
    pause,
    isClipExhausted,
    seekFraction,
    seekToSeconds,
    getPlaybackPosition,
    enqueue,
    playExclusive,
    clear,
    skipForward,
    skipBackward,
    setCurrentIndex,
    setOnClipEnded,
    setOnTimeUpdate,
  };
}

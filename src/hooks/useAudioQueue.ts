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
  /** turnId we last armed for playback — near-end must not fire for a stale element position. */
  const armedTurnIdRef = useRef<string | null>(null);
  /** performance.now() when the armed clip became eligible to finish naturally. */
  const clipPlayableAtRef = useRef(0);
  const playingRef = useRef(false);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

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
    const el = audioRef.current;
    const existing = queueRef.current[currentIndexRef.current];
    const srcMatches =
      !!el?.src &&
      (el.src === item.audioUrl ||
        el.src.endsWith(item.audioUrl) ||
        (item.audioUrl.startsWith("blob:") && el.src === item.audioUrl));
    // Pause → play often re-speaks the same turnId/url. The load effect deps do not
    // change, so disarming without re-arming left playback permanently stuck.
    if (
      existing?.turnId === item.turnId &&
      existing?.audioUrl === item.audioUrl &&
      srcMatches &&
      el
    ) {
      ignoreEndedRef.current = false;
      if (clipExhaustedRef.current) {
        try {
          el.currentTime = 0;
        } catch {
          // Metadata may not be ready yet.
        }
        clipExhaustedRef.current = false;
        clipPlayableAtRef.current = performance.now();
      } else if (clipPlayableAtRef.current === 0) {
        clipPlayableAtRef.current = performance.now();
      }
      armedTurnIdRef.current = item.turnId;
      queueRef.current = [item];
      currentIndexRef.current = 0;
      setQueue([item]);
      setCurrentIndex(0);
      setPlaying(true);
      void el.play().catch(() => {});
      return;
    }

    // Hold ignore until the src effect arms this turn — a microtask release was too
    // early: cached TTS could finishClip(newTurn) while currentTime was still at the
    // previous clip's end (same voice / back-to-back lines skipped silently).
    ignoreEndedRef.current = true;
    clipExhaustedRef.current = false;
    armedTurnIdRef.current = null;
    clipPlayableAtRef.current = 0;
    if (el) el.pause();

    queueRef.current = [item];
    currentIndexRef.current = 0;
    setQueue([item]);
    setCurrentIndex(0);
    setPlaying(true);
  }, []);

  const clear = useCallback(() => {
    ignoreEndedRef.current = true;
    clipExhaustedRef.current = false;
    armedTurnIdRef.current = null;
    clipPlayableAtRef.current = 0;
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

  // Load/arm whenever the current queue item identity changes (not on play/pause).
  const currentTurnId = current?.turnId ?? null;
  const currentAudioUrl = current?.audioUrl ?? null;
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !currentTurnId || !currentAudioUrl) return;

    const nextSrc = currentAudioUrl;
    // el.src is absolute; compare against resolved form to avoid reload loops.
    // Data-URL TTS can reuse the same bytes for identical text+voice — still reset.
    const alreadyLoaded = el.src === nextSrc || el.src.endsWith(nextSrc);

    const armClip = () => {
      try {
        if (el.currentTime !== 0) el.currentTime = 0;
      } catch {
        // Ignoring seek errors before metadata is ready.
      }
      clipExhaustedRef.current = false;
      armedTurnIdRef.current = currentTurnId;
      clipPlayableAtRef.current = performance.now();
      ignoreEndedRef.current = false;
      if (playingRef.current) {
        void el.play().catch(() => {});
      }
    };

    ignoreEndedRef.current = true;
    armedTurnIdRef.current = null;
    clipPlayableAtRef.current = 0;

    if (!alreadyLoaded) {
      clipExhaustedRef.current = false;
      el.src = nextSrc;
      el.load();
      // "loadeddata" and the fallback timer both call onReady — without this guard,
      // whichever fires second re-armed an already-playing clip, yanking currentTime
      // back to 0 mid-line (audible as the speaker repeating their opening words).
      let armedOnce = false;
      const onReady = () => {
        if (armedOnce) return;
        // Drop stale ready callbacks if a newer turn won.
        if (queueRef.current[currentIndexRef.current]?.turnId !== currentTurnId) return;
        armedOnce = true;
        el.removeEventListener("loadeddata", onReady);
        window.clearTimeout(fallbackTimer);
        armClip();
      };
      const fallbackTimer = window.setTimeout(onReady, 500);
      el.addEventListener("loadeddata", onReady);
    } else {
      // Same src as previous line (identical TTS) — must rewind or near-end skips us.
      armClip();
    }
  }, [currentTurnId, currentAudioUrl]);

  // Mirror the playing flag onto the element (pause/resume with no item change).
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      if (clipExhaustedRef.current) return;
      if (armedTurnIdRef.current == null) return;
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [playing]);

  // Natural end + timeline ticks while a clip plays.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const finishClip = (turnId: string) => {
      if (clipExhaustedRef.current) return;
      // Only the armed clip may finish — blocks stale near-end from the previous src.
      if (armedTurnIdRef.current !== turnId) return;
      clipExhaustedRef.current = true;
      setPlaying(false);
      onClipEndedRef.current?.(turnId);
    };

    const handleEnded = () => {
      if (ignoreEndedRef.current) return;
      const finished = queueRef.current[currentIndexRef.current];
      if (finished) finishClip(finished.turnId);
    };

    const handleTimeUpdate = () => {
      if (ignoreEndedRef.current) return;
      const item = queueRef.current[currentIndexRef.current];
      if (!item) return;
      const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
      // Some browsers skip `ended` after pause/src races — treat near-end as finished.
      // Require a short playable window so a new turn isn't finished with the old
      // element's end position (common when the next line is cache-hit TTS).
      const playedMs = performance.now() - clipPlayableAtRef.current;
      if (
        !clipExhaustedRef.current &&
        armedTurnIdRef.current === item.turnId &&
        clipPlayableAtRef.current > 0 &&
        playedMs >= 280 &&
        duration > 0 &&
        el.currentTime >= duration - 0.08
      ) {
        finishClip(item.turnId);
        return;
      }
      if (clipExhaustedRef.current) return;
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

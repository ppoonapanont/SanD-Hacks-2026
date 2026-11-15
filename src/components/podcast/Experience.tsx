"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { EpisodeSetup } from "@/components/configuration/EpisodeSetup";
import {
  DEMO_JOIN_LINES,
  DEMO_SCRIPT,
  DEMO_SOURCES,
  DEMO_VOICE_QUESTION,
  HOST_PROFILE,
  type DemoScriptLine,
  type SpeakerCode,
} from "@/data/mock/experience-demo";
import { useTurnAudio } from "@/hooks";
import {
  generatePodcast,
  interact,
  nextTurn,
  resumePodcast,
  transcribeAudio,
} from "@/lib/api/client";
import {
  buildCustomGuestProfile,
  resolvePanelProfile,
  type CustomGuestInput,
  type PanelGuestProfile,
} from "@/lib/guests/panelProfiles";
import {
  adaptInteractTurnsToJoinLines,
  adaptSessionToExperience,
  adaptTurnToScriptLine,
} from "@/services/podcast/adaptToExperience";
import { buildPodcastConfig } from "@/services/podcast/guestMap";
import { estimateSpeechSeconds } from "@/services/podcast/speechTiming";
import type { NewsSource } from "@/types";
import { formatSeconds } from "@/utils/time";

import { ChaptersPanel } from "./ChaptersPanel";
import { deriveExperienceView, type SuggestionView } from "./deriveExperienceView";
import type { ExperienceHandlers } from "./handlers";
import { PlayerCard } from "./PlayerCard";
import { SourcesPanel } from "./SourcesPanel";
import {
  BASE_STATE,
  currentChapter,
  getChapters,
  startResearchPatch,
  type ExperienceState,
} from "./state";

const TICK_MS = 250;
/** If TTS never returns / never ends, still move the transcript forward. */
const LISTEN_STALL_MS = 18_000;

function profileForGuestSlot(
  guests: string[],
  customGuests: Record<string, PanelGuestProfile>,
  code: SpeakerCode,
) {
  const active = guests.length ? guests : ["economist"];
  const slot: Record<SpeakerCode, string> = {
    H: "host",
    A: active[0],
    B: active[1 % active.length],
    C: active[2 % active.length],
  };
  const id = slot[code];
  if (id === "host") return HOST_PROFILE;
  return resolvePanelProfile(id, customGuests);
}

function scaleT(lineT: number, durationMinutes: number) {
  return lineT * ((durationMinutes * 60) / 720);
}

function activeScriptIndex(
  script: DemoScriptLine[],
  t: number,
  durationMinutes: number,
  liveGeneration = false,
): number {
  let best = -1;
  for (let i = 0; i < script.length; i++) {
    const lineStart = liveGeneration
      ? script[i].t
      : scaleT(script[i].t, durationMinutes);
    if (lineStart <= t + 0.001) best = i;
  }
  return best;
}

function advanceListenPastTurn(
  prev: ExperienceState,
  turnId: string,
): ExperienceState {
  if (prev.phase !== "episode" || prev.mode !== "listen") return prev;
  const match = /^L(\d+)$/.exec(turnId);
  if (!match) return prev;

  const idx = Number(match[1]);
  const script = prev.liveScript ?? DEMO_SCRIPT;
  if (!script[idx]) return prev;

  // listenN is 1-based; active line is listenN - 1.
  if (prev.listenN - 1 !== idx) return prev;

  const next = script[idx + 1];
  if (!next) {
    // Live mode may still be generating the next line — keep the session alive.
    if (prev.liveGeneration && !prev.liveComplete) {
      return prev;
    }
    return { ...prev, playing: false };
  }
  // Keep real elapsed clock continuous — do not jump to script baseline timestamps.
  return {
    ...prev,
    listenN: idx + 2,
    playing: true,
  };
}

function speakableFromScript(
  script: Array<{ s: SpeakerCode; x: string }>,
  guests: string[],
  customGuests: Record<string, PanelGuestProfile>,
  prefix: "L" | "J",
) {
  return script.map((line, i) => {
    const profile = profileForGuestSlot(guests, customGuests, line.s);
    return {
      turnId: `${prefix}${i}`,
      text: line.x,
      voiceId: profile.voiceId,
      speakerId: `${prefix}${i}`,
      speakerName: profile.name,
    };
  });
}

type ListenSkipPlan = {
  t: number;
  listenN: number;
  /** Absolute offset to seek in the *current* loaded clip, if any. */
  seekSeconds: number | null;
  /** Offset to apply once a new line's clip loads (negative = from end). */
  pendingSeekSeconds: number | null;
  clearSpoken: boolean;
  anchor: number;
};

/**
 * Pure ±15 plan (no audio side effects). Safe under Strict Mode double-invoke.
 * Clock is real seconds: 1s of audio ≈ 1s on the counter.
 */
function planListenSkip(
  prev: ExperienceState,
  deltaSec: number,
  currentTurnId: string | null,
  position: { currentTime: number; duration: number },
): ListenSkipPlan {
  const total = prev.duration * 60;
  const targetT = Math.max(0, Math.min(total, prev.t + deltaSec));
  const idx = prev.listenN - 1;
  const script = prev.liveScript ?? DEMO_SCRIPT;

  if (idx < 0 || !script[idx] || currentTurnId !== `L${idx}`) {
    return {
      t: targetT,
      listenN: prev.listenN,
      seekSeconds: null,
      pendingSeekSeconds: null,
      clearSpoken: true,
      anchor: targetT,
    };
  }

  const { currentTime, duration } = position;
  if (!(duration > 0)) {
    return {
      t: targetT,
      listenN: prev.listenN,
      seekSeconds: null,
      pendingSeekSeconds: null,
      clearSpoken: false,
      anchor: targetT,
    };
  }

  const nextTime = currentTime + deltaSec;
  if (nextTime >= 0 && nextTime <= duration) {
    return {
      t: targetT,
      listenN: prev.listenN,
      seekSeconds: nextTime,
      pendingSeekSeconds: null,
      clearSpoken: false,
      anchor: targetT - nextTime,
    };
  }

  if (nextTime > duration && script[idx + 1]) {
    const overflow = nextTime - duration;
    return {
      t: targetT,
      listenN: idx + 2,
      seekSeconds: null,
      pendingSeekSeconds: overflow,
      clearSpoken: true,
      anchor: targetT - overflow,
    };
  }

  if (nextTime < 0 && idx > 0) {
    return {
      t: targetT,
      listenN: idx, // previous line (1-based index == idx)
      seekSeconds: null,
      pendingSeekSeconds: nextTime, // negative → from end of previous clip
      clearSpoken: true,
      anchor: targetT,
    };
  }

  const clamped = Math.max(0, Math.min(duration, nextTime));
  return {
    t: targetT,
    listenN: prev.listenN,
    seekSeconds: clamped,
    pendingSeekSeconds: null,
    clearSpoken: false,
    anchor: targetT - clamped,
  };
}

function advanceJoinPastTurn(
  prev: ExperienceState,
  turnId: string,
): ExperienceState {
  if (prev.phase !== "episode" || prev.mode !== "joined") return prev;
  const match = /^J(\d+)$/.exec(turnId);
  if (!match) return prev;

  const idx = Number(match[1]);
  // joinN is how many lines are visible; the active line is index joinN - 1.
  if (prev.joinN - 1 !== idx) return prev;

  const script = prev.liveJoinLines ?? DEMO_JOIN_LINES;
  if (idx + 1 >= script.length) {
    // Last interrupt line finished — stop so the UI can show resume actions.
    return { ...prev, playing: false };
  }
  return { ...prev, joinN: idx + 2, k: 0 };
}

function advancePastSpokenTurn(
  prev: ExperienceState,
  turnId: string,
): ExperienceState {
  if (turnId.startsWith("J")) return advanceJoinPastTurn(prev, turnId);
  return advanceListenPastTurn(prev, turnId);
}

/**
 * The entire interactive Experience screen: collapsible setup, player, chapters,
 * and sources, plus the user-interruption flow (voice → research → joined → resume).
 */
export function Experience() {
  const [state, setState] = useState<ExperienceState>(BASE_STATE);
  const turnAudio = useTurnAudio();
  const lastSpokenKeyRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  /** Bumps on each generate/interrupt so stale async completions cannot rewind the UI. */
  const generateEpochRef = useRef(0);
  const interruptEpochRef = useRef(0);
  /** Ignore audio timeupdate briefly after ±15 / scrub so the scrubber doesn't snap back. */
  const seekIgnoreUntilRef = useRef(0);
  /** `t = lineClockAnchor + audio.currentTime` so the counter ticks in real seconds. */
  const lineClockAnchorRef = useRef(0);
  /** After a cross-line ±15, seek into the new clip once it loads (seconds, or negative = from end). */
  const pendingSeekSecondsRef = useRef<number | null>(null);
  /** Blocks stacked ±15 from double-clicks / Strict Mode side-effect duplication. */
  const skipLockRef = useRef(false);
  /** Prevents overlapping POST /next prefetch calls in live mode. */
  const nextFetchLockRef = useRef(false);
  /** Session sources for adapting live /next turns into script lines. */
  const sessionSourcesRef = useRef<NewsSource[]>([]);
  /**
   * Cumulative spoken seconds for live transcript labels (measured TTS duration
   * when available — not wall-clock waits for /next generation).
   */
  const speechElapsedRef = useRef(0);
  const stateRef = useRef(state);
  // Read by useTurnAudio once a (possibly async) clip is actually ready, so a generation
  // request that resolves after the user hits pause doesn't force playback back on.
  const playingRef = useRef(state.playing);
  useEffect(() => {
    playingRef.current = state.playing;
  }, [state.playing]);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const id = setInterval(() => {
      setState((prev) => {
        if (prev.phase === "generating") {
          // Advance through the step list once (~6s total, 2s/step), then hold
          // on the last step (still spinning) until the API actually finishes —
          // looping back to "Finding stories" every few seconds reads as broken/stuck.
          return { ...prev, k: Math.min(prev.k + 1, 23) };
        }
        if (prev.phase !== "episode") return prev;

        const patch: Partial<ExperienceState> = {};
        if (prev.note) {
          const noteK = prev.noteK + 1;
          patch.noteK = noteK;
          if (noteK > 24) patch.note = "";
        }

        // Listen / joined: transcript advances on clip end (see advancePastSpokenTurn).
        // Research: animate steps while /api/podcast/interact is in flight — do not auto-join.
        if (prev.mode === "listen" && prev.playing) {
          // no-op for t
        } else if (prev.mode === "research" && prev.playing) {
          const k = prev.k + 1;
          const step = Math.min(Math.floor(k / 5), 2);
          patch.k = k;
          patch.step = step;
          if (step >= 2) patch.found5 = true;
        } else if (prev.mode === "joined" && prev.playing) {
          // no-op for joinN — advanced when each interrupt clip ends
        }
        return { ...prev, ...patch };
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Sync transcript → next speaker when the *active* line's clip finishes or TTS fails.
  useEffect(() => {
    const syncSpeechElapsed = (turnId: string) => {
      if (!stateRef.current.liveGeneration) return;
      // Prefer the live scrubber (anchor + currentTime). Falling back to measured
      // duration avoids drifting a parallel timeline that rewinds the clock.
      const { currentTime, duration } = turnAudio.getPlaybackPosition();
      const fromClock = stateRef.current.t;
      const fromAudio =
        duration > 0.5
          ? lineClockAnchorRef.current + Math.min(currentTime || duration, duration)
          : null;
      const match = /^L(\d+)$/.exec(turnId);
      const idx = match ? Number(match[1]) : -1;
      const line = idx >= 0 ? stateRef.current.liveScript?.[idx] : null;
      const fromEstimate =
        line != null
          ? (typeof line.t === "number" ? line.t : 0) +
            estimateSpeechSeconds(line.x)
          : fromClock;
      speechElapsedRef.current = Math.max(
        fromClock,
        fromAudio ?? 0,
        fromEstimate,
        speechElapsedRef.current,
      );
    };
    const advance = (turnId: string) => {
      syncSpeechElapsed(turnId);
      setState((prev) => advancePastSpokenTurn(prev, turnId));
    };
    turnAudio.setOnClipEnded(advance);
    turnAudio.setOnSpeakFailed(advance);
    return () => {
      turnAudio.setOnClipEnded(null);
      turnAudio.setOnSpeakFailed(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const view = deriveExperienceView(state);

  // Speak exactly the highlighted transcript line. Clip-end advances the line;
  // speak() plays that line exclusively so audio cannot drift ahead/behind the UI.
  const isSpeakingPhase = view.isEpisode && (state.mode === "listen" || state.mode === "joined");
  const activeLine = !isSpeakingPhase
    ? null
    : state.mode === "joined"
      ? view.joinLines[view.joinLines.length - 1] ?? null
      : view.lines[view.lines.length - 1] ?? null;
  const activeLineKey = activeLine?.key ?? null;

  useEffect(() => {
    if (!isSpeakingPhase || !state.playing) {
      turnAudio.pause();
      return;
    }

    // Clip finished but transcript never advanced (missed `ended`) — nudge forward.
    if (
      activeLine &&
      activeLineKey &&
      activeLineKey === lastSpokenKeyRef.current &&
      turnAudio.isClipExhausted()
    ) {
      // Live /next still writing the next line — don't kill playback while buffering.
      if (state.liveGeneration && !state.liveComplete) {
        const script = stateRef.current.liveScript ?? [];
        if (stateRef.current.listenN >= script.length) {
          return;
        }
      }
      const finishedKey = activeLineKey;
      setState((prev) => {
        const next = advancePastSpokenTurn(prev, finishedKey);
        if (next !== prev) return next;
        if (prev.liveGeneration && !prev.liveComplete) return prev;
        return prev.playing ? { ...prev, playing: false } : prev;
      });
      return;
    }

    // Same line still loaded (e.g. pause → ±15 → resume): keep currentTime, just play.
    // Re-speaking would reload the clip from 0 and rewrite the clock anchor.
    if (
      activeLine &&
      activeLineKey === lastSpokenKeyRef.current &&
      turnAudio.current?.turnId === activeLineKey &&
      !turnAudio.isClipExhausted()
    ) {
      // Listen mode only: scrubber tracks clip time, so re-assert after pause seeks.
      // Joined interrupt audio does not advance `t` — syncing would seek back to 0.
      if (state.mode === "listen") {
        const pos = turnAudio.getPlaybackPosition();
        const expected = stateRef.current.t - lineClockAnchorRef.current;
        if (
          pos.duration > 0 &&
          Number.isFinite(expected) &&
          expected >= 0 &&
          Math.abs(pos.currentTime - expected) > 0.35
        ) {
          turnAudio.seekToSeconds(Math.min(pos.duration, expected));
          seekIgnoreUntilRef.current = Date.now() + 200;
        }
      }
      turnAudio.play();
      return;
    }

    // Only start TTS when the active line changes — never replay an exhausted clip.
    if (activeLine && activeLineKey && activeLineKey !== lastSpokenKeyRef.current) {
      lastSpokenKeyRef.current = activeLineKey;
      // Use live state — effect closures can still see pre-skip `t`.
      const clockT = stateRef.current.t;
      const pending = pendingSeekSecondsRef.current;
      // If we're replacing a clip that already had a within-line seek, keep that offset
      // so playExclusive/load cannot drop the scrubber back to the line start.
      const existingPos = turnAudio.getPlaybackPosition();
      const keepOffset =
        pending == null &&
        turnAudio.current?.turnId === activeLineKey &&
        existingPos.currentTime > 0.05
          ? existingPos.currentTime
          : null;
      const startOffset =
        pending == null
          ? keepOffset ?? 0
          : pending >= 0
            ? pending
            : 0;
      // Always continue the scrubber from the current clock — never rewind to a
      // parallel speechElapsed estimate (that made the UI jump back on each new line).
      const anchor = Math.max(0, clockT - startOffset);
      lineClockAnchorRef.current = anchor;
      if (keepOffset != null && pending == null) {
        pendingSeekSecondsRef.current = keepOffset;
      }

      // Live labels: stamp the line's *start* with the scrubber time at speak.
      if (stateRef.current.liveGeneration) {
        const match = /^L(\d+)$/.exec(activeLineKey);
        const idx = match ? Number(match[1]) : -1;
        if (idx >= 0) {
          speechElapsedRef.current = Math.max(speechElapsedRef.current, anchor);
          setState((prev) => {
            const script = prev.liveScript;
            if (!script?.[idx]) return prev;
            if (Math.abs(script[idx].t - anchor) < 0.35) return prev;
            const next = script.slice();
            next[idx] = { ...next[idx], t: anchor };
            return { ...prev, liveScript: next };
          });
        }
      }

      turnAudio.speak(
        {
          turnId: activeLine.key,
          text: activeLine.text,
          voiceId: activeLine.voiceId,
          speakerId: activeLine.key,
          speakerName: activeLine.name,
        },
        () => playingRef.current,
      );

      // Apply cross-line ±15 remainder (or preserved within-line offset) once clip is ready.
      const pendingAfter = pendingSeekSecondsRef.current;
      if (pendingAfter != null) {
        const applyPending = () => {
          if (turnAudio.current?.turnId !== activeLineKey) return false;
          const { duration } = turnAudio.getPlaybackPosition();
          if (!(duration > 0)) return false;
          const offset =
            pendingAfter >= 0
              ? Math.min(pendingAfter, duration)
              : Math.max(0, duration + pendingAfter);
          turnAudio.seekToSeconds(offset);
          lineClockAnchorRef.current = Math.max(0, stateRef.current.t - offset);
          pendingSeekSecondsRef.current = null;
          seekIgnoreUntilRef.current = Date.now() + 200;
          return true;
        };
        if (!applyPending()) {
          window.setTimeout(() => {
            applyPending();
          }, 120);
          window.setTimeout(() => {
            applyPending();
          }, 400);
        }
      }
    }
    // liveScript length: when a buffered /next line arrives after a clip ended, advance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isSpeakingPhase,
    state.mode,
    state.playing,
    activeLineKey,
    state.liveScript?.length,
    state.liveGeneration,
    state.liveComplete,
  ]);

  // Drive the scrubber 1:1 with real audio seconds (not stretched script gaps).
  useEffect(() => {
    turnAudio.setOnTimeUpdate((info) => {
      if (Date.now() < seekIgnoreUntilRef.current) return;
      setState((prev) => {
        if (prev.phase !== "episode" || prev.mode !== "listen" || !prev.playing) {
          return prev;
        }
        const match = /^L(\d+)$/.exec(info.turnId);
        if (!match) return prev;
        const idx = Number(match[1]);
        if (prev.listenN - 1 !== idx) return prev;

        const total = prev.duration * 60;
        const t = Math.min(total, lineClockAnchorRef.current + info.currentTime);
        // Smooth scrubber (~20hz); mm:ss label floors via formatSeconds.
        if (Math.abs(t - prev.t) < 0.05) return prev;
        return { ...prev, t };
      });
    });
    return () => turnAudio.setOnTimeUpdate(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefetch the next couple of lines (episode or interrupt) so audio stays ready.
  useEffect(() => {
    if (!view.isEpisode || !state.playing) return;
    if (state.mode === "listen") {
      const match = /^L(\d+)$/.exec(activeLineKey ?? "");
      if (!match) return;
      const idx = Number(match[1]);
      const script: DemoScriptLine[] = state.liveScript ?? DEMO_SCRIPT;
      for (const i of [idx + 1, idx + 2]) {
        const line = script[i];
        if (!line) continue;
        const profile = profileForGuestSlot(state.guests, state.customGuests, line.s);
        turnAudio.prefetch({
          turnId: `L${i}`,
          text: line.x,
          voiceId: profile.voiceId,
          speakerId: `L${i}`,
          speakerName: profile.name,
        });
      }
      return;
    }
    if (state.mode === "joined") {
      const match = /^J(\d+)$/.exec(activeLineKey ?? "");
      if (!match) return;
      const idx = Number(match[1]);
      const script = state.liveJoinLines ?? DEMO_JOIN_LINES;
      for (const i of [idx + 1, idx + 2]) {
        const line = script[i];
        if (!line) continue;
        const profile = profileForGuestSlot(state.guests, state.customGuests, line.s);
        turnAudio.prefetch({
          turnId: `J${i}`,
          text: line.x,
          voiceId: profile.voiceId,
          speakerId: `J${i}`,
          speakerName: profile.name,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeLineKey,
    state.mode,
    state.playing,
    state.liveScript,
    state.liveJoinLines,
    state.guests,
    state.customGuests,
    view.isEpisode,
  ]);

  // Live mode: keep ~2 lines ahead via POST /next so Gemini+TTS can finish while
  // the current clip plays (1-line buffer routinely stalled between turns).
  useEffect(() => {
    if (
      !view.isEpisode ||
      !state.liveGeneration ||
      state.liveComplete ||
      !state.sessionId ||
      state.mode !== "listen" ||
      !state.playing
    ) {
      return;
    }
    const script = state.liveScript;
    if (!script?.length) return;
    // length - listenN == lines after the active one.
    if (script.length - state.listenN >= 2) return;
    if (nextFetchLockRef.current) return;

    const sessionId = state.sessionId;
    const guests = state.guests;
    const customGuests = state.customGuests;
    nextFetchLockRef.current = true;

    void (async () => {
      try {
        const result = await nextTurn({ sessionId });
        const line = adaptTurnToScriptLine(
          result.turn,
          guests,
          sessionSourcesRef.current,
        );
        if (line) {
          const idx = result.session.turns.length - 1;
          const profile = profileForGuestSlot(guests, customGuests, line.s);
          // Append text immediately so playback can advance; warm TTS in parallel.
          const speakable = {
            turnId: `L${idx}`,
            text: line.x,
            voiceId: profile.voiceId,
            speakerId: `L${idx}`,
            speakerName: profile.name,
          };
          void turnAudio.preload([speakable], { concurrency: 1 });
          // Only start the new line if the current clip already finished. Never bump
          // listenN while audio is still playing — that was cutting off the prior turn.
          const currentFinished = turnAudio.isClipExhausted();
          const waitingAtEnd =
            currentFinished &&
            stateRef.current.listenN >= (stateRef.current.liveScript?.length ?? 0);
          if (waitingAtEnd) {
            lastSpokenKeyRef.current = null;
          }
          if (result.errors?.length) {
            console.warn("[Experience] live /next soft errors:", result.errors);
          }
          setState((prev) => {
            if (prev.sessionId !== sessionId || prev.mode !== "listen") return prev;
            const prevScript = prev.liveScript ?? [];
            // Avoid duplicating if Strict Mode / overlap already appended.
            if (prevScript.length >= result.session.turns.length) {
              return {
                ...prev,
                liveComplete: Boolean(result.done),
              };
            }
            const shouldStartNow =
              currentFinished && prev.listenN >= prevScript.length;
            // Provisional start = current scrubber (refined to exact start on speak).
            // Do not use server estimate timestamps — they drift ahead of real audio.
            const stamped = {
              ...line,
              t: Math.max(prev.t, speechElapsedRef.current),
            };
            const fallbackNote = result.errors?.length
              ? `Live fallback: ${result.turn.speakerName} (model quota?)`
              : result.generated
                ? `Live next: ${result.turn.speakerName}`
                : prev.note;
            return {
              ...prev,
              liveScript: [...prevScript, stamped],
              listenN: shouldStartNow ? prev.listenN + 1 : prev.listenN,
              note: fallbackNote,
              noteK: 0,
              liveComplete: Boolean(result.done),
            };
          });
        } else if (result.done) {
          setState((prev) => ({ ...prev, liveComplete: true }));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.toLowerCase().includes("complete")) {
          setState((prev) => ({ ...prev, liveComplete: true }));
        } else {
          console.warn("[Experience] live /next failed:", error);
        }
      } finally {
        nextFetchLockRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    view.isEpisode,
    state.liveGeneration,
    state.liveComplete,
    state.sessionId,
    state.mode,
    state.playing,
    state.listenN,
    state.liveScript?.length,
  ]);

  // Stall fallback: only if TTS never starts for this line (not while audio plays).
  useEffect(() => {
    if (
      (state.mode !== "listen" && state.mode !== "joined") ||
      !state.playing ||
      !activeLineKey
    ) {
      return;
    }
    if (turnAudio.current?.turnId === activeLineKey) return;
    const turnId = activeLineKey;
    const timer = window.setTimeout(() => {
      setState((prev) => advancePastSpokenTurn(prev, turnId));
    }, LISTEN_STALL_MS);
    return () => window.clearTimeout(timer);
  }, [activeLineKey, state.mode, state.playing, turnAudio.current?.turnId]);

  /** Live interrupt via /api/podcast/interact; falls back to DEMO_JOIN_LINES. */
  const beginInterrupt = (question: string) => {
    turnAudio.pause();
    turnAudio.clear();
    lastSpokenKeyRef.current = null;

    const epoch = ++interruptEpochRef.current;
    const stillCurrent = () => interruptEpochRef.current === epoch;
    const snap: ExperienceState = {
      ...state,
      ...startResearchPatch(question),
      liveJoinLines: null,
      note: "Researching your question…",
      noteK: 0,
    };

    setState(snap);

    void (async () => {
      const startJoined = async (
        joinLines: typeof DEMO_JOIN_LINES | null,
        note: string,
        liveSources?: ExperienceState["liveSources"],
      ) => {
        if (!stillCurrent()) return;
        const script = joinLines ?? DEMO_JOIN_LINES;
        setState((cur) => ({
          ...cur,
          mode: "research",
          playing: false,
          found5: true,
          note: "Preparing reply voices…",
          noteK: 0,
          ...(liveSources ? { liveSources } : {}),
        }));
        await turnAudio.preload(
          speakableFromScript(script, snap.guests, snap.customGuests, "J"),
          { concurrency: 3 },
        );
        if (!stillCurrent()) return;
        lastSpokenKeyRef.current = null;
        setState((cur) => ({
          ...cur,
          mode: "joined",
          joinN: script.length ? 1 : 0,
          k: 0,
          playing: true,
          found5: true,
          liveJoinLines: joinLines,
          note,
          noteK: 0,
          ...(liveSources ? { liveSources } : {}),
        }));
      };

      if (!snap.sessionId) {
        window.setTimeout(() => {
          if (!stillCurrent()) return;
          void startJoined(null, "");
        }, 1200);
        return;
      }

      try {
        const result = await interact({
          sessionId: snap.sessionId,
          message: question,
          ...(snap.targetGuestId ? { targetGuestId: snap.targetGuestId } : {}),
        });
        if (!stillCurrent()) return;
        const sources = { ...(snap.liveSources ?? {}) };
        const joinLines = adaptInteractTurnsToJoinLines(
          result.turns,
          snap.guests,
          sources,
          result.session.sources,
        );
        const noteParts = [
          result.moderatorUsed
            ? `Moderator: ${result.moderatorSummary ?? "routed panel"}`
            : null,
          result.guestsUsed
            ? result.guestsSummary ?? "Guest agents replied"
            : null,
          result.usedMockResearch
            ? "Interrupt research used mock/fallback sources"
            : null,
          !result.moderatorUsed &&
          !result.guestsUsed &&
          !result.usedMockResearch
            ? "Panel answering your question"
            : null,
        ].filter(Boolean);
        await startJoined(
          joinLines.length ? joinLines : null,
          noteParts.join(" · ") || "Panel answering your question",
          Object.keys(sources).length ? sources : undefined,
        );
      } catch (error) {
        if (!stillCurrent()) return;
        console.warn("[Experience] interact failed:", error);
        await startJoined(
          null,
          error instanceof Error
            ? `Interrupt API unavailable (${error.message}). Using demo replies.`
            : "Interrupt API unavailable. Using demo replies.",
        );
      }
    })();
  };

  const handlers: ExperienceHandlers = {
    toggleSetup: () => setState((prev) => ({ ...prev, setupOpen: !prev.setupOpen })),
    setRegion: (value) => setState((prev) => ({ ...prev, region: value })),
    setLanguage: (value) => setState((prev) => ({ ...prev, language: value })),
    setDuration: (value) => setState((prev) => ({ ...prev, duration: value })),
    toggleTopic: (id) =>
      setState((prev) => {
        const on = prev.topics.includes(id);
        if (on) {
          const next = prev.topics.filter((x) => x !== id);
          return next.length ? { ...prev, topics: next } : prev;
        }
        if (prev.topics.length < 3) return { ...prev, topics: [...prev.topics, id] };
        return prev;
      }),
    pickDepth: (label) => setState((prev) => ({ ...prev, depth: label })),
    toggleGuest: (id: string) =>
      setState((prev) => {
        const on = prev.guests.includes(id);
        if (on) {
          return {
            ...prev,
            guests: prev.guests.filter((x) => x !== id),
            targetGuestId: prev.targetGuestId === id ? null : prev.targetGuestId,
          };
        }
        if (prev.guests.length < 3) return { ...prev, guests: [...prev.guests, id] };
        return prev;
      }),
    openGuestBuilder: () => setState((prev) => ({ ...prev, guestBuilderOpen: true })),
    closeGuestBuilder: () => setState((prev) => ({ ...prev, guestBuilderOpen: false })),
    saveCustomGuest: (input: CustomGuestInput) =>
      setState((prev) => {
        const profile = buildCustomGuestProfile(input);
        const guests =
          prev.guests.length < 3 ? [...prev.guests, profile.id] : prev.guests;
        return {
          ...prev,
          customGuests: { ...prev.customGuests, [profile.id]: profile },
          guests,
          guestBuilderOpen: false,
        };
      }),
    removeCustomGuest: (id: string) =>
      setState((prev) => {
        const rest = { ...prev.customGuests };
        delete rest[id];
        return {
          ...prev,
          customGuests: rest,
          guests: prev.guests.filter((guestId) => guestId !== id),
          targetGuestId: prev.targetGuestId === id ? null : prev.targetGuestId,
        };
      }),
    setTargetGuest: (id) => setState((prev) => ({ ...prev, targetGuestId: id })),
    generate: () => {
      if (!state.guests.length) return;
      turnAudio.clear();
      lastSpokenKeyRef.current = null;

      // Never kick off async work inside a setState updater — React Strict Mode
      // double-invokes updaters in dev, which was restarting generate mid-playback.
      const epoch = ++generateEpochRef.current;
      const snapshot = state;
      const stillCurrent = () => generateEpochRef.current === epoch;

      setState((prev) => ({
        ...prev,
        phase: "generating",
        setupOpen: false,
        guestBuilderOpen: false,
        k: 0,
        t: 0,
        mode: "listen",
        playing: false,
        listenN: 0,
        joinN: 0,
        found5: false,
        openCite: null,
        note: "Pulling news and writing the panel script…",
        noteK: 0,
        sessionId: null,
        liveScript: null,
        liveSources: null,
        liveJoinLines: null,
        liveGeneration: false,
        liveComplete: false,
      }));
      sessionSourcesRef.current = [];
      nextFetchLockRef.current = false;
      speechElapsedRef.current = 0;

      void (async () => {
        const startEpisode = async (
          script: DemoScriptLine[],
          sources: typeof DEMO_SOURCES,
          sessionId: string | null,
          note: string,
          options?: { live?: boolean },
        ) => {
          if (!stillCurrent()) return;
          const live = Boolean(options?.live);

          setState((current) => ({
            ...current,
            phase: "generating",
            playing: false,
            liveScript: script,
            liveSources: sources,
            sessionId,
            liveGeneration: live,
            liveComplete: false,
            note: live
              ? "Preparing opening voice…"
              : "Preparing voices for the full episode…",
            noteK: 0,
          }));

          const lines = speakableFromScript(
            script,
            snapshot.guests,
            snapshot.customGuests,
            "L",
          );
          await turnAudio.preload(lines, {
            concurrency: 3,
            onProgress: (done, total) => {
              if (!stillCurrent()) return;
              setState((current) => ({
                ...current,
                note: `Preparing voices… ${done}/${total}`,
                noteK: 0,
              }));
            },
          });

          if (!stillCurrent()) return;

          lastSpokenKeyRef.current = null;
          lineClockAnchorRef.current = 0;
          pendingSeekSecondsRef.current = null;
          seekIgnoreUntilRef.current = 0;
          setState((current) => ({
            ...current,
            phase: "episode",
            setupOpen: false,
            playing: true,
            t: 0,
            k: 0,
            mode: "listen",
            listenN: 1,
            joinN: 0,
            found5: false,
            openCite: null,
            sessionId,
            liveScript: script,
            liveSources: sources,
            liveJoinLines: null,
            liveGeneration: live,
            liveComplete: false,
            note,
            noteK: 0,
          }));
        };

        try {
          const config = buildPodcastConfig({
            topics: snapshot.topics,
            region: snapshot.region,
            language: snapshot.language,
            durationMinutes: snapshot.duration,
            depthLabel: snapshot.depth,
            guestIds: snapshot.guests,
            customGuests: snapshot.customGuests,
          });
          // Live turn-by-turn: Producer outline + seed, then /next while playing.
          const { session, producerUsed, producerSummary, usedMockNews, live } =
            await generatePodcast({ config, live: true });
          if (!stillCurrent()) return;
          sessionSourcesRef.current = session.sources ?? [];
          const adapted = adaptSessionToExperience(session, { usedMockNews });
          const noteParts = [
            live ? "Live turn-by-turn" : null,
            producerUsed
              ? `Producer: ${producerSummary ?? adapted.title}`
              : `Generated: ${adapted.title}`,
            usedMockNews
              ? "mock/fallback news — sources labeled in notes"
              : null,
          ].filter(Boolean);
          await startEpisode(
            adapted.script,
            adapted.sources,
            adapted.sessionId,
            noteParts.join(" · "),
            { live: Boolean(live ?? session.generationMode === "live") },
          );
        } catch (error) {
          if (!stillCurrent()) return;
          const message =
            error instanceof Error ? error.message : "Generation failed";
          await startEpisode(
            DEMO_SCRIPT,
            DEMO_SOURCES,
            null,
            `API unavailable (${message}). Playing demo script.`,
            { live: false },
          );
        }
      })();
    },
    seekTo: (seconds) => {
      const prev = stateRef.current;
      const script = prev.liveScript ?? DEMO_SCRIPT;
      const clampedT = Math.max(0, Math.min(prev.duration * 60, seconds + 0.01));
      const idx = Math.max(
        0,
        activeScriptIndex(script, clampedT, prev.duration, prev.liveGeneration),
      );
      seekIgnoreUntilRef.current = Date.now() + 400;
      pendingSeekSecondsRef.current = null;
      lastSpokenKeyRef.current = null;
      lineClockAnchorRef.current = clampedT;
      setState({
        ...prev,
        t: clampedT,
        listenN: idx + 1,
        openCite: null,
      });
    },
    seekFraction: (fraction) => {
      const prev = stateRef.current;
      const clampedT = Math.max(
        0,
        Math.min(prev.duration * 60, fraction * prev.duration * 60),
      );
      const script = prev.liveScript ?? DEMO_SCRIPT;
      const idx = Math.max(
        0,
        activeScriptIndex(script, clampedT, prev.duration, prev.liveGeneration),
      );
      seekIgnoreUntilRef.current = Date.now() + 400;
      pendingSeekSecondsRef.current = null;
      lastSpokenKeyRef.current = null;
      lineClockAnchorRef.current = clampedT;
      setState({
        ...prev,
        t: clampedT,
        listenN: idx + 1,
        openCite: null,
      });
    },
    back15: () => {
      if (skipLockRef.current) return;
      skipLockRef.current = true;
      window.setTimeout(() => {
        skipLockRef.current = false;
      }, 350);

      const prev = stateRef.current;
      const plan = planListenSkip(
        prev,
        -15,
        turnAudio.current?.turnId ?? null,
        turnAudio.getPlaybackPosition(),
      );
      seekIgnoreUntilRef.current = Date.now() + 400;
      pendingSeekSecondsRef.current = plan.pendingSeekSeconds;
      lineClockAnchorRef.current = plan.anchor;
      if (plan.clearSpoken) lastSpokenKeyRef.current = null;
      if (plan.seekSeconds != null) turnAudio.seekToSeconds(plan.seekSeconds);
      setState({
        ...prev,
        t: plan.t,
        listenN: plan.listenN,
        openCite: null,
      });
    },
    fwd15: () => {
      if (skipLockRef.current) return;
      skipLockRef.current = true;
      window.setTimeout(() => {
        skipLockRef.current = false;
      }, 350);

      const prev = stateRef.current;
      const plan = planListenSkip(
        prev,
        15,
        turnAudio.current?.turnId ?? null,
        turnAudio.getPlaybackPosition(),
      );
      seekIgnoreUntilRef.current = Date.now() + 400;
      pendingSeekSecondsRef.current = plan.pendingSeekSeconds;
      lineClockAnchorRef.current = plan.anchor;
      if (plan.clearSpoken) lastSpokenKeyRef.current = null;
      if (plan.seekSeconds != null) turnAudio.seekToSeconds(plan.seekSeconds);
      setState({
        ...prev,
        t: plan.t,
        listenN: plan.listenN,
        openCite: null,
      });
    },
    togglePlay: () =>
      setState((prev) => {
        const total = prev.duration * 60;
        if (prev.t >= total) {
          lastSpokenKeyRef.current = null;
          return { ...prev, t: 0, listenN: 1, playing: true };
        }
        if (!prev.playing) {
          // Resume in place when the active clip is still loaded. Clearing
          // lastSpokenKey forced speak() → playExclusive(), which rewound
          // audio/clock after ±15 while paused — and for joined clips with the
          // same src, playExclusive could disarm without re-arming (stuck mute).
          const listenIdx = prev.listenN - 1;
          const joinIdx = prev.joinN - 1;
          const activeKey =
            prev.mode === "listen" && listenIdx >= 0
              ? `L${listenIdx}`
              : prev.mode === "joined" && joinIdx >= 0
                ? `J${joinIdx}`
                : null;
          const canResumeInPlace =
            activeKey != null &&
            turnAudio.current?.turnId === activeKey &&
            !turnAudio.isClipExhausted();
          if (!canResumeInPlace) {
            lastSpokenKeyRef.current = null;
          }
        }
        return { ...prev, playing: !prev.playing };
      }),
    setDraft: (value) => setState((prev) => ({ ...prev, draft: value })),
    submit: () => {
      const q = state.draft.trim();
      if (q) beginInterrupt(q);
    },
    startVoice: () => {
      setState((prev) => ({ ...prev, mode: "voice", k: 0, playing: false, openCite: null, note: "" }));
      void (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;
          audioChunksRef.current = [];
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          recorder.start();
          mediaRecorderRef.current = recorder;
        } catch (error) {
          // No mic permission/hardware — stopVoiceAndSubmit falls back to a
          // scripted question so the demo still works without a microphone.
          console.warn("[Experience] microphone unavailable:", error);
          mediaRecorderRef.current = null;
        }
      })();
    },
    stopVoiceAndSubmit: () => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        beginInterrupt(DEMO_VOICE_QUESTION);
        return;
      }
      mediaRecorderRef.current = null;
      recorder.onstop = () => {
        void (async () => {
          mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
          audioChunksRef.current = [];

          let text = "";
          try {
            const form = new FormData();
            form.append("audio", blob, "interruption.webm");
            const response = await transcribeAudio(form);
            text = response.text.trim();
          } catch (error) {
            console.warn("[Experience] transcription failed, falling back to scripted question:", error);
          }
          beginInterrupt(text || DEMO_VOICE_QUESTION);
        })();
      };
      recorder.stop();
    },
    cancelVoice: () => {
      const recorder = mediaRecorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setState((prev) => ({ ...prev, mode: "listen", playing: true, k: 0 }));
    },
    resume: () => {
      turnAudio.clear();
      lastSpokenKeyRef.current = null;
      const sessionId = state.sessionId;
      setState((prev) => {
        const chapters = getChapters(prev.duration);
        const cur = currentChapter(chapters, prev.t);
        return {
          ...prev,
          mode: "listen",
          playing: true,
          joinN: 0,
          question: "",
          openCite: null,
          k: 0,
          liveJoinLines: null,
          note: `Back in Chapter ${cur.num} · ${formatSeconds(prev.t)}`,
          noteK: 0,
        };
      });
      if (sessionId) {
        void resumePodcast({ sessionId }).catch((error) => {
          console.warn("[Experience] resume API failed:", error);
        });
      }
    },
    // Ends the current episode (mid-playback or after it's done) and returns to
    // setup for a new one. Bumping the epoch refs drops any in-flight generate/
    // interrupt response that would otherwise land after this reset.
    endEpisode: () => {
      turnAudio.clear();
      lastSpokenKeyRef.current = null;
      generateEpochRef.current += 1;
      interruptEpochRef.current += 1;
      setState((prev) => ({
        ...BASE_STATE,
        topics: prev.topics,
        region: prev.region,
        language: prev.language,
        duration: prev.duration,
        depth: prev.depth,
        guests: prev.guests,
        customGuests: prev.customGuests,
      }));
    },
    pickSuggestion: (suggestion: SuggestionView) => {
      if (suggestion.skip) {
        setState((prev) => {
          const chapters = getChapters(prev.duration);
          const fifth = chapters[4];
          const t = fifth.s + 0.01;
          const script = prev.liveScript ?? DEMO_SCRIPT;
          const idx = Math.max(
            0,
            activeScriptIndex(script, t, prev.duration, prev.liveGeneration),
          );
          lastSpokenKeyRef.current = null;
          return {
            ...prev,
            mode: "listen",
            t,
            listenN: idx + 1,
            playing: true,
            joinN: 0,
            question: "",
            liveJoinLines: null,
            note: "Skipped to Chapter 5",
            noteK: 0,
          };
        });
        return;
      }
      if (suggestion.q) beginInterrupt(suggestion.q);
    },
    toggleCitation: (id) => setState((prev) => ({ ...prev, openCite: prev.openCite === id ? null : id })),
  };

  return (
    <div style={{ minHeight: "100vh", background: "#051230", color: "#eef1f3", fontFamily: "Inter, system-ui, sans-serif", boxSizing: "border-box" }}>
      <header
        style={{
          maxWidth: 1360,
          margin: "0 auto",
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, color: "#eef1f3", textDecoration: "none" }}>
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="10" cy="16" r="7" fill="#97acc8" />
            <rect x="15" y="9" width="14" height="14" rx="4" fill="#b6bfc1" />
          </svg>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600 }}>
            Rondo<span style={{ color: "#97acc8" }}>FM</span>
          </span>
        </Link>
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 16px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            background: view.pill.bg,
            color: view.pill.fg,
          }}
        >
          <span className="pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: view.pill.dot }} />
          {view.pill.label}
        </div>
      </header>

      <main style={{ maxWidth: 1360, margin: "0 auto", padding: "0 32px 48px", display: "flex", flexDirection: "column", gap: 20 }}>
        <EpisodeSetup view={view} handlers={handlers} />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
          <PlayerCard view={view} handlers={handlers} />
          <aside style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            <ChaptersPanel view={view} handlers={handlers} />
            <SourcesPanel view={view} />
          </aside>
        </div>
      </main>
    </div>
  );
}

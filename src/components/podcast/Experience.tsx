"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { EpisodeSetup } from "@/components/configuration/EpisodeSetup";
import {
  DEMO_GUESTS,
  DEMO_JOIN_LINES,
  DEMO_SCRIPT,
  DEMO_SOURCES,
  DEMO_VOICE_QUESTION,
  HOST_PROFILE,
  type DemoScriptLine,
  type GuestKey,
  type SpeakerCode,
} from "@/data/mock/experience-demo";
import { useTurnAudio } from "@/hooks";
import {
  generatePodcast,
  interact,
  resumePodcast,
  transcribeAudio,
} from "@/lib/api/client";
import {
  adaptInteractTurnsToJoinLines,
  adaptSessionToExperience,
} from "@/services/podcast/adaptToExperience";
import { buildPodcastConfig } from "@/services/podcast/guestMap";
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

function profileForGuestSlot(guests: GuestKey[], code: SpeakerCode) {
  const active = guests.length ? guests : (["ada"] as GuestKey[]);
  const slot: Record<SpeakerCode, string> = {
    H: "host",
    A: active[0],
    B: active[1 % active.length],
    C: active[2 % active.length],
  };
  const id = slot[code];
  if (id === "host") return HOST_PROFILE;
  return DEMO_GUESTS[id as GuestKey] ?? HOST_PROFILE;
}

function scaleT(lineT: number, durationMinutes: number) {
  return lineT * ((durationMinutes * 60) / 720);
}

function activeScriptIndex(
  script: DemoScriptLine[],
  t: number,
  durationMinutes: number,
): number {
  let best = -1;
  for (let i = 0; i < script.length; i++) {
    if (scaleT(script[i].t, durationMinutes) <= t + 0.001) best = i;
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

  // Ignore stale callbacks from a line we've already left.
  if (activeScriptIndex(script, prev.t, prev.duration) !== idx) return prev;

  const next = script[idx + 1];
  if (!next) {
    return { ...prev, t: prev.duration * 60, playing: false };
  }
  return { ...prev, t: scaleT(next.t, prev.duration) };
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
  if (idx + 1 >= script.length) return prev;
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
  // Read by useTurnAudio once a (possibly async) clip is actually ready, so a generation
  // request that resolves after the user hits pause doesn't force playback back on.
  const playingRef = useRef(state.playing);
  useEffect(() => {
    playingRef.current = state.playing;
  }, [state.playing]);

  useEffect(() => {
    const id = setInterval(() => {
      setState((prev) => {
        if (prev.phase === "generating") {
          // Keep the generating animation looping until the API finishes.
          return { ...prev, k: (prev.k + 1) % 12 };
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
    const advance = (turnId: string) => {
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
    if (activeLine && activeLineKey !== lastSpokenKeyRef.current) {
      lastSpokenKeyRef.current = activeLineKey;
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
    } else if (turnAudio.current?.turnId === activeLineKey) {
      turnAudio.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeakingPhase, state.mode, state.playing, activeLineKey]);

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
        const profile = profileForGuestSlot(state.guests, line.s);
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
        const profile = profileForGuestSlot(state.guests, line.s);
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
    view.isEpisode,
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

    setState((prev) => {
      const snapshot = {
        ...prev,
        ...startResearchPatch(question),
        liveJoinLines: null,
        note: "Researching your question…",
        noteK: 0,
      };

      void (async () => {
        const finishWithDemo = (reason?: string) => {
          setState((cur) => ({
            ...cur,
            mode: "joined",
            joinN: 1,
            k: 0,
            playing: true,
            found5: true,
            liveJoinLines: null,
            note: reason ?? "",
            noteK: 0,
          }));
        };

        if (!snapshot.sessionId) {
          window.setTimeout(() => finishWithDemo(), 1200);
          return;
        }

        try {
          const result = await interact({
            sessionId: snapshot.sessionId,
            message: question,
          });
          const sources = { ...(snapshot.liveSources ?? {}) };
          const joinLines = adaptInteractTurnsToJoinLines(
            result.turns,
            snapshot.guests,
            sources,
            result.session.sources,
          );
          setState((cur) => ({
            ...cur,
            mode: "joined",
            joinN: joinLines.length ? 1 : 0,
            k: 0,
            playing: true,
            found5: true,
            liveJoinLines: joinLines.length ? joinLines : null,
            liveSources: Object.keys(sources).length ? sources : cur.liveSources,
            note: result.usedMockResearch
              ? "Interrupt research used mock/fallback sources"
              : "Panel answering your question",
            noteK: 0,
          }));
        } catch (error) {
          console.warn("[Experience] interact failed:", error);
          finishWithDemo(
            error instanceof Error
              ? `Interrupt API unavailable (${error.message}). Using demo replies.`
              : "Interrupt API unavailable. Using demo replies.",
          );
        }
      })();

      return snapshot;
    });
  };

  const handlers: ExperienceHandlers = {
    toggleSetup: () => setState((prev) => ({ ...prev, setupOpen: !prev.setupOpen })),
    setRegion: (value) => setState((prev) => ({ ...prev, region: value })),
    setLanguage: (value) => setState((prev) => ({ ...prev, language: value })),
    setDuration: (value) => setState((prev) => ({ ...prev, duration: value })),
    toggleTopic: (id) =>
      setState((prev) => {
        const on = prev.topics.includes(id);
        const next = on ? prev.topics.filter((x) => x !== id) : [...prev.topics, id];
        return next.length ? { ...prev, topics: next } : prev;
      }),
    pickDepth: (label) => setState((prev) => ({ ...prev, depth: label })),
    toggleGuest: (id: GuestKey) =>
      setState((prev) => {
        const on = prev.guests.includes(id);
        if (on) return { ...prev, guests: prev.guests.filter((x) => x !== id) };
        if (prev.guests.length < 3) return { ...prev, guests: [...prev.guests, id] };
        return prev;
      }),
    generate: () => {
      if (!state.guests.length) return;
      turnAudio.clear();
      lastSpokenKeyRef.current = null;

      setState((prev) => {
        const snapshot = prev;
        void (async () => {
          try {
            const config = buildPodcastConfig({
              topics: snapshot.topics,
              region: snapshot.region,
              language: snapshot.language,
              durationMinutes: snapshot.duration,
              depthLabel: snapshot.depth,
              guestKeys: snapshot.guests,
            });
            const { session } = await generatePodcast({ config });
            const adapted = adaptSessionToExperience(session);
            setState((current) => ({
              ...current,
              phase: "episode",
              setupOpen: false,
              playing: true,
              t: 0,
              k: 0,
              mode: "listen",
              joinN: 0,
              found5: false,
              openCite: null,
              sessionId: adapted.sessionId,
              liveScript: adapted.script,
              liveSources: adapted.sources,
              liveJoinLines: null,
              note: adapted.usedMockNews
                ? "Generated with mock/fallback news — sources labeled in notes"
                : `Generated: ${adapted.title}`,
              noteK: 0,
            }));
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Generation failed";
            setState((current) => ({
              ...current,
              phase: "episode",
              setupOpen: false,
              playing: true,
              t: 0,
              k: 0,
              mode: "listen",
              joinN: 0,
              found5: false,
              openCite: null,
              sessionId: null,
              liveScript: DEMO_SCRIPT,
              liveSources: DEMO_SOURCES,
              liveJoinLines: null,
              note: `API unavailable (${message}). Playing demo script.`,
              noteK: 0,
            }));
          }
        })();

        return {
          ...prev,
          phase: "generating",
          setupOpen: false,
          k: 0,
          t: 0,
          mode: "listen",
          playing: false,
          joinN: 0,
          found5: false,
          openCite: null,
          note: "Pulling news and writing the panel script…",
          noteK: 0,
          sessionId: null,
          liveScript: null,
          liveSources: null,
          liveJoinLines: null,
        };
      });
    },
    seekTo: (seconds) => setState((prev) => ({ ...prev, t: seconds + 0.01, openCite: null })),
    seekFraction: (fraction) =>
      setState((prev) => ({ ...prev, t: fraction * prev.duration * 60, openCite: null })),
    back15: () => setState((prev) => ({ ...prev, t: Math.max(0, prev.t - 15) })),
    fwd15: () => setState((prev) => ({ ...prev, t: Math.min(prev.duration * 60, prev.t + 15) })),
    togglePlay: () =>
      setState((prev) => {
        const total = prev.duration * 60;
        if (prev.t >= total) return { ...prev, t: 0, playing: true };
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
    pickSuggestion: (suggestion: SuggestionView) => {
      if (suggestion.skip) {
        setState((prev) => {
          const chapters = getChapters(prev.duration);
          const fifth = chapters[4];
          return {
            ...prev,
            mode: "listen",
            t: fifth.s + 0.01,
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

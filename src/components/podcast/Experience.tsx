"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EpisodeSetup } from "@/components/configuration/EpisodeSetup";
import { DEMO_JOIN_LINES, DEMO_VOICE_QUESTION, type GuestKey } from "@/data/mock/experience-demo";

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

/**
 * The entire interactive Experience screen: collapsible setup, player, chapters,
 * and sources, plus the user-interruption flow (voice → research → joined → resume).
 */
export function Experience() {
  const [state, setState] = useState<ExperienceState>(BASE_STATE);

  useEffect(() => {
    const id = setInterval(() => {
      setState((prev) => {
        if (prev.phase === "generating") {
          if (prev.k + 1 >= 12) {
            return { ...prev, phase: "episode", setupOpen: false, playing: true, t: 0, k: 0, mode: "listen" };
          }
          return { ...prev, k: prev.k + 1 };
        }
        if (prev.phase !== "episode") return prev;

        const total = prev.duration * 60;
        const patch: Partial<ExperienceState> = {};
        if (prev.note) {
          const noteK = prev.noteK + 1;
          patch.noteK = noteK;
          if (noteK > 24) patch.note = "";
        }

        if (prev.mode === "listen" && prev.playing) {
          let nt = prev.t + total / 720;
          let playing: boolean = prev.playing;
          if (nt >= total) {
            nt = total;
            playing = false;
          }
          patch.t = nt;
          patch.playing = playing;
        } else if (prev.mode === "voice") {
          if (prev.k + 1 >= 12) {
            return { ...prev, ...patch, ...startResearchPatch(DEMO_VOICE_QUESTION) };
          }
          patch.k = prev.k + 1;
        } else if (prev.mode === "research") {
          const k = prev.k + 1;
          const step = Math.floor(k / 5);
          patch.k = k;
          patch.step = step;
          if (step >= 2) patch.found5 = true;
          if (step >= 3) {
            patch.mode = "joined";
            patch.joinN = 1;
            patch.k = 0;
          }
        } else if (prev.mode === "joined" && prev.joinN < DEMO_JOIN_LINES.length) {
          if (prev.k + 1 >= 8) {
            patch.joinN = prev.joinN + 1;
            patch.k = 0;
          } else {
            patch.k = prev.k + 1;
          }
        }
        return { ...prev, ...patch };
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const view = deriveExperienceView(state);

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
    generate: () =>
      setState((prev) =>
        prev.guests.length
          ? {
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
              note: "",
            }
          : prev,
      ),
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
    submit: () =>
      setState((prev) => {
        const q = prev.draft.trim();
        return q ? { ...prev, ...startResearchPatch(q) } : prev;
      }),
    startVoice: () => setState((prev) => ({ ...prev, mode: "voice", k: 0, playing: false, openCite: null, note: "" })),
    cancelVoice: () => setState((prev) => ({ ...prev, mode: "listen", playing: true, k: 0 })),
    resume: () =>
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
          note: `Back in Chapter ${cur.num} · ${formatSeconds(prev.t)}`,
          noteK: 0,
        };
      }),
    pickSuggestion: (suggestion: SuggestionView) =>
      setState((prev) => {
        if (suggestion.skip) {
          const chapters = getChapters(prev.duration);
          const fifth = chapters[4];
          return {
            ...prev,
            mode: "listen",
            t: fifth.s + 0.01,
            playing: true,
            joinN: 0,
            question: "",
            note: "Skipped to Chapter 5",
            noteK: 0,
          };
        }
        return suggestion.q ? { ...prev, ...startResearchPatch(suggestion.q) } : prev;
      }),
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

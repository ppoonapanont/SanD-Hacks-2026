import {
  DEMO_CHAPTER_TEMPLATES,
  type DemoScriptLine,
  type DemoSource,
  type GuestKey,
} from "@/data/mock/experience-demo";

export type Phase = "setup" | "generating" | "episode";
export type Mode = "listen" | "voice" | "research" | "joined";

export interface ExperienceState {
  phase: Phase;
  setupOpen: boolean;
  topics: string[];
  region: string;
  language: string;
  duration: number;
  depth: string;
  guests: GuestKey[];
  /** Playback position, in seconds. */
  t: number;
  playing: boolean;
  mode: Mode;
  /** Generic step counter used by the generating/voice/research/joined tickers. */
  k: number;
  step: number;
  joinN: number;
  draft: string;
  openCite: string | null;
  note: string;
  noteK: number;
  question: string;
  found5: boolean;
  /** Live episode from Dev 1 Podcast Generator; null keeps demo script. */
  sessionId: string | null;
  liveScript: DemoScriptLine[] | null;
  liveSources: Record<number, DemoSource> | null;
}

export const BASE_STATE: ExperienceState = {
  phase: "setup",
  setupOpen: true,
  topics: ["business"],
  region: "Global",
  language: "English",
  duration: 12,
  depth: "Balanced",
  guests: ["ada", "theo", "wren"],
  t: 0,
  playing: false,
  mode: "listen",
  k: 0,
  step: 0,
  joinN: 0,
  draft: "",
  openCite: null,
  note: "",
  noteK: 0,
  question: "",
  found5: false,
  sessionId: null,
  liveScript: null,
  liveSources: null,
};

export interface Chapter {
  num: number;
  name: string;
  s: number;
  e: number;
}

/** Scales the baseline (12 min) chapter template to the chosen episode duration. */
export function getChapters(durationMinutes: number): Chapter[] {
  const scale = (durationMinutes * 60) / 720;
  return DEMO_CHAPTER_TEMPLATES.map((c, i) => ({
    num: i + 1,
    name: c.name,
    s: c.s * scale,
    e: c.e * scale,
  }));
}

export function currentChapter(chapters: Chapter[], t: number): Chapter {
  for (const c of chapters) {
    if (t >= c.s && t < c.e) return c;
  }
  return chapters[chapters.length - 1];
}

/**
 * The patch applied whenever a dynamic research/interruption flow starts.
 * `playing: true` so research/joined auto-advance by default — the user can
 * still pause it with the transport's play/pause button, same as the main episode.
 */
export function startResearchPatch(question: string): Partial<ExperienceState> {
  return {
    mode: "research",
    playing: true,
    question,
    k: 0,
    step: 0,
    joinN: 0,
    draft: "",
    openCite: null,
    note: "",
  };
}

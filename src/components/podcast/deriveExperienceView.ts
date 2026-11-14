import {
  DEMO_DEPTHS,
  DEMO_GUESTS,
  DEMO_JOIN_LINES,
  DEMO_SCRIPT,
  DEMO_SOURCES,
  DEMO_SUGGESTIONS,
  DEMO_TOPICS,
  GUEST_ORDER,
  HOST_PROFILE,
  type DemoGuestProfile,
  type GuestKey,
  type SpeakerCode,
} from "@/data/mock/experience-demo";
import { formatSeconds } from "@/utils/time";

import { playerTheme, type PlayerTheme } from "./theme";
import { currentChapter, getChapters, type Chapter, type ExperienceState } from "./state";

type Profile = DemoGuestProfile | typeof HOST_PROFILE;

export interface MemberView {
  key: string;
  short: string;
  role: string;
  color: string;
  radius: string;
  initials: string;
  fg: string;
  active: boolean;
  idle: boolean;
  eqColor: string;
  opacity: number;
  ring: string;
}

export interface RailItemView {
  num: number;
  name: string;
  start: number;
  end: number;
  width: number;
  startLabel: string;
  aria: string;
  bg: string;
  fg: string;
  weight: number;
  rowBg: string;
  numBg: string;
  numFg: string;
  isActive: boolean;
}

export interface CiteChipView {
  id: string;
  n: number;
  open: boolean;
  aria: string;
  bg: string;
  fg: string;
}

export interface SourceCardView {
  n: number;
  title: string;
  outlet: string;
  date: string;
  note: string;
  isLive: boolean;
  cited: boolean;
  border: string;
  background: string;
}

export interface TranscriptLineView {
  key: string;
  name: string;
  role: string;
  color: string;
  radius: string;
  initials: string;
  voiceId: string;
  nameColor: string;
  text: string;
  time?: string;
  opacity: number;
  fontSize: number;
  cites: CiteChipView[];
  openSource: { title: string; outlet: string; date: string; note: string } | null;
}

export interface TopicChipView {
  id: string;
  label: string;
  on: boolean;
  bg: string;
  fg: string;
  border: string;
}

export interface DepthOptionView {
  label: string;
  sub: string;
  on: boolean;
  bg: string;
  fg: string;
  border: string;
}

export interface GuestOptionView {
  id: GuestKey;
  name: string;
  role: string;
  style: string;
  color: string;
  radius: string;
  initials: string;
  on: boolean;
  disabled: boolean;
  opacity: number;
  border: string;
  background: string;
}

export interface StepView {
  label: string;
  done: boolean;
  active: boolean;
  pending: boolean;
  color: string;
}

export interface SuggestionView {
  label: string;
  q?: string;
  skip?: boolean;
}

export interface PillView {
  label: string;
  bg: string;
  fg: string;
  dot: string;
}

export interface ExperienceView {
  theme: PlayerTheme;
  pill: PillView;
  chapters: Chapter[];
  currentChapterNum: number;
  currentChapterName: string;
  setupOpen: boolean;
  showSummary: boolean;
  hasEpisode: boolean;
  isEmpty: boolean;
  isGenerating: boolean;
  isEpisode: boolean;
  isVoice: boolean;
  isResearch: boolean;
  isJoined: boolean;
  showLines: boolean;
  showQuestion: boolean;
  showComposer: boolean;
  playing: boolean;
  paused: boolean;
  playAriaLabel: string;
  controlsDisabled: boolean;
  controlsOpacity: number;
  playPauseDisabled: boolean;
  playPauseOpacity: number;
  progressPct: number;
  timeLabel: string;
  pausedLabel: string;
  region: string;
  language: string;
  duration: number;
  depth: string;
  guestCount: number;
  noGuests: boolean;
  summary: string;
  generateLabel: string;
  generatingSteps: StepView[];
  researchSteps: StepView[];
  members: MemberView[];
  rail: RailItemView[];
  lines: TranscriptLineView[];
  joinLines: TranscriptLineView[];
  joinTyping: boolean;
  joinDone: boolean;
  nextSpeakerName: string;
  question: string;
  youBubble: { bg: string; fg: string };
  hasNote: boolean;
  note: string;
  draft: string;
  composerPlaceholder: string;
  sourceList: SourceCardView[];
  sourceCount: number;
  waveDelays: number[];
  topicList: TopicChipView[];
  depthList: DepthOptionView[];
  guestOptions: GuestOptionView[];
  suggestions: SuggestionView[];
}

function profileFor(id: string): Profile {
  return id === "host" ? HOST_PROFILE : DEMO_GUESTS[id as GuestKey];
}

/** Pure projection from raw Experience state to everything the UI needs to render. */
export function deriveExperienceView(state: ExperienceState): ExperienceView {
  const total = state.duration * 60;
  const sc = total / 720;
  const chapters = getChapters(state.duration);
  const isEpisode = state.phase === "episode";
  const curCh = currentChapter(chapters, state.t);
  const mode = state.mode;

  const isLight = isEpisode && mode === "joined";
  const theme = playerTheme(isLight, isEpisode && mode === "research");

  const activeGuests: GuestKey[] = state.guests.length ? state.guests : ["ada"];
  const slot: Record<SpeakerCode, string> = {
    H: "host",
    A: activeGuests[0],
    B: activeGuests[1 % activeGuests.length],
    C: activeGuests[2 % activeGuests.length],
  };

  const episodeScript = state.liveScript ?? DEMO_SCRIPT;
  const episodeSources = state.liveSources ?? DEMO_SOURCES;

  function citeList(sourceNums: number[] | undefined, key: string): CiteChipView[] {
    return (sourceNums ?? []).map((n) => {
      const id = `${key}:${n}`;
      const open = state.openCite === id;
      const source = episodeSources[n];
      return {
        id,
        n,
        open,
        aria: `Source ${n}: ${source?.title ?? "Source"}`,
        bg: open ? "#97acc8" : theme.chip,
        fg: open ? "#051230" : theme.accentText,
      };
    });
  }

  function lineView(
    l: { s: SpeakerCode; x: string; c?: number[] },
    key: string,
    extra: Partial<TranscriptLineView> = {},
  ): TranscriptLineView {
    const p = profileFor(slot[l.s]);
    const cites = citeList(l.c, key);
    const openNum = cites.find((c) => c.open)?.n ?? null;
    return {
      key,
      name: p.name,
      role: p.role,
      color: p.color,
      radius: p.radius,
      initials: p.initials,
      voiceId: p.voiceId,
      nameColor: isLight ? theme.ink : p.color,
      text: l.x,
      opacity: 1,
      fontSize: 16,
      cites,
      openSource: openNum ? episodeSources[openNum] ?? null : null,
      ...extra,
    };
  }

  const shown: { line: (typeof episodeScript)[number]; idx: number }[] = [];
  episodeScript.forEach((l, idx) => {
    if (l.t * sc <= state.t + 0.001) shown.push({ line: l, idx });
  });
  const tail = shown.slice(-5);
  const ops = [0.34, 0.42, 0.52, 0.66, 1];
  const lines: TranscriptLineView[] = tail.map((o, j) => {
    const isCur = j === tail.length - 1;
    return lineView(o.line, `L${o.idx}`, {
      time: formatSeconds(o.line.t * sc),
      opacity: ops[5 - tail.length + j],
      fontSize: isCur ? 19 : 15,
    });
  });
  const curLine = tail.length ? tail[tail.length - 1].line : null;

  const joinLines: TranscriptLineView[] = DEMO_JOIN_LINES.slice(0, state.joinN).map((l, j) =>
    lineView(l, `J${j}`),
  );
  const joinDone = mode === "joined" && state.joinN >= DEMO_JOIN_LINES.length;
  const nextJoinLine = DEMO_JOIN_LINES[state.joinN];

  let activeId: string | null = null;
  if (mode === "listen" && state.playing && curLine) activeId = slot[curLine.s];
  if (mode === "joined" && !joinDone && nextJoinLine) activeId = slot[nextJoinLine.s];
  if (mode === "voice") activeId = "you";

  const memberIds = ["host", ...activeGuests];
  const members: MemberView[] = memberIds.map((id) => {
    const p = profileFor(id);
    const active = activeId === id;
    return {
      key: id,
      short: p.short,
      role: p.role.split(" ")[0],
      color: p.color,
      radius: p.radius,
      initials: p.initials,
      fg: "#051230",
      active,
      idle: !active,
      eqColor: isLight ? "#051230" : p.color,
      opacity: active ? 1 : mode === "research" ? 0.35 : 0.55,
      ring: active ? `0 0 0 3px ${theme.bg}, 0 0 0 6px ${isLight ? "#051230" : p.color}` : "none",
    };
  });

  if (isEpisode && mode !== "listen") {
    const youActive = activeId === "you";
    members.push({
      key: "you",
      short: "You",
      role: "On air",
      color: isLight ? "#051230" : "#e7ebee",
      radius: "50%",
      initials: "You",
      fg: isLight ? "#e7ebee" : "#051230",
      active: youActive,
      idle: !youActive,
      eqColor: "#e7ebee",
      opacity: 1,
      ring: `0 0 0 3px ${theme.bg}, 0 0 0 6px ${isLight ? "#051230" : "#e7ebee"}`,
    });
  }

  // Seeking/skipping chapters only makes sense while listening to the main episode.
  const controlsDisabled = !isEpisode || mode !== "listen";
  // Play/pause stays available through research/joined too — a live interruption
  // response should be pausable just like the episode itself, only recording
  // (voice mode) blocks it since there's nothing to pause there.
  const playPauseDisabled = !isEpisode || mode === "voice";
  const rail: RailItemView[] = chapters.map((c) => {
    const past = state.t >= c.e;
    const active = c.num === curCh.num;
    return {
      num: c.num,
      name: c.name,
      start: c.s,
      end: c.e,
      width: Math.round(c.e - c.s),
      startLabel: formatSeconds(c.s),
      aria: `Jump to chapter ${c.num}: ${c.name}`,
      bg: active ? theme.fill : past ? (isLight ? "rgba(5,18,48,0.4)" : "rgba(151,172,200,0.5)") : theme.track,
      fg: active ? theme.ink : theme.sub,
      weight: active ? 600 : 400,
      rowBg: active ? "rgba(151,172,200,0.14)" : "transparent",
      numBg: active ? "#97acc8" : "rgba(182,191,193,0.14)",
      numFg: active ? "#051230" : "#b6bfc1",
      isActive: active,
    };
  });

  let pill: PillView = { label: "Setting up", bg: "rgba(182,191,193,0.12)", fg: "#b6bfc1", dot: "#b6bfc1" };
  if (state.phase === "generating") {
    pill = { label: "Producing", bg: "rgba(151,172,200,0.16)", fg: "#97acc8", dot: "#97acc8" };
  }
  if (isEpisode) {
    if (mode === "listen") {
      pill = {
        label: state.playing ? "Listening" : "Paused",
        bg: "rgba(151,172,200,0.16)",
        fg: "#97acc8",
        dot: "#97acc8",
      };
    }
    if (mode === "voice") pill = { label: "Mic on", bg: "#e7ebee", fg: "#051230", dot: "#051230" };
    if (mode === "research") pill = { label: "Researching", bg: "rgba(151,172,200,0.16)", fg: "#97acc8", dot: "#97acc8" };
    if (mode === "joined") pill = { label: "You're live", bg: "#e7ebee", fg: "#051230", dot: "#051230" };
  }

  const topicLabels = DEMO_TOPICS.filter((t) => state.topics.includes(t.id)).map((t) => t.label);
  const summary = `${topicLabels.join(", ")} · ${state.region} · ${state.language} · ${state.duration} min · ${state.depth} · ${state.guests.length} ${state.guests.length === 1 ? "guest" : "guests"}`;

  const gk = Math.floor(state.k / 4);
  const generatingSteps: StepView[] = ["Finding stories", "Casting panel", "Writing script"].map((label, i) => ({
    label,
    done: i < gk,
    active: i === gk,
    pending: i > gk,
    color: i <= gk ? "#eef1f3" : "#b6bfc1",
  }));

  const researchLabels = [
    "Reading your question",
    state.step >= 2 ? "Found 1 new source" : "Searching sources",
    "Briefing the panel",
  ];
  const researchSteps: StepView[] = researchLabels.map((label, i) => ({
    label,
    done: i < state.step,
    active: i === state.step,
    pending: i > state.step,
    color: i <= state.step ? "#eef1f3" : "#b6bfc1",
  }));

  const cited = new Set<number>();
  const citeSource = mode === "joined" ? DEMO_JOIN_LINES.slice(0, state.joinN) : curLine ? [curLine] : [];
  citeSource.forEach((l) => (l.c ?? []).forEach((n) => cited.add(n)));
  const liveSourceIds = Object.keys(episodeSources)
    .map((key) => Number(key))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const sourceIds = state.liveSources
    ? liveSourceIds
    : [1, 2, 3, 4, ...(state.found5 ? [5] : [])];
  const sourceList: SourceCardView[] = sourceIds.flatMap((n) => {
    const src = episodeSources[n];
    if (!src) return [];
    const isCited = cited.has(n);
    return [
      {
        n,
        title: src.title,
        outlet: src.outlet,
        date: src.date,
        note: src.note,
        isLive: !state.liveSources && n === 5,
        cited: isCited,
        border: isCited ? "#97acc8" : "rgba(182,191,193,0.14)",
        background: isCited ? "rgba(151,172,200,0.10)" : "transparent",
      },
    ];
  });

  const waveDelays = Array.from({ length: 28 }, (_, w) => ((w * 37) % 100) / 100);

  return {
    theme,
    pill,
    chapters,
    currentChapterNum: curCh.num,
    currentChapterName: curCh.name,
    setupOpen: state.setupOpen,
    showSummary: !state.setupOpen && state.phase !== "setup",
    hasEpisode: state.phase !== "setup",
    isEmpty: state.phase === "setup",
    isGenerating: state.phase === "generating",
    isEpisode,
    isVoice: isEpisode && mode === "voice",
    isResearch: isEpisode && mode === "research",
    isJoined: isEpisode && mode === "joined",
    showLines: mode === "listen" || mode === "voice",
    showQuestion: mode === "research" || mode === "joined",
    showComposer: mode === "listen" || mode === "joined",
    playing: state.playing,
    paused: !state.playing,
    playAriaLabel: state.playing ? "Pause" : "Play",
    controlsDisabled,
    controlsOpacity: controlsDisabled ? 0.4 : 1,
    playPauseDisabled,
    playPauseOpacity: playPauseDisabled ? 0.4 : 1,
    progressPct: Math.min(100, (state.t / total) * 100),
    timeLabel: `${formatSeconds(state.t)} / ${formatSeconds(total)}`,
    pausedLabel: formatSeconds(state.t),
    region: state.region,
    language: state.language,
    duration: state.duration,
    depth: state.depth,
    guestCount: state.guests.length,
    noGuests: state.guests.length === 0,
    summary,
    generateLabel: state.phase === "setup" ? "Generate episode" : "Regenerate episode",
    generatingSteps,
    researchSteps,
    members,
    rail,
    lines,
    joinLines,
    joinTyping: mode === "joined" && !joinDone,
    joinDone,
    nextSpeakerName: nextJoinLine ? profileFor(slot[nextJoinLine.s]).short : "",
    question: state.question,
    youBubble: isLight ? { bg: "#051230", fg: "#e7ebee" } : { bg: "#e7ebee", fg: "#051230" },
    hasNote: !!state.note && mode === "listen",
    note: state.note,
    draft: state.draft,
    composerPlaceholder: mode === "joined" ? "Follow up…" : "Ask or steer…",
    sourceList,
    sourceCount: sourceIds.length,
    waveDelays,
    topicList: DEMO_TOPICS.map((tp) => {
      const on = state.topics.includes(tp.id);
      return {
        id: tp.id,
        label: tp.label,
        on,
        bg: on ? "#97acc8" : "transparent",
        fg: on ? "#051230" : "#eef1f3",
        border: on ? "#97acc8" : "rgba(182,191,193,0.3)",
      };
    }),
    depthList: DEMO_DEPTHS.map((d) => {
      const on = state.depth === d.label;
      return {
        label: d.label,
        sub: d.sub,
        on,
        bg: on ? "#97acc8" : "transparent",
        fg: on ? "#051230" : "#eef1f3",
        border: on ? "#97acc8" : "rgba(182,191,193,0.3)",
      };
    }),
    guestOptions: GUEST_ORDER.map((id) => {
      const p = DEMO_GUESTS[id];
      const on = state.guests.includes(id);
      const disabled = !on && state.guests.length >= 3;
      return {
        id,
        name: p.name,
        role: p.role,
        style: p.style,
        color: p.color,
        radius: p.radius,
        initials: p.initials,
        on,
        disabled,
        opacity: disabled ? 0.45 : 1,
        border: on ? p.color : "rgba(182,191,193,0.2)",
        background: on ? "rgba(151,172,200,0.10)" : "transparent",
      };
    }),
    suggestions: DEMO_SUGGESTIONS,
  };
}

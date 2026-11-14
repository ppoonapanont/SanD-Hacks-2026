/**
 * Scripted demo content for the Experience screen prototype.
 *
 * This is entirely mock/fabricated dialogue used to demonstrate the
 * interactive player (chapters, citations, interruption, live research)
 * before the real Mastra/Gemini pipeline is wired in. None of this is
 * real news or a real quote — isMock-equivalent for the UI layer.
 */

export type GuestKey = "ada" | "theo" | "wren" | "sol" | "kai";
export type SpeakerCode = "H" | "A" | "B" | "C";

export interface DemoGuestProfile {
  id: GuestKey;
  name: string;
  short: string;
  role: string;
  style: string;
  color: string;
  radius: string;
  initials: string;
}

export const HOST_PROFILE = {
  id: "host" as const,
  name: "Mira",
  short: "Mira",
  role: "AI host",
  style: "Keeps it moving",
  color: "#97acc8",
  radius: "50%",
  initials: "Mi",
};

export const DEMO_GUESTS: Record<GuestKey, DemoGuestProfile> = {
  ada: {
    id: "ada",
    name: "Dr. Ada Lin",
    short: "Ada",
    role: "Labor economist",
    style: "Data-first skeptic",
    color: "#e3b98a",
    radius: "16px",
    initials: "AL",
  },
  theo: {
    id: "theo",
    name: "Theo Okafor",
    short: "Theo",
    role: "Operations strategist",
    style: "Pragmatic builder",
    color: "#8fcaa8",
    radius: "50% 50% 50% 12px",
    initials: "TO",
  },
  wren: {
    id: "wren",
    name: "Prof. Wren Hale",
    short: "Wren",
    role: "Historian of work",
    style: "Long-view contrarian",
    color: "#e29fb0",
    radius: "12px 50% 12px 50%",
    initials: "WH",
  },
  sol: {
    id: "sol",
    name: "Sol Rivera",
    short: "Sol",
    role: "Behavioral scientist",
    style: "Asks why people act",
    color: "#b6a6e6",
    radius: "50% 50% 12px 12px",
    initials: "SR",
  },
  kai: {
    id: "kai",
    name: "Kai Mori",
    short: "Kai",
    role: "Markets analyst",
    style: "Follows the money",
    color: "#e8d27a",
    radius: "6px",
    initials: "KM",
  },
};

export const GUEST_ORDER: GuestKey[] = ["ada", "theo", "wren", "sol", "kai"];

export const DEMO_TOPICS: { id: string; label: string }[] = [
  { id: "fourday", label: "Four-day work week" },
  { id: "aiclass", label: "AI in classrooms" },
  { id: "grid", label: "Heat and the power grid" },
  { id: "housing", label: "Housing costs" },
  { id: "space", label: "Commercial spaceflight" },
];

export const DEMO_DEPTHS: { label: string; sub: string }[] = [
  { label: "Headlines", sub: "Quick takes" },
  { label: "Balanced", sub: "Context + debate" },
  { label: "Deep dive", sub: "Evidence-heavy" },
];

/** Chapter boundaries in seconds, scaled against a 720s (12 min) baseline episode. */
export const DEMO_CHAPTER_TEMPLATES: { name: string; s: number; e: number }[] = [
  { name: "Cold open", s: 0, e: 90 },
  { name: "What changed this week", s: 90, e: 240 },
  { name: "The productivity question", s: 240, e: 420 },
  { name: "Who gets left out", s: 420, e: 600 },
  { name: "What to watch", s: 600, e: 720 },
];

export interface DemoSource {
  title: string;
  outlet: string;
  date: string;
  note: string;
}

export const DEMO_SOURCES: Record<number, DemoSource> = {
  1: {
    title: "Logistics operator moves to a four-day week after pilot",
    outlet: "The Freight Ledger",
    date: "Nov 12",
    note: "Company-wide rollout follows a pilot across its warehouse sites.",
  },
  2: {
    title: "Regional public-sector four-day trial opens",
    outlet: "Civic Wire",
    date: "Nov 11",
    note: "Departments can apply to join a year-long trial.",
  },
  3: {
    title: "Why self-reported productivity is a weak signal",
    outlet: "Workplace Research Quarterly",
    date: "Oct 2026",
    note: "A review of how pilot studies measure output.",
  },
  4: {
    title: "Coverage roles and the compressed week",
    outlet: "Labor Review",
    date: "Nov 9",
    note: "How shift-based jobs adapt when hours shrink.",
  },
  5: {
    title: "Hospitals test compressed rotations for nurses",
    outlet: "Health Systems Weekly",
    date: "Nov 13",
    note: "Found while researching your question.",
  },
};

export interface DemoScriptLine {
  t: number;
  s: SpeakerCode;
  x: string;
  c?: number[];
}

export const DEMO_SCRIPT: DemoScriptLine[] = [
  { t: 0, s: "H", x: "Welcome back. Another wave of companies announced four-day-week pilots this week, and our panel does not agree on what it means." },
  { t: 14, s: "A", x: "I'll start with the uncomfortable part: the pilots that make headlines are the ones that worked." },
  { t: 34, s: "B", x: "Sure, but the ones that worked didn't just cut a day. They cut meetings and rewrote how work flows." },
  { t: 58, s: "C", x: "We have been here before. The weekend itself was once a fight people called impossible." },
  { t: 90, s: "H", x: "Let's ground this. What actually changed this week?" },
  { t: 104, s: "A", x: "Two things: a large logistics firm went company-wide after its pilot, and a regional government opened a public-sector trial.", c: [1, 2] },
  { t: 142, s: "B", x: "The logistics one matters more. That's shift work, not a software team with flexible hours.", c: [1] },
  { t: 186, s: "C", x: "And the public trial is the real test: unions, budgets, voters. Entirely different incentives.", c: [2] },
  { t: 240, s: "H", x: "So does output actually hold up?" },
  { t: 254, s: "A", x: "Honestly, it depends on how you measure. Self-reported productivity is the easiest thing to inflate.", c: [3] },
  { t: 300, s: "B", x: "Which is why I watch error rates and turnover, not surveys. Those are harder to fake." },
  { t: 352, s: "C", x: "Turnover is the sleeper metric. Replacing people costs more than most managers admit." },
  { t: 420, s: "H", x: "Who gets left out of this?" },
  { t: 434, s: "B", x: "Anyone whose job is defined by coverage. You can't compress a night shift.", c: [4] },
  { t: 482, s: "A", x: "Then it becomes a staffing question, and staffing is a budget question, not a culture one." },
  { t: 540, s: "C", x: "Historically, that is exactly where reforms stall. They reach some workers decades before others." },
  { t: 600, s: "H", x: "Last segment. What should listeners watch for?" },
  { t: 614, s: "A", x: "Whether the logistics firm keeps it through its busy season.", c: [1] },
  { t: 650, s: "B", x: "Whether anyone publishes the boring data: error rates, sick days, attrition." },
  { t: 688, s: "C", x: "And whether it ever becomes policy anywhere, or stays a perk." },
  { t: 710, s: "H", x: "That's our panel. Thanks for listening, and for jumping in." },
];

export interface DemoJoinLine {
  s: SpeakerCode;
  x: string;
  c?: number[];
}

export const DEMO_JOIN_LINES: DemoJoinLine[] = [
  { s: "H", x: "Good question. Let me bring that to the panel." },
  { s: "B", x: "Hospitals are the hard case. Coverage roles need more people, not the same people working fewer days.", c: [4] },
  { s: "C", x: "A few hospital systems are testing compressed rotations instead: longer shifts, fewer days. It trades one strain for another.", c: [5] },
  { s: "A", x: "So in a hospital, a four-day week is a staffing budget decision before it is anything else." },
  { s: "H", x: "Want to keep going? Ask a follow-up, or head back to where we were." },
];

export const DEMO_VOICE_QUESTION = "Wait, does this actually work for hospitals?";

export const DEMO_SUGGESTIONS: { label: string; q?: string; skip?: boolean }[] = [
  { label: "Hospitals?", q: "What about hospitals?" },
  { label: "Simpler", q: "Explain that more simply." },
  { label: "Push back", q: "Push back on that." },
  { label: "Skip ahead", skip: true },
];

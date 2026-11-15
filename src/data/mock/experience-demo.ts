import type { AvatarKey } from "@/components/guests/avatarCharacters";

/**
 * Scripted demo content for the Experience screen prototype.
 *
 * This is entirely mock/fabricated dialogue used to demonstrate the
 * interactive player (chapters, citations, interruption, live research)
 * before the real Mastra/Gemini pipeline is wired in. None of this is
 * real news or a real quote — isMock-equivalent for the UI layer.
 */

export type GuestKey =
  | "investor"
  | "founder"
  | "economist"
  | "historian"
  | "politician"
  | "diplomat";
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
  /** Which Bible Strong Avatar Lab character renders this guest's bot avatar. */
  avatarKey: AvatarKey;
  /** ElevenLabs voice ID — replace with a real voice once one is picked for this persona. */
  voiceId: string;
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
  avatarKey: "host" as AvatarKey,
  /** ElevenLabs stock voice "Jessica" (Playful, Bright, Warm — female, American). */
  voiceId: "cgSgspJ2msm6clMCkdW9",
};

export const DEMO_GUESTS: Record<GuestKey, DemoGuestProfile> = {
  investor: {
    id: "investor",
    name: "Jordan Blake",
    short: "Jordan",
    role: "Investor",
    style: "How will this affect semiconductor stocks?",
    color: "#e8d27a",
    radius: "6px",
    initials: "JB",
    avatarKey: "investor",
    /** ElevenLabs stock voice "Eric" (Smooth, Trustworthy — male, American). */
    voiceId: "cjVigY5qzO86Huf0OWal",
  },
  founder: {
    id: "founder",
    name: "Ava Chen",
    short: "Ava",
    role: "Tech Founder",
    style: "How will this affect innovation?",
    color: "#8fcaa8",
    radius: "16px",
    initials: "AC",
    avatarKey: "founder",
    /** ElevenLabs stock voice "Laura" (Enthusiast, Quirky Attitude — female, American). */
    voiceId: "FGY2WhTYpPnrIDTdsKH5",
  },
  economist: {
    id: "economist",
    name: "Dr. Marcus Hale",
    short: "Marcus",
    role: "Economist",
    style: "What are the consequences for global trade?",
    color: "#e3b98a",
    radius: "50% 50% 50% 12px",
    initials: "MH",
    avatarKey: "economist",
    /** ElevenLabs stock voice "Bill" (Wise, Mature, Balanced — male, American). */
    voiceId: "pqHfZKP75CvOlQylNhV4",
  },
  historian: {
    id: "historian",
    name: "Prof. Lena Okonkwo",
    short: "Lena",
    role: "Historian",
    style: "Have similar trade restrictions worked before?",
    color: "#e29fb0",
    radius: "12px 50% 12px 50%",
    initials: "LO",
    avatarKey: "historian",
    /** ElevenLabs stock voice "Sarah" (Mature, Reassuring, Confident — female, American). */
    voiceId: "EXAVITQu4vr4xnSDxMaL",
  },
  politician: {
    id: "politician",
    name: "Rep. Sam Ortega",
    short: "Sam",
    role: "Politician",
    style: "What policy should the government pursue?",
    color: "#b6a6e6",
    radius: "50% 50% 12px 12px",
    initials: "SO",
    avatarKey: "politician",
    /** ElevenLabs stock voice "Chris" (Charming, Down-to-Earth — male, American). */
    voiceId: "iP95p4xoKVk53GoZ742B",
  },
  diplomat: {
    id: "diplomat",
    name: "Amb. Priya Shah",
    short: "Priya",
    role: "Diplomat",
    style: "How will China respond?",
    color: "#97acc8",
    radius: "18px 18px 6px 18px",
    initials: "PS",
    avatarKey: "diplomat",
    /** ElevenLabs stock voice "Bella" (Professional, Bright, Warm — female, American). */
    voiceId: "hpp4J3VqNfWAUOO0d1Us",
  },
};

export const GUEST_ORDER: GuestKey[] = [
  "investor",
  "founder",
  "economist",
  "historian",
  "politician",
  "diplomat",
];

/**
 * Closed topic selection ("What do you want to know today?") modeled on NYTimes
 * section names. These labels are sent as real search queries to Bright Data, so
 * broader section-style terms return better live results than narrow invented ones.
 */
export const DEMO_TOPICS: { id: string; label: string }[] = [
  { id: "world", label: "World" },
  { id: "us", label: "U.S." },
  { id: "politics", label: "Politics" },
  { id: "business", label: "Business" },
  { id: "technology", label: "Technology" },
  { id: "science", label: "Science" },
  { id: "health", label: "Health" },
  { id: "climate", label: "Climate" },
  { id: "sports", label: "Sports" },
  { id: "arts", label: "Arts" },
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
    title: "U.S. tightens export licenses on advanced AI chips",
    outlet: "The Trade Desk",
    date: "Nov 12",
    note: "New rules expand licensing for high-bandwidth memory and advanced accelerators.",
  },
  2: {
    title: "Suppliers redraw China-facing chip routes",
    outlet: "Supply Chain Wire",
    date: "Nov 11",
    note: "Vendors begin dual-tracking customers under updated controls.",
  },
  3: {
    title: "Why export bans move stock prices faster than capability",
    outlet: "Markets Research Quarterly",
    date: "Oct 2026",
    note: "A review of how markets price technology restrictions.",
  },
  4: {
    title: "Startups and the older-node workaround",
    outlet: "Founders Review",
    date: "Nov 9",
    note: "How smaller teams redesign products when leading-edge access shrinks.",
  },
  5: {
    title: "Historical playbook: when trade curbs invite counters",
    outlet: "Diplomatic Brief",
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
  { t: 0, s: "H", x: "Welcome back. New export controls are hitting advanced chips, and our panel does not agree on what comes next." },
  { t: 14, s: "A", x: "Markets already flinched. If fabs and toolmakers get squeezed, semiconductor stocks will feel it first." },
  { t: 34, s: "B", x: "And founders feel it next. When you choke the supply chain, you don't just raise prices — you slow the next product cycle." },
  { t: 58, s: "C", x: "Zoom out: trade frictions like this ripple through shipping, pricing, and alliances long before the politics settle." },
  { t: 90, s: "H", x: "Let's ground this. What actually changed this week?" },
  { t: 104, s: "A", x: "Two things: tighter licensing on high-end chips, and suppliers racing to redraw who they can sell to.", c: [1, 2] },
  { t: 142, s: "B", x: "The licensing one matters more for builders. Uncertainty kills roadmaps faster than a clear ban.", c: [1] },
  { t: 186, s: "C", x: "And the redraw is the real stress test for global trade. Once routes fragment, they rarely snap back cleanly.", c: [2] },
  { t: 240, s: "H", x: "So do restrictions like this actually work?" },
  { t: 254, s: "A", x: "Depends what you mean by work. Stock prices react overnight. Capability gaps take years.", c: [3] },
  { t: 300, s: "B", x: "Which is why I watch where R&D relocates, not just the headline ban." },
  { t: 352, s: "C", x: "History says partners adapt. The question is whether adaptation looks like compliance or workarounds." },
  { t: 420, s: "H", x: "Who absorbs the cost?" },
  { t: 434, s: "B", x: "Smaller firms first. They can't dual-source overnight the way giants can.", c: [4] },
  { t: 482, s: "A", x: "Then it becomes a capital question — who can wait out the disruption." },
  { t: 540, s: "C", x: "And a diplomatic one. Retaliation rarely mirrors the original tool; it hits somewhere softer." },
  { t: 600, s: "H", x: "Last segment. What should listeners watch for?" },
  { t: 614, s: "A", x: "Whether chipmakers revise guidance, not just issue statements.", c: [1] },
  { t: 650, s: "B", x: "Whether startups quietly redesign products around older nodes." },
  { t: 688, s: "C", x: "And whether counterparties answer with tariffs, export bans, or something quieter." },
  { t: 710, s: "H", x: "That's our panel. Thanks for listening, and for jumping in." },
];

export interface DemoJoinLine {
  s: SpeakerCode;
  x: string;
  c?: number[];
}

export const DEMO_JOIN_LINES: DemoJoinLine[] = [
  { s: "H", x: "Good question. Let me bring that to the panel." },
  { s: "B", x: "Innovation slows when teams can't get the parts they planned around. You don't cancel the roadmap — you stretch it.", c: [4] },
  { s: "C", x: "We've seen versions of this before. Restrictions can buy time, but they rarely freeze the other side's progress forever.", c: [5] },
  { s: "A", x: "So for markets, the near-term hit is valuation. The longer question is who owns the next generation of capacity." },
  { s: "H", x: "Want to keep going? Ask a follow-up, or head back to where we were." },
];

export const DEMO_VOICE_QUESTION = "Wait — how will China respond to this?";

export const DEMO_SUGGESTIONS: { label: string; q?: string; skip?: boolean }[] = [
  { label: "China?", q: "How will China respond?" },
  { label: "Stocks", q: "How will this affect semiconductor stocks?" },
  { label: "History", q: "Have similar trade restrictions worked before?" },
  { label: "Skip ahead", skip: true },
];

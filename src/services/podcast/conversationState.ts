import type { ConversationTurn, Guest, NewsSource, PodcastSession } from "@/types";

export interface ConversationState {
  /** Lead story listeners should hear about (not a category chip). */
  storyFocus: string;
  /** One-line why it matters, from source summary when available. */
  storyWhy: string;
  lastSpeakerId: string;
  lastSpeakerName: string;
  lastText: string;
  lastWasQuestion: boolean;
  /** Guest id the last speaker addressed, if detectable. */
  addressedGuestId: string | null;
  /** Open question waiting for an answer (usually after a host/guest ask). */
  pendingQuestion: string | null;
  pendingAnswerGuestId: string | null;
  recentClaimFingerprints: string[];
  guestSpeakCounts: Record<string, number>;
  guestStreak: number;
  turnCount: number;
}

function normalizeClaim(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Detect which panel guest a line addresses by name. */
export function findAddressedGuestId(
  text: string,
  guests: Guest[],
): string | null {
  const raw = text.trim();
  if (!raw || !guests.length) return null;

  for (const guest of guests) {
    const first = guest.name.trim().split(/\s+/)[0] ?? guest.name;
    const patterns = [
      new RegExp(`\\b${escapeReg(guest.name)}\\b`, "i"),
      new RegExp(`\\b${escapeReg(first)}\\s*[,:]`, "i"),
      new RegExp(`\\b(?:for|to|ask)\\s+${escapeReg(first)}\\b`, "i"),
    ];
    if (patterns.some((re) => re.test(raw))) {
      return guest.id;
    }
  }
  return null;
}

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isQuestionText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/\?\s*$/.test(t)) return true;
  return /^(what|why|how|who|where|when|should|could|would|is|are|do|does|can)\b/i.test(
    t,
  );
}

/**
 * Concrete story label for prompts/fallbacks — prefer a news headline over
 * a category chip like "Business".
 */
export function resolveStoryFocus(
  session: Pick<PodcastSession, "outline" | "sources" | "config" | "currentTopicId">,
): { storyFocus: string; storyWhy: string } {
  const topic =
    session.outline?.topics.find((t) => t.id === session.currentTopicId) ??
    session.outline?.topics[0];
  const lead: NewsSource | undefined = session.sources[0];
  const category = session.config.topics[0]?.trim();

  const topicTitle = topic?.title?.trim() ?? "";
  const looksLikeCategory =
    !topicTitle ||
    /^headlines$/i.test(topicTitle) ||
    (category && topicTitle.toLowerCase() === category.toLowerCase());

  const storyFocus =
    (!looksLikeCategory && topicTitle) ||
    lead?.title?.trim() ||
    topic?.description?.trim() ||
    category ||
    "today's story";

  const storyWhy =
    lead?.summary?.trim().slice(0, 160) ||
    topic?.description?.trim().slice(0, 160) ||
    "";

  return { storyFocus, storyWhy };
}

export function deriveConversationState(
  session: Pick<
    PodcastSession,
    "turns" | "outline" | "sources" | "config" | "currentTopicId"
  >,
): ConversationState {
  const turns = session.turns;
  const guests = session.config.guests;
  const last = turns[turns.length - 1];
  const { storyFocus, storyWhy } = resolveStoryFocus(session);

  const guestSpeakCounts: Record<string, number> = {};
  for (const g of guests) guestSpeakCounts[g.id] = 0;
  for (const t of turns) {
    if (t.speakerType === "guest" && guestSpeakCounts[t.speakerId] != null) {
      guestSpeakCounts[t.speakerId] += 1;
    }
  }

  let guestStreak = 0;
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i]!;
    if (t.speakerType === "host" || t.speakerId === "host") break;
    guestStreak += 1;
  }

  const lastText = last?.text?.trim() ?? "";
  const lastWasQuestion = last ? isQuestionText(lastText) : false;
  const addressedGuestId = last
    ? findAddressedGuestId(lastText, guests)
    : null;

  let pendingQuestion: string | null = null;
  let pendingAnswerGuestId: string | null = null;
  if (last && lastWasQuestion) {
    pendingQuestion = lastText;
    pendingAnswerGuestId =
      addressedGuestId ??
      (last.speakerType === "host"
        ? leastRecentGuestId(guests, guestSpeakCounts, last.speakerId)
        : guests.find((g) => g.id !== last.speakerId)?.id ?? null);
  }

  const recentClaimFingerprints = turns
    .slice(-6)
    .map((t) => normalizeClaim(t.text))
    .filter(Boolean);

  return {
    storyFocus,
    storyWhy,
    lastSpeakerId: last?.speakerId ?? "",
    lastSpeakerName: last?.speakerName ?? "",
    lastText,
    lastWasQuestion,
    addressedGuestId,
    pendingQuestion,
    pendingAnswerGuestId,
    recentClaimFingerprints,
    guestSpeakCounts,
    guestStreak,
    turnCount: turns.length,
  };
}

function leastRecentGuestId(
  guests: Guest[],
  counts: Record<string, number>,
  excludeId: string,
): string | null {
  const pool = guests.filter((g) => g.id !== excludeId);
  if (!pool.length) return guests[0]?.id ?? null;
  pool.sort(
    (a, b) => (counts[a.id] ?? 0) - (counts[b.id] ?? 0) || a.name.localeCompare(b.name),
  );
  return pool[0]?.id ?? null;
}

/** Rough check that a new line isn't just restating a recent claim. */
export function isRepetitiveClaim(
  text: string,
  recentFingerprints: string[],
): boolean {
  const next = normalizeClaim(text);
  if (next.length < 24) return false;
  return recentFingerprints.some((prev) => {
    if (!prev || prev.length < 24) return false;
    if (prev === next) return true;
    const shorter = prev.length < next.length ? prev : next;
    const longer = prev.length < next.length ? next : prev;
    return longer.includes(shorter.slice(0, Math.min(60, shorter.length)));
  });
}

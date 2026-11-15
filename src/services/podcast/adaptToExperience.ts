import type {
  DemoJoinLine,
  DemoScriptLine,
  DemoSource,
  SpeakerCode,
} from "@/data/mock/experience-demo";
import type { ConversationTurn, NewsSource, PodcastSession } from "@/types";

export interface ExperienceEpisodePayload {
  script: DemoScriptLine[];
  sources: Record<number, DemoSource>;
  sessionId: string;
  title: string;
  usedMockNews: boolean;
}

/**
 * Maps a backend PodcastSession into the Experience UI's script/source shapes.
 * Citation numbers are 1-based indexes into the returned sources map.
 */
export function adaptSessionToExperience(
  session: PodcastSession,
  options?: { usedMockNews?: boolean },
): ExperienceEpisodePayload {
  const sourceIndexById = new Map<string, number>();
  const sources: Record<number, DemoSource> = {};

  session.sources.forEach((source, index) => {
    const n = index + 1;
    sourceIndexById.set(source.id, n);
    sources[n] = toDemoSource(source);
  });

  const guestIds = session.config.guests.map((guest) => guest.id);
  const script = session.turns
    .map((turn) => toDemoLine(turn, guestIds, sourceIndexById))
    .filter((line): line is DemoScriptLine => Boolean(line))
    .sort((a, b) => a.t - b.t);

  return {
    script:
      script.length > 0
        ? script
        : [
            {
              t: 0,
              s: "H",
              x: "We couldn't build a full script from the latest sources. Try generating again.",
            },
          ],
    sources,
    sessionId: session.id,
    title: session.outline?.title ?? "Generated episode",
    usedMockNews: options?.usedMockNews ?? session.sources.some((s) => s.isMock),
  };
}

/** Keep only clickable http(s) article links for the Sources panel. */
function articleHref(url: string | undefined): string | undefined {
  const raw = url?.trim();
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function toDemoSource(source: NewsSource): DemoSource {
  const published = source.publishedAt
    ? new Date(source.publishedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "";

  return {
    title: source.title,
    outlet: source.publisher,
    date: published,
    note: source.isMock
      ? `Mock/demo source. ${source.summary.slice(0, 160)}`
      : source.summary.slice(0, 180),
    url: articleHref(source.url),
  };
}

/** Map a single ConversationTurn into an Experience script line. */
export function adaptTurnToScriptLine(
  turn: ConversationTurn,
  guestIds: string[],
  sources: NewsSource[],
): DemoScriptLine | null {
  const sourceIndexById = new Map<string, number>();
  sources.forEach((source, index) => {
    sourceIndexById.set(source.id, index + 1);
  });
  return toDemoLine(turn, guestIds, sourceIndexById);
}

function toDemoLine(
  turn: ConversationTurn,
  guestIds: string[],
  sourceIndexById: Map<string, number>,
): DemoScriptLine | null {
  const text = turn.text?.trim();
  if (!text) return null;

  const s = speakerCodeFor(turn, guestIds);
  const c = (turn.sourceIds ?? [])
    .map((id) => sourceIndexById.get(id))
    .filter((n): n is number => typeof n === "number");

  return {
    t: typeof turn.timestamp === "number" ? turn.timestamp : 0,
    s,
    x: text,
    ...(c.length ? { c } : {}),
  };
}

function speakerCodeFor(
  turn: ConversationTurn,
  guestIds: string[],
): SpeakerCode {
  if (turn.speakerType === "host" || turn.speakerId === "host") return "H";

  const index = guestIds.findIndex((id) => id === turn.speakerId);
  if (index === 0) return "A";
  if (index === 1) return "B";
  if (index >= 2) return "C";
  return "A";
}

/**
 * Maps interrupt response turns (skip the user message) into Experience join lines.
 * Citation numbers are remapped into the provided sources map when possible.
 */
export function adaptInteractTurnsToJoinLines(
  turns: ConversationTurn[],
  guestIds: string[],
  sources: Record<number, DemoSource>,
  sessionSources: NewsSource[],
): DemoJoinLine[] {
  const sourceIndexById = new Map<string, number>();
  sessionSources.forEach((source, index) => {
    sourceIndexById.set(source.id, index + 1);
    if (!sources[index + 1]) {
      sources[index + 1] = toDemoSource(source);
    }
  });

  return turns
    .filter((turn) => turn.speakerType !== "user")
    .map((turn) => {
      const text = turn.text?.trim();
      if (!text) return null;
      const c = (turn.sourceIds ?? [])
        .map((id) => sourceIndexById.get(id))
        .filter((n): n is number => typeof n === "number");
      const line: DemoJoinLine = {
        s: speakerCodeFor(turn, guestIds),
        x: text,
        ...(c.length ? { c } : {}),
      };
      return line;
    })
    .filter((line): line is DemoJoinLine => Boolean(line));
}

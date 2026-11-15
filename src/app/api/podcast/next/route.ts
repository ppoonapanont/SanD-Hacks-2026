import { NextResponse } from "next/server";

import { getSession, updateSession } from "@/lib/sessions";
import { advancePodcastTurn } from "@/services/podcast/nextTurn";
import type { NextTurnRequest, NextTurnResponse } from "@/types";

// Line generation budgets up to ~12s internally (LINE_TIMEOUT_MS); Vercel's
// default function timeout (10s on Hobby) would kill the request before that
// timeout ever fires, hanging the client with no response at all.
export const maxDuration = 60;

/** In-memory turn cursor per session for precomputed (script) /next advancement. */
const nextTurnCursors = new Map<string, number>();

/**
 * POST /api/podcast/next
 * - live sessions: Moderator + Guest/Host generate the next turn
 * - script sessions: walk precomputed turns (v1)
 */
export async function POST(request: Request) {
  let body: NextTurnRequest;

  try {
    body = (await request.json()) as NextTurnRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 },
    );
  }

  const session = getSession(body.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Podcast not found" }, { status: 404 });
  }

  if (session.generationMode === "live") {
    try {
      const result = await advancePodcastTurn(body.sessionId);
      if (result.done && !result.generated) {
        return NextResponse.json(
          {
            error: "Episode complete",
            code: "COMPLETED",
            session: result.session,
          },
          { status: 409 },
        );
      }
      if (result.errors.length) {
        console.warn("[podcast/next]", result.errors.join("; "));
      }
      const response: NextTurnResponse = {
        session: result.session,
        turn: result.turn,
        generated: result.generated,
        done: result.done,
        ...(result.errors.length ? { errors: result.errors } : {}),
      };
      return NextResponse.json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Next turn generation failed";
      const status = message === "Podcast not found" ? 404 : 500;
      return NextResponse.json(
        {
          error: message,
          code: status === 404 ? "NOT_FOUND" : "NEXT_FAILED",
        },
        { status },
      );
    }
  }

  const cursor = nextTurnCursors.get(body.sessionId) ?? 0;
  if (cursor >= session.turns.length) {
    const completed = updateSession(body.sessionId, (current) => ({
      ...current,
      status: "completed",
    }));
    return NextResponse.json(
      {
        error: "Episode complete",
        code: "COMPLETED",
        session: completed ?? session,
      },
      { status: 409 },
    );
  }

  const turn = session.turns[cursor];
  nextTurnCursors.set(body.sessionId, cursor + 1);

  const updated =
    updateSession(body.sessionId, (current) => ({
      ...current,
      status: "playing",
      currentTopicId: turn.topicId ?? current.currentTopicId,
    })) ?? session;

  const response: NextTurnResponse = {
    session: updated,
    turn,
    generated: false,
    done: cursor + 1 >= session.turns.length,
  };
  return NextResponse.json(response);
}

import { NextResponse } from "next/server";

import { getSession, updateSession } from "@/lib/sessions";
import type { NextTurnRequest, NextTurnResponse } from "@/types";

/** In-memory turn cursor per session for MVP /next advancement. */
const nextTurnCursors = new Map<string, number>();

/**
 * POST /api/podcast/next
 * Developer 1 — returns the next precomputed turn for a session.
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
  };
  return NextResponse.json(response);
}

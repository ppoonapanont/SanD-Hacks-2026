import { NextResponse } from "next/server";

import type { NextTurnRequest } from "@/types";

/**
 * POST /api/podcast/next
 * Developer 1 — moderator selects next speaker and returns a turn.
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

  return NextResponse.json(
    {
      error: "Next-turn generation is not implemented yet",
      code: "NOT_IMPLEMENTED",
    },
    { status: 501 },
  );
}

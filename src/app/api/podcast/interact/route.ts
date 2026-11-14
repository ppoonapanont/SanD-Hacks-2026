import { NextResponse } from "next/server";

import type { InteractRequest } from "@/types";

/**
 * POST /api/podcast/interact
 * Developer 1 — user interruption + dynamic guest responses (P1).
 */
export async function POST(request: Request) {
  let body: InteractRequest;

  try {
    body = (await request.json()) as InteractRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.sessionId || !body.message?.trim()) {
    return NextResponse.json(
      { error: "sessionId and message are required" },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      error: "Podcast interaction is not implemented yet",
      code: "NOT_IMPLEMENTED",
    },
    { status: 501 },
  );
}

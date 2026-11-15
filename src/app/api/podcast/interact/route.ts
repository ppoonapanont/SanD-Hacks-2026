import { NextResponse } from "next/server";

import { handlePodcastInteraction } from "@/services/podcast/interact";
import type { InteractRequest, InteractResponse } from "@/types";

/**
 * POST /api/podcast/interact
 * Developer 1 — user interruption + research + guest responses (P1).
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

  try {
    const result = await handlePodcastInteraction({
      sessionId: body.sessionId,
      message: body.message,
      targetGuestId: body.targetGuestId,
    });

    const response: InteractResponse = {
      session: result.session,
      turns: result.turns,
      usedMockResearch: result.usedMockResearch,
      moderatorUsed: result.moderatorUsed,
      moderatorSummary: result.moderatorSummary,
      errors: result.errors,
    };
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Podcast interaction failed";
    const status = message === "Podcast not found" ? 404 : 500;
    return NextResponse.json(
      { error: message, code: status === 404 ? "NOT_FOUND" : "INTERACT_FAILED" },
      { status },
    );
  }
}

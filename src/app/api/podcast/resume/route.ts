import { NextResponse } from "next/server";

import { resumePodcastEpisode } from "@/services/podcast/resume";
import type { ResumeRequest, ResumeResponse } from "@/types";

/**
 * POST /api/podcast/resume
 * Developer 1 — resume original episode after interruption (P1).
 */
export async function POST(request: Request) {
  let body: ResumeRequest;

  try {
    body = (await request.json()) as ResumeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 },
    );
  }

  try {
    const result = await resumePodcastEpisode(body.sessionId);
    const response: ResumeResponse = {
      session: result.session,
      turn: result.turn,
    };
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Podcast resume failed";
    const status = message === "Podcast not found" ? 404 : 500;
    return NextResponse.json(
      { error: message, code: status === 404 ? "NOT_FOUND" : "RESUME_FAILED" },
      { status },
    );
  }
}

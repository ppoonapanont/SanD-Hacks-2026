import { NextResponse } from "next/server";

import type { ResumeRequest } from "@/types";

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

  return NextResponse.json(
    {
      error: "Podcast resume is not implemented yet",
      code: "NOT_IMPLEMENTED",
    },
    { status: 501 },
  );
}

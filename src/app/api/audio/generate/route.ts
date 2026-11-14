import { NextResponse } from "next/server";

import type { GenerateAudioRequest } from "@/types";

/**
 * POST /api/audio/generate
 * Developer 2 — ElevenLabs text-to-speech.
 */
export async function POST(request: Request) {
  let body: GenerateAudioRequest;

  try {
    body = (await request.json()) as GenerateAudioRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.text?.trim() || !body.voiceId?.trim()) {
    return NextResponse.json(
      { error: "text and voiceId are required" },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      error: "Audio generation is not implemented yet",
      code: "NOT_IMPLEMENTED",
    },
    { status: 501 },
  );
}

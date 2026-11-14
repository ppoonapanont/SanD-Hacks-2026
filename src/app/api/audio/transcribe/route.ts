import { NextResponse } from "next/server";

/**
 * POST /api/audio/transcribe
 * Developer 2 — ElevenLabs speech-to-text (multipart form with audio file).
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data with an audio file" },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      error: "Audio transcription is not implemented yet",
      code: "NOT_IMPLEMENTED",
    },
    { status: 501 },
  );
}

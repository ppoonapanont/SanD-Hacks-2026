import { NextResponse } from "next/server";

import { ElevenLabsError, isElevenLabsConfigured, speechToText } from "@/services/elevenlabs";
import type { ApiErrorResponse, TranscribeAudioResponse } from "@/types";

/**
 * POST /api/audio/transcribe
 * Developer 2 — ElevenLabs speech-to-text (multipart form with an audio file).
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Expected multipart/form-data with an audio file" },
      { status: 400 },
    );
  }

  let audio: File | null;
  try {
    const form = await request.formData();
    const entry = form.get("audio");
    audio = entry instanceof File ? entry : null;
  } catch {
    return NextResponse.json<ApiErrorResponse>({ error: "Invalid form data" }, { status: 400 });
  }

  if (!audio || audio.size === 0) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "An 'audio' file field is required" },
      { status: 400 },
    );
  }

  if (!isElevenLabsConfigured()) {
    return NextResponse.json<ApiErrorResponse>(
      {
        error: "ElevenLabs is not configured (missing ELEVENLABS_API_KEY)",
        code: "ELEVENLABS_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  try {
    const text = await speechToText({ audio });
    return NextResponse.json<TranscribeAudioResponse>({ text });
  } catch (error) {
    if (error instanceof ElevenLabsError) {
      return NextResponse.json<ApiErrorResponse>(
        { error: error.message, code: "ELEVENLABS_REQUEST_FAILED" },
        { status: 502 },
      );
    }
    return NextResponse.json<ApiErrorResponse>(
      { error: "Unexpected error transcribing audio" },
      { status: 500 },
    );
  }
}

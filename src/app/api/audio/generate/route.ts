import { NextResponse } from "next/server";

import { ElevenLabsError, isElevenLabsConfigured, textToSpeech } from "@/services/elevenlabs";
import type { ApiErrorResponse, GenerateAudioRequest, GenerateAudioResponse } from "@/types";

/**
 * POST /api/audio/generate
 * Developer 2 — ElevenLabs text-to-speech for a single conversation turn.
 */
export async function POST(request: Request) {
  let body: GenerateAudioRequest;

  try {
    body = (await request.json()) as GenerateAudioRequest;
  } catch {
    return NextResponse.json<ApiErrorResponse>({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text?.trim();
  const voiceId = body.voiceId?.trim();

  if (!text || !voiceId) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "text and voiceId are required" },
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
    const audio = await textToSpeech({ text, voiceId });
    const audioUrl = `data:audio/mpeg;base64,${Buffer.from(audio).toString("base64")}`;

    return NextResponse.json<GenerateAudioResponse>({ audioUrl, turnId: body.turnId });
  } catch (error) {
    if (error instanceof ElevenLabsError) {
      return NextResponse.json<ApiErrorResponse>(
        { error: error.message, code: "ELEVENLABS_REQUEST_FAILED" },
        { status: 502 },
      );
    }
    return NextResponse.json<ApiErrorResponse>(
      { error: "Unexpected error generating audio" },
      { status: 500 },
    );
  }
}

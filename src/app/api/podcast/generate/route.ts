import { NextResponse } from "next/server";

import { validatePodcastConfig } from "@/lib/validation/podcast";
import { generatePodcastEpisode } from "@/services/podcast";
import type { GeneratePodcastRequest, GeneratePodcastResponse } from "@/types";

// Research + producer brief + script generation run sequentially and can
// exceed Vercel's default 10s (Hobby) function timeout; 60s is the Hobby-plan
// ceiling. Deep/long episodes may still need Vercel Pro (up to 300s) to be fully safe.
export const maxDuration = 60;

/**
 * POST /api/podcast/generate
 * Developer 1 — News Engine + Gemini episode script generation.
 */
export async function POST(request: Request) {
  let body: GeneratePodcastRequest;

  try {
    body = (await request.json()) as GeneratePodcastRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validatePodcastConfig(body.config);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const result = await generatePodcastEpisode(validation.config, {
      live: Boolean(body.live),
    });
    const response: GeneratePodcastResponse = {
      session: result.session,
      usedMockNews: result.usedMockNews,
      errors: result.errors,
      producerUsed: result.producerUsed,
      producerSummary: result.producerSummary,
      live: result.live,
    };
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Podcast generation failed";
    return NextResponse.json(
      { error: message, code: "GENERATE_FAILED" },
      { status: 500 },
    );
  }
}

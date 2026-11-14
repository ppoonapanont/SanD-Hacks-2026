import { NextResponse } from "next/server";

import { validatePodcastConfig } from "@/lib/validation/podcast";
import { generatePodcastEpisode } from "@/services/podcast";
import type { GeneratePodcastRequest, GeneratePodcastResponse } from "@/types";

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
    const result = await generatePodcastEpisode(validation.config);
    const response: GeneratePodcastResponse & {
      usedMockNews: boolean;
      errors: string[];
    } = {
      session: result.session,
      usedMockNews: result.usedMockNews,
      errors: result.errors,
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

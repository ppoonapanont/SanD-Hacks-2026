import { NextResponse } from "next/server";

import { validatePodcastConfig } from "@/lib/validation/podcast";
import type { GeneratePodcastRequest } from "@/types";

/**
 * POST /api/podcast/generate
 * Developer 1 — wire to News Engine + Mastra preparation workflow.
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

  // Phase 0 stub — implementation lands with News Engine + Podcast Generator.
  return NextResponse.json(
    {
      error: "Podcast generation is not implemented yet",
      code: "NOT_IMPLEMENTED",
    },
    { status: 501 },
  );
}

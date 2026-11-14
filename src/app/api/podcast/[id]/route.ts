import { NextResponse } from "next/server";

import { getSession } from "@/lib/sessions";
import type { GetPodcastResponse } from "@/types";

/**
 * GET /api/podcast/:id
 * Shared — fetch a saved podcast session.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/podcast/[id]">,
) {
  const { id } = await context.params;
  const session = getSession(id);

  if (!session) {
    return NextResponse.json({ error: "Podcast not found" }, { status: 404 });
  }

  const response: GetPodcastResponse = { session };
  return NextResponse.json(response);
}

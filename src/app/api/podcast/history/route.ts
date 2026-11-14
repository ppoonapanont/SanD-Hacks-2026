import { NextResponse } from "next/server";

import { listSessions } from "@/lib/sessions";
import type { PodcastHistoryResponse } from "@/types";

/**
 * GET /api/podcast/history
 * Shared — returns in-memory sessions for now.
 */
export async function GET() {
  const response: PodcastHistoryResponse = {
    sessions: listSessions(),
  };

  return NextResponse.json(response);
}

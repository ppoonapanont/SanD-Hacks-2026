import { NextResponse } from "next/server";

import type { ApiErrorResponse } from "@/types";

export function apiError(
  error: string,
  status: number,
  code?: string,
  details?: unknown,
) {
  const body: ApiErrorResponse = { error, code, details };
  return NextResponse.json(body, { status });
}

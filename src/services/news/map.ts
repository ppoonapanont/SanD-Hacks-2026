import type { BrightDataNewsHit } from "@/services/bright-data";
import type { NewsSource } from "@/types";
import { createId } from "@/utils/id";

import { extractKeyClaims } from "./analyze";
import { parseNewsDate } from "./dates";

export function mapHitToNewsSource(hit: BrightDataNewsHit): NewsSource {
  const summary = hit.snippet || hit.title;

  return {
    id: createId("news"),
    title: hit.title,
    publisher: hit.publisher,
    url: hit.url,
    publishedAt: parseNewsDate(hit.publishedAt),
    summary,
    keyClaims: extractKeyClaims(summary),
    isMock: false,
  };
}

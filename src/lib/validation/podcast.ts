import type { DiscussionDepth, PodcastConfig } from "@/types";

const DEPTHS: DiscussionDepth[] = ["beginner", "intermediate", "advanced"];

export function isDiscussionDepth(value: unknown): value is DiscussionDepth {
  return typeof value === "string" && DEPTHS.includes(value as DiscussionDepth);
}

export function validatePodcastConfig(
  config: unknown,
): { ok: true; config: PodcastConfig } | { ok: false; error: string } {
  if (!config || typeof config !== "object") {
    return { ok: false, error: "config is required" };
  }

  const value = config as Partial<PodcastConfig>;

  if (!Array.isArray(value.topics) || value.topics.length === 0) {
    return { ok: false, error: "config.topics must be a non-empty array" };
  }

  if (typeof value.region !== "string" || !value.region.trim()) {
    return { ok: false, error: "config.region is required" };
  }

  if (typeof value.language !== "string" || !value.language.trim()) {
    return { ok: false, error: "config.language is required" };
  }

  if (
    typeof value.durationMinutes !== "number" ||
    value.durationMinutes < 2 ||
    value.durationMinutes > 30
  ) {
    return {
      ok: false,
      error: "config.durationMinutes must be between 2 and 30",
    };
  }

  if (!isDiscussionDepth(value.depth)) {
    return {
      ok: false,
      error: "config.depth must be beginner, intermediate, or advanced",
    };
  }

  if (!Array.isArray(value.guests) || value.guests.length === 0) {
    return { ok: false, error: "config.guests must be a non-empty array" };
  }

  return { ok: true, config: value as PodcastConfig };
}

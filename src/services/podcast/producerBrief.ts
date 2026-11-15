import { producerAgent } from "@/mastra/agents/producer-agent";
import { generateJson, isGeminiConfigured } from "@/services/gemini";
import type { NewsSource, PodcastConfig } from "@/types";

export interface ProducerSegment {
  title: string;
  description: string;
  estimatedDurationMinutes: number;
  /** 1-based indexes into the sources list passed to the producer. */
  sourceIndexes: number[];
  /** Which guest should lean into this segment (name or role hint). */
  guestFocus: string;
}

export interface ProducerBrief {
  title: string;
  description: string;
  coldOpenHook: string;
  closingBeat: string;
  segments: ProducerSegment[];
  /** Short human-readable summary for UI notes / debugging. */
  summary: string;
}

/**
 * Run the Mastra Producer agent, then structure its brief for the script writer.
 * Failures are non-fatal — callers should fall back to direct script generation.
 */
export async function runProducerBrief(
  config: PodcastConfig,
  sources: NewsSource[],
  errors: string[],
): Promise<ProducerBrief | null> {
  if (!isGeminiConfigured()) {
    errors.push("Producer skipped: Gemini not configured");
    return null;
  }

  const sourceBlock = sources
    .map((source, index) => {
      const claims = (source.keyClaims ?? []).slice(0, 2).join(" | ");
      return [
        `[${index + 1}] ${source.title} — ${source.publisher}${source.isMock ? " (mock)" : ""}`,
        source.summary.slice(0, 220),
        claims ? `claims: ${claims}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const guestBlock = config.guests
    .map(
      (guest, index) =>
        `${String.fromCharCode(65 + index)}: ${guest.name} (${guest.expertise}; ${guest.perspective})`,
    )
    .join("\n");

  let agentText = "";
  try {
    const result = await producerAgent.generate(
      [
        "Produce an episode brief for this podcast configuration and source list.",
        `Duration: ${config.durationMinutes} minutes`,
        `Depth: ${config.depth}`,
        `Region: ${config.region}`,
        `Language: ${config.language}`,
        `Topics: ${config.topics.join(", ")}`,
        "",
        "Guests:",
        guestBlock || "(default panel)",
        "",
        "Sources:",
        sourceBlock || "(none)",
        "",
        "Return a tight producer brief: working title, 3–5 ordered segments with guest focus,",
        "cold-open hook, and closing beat. You may call research-news only if a gap is critical.",
      ].join("\n"),
      { maxSteps: 3 },
    );
    agentText = String(result.text ?? "").trim();
  } catch (error) {
    errors.push(
      error instanceof Error
        ? `Producer agent: ${error.message}`
        : "Producer agent failed",
    );
    return null;
  }

  if (!agentText) {
    errors.push("Producer agent returned empty brief");
    return null;
  }

  try {
    const structured = await generateJson<{
      title: string;
      description: string;
      coldOpenHook: string;
      closingBeat: string;
      segments: Array<{
        title: string;
        description: string;
        estimatedDurationMinutes: number;
        sourceIndexes: number[];
        guestFocus: string;
      }>;
    }>(
      [
        "Convert this podcast producer brief into structured JSON only.",
        "sourceIndexes are 1-based indexes into the original source list (1..N).",
        "Keep 3–5 segments. Do not invent sources.",
        "",
        `Source count N=${sources.length}`,
        "",
        "PRODUCER BRIEF:",
        agentText,
      ].join("\n"),
      {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          coldOpenHook: { type: "string" },
          closingBeat: { type: "string" },
          segments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                estimatedDurationMinutes: { type: "number" },
                sourceIndexes: { type: "array", items: { type: "number" } },
                guestFocus: { type: "string" },
              },
              required: [
                "title",
                "description",
                "estimatedDurationMinutes",
                "sourceIndexes",
                "guestFocus",
              ],
            },
          },
        },
        required: [
          "title",
          "description",
          "coldOpenHook",
          "closingBeat",
          "segments",
        ],
      },
      { timeoutMs: 30_000 },
    );

    const segments: ProducerSegment[] = (structured.segments ?? [])
      .map((segment) => ({
        title: segment.title?.trim() || "Segment",
        description: segment.description?.trim() || "",
        estimatedDurationMinutes:
          Number(segment.estimatedDurationMinutes) ||
          Math.max(1, Math.round(config.durationMinutes / 3)),
        sourceIndexes: (segment.sourceIndexes ?? [])
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= sources.length),
        guestFocus: segment.guestFocus?.trim() || "panel",
      }))
      .filter((segment) => segment.title.length > 0)
      .slice(0, 5);

    if (!segments.length) {
      errors.push("Producer brief had no usable segments");
      return null;
    }

    const title = structured.title?.trim() || `${config.topics[0] ?? "Daily"} briefing`;
    const description =
      structured.description?.trim() ||
      "Producer-shaped panel discussion of today's headlines.";
    const coldOpenHook =
      structured.coldOpenHook?.trim() ||
      "Welcome in — we've got a sharp panel and fresh headlines.";
    const closingBeat =
      structured.closingBeat?.trim() ||
      "That's our rundown — thanks for listening.";

    const summary = [
      title,
      ...segments.map(
        (segment, i) =>
          `${i + 1}. ${segment.title} → ${segment.guestFocus}`,
      ),
    ].join(" · ");

    return {
      title,
      description,
      coldOpenHook,
      closingBeat,
      segments,
      summary,
    };
  } catch (error) {
    errors.push(
      error instanceof Error
        ? `Producer structure: ${error.message}`
        : "Producer structure failed",
    );
    return null;
  }
}

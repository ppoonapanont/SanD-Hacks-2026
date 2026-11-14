/**
 * ElevenLabs client — Developer 2.
 * Keep API key server-side only (audio API routes / server modules).
 */

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

/** Low-latency model: good fit for per-turn podcast dialogue generation. */
const DEFAULT_MODEL_ID = "eleven_turbo_v2_5";

export function getElevenLabsApiKey(): string | null {
  return process.env.ELEVENLABS_API_KEY ?? null;
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(getElevenLabsApiKey());
}

export class ElevenLabsError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ElevenLabsError";
    this.status = status;
  }
}

export interface TextToSpeechOptions {
  text: string;
  voiceId: string;
  modelId?: string;
}

/**
 * Converts text to speech for a single conversation turn.
 * Returns raw MP3 bytes — callers decide how to deliver them (data URL, stream, etc).
 */
export async function textToSpeech({
  text,
  voiceId,
  modelId = DEFAULT_MODEL_ID,
}: TextToSpeechOptions): Promise<ArrayBuffer> {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) {
    throw new ElevenLabsError("ELEVENLABS_API_KEY is not configured");
  }

  let response: Response;
  try {
    response = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });
  } catch (cause) {
    throw new ElevenLabsError(
      `Could not reach ElevenLabs: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new ElevenLabsError(
      `ElevenLabs text-to-speech failed (${response.status}): ${details.slice(0, 300)}`,
      response.status,
    );
  }

  return response.arrayBuffer();
}

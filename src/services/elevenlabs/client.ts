/**
 * ElevenLabs client — Developer 2.
 * Keep API key server-side only (audio API routes / server modules).
 */

export function getElevenLabsApiKey(): string | null {
  return process.env.ELEVENLABS_API_KEY ?? null;
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(getElevenLabsApiKey());
}

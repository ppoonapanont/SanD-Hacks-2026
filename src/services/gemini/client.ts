import { GoogleGenAI } from "@google/genai";

/** Fast, available model for this API key. Override with GEMINI_MODEL. */
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_TIMEOUT_MS = 30_000;

export class GeminiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiError";
  }
}

export function getGeminiApiKey(): string | null {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || null;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export function createGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new GeminiError(
      "Gemini is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY.",
    );
  }

  return new GoogleGenAI({ apiKey });
}

/**
 * Generate JSON matching a JSON Schema. Server-side only.
 */
export async function generateJson<T>(
  prompt: string,
  schema: Record<string, unknown>,
  options?: { model?: string; signal?: AbortSignal; timeoutMs?: number },
): Promise<T> {
  const ai = createGeminiClient();
  const model = options?.model ?? getGeminiModel();

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  options?.signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: schema,
        abortSignal: controller.signal,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new GeminiError("Gemini returned an empty response");
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new GeminiError("Gemini returned invalid JSON");
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw new GeminiError(`Gemini request timed out after ${timeoutMs}ms`);
    }
    if (error instanceof GeminiError) throw error;
    const message =
      error instanceof Error ? error.message : "Gemini request failed";
    throw new GeminiError(message);
  } finally {
    clearTimeout(timer);
    options?.signal?.removeEventListener("abort", onAbort);
  }
}

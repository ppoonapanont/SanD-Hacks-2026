import { GoogleGenAI } from "@google/genai";

/**
 * Fast default for this API key. Override with GEMINI_MODEL.
 * Prefer 3.1-flash-lite — free-tier daily quota on 3.5-flash-lite exhausts quickly
 * and silent fallbacks made live turns repeat the same canned line.
 */
const DEFAULT_MODEL = "gemini-3.1-flash-lite";
/** Tried in order when the primary model returns quota / rate-limit errors. */
const QUOTA_FALLBACK_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
] as const;
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

function isQuotaError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  return /quota|rate.?limit|resource.?exhausted|429/i.test(message);
}

function modelsToTry(primary: string): string[] {
  const ordered = [primary, ...QUOTA_FALLBACK_MODELS];
  return [...new Set(ordered.map((m) => m.trim()).filter(Boolean))];
}

/**
 * Generate JSON matching a JSON Schema. Server-side only.
 * On free-tier quota exhaustion, retries alternate Gemini models.
 */
export async function generateJson<T>(
  prompt: string,
  schema: Record<string, unknown>,
  options?: { model?: string; signal?: AbortSignal; timeoutMs?: number },
): Promise<T> {
  const ai = createGeminiClient();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const models = modelsToTry(options?.model ?? getGeminiModel());

  let lastError: Error | null = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i]!;
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
      const normalized =
        error instanceof GeminiError
          ? error
          : new GeminiError(
              error instanceof Error ? error.message : "Gemini request failed",
            );
      lastError = normalized;
      const canRetry =
        isQuotaError(normalized) && i < models.length - 1;
      if (!canRetry) throw normalized;
      console.warn(
        `[gemini] ${model} quota/rate-limited; retrying ${models[i + 1]}`,
      );
    } finally {
      clearTimeout(timer);
      options?.signal?.removeEventListener("abort", onAbort);
    }
  }

  throw lastError ?? new GeminiError("Gemini request failed");
}

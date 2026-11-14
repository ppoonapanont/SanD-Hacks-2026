import type { BrightDataRequestOptions } from "./types";

/**
 * Bright Data client — Developer 1.
 * Server-side only. Uses REST `POST https://api.brightdata.com/request`.
 */

const BRIGHT_DATA_ENDPOINT = "https://api.brightdata.com/request";
/** SERP is usually fast; Unlocker article scrapes can be slower. */
const DEFAULT_TIMEOUT_MS = 60_000;

export interface BrightDataConfig {
  apiKey: string;
  /** Primary SERP zone name from Bright Data control panel. */
  zone: string;
  /** Optional Web Unlocker zone for article page fetches. */
  unlockerZone?: string;
}

export class BrightDataError extends Error {
  readonly status?: number;
  readonly body?: string;

  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.name = "BrightDataError";
    this.status = status;
    this.body = body;
  }
}

export function getBrightDataConfig(): BrightDataConfig | null {
  const apiKey = process.env.BRIGHT_DATA_API_KEY?.trim();
  const zone = process.env.BRIGHT_DATA_ZONE?.trim();

  if (!apiKey || !zone) {
    return null;
  }

  return {
    apiKey,
    zone,
    unlockerZone: process.env.BRIGHT_DATA_UNLOCKER_ZONE?.trim() || undefined,
  };
}

export function isBrightDataConfigured(): boolean {
  return getBrightDataConfig() !== null;
}

export function requireBrightDataConfig(): BrightDataConfig {
  const config = getBrightDataConfig();
  if (!config) {
    throw new BrightDataError(
      "Bright Data is not configured. Set BRIGHT_DATA_API_KEY and BRIGHT_DATA_ZONE.",
    );
  }
  return config;
}

/**
 * Low-level Bright Data request. Returns parsed JSON when possible, otherwise text.
 */
export async function brightDataRequest(
  options: BrightDataRequestOptions,
): Promise<unknown> {
  const config = requireBrightDataConfig();
  const format = options.format ?? "json";
  const zone = options.zone ?? config.zone;

  const payload: Record<string, string> = {
    zone,
    url: options.url,
    format,
    method: options.method ?? "GET",
  };

  if (options.country) {
    payload.country = options.country.toLowerCase();
  }

  if (options.dataFormat) {
    payload.data_format = options.dataFormat;
  }

  const signal =
    options.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(BRIGHT_DATA_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bright Data request failed";
    throw new BrightDataError(message);
  }

  const text = await response.text();

  if (!response.ok) {
    throw new BrightDataError(
      `Bright Data request failed (${response.status})`,
      response.status,
      text.slice(0, 500),
    );
  }

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    // format=raw / markdown may return plain text
    return text;
  }
}

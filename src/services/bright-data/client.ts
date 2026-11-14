/**
 * Bright Data client — Developer 1.
 * Implement SERP/scrape calls here. Do not call from client components.
 */

export interface BrightDataConfig {
  apiKey: string;
  zone: string;
}

export function getBrightDataConfig(): BrightDataConfig | null {
  const apiKey = process.env.BRIGHT_DATA_API_KEY;
  const zone = process.env.BRIGHT_DATA_ZONE;

  if (!apiKey || !zone) {
    return null;
  }

  return { apiKey, zone };
}

export function isBrightDataConfigured(): boolean {
  return getBrightDataConfig() !== null;
}

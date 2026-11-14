/** Bright Data REST `/request` payload (SERP + Web Unlocker). */
export interface BrightDataRequestOptions {
  url: string;
  /** Override zone for this call (e.g. unlocker zone). */
  zone?: string;
  country?: string;
  format?: "raw" | "json";
  dataFormat?: "markdown" | "screenshot" | "parsed_light";
  method?: "GET" | "POST";
  signal?: AbortSignal;
}

export interface BrightDataSerpOrganicResult {
  link?: string;
  url?: string;
  title?: string;
  description?: string;
  source?: string;
  display_link?: string;
  date?: string;
  rank?: number;
  global_rank?: number;
}

export interface BrightDataSerpNewsResult {
  link?: string;
  url?: string;
  title?: string;
  source?: string;
  date?: string;
  description?: string;
  snippet?: string;
  rank?: number;
  global_rank?: number;
}

/**
 * Parsed SERP JSON shapes vary by engine/format.
 * We accept common fields defensively.
 */
export interface BrightDataSerpResponse {
  organic?: BrightDataSerpOrganicResult[];
  news?: BrightDataSerpNewsResult[];
  general?: {
    query?: string;
    language?: string;
    location?: string;
    timestamp?: string;
  };
  input?: {
    original_url?: string;
  };
}

export interface BrightDataNewsHit {
  title: string;
  url: string;
  publisher: string;
  publishedAt?: string;
  snippet: string;
  rank?: number;
}

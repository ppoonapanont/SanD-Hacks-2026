export {
  BrightDataError,
  brightDataRequest,
  getBrightDataConfig,
  isBrightDataConfigured,
  requireBrightDataConfig,
  type BrightDataConfig,
} from "./client";

export {
  toGoogleCountryCode,
  toGoogleLanguageCode,
} from "./locale";

export { searchNews, type SearchNewsOptions } from "./serp";

export {
  isUnlockerConfigured,
  scrapeArticleAsMarkdown,
  type ScrapeArticleOptions,
  type ScrapedArticle,
} from "./unlocker";

export type {
  BrightDataNewsHit,
  BrightDataRequestOptions,
  BrightDataSerpResponse,
} from "./types";

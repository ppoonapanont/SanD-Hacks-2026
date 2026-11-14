/** Map user-facing region strings to Google `gl` country codes. */
const REGION_TO_GL: Record<string, string> = {
  us: "us",
  usa: "us",
  "united states": "us",
  "united states of america": "us",
  uk: "gb",
  gb: "gb",
  "united kingdom": "gb",
  britain: "gb",
  england: "gb",
  canada: "ca",
  ca: "ca",
  australia: "au",
  au: "au",
  india: "in",
  in: "in",
  germany: "de",
  de: "de",
  france: "fr",
  fr: "fr",
  japan: "jp",
  jp: "jp",
  brazil: "br",
  br: "br",
  mexico: "mx",
  mx: "mx",
  worldwide: "us",
  global: "us",
  world: "us",
};

/** Map language names/codes to Google `hl` language codes. */
const LANGUAGE_TO_HL: Record<string, string> = {
  en: "en",
  english: "en",
  es: "es",
  spanish: "es",
  fr: "fr",
  french: "fr",
  de: "de",
  german: "de",
  pt: "pt",
  portuguese: "pt",
  ja: "ja",
  japanese: "ja",
  zh: "zh-CN",
  chinese: "zh-CN",
  hi: "hi",
  hindi: "hi",
};

export function toGoogleCountryCode(region: string): string {
  const key = region.trim().toLowerCase();
  if (REGION_TO_GL[key]) return REGION_TO_GL[key];
  if (/^[a-z]{2}$/i.test(key)) return key;
  return "us";
}

export function toGoogleLanguageCode(language: string): string {
  const key = language.trim().toLowerCase();
  if (LANGUAGE_TO_HL[key]) return LANGUAGE_TO_HL[key];
  if (/^[a-z]{2}(-[a-z]{2})?$/i.test(key)) return key;
  return "en";
}

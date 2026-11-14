/**
 * Best-effort parse of SERP date strings ("2 hours ago", "Nov 13, 2026", ISO).
 * Returns ISO string or current time fallback when unparseable.
 */
export function parseNewsDate(value: string | undefined): string {
  if (!value?.trim()) {
    return new Date().toISOString();
  }

  const trimmed = value.trim();

  const absolute = Date.parse(trimmed);
  if (!Number.isNaN(absolute)) {
    return new Date(absolute).toISOString();
  }

  const relative = trimmed.match(
    /^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i,
  );
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();
    const ms = unitToMs(unit) * amount;
    return new Date(Date.now() - ms).toISOString();
  }

  if (/^yesterday$/i.test(trimmed)) {
    return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  }

  return new Date().toISOString();
}

function unitToMs(unit: string): number {
  switch (unit) {
    case "second":
      return 1000;
    case "minute":
      return 60_000;
    case "hour":
      return 3_600_000;
    case "day":
      return 86_400_000;
    case "week":
      return 7 * 86_400_000;
    case "month":
      return 30 * 86_400_000;
    case "year":
      return 365 * 86_400_000;
    default:
      return 0;
  }
}

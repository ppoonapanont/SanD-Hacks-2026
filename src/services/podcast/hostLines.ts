/**
 * Host lines are first-person. Models sometimes emit producer-style cues like
 * "Back to you, Mira…" — rewrite those so Mira never addresses herself.
 */
export function sanitizeHostSpokenLine(text: string, hostName: string): string {
  const raw = text.trim();
  if (!raw) return "";

  const name = hostName.trim() || "Mira";
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const selfAddress =
    new RegExp(
      `\\b(back\\s+to\\s+you|over\\s+to\\s+you|back\\s+to)\\s*,?\\s*${escaped}\\b`,
      "i",
    ).test(raw) ||
    new RegExp(`\\b${escaped}\\s*,\\s*(take|take\\s+us|see\\s+where)\\b`, "i").test(
      raw,
    );

  if (selfAddress) {
    return "Want a follow-up, or should we head back to where we were?";
  }

  // Drop a leading "Mira:" label if the model prepends the speaker name.
  return raw
    .replace(new RegExp(`^${escaped}\\s*[:\\-—–]\\s*`, "i"), "")
    .trim();
}

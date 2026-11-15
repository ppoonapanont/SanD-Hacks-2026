import type { ReactElement } from "react";

import type { AvatarKey } from "./avatarCharacters";

const INK = "#051230";

/** Headset — the host/moderator. */
function Headset() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%">
      <path d="M4 13a8 8 0 0 1 16 0" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <rect x="3" y="13" width="4.2" height="6" rx="2" fill={INK} />
      <rect x="16.8" y="13" width="4.2" height="6" rx="2" fill={INK} />
    </svg>
  );
}

/** Necktie — the investor. */
function Tie() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%">
      <path d="M9.5 3h5l1.5 3-2 2.5h-4L8 6z" fill={INK} />
      <path d="M10.3 8.5h3.4l1.3 10-3 3.5-3-3.5z" fill={INK} />
    </svg>
  );
}

/** Lightbulb — the founder. */
function Bulb() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18.5h6M10 21.5h4" />
      <path d="M12 2.5a6.5 6.5 0 0 0-3.2 12.2c.7.5 1.2 1.4 1.2 2.3h4c0-.9.5-1.8 1.2-2.3A6.5 6.5 0 0 0 12 2.5z" />
    </svg>
  );
}

/** Rising bar chart — the economist. */
function Chart() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%">
      <rect x="3.5" y="13" width="3.6" height="7.5" rx="1" fill={INK} />
      <rect x="10.2" y="7.5" width="3.6" height="13" rx="1" fill={INK} />
      <rect x="16.9" y="3" width="3.6" height="17.5" rx="1" fill={INK} />
    </svg>
  );
}

/** Open book — the historian. */
function Book() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5.5c-1.8-1.3-4-2-6.5-2v14c2.5 0 4.7.7 6.5 2 1.8-1.3 4-2 6.5-2v-14c-2.5 0-4.7.7-6.5 2z" />
      <path d="M12 5.5v14" />
    </svg>
  );
}

/** Flag on a pole — the politician. */
function Flag() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%">
      <rect x="4.3" y="2.5" width="2" height="19" rx="1" fill={INK} />
      <path d="M6.3 3.5h13l-3.3 4 3.3 4h-13z" fill={INK} />
    </svg>
  );
}

/** Globe — the diplomat. */
function Globe() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.8 2.4 4.2 5.6 4.2 9s-1.4 6.6-4.2 9c-2.8-2.4-4.2-5.6-4.2-9s1.4-6.6 4.2-9z" />
    </svg>
  );
}

/** Raised hand — the live user joining the panel. */
function Hand() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 11V4.5a1.3 1.3 0 0 1 2.6 0V10" />
      <path d="M10.6 10V3.3a1.3 1.3 0 0 1 2.6 0V10" />
      <path d="M13.2 10V4.5a1.3 1.3 0 0 1 2.6 0V11" />
      <path d="M15.8 11V7a1.3 1.3 0 0 1 2.6 0v6c0 3.6-2.2 6-5.6 6-2.8 0-4.4-1.1-5.6-3l-1.6-2.7c-.5-.8 0-1.8.9-1.9.5-.1 1 .1 1.3.6l1.2 1.7" />
    </svg>
  );
}

const ROLE_ICONS: Record<AvatarKey, () => ReactElement> = {
  host: Headset,
  investor: Tie,
  founder: Bulb,
  economist: Chart,
  historian: Book,
  politician: Flag,
  diplomat: Globe,
  you: Hand,
};

export interface RoleBadgeProps {
  avatarKey: AvatarKey;
  /** Diameter of the badge in pixels. */
  size: number;
}

/**
 * Small fixed role-icon badge shown in the corner of a guest avatar. Unlike the animated
 * body underneath, this never moves, so it stays legible and correctly placed regardless
 * of the avatar's idle/speaking motion — and it's the thing that actually signals "not a
 * plain two-eyes-on-a-blob mascot" at a glance.
 */
export function RoleBadge({ avatarKey, size }: RoleBadgeProps) {
  const Icon = ROLE_ICONS[avatarKey];
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        right: -2,
        bottom: -2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#eef1f3",
        boxShadow: "0 0 0 2px #051230, 0 1px 3px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: size * 0.2,
        boxSizing: "border-box",
      }}
    >
      <Icon />
    </span>
  );
}

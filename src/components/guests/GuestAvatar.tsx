"use client";

import { AVATAR_COLORS, AVATARS, type AvatarKey } from "./avatarCharacters";

export interface GuestAvatarProps {
  /** Which Bible Strong Avatar Lab character to render. */
  avatarKey: AvatarKey;
  initials: string;
  size?: number;
  opacity?: number;
  className?: string;
  /** Highlights the avatar (glow ring + livelier motion) while this guest is the active speaker. */
  active?: boolean;
}

/**
 * A Bible Strong Avatar Lab bot avatar (github.com/smontlouis/bible-strong-avatar-lab).
 *
 * Deliberately avoids the library's "Spinners" group of states (e.g. `dictating`) while
 * speaking: those states `morph` the body into a dot spinner, replacing the character's actual
 * shape. `streaming` animates the same body (rotation/position only) instead, so the avatar
 * stays itself — a glow ring is added on top as the "speaking" highlight.
 */
export function GuestAvatar({ avatarKey, initials, size = 48, opacity = 1, className, active = false }: GuestAvatarProps) {
  const Avatar = AVATARS[avatarKey];
  const glowColor = AVATAR_COLORS[avatarKey];

  return (
    <span
      style={{
        display: "inline-flex",
        borderRadius: "50%",
        boxShadow: active ? `0 0 0 3px rgba(5,18,48,0.4), 0 0 16px 2px ${glowColor}` : "none",
        transition: "box-shadow 0.25s ease",
      }}
    >
      <Avatar
        state={active ? "streaming" : "idle"}
        size={size}
        className={className}
        style={{ opacity, flex: "none" }}
        ariaLabel={initials}
        settleAfterMs={active ? 0 : 4000}
      />
    </span>
  );
}

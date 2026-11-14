export interface GuestAvatarProps {
  initials: string;
  color: string;
  radius: string;
  size?: number;
  textColor?: string;
  ring?: string;
  opacity?: number;
  className?: string;
}

/** Small colored, shape-coded avatar glyph used for hosts, guests, and "you". */
export function GuestAvatar({
  initials,
  color,
  radius,
  size = 48,
  textColor = "#051230",
  ring = "none",
  opacity = 1,
  className,
}: GuestAvatarProps) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: radius,
        background: color,
        color: textColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize: Math.max(11, Math.round(size * 0.28)),
        boxShadow: ring,
        opacity,
      }}
    >
      {initials}
    </span>
  );
}

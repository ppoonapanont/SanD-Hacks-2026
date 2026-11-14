import { createAvatar } from "@bible-strong/avatar-react";
import type { AvatarCharacter, AvatarBodyDefinition } from "@bible-strong/avatar-core";

/**
 * Bible Strong Avatar Lab characters (https://github.com/smontlouis/bible-strong-avatar-lab),
 * rendered via @bible-strong/avatar-react. The host keeps the library's own "Grok bot" shape
 * (a plain sphere); each guest gets a distinct geometric primitive so no two characters share
 * a silhouette. Every character keeps the same standard eyes and flat perspective; only the
 * body shape and color vary.
 */
export type AvatarKey =
  | "host"
  | "investor"
  | "founder"
  | "economist"
  | "historian"
  | "politician"
  | "diplomat"
  | "you";

type Surface = AvatarBodyDefinition["primary"];

const SHAPES: Record<AvatarKey, Surface> = {
  host: { type: "sphere", width: 240, height: 240, depth: 240, roundness: 1 },
  investor: { type: "capsule", width: 205, height: 270, depth: 205, roundness: 1 },
  founder: { type: "cube", width: 225, height: 220, depth: 200, roundness: 0.2 },
  economist: { type: "cylinder", width: 230, height: 240, depth: 210, roundness: 0.45 },
  historian: { type: "diamond", width: 235, height: 235, depth: 215, roundness: 0 },
  politician: { type: "cone", width: 235, height: 245, depth: 215, roundness: 0.3 },
  diplomat: { type: "trapezoid", width: 230, height: 240, depth: 210, roundness: 0.25 },
  you: { type: "sphere", width: 240, height: 240, depth: 240, roundness: 1 },
};

function character(name: string, bodyColor: `#${string}`, primary: Surface): AvatarCharacter {
  return {
    name,
    body: { primary, nodes: [] },
    colors: { body: bodyColor, eyes: "#051230" },
    face: { eyes: { width: 1, height: 1, gap: 1, shiftY: 0 }, perspective: 0 },
  };
}

const CHARACTERS: Record<AvatarKey, AvatarCharacter> = {
  host: character("Mira", "#97acc8", SHAPES.host),
  investor: character("Investor", "#e8d27a", SHAPES.investor),
  founder: character("Founder", "#8fcaa8", SHAPES.founder),
  economist: character("Economist", "#e3b98a", SHAPES.economist),
  historian: character("Historian", "#e29fb0", SHAPES.historian),
  politician: character("Politician", "#b6a6e6", SHAPES.politician),
  diplomat: character("Diplomat", "#97acc8", SHAPES.diplomat),
  you: character("You", "#e7ebee", SHAPES.you),
};

/** One `createAvatar` component per persona, built once and reused everywhere. */
export const AVATARS: Record<AvatarKey, ReturnType<typeof createAvatar>> = {
  host: createAvatar(CHARACTERS.host),
  investor: createAvatar(CHARACTERS.investor),
  founder: createAvatar(CHARACTERS.founder),
  economist: createAvatar(CHARACTERS.economist),
  historian: createAvatar(CHARACTERS.historian),
  politician: createAvatar(CHARACTERS.politician),
  diplomat: createAvatar(CHARACTERS.diplomat),
  you: createAvatar(CHARACTERS.you),
};

/** Each persona's body color, reused for the "speaking" highlight glow around the avatar. */
export const AVATAR_COLORS: Record<AvatarKey, `#${string}`> = {
  host: CHARACTERS.host.colors.body,
  investor: CHARACTERS.investor.colors.body,
  founder: CHARACTERS.founder.colors.body,
  economist: CHARACTERS.economist.colors.body,
  historian: CHARACTERS.historian.colors.body,
  politician: CHARACTERS.politician.colors.body,
  diplomat: CHARACTERS.diplomat.colors.body,
  you: CHARACTERS.you.colors.body,
};

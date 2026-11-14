import { createAvatar } from "@bible-strong/avatar-react";
import type { AvatarCharacter, AvatarBodyDefinition } from "@bible-strong/avatar-core";

/**
 * Bible Strong Avatar Lab characters (https://github.com/smontlouis/bible-strong-avatar-lab),
 * rendered via @bible-strong/avatar-react. The host keeps the library's own "Grok bot" shape
 * (a plain sphere); each guest gets one of the library's other simple geometric primitives, so
 * no two characters share a silhouette. Every character keeps the same standard eyes and flat
 * perspective; only the body shape and color vary.
 */
export type AvatarKey = "host" | "ada" | "theo" | "wren" | "sol" | "kai" | "you";

type Surface = AvatarBodyDefinition["primary"];

const SHAPES: Record<AvatarKey, Surface> = {
  host: { type: "sphere", width: 240, height: 240, depth: 240, roundness: 1 },
  ada: { type: "cube", width: 225, height: 220, depth: 200, roundness: 0.2 },
  theo: { type: "cylinder", width: 230, height: 240, depth: 210, roundness: 0.45 },
  wren: { type: "diamond", width: 235, height: 235, depth: 215, roundness: 0 },
  sol: { type: "cone", width: 235, height: 245, depth: 215, roundness: 0.3 },
  kai: { type: "capsule", width: 205, height: 270, depth: 205, roundness: 1 },
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
  ada: character("Ada", "#e3b98a", SHAPES.ada),
  theo: character("Theo", "#8fcaa8", SHAPES.theo),
  wren: character("Wren", "#e29fb0", SHAPES.wren),
  sol: character("Sol", "#b6a6e6", SHAPES.sol),
  kai: character("Kai", "#e8d27a", SHAPES.kai),
  you: character("You", "#e7ebee", SHAPES.you),
};

/** One `createAvatar` component per persona, built once and reused everywhere. */
export const AVATARS: Record<AvatarKey, ReturnType<typeof createAvatar>> = {
  host: createAvatar(CHARACTERS.host),
  ada: createAvatar(CHARACTERS.ada),
  theo: createAvatar(CHARACTERS.theo),
  wren: createAvatar(CHARACTERS.wren),
  sol: createAvatar(CHARACTERS.sol),
  kai: createAvatar(CHARACTERS.kai),
  you: createAvatar(CHARACTERS.you),
};

/** Each persona's body color, reused for the "speaking" highlight glow around the avatar. */
export const AVATAR_COLORS: Record<AvatarKey, `#${string}`> = {
  host: CHARACTERS.host.colors.body,
  ada: CHARACTERS.ada.colors.body,
  theo: CHARACTERS.theo.colors.body,
  wren: CHARACTERS.wren.colors.body,
  sol: CHARACTERS.sol.colors.body,
  kai: CHARACTERS.kai.colors.body,
  you: CHARACTERS.you.colors.body,
};

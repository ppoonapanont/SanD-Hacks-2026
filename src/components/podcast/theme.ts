/** Shared color tokens for the Experience screen, ported from the approved design prototype. */
export const BRAND = {
  navy: "#051230",
  card: "#0a1a3d",
  cardAlt: "#0f2149",
  accent: "#97acc8",
  accentSoft: "rgba(151,172,200,0.16)",
  ink: "#eef1f3",
  sub: "#b6bfc1",
  line: "rgba(182,191,193,0.16)",
  light: "#e7ebee",
};

export interface PlayerTheme {
  bg: string;
  ink: string;
  sub: string;
  line: string;
  card: string;
  border: string;
  chip: string;
  accentText: string;
  track: string;
  fill: string;
  ctrlBg: string;
  ctrlFg: string;
  inputBg: string;
  inputBd: string;
}

/** The player card flips to a light theme once the user has joined the conversation. */
export function playerTheme(isLight: boolean, isResearching: boolean): PlayerTheme {
  if (isLight) {
    return {
      bg: "#e7ebee",
      ink: "#051230",
      sub: "#3b4862",
      line: "rgba(5,18,48,0.14)",
      card: "#ffffff",
      border: "#97acc8",
      chip: "rgba(5,18,48,0.08)",
      accentText: "#28406b",
      track: "rgba(5,18,48,0.14)",
      fill: "#051230",
      ctrlBg: "#051230",
      ctrlFg: "#e7ebee",
      inputBg: "#ffffff",
      inputBd: "rgba(5,18,48,0.25)",
    };
  }
  return {
    bg: "#0a1a3d",
    ink: "#eef1f3",
    sub: "#b6bfc1",
    line: "rgba(182,191,193,0.16)",
    card: "#0f2149",
    border: isResearching ? "#97acc8" : "rgba(151,172,200,0.22)",
    chip: "rgba(151,172,200,0.16)",
    accentText: "#97acc8",
    track: "rgba(182,191,193,0.18)",
    fill: "#97acc8",
    ctrlBg: "#eef1f3",
    ctrlFg: "#051230",
    inputBg: "#051230",
    inputBd: "rgba(182,191,193,0.3)",
  };
}

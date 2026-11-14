import type { GuestKey } from "@/data/mock/experience-demo";

import type { SuggestionView } from "./deriveExperienceView";

/** Imperative actions the Experience screen exposes to its child panels. */
export interface ExperienceHandlers {
  toggleSetup: () => void;
  setRegion: (value: string) => void;
  setLanguage: (value: string) => void;
  setDuration: (value: number) => void;
  toggleTopic: (id: string) => void;
  pickDepth: (label: string) => void;
  toggleGuest: (id: GuestKey) => void;
  generate: () => void;
  seekTo: (seconds: number) => void;
  seekFraction: (fraction: number) => void;
  back15: () => void;
  fwd15: () => void;
  togglePlay: () => void;
  setDraft: (value: string) => void;
  submit: () => void;
  startVoice: () => void;
  stopVoiceAndSubmit: () => void;
  cancelVoice: () => void;
  resume: () => void;
  pickSuggestion: (suggestion: SuggestionView) => void;
  toggleCitation: (id: string) => void;
}

"use client";

import { useEffect, useRef, useState } from "react";

import { GuestAvatar } from "@/components/guests/GuestAvatar";
import {
  DEMO_GUESTS,
  GUEST_ORDER,
  HOST_PROFILE,
  type GuestKey,
  type SpeakerCode,
} from "@/data/mock/experience-demo";
import { useTurnAudio } from "@/hooks";

const PANEL: GuestKey[] = [GUEST_ORDER[0], GUEST_ORDER[1], GUEST_ORDER[2]];
// Only Jordan and Ava come from the preset grid — Marcus is added by building
// him as a custom guest instead, so the intro demos both paths onto one panel.
const PRESET_PICKS: GuestKey[] = [PANEL[0], PANEL[1]];
const SLOT: Record<SpeakerCode, GuestKey | "host"> = {
  H: "host",
  A: PANEL[0], // Jordan Blake, Investor
  B: PANEL[1], // Ava Chen, Tech Founder
  C: PANEL[2], // Dr. Marcus Hale, Economist
};

function profileFor(id: GuestKey | "host") {
  return id === "host" ? HOST_PROFILE : DEMO_GUESTS[id];
}

interface OverlayLine {
  s: SpeakerCode;
  x: string;
}

/** Ad-recording script for the overlay — distinct from the main app's demo content. */
const OVERLAY_SCRIPT: OverlayLine[] = [
  { s: "H", x: "Let's dive into where the money's going this quarter." },
  { s: "A", x: "Enterprise AI spending is surging, but chip supply is the real bottleneck for new deployments." },
  { s: "B", x: "Founders are already building around that constraint instead of waiting on it." },
];

/** Auto-fires once the main segment ends — the recorded "interrupt" beat, no typing needed. */
const AUTO_QUESTION = "What are the bottlenecks?";

// Addressed only to Ava, so only Ava answers.
const OVERLAY_RESPONSE: OverlayLine[] = [
  { s: "H", x: "Great question — Ava, that one's for you." },
  { s: "B", x: "The bottleneck's shifting from compute to power. If energy and chips can't keep pace, nothing else matters." },
];

// Intro setup animation — topic chips, the panel it builds from six guest
// options, and a custom-guest build — all shown once before the loop starts.
const TOPIC_CHIPS = ["World", "Business", "Technology", "Science", "Health", "Sports"];
const SELECTED_TOPICS = ["Technology", "Business"];

// Built live as a custom guest rather than picked from the preset grid —
// he's still the real economist who speaks later in the main segment.
const CUSTOM_GUEST_DEMO = {
  name: "Dr. Marcus Hale",
  expertise: "Economist",
  personality: "Wise, mature, balanced — weighs the trade-offs",
  typeLabel: "Fictional expert",
  avatarKey: "economist" as const,
};
const GUEST_TYPE_CHIPS = ["Fictional expert", "Inspired by a public figure", "Authorized digital guest"];
const CUSTOM_AVATAR_CHIPS: { key: GuestKey; label: string }[] = [
  { key: "founder", label: "Cube" },
  { key: "economist", label: "Cylinder" },
  { key: "politician", label: "Cone" },
];

type Mode = "setupTopics" | "setupGuests" | "setupCustom" | "loop" | "typing" | "asking" | "resuming";

/**
 * Chroma-key overlay for recording a video ad: an intro that shows picking
 * topics, choosing Jordan and Ava from a grid of six guest options (with
 * descriptions), then building Marcus as a custom guest from scratch instead
 * of picking him off the preset list — then real avatars and real ElevenLabs
 * voices (synced to actual clip length, not a fake clock), with a fully
 * automatic interrupt beat. No typing or mic input needed during the
 * recording: it plays the setup, the main segment, "types" the interrupt
 * question, plays Ava's response (she's the only one addressed), shows an
 * auto-pressed Resume button, then loops the main segment onward, hands-off.
 *
 * Not part of the product — a recording aid only, linked from nowhere.
 */
export default function OverlayPage() {
  const turnAudio = useTurnAudio();
  const [mode, setMode] = useState<Mode>("setupTopics");
  const [lineIndex, setLineIndex] = useState(0);
  const [joinIndex, setJoinIndex] = useState(0);
  const [typedQuestion, setTypedQuestion] = useState("");
  const [resumePressed, setResumePressed] = useState(false);
  const [selectedTopicCount, setSelectedTopicCount] = useState(0);
  const [selectedGuestCount, setSelectedGuestCount] = useState(0);

  // Custom-guest builder showcase state.
  const [customNameLen, setCustomNameLen] = useState(0);
  const [customExpertiseLen, setCustomExpertiseLen] = useState(0);
  const [customPersonalityLen, setCustomPersonalityLen] = useState(0);
  const [customTypeSelected, setCustomTypeSelected] = useState(false);
  const [customAvatarSelected, setCustomAvatarSelected] = useState(false);
  const [customPressed, setCustomPressed] = useState(false);
  const [customSaved, setCustomSaved] = useState(false);

  const modeRef = useRef(mode);
  const lineIndexRef = useRef(lineIndex);
  const joinIndexRef = useRef(joinIndex);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    lineIndexRef.current = lineIndex;
  }, [lineIndex]);
  useEffect(() => {
    joinIndexRef.current = joinIndex;
  }, [joinIndex]);

  // Reset per-cycle UI the instant mode flips, rather than in an effect body
  // (avoids a cascading-render setState-in-effect and a one-frame stale flash).
  const [prevMode, setPrevMode] = useState<Mode>(mode);
  if (prevMode !== mode) {
    setPrevMode(mode);
    if (mode === "typing" && typedQuestion !== "") setTypedQuestion("");
    if (mode === "resuming" && resumePressed) setResumePressed(false);
  }

  // Intro: select the topic chips one at a time, then move to picking guests.
  useEffect(() => {
    if (mode !== "setupTopics") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    SELECTED_TOPICS.forEach((_, i) => {
      timers.push(setTimeout(() => setSelectedTopicCount(i + 1), 500 + i * 650));
    });
    timers.push(setTimeout(() => setMode("setupGuests"), 500 + SELECTED_TOPICS.length * 650 + 900));
    return () => timers.forEach(clearTimeout);
  }, [mode]);

  // Intro: show all six guest options, select Jordan and Ava from the
  // preset grid, then move to building Marcus as a custom guest instead.
  useEffect(() => {
    if (mode !== "setupGuests") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    PRESET_PICKS.forEach((_, i) => {
      timers.push(setTimeout(() => setSelectedGuestCount(i + 1), 500 + i * 600));
    });
    timers.push(setTimeout(() => setMode("setupCustom"), 500 + PRESET_PICKS.length * 600 + 1100));
    return () => timers.forEach(clearTimeout);
  }, [mode]);

  // Intro: build a custom guest on screen — type the fields, pick a type and
  // avatar, press "Add to panel" — a pure showcase, not added to the script.
  useEffect(() => {
    if (mode !== "setupCustom") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const typeChar = 38;
    let t = 450;
    const { name, expertise, personality } = CUSTOM_GUEST_DEMO;

    for (let i = 1; i <= name.length; i++) {
      timers.push(setTimeout(() => setCustomNameLen(i), t + i * typeChar));
    }
    t += name.length * typeChar + 450;

    for (let i = 1; i <= expertise.length; i++) {
      timers.push(setTimeout(() => setCustomExpertiseLen(i), t + i * typeChar));
    }
    t += expertise.length * typeChar + 450;

    for (let i = 1; i <= personality.length; i++) {
      timers.push(setTimeout(() => setCustomPersonalityLen(i), t + i * typeChar));
    }
    t += personality.length * typeChar + 600;

    timers.push(setTimeout(() => setCustomTypeSelected(true), t));
    t += 700;
    timers.push(setTimeout(() => setCustomAvatarSelected(true), t));
    t += 850;
    timers.push(setTimeout(() => setCustomPressed(true), t));
    t += 500;
    timers.push(setTimeout(() => setCustomSaved(true), t));
    t += 1500;
    timers.push(setTimeout(() => setMode("loop"), t));

    return () => timers.forEach(clearTimeout);
  }, [mode]);

  // Advance whichever sequence is active once its real audio clip finishes
  // (or fails to generate) — never a fixed timer. At the end of the main
  // segment, start "typing" the interrupt question; at the end of Ava's
  // response, show the Resume button.
  useEffect(() => {
    const advance = (turnId: string) => {
      const loopMatch = /^OL(\d+)$/.exec(turnId);
      if (loopMatch && modeRef.current === "loop") {
        const idx = Number(loopMatch[1]);
        if (idx !== lineIndexRef.current) return;
        if (idx + 1 >= OVERLAY_SCRIPT.length) {
          setMode("typing");
        } else {
          setLineIndex(idx + 1);
        }
        return;
      }
      const joinMatch = /^OJ(\d+)$/.exec(turnId);
      if (joinMatch && modeRef.current === "asking") {
        const idx = Number(joinMatch[1]);
        if (idx !== joinIndexRef.current) return;
        if (idx + 1 >= OVERLAY_RESPONSE.length) {
          setMode("resuming");
        } else {
          setJoinIndex(idx + 1);
        }
      }
    };
    turnAudio.setOnClipEnded(advance);
    turnAudio.setOnSpeakFailed(advance);
    return () => {
      turnAudio.setOnClipEnded(null);
      turnAudio.setOnSpeakFailed(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Speak the current loop line whenever it changes.
  useEffect(() => {
    if (mode !== "loop") return;
    const line = OVERLAY_SCRIPT[lineIndex];
    const profile = profileFor(SLOT[line.s]);
    turnAudio.speak(
      { turnId: `OL${lineIndex}`, text: line.x, voiceId: profile.voiceId, speakerId: profile.id, speakerName: profile.name },
      () => modeRef.current === "loop",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, lineIndex]);

  // "Type" the interrupt question character by character, then hand off to speech.
  useEffect(() => {
    if (mode !== "typing") return;
    let i = 0;
    const typeTimer = setInterval(() => {
      i += 1;
      setTypedQuestion(AUTO_QUESTION.slice(0, i));
      if (i >= AUTO_QUESTION.length) clearInterval(typeTimer);
    }, 45);
    const advanceTimer = setTimeout(() => setMode("asking"), AUTO_QUESTION.length * 45 + 500);
    return () => {
      clearInterval(typeTimer);
      clearTimeout(advanceTimer);
    };
  }, [mode]);

  // Speak Ava's response whenever it changes.
  useEffect(() => {
    if (mode !== "asking") return;
    const line = OVERLAY_RESPONSE[joinIndex];
    const profile = profileFor(SLOT[line.s]);
    turnAudio.speak(
      { turnId: `OJ${joinIndex}`, text: line.x, voiceId: profile.voiceId, speakerId: profile.id, speakerName: profile.name },
      () => modeRef.current === "asking",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, joinIndex]);

  // Show a Resume button, auto-press it, then loop back to the main segment.
  useEffect(() => {
    if (mode !== "resuming") return;
    const pressTimer = setTimeout(() => setResumePressed(true), 700);
    const continueTimer = setTimeout(() => {
      setJoinIndex(0);
      setLineIndex(0);
      setMode("loop");
    }, 1300);
    return () => {
      clearTimeout(pressTimer);
      clearTimeout(continueTimer);
    };
  }, [mode]);

  const activeId = (
    mode === "loop"
      ? SLOT[OVERLAY_SCRIPT[lineIndex].s]
      : mode === "typing"
        ? "you"
        : mode === "asking"
          ? SLOT[OVERLAY_RESPONSE[joinIndex].s]
          : "none"
  ) as GuestKey | "host" | "you" | "none";

  const loopTail = OVERLAY_SCRIPT.slice(Math.max(0, lineIndex - 2), lineIndex + 1);
  const joinTail = OVERLAY_RESPONSE.slice(0, joinIndex + 1);
  const showSetup = mode === "setupTopics" || mode === "setupGuests" || mode === "setupCustom";
  const showQuestion = !showSetup && mode !== "loop";
  const showResponse = mode === "asking" || mode === "resuming";

  const customActiveField =
    customNameLen < CUSTOM_GUEST_DEMO.name.length
      ? "name"
      : customExpertiseLen < CUSTOM_GUEST_DEMO.expertise.length
        ? "expertise"
        : customPersonalityLen < CUSTOM_GUEST_DEMO.personality.length
          ? "personality"
          : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#00FF00",
        // Boosts every color on this recording-only page. #00FF00 stays pure
        // since 0 and 255 are already the extremes contrast stretches toward.
        filter: "contrast(1.35)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: 32,
        boxSizing: "border-box",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <style>{`@keyframes rondo-caret-blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }`}</style>

      {showSetup && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 22,
            width: mode === "setupTopics" ? 440 : 640,
            maxWidth: "92vw",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#051230",
              background: "#eef1f3",
              padding: "6px 16px",
              borderRadius: 999,
            }}
          >
            {mode === "setupTopics" && "What do you want to know today?"}
            {mode === "setupGuests" && "Choose your panel"}
            {mode === "setupCustom" && "Or build your own guest"}
          </span>

          {mode === "setupTopics" && (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
              {TOPIC_CHIPS.map((topic) => {
                const rank = SELECTED_TOPICS.indexOf(topic);
                const selected = rank !== -1 && rank < selectedTopicCount;
                return (
                  <span
                    key={topic}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 999,
                      fontSize: 14,
                      fontWeight: 600,
                      transition: "all 0.25s ease",
                      background: "transparent",
                      color: selected ? "#6fa0ff" : "#c7d2e8",
                      border: selected ? "1.5px solid #6fa0ff" : "1px solid rgba(151,172,200,0.3)",
                      transform: selected ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    {selected ? "✓ " : ""}
                    {topic}
                  </span>
                );
              })}
            </div>
          )}

          {mode === "setupGuests" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {GUEST_ORDER.map((id) => {
                const p = DEMO_GUESTS[id];
                const rank = PRESET_PICKS.indexOf(id);
                const selected = rank !== -1 && rank < selectedGuestCount;
                // Every guest shows their real color from the start — the six options are
                // all genuinely on offer. "Selected" only adds the checkmark, glow, and scale.
                return (
                  <div
                    key={id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      padding: "12px 10px",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        transition: "transform 0.25s ease",
                        transform: selected ? "scale(1.08)" : "scale(1)",
                      }}
                    >
                      <span style={{ display: "inline-flex", filter: "saturate(1.7)" }}>
                        <GuestAvatar initials={p.initials} avatarKey={p.avatarKey} size={56} active={selected} />
                      </span>
                      {selected && (
                        <span
                          style={{
                            position: "absolute",
                            top: -4,
                            right: -4,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#2f5fe0",
                            color: "#fff",
                            fontSize: 11,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: selected ? "#fff" : "#c7d2e8", textAlign: "center" }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#9fb3d6", textAlign: "center" }}>{p.role}</span>
                    <span style={{ fontSize: 11, color: "#b6bfc1", textAlign: "center", lineHeight: 1.35 }}>&ldquo;{p.style}&rdquo;</span>
                  </div>
                );
              })}
            </div>
          )}

          {mode === "setupCustom" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <CustomField
                  label="Name"
                  value={CUSTOM_GUEST_DEMO.name.slice(0, customNameLen)}
                  typing={customActiveField === "name"}
                />
                <CustomField
                  label="Expertise"
                  value={CUSTOM_GUEST_DEMO.expertise.slice(0, customExpertiseLen)}
                  typing={customActiveField === "expertise"}
                />
                <CustomField
                  label="Personality"
                  value={CUSTOM_GUEST_DEMO.personality.slice(0, customPersonalityLen)}
                  typing={customActiveField === "personality"}
                />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                {GUEST_TYPE_CHIPS.map((label) => {
                  const selected = customTypeSelected && label === CUSTOM_GUEST_DEMO.typeLabel;
                  return (
                    <span
                      key={label}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: selected ? "#9fb3d6" : "transparent",
                        color: selected ? "#051230" : "#b6bfc1",
                        border: `1px solid ${selected ? "#9fb3d6" : "rgba(182,191,193,0.25)"}`,
                        transition: "all 0.2s ease",
                      }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                {CUSTOM_AVATAR_CHIPS.map((option) => {
                  const selected = customAvatarSelected && option.key === CUSTOM_GUEST_DEMO.avatarKey;
                  return (
                    <div
                      key={option.key}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        padding: 8,
                        borderRadius: 12,
                        background: selected ? "rgba(151,172,200,0.16)" : "transparent",
                        border: `1.5px solid ${selected ? "#9fb3d6" : "rgba(182,191,193,0.25)"}`,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <span style={{ display: "inline-flex", filter: "saturate(1.7)" }}>
                        <GuestAvatar initials={option.label.slice(0, 2)} avatarKey={option.key} size={36} active={selected} />
                      </span>
                      <span style={{ fontSize: 11, color: "#b6bfc1" }}>{option.label}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    padding: "8px 20px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#051230",
                    background: customPressed ? "#7f96c4" : "#9fb3d6",
                    transform: customPressed ? "scale(0.95)" : "scale(1)",
                    transition: "all 0.15s ease",
                  }}
                >
                  Add to panel
                </div>
                {customSaved && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#8fcaa8" }}>
                    ✓ {CUSTOM_GUEST_DEMO.name.split(" ")[1] ?? "Guest"} added
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!showSetup && (
        <>
          <div style={{ display: "flex", gap: 28 }}>
            {(["host", ...PANEL] as (GuestKey | "host")[]).map((id) => {
              const p = profileFor(id);
              const active = activeId === id;
              return (
                <div key={id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <span style={{ display: "inline-flex", filter: "saturate(1.7)" }}>
                    <GuestAvatar initials={p.initials} avatarKey={p.avatarKey} size={84} active={active} />
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#051230",
                      background: "#eef1f3",
                      padding: "4px 12px",
                      borderRadius: 999,
                    }}
                  >
                    {p.short}
                  </span>
                </div>
              );
            })}
            {showQuestion && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <span style={{ display: "inline-flex", filter: "saturate(1.7)" }}>
                  <GuestAvatar initials="You" avatarKey="you" size={84} active={activeId === "you"} />
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#051230",
                    background: "#eef1f3",
                    padding: "4px 12px",
                    borderRadius: 999,
                  }}
                >
                  You
                </span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 560, maxWidth: "90vw" }}>
            {mode === "loop" &&
              loopTail.map((line, i) => {
                const p = profileFor(SLOT[line.s]);
                const isCurrent = i === loopTail.length - 1;
                return (
                  <Bubble key={`loop-${lineIndex}-${i}`} name={p.name} color={p.color} initials={p.initials} avatarKey={p.avatarKey} text={line.x} current={isCurrent} />
                );
              })}

            {showQuestion && (
              <div
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "85%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  background: "#e7ebee",
                  color: "#051230",
                  borderRadius: "18px 18px 4px 18px",
                  padding: "12px 16px",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.7 }}>
                  You · to Ava
                </span>
                <span style={{ fontSize: 15, fontWeight: 500, minHeight: 20 }}>
                  {mode === "typing" ? typedQuestion : AUTO_QUESTION}
                  {mode === "typing" && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 2,
                        height: 16,
                        marginLeft: 2,
                        verticalAlign: "middle",
                        background: "#051230",
                        animation: "rondo-caret-blink 0.9s steps(1) infinite",
                      }}
                    />
                  )}
                </span>
              </div>
            )}

            {showResponse &&
              joinTail.map((line, i) => {
                const p = profileFor(SLOT[line.s]);
                const isCurrent = i === joinTail.length - 1;
                return (
                  <Bubble key={`join-${i}`} name={p.name} color={p.color} initials={p.initials} avatarKey={p.avatarKey} text={line.x} current={isCurrent} />
                );
              })}

            {mode === "resuming" && (
              <div style={{ alignSelf: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#eef1f3", opacity: 0.75 }}>Paused — ready to continue</span>
                <div
                  style={{
                    padding: "10px 30px",
                    borderRadius: 999,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#fff",
                    background: resumePressed ? "#1f3f8f" : "#2f5fe0",
                    transform: resumePressed ? "scale(0.94)" : "scale(1)",
                    boxShadow: resumePressed ? "0 2px 10px rgba(0,0,0,0.3)" : "0 10px 24px rgba(0,0,0,0.35)",
                    transition: "transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
                  }}
                >
                  ▶ Resume
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CustomField({ label, value, typing }: { label: string; value: string; typing: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#051230", background: "#eef1f3", padding: "2px 10px", borderRadius: 999 }}>
        {label}
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "2px solid rgba(255,255,255,0.6)",
          paddingBottom: 4,
          minHeight: 22,
          maxWidth: 420,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: "#051230", textAlign: "center" }}>{value}</span>
        {typing && (
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: 14,
              marginLeft: 2,
              background: "#051230",
              animation: "rondo-caret-blink 0.9s steps(1) infinite",
            }}
          />
        )}
      </div>
    </div>
  );
}

function Bubble({
  name,
  color,
  initials,
  avatarKey,
  text,
  current,
}: {
  name: string;
  color: string;
  initials: string;
  avatarKey: Parameters<typeof GuestAvatar>[0]["avatarKey"];
  text: string;
  current: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        opacity: current ? 1 : 0.55,
        background: "#0a1a3d",
        border: "1px solid rgba(151,172,200,0.25)",
        borderRadius: 16,
        padding: "12px 16px",
        boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
      }}
    >
      <span style={{ display: "inline-flex", filter: "saturate(1.7)" }}>
        <GuestAvatar initials={initials} avatarKey={avatarKey} size={32} />
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{name}</span>
        <span style={{ fontSize: current ? 16 : 14, lineHeight: 1.4, color: "#eef1f3" }}>{text}</span>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { GuestAvatar } from "@/components/guests/GuestAvatar";
import { GUEST_VOICE_OPTIONS, pickUnusedVoiceId } from "@/data/mock/guestVoices";
import {
  CUSTOM_AVATAR_OPTIONS,
  emptyCustomGuestDraft,
  type CustomGuestInput,
} from "@/lib/guests/panelProfiles";
import type { GuestType } from "@/types";

const GUEST_TYPE_OPTIONS: { value: GuestType; label: string }[] = [
  { value: "fictional", label: "Fictional expert" },
  { value: "inspired", label: "Inspired by a public figure" },
  { value: "authorized", label: "Authorized digital guest" },
];

const fieldLabel = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "#97acc8",
};

const inputStyle: CSSProperties = {
  background: "#051230",
  color: "#eef1f3",
  border: "1px solid rgba(182,191,193,0.3)",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 15,
  fontFamily: "Inter, sans-serif",
  minHeight: 44,
  width: "100%",
  boxSizing: "border-box",
};

export interface CustomGuestBuilderProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSave: (input: CustomGuestInput) => void;
  canAdd: boolean;
  /** Voices already taken by the selected panel — new guests default around these. */
  usedVoiceIds?: string[];
}

/** Inline form for creating a freeform panelist during episode setup. */
export function CustomGuestBuilder({
  open,
  onOpen,
  onClose,
  onSave,
  canAdd,
  usedVoiceIds = [],
}: CustomGuestBuilderProps) {
  const [draft, setDraft] = useState<CustomGuestInput>(() =>
    emptyCustomGuestDraft(usedVoiceIds),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(emptyCustomGuestDraft(usedVoiceIds));
    setError(null);
    // Only re-seed when the form opens; avoid fighting mid-edit voice picks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const patch = (partial: Partial<CustomGuestInput>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setError(null);
  };

  const reset = () => {
    setDraft(emptyCustomGuestDraft(usedVoiceIds));
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      setError("Give your guest a name.");
      return;
    }
    if (!draft.expertise.trim()) {
      setError("Add their expertise.");
      return;
    }
    if (!draft.personality.trim()) {
      setError("Describe their personality.");
      return;
    }
    const voiceId = draft.voiceId || pickUnusedVoiceId(usedVoiceIds);
    onSave({ ...draft, voiceId });
    reset();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        disabled={!canAdd}
        aria-label="Create a custom guest"
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          textAlign: "left",
          padding: 14,
          borderRadius: 16,
          color: "#eef1f3",
          background: "transparent",
          border: "1.5px dashed rgba(151,172,200,0.45)",
          opacity: canAdd ? 1 : 0.45,
          cursor: canAdd ? "pointer" : "not-allowed",
          minHeight: 76,
        }}
      >
        <span
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "1.5px dashed rgba(151,172,200,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
            color: "#97acc8",
            fontSize: 24,
            fontWeight: 500,
          }}
          aria-hidden="true"
        >
          +
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Create guest</span>
          <span style={{ fontSize: 13, color: "#b6bfc1" }}>
            Name, expertise, voice
          </span>
        </span>
      </button>
    );
  }

  const taken = new Set(usedVoiceIds);

  return (
    <div
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 18,
        borderRadius: 18,
        background: "rgba(151,172,200,0.08)",
        border: "1px solid rgba(151,172,200,0.28)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>
            New panelist
          </span>
          <span style={{ fontSize: 13, color: "#b6bfc1" }}>
            Build a custom AI guest for this episode
          </span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          style={{
            background: "transparent",
            color: "#b6bfc1",
            border: "1px solid rgba(182,191,193,0.3)",
            borderRadius: 999,
            padding: "8px 14px",
            fontSize: 13,
            minHeight: 40,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 8, ...fieldLabel }}>
          <span>
            Name<span aria-hidden="true" style={{ color: "#e29fb0", marginLeft: 2 }}>*</span>
          </span>
          <input
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Dr. Maya Okonkwo"
            required
            autoComplete="off"
            style={{ ...inputStyle, textTransform: "none", letterSpacing: 0, fontWeight: 400 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 8, ...fieldLabel }}>
          <span>
            Expertise<span aria-hidden="true" style={{ color: "#e29fb0", marginLeft: 2 }}>*</span>
          </span>
          <input
            value={draft.expertise}
            onChange={(e) => patch({ expertise: e.target.value })}
            placeholder="Climate policy analyst"
            required
            autoComplete="off"
            style={{ ...inputStyle, textTransform: "none", letterSpacing: 0, fontWeight: 400 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 8, ...fieldLabel }}>
          <span>
            Personality<span aria-hidden="true" style={{ color: "#e29fb0", marginLeft: 2 }}>*</span>
          </span>
          <input
            value={draft.personality}
            onChange={(e) => patch({ personality: e.target.value })}
            placeholder="Measured, curious, challenges assumptions"
            required
            autoComplete="off"
            style={{ ...inputStyle, textTransform: "none", letterSpacing: 0, fontWeight: 400 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 8, ...fieldLabel }}>
          Perspective
          <input
            value={draft.perspective ?? ""}
            onChange={(e) => patch({ perspective: e.target.value })}
            placeholder="Defaults to expertise"
            autoComplete="off"
            style={{ ...inputStyle, textTransform: "none", letterSpacing: 0, fontWeight: 400 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 8, ...fieldLabel }}>
          Communication style
          <input
            value={draft.communicationStyle ?? ""}
            onChange={(e) => patch({ communicationStyle: e.target.value })}
            placeholder="Defaults to personality"
            autoComplete="off"
            style={{ ...inputStyle, textTransform: "none", letterSpacing: 0, fontWeight: 400 }}
          />
        </label>
      </div>

      <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <legend style={{ ...fieldLabel, marginBottom: 0 }}>Guest type</legend>
        <div
          role="radiogroup"
          aria-label="Guest type"
          style={{
            display: "inline-flex",
            flexWrap: "wrap",
            gap: 2,
            padding: 3,
            borderRadius: 999,
            background: "rgba(5,18,48,0.55)",
            border: "1px solid rgba(182,191,193,0.18)",
            alignSelf: "flex-start",
          }}
        >
          {GUEST_TYPE_OPTIONS.map((option) => {
            const on = (draft.type ?? "fictional") === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => patch({ type: option.value })}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: on ? "#97acc8" : "transparent",
                  color: on ? "#051230" : "#b6bfc1",
                  fontSize: 13,
                  fontWeight: on ? 600 : 500,
                  cursor: "pointer",
                  minHeight: 36,
                  transition: "background 150ms ease, color 150ms ease",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {(draft.type === "inspired" || draft.type === "authorized") && (
        <label style={{ display: "flex", flexDirection: "column", gap: 8, ...fieldLabel }}>
          Inspiration / consent note
          <input
            value={draft.inspiration ?? ""}
            onChange={(e) => patch({ inspiration: e.target.value })}
            placeholder="e.g. Inspired by publicly documented design philosophy"
            autoComplete="off"
            style={{ ...inputStyle, textTransform: "none", letterSpacing: 0, fontWeight: 400 }}
          />
        </label>
      )}

      <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <legend style={{ ...fieldLabel, marginBottom: 0 }}>Avatar</legend>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {CUSTOM_AVATAR_OPTIONS.map((option) => {
            const on = draft.avatarKey === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => patch({ avatarKey: option.key })}
                aria-pressed={on}
                aria-label={`Avatar shape ${option.label}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: 10,
                  borderRadius: 14,
                  background: on ? "rgba(151,172,200,0.16)" : "transparent",
                  border: `1.5px solid ${on ? option.color : "rgba(182,191,193,0.25)"}`,
                  color: "#eef1f3",
                  cursor: "pointer",
                  minWidth: 72,
                }}
              >
                <GuestAvatar initials={option.label.slice(0, 2)} avatarKey={option.key} size={40} />
                <span style={{ fontSize: 12, fontWeight: 500 }}>{option.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <legend style={{ ...fieldLabel, marginBottom: 0 }}>Voice · 10 options</legend>
        <p style={{ margin: 0, fontSize: 13, color: "#b6bfc1", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>
          Separate from Mira and the preset guests — none of these voices are reused.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {GUEST_VOICE_OPTIONS.map((voice) => {
            const on = draft.voiceId === voice.id;
            const inUse = taken.has(voice.id);
            return (
              <button
                key={voice.id}
                type="button"
                onClick={() => patch({ voiceId: voice.id })}
                aria-pressed={on}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 2,
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: on ? "#97acc8" : "transparent",
                  color: on ? "#051230" : "#eef1f3",
                  border: `1px solid ${on ? "#97acc8" : "rgba(182,191,193,0.3)"}`,
                  cursor: "pointer",
                  minHeight: 44,
                  textAlign: "left",
                  opacity: inUse && !on ? 0.55 : 1,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600 }}>{voice.label}</span>
                <span style={{ fontSize: 12, opacity: 0.8 }}>
                  {inUse ? "In use on panel" : voice.hint}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p role="alert" style={{ margin: 0, fontSize: 14, color: "#e29fb0" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          type="button"
          onClick={handleSave}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#97acc8",
            color: "#051230",
            border: "none",
            borderRadius: 999,
            padding: "12px 22px",
            fontSize: 15,
            fontWeight: 600,
            minHeight: 44,
            cursor: "pointer",
          }}
        >
          Add to panel
        </button>
      </div>
    </div>
  );
}

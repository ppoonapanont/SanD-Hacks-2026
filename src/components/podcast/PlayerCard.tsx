import { useEffect, useRef } from "react";

import { GuestAvatar } from "@/components/guests/GuestAvatar";

import type { ExperienceView, TranscriptLineView } from "./deriveExperienceView";
import type { ExperienceHandlers } from "./handlers";

export interface PlayerCardProps {
  view: ExperienceView;
  handlers: ExperienceHandlers;
}

/** The primary product surface: empty state, generating state, or the live episode player. */
export function PlayerCard({ view, handlers }: PlayerCardProps) {
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const lastLineKey = view.lines[view.lines.length - 1]?.key ?? null;

  // Auto-scroll to the newest content when something new arrives — but only if
  // the user is already near the bottom, so scrollback through earlier lines works.
  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 96) {
      el.scrollTop = el.scrollHeight;
    }
  }, [lastLineKey, view.joinLines.length, view.isResearch, view.showQuestion, view.hasNote]);

  return (
    <section
      aria-label="Player"
      style={{
        flex: "999 1 640px",
        minWidth: 0,
        position: "relative",
        overflow: "hidden",
        borderRadius: 28,
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 22,
        boxSizing: "border-box",
        background: view.theme.bg,
        color: view.theme.ink,
        border: `1.5px solid ${view.theme.border}`,
      }}
    >
      {view.isEmpty && (
        <div style={{ minHeight: 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, textAlign: "center" }}>
          <div style={{ display: "flex", gap: 16, opacity: 0.35 }} aria-hidden="true">
            <div style={{ width: 64, height: 64, borderRadius: "50%", border: "2px dashed #97acc8" }} />
            <div style={{ width: 64, height: 64, borderRadius: 18, border: "2px dashed #b6bfc1" }} />
            <div style={{ width: 64, height: 64, borderRadius: "50% 50% 50% 14px", border: "2px dashed #b6bfc1" }} />
            <div style={{ width: 64, height: 64, borderRadius: "14px 50% 14px 50%", border: "2px dashed #b6bfc1" }} />
          </div>
          <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 600 }}>Your episode plays here</h2>
          <p style={{ margin: 0, fontSize: 16, color: "#b6bfc1" }}>Set up, then generate.</p>
        </div>
      )}

      {view.isGenerating && (
        <>
          <div className="scan" aria-hidden="true" />
          <div style={{ width: "100%", minHeight: 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
            <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 600 }}>Generating…</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              {view.generatingSteps.map((st) => (
                <li key={st.label} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 16, color: st.color }}>
                  <StepIcon step={st} />
                  {st.label}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {view.isEpisode && (
        <>
          {view.isResearch && <div className="scan" aria-hidden="true" />}

          {view.isJoined && (
            <div
              style={{
                margin: "-28px -28px 0",
                padding: "14px 28px",
                background: "#051230",
                color: "#e7ebee",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e7ebee" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
                <span style={{ fontSize: 15, fontWeight: 600 }}>You&apos;re live</span>
                <span style={{ fontSize: 14, color: "#b6bfc1" }}>Paused at {view.pausedLabel}</span>
              </div>
              <button
                type="button"
                onClick={handlers.resume}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#e7ebee",
                  color: "#051230",
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  minHeight: 44,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#051230" aria-hidden="true">
                  <path d="M7 4.5v15l13-7.5z" />
                </svg>
                Resume
              </button>
            </div>
          )}

          {view.isVoice && (
            <div style={{ margin: "-28px -28px 0", padding: "14px 28px", background: "#e7ebee", color: "#051230", display: "flex", alignItems: "center", gap: 12 }}>
              <span className="pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: "#051230" }} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>Mic on</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: view.theme.accentText }}>
                Chapter {view.currentChapterNum} · {view.currentChapterName}
              </span>
              <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>
                The four-day week goes mainstream
              </h2>
            </div>
            <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
              {view.members.map((m) => (
                <div key={m.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 72, opacity: m.opacity }}>
                  <GuestAvatar initials={m.initials} avatarKey={m.avatarKey} size={58} active={m.active} />
                  <span style={{ fontSize: 12, fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>{m.short}</span>
                  {m.active ? (
                    <span className="eq" style={{ color: m.eqColor }} aria-label="Speaking">
                      <span />
                      <span />
                      <span />
                      <span />
                    </span>
                  ) : (
                    <span style={{ height: 14, fontSize: 11, color: view.theme.sub }}>{m.role}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
                handlers.seekFraction(f);
              }}
              disabled={view.controlsDisabled}
              aria-label="Seek in episode"
              style={{ display: "block", width: "100%", padding: "8px 0", background: "transparent", border: "none" }}
            >
              <span style={{ display: "block", height: 6, borderRadius: 3, overflow: "hidden", background: view.theme.track }}>
                <span style={{ display: "block", height: "100%", width: `${view.progressPct}%`, background: view.theme.fill }} />
              </span>
            </button>
            <div style={{ display: "flex", gap: 4 }} role="group" aria-label="Chapters">
              {view.rail.map((r) => (
                <button
                  key={r.num}
                  type="button"
                  onClick={() => handlers.seekTo(r.start)}
                  disabled={view.controlsDisabled}
                  aria-label={r.aria}
                  style={{
                    flex: `${r.width} 1 0`,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: "0 0 4px",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    color: r.fg,
                  }}
                >
                  <span style={{ display: "block", width: "100%", height: 5, borderRadius: 3, background: r.bg }} />
                  <span style={{ fontSize: 12, fontWeight: r.weight, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                    {r.num} · {r.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: view.theme.sub, minWidth: 120 }}>{view.timeLabel}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                type="button"
                onClick={handlers.back15}
                disabled={view.controlsDisabled}
                aria-label="Back 15 seconds"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "transparent",
                  border: `1px solid ${view.theme.line}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: view.theme.ink,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v5h5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handlers.togglePlay}
                disabled={view.playPauseDisabled}
                aria-label={view.playAriaLabel}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: view.theme.ctrlBg,
                  opacity: view.playPauseOpacity,
                }}
              >
                {view.playing ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={view.theme.ctrlFg} aria-hidden="true">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={view.theme.ctrlFg} aria-hidden="true">
                    <path d="M8 4.5v15l12-7.5z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={handlers.fwd15}
                disabled={view.controlsDisabled}
                aria-label="Forward 15 seconds"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "transparent",
                  border: `1px solid ${view.theme.line}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: view.theme.ink,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-3-6.7" />
                  <path d="M21 4v5h-5" />
                </svg>
              </button>
            </div>
            <span style={{ fontSize: 13, color: view.theme.sub, minWidth: 120, textAlign: "right" }}>
              {view.depth} · {view.language}
            </span>
          </div>

          {/* Fixed-height slot: the note pill mounts/unmounts inside it without
              ever changing this wrapper's height, so the transcript below never
              jumps when a status note appears or clears. */}
          <div style={{ minHeight: 38, display: "flex", alignItems: "center" }}>
            {view.hasNote && (
              <div
                role="status"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "rgba(151,172,200,0.16)",
                  color: "#97acc8",
                  fontSize: 14,
                  fontWeight: 500,
                  maxWidth: "100%",
                  overflow: "hidden",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#97acc8" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{view.note}</span>
              </div>
            )}
          </div>

          <div
            ref={transcriptRef}
            style={{
              borderTop: `1px solid ${view.theme.line}`,
              paddingTop: 22,
              paddingRight: 6,
              display: "flex",
              flexDirection: "column",
              gap: 18,
              height: 380,
              minHeight: 0,
              flex: "0 0 auto",
              overflowY: "scroll",
            }}
          >
            {view.showLines && (
              <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {view.lines.map((l) => (
                  <TranscriptLine key={l.key} line={l} theme={view.theme} onToggleCitation={handlers.toggleCitation} />
                ))}
              </div>
            )}

            {view.showQuestion && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12, color: view.theme.sub, fontSize: 13 }}>
                  <span style={{ flex: 1, height: 1, background: view.theme.line }} />
                  <span>Paused at {view.pausedLabel}</span>
                  <span style={{ flex: 1, height: 1, background: view.theme.line }} />
                </div>
                <div
                  style={{
                    alignSelf: "flex-end",
                    maxWidth: "78%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "14px 18px",
                    borderRadius: "20px 20px 6px 20px",
                    background: view.youBubble.bg,
                    color: view.youBubble.fg,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.8 }}>
                    You · to {view.targetGuestLabel}
                  </span>
                  <span style={{ fontSize: 16, lineHeight: 1.45 }}>{view.question}</span>
                </div>
              </>
            )}

            {view.isResearch && (
              <div
                role="status"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  padding: 22,
                  borderRadius: 20,
                  background: "#0f2149",
                  border: "1px solid rgba(151,172,200,0.35)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <svg className="spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#97acc8" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
                    <path d="M12 3a9 9 0 1 0 9 9" />
                  </svg>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600 }}>Researching…</span>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  {view.researchSteps.map((rs) => (
                    <li key={rs.label} style={{ display: "flex", gap: 12, alignItems: "flex-start", color: rs.color }}>
                      <span style={{ flex: "none", marginTop: 1 }}>
                        <StepIcon step={rs} />
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: 500 }}>{rs.label}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {view.isJoined && (
              <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {view.joinLines.map((l) => (
                  <TranscriptLine key={l.key} line={l} theme={view.theme} onToggleCitation={handlers.toggleCitation} toYou />
                ))}
                {view.joinTyping && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: view.theme.sub, fontSize: 14 }}>
                    <span className="eq" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </span>
                    {view.nextSpeakerName} is responding…
                  </div>
                )}
                {view.joinDone && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      flexWrap: "wrap",
                      padding: "16px 18px",
                      borderRadius: 16,
                      background: "#ffffff",
                      border: "1px solid rgba(5,18,48,0.12)",
                    }}
                  >
                    <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#051230" }}>Back to Chapter {view.currentChapterNum}</span>
                      <span style={{ fontSize: 14, color: "#3b4862" }}>
                        {view.currentChapterName} · {view.pausedLabel}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handlers.resume}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        background: "#051230",
                        color: "#e7ebee",
                        border: "none",
                        borderRadius: 999,
                        padding: "14px 24px",
                        fontSize: 15,
                        fontWeight: 600,
                        minHeight: 44,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#e7ebee" aria-hidden="true">
                        <path d="M7 4.5v15l13-7.5z" />
                      </svg>
                      Resume episode
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 20, background: view.theme.card, border: `1px solid ${view.theme.line}` }}>
            {view.showComposer && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: view.theme.sub,
                    }}
                  >
                    Address
                  </span>
                  <div
                    role="group"
                    aria-label="Who to address"
                    style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                  >
                    {view.addressTargets.map((target) => (
                      <button
                        key={target.id ?? "panel"}
                        type="button"
                        onClick={() => handlers.setTargetGuest(target.id)}
                        aria-pressed={target.on}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: target.avatarKey ? "6px 12px 6px 6px" : "8px 14px",
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 600,
                          background: target.bg,
                          color: target.fg,
                          border: `1px solid ${target.border}`,
                          minHeight: 40,
                          cursor: "pointer",
                        }}
                      >
                        {target.avatarKey && target.initials ? (
                          <GuestAvatar
                            initials={target.initials}
                            avatarKey={target.avatarKey}
                            size={28}
                          />
                        ) : null}
                        {target.short}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {view.suggestions.map((sg) => (
                    <button
                      key={sg.label}
                      type="button"
                      onClick={() => handlers.pickSuggestion(sg)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 500,
                        background: "transparent",
                        color: view.theme.ink,
                        border: `1px solid ${view.theme.line}`,
                        minHeight: 36,
                        cursor: "pointer",
                      }}
                    >
                      {sg.label}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handlers.submit();
                  }}
                  style={{ display: "flex", gap: 10, alignItems: "center", margin: 0 }}
                >
                  <label htmlFor="ask" className="sr">
                    {view.askLabel}
                  </label>
                  <input
                    id="ask"
                    type="text"
                    value={view.draft}
                    onChange={(e) => handlers.setDraft(e.target.value)}
                    placeholder={view.composerPlaceholder}
                    autoComplete="off"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 52,
                      boxSizing: "border-box",
                      padding: "0 18px",
                      borderRadius: 999,
                      fontSize: 15,
                      fontFamily: "Inter, sans-serif",
                      background: view.theme.inputBg,
                      color: view.theme.ink,
                      border: `1px solid ${view.theme.inputBd}`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={handlers.startVoice}
                    aria-label="Interrupt by voice"
                    style={{
                      width: 52,
                      height: 52,
                      flex: "none",
                      borderRadius: "50%",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: view.theme.ctrlBg,
                      cursor: "pointer",
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={view.theme.ctrlFg} strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                      <rect x="9" y="3" width="6" height="11" rx="3" />
                      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                    </svg>
                  </button>
                  <button
                    type="submit"
                    aria-label={view.sendAriaLabel}
                    style={{
                      height: 52,
                      flex: "none",
                      padding: "0 20px",
                      borderRadius: 999,
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 15,
                      fontWeight: 600,
                      background: "#97acc8",
                      color: "#051230",
                      cursor: "pointer",
                    }}
                  >
                    Cut in
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#051230" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                </form>
              </>
            )}
            {view.isVoice && (
              <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "6px 4px" }}>
                <div style={{ width: 52, height: 52, flex: "none", borderRadius: "50%", background: "#e7ebee", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#051230" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Listening…</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, height: 36 }} aria-hidden="true">
                    {view.waveDelays.map((d, i) => (
                      <span key={i} className="wave" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlers.cancelVoice}
                  style={{ padding: "10px 18px", borderRadius: 999, background: "transparent", color: "#eef1f3", border: "1px solid rgba(182,191,193,0.35)", fontSize: 14, minHeight: 44 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlers.stopVoiceAndSubmit}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 999, background: "#97acc8", color: "#051230", border: "none", fontSize: 14, fontWeight: 600, minHeight: 44 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#051230" aria-hidden="true">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  Done
                </button>
              </div>
            )}
            {view.isResearch && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, height: 52, padding: "0 6px", color: "#b6bfc1", fontSize: 15 }}>
                <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#97acc8" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
                  <path d="M12 3a9 9 0 1 0 9 9" />
                </svg>
                Researching…
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function StepIcon({ step }: { step: { done: boolean; active: boolean; pending: boolean } }) {
  if (step.done) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#97acc8" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    );
  }
  if (step.active) {
    return (
      <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#97acc8" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 9 9" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b6bfc1" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

function TranscriptLine({
  line,
  theme,
  onToggleCitation,
  toYou,
}: {
  line: TranscriptLineView;
  theme: ExperienceView["theme"];
  onToggleCitation: (id: string) => void;
  toYou?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", opacity: line.opacity }}>
      <GuestAvatar initials={line.initials} avatarKey={line.avatarKey} size={34} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: line.nameColor }}>{line.name}</span>
          <span style={{ fontSize: 13, color: theme.sub }}>{toYou ? "to you" : line.role}</span>
          {line.time && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: theme.sub }}>{line.time}</span>}
        </div>
        <p style={{ margin: 0, lineHeight: 1.55, fontSize: line.fontSize }}>
          {line.text}
          {line.cites.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onToggleCitation(c.id)}
              aria-expanded={c.open}
              aria-label={c.aria}
              style={{
                marginLeft: 6,
                padding: "1px 8px",
                borderRadius: 6,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                verticalAlign: 2,
                background: c.bg,
                color: c.fg,
              }}
            >
              {c.n}
            </button>
          ))}
        </p>
        {line.openSource && (
          <div style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 14, background: theme.card, border: `1px solid ${theme.line}` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.accentText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", marginTop: 2 }}>
              <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
              <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              {line.openSource.url ? (
                <a
                  href={line.openSource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 15, fontWeight: 600, color: "inherit", textDecoration: "underline" }}
                >
                  {line.openSource.title}
                </a>
              ) : (
                <span style={{ fontSize: 15, fontWeight: 600 }}>{line.openSource.title}</span>
              )}
              <span style={{ fontSize: 13, color: theme.sub }}>
                {line.openSource.outlet} · {line.openSource.date}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.5, color: theme.sub }}>{line.openSource.note}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

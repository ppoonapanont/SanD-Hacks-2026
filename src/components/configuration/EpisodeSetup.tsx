import type { ExperienceView } from "@/components/podcast/deriveExperienceView";
import type { ExperienceHandlers } from "@/components/podcast/handlers";
import { CustomGuestBuilder } from "@/components/guests/CustomGuestBuilder";
import { GuestAvatar } from "@/components/guests/GuestAvatar";
import { HOST_PROFILE } from "@/data/mock/experience-demo";

const REGIONS = ["Global", "United States", "Europe", "Asia-Pacific", "Latin America"];
const LANGUAGES = ["English", "Español", "Français", "Deutsch", "日本語"];

const label = {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "#97acc8",
};

export interface EpisodeSetupProps {
  view: ExperienceView;
  handlers: ExperienceHandlers;
}

/** Collapsible episode setup: topics, region/language, duration, depth, and guest picker. */
export function EpisodeSetup({ view, handlers }: EpisodeSetupProps) {
  if (!view.setupOpen && !view.showSummary) return null;

  if (!view.setupOpen) {
    return (
      <section
        aria-label="Episode setup summary"
        style={{
          background: "#0a1a3d",
          border: "1px solid rgba(151,172,200,0.18)",
          borderRadius: 18,
          padding: "12px 12px 12px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", minWidth: 0 }}>
          <span style={{ fontSize: 14, color: "#b6bfc1" }}>{view.summary}</span>
        </div>
        <button
          type="button"
          onClick={handlers.toggleSetup}
          aria-expanded="false"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            color: "#eef1f3",
            border: "1px solid rgba(182,191,193,0.3)",
            borderRadius: 999,
            padding: "10px 16px",
            fontSize: 14,
            minHeight: 44,
          }}
        >
          Edit setup
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eef1f3" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label="Episode setup"
      style={{
        background: "#0a1a3d",
        border: "1px solid rgba(151,172,200,0.18)",
        borderRadius: 24,
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 26,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>
          Build your episode
        </h1>
        {view.hasEpisode && (
          <button
            type="button"
            onClick={handlers.toggleSetup}
            style={{
              background: "transparent",
              color: "#b6bfc1",
              border: "1px solid rgba(182,191,193,0.3)",
              borderRadius: 999,
              padding: "10px 18px",
              fontSize: 14,
              minHeight: 44,
            }}
          >
            Hide setup
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 28 }}>
        <div style={{ flex: "1 1 380px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
          <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <legend style={{ ...label, marginBottom: 0 }}>
              Topics · {view.topicList.filter((tp) => tp.on).length}/3
            </legend>
            <p style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>
              What do you want to know today?
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {view.topicList.map((tp) => (
                <button
                  key={tp.id}
                  type="button"
                  onClick={() => handlers.toggleTopic(tp.id)}
                  disabled={tp.disabled}
                  aria-pressed={tp.on}
                  style={{
                    padding: "10px 16px",
                    minHeight: 44,
                    borderRadius: 999,
                    fontSize: 14,
                    fontWeight: 500,
                    background: tp.bg,
                    color: tp.fg,
                    border: `1px solid ${tp.border}`,
                    opacity: tp.opacity,
                    cursor: tp.disabled ? "not-allowed" : "pointer",
                  }}
                >
                  {tp.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <label style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", gap: 8, ...label }}>
              Region
              <select
                value={view.region}
                onChange={(e) => handlers.setRegion(e.target.value)}
                style={{
                  background: "#051230",
                  color: "#eef1f3",
                  border: "1px solid rgba(182,191,193,0.3)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 15,
                  fontFamily: "Inter, sans-serif",
                  textTransform: "none",
                  letterSpacing: 0,
                  minHeight: 44,
                }}
              >
                {REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", gap: 8, ...label }}>
              Language
              <select
                value={view.language}
                onChange={(e) => handlers.setLanguage(e.target.value)}
                style={{
                  background: "#051230",
                  color: "#eef1f3",
                  border: "1px solid rgba(182,191,193,0.3)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 15,
                  fontFamily: "Inter, sans-serif",
                  textTransform: "none",
                  letterSpacing: 0,
                  minHeight: 44,
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label htmlFor="dur" style={label}>
                Length
              </label>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600 }}>
                {view.duration} min
              </span>
            </div>
            <input
              id="dur"
              type="range"
              min={2}
              max={30}
              step={1}
              value={view.duration}
              onChange={(e) => handlers.setDuration(parseInt(e.target.value, 10))}
              style={{ width: "100%", height: 24, margin: 0 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#b6bfc1" }}>
              <span>2 min</span>
              <span>30 min</span>
            </div>
          </div>

          <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
            <legend style={{ ...label, marginBottom: 12 }}>Depth</legend>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {view.depthList.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => handlers.pickDepth(d.label)}
                  aria-pressed={d.on}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    alignItems: "flex-start",
                    padding: "12px 14px",
                    borderRadius: 14,
                    textAlign: "left",
                    background: d.bg,
                    color: d.fg,
                    border: `1px solid ${d.border}`,
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{d.label}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset style={{ flex: "1 1 480px", minWidth: 0, border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <legend style={{ ...label, marginBottom: 12 }}>Guests · {view.guestCount}/3</legend>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {view.guestOptions.map((g) => (
              <div key={g.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => handlers.toggleGuest(g.id)}
                  disabled={g.disabled}
                  aria-pressed={g.on}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    textAlign: "left",
                    padding: 14,
                    borderRadius: 16,
                    color: "#eef1f3",
                    background: g.background,
                    border: `1.5px solid ${g.border}`,
                    opacity: g.opacity,
                    cursor: g.disabled ? "not-allowed" : "pointer",
                    width: "100%",
                  }}
                >
                  <GuestAvatar initials={g.initials} avatarKey={g.avatarKey} />
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                      {g.name}
                      {g.isCustom ? (
                        <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#97acc8" }}>
                          Custom
                        </span>
                      ) : null}
                    </span>
                    <span style={{ fontSize: 13, color: "#b6bfc1" }}>{g.role}</span>
                  </span>
                  {g.on && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#97acc8" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </button>
                {g.isCustom && (
                  <button
                    type="button"
                    onClick={() => handlers.removeCustomGuest(g.id)}
                    style={{
                      alignSelf: "flex-start",
                      background: "transparent",
                      color: "#b6bfc1",
                      border: "none",
                      fontSize: 12,
                      padding: "4px 8px",
                      cursor: "pointer",
                      minHeight: 32,
                    }}
                  >
                    Remove custom guest
                  </button>
                )}
              </div>
            ))}
            <CustomGuestBuilder
              open={view.guestBuilderOpen}
              onOpen={handlers.openGuestBuilder}
              onClose={handlers.closeGuestBuilder}
              onSave={handlers.saveCustomGuest}
              canAdd
              usedVoiceIds={view.usedVoiceIds}
            />
            <div
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                padding: 14,
                borderRadius: 16,
                border: "1.5px dashed rgba(182,191,193,0.25)",
              }}
            >
              <GuestAvatar initials={HOST_PROFILE.initials} avatarKey={HOST_PROFILE.avatarKey} />
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{HOST_PROFILE.name}</span>
                <span style={{ fontSize: 13, color: "#b6bfc1" }}>Host · always on</span>
              </span>
            </div>
          </div>
        </fieldset>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          borderTop: "1px solid rgba(182,191,193,0.14)",
          paddingTop: 22,
        }}
      >
        <button
          type="button"
          onClick={handlers.generate}
          disabled={view.noGuests}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "#97acc8",
            color: "#051230",
            border: "none",
            borderRadius: 999,
            padding: "16px 28px",
            fontSize: 16,
            fontWeight: 600,
            minHeight: 44,
            opacity: view.noGuests ? 0.5 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#051230" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
          </svg>
          {view.generateLabel}
        </button>
      </div>
    </section>
  );
}

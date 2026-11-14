import type { ExperienceView } from "./deriveExperienceView";

export interface SourcesPanelProps {
  view: ExperienceView;
}

/** Sidebar list of cited news sources — highlighted while actively referenced. */
export function SourcesPanel({ view }: SourcesPanelProps) {
  return (
    <section
      aria-label="Sources"
      style={{
        background: "#0a1a3d",
        border: "1px solid rgba(151,172,200,0.18)",
        borderRadius: 24,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <h3 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#97acc8" }}>
        Sources · {view.sourceCount}
      </h3>
      {view.sourceList.map((s) => (
        <div
          key={s.n}
          style={{
            display: "flex",
            gap: 12,
            padding: 12,
            borderRadius: 14,
            border: `1px solid ${s.border}`,
            background: s.background,
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              flex: "none",
              borderRadius: 8,
              background: "rgba(151,172,200,0.16)",
              color: "#97acc8",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {s.n}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.35 }}>{s.title}</span>
            <span style={{ fontSize: 12, color: "#b6bfc1" }}>
              {s.outlet} · {s.date}
            </span>
            {s.isLive && (
              <span
                style={{
                  alignSelf: "flex-start",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "#e7ebee",
                  color: "#051230",
                }}
              >
                New
              </span>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

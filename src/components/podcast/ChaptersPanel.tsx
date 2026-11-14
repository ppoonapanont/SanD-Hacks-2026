import type { ExperienceView } from "./deriveExperienceView";
import type { ExperienceHandlers } from "./handlers";

export interface ChaptersPanelProps {
  view: ExperienceView;
  handlers: ExperienceHandlers;
}

/** Sidebar list of episode chapters — jump to any segment. */
export function ChaptersPanel({ view, handlers }: ChaptersPanelProps) {
  return (
    <section
      aria-label="Chapters"
      style={{
        background: "#0a1a3d",
        border: "1px solid rgba(151,172,200,0.18)",
        borderRadius: 24,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#97acc8" }}>
        Chapters
      </h3>
      {view.rail.map((r) => (
        <button
          key={r.num}
          type="button"
          onClick={() => handlers.seekTo(r.start)}
          disabled={view.controlsDisabled}
          aria-label={r.aria}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: 12,
            borderRadius: 14,
            textAlign: "left",
            color: "#eef1f3",
            border: "none",
            background: r.rowBg,
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              flex: "none",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 600,
              background: r.numBg,
              color: r.numFg,
            }}
          >
            {r.num}
          </span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: r.weight }}>{r.name}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#b6bfc1" }}>{r.startLabel}</span>
        </button>
      ))}
    </section>
  );
}

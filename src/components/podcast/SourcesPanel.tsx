import type { CSSProperties } from "react";

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
      {view.sourceList.map((s) => {
        const body = (
          <>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  lineHeight: 1.35,
                  textDecoration: s.url ? "underline" : "none",
                  textUnderlineOffset: 2,
                }}
              >
                {s.title}
              </span>
              <span style={{ fontSize: 12, color: "#b6bfc1" }}>
                {s.outlet} · {s.date}
                {s.url ? " · Open article" : ""}
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
            {s.url ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#97acc8"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flex: "none", marginTop: 4 }}
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            ) : null}
          </>
        );

        const sharedStyle: CSSProperties = {
          display: "flex",
          gap: 12,
          padding: 12,
          borderRadius: 14,
          border: `1px solid ${s.border}`,
          background: s.background,
          textDecoration: "none",
          color: "inherit",
          cursor: s.url ? "pointer" : "default",
        };

        if (s.url) {
          return (
            <a
              key={s.n}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open source ${s.n}: ${s.title}`}
              style={sharedStyle}
            >
              {body}
            </a>
          );
        }

        return (
          <div key={s.n} style={sharedStyle}>
            {body}
          </div>
        );
      })}
    </section>
  );
}

import Link from "next/link";

import { GuestAvatar } from "@/components/guests/GuestAvatar";

const PLAY_ICON = (color: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#051230", color: "#eef1f3", fontFamily: "Inter, system-ui, sans-serif", boxSizing: "border-box" }}>
      <header
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "28px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="10" cy="16" r="7" fill="#97acc8" />
            <rect x="15" y="9" width="14" height="14" rx="4" fill="#b6bfc1" />
          </svg>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
            Rondo<span style={{ color: "#97acc8" }}>FM</span>
          </span>
        </div>
        <Link
          href="/configure"
          className="ghost-link"
          style={{
            color: "#eef1f3",
            textDecoration: "none",
            fontSize: 15,
            fontWeight: 500,
            padding: "10px 18px",
            border: "1px solid rgba(182,191,193,0.35)",
            borderRadius: 999,
          }}
        >
          Try now
        </Link>
      </header>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "72px 32px 112px", display: "flex", flexWrap: "wrap", gap: 64, alignItems: "center" }}>
        <div style={{ flex: "1 1 480px", minWidth: 0, display: "flex", flexDirection: "column", gap: 28 }}>
          <h1 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 76, lineHeight: 1.02, fontWeight: 600, letterSpacing: "-0.035em" }}>
            The podcast you&apos;re part of.
          </h1>
          <p style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, lineHeight: 1.35, color: "#97acc8", fontWeight: 500 }}>
            Your topics. Your guests. Your conversation.
          </p>
          <Link
            href="/configure"
            className="cta-link"
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: 10,
              background: "#97acc8",
              color: "#051230",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 17,
              padding: "18px 32px",
              borderRadius: 999,
              marginTop: 8,
            }}
          >
            {PLAY_ICON("#051230")}
            Try now
          </Link>
        </div>

        <div style={{ flex: "1 1 460px", minWidth: 0 }}>
          <div
            style={{
              background: "#0a1a3d",
              border: "1px solid rgba(151,172,200,0.22)",
              borderRadius: 28,
              padding: 28,
              display: "flex",
              flexDirection: "column",
              gap: 22,
              boxShadow: "0 40px 80px rgba(0,0,0,0.35)",
            }}
          >
            {/* size/gap kept small enough that avatars + the eq meter never
                outgrow the card's own width once it shrinks on mobile. */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <GuestAvatar initials="Mi" avatarKey="host" size={44} opacity={0.5} />
              <GuestAvatar initials="JB" avatarKey="investor" size={44} opacity={0.5} />
              <GuestAvatar initials="AC" avatarKey="founder" size={44} active />
              <GuestAvatar initials="MH" avatarKey="economist" size={44} opacity={0.5} />
              <span className="eq" style={{ color: "#8fcaa8", marginLeft: "auto", flex: "none" }} aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <div style={{ flex: "9 1 0", height: 5, borderRadius: 3, background: "rgba(151,172,200,0.55)" }} />
              <div style={{ flex: "15 1 0", height: 5, borderRadius: 3, background: "rgba(151,172,200,0.55)" }} />
              <div style={{ flex: "18 1 0", height: 5, borderRadius: 3, background: "#97acc8" }} />
              <div style={{ flex: "18 1 0", height: 5, borderRadius: 3, background: "rgba(182,191,193,0.2)" }} />
              <div style={{ flex: "12 1 0", height: 5, borderRadius: 3, background: "rgba(182,191,193,0.2)" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, opacity: 0.55 }}>
                <span style={{ color: "#97acc8", fontWeight: 600 }}>Mira · </span>
                New chip export rules just landed. Jordan, what are markets seeing?
              </p>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, opacity: 0.7 }}>
                <span style={{ color: "#e8d27a", fontWeight: 600 }}>Jordan · </span>
                Semiconductor names sold off before the ink was dry. Investors want to know who still has access to the advanced nodes.
              </p>
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5 }}>
                <span style={{ color: "#8fcaa8", fontWeight: 600 }}>Ava · </span>
                And founders feel it next. If you can&apos;t get the chips you designed for, the roadmap slips — not the press release.
              </p>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, opacity: 0.85 }}>
                <span style={{ color: "#e3b98a", fontWeight: 600 }}>Marcus · </span>
                Zoom out and it&apos;s a trade story. Once supply chains fragment, prices and alliances take the hit together.
              </p>
            </div>
            <div
              style={{
                alignSelf: "flex-end",
                background: "#e7ebee",
                color: "#051230",
                borderRadius: "20px 20px 6px 20px",
                padding: "14px 18px",
                fontSize: 17,
                fontWeight: 500,
              }}
            >
              How will China respond?
            </div>
            <div
              style={{
                display: "inline-flex",
                alignSelf: "flex-start",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                color: "#97acc8",
                padding: "8px 14px",
                border: "1px dashed rgba(151,172,200,0.5)",
                borderRadius: 999,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#97acc8" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              Researching…
            </div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px 64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          <article
            style={{
              background: "#0a1a3d",
              border: "1px solid rgba(151,172,200,0.18)",
              borderRadius: 24,
              padding: 28,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div style={{ height: 132, borderRadius: 16, background: "#0f2149", display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }} aria-hidden="true">
              <div style={{ width: 44, height: 44, borderRadius: 16, background: "#e3b98a" }} />
              <div style={{ width: 44, height: 44, borderRadius: "50% 50% 50% 12px", background: "#8fcaa8" }} />
              <div style={{ width: 44, height: 44, borderRadius: "12px 50% 12px 50%", background: "#e29fb0" }} />
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "2px dashed #b6bfc1",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b6bfc1" strokeWidth={2} strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
            </div>
            <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 600 }}>Pick your panel</h3>
            <p style={{ margin: 0, fontSize: 16, color: "#b6bfc1" }}>Up to 3 AI guests.</p>
          </article>

          <article
            style={{
              background: "#0a1a3d",
              border: "1px solid rgba(151,172,200,0.18)",
              borderRadius: 24,
              padding: 28,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div
              style={{ height: 132, borderRadius: 16, background: "#0f2149", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, padding: "0 24px" }}
              aria-hidden="true"
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#b6bfc1" }}>
                <span>2</span>
                <span style={{ color: "#eef1f3" }}>12 min</span>
                <span>30</span>
              </div>
              <div style={{ position: "relative", height: 6, borderRadius: 3, background: "rgba(182,191,193,0.2)" }}>
                <div style={{ width: "36%", height: "100%", borderRadius: 3, background: "#97acc8" }} />
                <div style={{ position: "absolute", left: "36%", top: -7, width: 20, height: 20, marginLeft: -10, borderRadius: "50%", background: "#eef1f3" }} />
              </div>
              <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
                <span style={{ flex: 1, textAlign: "center", padding: 6, borderRadius: 8, color: "#b6bfc1", border: "1px solid rgba(182,191,193,0.2)" }}>Quick</span>
                <span style={{ flex: 1, textAlign: "center", padding: 6, borderRadius: 8, background: "#97acc8", color: "#051230", fontWeight: 600 }}>Balanced</span>
                <span style={{ flex: 1, textAlign: "center", padding: 6, borderRadius: 8, color: "#b6bfc1", border: "1px solid rgba(182,191,193,0.2)" }}>Deep</span>
              </div>
            </div>
            <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 600 }}>Set depth and length</h3>
            <p style={{ margin: 0, fontSize: 16, color: "#b6bfc1" }}>2 to 30 minutes.</p>
          </article>

          <article
            style={{
              background: "#0a1a3d",
              border: "1px solid rgba(151,172,200,0.18)",
              borderRadius: 24,
              padding: 28,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div style={{ height: 132, borderRadius: 16, background: "#e7ebee", display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }} aria-hidden="true">
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#051230", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e7ebee" strokeWidth={2} strokeLinecap="round">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              </div>
              <span style={{ fontSize: 18, color: "#051230", fontWeight: 600 }}>You&apos;re live</span>
            </div>
            <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 600 }}>Jump in anytime</h3>
            <p style={{ margin: 0, fontSize: 16, color: "#b6bfc1" }}>Ask by voice or text.</p>
          </article>
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "32px 32px 112px" }}>
        <div
          style={{
            background: "#97acc8",
            color: "#051230",
            borderRadius: 32,
            padding: 56,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 28,
          }}
        >
          <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 44, lineHeight: 1.08, fontWeight: 600, letterSpacing: "-0.025em" }}>
            Pull up a chair.
          </h2>
          <Link
            href="/configure"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#051230",
              color: "#eef1f3",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 17,
              padding: "18px 32px",
              borderRadius: 999,
            }}
          >
            {PLAY_ICON("#eef1f3")}
            Try now
          </Link>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid rgba(182,191,193,0.14)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "48px 32px 28px" }}>
          <h3
            style={{
              margin: "0 0 20px",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#97acc8",
            }}
          >
            About us
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 32, marginBottom: 36 }}>
            <a
              href="https://www.linkedin.com/in/pun-pax-poonapanont/"
              target="_blank"
              rel="noopener noreferrer"
              className="ghost-link"
              style={{ display: "flex", flexDirection: "column", gap: 4, textDecoration: "none", color: "#eef1f3" }}
            >
              <span style={{ fontSize: 17, fontWeight: 600 }}>Pun &quot;Pax&quot; Poonapanont</span>
              <span style={{ fontSize: 14, color: "#b6bfc1" }}>Frontend &amp; Audio</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#97acc8", marginTop: 2 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.44-2.14 2.94v5.66H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45z" />
                </svg>
                LinkedIn
              </span>
            </a>
            <a
              href="https://www.linkedin.com/in/-andyly/"
              target="_blank"
              rel="noopener noreferrer"
              className="ghost-link"
              style={{ display: "flex", flexDirection: "column", gap: 4, textDecoration: "none", color: "#eef1f3" }}
            >
              <span style={{ fontSize: 17, fontWeight: 600 }}>Andy Ly</span>
              <span style={{ fontSize: 14, color: "#b6bfc1" }}>AI &amp; Backend</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#97acc8", marginTop: 2 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.44-2.14 2.94v5.66H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45z" />
                </svg>
                LinkedIn
              </span>
            </a>
          </div>
          <div style={{ fontSize: 14, color: "#b6bfc1" }}>© 2026 RondoFM</div>
        </div>
      </footer>
    </div>
  );
}

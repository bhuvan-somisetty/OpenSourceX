import Link from "next/link";

export function Footer() {
  return (
    <footer className="site">
      <div className="wrap cols">
        <div>
          <strong style={{ color: "var(--text)" }}>OpenSourceX</strong>
          <p style={{ margin: "8px 0 0", maxWidth: "46ch" }}>
            An intelligence layer for navigating open source. Every fact shows where it came from.
            Development build: data shown is a recorded, sanitized snapshot, not live.
          </p>
        </div>
        <div>
          <strong style={{ color: "var(--text)" }}>Explore</strong>
          <p style={{ margin: "8px 0 0", display: "grid", gap: 4 }}>
            <Link href="/discover">Discover</Link>
            <Link href="/programs">Programs</Link>
            <Link href="/sources">Sources and status</Link>
          </p>
        </div>
        <div>
          <strong style={{ color: "var(--text)" }}>Attribution</strong>
          <p style={{ margin: "8px 0 0" }}>
            CNCF-derived excerpts: CNCF mentoring repository, CC BY 4.0 (fields selected,
            descriptions summarized). GSoC and LFX data are recorded samples pending permission.
          </p>
        </div>
      </div>
    </footer>
  );
}

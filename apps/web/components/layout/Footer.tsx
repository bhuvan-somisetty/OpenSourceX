import Link from "next/link";

export function Footer() {
  return (
    <footer className="site">
      <div className="wrap cols">
        <div>
          <strong style={{ color: "var(--text)" }}>OpenSourceX</strong>
          <p style={{ margin: "8px 0 0", maxWidth: "46ch" }}>
            Intelligence for open source. Development build: data shown is a recorded, sanitized
            snapshot, not live.
          </p>
        </div>
        <div>
          <strong style={{ color: "var(--text)" }}>Trust</strong>
          <p style={{ margin: "8px 0 0", display: "grid", gap: 4 }}>
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

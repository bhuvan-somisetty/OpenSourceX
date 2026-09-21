import Link from "next/link";
import type { ProjectCard as Card } from "@opensourcex/database";
import { SourceBadge } from "@/components/source/SourceBadge";
import { StatusChip } from "@/components/status/StatusChip";

export interface Why {
  ok: boolean | null;
  text: string;
}

/** Transparent matching: criteria with checks, never a numeric score. */
export function ProjectCard({ p, why }: { p: Card; why?: Why[] }) {
  return (
    <article className="card fade" data-testid="project-card">
      <div className="chips" style={{ marginBottom: 8 }}>
        <span className="tag">{p.program.name}</span>
        {p.ecosystem && <span className="tag">{p.ecosystem} ecosystem only</span>}
        {p.terms.slice(0, 4).map((t) => (
          <span className="tag" key={t}>
            {t}
          </span>
        ))}
      </div>
      <h3 style={{ fontSize: 18, lineHeight: "26px" }}>
        <Link href={`/projects/${p.id}`}>{p.name}</Link>
      </h3>
      {p.org && (
        <p className="muted" style={{ margin: "2px 0 0" }}>
          {p.org}
        </p>
      )}
      {p.summary && (
        <p className="muted" style={{ margin: "8px 0 0" }}>
          {p.summary.length > 200 ? `${p.summary.slice(0, 199)}…` : p.summary}
        </p>
      )}
      {p.technologies.length > 0 && (
        <div className="chips" style={{ marginTop: 10 }}>
          {p.technologies.slice(0, 6).map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
          {p.technologies.length > 6 && <span className="muted">+{p.technologies.length - 6}</span>}
        </div>
      )}
      <dl className="kv">
        <dt>Repository</dt>
        <dd>
          {p.repoUrl ? (
            <>
              <a href={p.repoUrl} target="_blank" rel="noreferrer noopener">
                {p.repoUrl.replace("https://", "")}
              </a>{" "}
              <StatusChip status={p.repoState === "INFERRED" ? "INFERRED" : "RECORDED"} />
            </>
          ) : (
            <StatusChip status="UNKNOWN" label="Not verified" />
          )}
        </dd>
        <dt>Activity</dt>
        <dd>
          <StatusChip status="UNKNOWN" label="Not connected (development build)" />
        </dd>
      </dl>
      {why && why.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <strong style={{ fontSize: 13 }}>Why this matches</strong>
          <ul className="crit" data-testid="why-matches">
            {why.map((w, i) => (
              <li key={i}>
                <span className={w.ok ? "c-ok" : "c-unk"} aria-hidden="true">
                  {w.ok ? "✓" : "?"}
                </span>
                <span>{w.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <SourceBadge source={p.source} />
    </article>
  );
}

import Link from "next/link";
import type { ProjectCard as Card } from "@opensourcex/database";
import { SourceBadge } from "@/components/source/SourceBadge";
import { StatusChip } from "@/components/status/StatusChip";
import { SaveButton } from "@/features/saved/SaveButton";
import { entityOf } from "@/lib/saved";

export interface Why {
  ok: boolean | null;
  text: string;
}

/** A project or organization summary. Matching is shown as criteria, never as a numeric score. */
export function ProjectCard({ p, why, saved = false }: { p: Card; why?: Why[]; saved?: boolean }) {
  const e = entityOf(p);
  return (
    <article className="card hover fade" data-testid="project-card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div className="chips">
          <span className="tag">{p.program.name}</span>
          {p.ecosystem && <span className="tag">{p.ecosystem} only</span>}
          {p.terms.slice(0, 2).map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>
        <SaveButton {...e} initialSaved={saved} compact label={p.name} />
      </div>
      <h3 style={{ fontSize: 20, marginTop: 14 }}>
        <Link href={`/projects/${p.id}`}>{p.name}</Link>
      </h3>
      {p.org && (
        <p className="dim" style={{ margin: "2px 0 0", fontSize: 14 }}>
          {p.org}
        </p>
      )}
      {p.summary && (
        <p className="muted" style={{ margin: "10px 0 0", fontSize: 15 }}>
          {p.summary.length > 170 ? `${p.summary.slice(0, 169)}…` : p.summary}
        </p>
      )}
      {p.technologies.length > 0 && (
        <div className="chips" style={{ marginTop: 12 }}>
          {p.technologies.slice(0, 5).map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
          {p.technologies.length > 5 && (
            <span className="dim" style={{ fontSize: 12 }}>
              +{p.technologies.length - 5}
            </span>
          )}
        </div>
      )}
      {why && why.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <strong
            style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}
            className="dim"
          >
            Why this appears
          </strong>
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
      <div className="chips" style={{ marginTop: 14 }}>
        {p.repoUrl ? (
          <StatusChip
            status={p.repoState === "INFERRED" ? "INFERRED" : "RECORDED"}
            label="Repository linked"
          />
        ) : (
          <StatusChip status="UNKNOWN" label="Repository not verified" />
        )}
        <StatusChip status="UNKNOWN" label="Activity not verified" />
      </div>
      <SourceBadge source={p.source} />
    </article>
  );
}

import Link from "next/link";
import type { ProjectCard } from "@opensourcex/database";
import { SaveButton } from "@/features/saved/SaveButton";
import { entityOf } from "@/lib/saved";

/** Catalog row: dense, scannable, no card chrome. */
export function ProjectRow({ p, saved }: { p: ProjectCard; saved: boolean }) {
  const e = entityOf(p);
  return (
    <div className="prow" data-testid="project-row">
      <div className="t">
        <Link href={`/projects/${p.id}`}>{p.name}</Link>
        <div className="dim" style={{ fontSize: 13, marginTop: 2 }}>
          {p.org ?? (p.kind === "organization" ? "Organization" : "")}
        </div>
      </div>
      <div className="m">
        <span className="tag">{p.program.name}</span>
        {p.terms.slice(0, 2).map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
        {p.technologies.slice(0, 3).map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>
      <SaveButton {...e} initialSaved={saved} compact label={p.name} />
    </div>
  );
}

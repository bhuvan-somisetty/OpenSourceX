import Link from "next/link";
import type { LfxOrgProject } from "@opensourcex/database";
import { SaveButton } from "@/features/saved/SaveButton";

interface LfxProjectCardProps {
  project: LfxOrgProject;
  saved: boolean;
}

export function LfxProjectCard({ project, saved }: LfxProjectCardProps) {
  const entityId = project.id;
  const entityType = "PROJECT";

  return (
    <article className="card lfx-project-card" data-testid={`lfx-project-${project.id}`}>
      <div className="lfx-project-header">
        <div className="lfx-project-badge-row">
          <span className="pill" style={{ fontSize: 11, padding: "2px 8px" }}>
            {project.termBadge}
          </span>
          {project.track && project.track !== "unspecified" && (
            <span className="tag" style={{ fontSize: 11 }}>
              {project.track}
            </span>
          )}
        </div>
        <SaveButton
          entityType={entityType}
          entityId={entityId}
          initialSaved={saved}
          compact
          label={project.title}
        />
      </div>

      <h4 className="lfx-project-title">
        <Link href={`/projects/${project.id}`}>{project.title}</Link>
      </h4>

      {project.summary && (
        <p className="muted lfx-project-summary">
          {project.summary.length > 180 ? `${project.summary.slice(0, 177)}...` : project.summary}
        </p>
      )}

      {project.technologies.length > 0 && (
        <div className="chips lfx-project-chips">
          {project.technologies.slice(0, 6).map((tech) => (
            <span key={tech} className="tag">
              {tech}
            </span>
          ))}
          {project.technologies.length > 6 && (
            <span className="dim" style={{ fontSize: 11, alignSelf: "center" }}>
              +{project.technologies.length - 6} more
            </span>
          )}
        </div>
      )}

      {project.mentors.length > 0 && (
        <div className="lfx-project-mentors">
          <span className="dim" style={{ fontSize: 12 }}>
            Mentors:
          </span>{" "}
          {project.mentors.map((m, idx) => (
            <span key={m.name + idx} style={{ fontSize: 12, marginRight: 6 }}>
              {m.github ? (
                <a
                  href={`https://github.com/${m.github}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-subtle"
                >
                  {m.name} (@{m.github})
                </a>
              ) : (
                m.name
              )}
              {idx < project.mentors.length - 1 ? "," : ""}
            </span>
          ))}
        </div>
      )}

      <div className="lfx-project-footer">
        <Link href={`/projects/${project.id}`} className="lfx-action-link">
          View Project →
        </Link>
        <div className="lfx-project-links">
          {project.upstreamKey && (
            <a
              href={project.upstreamKey}
              target="_blank"
              rel="noreferrer noopener"
              className="btn sm"
              style={{ fontSize: 11, padding: "3px 8px" }}
              title="Open repository"
            >
              Repo ↗
            </a>
          )}
          {project.lfxUrl && (
            <a
              href={project.lfxUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="btn sm"
              style={{ fontSize: 11, padding: "3px 8px" }}
              title="Open LFX page"
            >
              LFX ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

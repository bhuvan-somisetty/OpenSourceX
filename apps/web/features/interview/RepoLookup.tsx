"use client";

import Link from "next/link";
import { useState } from "react";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { ProgramOrgLogo } from "@/features/programs/ProgramOrgLogo";
import type { InterviewProject } from "@/lib/interview/coach";
import type { RepoMatch } from "@/lib/interview/repo";

const yearsLabel = (ys: number[]) =>
  !ys.length
    ? ""
    : ys.length > 3
      ? `${ys[0]}–${ys[ys.length - 1]} · ${ys.length} years`
      : ys.join(", ");

/** Paste the repository you work on; see where it appears in programs; practice on it. */
export function RepoLookup({
  onUse,
  onPickProject,
  activeId,
}: {
  onUse: (p: InterviewProject) => void;
  onPickProject: (id: string) => void;
  activeId: string;
}) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [match, setMatch] = useState<RepoMatch | null>(null);
  const [project, setProject] = useState<InterviewProject | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const find = async (value = url) => {
    const v = value.trim();
    if (!v) return;
    if (!/github\.com\/[\w.-]+\/[\w.-]+|^[\w.-]+\/[\w.-]+$/i.test(v)) {
      setState("error");
      setError("Paste a GitHub repository link, like https://github.com/kubernetes/kubernetes");
      return;
    }
    setState("loading");
    try {
      const res = await fetch(`/api/v1/interview/repo?url=${encodeURIComponent(v)}`);
      const j = (await res.json()) as {
        found?: boolean;
        match?: RepoMatch;
        project?: InterviewProject;
        detail?: string;
      };
      if (!res.ok || !j.match) throw new Error(j.detail ?? "Couldn't look up that repository.");
      setMatch(j.match);
      setProject(j.project ?? null);
      setShowDetails(false);
      setState("done");
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Couldn't look up that repository.");
    }
  };

  const inUse = project && activeId === project.id;
  // once the interview is about this repository (or one of its projects), the
  // subject card says so; fold the long result away so the column stays short
  const folded =
    !showDetails && (!!inUse || (match?.projects.some((p) => p.id === activeId) ?? false));

  return (
    <div className="iv-repo">
      <form
        className="iv-repo-form"
        onSubmit={(e) => {
          e.preventDefault();
          void find();
        }}
      >
        <label htmlFor="iv-repo" className="iv-label">
          Repository you're working on
        </label>
        <div className="iv-repo-row">
          <input
            id="iv-repo"
            type="url"
            inputMode="url"
            placeholder="https://github.com/owner/repository"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={(e) => {
              const t = e.clipboardData.getData("text");
              if (t) setTimeout(() => void find(t), 0);
            }}
            autoComplete="off"
          />
          <button type="submit" className="btn primary sm" disabled={state === "loading"}>
            {state === "loading" ? "Looking…" : "Find"}
          </button>
        </div>
      </form>

      {state === "loading" && (
        <div className="iv-repo-skel" aria-label="Looking up the repository">
          <span />
          <span />
          <span />
        </div>
      )}
      {state === "error" && (
        <p className="iv-err" role="alert">
          {error}
        </p>
      )}

      {state === "done" && match && folded && (
        <div className="iv-repo-result iv-repo-folded" data-testid="repo-match">
          <span>
            <strong>{match.slug}</strong>
            <span className="dim">
              {" "}
              · {match.orgs.length} organization{match.orgs.length === 1 ? "" : "s"}
              {match.projects.length > 0 &&
                ` · ${match.projects.length} mentorship project${match.projects.length === 1 ? "" : "s"}`}
            </span>
          </span>
          <button type="button" className="btn sm" onClick={() => setShowDetails(true)}>
            Show details
          </button>
        </div>
      )}

      {state === "done" && match && !folded && (
        <div className="iv-repo-result" data-testid="repo-match">
          <div className="iv-repo-head">
            <div>
              <a
                href={match.url}
                target="_blank"
                rel="noreferrer noopener"
                className="iv-repo-name"
              >
                {match.slug}
              </a>
              {match.description && <p>{match.description}</p>}
              <div className="iv-repo-meta">
                {match.language && <span>{match.language}</span>}
                {match.stars != null && <span>★ {match.stars.toLocaleString()}</span>}
                {match.license && <span>{match.license}</span>}
                {!match.live && <span>GitHub not reachable, showing recorded data</span>}
              </div>
            </div>
          </div>

          {match.technologies.length > 0 && (
            <div>
              <div className="iv-label">Tech stack</div>
              <div className="chips">
                {match.technologies.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="iv-label">
              Found in {match.orgs.length} organization{match.orgs.length === 1 ? "" : "s"}
            </div>
            {match.orgs.length ? (
              <ul className="iv-repo-orgs">
                {match.orgs.map((o) => (
                  <li key={o.name}>
                    {o.logo ? (
                      <ProgramOrgLogo src={o.logo} name={o.name} size={40} dark={o.logoOnDark} />
                    ) : (
                      <OrgLogo slug={o.logoSlug} name={o.name} size={40} />
                    )}
                    <div className="iv-repo-org">
                      <Link href={o.pageUrl} className="iv-repo-org-name">
                        {o.name}
                      </Link>
                      <span className="dim">
                        {o.matchedBy === "repository"
                          ? "This repository is recorded"
                          : "Same GitHub organization"}
                      </span>
                      <div className="iv-repo-progs">
                        {o.programs.map((p) => (
                          <Link key={p.name} href={p.pageUrl} className="iv-prog">
                            <strong>{p.name}</strong>
                            {p.years.length > 0 && <span>{yearsLabel(p.years)}</span>}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dim iv-repo-none">
                This repository isn't in any program OpenSourceX records. You can still practice on
                it.
              </p>
            )}
          </div>

          {match.projects.length > 0 && (
            <div>
              <div className="iv-label">Mentorship projects on this repository</div>
              <ul className="iv-repo-projects">
                {match.projects.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onPickProject(p.id)}
                      aria-pressed={activeId === p.id}
                    >
                      <span>{p.name}</span>
                      <span className="dim">{p.program}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {project && (
            <button
              type="button"
              className={`btn ${inUse ? "" : "primary"} iv-repo-use`}
              onClick={() => onUse(project)}
              disabled={!!inUse}
              data-testid="use-repo"
            >
              {inUse ? "✓ Interview will be about this repository" : "Practice on this repository"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

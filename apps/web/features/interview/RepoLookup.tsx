"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { ProgramOrgLogo } from "@/features/programs/ProgramOrgLogo";
import type { InterviewProject } from "@/lib/interview/coach";
import type { RepoMatch, RepoOrgMatch } from "@/lib/interview/repo";

const yearsLabel = (ys: number[]) =>
  !ys.length
    ? ""
    : ys.length > 3
      ? `${ys[0]}–${ys[ys.length - 1]} · ${ys.length} years`
      : ys.join(", ");

const MATCHED: Record<RepoOrgMatch["matchedBy"], string> = {
  repository: "This repository is recorded",
  project: "A recorded project works on this repository",
  organization: "Same GitHub organization",
};

const pushed = (iso: string | null) => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return days < 1
    ? "today"
    : days < 31
      ? `${days}d ago`
      : days < 365
        ? `${Math.floor(days / 30)}mo ago`
        : `${Math.floor(days / 365)}y ago`;
};

/**
 * Paste the repository you work on and see it where it lives: organization, then the
 * repository, then the recorded projects on it and when they ran.
 */
export function RepoLookup({
  onUse,
  onPickProject,
  onClear,
  activeId,
}: {
  onUse: (p: InterviewProject) => void;
  onPickProject: (id: string) => void;
  onClear: () => void;
  activeId: string;
}) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [match, setMatch] = useState<RepoMatch | null>(null);
  const [project, setProject] = useState<InterviewProject | null>(null);

  const find = async (value = url, use = true) => {
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
        match?: RepoMatch;
        project?: InterviewProject;
        detail?: string;
      };
      if (!res.ok || !j.match) throw new Error(j.detail ?? "Couldn't look up that repository.");
      setMatch(j.match);
      setProject(j.project ?? null);
      setState("done");
      // pasting your repository means you want to talk about it: make it the
      // subject straight away, which slides the setup into two columns
      if (use && j.project) onUse(j.project);
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Couldn't look up that repository.");
    }
  };

  // a reload with ?project=repo:owner/name shows that repository again
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !activeId.startsWith("repo:")) return;
    restored.current = true;
    const slug = activeId.slice(5);
    setUrl(`https://github.com/${slug}`);
    void find(slug, false);
  }, [activeId]);

  const inUse = !!project && activeId === project.id;
  const [primary, ...others] = match?.orgs ?? [];
  // the repository's own stack, as GitHub reports it (the organization's tags are its own)
  const repoTech = [...new Set([match?.language, ...(match?.topics ?? [])].filter(Boolean))].slice(
    0,
    10,
  ) as string[];

  const repoBlock = match && (
    <div className="iv-tree-repo">
      <div className="iv-tree-repo-head">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path
            fill="currentColor"
            d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.71 1.7.75.75 0 0 1-1.07 1.05A2.5 2.5 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.71A2.5 2.5 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.09a.25.25 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"
          />
        </svg>
        <a href={match.url} target="_blank" rel="noreferrer noopener" className="iv-repo-name">
          {match.slug}
        </a>
      </div>
      {match.forkOf && (
        <span className="dim iv-tree-fork">
          Fork of{" "}
          <a href={`https://github.com/${match.forkOf}`} target="_blank" rel="noreferrer noopener">
            {match.forkOf}
          </a>
        </span>
      )}
      {match.description && <p className="iv-tree-desc">{match.description}</p>}
      <div className="iv-repo-meta">
        {match.language && <span>{match.language}</span>}
        {match.stars != null && <span>★ {match.stars.toLocaleString()}</span>}
        {match.forks != null && <span>⑂ {match.forks.toLocaleString()}</span>}
        {match.license && <span>{match.license}</span>}
        {pushed(match.lastPush) && <span>pushed {pushed(match.lastPush)}</span>}
        {!match.live && <span>GitHub not reachable, showing recorded data</span>}
      </div>
      {repoTech.length > 0 && (
        <div className="chips">
          {repoTech.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const projectList = (o: RepoOrgMatch) =>
    o.projects.length > 0 && (
      <div className="iv-tree-projects">
        <div className="iv-label">
          {o.projects.length} project{o.projects.length === 1 ? "" : "s"} on this repository
        </div>
        <ul className="iv-repo-projects">
          {o.projects.map((p) => {
            const body = (
              <>
                <span>{p.title}</span>
                <span className="dim">
                  {[p.program, p.when.slice(0, 3).join(" · ")].filter(Boolean).join(" · ")}
                  {p.when.length > 3 ? ` +${p.when.length - 3} more` : ""}
                </span>
              </>
            );
            return (
              <li key={p.title}>
                {p.id ? (
                  <button
                    type="button"
                    onClick={() => onPickProject(p.id!)}
                    aria-pressed={activeId === p.id}
                  >
                    {body}
                  </button>
                ) : p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer noopener">
                    {body}
                  </a>
                ) : (
                  <div>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );

  const orgHead = (o: RepoOrgMatch) => (
    <div className="iv-tree-org-head">
      {o.logo ? (
        <ProgramOrgLogo src={o.logo} name={o.name} size={40} dark={o.logoOnDark} />
      ) : (
        <OrgLogo slug={o.logoSlug} name={o.name} size={40} />
      )}
      <div className="iv-repo-org">
        <Link href={o.pageUrl} className="iv-repo-org-name">
          {o.name}
        </Link>
        <span className="dim">{MATCHED[o.matchedBy]}</span>
        <div className="iv-repo-progs">
          {o.programs.map((p) => (
            <Link key={p.name} href={p.pageUrl} className="iv-prog">
              <strong>{p.name}</strong>
              {p.years.length > 0 && <span>{yearsLabel(p.years)}</span>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

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

      {state === "done" && match && (
        <div className={`iv-repo-result ${inUse ? "is-subject" : ""}`} data-testid="repo-match">
          {inUse && (
            <div className="iv-tree-subject" data-testid="picked-project">
              <span className="iv-picked-k">✓ Interview subject</span>
              <button type="button" className="iv-tree-change" onClick={onClear}>
                Change
              </button>
            </div>
          )}

          {primary ? (
            <div className="iv-tree">
              {orgHead(primary)}
              <div className="iv-tree-branch">
                {repoBlock}
                {projectList(primary)}
              </div>
            </div>
          ) : (
            <>
              {repoBlock}
              <p className="dim iv-repo-none">
                This repository isn't in any program OpenSourceX records. You can still practice on
                it.
              </p>
            </>
          )}

          {others.length > 0 && (
            <div className="iv-tree-also">
              <div className="iv-label">Also in</div>
              {others.map((o) => (
                <div key={o.name} className="iv-tree iv-tree-small">
                  {orgHead(o)}
                  {o.projects.length > 0 && <div className="iv-tree-branch">{projectList(o)}</div>}
                </div>
              ))}
            </div>
          )}

          {project && !inUse && (
            <button
              type="button"
              className="btn primary iv-repo-use"
              onClick={() => onUse(project)}
              data-testid="use-repo"
            >
              Practice on this repository
            </button>
          )}
        </div>
      )}
    </div>
  );
}

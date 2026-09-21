import Link from "next/link";
import type { Metadata } from "next";
import { getProject, listProjects } from "@opensourcex/database";
import { load } from "@/lib/data";
import { first, withParams, type Params } from "@/lib/url";
import { DbDown, EmptyState, Notice } from "@/components/feedback/Notice";
import { InterviewSession, type InterviewContext } from "@/features/interview/InterviewSession";

export const metadata: Metadata = { title: "Interview" };
export const dynamic = "force-dynamic";

const MODES = [
  ["understanding", "Project understanding", true],
  ["contribution", "Contribution", true],
  ["pr", "PR review", false],
  ["technical", "Technical", false],
  ["architecture", "Architecture", false],
] as const;

export default async function Interview({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const list = await load((d) => listProjects(d));
  if (!list.ok)
    return (
      <div className="wrap">
        <DbDown />
      </div>
    );
  const items = list.data.items.filter((p) => p.kind === "mentorship");
  const chosen = first(sp.project) || items[0]?.id;
  const mode = (MODES.find((m) => m[0] === first(sp.mode) && m[2])?.[0] ?? "understanding") as
    "understanding" | "contribution";
  const detail = chosen ? await load((d) => getProject(d, chosen)) : null;
  const ctx: InterviewContext | null =
    detail && detail.ok && detail.data
      ? {
          id: detail.data.card.id,
          name: detail.data.card.name,
          summary: detail.data.card.summary,
          technologies: detail.data.card.technologies,
          repoUrl: detail.data.card.repoUrl,
          mentors: detail.data.detail.mentors.map((m) => m.name),
        }
      : null;
  const cur: Params = { project: chosen, mode };

  return (
    <div className="narrow">
      <section className="page-hero">
        <div className="eyebrow">Interview</div>
        <h1 className="page" style={{ marginTop: 14 }}>
          Prepare to explain your contribution.
        </h1>
        <p className="sub">
          Answer first. Reference material appears only after you submit, so you practice
          understanding, not reading.
        </p>
      </section>
      <Notice kind="dev" testId="interview-dev">
        <strong>Development version.</strong> No AI is connected. After you answer you see the
        recorded facts and a simple check of which recorded technologies you mentioned.
      </Notice>
      {items.length === 0 || !ctx ? (
        <div style={{ marginTop: 20 }}>
          <EmptyState
            title="No recorded project to practice with"
            action={
              <Link className="btn" href="/projects">
                Browse projects
              </Link>
            }
          >
            Run the seed command to load the recorded sample.
          </EmptyState>
        </div>
      ) : (
        <>
          <form method="get" className="card" style={{ marginTop: 20, display: "grid", gap: 16 }}>
            <input type="hidden" name="mode" value={mode} />
            <div className="field">
              <label htmlFor="project">Choose a project</label>
              <select id="project" name="project" defaultValue={ctx.id}>
                {items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="dim" style={{ fontSize: 13, marginBottom: 8 }}>
                Choose mode
              </div>
              <div className="scroll-x">
                <div
                  className="segmented"
                  role="group"
                  aria-label="Interview mode"
                  data-testid="modes"
                >
                  {MODES.map(([k, l, on]) =>
                    on ? (
                      <Link
                        key={k}
                        href={withParams("/interview", cur, { mode: k })}
                        aria-current={mode === k ? "true" : undefined}
                      >
                        {l}
                      </Link>
                    ) : (
                      <button key={k} type="button" disabled title="Not available in this build">
                        {l}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <p className="hint" style={{ marginTop: 8 }}>
                PR review, Technical and Architecture modes need repository analysis and AI, which
                are not connected.
              </p>
            </div>
            <div className="actions" style={{ marginTop: 0 }}>
              <button className="btn primary" type="submit" data-testid="start-interview">
                Start Interview
              </button>
            </div>
          </form>
          <InterviewSession key={`${ctx.id}-${mode}`} ctx={ctx} mode={mode} />
        </>
      )}
    </div>
  );
}

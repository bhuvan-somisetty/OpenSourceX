import Link from "next/link";
import type { Metadata } from "next";
import { getProject, listProjects } from "@opensourcex/database";
import { load } from "@/lib/data";
import { DbDown, EmptyState, Notice } from "@/components/feedback/Notice";
import { InterviewSession, type InterviewContext } from "@/features/interview/InterviewSession";

export const metadata: Metadata = { title: "Practice interview" };
export const dynamic = "force-dynamic";

export default async function Interview({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  const list = await load((d) => listProjects(d));
  if (!list.ok)
    return (
      <div className="wrap" style={{ paddingTop: 32 }}>
        <DbDown />
      </div>
    );
  const items = list.data.items.filter((p) => p.kind === "mentorship");
  const chosen = project ?? items[0]?.id;
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

  return (
    <div className="wrap" style={{ paddingTop: 32, maxWidth: 860 }}>
      <div className="eyebrow">Interview</div>
      <h1 className="page">Practice explaining a project</h1>
      <p className="sub">
        Answer first. Reference material appears only after you submit, so you practice
        understanding, not reading.
      </p>
      <Notice kind="dev" testId="interview-dev">
        <strong>Development version.</strong> There is no AI evaluation in this build. After you
        answer, you see the recorded facts and a simple check of which recorded technologies you
        mentioned.
      </Notice>
      {items.length === 0 || !ctx ? (
        <div style={{ marginTop: 16 }}>
          <EmptyState
            title="No recorded project to practice with"
            action={
              <Link className="btn" href="/discover">
                Browse projects
              </Link>
            }
          >
            Run the seed command to load the recorded sample.
          </EmptyState>
        </div>
      ) : (
        <>
          <form method="get" className="card" style={{ marginTop: 16 }}>
            <div className="field">
              <label htmlFor="project">Project</label>
              <select id="project" name="project" defaultValue={ctx.id}>
                {items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="actions">
              <button className="btn sm" type="submit">
                Use this project
              </button>
            </div>
          </form>
          <InterviewSession key={ctx.id} ctx={ctx} />
        </>
      )}
    </div>
  );
}

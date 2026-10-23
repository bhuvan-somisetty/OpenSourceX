import Link from "next/link";
import type { Metadata } from "next";
import { listProjects } from "@opensourcex/database";
import { getSession } from "@/lib/auth";
import { load } from "@/lib/data";
import { first, type Params } from "@/lib/url";
import { DbDown, EmptyState } from "@/components/feedback/Notice";
import { interviewAiAvailable } from "@/lib/interview/ai";
import { MODE_KEYS, tidyTechnologies, type Mode } from "@/lib/interview/coach";
import { interviewProject } from "@/lib/interview/project";
import { VoiceInterview, type ProjectOption } from "@/features/interview/VoiceInterview";

export const metadata: Metadata = { title: "Interview" };
export const dynamic = "force-dynamic";

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
  const asked = first(sp.project).slice(0, 160);
  // nothing is preselected: only a subject or interview type named in the link
  const chosen = asked.startsWith("repo:") ? asked : items.find((p) => p.id === asked)?.id;
  const mode = (MODE_KEYS.find((m) => m === first(sp.mode)) ?? null) as Mode | null;
  const detail = chosen ? await load((d) => interviewProject(d, chosen)) : null;
  const ctx = detail?.ok ? detail.data : null;
  // the same idea offered in several terms is one choice, listed with every term it ran
  const byIdea = new Map<string, ProjectOption>();
  const ideaKey = (p: (typeof items)[number]) =>
    `${p.org ?? ""}|${p.name}`.toLowerCase().replace(/[^a-z0-9|]+/g, "");
  for (const p of items) {
    const when = p.terms.filter((t) => !t.startsWith("unmapped"));
    const cur = byIdea.get(ideaKey(p));
    if (!cur) {
      byIdea.set(ideaKey(p), {
        id: p.id,
        name: p.name,
        org: p.org,
        program: p.program.name,
        technologies: tidyTechnologies(p.technologies),
        repoUrl: p.repoUrl,
        when,
      });
      continue;
    }
    const newer = (when.toSorted().at(-1) ?? "") > (cur.when.toSorted().at(-1) ?? "");
    cur.alsoIds = [...(cur.alsoIds ?? []), newer ? cur.id : p.id];
    if (newer) Object.assign(cur, { id: p.id, repoUrl: p.repoUrl ?? cur.repoUrl });
    cur.when = [...new Set([...cur.when, ...when])];
    cur.technologies = tidyTechnologies([...cur.technologies, ...p.technologies]);
  }
  const projects = [...byIdea.values()].map((p) => ({ ...p, when: p.when.toSorted().reverse() }));
  const session = await getSession();

  return (
    <div className="wrap iv-wrap">
      <section className="page-hero iv-hero">
        <div className="eyebrow">Interview practice</div>
        <h1 className="page" style={{ marginTop: 14 }}>
          Talk it through with an interviewer.
        </h1>
        <p className="sub">
          Pick your project and answer out loud. The interviewer asks real mentorship-interview
          questions, listens, follows up, and tells you exactly where to focus.
        </p>
        <ul className="iv-hero-points" aria-label="How it works">
          <li>
            <span>1</span> Choose a project and interview type
          </li>
          <li>
            <span>2</span> Speak your answers, or type them
          </li>
          <li>
            <span>3</span> Get scores, feedback and a focus plan
          </li>
        </ul>
      </section>
      {items.length === 0 ? (
        <div style={{ marginTop: 20 }}>
          <EmptyState
            title="No recorded project to practice with"
            action={
              <Link className="btn" href="/programs">
                Browse programs
              </Link>
            }
          >
            Run the seed command to load the recorded sample.
          </EmptyState>
        </div>
      ) : (
        <VoiceInterview
          key={ctx?.id ?? "new"}
          projects={projects}
          initial={ctx}
          initialMode={mode}
          aiReady={interviewAiAvailable()}
          signedIn={!!session}
        />
      )}
      <p className="hint iv-privacy">
        Voice stays in your browser: your browser turns speech into text (Chrome and Edge use their
        own speech service for this). Only the text of your answers is sent to OpenSourceX to be
        scored, and it is not saved. See the <Link href="/privacy">Privacy policy</Link>.
      </p>
    </div>
  );
}

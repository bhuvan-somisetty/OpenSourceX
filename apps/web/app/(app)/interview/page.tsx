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
  const chosen = items.find((p) => p.id === first(sp.project))?.id ?? items[0]?.id;
  const mode = (MODE_KEYS.find((m) => m === first(sp.mode)) ?? "understanding") as Mode;
  const detail = chosen ? await load((d) => interviewProject(d, chosen)) : null;
  const ctx = detail?.ok ? detail.data : null;
  const projects: ProjectOption[] = items.map((p) => ({
    id: p.id,
    name: p.name,
    org: p.org,
    program: p.program.name,
    technologies: tidyTechnologies(p.technologies),
    repoUrl: p.repoUrl,
  }));
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
      {items.length === 0 || !ctx ? (
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
          key={ctx.id}
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

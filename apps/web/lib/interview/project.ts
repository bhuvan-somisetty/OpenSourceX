import { getProject, type Db } from "@opensourcex/database";
import { tidyTechnologies, type InterviewProject } from "./coach";

/** Recorded facts for one project, in the shape the interviewer uses. Null when not found. */
export async function interviewProject(d: Db, id: string): Promise<InterviewProject | null> {
  const r = await getProject(d, id);
  if (!r) return null;
  return {
    id: r.card.id,
    name: r.card.name,
    org: r.card.org,
    program: r.card.program.name,
    summary: r.card.summary,
    technologies: tidyTechnologies(r.card.technologies),
    repoUrl: r.card.repoUrl,
    mentors: r.detail.mentors.map((m) => m.name),
  };
}

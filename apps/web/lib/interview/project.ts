import { getProject, type Db } from "@opensourcex/database";
import { tidyTechnologies, type InterviewProject } from "./coach";
import { matchRepo, repoInterviewProject } from "./repo";

/**
 * Recorded facts for one interview subject, in the shape the interviewer uses: a mentorship
 * project id, or "repo:owner/name" for a pasted GitHub repository. Null when not found.
 */
export async function interviewProject(d: Db, id: string): Promise<InterviewProject | null> {
  if (id.startsWith("repo:")) {
    const m = await matchRepo(id.slice(5));
    return m ? repoInterviewProject(m) : null;
  }
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

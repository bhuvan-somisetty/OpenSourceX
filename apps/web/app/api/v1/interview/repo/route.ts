import { badRequest } from "@opensourcex/shared";
import { route } from "@/lib/http";
import { repoInterviewProject, matchRepo } from "@/lib/interview/repo";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/interview/repo?url=<GitHub URL or owner/repo>: the programs, organizations and
 * mentorship projects this repository appears in, its live GitHub details, and the interview
 * subject built from it. 404 when it is neither on GitHub nor recorded.
 */
export const GET = route(async (req) => {
  const url = new URL(req.url).searchParams.get("url")?.trim().slice(0, 300) ?? "";
  if (!url) throw badRequest("Paste a GitHub repository link");
  const m = await matchRepo(url);
  if (!m)
    return Response.json(
      { found: false, detail: "That repository was not found on GitHub. Check the link." },
      { status: 404 },
    );
  return Response.json({ found: true, match: m, project: repoInterviewProject(m) });
});

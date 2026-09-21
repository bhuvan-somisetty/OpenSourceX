import { z } from "zod";
import { assertNoContactData, scrubText } from "@opensourcex/shared";
import { excerpt } from "./types";

/**
 * CNCF mentoring export sanitizer (docs/DATA_POLICY.md section 3).
 * ALLOWLIST: zod object schemas drop every field not named here (email, lfid and all
 * others), so prohibited data cannot reach persistence. Output is verified again with
 * assertNoContactData before it is returned.
 */
const githubHandle = z
  .string()
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/)
  .nullable()
  .catch(null);

const rawMentor = z.object({
  name: z.string().max(200),
  github_handle: githubHandle.optional().default(null),
  role: z.string().max(60).nullable().optional().default(null),
});

const rawProgram = z.object({
  cncf_project: z.string(),
  cncf_project_slug: z.string(),
  cncf_project_maturity: z.string().nullable().optional().default(null),
  program_name_short: z.string(),
  term: z.string(),
  lfx_url: z.string().nullable().optional().default(null),
  upstream_issue_url: z.string().nullable().optional().default(null),
  technologies: z.string().nullable().optional().default(null),
  description: z.string().nullable().optional().default(null),
  mentors: z.array(rawMentor).optional().default([]),
});

const rawExport = z.object({
  _generated: z.string().nullable().optional().default(null),
  _term: z.string(),
  programs: z.array(rawProgram),
});

export interface CncfMentor {
  name: string;
  githubHandle: string | null;
  role: string | null;
}
export interface CncfProgram {
  cncfProject: string;
  slug: string;
  maturity: string | null;
  title: string;
  term: string;
  lfxProjectUuid: string | null;
  upstreamIssueUrl: string | null;
  technologies: string[];
  summary: string | null;
  mentors: CncfMentor[];
}
export interface CncfExportBody {
  term: string;
  generatedAt: string | null;
  programs: CncfProgram[];
}

const UUID = /project\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const httpsUrl = (u: string | null) => (u && /^https:\/\/[^\s]+$/.test(u) ? u : null);

export function sanitizeCncfExport(raw: unknown): CncfExportBody {
  const parsed = rawExport.parse(raw);
  const body: CncfExportBody = {
    term: parsed._term,
    generatedAt: parsed._generated,
    programs: parsed.programs.map((p) => ({
      cncfProject: p.cncf_project,
      slug: p.cncf_project_slug,
      maturity: p.cncf_project_maturity,
      title: scrubText(p.program_name_short),
      term: p.term,
      lfxProjectUuid: p.lfx_url?.match(UUID)?.[1]?.toLowerCase() ?? null,
      upstreamIssueUrl: httpsUrl(p.upstream_issue_url),
      technologies: (p.technologies ?? "")
        .split(",")
        .map((t) => scrubText(t.trim()))
        .filter(Boolean)
        .slice(0, 20),
      summary: excerpt(p.description ? scrubText(p.description) : null, 400),
      mentors: p.mentors.map((m) => ({
        name: scrubText(m.name),
        githubHandle: m.github_handle,
        role: m.role,
      })),
    })),
  };
  assertNoContactData(body);
  return body;
}

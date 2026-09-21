import { z } from "zod";
import { assertNoContactData, scrubText } from "@opensourcex/shared";
import { excerpt } from "./types";

/**
 * LFX Mentorship API sanitizer. ALLOWLIST only. The API returns a project-level `lfid`
 * (an LFID) and other fields; none of them are kept (docs/DATA_POLICY.md section 3).
 */
const rawTerm = z.object({
  name: z.string(),
  startDateTime: z.number().nullable().optional().default(null),
  endDateTime: z.number().nullable().optional().default(null),
  applicationStartDate: z.number().nullable().optional().default(null),
  applicationEndDate: z.number().nullable().optional().default(null),
  active: z.string().nullable().optional().default(null),
});

const rawProject = z.object({
  projectId: z.string().uuid(),
  name: z.string(),
  status: z.string(),
  repoLink: z.string().nullable().optional().default(null),
  description: z.string().nullable().optional().default(null),
  programTerms: z.array(rawTerm).optional().default([]),
});

export interface LfxTerm {
  rawName: string;
  startSec: number | null;
  endSec: number | null;
  applyStartSec: number | null;
  applyEndSec: number | null;
  activeFlag: string | null;
}
export interface LfxProject {
  projectUuid: string;
  title: string;
  status: string;
  repoLink: string | null;
  summary: string | null;
  terms: LfxTerm[];
}
export interface LfxProjectsBody {
  projects: LfxProject[];
}

export function sanitizeLfxProject(raw: unknown): LfxProject {
  const p = rawProject.parse(raw);
  const out: LfxProject = {
    projectUuid: p.projectId.toLowerCase(),
    title: scrubText(p.name),
    status: p.status,
    repoLink: p.repoLink && /^https?:\/\/[^\s]+$/.test(p.repoLink) ? p.repoLink : null,
    summary: excerpt(p.description ? scrubText(p.description) : null, 300),
    terms: p.programTerms.map((t) => ({
      rawName: t.name,
      startSec: t.startDateTime,
      endSec: t.endDateTime,
      applyStartSec: t.applicationStartDate,
      applyEndSec: t.applicationEndDate,
      activeFlag: t.active,
    })),
  };
  assertNoContactData(out);
  return out;
}

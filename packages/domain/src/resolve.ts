import { parseGithubUrl, type GithubRef } from "./github-url";

/**
 * Entity resolution for the M1a spike (docs/ENTITY_RESOLUTION.md). No GitHub API calls are
 * made here, so GitHub repository/org ids are unverified: every URL-derived link is INFERRED,
 * never CONFIRMED. Only deterministic identifier joins (LFX project UUID) are CONFIRMED.
 */
export type LinkState = "INFERRED" | "ORG_ONLY" | "UNLINKED";

export interface UpstreamLink {
  state: LinkState;
  ref: GithubRef;
  /** canonical repository or organization URL */
  key: string | null;
  reason: string;
}

export function linkUpstream(repoLink: string | null | undefined): UpstreamLink {
  const ref = parseGithubUrl(repoLink);
  switch (ref.kind) {
    case "repo":
      return {
        state: "INFERRED",
        ref,
        key: ref.canonicalUrl,
        reason: "canonical URL; GitHub id not yet verified",
      };
    case "issue":
    case "pull":
      return {
        state: "INFERRED",
        ref,
        key: ref.canonicalUrl,
        reason: `repository derived from a ${ref.kind} URL; GitHub id not yet verified`,
      };
    case "org":
      return {
        state: "ORG_ONLY",
        ref,
        key: ref.canonicalUrl,
        reason: "organization URL only; repository not guessed",
      };
    case "not-github":
      return { state: "UNLINKED", ref, key: null, reason: "not a GitHub URL" };
    default:
      return { state: "UNLINKED", ref, key: null, reason: "no usable GitHub reference" };
  }
}

export interface JoinInput {
  cncf: { lfxProjectUuid: string | null; upstreamIssueUrl: string | null }[];
  lfx: { projectUuid: string; repoLink: string | null }[];
}
export interface JoinResult {
  matched: { uuid: string; repoAgreement: "agree" | "disagree" | "unknown" }[];
  cncfWithoutLfx: string[];
  lfxWithoutCncf: string[];
}

/** Join CNCF export rows to LFX API projects by LFX project UUID (a stable identifier). */
export function joinCncfToLfx(input: JoinInput): JoinResult {
  const lfx = new Map(input.lfx.map((p) => [p.projectUuid, p]));
  const matched: JoinResult["matched"] = [];
  const cncfWithoutLfx: string[] = [];
  const seen = new Set<string>();
  for (const c of input.cncf) {
    const id = c.lfxProjectUuid;
    const l = id ? lfx.get(id) : undefined;
    if (!id || !l) {
      cncfWithoutLfx.push(id ?? "(no uuid)");
      continue;
    }
    seen.add(id);
    const a = linkUpstream(c.upstreamIssueUrl).key;
    const b = linkUpstream(l.repoLink).key;
    matched.push({
      uuid: id,
      repoAgreement: !a || !b ? "unknown" : a === b ? "agree" : "disagree",
    });
  }
  return { matched, cncfWithoutLfx, lfxWithoutCncf: [...lfx.keys()].filter((k) => !seen.has(k)) };
}

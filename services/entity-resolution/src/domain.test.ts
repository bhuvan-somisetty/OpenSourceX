import { describe, expect, it } from "vitest";
import { derivedTermStatus, normalizeTerm } from "./terms";
import { parseGithubUrl } from "./github-url";
import { joinCncfToLfx, linkUpstream } from "./resolve";

const sec = (iso: string) => Math.floor(Date.parse(iso) / 1000);

// Term-name spellings are real ones observed in the LFX API (docs/RESEARCH). The dates in
// these cases are DEVELOPMENT FIXTURE values chosen to exercise the rules.
describe("normalizeTerm: dates first", () => {
  it.each([
    ["Term 3: Sep-Nov", "2024-09-02", "T3"],
    ["Term 1 Mar-May", "2023-03-06", "T1"],
    ["01-Mar-May", "2024-03-04", "T1"],
    ["2026 Term 1: March - May", "2026-03-02", "T1"],
    ["Term 2 Jun-Aug", "2023-06-05", "T2"],
    ["2026 Term 3 (Sep-Nov)", "2026-09-07", "T3"],
  ])("%s -> %s (%s) confirmed", (name, start, code) => {
    const t = normalizeTerm({ rawName: name, startSec: sec(start), endSec: null });
    expect(t.termCode).toBe(code);
    expect(t.status).toBe("CONFIRMED");
    expect(t.rawName).toBe(name);
  });

  it("legacy names with no term hint are INFERRED from dates, keeping track", () => {
    const t = normalizeTerm({ rawName: "Summer PT", startSec: sec("2020-06-15"), endSec: null });
    expect(t.termCode).toBe("T2");
    expect(t.track).toBe("part-time");
  });

  it("flags a name that contradicts the dates instead of coercing", () => {
    const t = normalizeTerm({
      rawName: "Term 2 Jun-Aug",
      startSec: sec("2024-03-04"),
      endSec: null,
    });
    expect(t.status).toBe("CONFLICTING");
    expect(t.confidence).toBe("low");
  });

  it("flags a year that contradicts the dates", () => {
    const t = normalizeTerm({
      rawName: "2025 Term 3: Sep-Nov",
      startSec: sec("2024-09-02"),
      endSec: null,
    });
    expect(t.status).toBe("CONFLICTING");
  });

  it("uses name only, with low confidence, when dates are missing", () => {
    const t = normalizeTerm({ rawName: "Spring'2022", startSec: null, endSec: null });
    expect(t).toMatchObject({
      status: "INFERRED",
      confidence: "low",
      termCode: "T1",
      year: 2022,
      startsOn: null,
    });
  });

  it("is UNKNOWN when there is nothing to go on", () => {
    expect(normalizeTerm({ rawName: "???", startSec: null, endSec: null }).status).toBe("UNKNOWN");
  });
});

describe("derivedTermStatus", () => {
  const term = { startsOn: "2026-09-07", endsOn: "2026-11-27" };
  it("comes from dates only", () => {
    expect(derivedTermStatus(term, new Date("2026-09-01"))).toBe("upcoming");
    expect(derivedTermStatus(term, new Date("2026-09-21"))).toBe("in_progress");
    expect(derivedTermStatus(term, new Date("2026-12-01"))).toBe("completed");
    expect(derivedTermStatus({ startsOn: null, endsOn: null })).toBe("unknown");
  });
});

describe("parseGithubUrl", () => {
  it("handles repos, .git, case, www and trailing slash", () => {
    expect(parseGithubUrl("https://www.GitHub.com/Foo/Bar.git/").canonicalUrl).toBe(
      "https://github.com/foo/bar",
    );
  });
  it("recognizes issue and pull URLs and org-only URLs", () => {
    expect(parseGithubUrl("https://github.com/jaegertracing/jaeger-ui/issues/4278")).toMatchObject({
      kind: "issue",
      number: 4278,
    });
    expect(parseGithubUrl("https://github.com/a/b/pull/7").kind).toBe("pull");
    expect(parseGithubUrl("https://github.com/openmainframeproject-internship").kind).toBe("org");
  });
  it("rejects non-GitHub, malformed and reserved paths", () => {
    expect(parseGithubUrl("https://gitlab.com/a/b").kind).toBe("not-github");
    expect(parseGithubUrl("not a url").kind).toBe("invalid");
    expect(parseGithubUrl("https://github.com/orgs/x").kind).toBe("other-github");
    expect(parseGithubUrl("ftp://github.com/a/b").kind).toBe("invalid");
    expect(parseGithubUrl(null).kind).toBe("invalid");
  });
});

describe("entity resolution", () => {
  it("URL-derived links are INFERRED, org links are ORG_ONLY, others UNLINKED", () => {
    expect(linkUpstream("https://github.com/a/b/issues/1").state).toBe("INFERRED");
    expect(linkUpstream("https://github.com/a").state).toBe("ORG_ONLY");
    expect(linkUpstream("https://example.org/x").state).toBe("UNLINKED");
    expect(linkUpstream(null).state).toBe("UNLINKED");
  });

  it("joins CNCF to LFX by UUID and reports the unmatched on both sides", () => {
    const r = joinCncfToLfx({
      cncf: [
        { lfxProjectUuid: "u1", upstreamIssueUrl: "https://github.com/a/b/issues/1" },
        { lfxProjectUuid: "u2", upstreamIssueUrl: "https://github.com/a/c/issues/2" },
        { lfxProjectUuid: "u9", upstreamIssueUrl: null },
        { lfxProjectUuid: null, upstreamIssueUrl: null },
      ],
      lfx: [
        { projectUuid: "u1", repoLink: "https://github.com/a/b" },
        { projectUuid: "u2", repoLink: "https://github.com/x/y" },
        { projectUuid: "u3", repoLink: null },
      ],
    });
    expect(r.matched).toEqual([
      { uuid: "u1", repoAgreement: "agree" },
      { uuid: "u2", repoAgreement: "disagree" },
    ]);
    expect(r.cncfWithoutLfx).toEqual(["u9", "(no uuid)"]);
    expect(r.lfxWithoutCncf).toEqual(["u3"]);
  });
});

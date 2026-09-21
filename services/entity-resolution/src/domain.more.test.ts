import { describe, expect, it } from "vitest";
import { derivedTermStatus, normalizeTerm } from "./terms";
import { parseGithubUrl } from "./github-url";
import { joinCncfToLfx, linkUpstream } from "./resolve";

const sec = (iso: string) => Math.floor(Date.parse(iso) / 1000);

// Spellings are real ones seen in the LFX API; dates are DEVELOPMENT FIXTURE values.
describe("more real term spellings", () => {
  it.each([
    ["Term 2: Jun - Aug", "2024-06-03", "T2"],
    ["Term 2: Jun-Aug", "2024-06-03", "T2"],
    ["2025 Term 1: Mar - May", "2025-03-03", "T1"],
    ["Term 3 Sep-Nov", "2023-09-04", "T3"],
    ["02-Jun-Aug", "2024-06-03", "T2"],
  ])("%s", (name, start, code) => {
    const t = normalizeTerm({ rawName: name, startSec: sec(start), endSec: null });
    expect(t).toMatchObject({ termCode: code, status: "CONFIRMED" });
  });

  it("keeps full-time and part-time tracks apart", () => {
    const a = normalizeTerm({ rawName: "Summer FT", startSec: sec("2020-06-15"), endSec: null });
    const b = normalizeTerm({ rawName: "Summer PT", startSec: sec("2020-06-15"), endSec: null });
    expect([a.track, b.track]).toEqual(["full-time", "part-time"]);
  });

  it("a future term is upcoming, never participation", () => {
    const t = normalizeTerm({
      rawName: "2027 Term 1",
      startSec: sec("2027-03-01"),
      endSec: sec("2027-05-31"),
    });
    expect(derivedTermStatus(t, new Date("2026-09-21"))).toBe("upcoming");
  });

  it("source status prose cannot override dates (README says Planning, term started)", () => {
    const t = { startsOn: "2026-09-07", endsOn: "2026-11-27" };
    expect(derivedTermStatus(t, new Date("2026-09-21"))).toBe("in_progress");
  });
});

describe("more resolution cases", () => {
  it("case and .git differences resolve to the same canonical key", () => {
    expect(linkUpstream("https://github.com/Jaegertracing/Jaeger.git").key).toBe(
      linkUpstream("https://github.com/jaegertracing/jaeger/").key,
    );
  });
  it("a pull URL and org URL are handled distinctly", () => {
    expect(parseGithubUrl("https://github.com/a/b/pull/9").kind).toBe("pull");
    expect(linkUpstream("https://github.com/cncf").state).toBe("ORG_ONLY");
  });
  it("duplicate CNCF rows for one LFX uuid both match without inventing a second project", () => {
    const r = joinCncfToLfx({
      cncf: [
        { lfxProjectUuid: "u1", upstreamIssueUrl: null },
        { lfxProjectUuid: "u1", upstreamIssueUrl: null },
      ],
      lfx: [{ projectUuid: "u1", repoLink: null }],
    });
    expect(r.matched).toHaveLength(2);
    expect(r.lfxWithoutCncf).toEqual([]);
  });
  it("a uuid the LFX API does not have is reported, not guessed", () => {
    expect(
      joinCncfToLfx({ cncf: [{ lfxProjectUuid: "zz", upstreamIssueUrl: null }], lfx: [] })
        .cncfWithoutLfx,
    ).toEqual(["zz"]);
  });
});

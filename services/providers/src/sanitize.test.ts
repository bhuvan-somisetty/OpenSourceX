import { describe, expect, it } from "vitest";
import { assertNoContactData } from "@opensourcex/shared";
import { sanitizeCncfExport } from "./cncf";
import { sanitizeLfxProject } from "./lfx";
import { sanitizeGsocOrg } from "./gsoc";
import { assertMayPersist, PROVIDERS } from "./registry";

// DEVELOPMENT FIXTURE: synthetic input with deliberately planted contact data.
// The .invalid TLD is reserved and never resolves; none of these are real people.
const PLANTED_EMAIL = "planted.mentor@example.invalid";
const PLANTED_LFID = "planted-lfid-zz9";
const PLANTED_EMAIL_2 = "hidden.in.text@example.invalid";

const rawCncf = {
  _generated: "2026-01-01T00:00:00Z",
  _term: "2026 Term 3 (Sep-Nov)",
  _internal_note: `ask ${PLANTED_EMAIL}`,
  programs: [
    {
      cncf_project: "Example Project",
      cncf_project_slug: "example",
      program_name_short: "Do a thing",
      term: "2026 Term 3 (Sep-Nov)",
      lfx_url:
        "https://mentorship.lfx.linuxfoundation.org/project/36d66a45-bf3f-4bd2-8032-438436557e11",
      technologies: "Go, Kubernetes",
      description: `Write docs. Contact ${PLANTED_EMAIL_2} or mailto:${PLANTED_EMAIL_2} for help.`,
      prerequisites: { resume: true },
      mentors: [
        {
          name: `Planted Person ${PLANTED_EMAIL}`,
          github_handle: "planted-dev",
          role: "mentor",
          email: PLANTED_EMAIL,
          lfid: PLANTED_LFID,
        },
        { name: "No Handle", github_handle: "not a valid handle!", email: PLANTED_EMAIL },
      ],
    },
  ],
};

describe("CNCF sanitizer", () => {
  const out = sanitizeCncfExport(rawCncf);
  const json = JSON.stringify(out);

  it("drops emails and LFIDs everywhere", () => {
    expect(json).not.toContain(PLANTED_EMAIL);
    expect(json).not.toContain(PLANTED_EMAIL_2);
    expect(json).not.toContain(PLANTED_LFID);
    expect(json).not.toMatch(/@/);
    expect(() => assertNoContactData(out)).not.toThrow();
  });
  it("keeps only approved public fields for mentors", () => {
    expect(Object.keys(out.programs[0]!.mentors[0]!).sort()).toEqual([
      "githubHandle",
      "name",
      "role",
    ]);
    expect(out.programs[0]!.mentors[0]!.githubHandle).toBe("planted-dev");
  });
  it("nulls invalid handles instead of guessing", () => {
    expect(out.programs[0]!.mentors[1]!.githubHandle).toBeNull();
  });
  it("extracts the LFX project UUID join key", () => {
    expect(out.programs[0]!.lfxProjectUuid).toBe("36d66a45-bf3f-4bd2-8032-438436557e11");
  });
  it("is deterministic", () => {
    expect(JSON.stringify(sanitizeCncfExport(rawCncf))).toBe(json);
  });
});

describe("LFX sanitizer", () => {
  it("drops the project-level lfid and unknown fields", () => {
    const out = sanitizeLfxProject({
      projectId: "36d66a45-bf3f-4bd2-8032-438436557e11",
      lfid: PLANTED_LFID,
      name: `Title ${PLANTED_EMAIL}`,
      status: "Published",
      repoLink: "https://github.com/example/repo",
      description: `mail ${PLANTED_EMAIL}`,
      creatorEmail: PLANTED_EMAIL,
      programTerms: [{ name: "Term 3", startDateTime: 1, endDateTime: 2, extra: PLANTED_LFID }],
    });
    const json = JSON.stringify(out);
    expect(json).not.toContain(PLANTED_LFID);
    expect(json).not.toContain(PLANTED_EMAIL);
    expect(out).not.toHaveProperty("lfid");
  });
});

describe("GSoC sanitizer", () => {
  it("does not keep contact links or comm methods", () => {
    const out = sanitizeGsocOrg({
      slug: "x",
      name: "X",
      contact_links: [{ url: `mailto:${PLANTED_EMAIL}` }],
      direct_comm_methods: [PLANTED_EMAIL],
      tech_tags: ["go"],
    });
    expect(JSON.stringify(out)).not.toContain("planted");
    expect(out).not.toHaveProperty("contactLinks");
  });
});

describe("provider gate", () => {
  it("no provider is approved yet", () => {
    expect(PROVIDERS.every((p) => p.ingestion !== "approved")).toBe(true);
    expect(PROVIDERS.find((p) => p.key === "lfx-mentorship-api")?.ingestion).toBe("blocked");
  });
  it("blocks live persistence for pending providers, allows recorded", () => {
    expect(() => assertMayPersist("cncf-mentoring", "live")).toThrow(/not allowed/);
    expect(() => assertMayPersist("cncf-mentoring", "recorded")).not.toThrow();
  });
});

describe("HTML in source descriptions", () => {
  it("is stripped to plain text, including a truncated trailing tag", () => {
    const out = sanitizeLfxProject({
      projectId: "36d66a45-bf3f-4bd2-8032-438436557e11",
      name: "T",
      status: "Published",
      description:
        '<h2>Description</h2><p>Jaeger <strong>UI</strong> is &amp; migrating. <a href="x">link</a></p><p>tail <str',
    });
    expect(out.summary).toBe("Jaeger UI is & migrating. link tail");
    expect(out.summary).not.toMatch(/<[a-z/]/i);
  });
});

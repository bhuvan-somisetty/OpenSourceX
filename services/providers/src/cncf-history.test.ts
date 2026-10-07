import { describe, expect, it } from "vitest";
import {
  buildCncfHistory,
  canonicalProject,
  firstDate,
  parseMentors,
  parseTerm,
  termFromFolder,
} from "./cncf-history";

const MODERN = `# Term 03 - 2025 Sept - Nov

Status: Planning

### Timeline

| **Activity** | **Dates (2025)** |
|---|---|
| **Mentee Applications Open** | Thurs, July 31 – Tue, August 12 |
| **Mentorship Program Begins (Work Phase, Week 1)** | Mon, September 8 |
| **Last Day of Term** | Fri, November 28 |

---

* [Jaeger](#jaeger)
  * [Demo](#demo)

### Jaeger

#### Next-Generation Jaeger Demo (2025 Term 3)

- Description: Build a <b>demo</b> environment.
- Recommended Skills: Kubernetes, Go, Monitoring
- Mentor(s):
  - Jonah Kowall (@jkowall, jonah@example.com)
  - Yash Sharma (yash@meta.com)
- Upstream Issue: https://github.com/jaegertracing/jaeger/issues/7327
- LFX URL: https://mentorship.lfx.linuxfoundation.org/project/216f0f5d-6a7a-45f1-9592-2336ce734b2c

### in-toto

### Add GUAC support

Description: Integrate GUAC.

Mentor(s):
- Alice Doe (@alice)

- LFX URL: https://mentorship.lfx.linuxfoundation.org/project/abfb7093-b057-40da-8be1-c67bd8839698
`;

const PILOT = `## 2019

#### Completed Projects

| CNCF Projects | Community Bridge Project | Mentor Name(s) | Mentee Name |
|---|---|---|---|
| Kubernetes | CSI Driver for Azure Disk | Xia Zhang | [Jane Mentee](https://www.linkedin.com/in/jane/) |
`;

describe("parseMentors", () => {
  it("keeps name and GitHub handle, drops emails", () => {
    expect(parseMentors("Jonah Kowall (@jkowall, jonah@example.com), Bob (@bob)")).toEqual([
      { name: "Jonah Kowall", githubHandle: "jkowall" },
      { name: "Bob", githubHandle: "bob" },
    ]);
  });
  it("never reads an email domain as a handle", () => {
    expect(parseMentors("Yash Sharma (yash@meta.com)")).toEqual([
      { name: "Yash Sharma", githubHandle: null },
    ]);
  });
  it("splits 'and' / '&' lists", () => {
    expect(parseMentors("Krasi Georgiev and Julius Volz").map((m) => m.name)).toEqual([
      "Krasi Georgiev",
      "Julius Volz",
    ]);
  });
});

describe("parseTerm", () => {
  const t = parseTerm([
    {
      year: 2025,
      folder: "03-Sep-Nov",
      path: "programs/lfx-mentorship/2025/03-Sep-Nov/README.md",
      markdown: MODERN,
    },
  ]);

  it("reads the term, its timeline and the work window", () => {
    expect(t.termCode).toBe("T3");
    expect(t.label).toBe("2025 Term 3 (Sep-Nov)");
    expect(t.timeline).toHaveLength(3);
    expect(t.startsOn).toBe("2025-09-08");
    expect(t.endsOn).toBe("2025-11-28");
  });

  it("reads programs, including bullet-less fields and sibling project headings", () => {
    expect(t.programs.map((p) => [p.cncfProject, p.title])).toEqual([
      ["Jaeger", "Next-Generation Jaeger Demo"],
      ["in-toto", "Add GUAC support"],
    ]);
    const jaeger = t.programs[0]!;
    expect(jaeger.lfxProjectUuid).toBe("216f0f5d-6a7a-45f1-9592-2336ce734b2c");
    expect(jaeger.skills).toEqual(["Kubernetes", "Go", "Monitoring"]);
    expect(jaeger.summary).toBe("Build a demo environment.");
    expect(jaeger.mentors).toEqual([
      { name: "Jonah Kowall", githubHandle: "jkowall" },
      { name: "Yash Sharma", githubHandle: null },
    ]);
    expect(t.programs[1]!.mentors).toEqual([{ name: "Alice Doe", githubHandle: "alice" }]);
  });

  it("reads the pilot-year table without mentee names", () => {
    const p = parseTerm([
      {
        year: 2019,
        folder: "2019",
        path: "programs/lfx-mentorship/2019/README.md",
        markdown: PILOT,
      },
    ]);
    expect(p.termCode).toBeNull();
    expect(p.programs).toEqual([
      expect.objectContaining({
        cncfProject: "Kubernetes",
        title: "CSI Driver for Azure Disk",
        mentors: [{ name: "Xia Zhang", githubHandle: null }],
      }),
    ]);
    expect(JSON.stringify(p)).not.toMatch(/Jane Mentee|linkedin/);
  });
});

describe("helpers", () => {
  it("maps folder names to terms", () => {
    expect(
      ["01-Mar-May", "02-Summer", "03-Sept-Nov", "q3-q4", "01-Spring"].map(termFromFolder),
    ).toEqual(["T1", "T2", "T3", "T3", "T1"]);
  });
  it("reads the first date of a free-text cell", () => {
    expect(firstDate("Tue, Nov 24, 18:00 UTC", 2026)).toBe("2026-11-24");
    expect(firstDate("TBD", 2026)).toBeNull();
  });
  it("merges spellings of the same CNCF project", () => {
    expect(canonicalProject("Kubearmor")).toBe("KubeArmor");
    expect(canonicalProject("Jaeger")).toBe("Jaeger");
  });
  it("scrubs emails out of free text before the output is checked", () => {
    const body = buildCncfHistory("abc", [
      [
        {
          year: 2025,
          folder: "01-Mar-May",
          path: "x/README.md",
          markdown: "### P\n\n#### T\n\n- Description: mail me@example.com\n- Mentor(s): A (@a)",
        },
      ],
    ]);
    expect(JSON.stringify(body)).not.toMatch(/me@example\.com/);
    expect(body.terms[0]!.programs[0]!.mentors).toEqual([{ name: "A", githubHandle: "a" }]);
  });
});

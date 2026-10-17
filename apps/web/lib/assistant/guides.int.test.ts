import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createPool,
  readKnowledgeDir,
  replaceKnowledge,
  searchKnowledge,
} from "@opensourcex/database";
import { buildKnowledge, type Knowledge } from "./knowledge";
import { answerOffline } from "./offline";

const url = process.env.DATABASE_URL;
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data/knowledge");

describe.skipIf(!url)("knowledge base answers", () => {
  const pool = createPool(url ?? "postgres://unused");
  let k: Knowledge;
  const ask = async (q: string, previous: string[] = []) =>
    answerOffline(q, k, { previous, guides: await searchKnowledge(pool, q, { limit: 8 }) });

  beforeAll(async () => {
    // real reference proposals live outside the public repo; tests use a synthetic one
    await replaceKnowledge(pool, [
      ...(await readKnowledgeDir(dir)),
      {
        id: "reference-test-integration-testing",
        kind: "reference",
        title: "Example LFX proposal: integration testing framework (test fixture)",
        tags: ["kyverno", "testing", "integration tests", "proposal example"],
        sources: [{ label: "Test fixture", url: null }],
        sections: [
          {
            heading: "Phase 1: Framework Foundation (Weeks 1-3)",
            content:
              "Set up the integration test framework with envtest, install the CRDs, and add a make test-integration target. Milestone: tests pass in under 10 seconds with no cluster.",
          },
        ],
      },
    ]);
    k = await buildKnowledge(null);
  });
  afterAll(() => pool.end());

  it("answers LFX prerequisites with resume, cover letter and certificates", async () => {
    const a = await ask("what r prerequisite task to be done while applying lfx");
    expect(a).toMatch(/Prerequisite tasks when applying to LFX Mentorship/);
    expect(a).toMatch(/Resume/);
    expect(a).toMatch(/Cover letter/);
    expect(a).toMatch(/certificate of completion/);
  });

  it("answers the LFX application limit", async () => {
    expect(await ask("how many projects can i apply to in lfx?")).toMatch(/at most three/);
  });

  it("explains cover letters and proposals", async () => {
    expect(await ask("how to write cover letter for lfx")).toMatch(/four questions/i);
    expect(await ask("how do i write a good proposal")).toMatch(
      /Proof of concept|proof of concept/,
    );
  });

  it("shows a reference proposal excerpt when asked for an example", async () => {
    const a = await ask("show me an example proposal for kyverno testing");
    expect(a).toMatch(/Example from a reference proposal/);
    expect(a).not.toMatch(/@gmail|Panda|Rathour|Somisetty/);
  });

  it("covers general open source topics", async () => {
    expect(await ask("difference between gsoc and lfx")).toMatch(/Google Summer of Code/);
    expect(await ask("how do i sign off my commits for dco")).toMatch(/git commit -s/);
    expect(await ask("what is the apache license")).toMatch(/Apache-2.0/);
  });

  it("still answers stipend questions from program data", async () => {
    expect(await ask("what is the gsoc stipend")).toMatch(/Stipend/);
  });
});

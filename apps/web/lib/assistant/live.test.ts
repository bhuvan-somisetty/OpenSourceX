import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { buildKnowledge, type Knowledge } from "./knowledge";
import { packageInfo, repoSlug, safely, scrubEmails } from "./live";
import { liveOfflineAnswer } from "./live-offline";

const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  );

let k: Knowledge;
beforeAll(async () => {
  k = await buildKnowledge(null);
});
afterEach(() => vi.unstubAllGlobals());

describe("live API helpers", () => {
  it("removes email addresses but keeps package versions", () => {
    expect(scrubEmails({ a: "Kenneth <me@kennethreitz.org>", v: "lodash@4.17.15" })).toEqual({
      a: "Kenneth <[email removed]>",
      v: "lodash@4.17.15",
    });
  });

  it("parses repository slugs from slugs and URLs", () => {
    expect(repoSlug("volcano-sh/volcano")).toBe("volcano-sh/volcano");
    expect(repoSlug("https://github.com/kyverno/kyverno.git")).toBe("kyverno/kyverno");
    expect(repoSlug("https://github.com/kubernetes/kubernetes/issues?q=x")).toBe(
      "kubernetes/kubernetes",
    );
  });

  it("reads npm package info and never passes emails through", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        json({
          version: "19.2.0",
          description: "UI",
          license: "MIT",
          author: "dev@react.dev",
          repository: { url: "git+https://github.com/facebook/react.git" },
        }),
      ),
    );
    const p = await packageInfo("npm", "react-test-pkg");
    expect(p).toMatchObject({
      latestVersion: "19.2.0",
      license: "MIT",
      repository: "https://github.com/facebook/react",
    });
    expect(JSON.stringify(p)).not.toContain("@react.dev");
  });

  it("turns failures into a short error for the model", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => json({ message: "rate limited" }, 403)),
    );
    const r = await safely("GitHub", () => packageInfo("npm", "rate-limited-pkg"));
    expect(r).toMatchObject({ error: expect.stringMatching(/Live GitHub lookup failed/) });
  });
});

describe("live answers without AI", () => {
  it("lists good first issues for a named org's repository", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        json({
          total_count: 1,
          items: [
            {
              title: "Fix docs typo",
              html_url: "https://github.com/x/y/issues/1",
              repository_url: "https://api.github.com/repos/x/y",
              created_at: "2026-10-01T00:00:00Z",
              comments: 2,
              labels: [{ name: "good first issue" }],
              assignee: null,
            },
          ],
        }),
      ),
    );
    const a = await liveOfflineAnswer("give me good first issues in python software foundation", k);
    expect(a).toMatch(/Open good first issues/);
    expect(a).toContain("https://github.com/x/y/issues/1");
  });

  it("answers package versions only when an ecosystem is named", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        json({
          info: {
            version: "2.32.5",
            summary: "HTTP for Humans.",
            license: "Apache-2.0",
            home_page: null,
            project_urls: {},
            requires_python: ">=3.9",
          },
        }),
      ),
    );
    expect(await liveOfflineAnswer("what is the latest version of requests on pypi", k)).toMatch(
      /2\.32\.5/,
    );
    expect(await liveOfflineAnswer("what is the latest version of requests", k)).toBeNull();
  });

  it("falls back to the normal offline answer when a lookup fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    expect(await liveOfflineAnswer("good first issues in rust", k)).toBeNull();
  });
});

import { anon, clearSaved, EMAIL, expect, projectIds, test } from "./fixtures";

// ---------- public experience ----------
anon(
  "landing: one-screen premium hero with minimal navigation and no sections below",
  async ({ page }) => {
    await page.goto("/product");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Understand open source.");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find where you belong.");
    await expect(page.getByTestId("cta-get-started")).toBeVisible();
    await expect(page.getByRole("link", { name: "Saved" })).toHaveCount(0); // the public nav is not the app nav
    await expect(page.getByTestId("dev-banner")).toHaveCount(0);
    // one viewport: nothing to scroll, and the old sections are gone
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight + 1,
    );
    expect(scrolls).toBe(false);
    await expect(page.getByTestId("landing-programs")).toHaveCount(0);
    await expect(page.getByTestId("trust-chain")).toHaveCount(0);
  },
);

anon(
  "landing: navigation sheets open and close (desktop) and the menu works (mobile)",
  async ({ page, isMobile }) => {
    await page.goto("/product");
    await page.waitForLoadState("networkidle");
    if (isMobile) {
      await page.getByTestId("pub-menu-button").click();
      await expect(page.getByTestId("pub-menu")).toBeVisible();
      await page.getByTestId("pub-menu").getByRole("button", { name: "How it works" }).click();
    } else {
      await page.getByTestId("nav-programs").click();
    }
    await expect(page.getByTestId("sheet")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("sheet")).toHaveCount(0);
  },
);

anon(
  "login: OAuth is honestly disabled without credentials; Local Preview signs in and is clearly labeled",
  async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("oauth-google")).toBeDisabled();
    await expect(page.getByTestId("oauth-github")).toBeDisabled();
    await expect(page.getByText("sign-in are coming soon").first()).toBeVisible();
    await expect(page.getByTestId("local-preview")).toContainText("not a real account");
    await expect(page.getByTestId("dev-login")).toHaveText("Continue in Local Preview");
    await page.waitForLoadState("networkidle");
    await page.getByTestId("dev-login").click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByTestId("dev-banner")).toContainText("development session");
    await page.getByTestId("profile-button").click();
    await expect(page.getByTestId("profile-menu")).toContainText("Local development session");
    await page.getByTestId("sign-out").click();
    // signing out asks first
    await page.getByTestId("confirm-sign-out").click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  },
);

anon("auth gate: app pages and the saved API require a session", async ({ page }) => {
  for (const path of ["/app", "/discover", "/projects", "/saved", "/programs"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
  expect((await page.request.get("/api/v1/saved")).status()).toBe(401);
});

// ---------- signed-in app ----------
/** The first recorded LFX Mentorship project; the old /projects catalog now opens Programs. */
async function firstLfxProject(page: import("@playwright/test").Page): Promise<string> {
  const res = await page.request.get("/api/v1/projects?program=lfx-mentorship");
  const items = ((await res.json()) as { items: { id: string }[] }).items;
  if (!items[0]) throw new Error("no recorded LFX Mentorship project");
  return items[0].id;
}

test("app home: workspace with search, programs and next steps", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your launchpad into open source.",
  );
  await expect(page.getByRole("link", { name: /Google Summer of Code/ }).first()).toBeVisible();
  await expect(page.getByText(/your next step/i).first()).toBeVisible();
});

test("programs: selection screen, then GSoC and LFX ecosystems", async ({ page }) => {
  await page.goto("/programs");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Where do you want to contribute?",
  );
  const main = page.getByRole("main");
  for (const name of ["Google Summer of Code", "LFX Mentorship", "Outreachy"])
    await expect(main.getByRole("link", { name: new RegExp(name) }).first()).toBeVisible();
  await main
    .getByRole("link", { name: /Google Summer of Code/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/programs\/gsoc/);
  await expect(page.getByTestId("program-hero")).toContainText("Google Summer of Code");
  await expect(page.getByTestId("program-search-input")).toBeVisible();
  await page.goto("/programs/lfx");
  await expect(page.getByTestId("ecosystem-note")).toContainText(
    "CNCF-listed LFX Mentorship projects",
  );
  await expect(
    page.getByTestId("program-tabs").getByRole("link", { name: "Technologies" }),
  ).toBeVisible();
});

test("program filter drives the actual data", async ({ request }) => {
  // the catalog page is gone (/projects opens Programs); its data API still filters by program
  const list = async (q: string) =>
    (await (await request.get(`/api/v1/projects${q}`)).json()) as {
      total: number;
      items: { program: { slug: string; name: string } }[];
    };
  const gsoc = await list("?program=gsoc");
  expect(gsoc.items.length).toBeGreaterThan(0);
  for (const i of gsoc.items) expect(i.program.slug).toBe("gsoc");
  const lfx = await list("?program=lfx-mentorship");
  for (const i of lfx.items) expect(i.program.slug).toBe("lfx-mentorship");
  expect((await list("")).total).toBeGreaterThanOrEqual(lfx.total);
  expect(
    (await list("?program=outreachy")).items.every((i) => i.program.slug === "outreachy"),
  ).toBe(true);
});

test("discover is not a catalog, and the old catalog opens Programs", async ({ page }) => {
  await page.goto("/discover");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "What are you interested in?",
  );
  await expect(page.getByTestId("project-row")).toHaveCount(0); // discover is not a catalog
  await expect(page.getByTestId("open-interest-picker")).toBeVisible();
  // an interest in the URL drives the matches, each card says why it matched, nothing is a score
  await page.goto("/discover?i=TypeScript");
  await expect(page.getByTestId("match-count")).toBeVisible();
  const cards = page.locator('[data-testid^="discovery-org-card-"]');
  await expect(cards.first()).toBeVisible();
  for (const t of (await cards.allInnerTexts()).slice(0, 10)) expect(t).toContain("TypeScript");
  await expect(page.getByText(/\d+\s*\/\s*100|% match/)).toHaveCount(0);
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/programs$/);
});

test("save and unsave a project persists across reloads, and shows on the Saved page", async ({
  page,
}) => {
  await clearSaved(page);
  await page.goto("/saved");
  await expect(page.getByTestId("empty-state")).toContainText("You haven't saved anything yet.");
  await page.goto(`/projects/${await firstLfxProject(page)}`);
  await page.waitForLoadState("networkidle");
  const btn = page.getByTestId("project-hero").getByTestId("save-button").first();
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(
      async () =>
        ((await (await page.request.get("/api/v1/saved")).json()).items as unknown[]).length,
    )
    .toBe(1);
  await page.reload();
  await expect(page.getByTestId("project-hero").getByTestId("save-button").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("/saved");
  await expect(page.getByTestId("saved-total")).toHaveText("1");
  await expect(page.getByTestId("saved-group-lfx-mentorship")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("saved-item").getByTestId("save-button").click();
  // unsaving asks first
  await page.getByTestId("unsave-confirm-confirm").click();
  await expect(page.getByTestId("empty-state")).toBeVisible();
});

test("saved page filters by program and type; repository and project-detail saves work", async ({
  page,
}) => {
  await clearSaved(page);
  await page.goto(`/projects/${await firstLfxProject(page)}`);
  await page.waitForLoadState("networkidle");
  await page.getByTestId("project-hero").getByTestId("save-button").first().click();
  await expect
    .poll(
      async () =>
        ((await (await page.request.get("/api/v1/saved")).json()).items as unknown[]).length,
    )
    .toBe(1);
  await page.goto("/programs/gsoc");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("save-button").first().click();
  await expect
    .poll(
      async () =>
        ((await (await page.request.get("/api/v1/saved")).json()).items as unknown[]).length,
    )
    .toBe(2);
  await page.goto("/repositories/analyze");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("GitHub repository URL").fill("https://github.com/jaegertracing/jaeger-ui");
  await page.getByRole("button", { name: "Analyze repository" }).click();
  await page.getByTestId("analyze-save").getByTestId("save-button").click();
  await expect(page.getByTestId("analyze-save").getByTestId("save-button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(
      async () =>
        ((await (await page.request.get("/api/v1/saved")).json()).items as unknown[]).length,
    )
    .toBe(3);
  await page.goto("/saved");
  await expect(page.getByTestId("saved-total")).toHaveText("3");
  await page.goto("/saved?program=gsoc");
  await expect(page.getByTestId("saved-item")).toHaveCount(1);
  await page.goto("/saved?type=REPOSITORY");
  await expect(page.getByTestId("saved-item")).toContainText("github.com/jaegertracing/jaeger-ui");
  await page.goto("/saved?type=ORGANIZATION");
  await expect(page.getByTestId("saved-item")).toHaveCount(1);
  await page.goto("/saved?program=lfx");
  await page.locator('[data-testid="saved-item"] a[href^="/projects/mp-"]').first().click();
  await expect(page).toHaveURL(/\/projects\/mp-\d+/);
  await expect(page.getByTestId("project-hero")).toBeVisible();
  await expect(page.getByTestId("project-hero").getByTestId("save-button").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("open-repo")).toBeVisible();
  await clearSaved(page);
});

test("project detail is an intelligence profile with sources and no contact data", async ({
  page,
}) => {
  await page.goto(`/projects/${await firstLfxProject(page)}`);
  await expect(page).toHaveURL(/\/projects\/mp-\d+/);
  for (const h of [
    "Overview",
    "Program history",
    "Technologies",
    "Repository",
    "Mentors",
    "Contribution",
    "Sources",
  ]) {
    await expect(page.getByRole("heading", { name: h, exact: true })).toBeVisible();
  }
  expect(await page.locator("main").innerText()).not.toMatch(EMAIL);
  await expect(page.getByTestId("source-panel")).toContainText("Recorded");
});

test("saved API: validation, same-origin and idempotency", async ({ page }) => {
  await clearSaved(page);
  const ids = await projectIds(page);
  const mp = ids.mp[0]!;
  const post = (data: unknown, headers: Record<string, string> = {}) =>
    page.request.post("/api/v1/saved", { data, headers });
  expect((await post({ entityType: "BOGUS", entityId: "x" })).status()).toBe(400);
  expect((await post({ entityType: "PROJECT", entityId: "mp-999999" })).status()).toBe(404);
  expect(
    (await post({ entityType: "REPOSITORY", entityId: "https://gitlab.com/a/b" })).status(),
  ).toBe(400);
  expect(
    (
      await post({ entityType: "PROJECT", entityId: mp }, { origin: "https://evil.example" })
    ).status(),
  ).toBe(403);
  const a = await post({ entityType: "PROJECT", entityId: mp });
  expect(a.status()).toBe(201);
  const b = await post({ entityType: "PROJECT", entityId: mp });
  expect((await b.json()).item.id).toBe((await a.json()).item.id);
  const list = await (await page.request.get("/api/v1/saved")).json();
  expect(list.items).toHaveLength(1);
  expect((await page.request.delete(`/api/v1/saved/${list.items[0].id}`)).status()).toBe(200);
  expect((await page.request.delete(`/api/v1/saved/${list.items[0].id}`)).status()).toBe(404);
});

test("navigation: desktop shows the app nav (Saved, no Sources); mobile menu works", async ({
  page,
  isMobile,
}) => {
  await page.goto("/app");
  await page.waitForLoadState("networkidle");
  if (!isMobile) {
    const nav = page.getByRole("navigation", { name: "Primary" });
    for (const l of ["Discover", "Ask", "Programs", "Saved", "Repositories", "Interview"])
      await expect(nav.getByRole("link", { name: l })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Sources" })).toHaveCount(0);
    await nav.getByRole("link", { name: "Programs" }).click();
    await expect(page).toHaveURL(/\/programs$/);
    await expect(nav.getByRole("link", { name: "Programs" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: "Discover" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  } else {
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
    await page.getByTestId("menu-button").click();
    await expect(page.getByTestId("mobile-menu")).toContainText("Saved");
    await page.getByTestId("mobile-menu").getByRole("link", { name: "Saved" }).click();
    await expect(page).toHaveURL(/\/saved$/);
    await expect(page.getByTestId("mobile-menu")).toBeHidden();
  }
});

test("source status and development labeling stay visible", async ({ page }) => {
  for (const path of ["/app", "/discover", "/programs", "/programs/gsoc", "/projects"]) {
    await page.goto(path);
    await expect(page.getByTestId("dev-banner")).toContainText("not live data");
  }
  await page.goto("/programs/lfx");
  await expect(page.getByTestId("source-badge").first()).toContainText("Recorded snapshot");
  await page.goto("/sources");
  await expect(page.getByTestId("provider-table")).toContainText("Live blocked");
  await expect(page.getByTestId("provider-table")).toContainText("Live not approved");
});

test("repository analyzer, interview workspace and not-found", async ({ page }) => {
  await page.goto("/repositories/analyze");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Understand any open source repository.",
  );
  await page.getByLabel("GitHub repository URL").fill("https://gitlab.com/a/b");
  await page.getByRole("button", { name: "Analyze repository" }).click();
  await expect(page.getByTestId("analyze-invalid")).toContainText("github.com");
  await page.goto("/interview");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Talk it through with an interviewer.",
  );
  // nothing is chosen until the user picks it
  await expect(page.getByTestId("start-interview")).toBeDisabled();
  await page.getByRole("tab", { name: "Mentorship projects" }).click();
  await page.getByRole("option").first().click();
  await expect(page.getByTestId("picked-project")).toBeVisible();
  const modes = page.getByTestId("modes");
  await modes.getByRole("button", { name: /Everything/ }).click();
  await page.getByRole("radio", { name: /Quick/ }).click();
  await expect(modes.getByRole("button", { name: /PR review/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  for (const name of ["Interviewer speaks", "Answer out loud", "Hands-free conversation"]) {
    const box = page.getByRole("checkbox", { name: new RegExp(name) });
    if (await box.isChecked()) await box.uncheck();
  }
  await page.getByTestId("start-interview").click();
  await expect(page.getByTestId("question")).not.toBeEmpty();
  await expect(page.getByTestId("feedback")).toHaveCount(0);
  await page
    .getByLabel(/Your answer/)
    .fill(
      "First I explain the problem the change fixes, then the approach and the tests I added, because reviewers need to see it works.",
    );
  await page.getByTestId("submit-answer").click();
  // scoring is a server call: allow for a busy local server
  await expect(page.getByTestId("feedback")).toBeVisible({ timeout: 20_000 });
  // "I don't know" scores zero, not a pity score
  await page.getByRole("button", { name: /Next question/ }).click();
  await page.getByLabel(/Your answer/).fill("I don't know");
  await page.getByTestId("submit-answer").click();
  await expect(page.getByTestId("feedback").first()).toContainText("—", { timeout: 20_000 });
  await page.goto("/projects/mp-999999");
  await expect(page.getByTestId("not-found")).toBeVisible();
});

test("health API reports recorded mode with live and AI off", async ({ request }) => {
  const j = await (await request.get("/api/v1/health")).json();
  expect(j).toMatchObject({
    status: "ok",
    dataMode: "recorded",
    liveSources: false,
    aiEnabled: false,
  });
});

test("ask: a chat about open source that keeps its history per session", async ({ page }) => {
  await page.goto("/ask");
  await expect(page.getByRole("heading", { name: /about open source/ })).toBeVisible();
  const input = page.getByLabel("Ask anything about open source");
  await input.fill("Which CNCF projects repeat in every LFX term?");
  await input.press("Enter");

  // a new chat gets its own URL and appears in the sidebar
  await expect(page).toHaveURL(/\/ask\/[0-9a-f-]{36}$/);
  const answer = page.getByTestId("ask-answer").last();
  await expect(answer).toHaveAttribute("data-engine", /.+/, { timeout: 30_000 });
  await expect(answer).toContainText("CNCF projects have taken part");
  await expect(
    answer.getByRole("link", { name: /CNCF mentoring repository/ }).first(),
  ).toHaveAttribute("href", /github\.com\/cncf\/mentoring/);
  await expect(page.getByTestId("ask-history").getByRole("link").first()).toContainText(
    "Which CNCF projects repeat",
  );

  // follow-up in the same chat, then the chat reloads from the database
  await input.fill("What is the timeline for 2026 Term 3?");
  await input.press("Enter");
  await expect(page.getByTestId("ask-answer")).toHaveCount(2);
  await expect(page.getByTestId("ask-answer").last()).toContainText("Mentee Applications Open", {
    timeout: 30_000,
  });
  await page.reload();
  await expect(page.getByTestId("ask-user-message")).toHaveCount(2);

  // a new chat starts empty
  await page.getByTestId("ask-new-chat").click();
  await expect(page).toHaveURL(/\/ask$/);
  await expect(page.getByTestId("ask-thread")).toHaveCount(0);

  // the legacy API still never invents an answer
  const res = await page.request.get(`/api/v1/ask?q=${encodeURIComponent("what is the weather")}`);
  expect((await res.json()).answer.kind).toBe("none");
  expect(JSON.stringify(await (await page.request.get("/api/v1/ask?q=jaeger")).json())).not.toMatch(
    EMAIL,
  );
});

test("compare: two repositories side by side, with a clear error for a bad link", async ({ page }) => {
  await page.goto("/repositories/compare");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("side by side");
  await page.getByLabel("First repository").fill("https://gitlab.com/a/b");
  await page.getByLabel("Second repository").fill("https://gitlab.com/c/d");
  await page.getByTestId("compare-go").click();
  await expect(page.getByTestId("compare-error").first()).toContainText("github.com");
  await expect(page.getByTestId("compare-table")).toHaveCount(0);
});

test("LFX: the next term's notice opens the official timetable", async ({ page }) => {
  await page.goto("/programs/lfx");
  const notice = page.getByTestId("lfx-term-notice");
  await expect(notice).toContainText(/\d{4} Term \d dates are out/);
  await notice.click();
  const card = page.getByTestId("lfx-term-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Mentee Applications Open");
  await expect(card.getByRole("link", { name: /Official timeline/ })).toHaveAttribute(
    "href",
    /github\.com\/cncf\/mentoring\/blob\/main\//,
  );
  await page.keyboard.press("Escape");
  await expect(card).toHaveCount(0);
});

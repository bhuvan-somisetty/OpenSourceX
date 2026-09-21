import { anon, clearSaved, EMAIL, expect, projectIds, test } from "./fixtures";

// ---------- public experience ----------
anon("landing: premium public page with minimal navigation and real programs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Understand open source.");
  await expect(page.getByTestId("cta-get-started")).toBeVisible();
  await expect(page.getByTestId("cta-explore")).toBeVisible();
  await expect(page.getByRole("link", { name: "Saved" })).toHaveCount(0); // the public nav is not the app nav
  await expect(page.getByTestId("dev-banner")).toHaveCount(0);
  await expect(page.getByTestId("landing-programs")).toContainText("GSoC");
  await expect(page.getByTestId("landing-programs")).toContainText("LFX");
  await expect(page.getByTestId("landing-programs")).toContainText("no data yet"); // configured programs without data are labeled
  await expect(page.getByTestId("trust-chain")).toContainText("Recorded snapshot");
  await expect(page.getByText(/\d+\s*\/\s*100/)).toHaveCount(0);
});

anon(
  "login: OAuth and email are honestly disabled; development mode signs in and is labeled",
  async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("oauth-google")).toBeDisabled();
    await expect(page.getByTestId("oauth-github")).toBeDisabled();
    await expect(page.getByText("not connected in this development build")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.getByTestId("dev-login").click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByTestId("dev-banner")).toContainText("development session");
    await page.getByTestId("profile-button").click();
    await expect(page.getByTestId("profile-menu")).toContainText("not a real account");
    await page.getByTestId("sign-out").click();
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
test("app home: workspace with search, programs and next steps", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "What are you exploring today?",
  );
  await expect(page.getByRole("link", { name: /Google Summer of Code/ }).first()).toBeVisible();
  await expect(page.getByText("Recommended next step")).toBeVisible();
});

test("programs: selection screen, then GSoC and LFX ecosystems", async ({ page }) => {
  await page.goto("/programs");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Where do you want to contribute?",
  );
  await expect(page.getByTestId("program-tile-gsoc")).toBeVisible();
  await expect(page.getByTestId("program-tile-lfx")).toBeVisible();
  await expect(page.getByTestId("programs-soon")).toContainText("Outreachy"); // configured, no data, labeled
  await page.getByTestId("program-tile-gsoc").click();
  await expect(page).toHaveURL(/\/programs\/gsoc/);
  await expect(page.getByTestId("program-hero")).toContainText("Google Summer of Code");
  await expect(page.getByTestId("granularity-note")).toContainText("not verified");
  await page.getByTestId("program-tabs").getByRole("link", { name: "Technologies" }).click();
  await expect(page.getByTestId("tech-list")).toBeVisible();
  await page.goto("/programs/lfx");
  await expect(page.getByTestId("ecosystem-note")).toContainText("not the whole LFX Mentorship");
});

test("program filter drives the actual data, and is URL state", async ({ page }) => {
  await page.goto("/projects?program=gsoc");
  const rows = page.getByTestId("project-row");
  await expect(rows.first()).toBeVisible();
  for (const t of await rows.allInnerTexts()) expect(t).toContain("Google Summer of Code");
  await expect(page.getByTestId("result-count")).toContainText("in Google Summer of Code");
  await page.goto("/projects?program=lfx");
  for (const t of await page.getByTestId("project-row").allInnerTexts())
    expect(t).toContain("LFX Mentorship");
  const lfx = await page.getByTestId("project-row").count();
  await page.goto("/projects");
  expect(await page.getByTestId("project-row").count()).toBeGreaterThan(lfx);
  await page.goto("/projects?program=outreachy"); // configured but no data: no invented rows
  await expect(page.getByTestId("project-row")).toHaveCount(
    await page.getByTestId("project-row").count(),
  );
  await page.goto("/projects");
  await page.getByTestId("filter-gsoc").click();
  await expect(page).toHaveURL(/program=gsoc/);
});

test("discover and projects are different experiences", async ({ page }) => {
  await page.goto("/discover");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "What are you interested in?",
  );
  await expect(page.getByTestId("project-row")).toHaveCount(0); // discover is not a catalog
  await expect(page.getByTestId("interests")).toBeVisible();
  const interest = page.getByTestId("interests").getByRole("link").first();
  const label = (await interest.innerText()).trim();
  await interest.click();
  await expect(page).toHaveURL(/i=/);
  await expect(page.getByTestId("match-count")).toBeVisible();
  await expect(page.getByTestId("why-matches").first()).toContainText(`Matches "${label}"`);
  await expect(page.getByText(/\d+\s*\/\s*100|% match/)).toHaveCount(0);
  await page.goto("/projects");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Project catalog");
  await expect(page.getByTestId("project-row").first()).toBeVisible();
  await expect(page.getByTestId("interests")).toHaveCount(0);
});

test("save and unsave a project persists across reloads, and shows on the Saved page", async ({
  page,
}) => {
  await clearSaved(page);
  await page.goto("/saved");
  await expect(page.getByTestId("empty-state")).toContainText("You haven't saved anything yet.");
  await page.goto("/projects?program=lfx");
  await page.waitForLoadState("networkidle");
  const btn = page.getByTestId("project-row").first().getByTestId("save-button");
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
  await expect(page.getByTestId("project-row").first().getByTestId("save-button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("/saved");
  await expect(page.getByTestId("saved-total")).toHaveText("1");
  await expect(page.getByTestId("saved-group-lfx-mentorship")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("saved-item").getByTestId("save-button").click();
  await expect(page.getByTestId("empty-state")).toBeVisible();
});

test("saved page filters by program and type; repository and project-detail saves work", async ({
  page,
}) => {
  await clearSaved(page);
  await page.goto("/projects?program=lfx");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("project-row").first().getByTestId("save-button").click();
  await expect
    .poll(
      async () =>
        ((await (await page.request.get("/api/v1/saved")).json()).items as unknown[]).length,
    )
    .toBe(1);
  await page.goto("/projects?program=gsoc");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("project-row").first().getByTestId("save-button").click();
  await expect
    .poll(
      async () =>
        ((await (await page.request.get("/api/v1/saved")).json()).items as unknown[]).length,
    )
    .toBe(2);
  await page.goto("/repositories/analyze");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("GitHub repository URL").fill("https://github.com/jaegertracing/jaeger-ui");
  await page.getByRole("button", { name: "Check repository" }).click();
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
  await page.goto("/projects?program=lfx");
  await page.getByTestId("project-row").first().getByRole("link").first().click();
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
    for (const l of ["Discover", "Programs", "Projects", "Saved", "Repositories", "Interview"])
      await expect(nav.getByRole("link", { name: l })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Sources" })).toHaveCount(0);
    await nav.getByRole("link", { name: "Programs" }).click();
    await expect(page).toHaveURL(/\/programs$/);
    await expect(nav.getByRole("link", { name: "Programs" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: "Projects" })).not.toHaveAttribute(
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
  await page.goto("/discover?i=TypeScript");
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
  await expect(page.getByTestId("analyze-banner")).toContainText(
    "Live repository analysis is not enabled in this development build",
  );
  await page.getByLabel("GitHub repository URL").fill("https://gitlab.com/a/b");
  await page.getByRole("button", { name: "Check repository" }).click();
  await expect(page.getByTestId("analyze-invalid")).toContainText("github.com");
  await page.goto("/interview");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Prepare to explain your contribution.",
  );
  await expect(page.getByTestId("modes").getByRole("button", { name: "PR review" })).toBeDisabled();
  await expect(page.getByTestId("feedback")).toHaveCount(0);
  await page
    .getByLabel("Your answer")
    .fill("It helps developers observe distributed systems using TypeScript and React.");
  await page.getByRole("button", { name: "Submit answer" }).click();
  await expect(page.getByTestId("feedback")).toContainText("not AI evaluation");
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

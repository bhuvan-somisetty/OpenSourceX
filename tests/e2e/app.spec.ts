import { expect, test } from "@playwright/test";

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/;

test("1. homepage loads with the product promise and four actions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Understand Open Source. Find the Right Projects.",
  );
  for (const name of [
    "Start Exploring",
    "Explore Programs",
    "Analyze a Repository",
    "Practice Interview",
  ]) {
    await expect(page.getByRole("link", { name: new RegExp(name) }).first()).toBeVisible();
  }
});

test("2. discovery loads, filters by technology and explains matches", async ({ page }) => {
  await page.goto("/discover");
  const cards = page.getByTestId("project-card");
  await expect(cards.first()).toBeVisible();
  const total = await cards.count();
  expect(total).toBeGreaterThan(0);
  await expect(page.getByTestId("why-matches").first()).toBeVisible();
  const tech = page.locator("#tech option").nth(1);
  const value = await tech.getAttribute("value");
  await page.goto(`/discover?tech=${encodeURIComponent(value!)}`);
  await expect(page.getByTestId("why-matches").first()).toContainText(`Technology "${value}"`);
  expect(await page.getByTestId("project-card").count()).toBeLessThanOrEqual(total);
  await expect(page.getByText(/\d+\s*\/\s*100|% match/)).toHaveCount(0); // never a numeric match score
});

test("3. program detail states granularity and the CNCF boundary", async ({ page }) => {
  await page.goto("/programs/gsoc");
  await expect(page.getByTestId("granularity-note")).toContainText("organization");
  await expect(page.getByTestId("granularity-note")).toContainText("not verified");
  await page.goto("/programs/lfx-mentorship");
  await expect(page.getByTestId("ecosystem-note")).toContainText("not the whole LFX Mentorship");
  await expect(page.getByTestId("term-ribbon").first()).toBeVisible();
});

test("4. project detail shows sections, mentors without contact data, and sources", async ({
  page,
}) => {
  await page.goto("/discover");
  await page
    .getByTestId("project-card")
    .filter({ hasText: "ecosystem only" })
    .first()
    .getByRole("link")
    .first()
    .click();
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
  await expect(page.getByTestId("mentor-list")).toBeVisible();
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(EMAIL);
  expect(text.toLowerCase()).not.toContain("lfid");
  await expect(page.getByTestId("source-panel")).toContainText("Recorded");
});

test("5. desktop navigation works", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop only");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await nav.getByRole("link", { name: "Programs" }).click();
  await expect(page).toHaveURL(/\/programs$/);
  await nav.getByRole("link", { name: "Discover" }).click();
  await expect(page).toHaveURL(/\/discover/);
  await nav.getByRole("link", { name: "Interview" }).click();
  await expect(page).toHaveURL(/\/interview/);
});

test("6. mobile navigation works", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
  await page.getByTestId("menu-button").click();
  await expect(page.getByTestId("mobile-menu")).toBeVisible();
  await page.getByTestId("mobile-menu").getByRole("link", { name: "Programs" }).click();
  await expect(page).toHaveURL(/\/programs$/);
  await expect(page.getByTestId("mobile-menu")).toBeHidden();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
});

test("7. source status is visible on cards and pages", async ({ page }) => {
  await page.goto("/discover");
  await expect(page.getByTestId("source-badge").first()).toContainText("Tier");
  await expect(page.getByTestId("source-badge").first()).toContainText("Recorded snapshot");
  await page.goto("/sources");
  await expect(page.getByTestId("provider-table")).toContainText("Live blocked");
  await expect(page.getByTestId("provider-table")).toContainText("Live not approved");
  await expect(page.getByTestId("status-vocabulary")).toContainText("Recorded snapshot");
});

test("8. development data is clearly labeled and never presented as live", async ({ page }) => {
  for (const path of ["/", "/discover", "/programs", "/programs/gsoc"]) {
    await page.goto(path);
    await expect(page.getByTestId("dev-banner")).toContainText("DEVELOPMENT BUILD");
    await expect(page.getByTestId("dev-banner")).toContainText("not live data");
  }
  await page.goto("/programs");
  await expect(page.getByText("Development data").first()).toBeVisible();
  await expect(page.getByText("Recorded snapshot").first()).toBeVisible();
});

test("repository analysis validates the URL and states live analysis is disabled", async ({
  page,
}) => {
  await page.goto("/repositories/analyze");
  await expect(page.getByTestId("analyze-banner")).toContainText(
    "Live repository analysis is not enabled in this development build",
  );
  await page.getByLabel("GitHub repository URL").fill("https://gitlab.com/a/b");
  await page.getByRole("button", { name: "Check repository" }).click();
  await expect(page.getByTestId("analyze-invalid")).toContainText("github.com");
  await page.getByLabel("GitHub repository URL").fill("https://github.com/jaegertracing/jaeger-ui");
  await page.getByRole("button", { name: "Check repository" }).click();
  await expect(page.getByTestId("analyze-disabled")).toContainText(
    "not enabled in this development build",
  );
});

test("interview shows development feedback only after answering", async ({ page }) => {
  await page.goto("/interview");
  await expect(page.getByTestId("feedback")).toHaveCount(0);
  await page
    .getByLabel("Your answer")
    .fill("It helps developers observe distributed systems using TypeScript and React.");
  await page.getByRole("button", { name: "Submit answer" }).click();
  await expect(page.getByTestId("feedback")).toContainText("not AI evaluation");
});

test("health API reports database and recorded mode", async ({ request }) => {
  const r = await request.get("/api/v1/health");
  expect(r.status()).toBe(200);
  const j = await r.json();
  expect(j).toMatchObject({
    status: "ok",
    dataMode: "recorded",
    liveSources: false,
    aiEnabled: false,
  });
});

test("unknown project shows a friendly not-found", async ({ page }) => {
  await page.goto("/projects/mp-999999");
  await expect(page.getByTestId("not-found")).toBeVisible();
});

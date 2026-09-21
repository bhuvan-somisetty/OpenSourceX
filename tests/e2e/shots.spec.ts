import { test } from "./fixtures";

// Visual QA helper: only runs when SHOTS_DIR is set, e.g. SHOTS_DIR=/tmp/osx-shots pnpm test:e2e shots
const dir = process.env.SHOTS_DIR;
test.skip(!dir, "set SHOTS_DIR to capture screenshots");

const SHOTS: [string, string, number, "dark" | "light", boolean][] = [
  ["landing-1440", "/", 1440, "dark", false],
  ["landing-1280", "/", 1280, "dark", false],
  ["landing-390", "/", 390, "dark", false],
  ["landing-320", "/", 320, "dark", false],
  ["login-1280", "/login", 1280, "dark", false],
  ["app-1280", "/app", 1280, "dark", true],
  ["programs-1280", "/programs", 1280, "dark", true],
  ["program-gsoc-1280", "/programs/gsoc", 1280, "dark", true],
  ["discover-1280", "/discover?i=TypeScript&i=Go", 1280, "dark", true],
  ["projects-1280", "/projects", 1280, "dark", true],
  ["projects-390", "/projects", 390, "dark", true],
  ["projects-light-1280", "/projects", 1280, "light", true],
  ["saved-1280", "/saved", 1280, "dark", true],
  ["analyze-1280", "/repositories/analyze", 1280, "dark", true],
  ["interview-1280", "/interview", 1280, "dark", true],
];

for (const [name, route, width, theme, authed] of SHOTS) {
  test(name, async ({ page, context, isMobile, baseURL }) => {
    test.skip(isMobile, "captured once");
    if (!authed) await context.clearCookies();
    else await context.addCookies([{ name: "osx_session", value: "development", url: baseURL! }]);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((t) => localStorage.setItem("osx-theme", t), theme);
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  });
}

test("project-1280 and saved-with-items", async ({ page, isMobile, request }) => {
  test.skip(isMobile, "captured once");
  const ids: string[] = (await (await request.get("/api/v1/projects")).json()).items.map(
    (i: { id: string }) => i.id,
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem("osx-theme", "dark"));
  await page.goto("/projects?program=lfx");
  await page.getByTestId("project-row").first().getByTestId("save-button").click();
  await page.waitForTimeout(600);
  await page.goto("/saved");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${dir}/saved-items-1280.png`, fullPage: true });
  await page.goto(`/projects/${ids.find((i) => i.startsWith("mp-"))}`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${dir}/project-1280.png`, fullPage: true });
});

import { test } from "@playwright/test";

// Visual QA helper: only runs when SHOTS_DIR is set, e.g. SHOTS_DIR=/tmp/osx-shots pnpm test:e2e shots
const dir = process.env.SHOTS_DIR;
test.skip(!dir, "set SHOTS_DIR to capture screenshots");

const SHOTS: [string, string, number, "dark" | "light"][] = [
  ["home-desktop-dark", "/", 1280, "dark"],
  ["discover-desktop-light", "/discover", 1280, "light"],
  ["home-mobile-dark", "/", 390, "dark"],
  ["discover-tablet-dark", "/discover?tech=TypeScript", 768, "dark"],
];

for (const [name, route, width, theme] of SHOTS) {
  test(name, async ({ page, isMobile }) => {
    test.skip(isMobile, "captured once");
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((t) => localStorage.setItem("osx-theme", t), theme);
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  });
}

test("project-detail", async ({ page, isMobile, request }) => {
  test.skip(isMobile, "captured once");
  const ids: string[] = (await (await request.get("/api/v1/projects")).json()).items.map(
    (i: { id: string }) => i.id,
  );
  const mp = ids.find((i) => i.startsWith("mp-"))!;
  for (const [n, w] of [
    ["project-desktop-dark", 1280],
    ["project-mobile-dark", 390],
  ] as const) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.addInitScript(() => localStorage.setItem("osx-theme", "dark"));
    await page.goto(`/projects/${mp}`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${dir}/${n}.png`, fullPage: true });
  }
});

import { expect, test } from "./fixtures";

const WIDTHS = [320, 360, 390, 768, 1024, 1280, 1440];
const PUBLIC = ["/", "/product", "/login"];
const APP = [
  "/app",
  "/discover?i=TypeScript",
  "/programs",
  "/programs/gsoc",
  "/programs/lfx?tab=history",
  "/projects",
  "/saved",
  "/sources",
  "/repositories/analyze",
  "/interview",
];

const measure = () => {
  const d = document.documentElement;
  const clipped: string[] = [];
  document.querySelectorAll("main *").forEach((e) => {
    if (e.closest(".scroll") || e.closest(".scroll-x") || e.closest(".tabs") || e.closest(".beams"))
      return;
    const cs = getComputedStyle(e);
    if (cs.display === "inline" || cs.display === "none") return;
    if (e.scrollWidth > e.clientWidth + 1 && cs.overflowX === "visible" && e.clientWidth > 0)
      clipped.push(
        `${e.tagName}.${(e as HTMLElement).className} ${e.scrollWidth}>${e.clientWidth}`,
      );
  });
  return { overflow: d.scrollWidth > d.clientWidth + 1, clipped: clipped.slice(0, 3) };
};

test.describe("responsive: no sideways scroll or clipped text", () => {
  test.skip(({ isMobile }) => isMobile, "runs once; it resizes the viewport itself");
  test.setTimeout(300_000);
  for (const width of WIDTHS) {
    test(`${width}px`, async ({ page, request }) => {
      await page.setViewportSize({ width, height: 900 });
      const ids: string[] = (
        await (
          await request.get("/api/v1/projects", { headers: { cookie: "osx_session=development" } })
        ).json()
      ).items.map((i: { id: string }) => i.id);
      for (const route of [
        ...APP,
        ...ids.slice(0, 1).map((i) => `/projects/${i}`),
        ...ids.slice(-1).map((i) => `/projects/${i}`),
      ]) {
        await page.goto(route);
        const r = await page.evaluate(measure);
        expect(r.overflow, `${route} overflow at ${width}px`).toBe(false);
        expect(r.clipped, `${route} clipped at ${width}px`).toEqual([]);
      }
      // public pages need no session
      await page.context().clearCookies();
      for (const route of PUBLIC) {
        await page.goto(route);
        const r = await page.evaluate(measure);
        expect(r.overflow, `${route} overflow at ${width}px`).toBe(false);
        expect(r.clipped, `${route} clipped at ${width}px`).toEqual([]);
      }
    });
  }
});

const FITS: [number, number][] = [
  [320, 640],
  [360, 740],
  [390, 844],
  [768, 1024],
  [1024, 700],
  [1280, 720],
  [1440, 900],
];
test.describe("landing fits one viewport (no vertical or horizontal scroll)", () => {
  test.skip(({ isMobile }) => isMobile, "runs once; it resizes the viewport itself");
  for (const [w, h] of FITS) {
    test(`${w}x${h}`, async ({ page }) => {
      await page.context().clearCookies();
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/product");
      const r = await page.evaluate(() => {
        const d = document.documentElement;
        const cta = document
          .querySelector('[data-testid="cta-get-started"]')!
          .getBoundingClientRect();
        return {
          v: d.scrollHeight > window.innerHeight + 1,
          h: d.scrollWidth > d.clientWidth + 1,
          ctaBottom: cta.bottom,
          vh: window.innerHeight,
        };
      });
      expect(r.h, `horizontal overflow at ${w}x${h}`).toBe(false);
      expect(r.v, `vertical scroll at ${w}x${h}`).toBe(false);
      expect(r.ctaBottom, `CTA below the fold at ${w}x${h}`).toBeLessThanOrEqual(r.vh);
    });
  }
});

const INTRO_FITS = [
  [320, 568],
  [320, 640],
  [360, 740],
  [1024, 700],
  [1920, 1080],
  [390, 844],
  [768, 1024],
  [1280, 720],
  [1440, 900],
];
test.describe("brand intro fits one viewport and leads to the product landing", () => {
  test.skip(({ isMobile }) => isMobile, "runs once; it resizes the viewport itself");
  for (const [w, h] of INTRO_FITS) {
    test(`${w}x${h}`, async ({ page }) => {
      await page.context().clearCookies();
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/");
      const r = await page.evaluate(() => {
        const d = document.documentElement;
        const cta = document.querySelector('[data-testid="intro-cta"]')!.getBoundingClientRect();
        const mark = document.querySelector(".intro-mark")!.getBoundingClientRect();
        return {
          v: d.scrollHeight > window.innerHeight + 1,
          h: d.scrollWidth > d.clientWidth + 1,
          ctaBottom: cta.bottom,
          markTop: mark.top,
          vh: window.innerHeight,
        };
      });
      expect(r.h).toBe(false);
      expect(r.v).toBe(false);
      expect(r.ctaBottom).toBeLessThanOrEqual(r.vh);
      expect(r.markTop).toBeGreaterThanOrEqual(0);
    });
  }
  test("Find Your Path opens the product landing", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await page.getByTestId("intro-cta").click();
    await expect(page).toHaveURL(/\/product$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Understand open source.");
  });
});

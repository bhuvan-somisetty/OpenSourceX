import { expect, test } from "@playwright/test";

const WIDTHS = [320, 360, 390, 768, 1024, 1280];
const ROUTES = [
  "/",
  "/discover",
  "/programs",
  "/programs/gsoc",
  "/programs/lfx-mentorship",
  "/sources",
  "/repositories/analyze",
  "/interview",
];

test.describe("responsive: no sideways scroll or clipped text at the verified widths", () => {
  test.skip(({ isMobile }) => isMobile, "runs once; it resizes the viewport itself");
  test.setTimeout(240_000);

  for (const width of WIDTHS) {
    test(`${width}px`, async ({ page, request }) => {
      await page.setViewportSize({ width, height: 900 });
      const ids: string[] = (await (await request.get("/api/v1/projects")).json()).items.map(
        (i: { id: string }) => i.id,
      );
      for (const route of [
        ...ROUTES,
        ...ids.slice(0, 2).map((i) => `/projects/${i}`),
        ...ids.slice(-1).map((i) => `/projects/${i}`),
      ]) {
        await page.goto(route);
        const r = await page.evaluate(() => {
          const d = document.documentElement;
          const clipped: string[] = [];
          document.querySelectorAll("main *").forEach((e) => {
            if (e.closest(".scroll") || e.closest(".tabs")) return;
            const cs = getComputedStyle(e);
            if (cs.display === "inline" || cs.display === "none") return;
            if (
              e.scrollWidth > e.clientWidth + 1 &&
              cs.overflowX === "visible" &&
              e.clientWidth > 0
            )
              clipped.push(
                `${e.tagName}.${(e as HTMLElement).className} ${e.scrollWidth}>${e.clientWidth}`,
              );
          });
          return { overflow: d.scrollWidth > d.clientWidth + 1, clipped: clipped.slice(0, 3) };
        });
        expect(r.overflow, `${route} page overflow at ${width}px`).toBe(false);
        expect(r.clipped, `${route} clipped content at ${width}px`).toEqual([]);
      }
    });
  }
});

import { expect, test } from "./fixtures";

const WIDTHS = [320, 360, 390, 768, 1024, 1280, 1440];
const PUBLIC = ["/", "/login"];
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

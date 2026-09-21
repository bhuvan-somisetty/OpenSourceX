import { test as base, expect, type Page } from "@playwright/test";

/** Signed-in test: starts with a development session cookie (the UI login flow is tested separately). */
export const test = base.extend({
  page: async ({ page, context, baseURL }, use) => {
    await context.addCookies([{ name: "osx_session", value: "development", url: baseURL! }]);
    await use(page);
  },
});

/** Anonymous test: no session. */
export const anon = base;

export { expect };

/** Remove every saved item for the development user, so save tests start clean. */
export async function clearSaved(page: Page) {
  const res = await page.request.get("/api/v1/saved");
  const { items } = (await res.json()) as { items: { id: number }[] };
  for (const i of items) await page.request.delete(`/api/v1/saved/${i.id}`);
}

export const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/;

/** Real project ids from the API (ids depend on the database, so tests never hardcode them). */
export async function projectIds(page: Page): Promise<{ mp: string[]; org: string[] }> {
  const { items } = (await (await page.request.get("/api/v1/projects")).json()) as {
    items: { id: string }[];
  };
  return {
    mp: items.filter((i) => i.id.startsWith("mp-")).map((i) => i.id),
    org: items.filter((i) => i.id.startsWith("org-")).map((i) => i.id),
  };
}

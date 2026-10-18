import { describe, expect, it } from "vitest";
import { firstIssuesUrl, upcomingDeadlines } from "./home-insights";

describe("firstIssuesUrl", () => {
  it("links a repository's good first issues", () => {
    expect(firstIssuesUrl("https://github.com/volcano-sh/volcano")).toBe(
      "https://github.com/volcano-sh/volcano/issues?q=is%3Aopen+is%3Aissue+label%3A%22good%20first%20issue%22",
    );
  });
  it("searches a whole GitHub organization", () => {
    expect(firstIssuesUrl("https://github.com/aboutcode-org")).toBe(
      "https://github.com/search?q=org%3Aaboutcode-org+is%3Aopen+is%3Aissue+label%3A%22good%20first%20issue%22&type=issues",
    );
  });
  it("ignores anything that is not GitHub", () => {
    expect(firstIssuesUrl("https://gitlab.com/x/y")).toBeNull();
    expect(firstIssuesUrl(null)).toBeNull();
  });
});

describe("upcomingDeadlines", () => {
  it("lists only exact, future dates, soonest first", async () => {
    const list = await upcomingDeadlines(new Date("2026-10-18T12:00:00Z"), 10);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((d) => d.days >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(d.date))).toBe(true);
    expect(list.map((d) => d.days)).toEqual([...list.map((d) => d.days)].sort((a, b) => a - b));
    expect(list[0]).toMatchObject({ date: "2026-11-01", days: 14 });
  });
});

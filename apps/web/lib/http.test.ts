import { describe, expect, it } from "vitest";
import { AppError, notFound } from "@opensourcex/shared";
import { problem, rateLimit, route } from "./http";

describe("rateLimit", () => {
  it("blocks after the limit and resets after the window", () => {
    const t = 1_000_000;
    expect(rateLimit("a", t, 2)).toBe(true);
    expect(rateLimit("a", t, 2)).toBe(true);
    expect(rateLimit("a", t, 2)).toBe(false);
    expect(rateLimit("a", t + 61_000, 2)).toBe(true);
  });
});

describe("route wrapper", () => {
  it("renders AppError as problem+json", async () => {
    const res = await route(() => {
      throw notFound("Thing");
    })(new Request("http://x/"));
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toBe("application/problem+json");
  });
  it("hides unexpected error details", async () => {
    const res = await route(() => {
      throw new Error("db password leaked");
    })(new Request("http://x/"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/password/);
  });
  it("problem() sets status", () => {
    expect(problem(400, "bad_request", "x").status).toBe(400);
    expect(new AppError(418, "c", "m").status).toBe(418);
  });
});

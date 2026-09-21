import { describe, expect, it } from "vitest";
import { assertSameOrigin, parseId, parseSaveBody } from "./saved-api";

describe("parseSaveBody", () => {
  it("accepts project and organization ids as given", () => {
    expect(parseSaveBody({ entityType: "PROJECT", entityId: "mp-3" })).toEqual({
      entityType: "PROJECT",
      entityId: "mp-3",
    });
    expect(parseSaveBody({ entityType: "ORGANIZATION", entityId: "org-2" }).entityId).toBe("org-2");
  });
  it("canonicalizes repository URLs so the same repo is never saved twice", () => {
    expect(
      parseSaveBody({ entityType: "REPOSITORY", entityId: "https://GitHub.com/Foo/Bar.git/" })
        .entityId,
    ).toBe("https://github.com/foo/bar");
  });
  it("rejects bad types, empty ids, oversize ids and non-repository URLs", () => {
    expect(() => parseSaveBody({ entityType: "BOGUS", entityId: "x" })).toThrow();
    expect(() => parseSaveBody({ entityType: "PROJECT", entityId: "" })).toThrow();
    expect(() => parseSaveBody({ entityType: "PROJECT", entityId: "x".repeat(301) })).toThrow();
    expect(() =>
      parseSaveBody({ entityType: "REPOSITORY", entityId: "https://gitlab.com/a/b" }),
    ).toThrow();
    expect(() =>
      parseSaveBody({ entityType: "REPOSITORY", entityId: "https://github.com/onlyorg" }),
    ).toThrow();
    expect(() => parseSaveBody(null)).toThrow();
  });
});

describe("assertSameOrigin", () => {
  const req = (h: Record<string, string>) => new Request("http://x/", { headers: h });
  it("allows same-origin and header-less clients, refuses cross-origin", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "http://localhost:3000", host: "localhost:3000" })),
    ).not.toThrow();
    expect(() => assertSameOrigin(req({}))).not.toThrow();
    expect(() =>
      assertSameOrigin(req({ origin: "https://evil.example", host: "localhost:3000" })),
    ).toThrow(/Cross-origin/);
  });
});

describe("parseId", () => {
  it("accepts digits only", () => {
    expect(parseId("42")).toBe(42);
    expect(() => parseId("4x")).toThrow();
    expect(() => parseId("-1")).toThrow();
  });
});

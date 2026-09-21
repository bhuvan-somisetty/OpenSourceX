import { describe, expect, it } from "vitest";
import { assertNoContactData, scrubText } from "./pii";
import { loadEnv } from "./env";

describe("scrubText", () => {
  it("removes emails and mailto links", () => {
    const out = scrubText("Contact planted.person@example.invalid or mailto:x@y.invalid now");
    expect(out).not.toMatch(/@/);
  });
});

describe("assertNoContactData", () => {
  it("rejects prohibited keys", () => {
    expect(() => assertNoContactData({ mentor: { name: "A", lfid: "abc" } })).toThrow(/lfid/);
    expect(() => assertNoContactData({ Email: "" })).toThrow(/Email/);
  });
  it("rejects emails in nested strings", () => {
    expect(() => assertNoContactData({ a: [{ b: "x@example.invalid" }] })).toThrow(/Contact data/);
  });
  it("accepts clean data", () => {
    expect(() => assertNoContactData({ name: "A", githubHandle: "a-dev" })).not.toThrow();
  });
});

describe("loadEnv", () => {
  it("defaults live ingestion to false", () => {
    expect(loadEnv({ NODE_ENV: "test" }).INGESTION_LIVE_SOURCES).toBe(false);
  });
  it("rejects bad values", () => {
    expect(() => loadEnv({ LOG_LEVEL: "loud" })).toThrow(/Invalid environment/);
  });
});

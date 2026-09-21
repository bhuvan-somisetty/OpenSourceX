import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assertNoContactData } from "@opensourcex/shared";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

describe("recorded fixtures (sanitized real public data)", () => {
  it("exist", () => expect(files.length).toBeGreaterThan(0));
  it.each(files)("%s contains no contact data and is marked recorded", (f) => {
    const text = readFileSync(path.join(dir, f), "utf8");
    const env = JSON.parse(text);
    expect(env.origin).toBe("recorded");
    expect(text).not.toMatch(/@|mailto:|"lfid"/i);
    expect(() => assertNoContactData(env)).not.toThrow();
  });
});

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertNoContactData } from "@opensourcex/shared";
import { FIXTURES_DIR } from "./provider";

const files = readdirSync(FIXTURES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) =>
    readdirSync(path.join(FIXTURES_DIR, d.name)).map((f) => path.join(FIXTURES_DIR, d.name, f)),
  )
  .filter((f) => f.endsWith(".json"));

describe("recorded fixtures (sanitized real public data)", () => {
  it("exist", () => expect(files.length).toBeGreaterThan(0));
  it.each(files.map((f) => [path.basename(f), f]))(
    "%s contains no contact data and is marked recorded",
    (_n, f) => {
      const text = readFileSync(f as string, "utf8");
      const env = JSON.parse(text);
      expect(env.origin).toBe("recorded");
      expect(text).not.toMatch(/@|mailto:|"lfid"/i);
      expect(() => assertNoContactData(env)).not.toThrow();
    },
  );
});

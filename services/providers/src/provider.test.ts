import { describe, expect, it } from "vitest";
import { assertNoContactData } from "@opensourcex/shared";
import {
  allProviders,
  assertLiveAllowed,
  LiveAccessDisabledError,
  type SourceProvider,
} from "./provider";
import { PROVIDERS } from "./registry";

/** Contract every provider (including future LFX ecosystems) must satisfy. */
function providerContract(make: () => SourceProvider) {
  const p = make();
  describe(`provider contract: ${p.info.key}`, () => {
    it("is registered and not approved", () => {
      expect(PROVIDERS.map((x) => x.key)).toContain(p.info.key);
      expect(p.info.ingestion).not.toBe("approved");
    });
    it("recorded snapshots are sanitized, recorded and match declared datasets", async () => {
      const envs = await p.fetchRecorded();
      expect(envs.length).toBeGreaterThan(0);
      for (const e of envs) {
        expect(e.provider).toBe(p.info.key);
        expect(e.origin).toBe("recorded");
        expect(p.datasets).toContain(e.dataset);
        expect(() => assertNoContactData(e.body)).not.toThrow();
      }
    });
    it("refuses live access, whatever the environment says", async () => {
      await expect(p.fetchLive({ liveSourcesEnabled: true })).rejects.toBeInstanceOf(
        LiveAccessDisabledError,
      );
      await expect(p.fetchLive({ liveSourcesEnabled: false })).rejects.toBeInstanceOf(
        LiveAccessDisabledError,
      );
    });
  });
}

allProviders().forEach((p) => providerContract(() => p));

describe("CNCF boundary", () => {
  it("is an ecosystem provider, not full LFX coverage", () => {
    const c = allProviders().find((p) => p.info.key === "cncf-mentoring")!;
    expect(c.info).toMatchObject({
      program: "lfx-mentorship",
      ecosystem: "cncf",
      coverage: "ecosystem",
    });
  });
  it("live guard needs both approval and the env switch", () => {
    expect(() => assertLiveAllowed("cncf-mentoring", { liveSourcesEnabled: true })).toThrow(
      /pending/,
    );
  });
});

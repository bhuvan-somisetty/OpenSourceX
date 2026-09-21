import { describe, expect, it } from "vitest";
import {
  freshnessOf,
  RetryableError,
  shapeFingerprint,
  TokenBucket,
  withRetry,
} from "./resilience";

describe("withRetry", () => {
  it("retries retryable errors with backoff and succeeds", async () => {
    const waits: number[] = [];
    let n = 0;
    const out = await withRetry(
      async () => {
        if (++n < 3) throw new RetryableError("503");
        return "ok";
      },
      { random: () => 0, sleep: async (ms) => void waits.push(ms), baseMs: 100 },
    );
    expect(out).toBe("ok");
    expect(waits).toEqual([50, 100]); // 0.5x jitter floor of 100, 200
  });
  it("honors retry-after when longer than backoff", async () => {
    const waits: number[] = [];
    let n = 0;
    await withRetry(
      async () => {
        if (++n < 2) throw new RetryableError("429", 9000);
      },
      { random: () => 0, sleep: async (ms) => void waits.push(ms), baseMs: 100 },
    );
    expect(waits).toEqual([9000]);
  });
  it("does not retry non-retryable errors and gives up after the attempt limit", async () => {
    let n = 0;
    await expect(
      withRetry(
        async () => {
          n++;
          throw new Error("bad schema");
        },
        { sleep: async () => {} },
      ),
    ).rejects.toThrow("bad schema");
    expect(n).toBe(1);
    n = 0;
    await expect(
      withRetry(
        async () => {
          n++;
          throw new RetryableError("x");
        },
        { attempts: 3, sleep: async () => {} },
      ),
    ).rejects.toThrow("x");
    expect(n).toBe(3);
  });
});

describe("TokenBucket", () => {
  it("limits bursts and refills over time", () => {
    let t = 0;
    const b = new TokenBucket(2, 1, () => t);
    expect([b.tryTake(), b.tryTake(), b.tryTake()]).toEqual([true, true, false]);
    t = 1500;
    expect(b.tryTake()).toBe(true);
    expect(b.tryTake()).toBe(false);
  });
});

describe("freshnessOf", () => {
  const now = new Date("2026-09-21T00:00:00Z");
  it("derives stale from age and policy", () => {
    expect(freshnessOf(new Date("2026-09-20T00:00:00Z"), 7, now)).toBe("fresh");
    expect(freshnessOf(new Date("2026-09-01T00:00:00Z"), 7, now)).toBe("stale");
    expect(freshnessOf(null, 7, now)).toBe("unknown");
  });
});

describe("shapeFingerprint", () => {
  it("ignores values and array length but detects key changes", () => {
    const a = { programs: [{ title: "x", n: 1 }] };
    expect(shapeFingerprint(a)).toBe(
      shapeFingerprint({
        programs: [
          { title: "yyy", n: 9 },
          { title: "z", n: 2 },
        ],
      }),
    );
    expect(shapeFingerprint(a)).not.toBe(
      shapeFingerprint({ programs: [{ title: "x", n: 1, extra: true }] }),
    );
    expect(shapeFingerprint(a)).not.toBe(shapeFingerprint({ programs: [{ ttl: "x", n: 1 }] }));
  });
});

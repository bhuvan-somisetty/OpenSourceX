/** Retry, rate limiting, freshness and shape-drift detection for sync (docs/INGESTION_PIPELINE.md). */

export class RetryableError extends Error {
  constructor(
    message: string,
    /** honor a source-provided retry-after (milliseconds) when present */
    public readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}

export interface RetryOptions {
  attempts?: number;
  baseMs?: number;
  maxMs?: number;
  /** returns a number in [0,1); injectable for tests */
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/** Exponential backoff with jitter; only RetryableError is retried; retry-after wins when longer. */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  o: RetryOptions = {},
): Promise<T> {
  const {
    attempts = 4,
    baseMs = 500,
    maxMs = 30_000,
    random = Math.random,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = o;
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn(i);
    } catch (e) {
      last = e;
      if (!(e instanceof RetryableError) || i === attempts) throw e;
      const backoff = Math.min(maxMs, baseMs * 2 ** (i - 1));
      await sleep(Math.max(e.retryAfterMs ?? 0, Math.floor(backoff * (0.5 + random() / 2))));
    }
  }
  throw last;
}

/** Token bucket for per-provider rate budgets. Clock is injectable. */
export class TokenBucket {
  private tokens: number;
  private last: number;
  constructor(
    private readonly capacity: number,
    private readonly refillPerSec: number,
    private readonly now: () => number = Date.now,
  ) {
    this.tokens = capacity;
    this.last = now();
  }
  tryTake(n = 1): boolean {
    const t = this.now();
    this.tokens = Math.min(
      this.capacity,
      this.tokens + ((t - this.last) / 1000) * this.refillPerSec,
    );
    this.last = t;
    if (this.tokens < n) return false;
    this.tokens -= n;
    return true;
  }
}

export type Freshness = "fresh" | "stale" | "unknown";

/** STALE is derived at read time from last_verified_at and the freshness policy (DATA_PROVENANCE.md). */
export function freshnessOf(
  lastVerifiedAt: Date | null,
  maxAgeDays: number,
  now = new Date(),
): Freshness {
  if (!lastVerifiedAt) return "unknown";
  return now.getTime() - lastVerifiedAt.getTime() > maxAgeDays * 86_400_000 ? "stale" : "fresh";
}

/**
 * Fingerprint of a payload's key structure (not its values), so schema or source changes are
 * detected and quarantined instead of silently parsed.
 */
export function shapeFingerprint(v: unknown): string {
  const walk = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.length ? [walk(x[0])] : [];
    if (x && typeof x === "object") {
      return Object.fromEntries(
        Object.keys(x as object)
          .sort()
          .map((k) => [k, walk((x as Record<string, unknown>)[k])]),
      );
    }
    return typeof x === "number"
      ? "n"
      : typeof x === "string"
        ? "s"
        : x === null
          ? "null"
          : typeof x;
  };
  return JSON.stringify(walk(v));
}

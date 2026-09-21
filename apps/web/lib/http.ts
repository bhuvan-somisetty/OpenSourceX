import { NextResponse } from "next/server";
import { AppError, createLogger } from "@opensourcex/shared";

const log = createLogger("web");

type Handler = (req: Request) => Promise<Response> | Response;

/**
 * Baseline for every Route Handler: RFC 9457 problem+json errors, no stack
 * leakage, per-IP rate limiting. Business logic belongs in packages/domain, not here.
 * NOTE: the limiter is in-memory (single instance). Replace with a shared store before scaling.
 */
const hits = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 60_000;
const LIMIT = 120;

export function rateLimit(key: string, now = Date.now(), limit = LIMIT): boolean {
  const cur = hits.get(key);
  if (!cur || cur.reset <= now) {
    hits.set(key, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  cur.count += 1;
  return cur.count <= limit;
}

export function problem(status: number, code: string, detail: string): NextResponse {
  return NextResponse.json(
    { type: "about:blank", title: code, status, detail },
    { status, headers: { "content-type": "application/problem+json" } },
  );
}

export function route(handler: Handler): Handler {
  return async (req) => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!rateLimit(ip)) return problem(429, "rate_limited", "Too many requests");
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof AppError) return problem(e.status, e.code, e.message);
      log.error({ err: e instanceof Error ? e.message : "unknown" }, "unhandled route error");
      return problem(500, "internal_error", "Unexpected error");
    }
  };
}

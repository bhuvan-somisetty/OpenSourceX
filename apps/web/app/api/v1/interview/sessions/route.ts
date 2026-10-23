import { NextResponse } from "next/server";
import { listInterviews, saveInterview } from "@opensourcex/database";
import { AppError, badRequest } from "@opensourcex/shared";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/data";
import { route } from "@/lib/http";
import { assertSameOrigin } from "@/lib/saved-api";

export const dynamic = "force-dynamic";

const SESSION_ID = /^[\w:.-]{8,80}$/;
const MAX_BYTES = 350_000;

const Save = z.object({
  id: z.string().regex(SESSION_ID),
  at: z.iso.datetime().optional(),
  projectName: z.string().trim().min(1).max(300),
  modes: z.array(z.string().max(30)).max(10),
  level: z.string().max(20),
  engine: z.enum(["ai", "offline"]),
  overall: z.number().min(0).max(100),
  data: z.object({
    project: z.record(z.string(), z.unknown()),
    report: z.looseObject({
      overall: z.number(),
      scores: z.record(z.string(), z.number()),
      focus: z.array(z.unknown()).max(10),
    }),
    turns: z.array(z.record(z.string(), z.unknown())).min(1).max(12),
  }),
  plan: z.record(z.string().max(12), z.boolean()).optional(),
});

async function user() {
  const s = await getSession();
  if (!s) throw new AppError(401, "unauthenticated", "Sign in to keep your interviews.");
  return s;
}

/** GET: your saved interviews, newest first. POST: save a finished interview (same id replaces). */
export const GET = route(async () => {
  const s = await user();
  return NextResponse.json({ sessions: await listInterviews(db(), s.userId) });
});

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const s = await user();
  const raw = await req.text();
  if (raw.length > MAX_BYTES) throw badRequest("Interview is too large to save.");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw badRequest("Body must be valid JSON.");
  }
  const body = Save.safeParse(json);
  if (!body.success) throw badRequest("Invalid interview.");
  // a session's time comes from when it ended; never later than now
  const at =
    body.data.at && Date.parse(body.data.at) <= Date.now() + 60_000 ? body.data.at : undefined;
  await saveInterview(db(), s.userId, { ...body.data, at });
  return NextResponse.json({ ok: true }, { status: 201 });
});

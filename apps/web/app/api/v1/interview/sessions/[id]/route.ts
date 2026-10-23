import { NextResponse } from "next/server";
import {
  deleteInterview,
  getInterview,
  setInterviewRetry,
  setInterviewShare,
  updateInterviewPlan,
} from "@opensourcex/database";
import { AppError, badRequest, notFound } from "@opensourcex/shared";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/data";
import { route } from "@/lib/http";
import { assertSameOrigin } from "@/lib/saved-api";

export const dynamic = "force-dynamic";

const ID = /^[\w:.-]{8,80}$/;

const Patch = z.union([
  z.object({ plan: z.record(z.string().max(12), z.boolean()) }),
  z.object({ share: z.boolean() }),
  z.object({
    retry: z.object({
      index: z.number().int().min(0).max(11),
      answer: z.string().trim().min(1).max(4000),
      at: z.iso.datetime(),
      feedback: z.looseObject({
        overall: z.number().min(0).max(100),
        scores: z.record(z.string(), z.number()),
      }),
      delivery: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
]);

async function target(req: Request) {
  const session = await getSession();
  if (!session) throw new AppError(401, "unauthenticated", "Sign in to keep your interviews.");
  const id = decodeURIComponent(new URL(req.url).pathname.split("/").pop() ?? "");
  if (!ID.test(id)) throw notFound("Interview");
  return { userId: session.userId, id };
}

/**
 * GET: one saved interview. PATCH {plan} saves practice plan ticks, {retry} keeps a retried
 * answer, {share} turns the share link on or off. DELETE removes it.
 */
export const GET = route(async (req) => {
  const { userId, id } = await target(req);
  const s = await getInterview(db(), userId, id);
  if (!s) throw notFound("Interview");
  return NextResponse.json({ session: s });
});

export const PATCH = route(async (req) => {
  assertSameOrigin(req);
  const { userId, id } = await target(req);
  const body = Patch.safeParse(await req.json().catch(() => null));
  if (!body.success) throw badRequest("Invalid change.");
  const b = body.data;
  if ("plan" in b) {
    if (!(await updateInterviewPlan(db(), userId, id, b.plan))) throw notFound("Interview");
    return NextResponse.json({ ok: true });
  }
  if ("share" in b) {
    const token = await setInterviewShare(db(), userId, id, b.share);
    if (token === undefined) throw notFound("Interview");
    return NextResponse.json({ shareUrl: token ? `/interview/r/${token}` : null });
  }
  const { index, ...retry } = b.retry;
  if (!(await setInterviewRetry(db(), userId, id, index, retry))) throw notFound("Interview");
  return NextResponse.json({ ok: true });
});

export const DELETE = route(async (req) => {
  assertSameOrigin(req);
  const { userId, id } = await target(req);
  if (!(await deleteInterview(db(), userId, id))) throw notFound("Interview");
  return NextResponse.json({ ok: true });
});

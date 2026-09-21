import { NextResponse } from "next/server";
import { addSaved, listSaved, removeSavedByEntity, resolveEntity } from "@opensourcex/database";
import { AppError, badRequest, notFound } from "@opensourcex/shared";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/data";
import { route } from "@/lib/http";
import { assertSameOrigin, parseSaveBody } from "@/lib/saved-api";

export const dynamic = "force-dynamic";

async function user() {
  const s = await getSession();
  if (!s) throw new AppError(401, "unauthenticated", "Sign in to use saved items.");
  return s;
}

async function json(req: Request): Promise<unknown> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json"))
    throw badRequest("Content-Type must be application/json.");
  try {
    return await req.json();
  } catch {
    throw badRequest("Body must be valid JSON.");
  }
}

export const GET = route(async () => {
  const s = await user();
  return NextResponse.json({ session: { kind: s.kind }, items: await listSaved(db(), s.userId) });
});

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const s = await user();
  const body = parseSaveBody(await json(req));
  const target = await resolveEntity(db(), body.entityType, body.entityId);
  if (!target.exists) throw notFound("Item");
  const row = await addSaved(db(), s.userId, body.entityType, body.entityId, target.programSlug);
  return NextResponse.json({ item: row }, { status: 201 });
});

/** Unsave by entity (used by the toggle button). */
export const DELETE = route(async (req) => {
  assertSameOrigin(req);
  const s = await user();
  const body = parseSaveBody(await json(req));
  const removed = await removeSavedByEntity(db(), s.userId, body.entityType, body.entityId);
  return NextResponse.json({ removed });
});

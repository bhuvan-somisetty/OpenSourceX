import { NextResponse } from "next/server";
import { deleteConversation, getConversation, renameConversation } from "@opensourcex/database";
import { AppError, badRequest, notFound } from "@opensourcex/shared";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/data";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

const Id = z.uuid();
const Rename = z.object({ title: z.string().trim().min(1).max(120) });

async function target(req: Request) {
  const session = await getSession();
  if (!session) throw new AppError(401, "unauthorized", "Sign in to manage your chats");
  const id = Id.safeParse(new URL(req.url).pathname.split("/").pop());
  if (!id.success) throw notFound("Conversation");
  return { userId: session.userId, id: id.data };
}

/** GET: one chat with its messages. PATCH {title}: rename. DELETE: remove it and its messages. */
export const GET = route(async (req) => {
  const { userId, id } = await target(req);
  const c = await getConversation(db(), userId, id);
  if (!c) throw notFound("Conversation");
  return NextResponse.json(c);
});

export const PATCH = route(async (req) => {
  const { userId, id } = await target(req);
  const body = Rename.safeParse(await req.json().catch(() => null));
  if (!body.success) throw badRequest("title (1-120 chars) is required");
  if (!(await renameConversation(db(), userId, id, body.data.title)))
    throw notFound("Conversation");
  return NextResponse.json({ ok: true });
});

export const DELETE = route(async (req) => {
  const { userId, id } = await target(req);
  if (!(await deleteConversation(db(), userId, id))) throw notFound("Conversation");
  return NextResponse.json({ ok: true });
});

import { NextResponse } from "next/server";
import { listConversations } from "@opensourcex/database";
import { AppError } from "@opensourcex/shared";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/data";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/ask/conversations: the session's chats, newest first. */
export const GET = route(async () => {
  const session = await getSession();
  if (!session) throw new AppError(401, "unauthorized", "Sign in to see your chats");
  return NextResponse.json({ conversations: await listConversations(db(), session.userId) });
});

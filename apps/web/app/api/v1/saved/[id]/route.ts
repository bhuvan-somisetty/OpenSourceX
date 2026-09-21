import { NextResponse } from "next/server";
import { removeSavedById } from "@opensourcex/database";
import { AppError, notFound } from "@opensourcex/shared";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/data";
import { route } from "@/lib/http";
import { assertSameOrigin, parseId } from "@/lib/saved-api";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return route(async () => {
    assertSameOrigin(req);
    const s = await getSession();
    if (!s) throw new AppError(401, "unauthenticated", "Sign in to use saved items.");
    const removed = await removeSavedById(db(), s.userId, parseId(id));
    if (!removed) throw notFound("Saved item");
    return NextResponse.json({ removed: true });
  })(req);
}

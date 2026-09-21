import { NextResponse } from "next/server";
import { getProject } from "@opensourcex/database";
import { notFound } from "@opensourcex/shared";
import { db } from "@/lib/data";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return route(async () => {
    if (!/^(mp|org)-\d{1,9}$/.test(id)) throw notFound("Project");
    const p = await getProject(db(), id);
    if (!p) throw notFound("Project");
    return NextResponse.json({ dataMode: "recorded", ...p });
  })(req);
}

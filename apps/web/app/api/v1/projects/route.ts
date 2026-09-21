import { NextResponse } from "next/server";
import { listProjects } from "@opensourcex/database";
import { db } from "@/lib/data";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const u = new URL(req.url);
  const clip = (k: string) => (u.searchParams.get(k) ?? "").slice(0, 100);
  const res = await listProjects(db(), {
    q: clip("q"),
    program: clip("program"),
    tech: clip("tech"),
    topic: clip("topic"),
  });
  return NextResponse.json({
    dataMode: "recorded",
    total: res.total,
    items: res.items,
    facets: res.facets,
  });
});

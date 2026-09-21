import { NextResponse } from "next/server";
import { listPrograms } from "@opensourcex/database";
import { db } from "@/lib/data";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const programs = await listPrograms(db());
  return NextResponse.json({ dataMode: "recorded", items: programs });
});

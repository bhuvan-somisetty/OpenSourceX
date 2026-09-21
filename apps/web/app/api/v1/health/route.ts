import { NextResponse } from "next/server";
import { dbHealth } from "@opensourcex/database";
import { db, dataMode } from "@/lib/data";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Liveness plus the two facts a developer needs: is the database up, and which data mode is running. */
export const GET = route(async () => {
  const mode = dataMode();
  try {
    const database = await dbHealth(db());
    return NextResponse.json({
      status: "ok",
      database,
      dataMode: mode.mode,
      liveSources: mode.liveSources,
      aiEnabled: mode.aiEnabled,
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: { ok: false },
        dataMode: mode.mode,
        liveSources: mode.liveSources,
        aiEnabled: mode.aiEnabled,
      },
      { status: 503 },
    );
  }
});

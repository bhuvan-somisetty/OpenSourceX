import { NextResponse } from "next/server";
import { loadLfxHistory } from "@opensourcex/database";
import { badRequest } from "@opensourcex/shared";
import { answerQuestion } from "@/lib/ask";
import { db } from "@/lib/data";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/ask?q=... : a grounded answer about CNCF in LFX Mentorship, with its sources. */
export const GET = route(async (req) => {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.length > 300) throw badRequest("q must be at most 300 characters");
  const answer = answerQuestion(q, await loadLfxHistory(db()));
  return NextResponse.json({ dataMode: "recorded", question: q, answer });
});

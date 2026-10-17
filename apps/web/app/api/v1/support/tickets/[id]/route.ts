import { NextResponse } from "next/server";
import { setTicketStatus } from "@opensourcex/database";
import { AppError, badRequest, notFound, scrubText } from "@opensourcex/shared";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/data";
import { route } from "@/lib/http";
import { isStaff } from "@/lib/support";

export const dynamic = "force-dynamic";

const Body = z.object({
  status: z.enum(["open", "in_review", "resolved"]),
  note: z.string().trim().max(2000).optional(),
});

/** PATCH {status, note?}: staff only. Moves a complaint to open, in review or resolved. */
export const PATCH = route(async (req) => {
  if (!isStaff(await getSession())) throw new AppError(403, "forbidden", "Staff only.");
  const id = Number(new URL(req.url).pathname.split("/").at(-1));
  if (!Number.isSafeInteger(id) || id <= 0) throw notFound("Complaint");
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) throw badRequest("status must be open, in_review or resolved");
  const note = body.data.note ? scrubText(body.data.note) : null;
  if (!(await setTicketStatus(db(), id, body.data.status, note))) throw notFound("Complaint");
  return NextResponse.json({ ok: true });
});

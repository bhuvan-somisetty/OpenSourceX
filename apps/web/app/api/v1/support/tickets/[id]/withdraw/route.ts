import { NextResponse } from "next/server";
import { withdrawTicket } from "@opensourcex/database";
import { AppError, notFound } from "@opensourcex/shared";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/data";
import { route } from "@/lib/http";
import { canReport } from "@/lib/support";

export const dynamic = "force-dynamic";

/** POST: withdraw one of your own complaints while it is open or in review. */
export const POST = route(async (req) => {
  const s = await getSession();
  if (!canReport(s))
    throw new AppError(401, "sign_in_required", "Sign in to manage your complaints.");
  const id = Number(new URL(req.url).pathname.split("/").at(-2));
  if (!Number.isSafeInteger(id) || id <= 0) throw notFound("Complaint");
  if (!(await withdrawTicket(db(), s!.userId, id)))
    throw new AppError(409, "not_withdrawable", "This complaint cannot be withdrawn any more.");
  return NextResponse.json({ ok: true });
});

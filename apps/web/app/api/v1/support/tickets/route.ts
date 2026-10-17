import { NextResponse } from "next/server";
import { createTicket, listTickets, ticketsToday } from "@opensourcex/database";
import { AppError, badRequest } from "@opensourcex/shared";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/data";
import { rateLimit, route } from "@/lib/http";
import { canReport, MAX_TICKETS_PER_DAY, parseImages, parseTicketForm } from "@/lib/support";

export const dynamic = "force-dynamic";

async function reporter() {
  const s = await getSession();
  if (!canReport(s)) throw new AppError(401, "sign_in_required", "Sign in to report a problem.");
  return s!;
}

/** GET: the signed-in user's complaints, newest first. */
export const GET = route(async () => {
  const s = await reporter();
  return NextResponse.json({ tickets: await listTickets(db(), s.userId) });
});

/** POST multipart/form-data {category, subject, description, pageUrl?, images[] (≤3)}. */
export const POST = route(async (req) => {
  const s = await reporter();
  if (!rateLimit(`support:${s.userId}`, Date.now(), 5))
    throw new AppError(429, "rate_limited", "Please wait a minute before sending another report.");
  if ((await ticketsToday(db(), s.userId)) >= MAX_TICKETS_PER_DAY)
    throw new AppError(
      429,
      "rate_limited",
      "You have sent many reports today. Please try again tomorrow.",
    );
  const form = await req.formData().catch(() => null);
  if (!form) throw badRequest("Send the report as a form.");
  const fields = parseTicketForm(form);
  if (typeof fields === "string") throw badRequest(fields);
  const images = await parseImages(form);
  if (typeof images === "string") throw badRequest(images);
  const id = await createTicket(db(), { userId: s.userId, ...fields, attachments: images });
  return NextResponse.json({ id }, { status: 201 });
});

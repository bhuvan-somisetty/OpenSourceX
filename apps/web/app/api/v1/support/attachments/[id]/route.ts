import { getAttachment } from "@opensourcex/database";
import { AppError, notFound } from "@opensourcex/shared";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/data";
import { route } from "@/lib/http";
import { canReport, isStaff } from "@/lib/support";

export const dynamic = "force-dynamic";

/** GET: one proof image. Only its reporter and staff can see it; never cached publicly. */
export const GET = route(async (req) => {
  const s = await getSession();
  if (!canReport(s)) throw new AppError(401, "sign_in_required", "Sign in to see this image.");
  const id = Number(new URL(req.url).pathname.split("/").at(-1));
  if (!Number.isSafeInteger(id) || id <= 0) throw notFound("Image");
  const a = await getAttachment(db(), id, isStaff(s) ? null : s!.userId);
  if (!a) throw notFound("Image");
  return new Response(new Uint8Array(a.data), {
    headers: {
      "content-type": a.contentType,
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
      "content-disposition": `inline; filename="${a.filename.replace(/"/g, "")}"`,
    },
  });
});

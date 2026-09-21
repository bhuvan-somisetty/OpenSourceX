import { z } from "zod";
import { AppError, badRequest } from "@opensourcex/shared";
import { parseGithubUrl } from "@opensourcex/entity-resolution";

export const saveBody = z.object({
  entityType: z.enum(["PROJECT", "REPOSITORY", "ORGANIZATION"]),
  entityId: z.string().min(1).max(300),
});
export type SaveBody = z.infer<typeof saveBody>;

/** Validates and normalizes a save/unsave request. Repository ids are always the canonical GitHub URL. */
export function parseSaveBody(raw: unknown): SaveBody {
  const p = saveBody.safeParse(raw);
  if (!p.success) throw badRequest("Invalid request: entityType and entityId are required.");
  const { entityType, entityId } = p.data;
  if (entityType === "REPOSITORY") {
    const ref = parseGithubUrl(entityId);
    if (
      !ref.canonicalUrl ||
      ref.kind === "org" ||
      ref.kind === "invalid" ||
      ref.kind === "not-github" ||
      ref.kind === "other-github"
    ) {
      throw badRequest("Repository must be a github.com/owner/repo URL.");
    }
    return { entityType, entityId: ref.canonicalUrl };
  }
  return { entityType, entityId };
}

/** CSRF defence for cookie-authenticated mutations: same-origin requests only. */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients (tests, curl) carry no Origin
  const host = req.headers.get("host");
  if (!host || new URL(origin).host !== host)
    throw new AppError(403, "forbidden", "Cross-origin request refused.");
}

export function parseId(v: string): number {
  if (!/^\d{1,12}$/.test(v)) throw badRequest("Invalid id.");
  return Number(v);
}

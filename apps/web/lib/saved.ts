import { savedKeys } from "@opensourcex/database";
import type { ProjectCard } from "@opensourcex/database";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/data";

/** Saved keys for the current session, as `${TYPE}:${id}`. Empty if the database is unreachable. */
export async function currentSaved(): Promise<Set<string>> {
  const s = await getSession();
  if (!s) return new Set();
  try {
    return await savedKeys(db(), s.userId);
  } catch {
    return new Set();
  }
}

export const entityOf = (p: Pick<ProjectCard, "id" | "kind">) => ({
  entityType: (p.kind === "organization" ? "ORGANIZATION" : "PROJECT") as
    "ORGANIZATION" | "PROJECT",
  entityId: p.id,
});

export const isSaved = (set: Set<string>, p: Pick<ProjectCard, "id" | "kind">) => {
  const e = entityOf(p);
  return set.has(`${e.entityType}:${e.entityId}`);
};

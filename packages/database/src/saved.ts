import type { Db } from "./client";

/** Saved items (projects, repositories, organizations) per user. Read/write; all inputs are parameterized. */
export type EntityType = "PROJECT" | "REPOSITORY" | "ORGANIZATION";
export const ENTITY_TYPES: readonly EntityType[] = ["PROJECT", "REPOSITORY", "ORGANIZATION"];

export interface SavedRow {
  id: number;
  entityType: EntityType;
  entityId: string;
  programSlug: string | null;
  createdAt: string;
}

export async function ensureUser(
  db: Db,
  id: string,
  displayName: string,
  kind: "development" | "oauth",
) {
  await db.query(
    `INSERT INTO app_user(id, display_name, kind) VALUES ($1,$2,$3)
     ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name`,
    [id, displayName, kind],
  );
}

const map = (r: Record<string, unknown>): SavedRow => ({
  id: Number(r.id),
  entityType: r.entity_type as EntityType,
  entityId: r.entity_id as string,
  programSlug: (r.program_slug as string | null) ?? null,
  createdAt: new Date(r.created_at as string).toISOString(),
});

export async function listSaved(db: Db, userId: string): Promise<SavedRow[]> {
  const { rows } = await db.query(
    "SELECT * FROM saved_item WHERE user_id=$1 ORDER BY created_at DESC, id DESC",
    [userId],
  );
  return rows.map(map);
}

/** Idempotent: saving the same item twice returns the existing row. */
export async function addSaved(
  db: Db,
  userId: string,
  type: EntityType,
  entityId: string,
  programSlug: string | null,
): Promise<SavedRow> {
  const { rows } = await db.query(
    `INSERT INTO saved_item(user_id, entity_type, entity_id, program_slug) VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE SET program_slug = EXCLUDED.program_slug
     RETURNING *`,
    [userId, type, entityId, programSlug],
  );
  return map(rows[0]);
}

export async function removeSavedById(db: Db, userId: string, id: number): Promise<boolean> {
  const r = await db.query("DELETE FROM saved_item WHERE id=$1 AND user_id=$2", [id, userId]);
  return (r.rowCount ?? 0) > 0;
}

export async function removeSavedByEntity(
  db: Db,
  userId: string,
  type: EntityType,
  entityId: string,
): Promise<boolean> {
  const r = await db.query(
    "DELETE FROM saved_item WHERE user_id=$1 AND entity_type=$2 AND entity_id=$3",
    [userId, type, entityId],
  );
  return (r.rowCount ?? 0) > 0;
}

/** Set of `${type}:${entityId}` keys the user has saved, for rendering save buttons. */
export async function savedKeys(db: Db, userId: string): Promise<Set<string>> {
  const { rows } = await db.query(
    "SELECT entity_type, entity_id FROM saved_item WHERE user_id=$1",
    [userId],
  );
  return new Set(rows.map((r) => `${r.entity_type}:${r.entity_id}`));
}

/** Does the entity exist, and which program does it belong to? Program is derived here, never trusted from the client. */
export async function resolveEntity(
  db: Db,
  type: EntityType,
  entityId: string,
): Promise<{ exists: boolean; programSlug: string | null }> {
  if (type === "PROJECT") {
    const m = /^mp-(\d{1,9})$/.exec(entityId);
    if (!m) return { exists: false, programSlug: null };
    const { rows } = await db.query(
      "SELECT p.slug FROM mentorship_project m JOIN program p ON p.id=m.program_id WHERE m.id=$1",
      [Number(m[1])],
    );
    return { exists: rows.length > 0, programSlug: rows[0]?.slug ?? null };
  }
  if (type === "ORGANIZATION") {
    const m = /^org-(\d{1,9})$/.exec(entityId);
    if (!m) return { exists: false, programSlug: null };
    const { rows } = await db.query(
      `SELECT DISTINCT p.slug FROM participation pa JOIN program_year py ON py.id=pa.program_year_id JOIN program p ON p.id=py.program_id WHERE pa.organization_id=$1`,
      [Number(m[1])],
    );
    return { exists: rows.length > 0, programSlug: rows[0]?.slug ?? null };
  }
  // REPOSITORY: any well-formed GitHub repository URL may be saved; program comes from a recorded project that links to it.
  const { rows } = await db.query(
    `SELECT p.slug FROM mentorship_project m JOIN program p ON p.id=m.program_id WHERE m.upstream_key=$1 LIMIT 1`,
    [entityId],
  );
  return { exists: true, programSlug: rows[0]?.slug ?? null };
}

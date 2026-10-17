import type { Db } from "./client";

/** Ask chat history per user. Every query is scoped by user id; all inputs are parameterized. */
export type AskEngine = "gateway" | "anthropic" | "openai" | "offline";

export interface AskConversation {
  id: string;
  title: string;
  updatedAt: string;
}

export interface AskMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  engine: AskEngine | null;
  createdAt: string;
}

const iso = (v: unknown) => new Date(v as string).toISOString();

export async function listConversations(
  db: Db,
  userId: string,
  limit = 100,
): Promise<AskConversation[]> {
  const { rows } = await db.query(
    `SELECT id, title, updated_at FROM ask_conversation WHERE user_id=$1
     ORDER BY updated_at DESC, id LIMIT $2`,
    [userId, limit],
  );
  return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: iso(r.updated_at) }));
}

export async function getConversation(
  db: Db,
  userId: string,
  id: string,
): Promise<{ conversation: AskConversation; messages: AskMessage[] } | null> {
  const c = (
    await db.query(
      "SELECT id, title, updated_at FROM ask_conversation WHERE id=$1 AND user_id=$2",
      [id, userId],
    )
  ).rows[0];
  if (!c) return null;
  const { rows } = await db.query(
    "SELECT id, role, content, engine, created_at FROM ask_message WHERE conversation_id=$1 ORDER BY id",
    [id],
  );
  return {
    conversation: { id: c.id, title: c.title, updatedAt: iso(c.updated_at) },
    messages: rows.map((r) => ({
      id: Number(r.id),
      role: r.role,
      content: r.content,
      engine: r.engine ?? null,
      createdAt: iso(r.created_at),
    })),
  };
}

/** Creates the conversation if it does not exist yet; refuses an id owned by another user. */
export async function ensureConversation(
  db: Db,
  userId: string,
  id: string,
  title: string,
): Promise<boolean> {
  const { rows } = await db.query(
    `INSERT INTO ask_conversation(id, user_id, title) VALUES ($1,$2,$3)
     ON CONFLICT (id) DO UPDATE SET updated_at = now() WHERE ask_conversation.user_id = EXCLUDED.user_id
     RETURNING id`,
    [id, userId, title.slice(0, 120) || "New chat"],
  );
  return rows.length > 0;
}

export async function addMessage(
  db: Db,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  engine: AskEngine | null = null,
): Promise<void> {
  await db.query(
    "INSERT INTO ask_message(conversation_id, role, content, engine) VALUES ($1,$2,$3,$4)",
    [conversationId, role, content.slice(0, 20000), engine],
  );
  await db.query("UPDATE ask_conversation SET updated_at=now() WHERE id=$1", [conversationId]);
}

export async function renameConversation(db: Db, userId: string, id: string, title: string) {
  const r = await db.query("UPDATE ask_conversation SET title=$3 WHERE id=$1 AND user_id=$2", [
    id,
    userId,
    title.slice(0, 120),
  ]);
  return (r.rowCount ?? 0) > 0;
}

export async function deleteConversation(db: Db, userId: string, id: string): Promise<boolean> {
  const r = await db.query("DELETE FROM ask_conversation WHERE id=$1 AND user_id=$2", [id, userId]);
  return (r.rowCount ?? 0) > 0;
}

/** AI-written answers in the last 24 hours, for one user and for everyone (free-tier caps). */
export async function aiAnswersToday(
  db: Db,
  userId: string,
): Promise<{ user: number; all: number }> {
  const { rows } = await db.query(
    `SELECT count(*) FILTER (WHERE c.user_id = $1) AS mine, count(*) AS total
     FROM ask_message m JOIN ask_conversation c ON c.id = m.conversation_id
     WHERE m.engine IS NOT NULL AND m.engine <> 'offline' AND m.created_at > now() - interval '1 day'`,
    [userId],
  );
  return { user: Number(rows[0]?.mine ?? 0), all: Number(rows[0]?.total ?? 0) };
}

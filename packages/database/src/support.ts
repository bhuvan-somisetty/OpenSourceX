import type { Db } from "./client";

/** Help & support tickets (migration 010). Every user query is scoped by user id. */
export const TICKET_CATEGORIES = ["bug", "ask", "account", "content", "security", "other"] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export const TICKET_STATUSES = ["open", "in_review", "resolved", "withdrawn"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface TicketAttachmentInput {
  filename: string;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  data: Buffer;
}

export interface Ticket {
  id: number;
  userId: string;
  userName: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  pageUrl: string | null;
  status: TicketStatus;
  staffNote: string | null;
  createdAt: string;
  updatedAt: string;
  withdrawnAt: string | null;
  attachments: { id: number; filename: string; sizeBytes: number }[];
}

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

function map(r: Record<string, unknown>): Ticket {
  return {
    id: Number(r.id),
    userId: r.user_id as string,
    userName: (r.display_name as string | null) ?? null,
    category: r.category as TicketCategory,
    subject: r.subject as string,
    description: r.description as string,
    pageUrl: (r.page_url as string | null) ?? null,
    status: r.status as TicketStatus,
    staffNote: (r.staff_note as string | null) ?? null,
    createdAt: iso(r.created_at)!,
    updatedAt: iso(r.updated_at)!,
    withdrawnAt: iso(r.withdrawn_at),
    attachments: ((r.attachments as { id: number; filename: string; size_bytes: number }[]) ?? [])
      .filter((a) => a && a.id)
      .map((a) => ({ id: Number(a.id), filename: a.filename, sizeBytes: Number(a.size_bytes) })),
  };
}

const SELECT = `
  SELECT t.*, u.display_name,
         COALESCE(json_agg(json_build_object('id', a.id, 'filename', a.filename, 'size_bytes', a.size_bytes)
                  ORDER BY a.id) FILTER (WHERE a.id IS NOT NULL), '[]') AS attachments
  FROM support_ticket t
  JOIN app_user u ON u.id = t.user_id
  LEFT JOIN support_attachment a ON a.ticket_id = t.id`;

export async function createTicket(
  db: Db,
  input: {
    userId: string;
    category: TicketCategory;
    subject: string;
    description: string;
    pageUrl: string | null;
    attachments: TicketAttachmentInput[];
  },
): Promise<number> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO support_ticket(user_id, category, subject, description, page_url)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [input.userId, input.category, input.subject, input.description, input.pageUrl],
    );
    const id = Number(rows[0].id);
    for (const a of input.attachments)
      await client.query(
        `INSERT INTO support_attachment(ticket_id, filename, content_type, size_bytes, data)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, a.filename, a.contentType, a.data.length, a.data],
      );
    await client.query("COMMIT");
    return id;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function listTickets(db: Db, userId: string): Promise<Ticket[]> {
  const { rows } = await db.query(
    `${SELECT} WHERE t.user_id = $1 GROUP BY t.id, u.display_name ORDER BY t.created_at DESC, t.id DESC`,
    [userId],
  );
  return rows.map(map);
}

/** Staff view: every ticket, newest first, optionally one status. */
export async function listAllTickets(
  db: Db,
  status?: TicketStatus,
  limit = 200,
): Promise<Ticket[]> {
  const { rows } = await db.query(
    `${SELECT} WHERE ($1::text IS NULL OR t.status = $1)
     GROUP BY t.id, u.display_name ORDER BY t.created_at DESC, t.id DESC LIMIT $2`,
    [status ?? null, limit],
  );
  return rows.map(map);
}

/** A user can withdraw their own ticket while it is still open or in review. */
export async function withdrawTicket(db: Db, userId: string, id: number): Promise<boolean> {
  const r = await db.query(
    `UPDATE support_ticket SET status='withdrawn', withdrawn_at=now(), updated_at=now()
     WHERE id=$1 AND user_id=$2 AND status IN ('open','in_review')`,
    [id, userId],
  );
  return (r.rowCount ?? 0) > 0;
}

export async function setTicketStatus(
  db: Db,
  id: number,
  status: Exclude<TicketStatus, "withdrawn">,
  staffNote: string | null,
): Promise<boolean> {
  const r = await db.query(
    `UPDATE support_ticket SET status=$2, staff_note=COALESCE($3, staff_note), updated_at=now()
     WHERE id=$1 AND status <> 'withdrawn'`,
    [id, status, staffNote],
  );
  return (r.rowCount ?? 0) > 0;
}

/** Image bytes, only for the ticket's owner (or staff, when ownerId is null). */
export async function getAttachment(
  db: Db,
  id: number,
  ownerId: string | null,
): Promise<{ contentType: string; data: Buffer; filename: string } | null> {
  const { rows } = await db.query(
    `SELECT a.content_type, a.data, a.filename FROM support_attachment a
     JOIN support_ticket t ON t.id = a.ticket_id
     WHERE a.id = $1 AND ($2::text IS NULL OR t.user_id = $2)`,
    [id, ownerId],
  );
  const r = rows[0];
  return r ? { contentType: r.content_type, data: r.data, filename: r.filename } : null;
}

export async function ticketsToday(db: Db, userId: string): Promise<number> {
  const { rows } = await db.query(
    "SELECT count(*) AS n FROM support_ticket WHERE user_id=$1 AND created_at > now() - interval '1 day'",
    [userId],
  );
  return Number(rows[0]?.n ?? 0);
}

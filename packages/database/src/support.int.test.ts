import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  createPool,
  createTicket,
  ensureUser,
  getAttachment,
  listAllTickets,
  listTickets,
  setTicketStatus,
  withdrawTicket,
} from "./index";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("help & support tickets", () => {
  const db = createPool(url ?? "postgres://unused");
  const me = `github:test-${randomUUID().slice(0, 8)}`;
  const other = `github:test-${randomUUID().slice(0, 8)}`;
  afterAll(async () => {
    await db.query("DELETE FROM app_user WHERE id = ANY($1)", [[me, other]]);
    await db.end();
  });

  it("creates, lists, withdraws and protects images", async () => {
    await ensureUser(db, me, "Tester", "oauth");
    await ensureUser(db, other, "Someone else", "oauth");
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const id = await createTicket(db, {
      userId: me,
      category: "bug",
      subject: "Button does nothing",
      description: "Clicking send does nothing on the Ask page.",
      pageUrl: null,
      attachments: [{ filename: "shot.png", contentType: "image/png", data: png }],
    });

    const mine = await listTickets(db, me);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ id, status: "open", attachments: [{ filename: "shot.png" }] });
    expect(await listTickets(db, other)).toHaveLength(0);

    const att = mine[0]!.attachments[0]!.id;
    expect((await getAttachment(db, att, me))?.data.equals(png)).toBe(true);
    expect(await getAttachment(db, att, other)).toBeNull(); // not your image
    expect(await getAttachment(db, att, null)).not.toBeNull(); // staff

    expect(await withdrawTicket(db, other, id)).toBe(false); // not your complaint
    expect(await setTicketStatus(db, id, "in_review", "Looking into it")).toBe(true);
    expect(await withdrawTicket(db, me, id)).toBe(true);
    expect(await withdrawTicket(db, me, id)).toBe(false); // already withdrawn
    expect(await setTicketStatus(db, id, "resolved", null)).toBe(false); // withdrawn stays withdrawn

    const after = (await listTickets(db, me))[0]!;
    expect(after).toMatchObject({ status: "withdrawn", staffNote: "Looking into it" });
    expect(after.withdrawnAt).not.toBeNull();
    expect((await listAllTickets(db, "withdrawn")).some((t) => t.id === id)).toBe(true);
  });
});

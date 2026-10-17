import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  addMessage,
  addSaved,
  createPool,
  ensureConversation,
  ensureUser,
  listConversations,
  listSaved,
  mergeGuestInto,
} from "./index";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("guest to account merge", () => {
  const db = createPool(url ?? "postgres://unused");
  afterAll(() => db.end());

  it("moves a guest's chats and saved items to the signed-in account", async () => {
    const guest = `guest-${randomUUID()}`;
    const account = `github:test-${randomUUID().slice(0, 8)}`;
    await ensureUser(db, guest, "Guest", "development");
    await ensureUser(db, account, "Tester", "oauth");
    const chat = randomUUID();
    await ensureConversation(db, guest, chat, "my question");
    await addMessage(db, chat, "user", "my question");
    await addSaved(db, guest, "REPOSITORY", "https://github.com/x/y", null);
    await addSaved(db, account, "REPOSITORY", "https://github.com/x/y", null); // already saved

    await mergeGuestInto(db, guest, account);

    expect((await listConversations(db, account)).map((c) => c.id)).toContain(chat);
    expect(await listSaved(db, account)).toHaveLength(1);
    const left = await db.query("SELECT 1 FROM app_user WHERE id=$1", [guest]);
    expect(left.rowCount).toBe(0);
    await db.query("DELETE FROM app_user WHERE id=$1", [account]);
  });

  it("ignores ids that are not guests", async () => {
    await expect(mergeGuestInto(db, "github:1", "github:2")).resolves.toBeUndefined();
  });
});

import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  createPool,
  deleteInterview,
  ensureUser,
  getInterview,
  getSharedInterview,
  listInterviews,
  mergeGuestInto,
  saveInterview,
  setInterviewRetry,
  setInterviewShare,
  updateInterviewPlan,
} from "./index";

const url = process.env.DATABASE_URL;

const session = (id: string) => ({
  id,
  projectName: "volcano-sh/kthena",
  modes: ["contribution"],
  level: "intermediate",
  engine: "offline" as const,
  overall: 42,
  data: {
    project: { id: "repo:volcano-sh/kthena" },
    report: {
      overall: 42,
      scores: { relevance: 5, knowledge: 4, depth: 3, structure: 6, clarity: 7 },
      focus: [{ actions: ["a", "b"] }, { actions: ["c"] }],
    },
    turns: [{ answer: "first" }, { answer: "second" }],
  },
});

describe.skipIf(!url)("interview sessions", () => {
  const db = createPool(url ?? "postgres://unused");
  afterAll(() => db.end());

  it("saves, lists, ticks the plan, keeps a retry and shares by link", async () => {
    const user = `github:test-${randomUUID().slice(0, 8)}`;
    await ensureUser(db, user, "Tester", "oauth");
    const id = `2026-10-24T00:00:00.000Z-${randomUUID().slice(0, 6)}`;
    await saveInterview(db, user, session(id));
    await saveInterview(db, user, session(id)); // re-upload replaces, never duplicates

    const list = await listInterviews(db, user);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id, overall: 42, planDone: 0, planTotal: 3, shared: false });
    expect(list[0]!.scores?.clarity).toBe(7);

    expect(await updateInterviewPlan(db, user, id, { "0-0": true, "1-0": true })).toBe(true);
    expect((await listInterviews(db, user))[0]!.planDone).toBe(2);

    expect(await setInterviewRetry(db, user, id, 1, { answer: "better", overall: 70 })).toBe(true);
    expect(await setInterviewRetry(db, user, id, 5, { answer: "x" })).toBe(false); // no such question
    const got = await getInterview(db, user, id);
    expect((got!.data.turns[1] as { retry?: { answer: string } }).retry?.answer).toBe("better");

    const token = await setInterviewShare(db, user, id, true);
    expect(token).toMatch(/^[a-f0-9]{32}$/);
    expect(await setInterviewShare(db, user, id, true)).toBe(token); // same link while shared
    expect((await getSharedInterview(db, token!))?.id).toBe(id);
    expect(await setInterviewShare(db, user, id, false)).toBeNull();
    expect(await getSharedInterview(db, token!)).toBeNull();

    // another user can neither read nor change it
    const other = `github:test-${randomUUID().slice(0, 8)}`;
    await ensureUser(db, other, "Other", "oauth");
    expect(await getInterview(db, other, id)).toBeNull();
    expect(await updateInterviewPlan(db, other, id, {})).toBe(false);

    expect(await deleteInterview(db, user, id)).toBe(true);
    expect(await listInterviews(db, user)).toHaveLength(0);
    await db.query("DELETE FROM app_user WHERE id = ANY($1)", [[user, other]]);
  });

  it("moves a guest's interviews to the account they sign in to", async () => {
    const guest = `guest-${randomUUID()}`;
    const account = `github:test-${randomUUID().slice(0, 8)}`;
    await ensureUser(db, guest, "Guest", "development");
    await ensureUser(db, account, "Tester", "oauth");
    const id = `2026-10-24T01:00:00.000Z-${randomUUID().slice(0, 6)}`;
    await saveInterview(db, guest, session(id));

    await mergeGuestInto(db, guest, account);

    expect((await listInterviews(db, account)).map((s) => s.id)).toEqual([id]);
    await db.query("DELETE FROM app_user WHERE id=$1", [account]);
  });
});

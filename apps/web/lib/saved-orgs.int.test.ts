import { describe, expect, it } from "vitest";
import { orgEntityId } from "./org-ids";
import { resolveSavedOrg } from "./saved-orgs";

describe.skipIf(!process.env.DATABASE_URL)("saved organizations from every program", () => {
  it("resolves real organizations and refuses made-up ones", async () => {
    const gsoc = await resolveSavedOrg(orgEntityId("gsoc", "aboutcode"));
    expect(gsoc).toMatchObject({ name: "AboutCode", program: "gsoc", programShort: "GSoC" });
    expect(gsoc?.href).toBe("/programs/gsoc/organizations/aboutcode");
    const sob = await resolveSavedOrg(orgEntityId("summer-of-bitcoin", "bitcoin-core"));
    expect(sob?.program).toBe("summer-of-bitcoin");
    expect(await resolveSavedOrg(orgEntityId("gsoc", "not-a-real-org-xyz"))).toBeNull();
    expect(await resolveSavedOrg("org:unknown-program/aboutcode")).toBeNull();
  }, 60_000);
});

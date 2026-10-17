import { describe, expect, it } from "vitest";
import { orgEntityId, parseOrgEntityId } from "./org-ids";

describe("organization saved-item ids", () => {
  it("round-trips program and organization slug", () => {
    const id = orgEntityId("gsoc", "python-software-foundation");
    expect(id).toBe("org:gsoc/python-software-foundation");
    expect(parseOrgEntityId(id)).toEqual({
      program: "gsoc",
      orgSlug: "python-software-foundation",
    });
    expect(orgEntityId("lfx-mentorship", "open%20telemetry")).toBe(
      "org:lfx-mentorship/open telemetry",
    );
  });

  it("rejects anything that is not an org id", () => {
    expect(parseOrgEntityId("org-12")).toBeNull();
    expect(parseOrgEntityId("org:/x")).toBeNull();
    expect(parseOrgEntityId("https://github.com/x/y")).toBeNull();
  });
});

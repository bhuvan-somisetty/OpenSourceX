import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/.well-known/security.txt/route";
import { securityContact } from "./security-contact";

afterEach(() => vi.unstubAllEnvs());

describe("security contact", () => {
  it("publishes nothing until a real address is configured", async () => {
    vi.stubEnv("SECURITY_CONTACT_EMAIL", "");
    expect(securityContact()).toBeNull();
    expect(GET().status).toBe(404);
    vi.stubEnv("SECURITY_CONTACT_EMAIL", "not-an-email");
    expect(securityContact()).toBeNull();
  });

  it("serves an RFC 9116 security.txt once it is set", async () => {
    vi.stubEnv("SECURITY_CONTACT_EMAIL", "security@example.org");
    const res = GET();
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/^Contact: mailto:security@example\.org$/m);
    expect(body).toMatch(/^Expires: \d{4}-\d{2}-\d{2}T/m);
    expect(body).toMatch(/^Policy: https:\/\/.+\/security$/m);
  });
});

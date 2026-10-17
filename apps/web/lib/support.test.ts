import { afterEach, describe, expect, it, vi } from "vitest";
import { canReport, isStaff, parseImages, parseTicketForm, sniffImage } from "./support";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

afterEach(() => vi.unstubAllEnvs());

describe("help & support rules", () => {
  it("lets only signed-in accounts report, never guests", () => {
    expect(canReport({ userId: "github:1", name: "A", kind: "oauth" })).toBe(true);
    expect(canReport({ userId: "guest-x", name: "Guest", kind: "guest" })).toBe(false);
    expect(canReport(null)).toBe(false);
  });

  it("treats only listed accounts as staff", () => {
    vi.stubEnv("SUPPORT_ADMIN_IDS", "github:226660604, google:42");
    expect(isStaff({ userId: "github:226660604", name: "B", kind: "oauth" })).toBe(true);
    expect(isStaff({ userId: "github:999", name: "C", kind: "oauth" })).toBe(false);
    expect(isStaff({ userId: "guest-x", name: "Guest", kind: "guest" })).toBe(false);
  });

  it("validates fields and removes email addresses", () => {
    expect(
      parseTicketForm(form({ category: "bug", subject: "x", description: "long enough text" })),
    ).toMatch(/subject/);
    expect(
      parseTicketForm(form({ category: "nope", subject: "abc", description: "long enough text" })),
    ).toMatch(/Choose/);
    const ok = parseTicketForm(
      form({
        category: "ask",
        subject: "Wrong answer",
        description: "It said write to me at dev@example.com please",
        pageUrl: "https://opensource-x.vercel.app/ask",
      }),
    );
    expect(ok).toMatchObject({
      category: "ask",
      subject: "Wrong answer",
      pageUrl: "https://opensource-x.vercel.app/ask",
    });
    expect(typeof ok !== "string" && ok.description).not.toContain("@example.com");
    expect(
      parseTicketForm(
        form({
          category: "bug",
          subject: "abc",
          description: "long enough text",
          pageUrl: "javascript:alert(1)",
        }),
      ),
    ).toMatch(/web address/);
  });

  it("accepts real images only, up to three", async () => {
    expect(sniffImage(PNG)).toBe("image/png");
    expect(sniffImage(Buffer.from("<svg onload=alert(1)>"))).toBeNull();
    const f = new FormData();
    f.append("images", new File([PNG], "shot.png", { type: "image/png" }));
    expect(await parseImages(f)).toHaveLength(1);
    const fake = new FormData();
    fake.append("images", new File(["<html>"], "evil.png", { type: "image/png" }));
    expect(await parseImages(fake)).toMatch(/PNG, JPEG or WebP/);
    const many = new FormData();
    for (let i = 0; i < 4; i++)
      many.append("images", new File([PNG], `${i}.png`, { type: "image/png" }));
    expect(await parseImages(many)).toMatch(/up to 3/);
  });
});

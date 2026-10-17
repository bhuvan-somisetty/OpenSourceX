import { scrubText } from "@opensourcex/shared";
import {
  TICKET_CATEGORIES,
  type TicketAttachmentInput,
  type TicketCategory,
} from "@opensourcex/database";
import type { Session } from "@/lib/auth";

/**
 * Help & support rules. Only signed-in accounts (GitHub/Google) can report problems; guests
 * cannot. Staff are the account ids in SUPPORT_ADMIN_IDS (comma separated, e.g. github:123).
 * Contact data (emails) is scrubbed from what users write, per the data policy.
 */
export const MAX_IMAGES = 3;
export const MAX_IMAGE_BYTES = 2_000_000;
export const MAX_TICKETS_PER_DAY = 10;

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug: "Something is broken",
  ask: "Ask gave a wrong or bad answer",
  account: "Sign-in or account",
  content: "Wrong or missing information",
  security: "Security or privacy",
  other: "Something else",
};

export const STATUS_LABELS = {
  open: "Open",
  in_review: "In review",
  resolved: "Resolved",
  withdrawn: "Withdrawn",
} as const;

export function canReport(s: Session | null): boolean {
  return s?.kind === "oauth" || s?.kind === "development";
}

export function isStaff(s: Session | null): boolean {
  if (!s) return false;
  if (s.kind === "development") return true;
  const ids = (process.env.SUPPORT_ADMIN_IDS ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return s.kind === "oauth" && ids.includes(s.userId);
}

/** Detects the real image type from its first bytes; the browser's claim is not trusted. */
export function sniffImage(buf: Buffer): TicketAttachmentInput["contentType"] | null {
  if (buf.length > 8 && buf[0] === 0x89 && buf.subarray(1, 4).toString("ascii") === "PNG")
    return "image/png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length > 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  return null;
}

export interface TicketForm {
  category: TicketCategory;
  subject: string;
  description: string;
  pageUrl: string | null;
}

/** Validates the text fields; returns an error message or the cleaned values. */
export function parseTicketForm(f: FormData): TicketForm | string {
  const category = String(f.get("category") ?? "");
  const subject = scrubText(
    String(f.get("subject") ?? "")
      .replace(/\s+/g, " ")
      .trim(),
  );
  const description = scrubText(String(f.get("description") ?? "").trim());
  const rawUrl = String(f.get("pageUrl") ?? "").trim();
  if (!(TICKET_CATEGORIES as readonly string[]).includes(category))
    return "Choose what the problem is about.";
  if (subject.length < 3 || subject.length > 140) return "The subject must be 3 to 140 characters.";
  if (description.length < 10 || description.length > 5000)
    return "Describe the problem in 10 to 5,000 characters.";
  let pageUrl: string | null = null;
  if (rawUrl) {
    try {
      const u = new URL(rawUrl);
      if (!/^https?:$/.test(u.protocol) || rawUrl.length > 500)
        return "The page link must be a web address.";
      pageUrl = u.toString();
    } catch {
      return "The page link must be a web address.";
    }
  }
  return { category: category as TicketCategory, subject, description, pageUrl };
}

export async function parseImages(f: FormData): Promise<TicketAttachmentInput[] | string> {
  const files = f
    .getAll("images")
    .filter(
      (x): x is File => typeof x === "object" && x !== null && "arrayBuffer" in x && x.size > 0,
    );
  if (files.length > MAX_IMAGES) return `You can attach up to ${MAX_IMAGES} images.`;
  const out: TicketAttachmentInput[] = [];
  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES)
      return `Each image must be under ${MAX_IMAGE_BYTES / 1_000_000} MB.`;
    const data = Buffer.from(await file.arrayBuffer());
    const contentType = sniffImage(data);
    if (!contentType) return "Images must be PNG, JPEG or WebP.";
    const name = (file.name || "image").replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "image";
    out.push({ filename: name, contentType, data });
  }
  return out;
}

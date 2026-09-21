/**
 * Contact-data guard (docs/DATA_POLICY.md section 3).
 * Emails, LFIDs and phone numbers must never be stored, logged or exposed.
 */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
const MAILTO = /mailto:[^\s)>\]"']*/gi;

export const REDACTED = "[redacted]";

/** Remove email addresses and mailto links from free text. */
export function scrubText(input: string): string {
  return input.replace(MAILTO, REDACTED).replace(EMAIL, REDACTED);
}

/** Keys that identify contact data and must never appear in persisted or logged objects. */
export const PROHIBITED_KEY = /^(e-?mail|email_?address|lfid|lf_?id|phone|mobile|telephone)$/i;

/** Throws if any key or string value anywhere in `value` looks like contact data. */
export function assertNoContactData(value: unknown, path = "$"): void {
  if (typeof value === "string") {
    if (new RegExp(EMAIL.source).test(value) || /mailto:/i.test(value)) {
      throw new Error(`Contact data detected at ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoContactData(v, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (PROHIBITED_KEY.test(k)) throw new Error(`Prohibited field "${k}" at ${path}`);
      assertNoContactData(v, `${path}.${k}`);
    }
  }
}

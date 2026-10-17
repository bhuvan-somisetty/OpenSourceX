/**
 * Where to report security problems. Set SECURITY_CONTACT_EMAIL (and optionally
 * PUBLIC_SITE_URL); until then the site says no contact is designated rather than inventing one.
 */
export const SITE_URL = (
  process.env.PUBLIC_SITE_URL?.trim() || "https://opensource-x.vercel.app"
).replace(/\/$/, "");

export function securityContact(): string | null {
  const v = process.env.SECURITY_CONTACT_EMAIL?.trim();
  return v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

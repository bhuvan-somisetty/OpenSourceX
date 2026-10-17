import { securityContact, SITE_URL } from "@/lib/security-contact";

export const dynamic = "force-dynamic";

/** RFC 9116 security.txt. Served only once a real contact address is configured. */
export function GET() {
  const contact = securityContact();
  if (!contact) return new Response("No security contact is designated yet.\n", { status: 404 });
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const body = [
    `Contact: mailto:${contact}`,
    `Expires: ${expires}`,
    "Preferred-Languages: en",
    `Canonical: ${SITE_URL}/.well-known/security.txt`,
    `Policy: ${SITE_URL}/security`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

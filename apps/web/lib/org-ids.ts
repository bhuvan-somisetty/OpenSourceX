/**
 * One saved-item id for an organization in any program: `org:<program>/<orgSlug>`,
 * e.g. `org:gsoc/alaska` or `org:lfx-mentorship/volcano`. Safe to import in client components.
 */
export const orgEntityId = (program: string, orgSlug: string) =>
  `org:${program}/${decodeURIComponent(orgSlug)}`;

export function parseOrgEntityId(id: string): { program: string; orgSlug: string } | null {
  const m = /^org:([a-z0-9-]{2,40})\/(.{1,200})$/.exec(id);
  return m ? { program: m[1]!, orgSlug: m[2]! } : null;
}

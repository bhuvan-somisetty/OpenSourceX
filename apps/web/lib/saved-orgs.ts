import { getLfxOrganization } from "@opensourcex/database";
import { db } from "@/lib/data";
import { knowledge } from "@/lib/assistant/engine";
import { parseOrgEntityId } from "@/lib/org-ids";
import { programDef } from "@/lib/programs";

/** A saved organization (any program), resolved for display on the Saved page. */
export interface SavedOrg {
  id: string;
  name: string;
  program: string;
  programName: string;
  programShort: string;
  href: string;
  description: string | null;
  logo: string | null;
  logoOnDark: boolean;
  /** LFX logo set key, when the organization has no program logo file */
  lfxSlug: string | null;
  years: string;
}

const range = (ys: number[]) => {
  const s = [...new Set(ys)].sort();
  return !s.length ? "" : s.length > 1 ? `${s[0]}–${s.at(-1)}` : String(s[0]);
};

/** Looks an `org:<program>/<slug>` id up in the recorded data; null when it does not exist. */
export async function resolveSavedOrg(id: string): Promise<SavedOrg | null> {
  const ref = parseOrgEntityId(id);
  const def = ref ? programDef(ref.program) : null;
  if (!ref || !def) return null;
  const k = await knowledge();
  for (const o of k.orgs) {
    const e = o.programs.find((p) => p.program === ref.program && p.orgSlug === ref.orgSlug);
    if (!e) continue;
    return {
      id,
      name: o.name,
      program: def.slug,
      programName: def.name,
      programShort: def.short,
      href: e.pageUrl,
      description: o.description?.slice(0, 200) ?? null,
      logo: o.logo ?? null,
      logoOnDark: o.logoOnDark ?? false,
      lfxSlug: def.slug === "lfx-mentorship" ? ref.orgSlug : null,
      years: e.terms?.length ? `${e.terms.length} terms` : range(e.years),
    };
  }
  // LFX organizations that only exist in the database listing
  if (def.slug === "lfx-mentorship") {
    const lfx = await getLfxOrganization(db(), ref.orgSlug).catch(() => null);
    if (lfx)
      return {
        id,
        name: lfx.name,
        program: def.slug,
        programName: def.name,
        programShort: def.short,
        href: `/programs/lfx/organizations/${encodeURIComponent(lfx.slug)}`,
        description: lfx.description?.slice(0, 200) ?? null,
        logo: null,
        logoOnDark: false,
        lfxSlug: lfx.slug,
        years: range(lfx.years),
      };
  }
  return null;
}

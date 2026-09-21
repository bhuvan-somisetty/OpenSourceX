import { z } from "zod";
import { assertNoContactData, scrubText } from "@opensourcex/shared";
import { excerpt } from "./types";

/**
 * GSoC organization sanitizer. GSoC data is organization-per-year only (D-007): no project,
 * mentor or person fields exist. contact_links and *_comm_methods can contain contact data,
 * so they are deliberately NOT kept in M1a; community-channel mapping is deferred.
 */
const list = z.array(z.string()).nullable().optional().default([]);

const rawOrg = z.object({
  slug: z.string(),
  name: z.string(),
  website_url: z.string().nullable().optional().default(null),
  source_code: z.string().nullable().optional().default(null),
  license: z.string().nullable().optional().default(null),
  tagline: z.string().nullable().optional().default(null),
  categories: list,
  tech_tags: list,
  topic_tags: list,
});

export interface GsocOrg {
  slug: string;
  name: string;
  websiteUrl: string | null;
  sourceCode: string | null;
  license: string | null;
  tagline: string | null;
  categories: string[];
  techTags: string[];
  topicTags: string[];
}
export interface GsocOrgsBody {
  year: number;
  orgs: GsocOrg[];
}

const https = (u: string | null) => (u && /^https?:\/\/[^\s]+$/.test(u) ? u : null);

export function sanitizeGsocOrg(raw: unknown): GsocOrg {
  const o = rawOrg.parse(raw);
  const out: GsocOrg = {
    slug: o.slug,
    name: scrubText(o.name),
    websiteUrl: https(o.website_url),
    sourceCode: https(o.source_code),
    license: o.license,
    tagline: excerpt(o.tagline ? scrubText(o.tagline) : null, 160),
    categories: (o.categories ?? []).slice(0, 10),
    techTags: (o.tech_tags ?? []).slice(0, 20),
    topicTags: (o.topic_tags ?? []).slice(0, 20),
  };
  assertNoContactData(out);
  return out;
}

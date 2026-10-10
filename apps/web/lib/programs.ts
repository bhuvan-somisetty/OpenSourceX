/**
 * Program catalog. Programs are configuration, not hard-coded UI: adding a program means adding an entry here
 * (and data for it). An entry with no data in the database is shown as "No data yet", never as fake content.
 * `slug` is the database slug; `alias` is the short URL form (?program=lfx).
 */
export interface ProgramDef {
  slug: string;
  alias: string;
  name: string;
  short: string;
  tagline: string;
  blurb: string;
}

export const PROGRAM_CATALOG: readonly ProgramDef[] = [
  {
    slug: "gsoc",
    alias: "gsoc",
    name: "Google Summer of Code",
    short: "GSoC",
    tagline: "Organizations by year",
    blurb: "Explore the open-source organizations that took part in Google Summer of Code.",
  },
  {
    slug: "lfx-mentorship",
    alias: "lfx",
    name: "LFX Mentorship",
    short: "LFX",
    tagline: "Mentorship projects by term",
    blurb: "Explore mentorship projects and terms. Recorded data covers the CNCF ecosystem only.",
  },
  {
    slug: "summer-of-bitcoin",
    alias: "summer-of-bitcoin",
    name: "Summer of Bitcoin",
    short: "Summer of Bitcoin",
    tagline: "Bitcoin open source",
    blurb: "Summer mentorships across Bitcoin and Lightning projects.",
  },
  {
    slug: "european-summer-of-code",
    alias: "esoc",
    name: "European Summer of Code",
    short: "ESoC",
    tagline: "European open source",
    blurb: "Open-source and applied AI mentorship stipends across European projects.",
  },
  {
    slug: "igalia",
    alias: "igalia",
    name: "Igalia Coding Experience",
    short: "Igalia",
    tagline: "Web engines & compilers",
    blurb: "Mentorship and coding experience in open-source web engines, graphics and compilers.",
  },
  {
    slug: "outreachy",
    alias: "outreachy",
    name: "Outreachy",
    short: "Outreachy",
    tagline: "Internships in open source",
    blurb: "Paid, remote internships for people underrepresented in tech.",
  },
  {
    slug: "processing-foundation",
    alias: "processing",
    name: "Processing Foundation",
    short: "Processing Foundation",
    tagline: "Fellowships & creative code",
    blurb: "Fellowships and community mentorships across Processing, p5.js, and open-source creative coding.",
  },
  {
    slug: "mlh-fellowship",
    alias: "mlh",
    name: "MLH Fellowship",
    short: "MLH Fellowship",
    tagline: "Fellowships in open source",
    blurb: "Remote 12-week internship alternative for aspiring software engineers.",
  },
  {
    slug: "ospp",
    alias: "ospp",
    name: "Open Source Promotion Plan",
    short: "OSPP",
    tagline: "Open source summer",
    blurb: "Summer mentorship program for students supporting open-source software development.",
  },
  {
    slug: "c4gt",
    alias: "c4gt",
    name: "Code for GovTech",
    short: "C4GT",
    tagline: "Tech for good mentorship",
    blurb: "Dedicated mentorship program creating digital public goods and tech-for-good open source solutions.",
  },
  {
    slug: "season-of-docs",
    alias: "season-of-docs",
    name: "Season of Docs",
    short: "Season of Docs",
    tagline: "Documentation projects",
    blurb: "Technical writers working with open-source projects.",
  },
];

/** Accepts the database slug or the short alias ("lfx" -> "lfx-mentorship"). Unknown values return null. */
export function resolveProgram(param: string | undefined | null): ProgramDef | null {
  if (!param) return null;
  const p = param.toLowerCase();
  return PROGRAM_CATALOG.find((d) => d.slug === p || d.alias === p) ?? null;
}

export function programDef(slug: string): ProgramDef | undefined {
  return PROGRAM_CATALOG.find((d) => d.slug === slug);
}

export const monogram = (d: Pick<ProgramDef, "short">) =>
  d.short
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { KnowledgeDocInput } from "./knowledge";

/**
 * Reads apps/web/data/knowledge/** /*.md: a front-matter block (id, title, kind, tags, one
 * "sources: label | url" line per source) followed by "## " sections.
 */
export function parseKnowledgeFile(text: string, fallbackId: string): KnowledgeDocInput {
  const m = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${fallbackId}: missing front matter`);
  const meta: Record<string, string> = {};
  const sources: KnowledgeDocInput["sources"] = [];
  for (const line of m[1]!.split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    if (kv[1] === "sources") {
      const [label, url] = kv[2]!.split("|").map((s) => s.trim());
      sources.push({ label: label!, url: url || null });
    } else meta[kv[1]!] = kv[2]!.trim();
  }
  const sections: KnowledgeDocInput["sections"] = [];
  for (const block of m[2]!.split(/^## /m).slice(1)) {
    const nl = block.indexOf("\n");
    const heading = block.slice(0, nl).trim();
    const content = block.slice(nl + 1).trim();
    if (heading && content) sections.push({ heading, content });
  }
  if (!meta.title || !sections.length)
    throw new Error(`${fallbackId}: needs a title and at least one "## " section`);
  return {
    id: meta.id ?? fallbackId,
    kind: meta.kind === "reference" ? "reference" : "guide",
    title: meta.title,
    tags: (meta.tags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    sources,
    sections,
  };
}

export async function readKnowledgeDir(dir: string): Promise<KnowledgeDocInput[]> {
  const out: KnowledgeDocInput[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const file = path.join(entry.parentPath, entry.name);
    out.push(parseKnowledgeFile(await readFile(file, "utf8"), entry.name.replace(/\.md$/, "")));
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

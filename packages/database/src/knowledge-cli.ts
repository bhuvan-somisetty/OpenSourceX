import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv, requireDatabaseUrl } from "@opensourcex/shared";
import { createPool } from "./client";
import { replaceKnowledge } from "./knowledge";
import { readKnowledgeDir } from "./knowledge-files";

/**
 * pnpm db:knowledge : loads the public guides in apps/web/data/knowledge, plus any private
 * documents in KNOWLEDGE_PRIVATE_DIR (reference proposals kept out of the public repository).
 * Kinds that are not loaded stay untouched in the database.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const dirs = [
  path.resolve(here, "../../../apps/web/data/knowledge"),
  process.env.KNOWLEDGE_PRIVATE_DIR?.trim(),
].filter((d): d is string => !!d);
const pool = createPool(requireDatabaseUrl(loadEnv()));
Promise.all(dirs.map(readKnowledgeDir))
  .then(async (lists) => {
    const docs = lists.flat();
    const sections = await replaceKnowledge(pool, docs);
    const kinds = [...new Set(docs.map((d) => d.kind))].join(" and ");
    console.log(`loaded ${docs.length} documents (${kinds}), ${sections} sections`);
  })
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

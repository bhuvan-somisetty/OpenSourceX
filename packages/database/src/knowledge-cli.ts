import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv, requireDatabaseUrl } from "@opensourcex/shared";
import { createPool } from "./client";
import { replaceKnowledge } from "./knowledge";
import { readKnowledgeDir } from "./knowledge-files";

/** pnpm db:knowledge : loads apps/web/data/knowledge into knowledge_doc / knowledge_chunk. */
const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, "../../../apps/web/data/knowledge");
const pool = createPool(requireDatabaseUrl(loadEnv()));
readKnowledgeDir(dir)
  .then(async (docs) => {
    const sections = await replaceKnowledge(pool, docs);
    console.log(`loaded ${docs.length} documents, ${sections} sections`);
  })
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

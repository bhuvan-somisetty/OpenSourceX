import type { Db } from "./client";

/**
 * Knowledge base for Ask (migration 008). Documents are Markdown files split at "## " headings;
 * each section is searched with weighted full-text search: title and tags, then heading, then body.
 */
export interface KnowledgeDocInput {
  id: string;
  kind: "guide" | "reference";
  title: string;
  tags: string[];
  sources: { label: string; url: string | null }[];
  sections: { heading: string; content: string }[];
}

export interface KnowledgeHit {
  docId: string;
  kind: "guide" | "reference";
  title: string;
  heading: string;
  content: string;
  sources: { label: string; url: string | null }[];
  rank: number;
  /** how many distinct query words this section matched */
  matched: number;
}

/**
 * Replaces documents in one transaction. Only the kinds present in `docs` are replaced, so
 * loading the public guides alone never removes reference proposals that were loaded from a
 * private folder (they are kept out of the public repository).
 */
export async function replaceKnowledge(db: Db, docs: KnowledgeDocInput[]): Promise<number> {
  const client = await db.connect();
  let n = 0;
  try {
    await client.query("BEGIN");
    const kinds = [...new Set(docs.map((d) => d.kind))];
    await client.query("DELETE FROM knowledge_doc WHERE kind = ANY($1)", [kinds]);
    for (const d of docs) {
      await client.query(
        "INSERT INTO knowledge_doc(id, kind, title, tags, sources) VALUES ($1,$2,$3,$4,$5)",
        [d.id, d.kind, d.title, d.tags, JSON.stringify(d.sources)],
      );
      for (const [i, s] of d.sections.entries()) {
        await client.query(
          `INSERT INTO knowledge_chunk(doc_id, position, heading, content, search)
           VALUES ($1, $2, $3, $4,
             setweight(to_tsvector('english', $5), 'A') ||
             setweight(to_tsvector('english', $3), 'A') ||
             setweight(to_tsvector('english', $4), 'B'))`,
          [d.id, i, s.heading, s.content, `${d.title} ${d.tags.join(" ")}`],
        );
        n++;
      }
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return n;
}

const WORD = /^[a-z0-9]{2,30}$/;

/**
 * Sections matching any of the question's words, best first. Words are OR-ed (natural questions
 * rarely contain every keyword) and ranking rewards sections that match more of them.
 */
export async function searchKnowledge(
  db: Db,
  question: string,
  opts: { limit?: number; kinds?: ("guide" | "reference")[] } = {},
): Promise<KnowledgeHit[]> {
  const words = [
    ...new Set(
      question
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, " ")
        .split(/\s+/)
        .filter((w) => WORD.test(w)),
    ),
  ].slice(0, 24);
  if (!words.length) return [];
  const { rows } = await db.query(
    `WITH q AS (
       SELECT to_tsquery('english', string_agg(w, ' | ')) AS query,
              array_agg(plainto_tsquery('english', w)) AS parts
       FROM unnest($1::text[]) AS w WHERE plainto_tsquery('english', w)::text <> ''
     )
     SELECT * FROM (
     SELECT c.doc_id, d.kind, d.title, c.heading, c.content, d.sources,
            ts_rank_cd(c.search, q.query, 1) AS rank,
            (SELECT count(*) FROM unnest(q.parts) p WHERE c.search @@ p) AS matched,
            (SELECT count(*) FROM unnest(q.parts) p WHERE to_tsvector('english', c.heading) @@ p) AS hmatched
     FROM knowledge_chunk c JOIN knowledge_doc d ON d.id = c.doc_id, q
     WHERE q.query IS NOT NULL AND c.search @@ q.query AND d.kind = ANY($2)
     ) hits
     ORDER BY matched + 1.5 * hmatched + rank DESC
     LIMIT $3`,
    [words, opts.kinds ?? ["guide", "reference"], opts.limit ?? 6],
  );
  return rows.map((r) => ({
    docId: r.doc_id,
    kind: r.kind,
    title: r.title,
    heading: r.heading,
    content: r.content,
    sources: r.sources ?? [],
    rank: Number(r.rank),
    matched: Number(r.matched),
  }));
}

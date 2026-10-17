import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import {
  createGateway,
  isStepCount,
  streamText,
  tool,
  type LanguageModel,
  type ModelMessage,
} from "ai";
import { z } from "zod";
import { createLogger } from "@opensourcex/shared";
import type { AskEngine, KnowledgeHit } from "@opensourcex/database";
import { answerQuestion } from "@/lib/ask";
import {
  findOrg,
  findProgram,
  orgSummary,
  recurringOrgs,
  searchOrgs,
  type Knowledge,
} from "./knowledge";

/**
 * AI answer engine. Providers are tried in order: Google Gemini and Groq (free API keys, no card),
 * Vercel AI Gateway (free credits, but it needs a card on file), then Anthropic and OpenAI (paid).
 * Any provider without a key is skipped; a failing one is skipped for a few minutes and the next is
 * tried, and finally the offline engine answers. The model reaches OpenSourceX data only through
 * the read-only tools below, so organization links always come from recorded data.
 */
export interface Provider {
  engine: Exclude<AskEngine, "offline">;
  label: string;
  model: LanguageModel;
}

const log = createLogger("ask");
const env = (k: string) => process.env[k]?.trim() || undefined;

export function aiEnabled(): boolean {
  return env("AI_ENABLED") === "true";
}

const COOLDOWN_MS = 5 * 60_000;
const cooling = new Map<string, number>();

/** A provider that just failed (no credits, bad key, outage) is skipped for a few minutes. */
export function markFailed(engine: string, now = Date.now()) {
  cooling.set(engine, now + COOLDOWN_MS);
}

export function configuredProviders(now = Date.now()): Provider[] {
  if (!aiEnabled()) return [];
  const out: Provider[] = [];
  const google = env("GOOGLE_GENERATIVE_AI_API_KEY") ?? env("GEMINI_API_KEY");
  if (google) {
    const id = env("ASK_GOOGLE_MODEL") ?? "gemini-3.5-flash";
    out.push({
      engine: "google",
      label: id,
      model: createGoogleGenerativeAI({ apiKey: google })(id),
    });
  }
  if (env("GROQ_API_KEY")) {
    const id = env("ASK_GROQ_MODEL") ?? "openai/gpt-oss-120b";
    out.push({ engine: "groq", label: id, model: createGroq({ apiKey: env("GROQ_API_KEY") })(id) });
  }
  if (env("AI_GATEWAY_API_KEY") || env("VERCEL_OIDC_TOKEN") || env("VERCEL")) {
    const id = env("ASK_GATEWAY_MODEL") ?? "google/gemini-3.1-flash-lite";
    out.push({
      engine: "gateway",
      label: id,
      model: createGateway({ apiKey: env("AI_GATEWAY_API_KEY") })(id),
    });
  }
  if (env("ANTHROPIC_API_KEY")) {
    const id = env("ASK_ANTHROPIC_MODEL") ?? "claude-haiku-4-5";
    out.push({
      engine: "anthropic",
      label: id,
      model: createAnthropic({ apiKey: env("ANTHROPIC_API_KEY") })(id),
    });
  }
  if (env("OPENAI_API_KEY")) {
    const id = env("ASK_OPENAI_MODEL") ?? "gpt-5.4-mini";
    out.push({
      engine: "openai",
      label: id,
      model: createOpenAI({ apiKey: env("OPENAI_API_KEY") })(id),
    });
  }
  const order = env("ASK_PROVIDER_ORDER")
    ?.split(",")
    .map((s) => s.trim());
  if (order?.length)
    out.sort(
      (a, b) => ((order.indexOf(a.engine) + 99) % 99) - ((order.indexOf(b.engine) + 99) % 99),
    );
  return out.filter((p) => (cooling.get(p.engine) ?? 0) <= now);
}

/** Free-tier guard rails: AI answers per user and for the whole site in any 24 hours. */
export const AI_LIMITS = {
  perUserPerDay: Number(env("ASK_AI_PER_USER_DAY") ?? 25),
  globalPerDay: Number(env("ASK_AI_GLOBAL_DAY") ?? 200),
  maxOutputTokens: Number(env("ASK_MAX_OUTPUT_TOKENS") ?? 1200),
};

const INSTRUCTIONS = `You are OpenSourceX Ask, a friendly expert assistant for everything about open source: contributing, Git and GitHub, licences, maintainership, open source careers, mentorship programs (Google Summer of Code, LFX Mentorship, Outreachy, Season of Docs, Summer of Bitcoin, European Summer of Code, OSPP, C4GT, MLH Fellowship, Igalia Coding Experience, Processing Foundation) and the organizations in them.

How to answer:
- For any "how / what / why / should I" question about applying, prerequisites, resumes, cover letters, proposals, timelines, choosing a program, contributing, Git, licences or communities, CALL searchKnowledge FIRST and base the answer on what it returns. The knowledge base was written from official program documentation, so prefer it over your own memory, and cite its sources.
- For any question about a specific organization, program, repository, chat link (Slack, Discord, Matrix...), website, stipend, eligibility, timeline, mentors, or which organizations repeat, CALL THE DATA TOOLS. Combine several tool calls when needed (for example searchKnowledge plus programDetails).
- searchKnowledge also returns excerpts of real reference proposals (kind "reference"). Use them to show what a strong proposal looks like and to give concrete examples of structure, timelines and PR tables. Personal details were removed; never try to identify the applicant, and never present a reference as the user's own work or tell users to copy it.
- Answer the exact question first, directly and completely, then add useful detail. If the question is about one program, do not drift into others.
- Links to organizations, repositories, chats and program pages must come from tool results. Never invent or guess a URL. If a tool has no link, say it is not recorded and suggest where to look (the org's website or GitHub README).
- Internal page links in tool results start with "/" (for example /programs/gsoc/organizations/x); keep them as Markdown links, they open inside OpenSourceX.
- If the tools return nothing relevant, answer from your general open source knowledge, and say when something should be checked on the official page.
- Write clear Markdown: short paragraphs, bullet lists, and tables for lists of organizations. Be concise and direct, like a helpful senior contributor.
- Recorded LFX Mentorship data covers CNCF projects only. Program data was collected from official sources; mention the date or source when a fact may change (stipends, deadlines).
- Today's date is ${new Date().toISOString().slice(0, 10)}.`;

const MAX_LIST = 40;

export type GuideSearch = (query: string) => Promise<KnowledgeHit[]>;

export function buildTools(k: Knowledge, searchGuides: GuideSearch = async () => []) {
  return {
    searchKnowledge: tool({
      description:
        "Search the OpenSourceX open source knowledge base: how to apply to LFX Mentorship (prerequisites, resume, cover letter, certificates, limits), GSoC and Outreachy, writing proposals and cover letters (with real reference proposals), resumes, choosing a program, first contributions, Git/PR/DCO, licences, community etiquette, succeeding in a mentorship. Pass the user's question or focused keywords.",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const hits = await searchGuides(query);
        return hits.length
          ? hits.map((h) => ({
              document: h.title,
              kind: h.kind,
              section: h.heading,
              content: h.content.slice(0, h.kind === "reference" ? 1500 : 3000),
              sources: h.sources,
            }))
          : { found: false };
      },
    }),
    findOrganization: tool({
      description:
        "Look up one organization by name (any program). Returns its repository, GitHub, website, chat links (Slack/Discord/Matrix with channels), technologies, and every program and year it took part in, with recent projects and idea-list links.",
      inputSchema: z.object({
        name: z
          .string()
          .describe(
            "Organization or project name, e.g. Volcano, WasmEdge, Python Software Foundation",
          ),
      }),
      execute: async ({ name }) => {
        const r = findOrg(k, name);
        if (!r.org) return { found: false, note: `No organization named "${name}" is recorded.` };
        return {
          found: true,
          organization: orgSummary(r.org, true),
          otherMatches: r.candidates.map((c) => c.name),
        };
      },
    }),
    searchOrganizations: tool({
      description:
        "List organizations, filtered by program, technology, year and/or keywords. Use for questions like 'GSoC orgs that use Rust', 'Outreachy 2025 organizations', 'orgs about machine learning'.",
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe("Keywords to match in name, description and technologies"),
        program: z.string().optional().describe("Program name or slug, e.g. gsoc, lfx, outreachy"),
        technology: z.string().optional(),
        year: z.number().int().optional(),
        minYears: z
          .number()
          .int()
          .optional()
          .describe("Only orgs that took part in at least this many years"),
      }),
      execute: async (s) => {
        const found = searchOrgs(k, s);
        return {
          total: found.length,
          shown: Math.min(found.length, MAX_LIST),
          organizations: found.slice(0, MAX_LIST).map((o) => {
            const v = orgSummary(o);
            return {
              name: v.name,
              repository: v.repository,
              technologies: v.technologies.slice(0, 5),
              programs: v.programs.map((p) => `${p.program} ${p.years.join(",")} (${p.page})`),
            };
          }),
        };
      },
    }),
    recurringOrganizations: tool({
      description:
        "Organizations that keep coming back (repeat every year/term). With a program, ranks by years (or LFX terms) in that program; without, ranks by how many programs they appear in.",
      inputSchema: z.object({
        program: z.string().optional(),
        limit: z.number().int().min(1).max(60).optional(),
      }),
      execute: async ({ program, limit }) => {
        const p = program ? findProgram(k, program) : null;
        return {
          program: p?.def.name ?? "all programs",
          recordedYears: p?.years,
          organizations: recurringOrgs(k, p?.def.slug ?? null, limit ?? 30).map((r) => ({
            name: r.org.name,
            years: r.years,
            lfxTerms: r.terms.length || undefined,
            programs: r.programs,
            page: (r.org.programs.find((e) => !p || e.program === p.def.slug) ?? r.org.programs[0]!)
              .pageUrl,
          })),
        };
      },
    }),
    programDetails: tool({
      description:
        "Details for one mentorship program: summary, stipend (amounts and payments), eligibility, timeline, how to apply, official links, and how many organizations are recorded.",
      inputSchema: z.object({ program: z.string() }),
      execute: async ({ program }) => {
        const p = findProgram(k, program);
        if (!p) return { found: false, programs: k.programs.map((x) => x.def.name) };
        return {
          found: true,
          name: p.def.name,
          page: p.pageUrl,
          organizations: p.orgCount,
          years: p.years,
          info: p.info,
        };
      },
    }),
    listPrograms: tool({
      description:
        "Every mentorship program OpenSourceX covers, with its page and organization count.",
      inputSchema: z.object({}),
      execute: async () => ({
        programs: k.programs.map((p) => ({
          name: p.def.name,
          short: p.def.short,
          about: p.def.blurb,
          page: p.pageUrl,
          organizations: p.orgCount,
          years: p.years,
          status: p.info?.status,
        })),
      }),
    }),
    lfxMentorshipHistory: tool({
      description:
        "Answers questions about CNCF projects in LFX Mentorship from the official term READMEs (2019 onward): projects per term, mentors and their GitHub handles, term timelines, skills, which CNCF projects repeat each term, counts. Pass the user's question in plain English.",
      inputSchema: z.object({ question: z.string() }),
      execute: async ({ question }) => {
        if (!k.lfx) return { available: false };
        const a = answerQuestion(question, k.lfx);
        return {
          ...a,
          table: a.table
            ? { columns: a.table.columns, rows: a.table.rows.slice(0, 40) }
            : undefined,
          programs: a.programs?.slice(0, 25).map((p) => ({ ...p, page: `/projects/${p.id}` })),
        };
      },
    }),
  };
}

export type StreamEvent = { type: "text"; text: string } | { type: "tool"; name: string };

/**
 * Streams one answer from the first provider that works. Throws only when no provider produced
 * any text, so the caller can fall back to the offline engine.
 */
export async function* streamAnswer(
  providers: Provider[],
  messages: ModelMessage[],
  k: Knowledge,
  signal?: AbortSignal,
  searchGuides?: GuideSearch,
): AsyncGenerator<StreamEvent, { engine: Provider["engine"]; label: string }> {
  const tools = buildTools(k, searchGuides);
  let lastError: unknown = null;
  for (const p of providers) {
    let wrote = false;
    try {
      const result = streamText({
        model: p.model,
        instructions: INSTRUCTIONS,
        messages,
        tools,
        stopWhen: isStepCount(6),
        maxOutputTokens: AI_LIMITS.maxOutputTokens,
        maxRetries: 1,
        timeout: { totalMs: 60_000, firstChunkMs: 25_000 },
        abortSignal: signal,
      });
      for await (const part of result.stream) {
        if (part.type === "text-delta" && part.text) {
          wrote = true;
          yield { type: "text", text: part.text };
        } else if (part.type === "tool-call") {
          yield { type: "tool", name: part.toolName };
        } else if (part.type === "error") {
          throw part.error;
        }
      }
      if (wrote) return { engine: p.engine, label: p.label };
      lastError = new Error(`${p.engine} returned no text`);
    } catch (e) {
      if (wrote) {
        yield { type: "text", text: "\n\n_The answer was cut off by the AI provider._" };
        return { engine: p.engine, label: p.label };
      }
      if (signal?.aborted) throw e;
      lastError = e;
      markFailed(p.engine);
      log.warn(
        { engine: p.engine, model: p.label, err: String((e as Error)?.message ?? e).slice(0, 300) },
        "ask provider failed",
      );
    }
  }
  throw lastError ?? new Error("no AI provider configured");
}

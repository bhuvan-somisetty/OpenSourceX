import { generateText, Output } from "ai";
import { z } from "zod";
import { createLogger } from "@opensourcex/shared";
import { configuredProviders, markFailed } from "@/lib/assistant/ai";
import {
  DIMENSIONS,
  LEVELS,
  MODES,
  verdictFor,
  type Delivery,
  type Feedback,
  type FocusArea,
  type InterviewProject,
  type Level,
  type Mode,
  type Question,
  type Report,
  type Turn,
} from "./coach";

/**
 * AI interviewer. Uses the same free providers as Ask (Gemini first), one short structured call
 * per answer. Callers fall back to the offline coach whenever this throws.
 */
const log = createLogger("interview");
const env = (k: string) => process.env[k]?.trim() || undefined;

/** Free-tier guard rails, separate from Ask's. In-memory, so per server instance. */
const LIMITS = {
  perUser: Number(env("INTERVIEW_AI_PER_USER_DAY") ?? 40),
  global: Number(env("INTERVIEW_AI_GLOBAL_DAY") ?? 400),
};
const DAY_MS = 24 * 60 * 60_000;
const used = new Map<string, { n: number; reset: number }>();

function take(key: string, limit: number, now: number): boolean {
  const cur = used.get(key);
  if (!cur || cur.reset <= now) {
    used.set(key, { n: 1, reset: now + DAY_MS });
    return true;
  }
  if (cur.n >= limit) return false;
  cur.n += 1;
  return true;
}

export function interviewAiAvailable(): boolean {
  return configuredProviders().length > 0;
}

/** Spends one AI call for this user; false when today's free calls are used up. */
export function spendAi(userKey: string, now = Date.now()): boolean {
  return take(`u:${userKey}`, LIMITS.perUser, now) && take("global", LIMITS.global, now);
}

const score = z.number().int().min(1).max(10);
const TurnSchema = z.object({
  scores: z.object({
    relevance: score,
    knowledge: score,
    depth: score,
    structure: score,
    clarity: score,
  }),
  spoken: z
    .string()
    .describe("One or two short spoken sentences reacting to the answer, like a real interviewer"),
  strengths: z.array(z.string()).max(3),
  improve: z.array(z.string()).max(3),
  stronger: z.array(z.string()).min(2).max(6).describe("Bullet outline of a stronger answer"),
  next: z
    .object({
      text: z.string(),
      lookFor: z.array(z.string()).min(2).max(4),
      followUp: z.boolean(),
    })
    .nullable()
    .describe("The next question, or null if this was the last one"),
});

const ReportSchema = z.object({
  summary: z.string().describe("Two or three sentences, addressed to the candidate"),
  focus: z
    .array(
      z.object({
        dimension: z.enum(Object.keys(DIMENSIONS) as [keyof typeof DIMENSIONS]),
        title: z.string(),
        why: z.string(),
        actions: z.array(z.string()).min(2).max(4),
      }),
    )
    .max(3),
});

function persona(mode: Mode, level: Level) {
  return `You are a warm but rigorous open source mentorship interviewer (like a maintainer interviewing a Google Summer of Code or LFX Mentorship candidate). Mode: ${MODES[mode].label} (${MODES[mode].blurb}). Candidate level: ${LEVELS[level]}.
Rules:
- Ground every question in the project facts given. Never invent facts about the project; if something is not recorded, ask the candidate to explain it instead.
- Ask ONE question at a time, short enough to say aloud in under 20 seconds. No Markdown, no lists in spoken text.
- Score honestly from 1 to 10 per dimension: relevance (answers the question), knowledge (of this project), depth (technical specifics), structure (clear order), clarity (concise, few fillers). A vague or very short answer must score low.
- Feedback must be specific to what the candidate actually said; quote or paraphrase it. Be encouraging but never flattering.
- If the answer was vague or skipped a key point, the next question may be a follow-up that digs into it (followUp true); otherwise move to a new topic for this mode. Do not repeat earlier questions.
- The answer is a speech transcript, so ignore punctuation and small recognition errors.`;
}

function facts(p: InterviewProject) {
  return [
    `Project: ${p.name}`,
    p.org ? `Organization: ${p.org}` : null,
    `Program: ${p.program}`,
    `Summary: ${p.summary ?? "not recorded"}`,
    `Technologies: ${p.technologies.join(", ") || "not recorded"}`,
    `Repository: ${p.repoUrl ?? "not recorded"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function generate<T>(schema: z.ZodType<T>, system: string, prompt: string): Promise<T> {
  let lastError: unknown = null;
  for (const p of configuredProviders()) {
    try {
      const { output } = await generateText({
        model: p.model,
        instructions: system,
        prompt,
        output: Output.object({ schema }),
        maxOutputTokens: 900,
        maxRetries: 1,
        timeout: { totalMs: 30_000 },
      });
      return output as T;
    } catch (e) {
      lastError = e;
      markFailed(p.engine);
      log.warn(
        { engine: p.engine, err: String((e as Error)?.message ?? e).slice(0, 300) },
        "interview provider failed",
      );
    }
  }
  throw lastError ?? new Error("no AI provider configured");
}

export interface AiTurnInput {
  project: InterviewProject;
  mode: Mode;
  level: Level;
  history: { question: string; answer: string }[];
  question: Question;
  answer: string;
  delivery: Delivery;
  remaining: number;
}

export async function aiTurn(
  i: AiTurnInput,
): Promise<{ feedback: Feedback; next: Question | null }> {
  const earlier = i.history
    .map((h, n) => `Q${n + 1}: ${h.question}\nA${n + 1}: ${h.answer.slice(0, 800)}`)
    .join("\n\n");
  const out = await generate(
    TurnSchema,
    persona(i.mode, i.level),
    `${facts(i.project)}

${earlier ? `Earlier in this interview:\n${earlier}\n\n` : ""}Current question: ${i.question.text}
A strong answer covers: ${i.question.lookFor.join("; ")}

Candidate's answer (speech transcript, ${i.delivery.words} words${
      i.delivery.wpm ? `, ${i.delivery.wpm} words a minute` : ""
    }${i.delivery.fillerCount ? `, ${i.delivery.fillerCount} filler words` : ""}):
"""${i.answer.slice(0, 4000)}"""

Score and give feedback on this answer. ${
      i.remaining > 0
        ? `Then write the next question (${i.remaining} left).`
        : "This was the last question: next must be null."
    }`,
  );
  const s = out.scores;
  const overall = Math.round(
    ((s.relevance * 0.3 +
      s.knowledge * 0.2 +
      s.depth * 0.2 +
      s.structure * 0.15 +
      s.clarity * 0.15) /
      10) *
      100,
  );
  return {
    feedback: {
      scores: s,
      overall,
      spoken: out.spoken,
      strengths: out.strengths,
      improve: out.improve,
      stronger: out.stronger,
    },
    next:
      i.remaining > 0 && out.next
        ? {
            id: `ai-${i.history.length + 1}`,
            text: out.next.text,
            lookFor: out.next.lookFor,
            followUp: out.next.followUp,
          }
        : null,
  };
}

export async function aiReport(
  p: InterviewProject,
  mode: Mode,
  level: Level,
  turns: Turn[],
  base: Report,
): Promise<Report> {
  const lines = turns
    .map(
      (t, n) =>
        `Q${n + 1}: ${t.question.text}\nA${n + 1}: ${t.answer.slice(0, 700)}\nScores: ${JSON.stringify(t.feedback.scores)}`,
    )
    .join("\n\n");
  const out = await generate(
    ReportSchema,
    persona(mode, level),
    `${facts(p)}

The interview is over. Average scores: ${JSON.stringify(base.scores)}. Overall ${base.overall}/100.
${lines}

Write a short summary for the candidate and up to three focus areas (lowest scores first), each with concrete actions they can do this week for THIS project (reading specific parts of the repository, preparing specific explanations, practising a specific skill). Skip dimensions that scored 8 or more.`,
  );
  return {
    ...base,
    verdict: verdictFor(base.overall),
    summary: out.summary,
    focus: out.focus.length ? (out.focus as FocusArea[]) : base.focus,
  };
}

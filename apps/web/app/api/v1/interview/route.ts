import { AppError, badRequest } from "@opensourcex/shared";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/data";
import { rateLimit, route } from "@/lib/http";
import { aiReport, aiTurn, interviewAiAvailable, spendAi } from "@/lib/interview/ai";
import {
  analyzeDelivery,
  DIMENSIONS,
  MODE_KEYS,
  LEVELS,
  offlineReport,
  scoreOffline,
  type Level,
  type Mode,
  type Turn,
} from "@/lib/interview/coach";
import { interviewProject } from "@/lib/interview/project";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const QuestionSchema = z.object({
  id: z.string().max(40),
  text: z.string().min(1).max(600),
  lookFor: z.array(z.string().max(200)).max(6),
  followUp: z.boolean().optional(),
});
const score = z.number().min(0).max(10);
const Common = {
  projectId: z.string().max(40),
  mode: z.enum(MODE_KEYS as [Mode, ...Mode[]]),
  level: z.enum(Object.keys(LEVELS) as [Level, ...Level[]]),
};
const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("turn"),
    ...Common,
    history: z
      .array(z.object({ question: z.string().max(600), answer: z.string().max(4000) }))
      .max(12),
    question: QuestionSchema,
    answer: z.string().trim().min(1).max(4000),
    seconds: z.number().min(0).max(1800),
    remaining: z.number().int().min(0).max(12),
  }),
  z.object({
    action: z.literal("report"),
    ...Common,
    turns: z
      .array(
        z.object({
          question: QuestionSchema,
          answer: z.string().max(4000),
          seconds: z.number().min(0).max(1800),
          feedback: z.object({
            scores: z.object(
              Object.fromEntries(Object.keys(DIMENSIONS).map((k) => [k, score])) as Record<
                keyof typeof DIMENSIONS,
                typeof score
              >,
            ),
            overall: z.number().min(0).max(100),
            spoken: z.string().max(600),
            strengths: z.array(z.string().max(400)).max(4),
            improve: z.array(z.string().max(400)).max(4),
            stronger: z.array(z.string().max(400)).max(8),
          }),
        }),
      )
      .min(1)
      .max(12),
  }),
]);

/**
 * POST /api/v1/interview: one step of a voice interview.
 * - {action:"turn"} scores an answer and returns the next question (null = use the offline list).
 * - {action:"report"} returns the end-of-interview report with focus areas.
 * The AI interviewer is used for signed-in sessions while free daily calls last; otherwise the
 * offline coach answers. Project facts are always loaded on the server, never taken from the body.
 */
export const POST = route(async (req) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw badRequest("Invalid interview request");
  const b = parsed.data;
  const session = await getSession();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const who = session?.userId ?? `ip:${ip}`;
  if (!rateLimit(`interview:${who}`, Date.now(), 20))
    throw new AppError(429, "rate_limited", "Slow down a little: at most 20 answers a minute");

  const project = await interviewProject(db(), b.projectId);
  if (!project) throw new AppError(404, "not_found", "Project not found");

  let note: string | undefined;
  const useAi = (() => {
    if (!interviewAiAvailable()) return false;
    if (!session) {
      note = "Sign in to get feedback from the AI interviewer.";
      return false;
    }
    if (!spendAi(session.userId)) {
      note =
        "Today's free AI interviews are used up, so the offline coach is scoring. AI comes back within 24 hours.";
      return false;
    }
    return true;
  })();

  if (b.action === "turn") {
    const delivery = analyzeDelivery(b.answer, b.seconds);
    if (useAi) {
      try {
        const r = await aiTurn({ project, ...b, delivery });
        return Response.json({ ...r, delivery, engine: "ai" });
      } catch {
        note = "The AI interviewer is busy, so the offline coach scored this answer.";
      }
    }
    return Response.json({
      feedback: scoreOffline(project, b.question, b.answer, delivery),
      next: null,
      delivery,
      engine: "offline",
      note,
    });
  }

  const turns: Turn[] = b.turns.map((t) => ({
    ...t,
    delivery: analyzeDelivery(t.answer, t.seconds),
  }));
  const base = offlineReport(project, turns);
  if (useAi) {
    try {
      return Response.json({
        report: await aiReport(project, b.mode, b.level, turns, base),
        engine: "ai",
      });
    } catch {
      note = "The AI interviewer is busy, so the offline coach wrote this report.";
    }
  }
  return Response.json({ report: base, engine: "offline", note });
});

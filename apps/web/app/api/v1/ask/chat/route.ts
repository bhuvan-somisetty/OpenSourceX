import { addMessage, ensureConversation, getConversation } from "@opensourcex/database";
import { AppError, badRequest } from "@opensourcex/shared";
import { z } from "zod";
import { respond } from "@/lib/assistant/engine";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/data";
import { rateLimit, route } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({
  conversationId: z.uuid(),
  message: z.string().trim().min(1).max(2000),
});

/**
 * POST /api/v1/ask/chat {conversationId, message}: answers one chat turn as NDJSON events
 * ({t:"tool"}, {t:"d", v:text}, {t:"done", engine}) and saves both messages to the session's
 * history. The client creates the conversation id, so a new chat gets its URL immediately.
 */
export const POST = route(async (req) => {
  const session = await getSession();
  if (!session) throw new AppError(401, "unauthorized", "Sign in to chat");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    throw badRequest("conversationId (uuid) and message (1-2000 chars) are required");
  const { conversationId, message } = parsed.data;
  if (!rateLimit(`ask:${session.userId}`, Date.now(), 12))
    throw new AppError(429, "rate_limited", "Slow down a little: at most 12 questions a minute");

  const d = db();
  const title = message.replace(/\s+/g, " ").slice(0, 60);
  if (!(await ensureConversation(d, session.userId, conversationId, title)))
    throw new AppError(404, "not_found", "Conversation not found");
  const earlier = (await getConversation(d, session.userId, conversationId))?.messages ?? [];
  await addMessage(d, conversationId, "user", message);

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      const gen = respond(session.userId, message, earlier, req.signal);
      try {
        while (true) {
          const step = await gen.next();
          if (step.done) {
            if (step.value.text)
              await addMessage(d, conversationId, "assistant", step.value.text, step.value.engine);
            break;
          }
          send(step.value);
        }
      } catch {
        send({ t: "error", message: "Something went wrong while answering. Please try again." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
});

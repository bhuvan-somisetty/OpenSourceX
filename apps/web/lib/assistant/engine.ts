import type { ModelMessage } from "ai";
import {
  aiAnswersToday,
  loadLfxHistory,
  searchKnowledge,
  type KnowledgeHit,
  type AskEngine,
  type AskMessage,
  type LfxHistory,
} from "@opensourcex/database";
import { db } from "@/lib/data";
import { AI_LIMITS, configuredProviders, streamAnswer } from "./ai";
import { buildKnowledge, type Knowledge } from "./knowledge";
import { liveOfflineAnswer } from "./live-offline";
import { answerOffline } from "./offline";

/** Glue between the chat API and the two engines: knowledge loading, free-tier caps, fallback. */
let lfxCache: { at: number; data: LfxHistory | null } | null = null;
const LFX_TTL_MS = 10 * 60_000;

export async function knowledge(): Promise<Knowledge> {
  if (!lfxCache || Date.now() - lfxCache.at > LFX_TTL_MS) {
    let data: LfxHistory | null;
    try {
      data = await loadLfxHistory(db());
    } catch {
      data = lfxCache?.data ?? null;
    }
    lfxCache = { at: Date.now(), data };
  }
  return buildKnowledge(lfxCache.data);
}

export type ChatEvent =
  | { t: "tool"; name: string }
  | { t: "d"; v: string }
  | { t: "done"; engine: AskEngine; model?: string };

const HISTORY_TURNS = 12;

/** Knowledge-base search that never throws (a missing table or DB outage just means no hits). */
export async function searchGuides(query: string, limit = 6): Promise<KnowledgeHit[]> {
  try {
    return await searchKnowledge(db(), query, { limit });
  } catch {
    return [];
  }
}

export async function* respond(
  userId: string,
  question: string,
  earlier: AskMessage[],
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent, { text: string; engine: AskEngine }> {
  const k = await knowledge();
  const previous = earlier.filter((m) => m.role === "user").map((m) => m.content);
  let providers = configuredProviders();
  let aiNote: string | undefined;
  if (providers.length) {
    const used = await aiAnswersToday(db(), userId).catch(() => ({ user: 0, all: 0 }));
    if (used.user >= AI_LIMITS.perUserPerDay || used.all >= AI_LIMITS.globalPerDay) {
      providers = [];
      aiNote =
        "Today's free AI answers are used up, so this one comes from the offline engine. AI answers come back within 24 hours.";
    }
  }

  if (providers.length) {
    const messages: ModelMessage[] = [
      ...earlier
        .slice(-HISTORY_TURNS)
        .map((m) => ({ role: m.role, content: m.content }) as ModelMessage),
      { role: "user", content: question },
    ];
    let text = "";
    const gen = streamAnswer(providers, messages, k, signal, (q) => searchGuides(q));
    try {
      while (true) {
        const step = await gen.next();
        if (step.done) {
          yield { t: "done", engine: step.value.engine, model: step.value.label };
          return { text, engine: step.value.engine };
        }
        const ev = step.value;
        if (ev.type === "tool") yield { t: "tool", name: ev.name };
        else {
          text += ev.text;
          yield { t: "d", v: ev.text };
        }
      }
    } catch {
      // streamAnswer only throws before any text was written: fall through to offline
    }
  }

  const live = await liveOfflineAnswer(question, k);
  const text = live
    ? aiNote
      ? `${live}\n\n_${aiNote}_`
      : live
    : answerOffline(question, k, { previous, aiNote, guides: await searchGuides(question, 8) });
  yield { t: "d", v: text };
  yield { t: "done", engine: "offline" };
  return { text, engine: "offline" };
}

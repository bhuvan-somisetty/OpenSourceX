import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getConversation,
  listConversations,
  type AskConversation,
  type AskMessage,
} from "@opensourcex/database";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/data";
import { first, type Params } from "@/lib/url";
import { AskChat } from "@/features/ask/AskChat";

export const metadata: Metadata = { title: "Ask" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Ask: a chat about anything open source, with this session's chat history in the sidebar. */
export default async function Ask({
  params,
  searchParams,
}: {
  params: Promise<{ id?: string[] }>;
  searchParams: Promise<Params>;
}) {
  const session = await requireSession();
  const segments = (await params).id ?? [];
  const id = segments[0] ?? null;
  if (segments.length > 1 || (id && !UUID.test(id))) notFound();
  const q = first((await searchParams).q).slice(0, 2000);

  let conversations: AskConversation[] = [];
  let messages: AskMessage[] | null = [];
  let offline = false;
  try {
    conversations = await listConversations(db(), session.userId);
    if (id) messages = (await getConversation(db(), session.userId, id))?.messages ?? null;
  } catch {
    offline = true;
  }
  if (!messages) notFound();

  return (
    <AskChat
      key={id ?? "new"}
      conversationId={id}
      initialMessages={messages.map((m) => ({
        id: String(m.id),
        role: m.role,
        content: m.content,
        engine: m.engine,
      }))}
      conversations={conversations}
      initialQuestion={id ? "" : q}
      historyUnavailable={offline}
    />
  );
}

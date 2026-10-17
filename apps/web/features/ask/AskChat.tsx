"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Markdown } from "./Markdown";

type Engine = string | null;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  engine: Engine;
  pending?: boolean;
  error?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

const TOOL_LABELS: Record<string, string> = {
  findOrganization: "Looking up the organization",
  searchOrganizations: "Searching organizations",
  recurringOrganizations: "Counting organizations that repeat",
  programDetails: "Reading program details",
  listPrograms: "Listing programs",
  lfxMentorshipHistory: "Reading LFX Mentorship history",
};

const engineLabel = (e: Engine) =>
  e === "offline"
    ? "Answered from OpenSourceX data"
    : e
      ? "AI answer, using OpenSourceX data"
      : null;

const SIDEBAR_KEY = "osx-ask-sidebar";

/** ChatGPT-style chat: history sidebar, empty-state composer, streamed answers. */
export function AskChat({
  conversationId,
  initialMessages,
  conversations: initialConversations,
  initialQuestion,
  historyUnavailable,
}: {
  conversationId: string | null;
  initialMessages: ChatMessage[];
  conversations: Conversation[];
  initialQuestion: string;
  historyUnavailable: boolean;
}) {
  const router = useRouter();
  const [id, setId] = useState(conversationId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversations, setConversations] = useState(initialConversations);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stick = useRef(true);
  const autoAsked = useRef(false);

  useEffect(() => setConversations(initialConversations), [initialConversations]);

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_KEY) === "closed") setSidebarOpen(false);
    } catch {
      /* storage blocked: keep the default */
    }
  }, []);

  // Fill the viewport below the app header, whatever its height.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const fit = () =>
      el.style.setProperty(
        "--chat-top",
        `${Math.max(0, el.getBoundingClientRect().top + window.scrollY)}px`,
      );
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const scrollToEnd = useCallback((force = false) => {
    const el = scrollRef.current;
    if (el && (force || stick.current)) el.scrollTop = el.scrollHeight;
  }, []);
  useEffect(() => scrollToEnd(), [messages, status, scrollToEnd]);
  useEffect(() => scrollToEnd(true), [scrollToEnd]);

  const autosize = () => {
    const t = inputRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 220)}px`;
  };
  useEffect(autosize, [input]);
  useEffect(() => inputRef.current?.focus(), []);

  const toggleSidebar = () => {
    setSidebarOpen((o) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, o ? "closed" : "open");
      } catch {
        /* ignore */
      }
      return !o;
    });
  };

  const newChat = () => {
    abortRef.current?.abort();
    setMobileOpen(false);
    if (!id && !messages.length) {
      inputRef.current?.focus();
      return;
    }
    setId(null);
    setMessages([]);
    setInput("");
    setStatus(null);
    router.push("/ask");
  };

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy) return;
      let cid = id;
      if (!cid) {
        cid = crypto.randomUUID();
        setId(cid);
        window.history.replaceState(null, "", `/ask/${cid}`);
      }
      const now = new Date().toISOString();
      setConversations((cs) => {
        const existing = cs.find((c) => c.id === cid);
        const rest = cs.filter((c) => c.id !== cid);
        return [
          existing
            ? { ...existing, updatedAt: now }
            : { id: cid!, title: message.replace(/\s+/g, " ").slice(0, 60), updatedAt: now },
          ...rest,
        ];
      });
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: message,
        engine: null,
      };
      const botId = `a-${Date.now()}`;
      setMessages((m) => [
        ...m,
        userMsg,
        { id: botId, role: "assistant", content: "", engine: null, pending: true },
      ]);
      setInput("");
      setBusy(true);
      setStatus("Thinking");
      stick.current = true;

      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((ms) => ms.map((m) => (m.id === botId ? fn(m) : m)));
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch("/api/v1/ask/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conversationId: cid, message }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const p = await res.json().catch(() => null);
          throw new Error(p?.detail ?? "The answer could not be loaded.");
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            const ev = JSON.parse(line);
            if (ev.t === "tool") setStatus(TOOL_LABELS[ev.name] ?? "Looking things up");
            else if (ev.t === "d") {
              setStatus(null);
              patch((m) => ({ ...m, content: m.content + ev.v }));
            } else if (ev.t === "done") patch((m) => ({ ...m, engine: ev.engine, pending: false }));
            else if (ev.t === "error") throw new Error(ev.message);
          }
        }
        patch((m) => ({ ...m, pending: false }));
      } catch (e) {
        const aborted = ctrl.signal.aborted;
        patch((m) => ({
          ...m,
          pending: false,
          error: !aborted,
          content:
            m.content ||
            (aborted ? "_Stopped._" : e instanceof Error ? e.message : "Something went wrong."),
        }));
      } finally {
        setBusy(false);
        setStatus(null);
        abortRef.current = null;
      }
    },
    [busy, id],
  );

  useEffect(() => {
    if (initialQuestion && !autoAsked.current) {
      autoAsked.current = true;
      void send(initialQuestion);
    }
  }, [initialQuestion, send]);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  };

  const remove = async (cid: string) => {
    setConfirmDelete(null);
    const res = await fetch(`/api/v1/ask/conversations/${cid}`, { method: "DELETE" }).catch(
      () => null,
    );
    if (!res?.ok) return;
    setConversations((cs) => cs.filter((c) => c.id !== cid));
    if (cid === id) {
      setId(null);
      setMessages([]);
      router.push("/ask");
    }
  };

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? conversations.filter((c) => c.title.toLowerCase().includes(f)) : conversations;
  }, [conversations, filter]);

  const copy = (text: string) => navigator.clipboard?.writeText(text).catch(() => undefined);
  const empty = messages.length === 0;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  const composer = (
    <form
      className="chat-composer"
      onSubmit={(e) => {
        e.preventDefault();
        void send(input);
      }}
      data-testid="ask-form"
    >
      <label htmlFor="ask-input" className="skip">
        Ask anything about open source
      </label>
      <textarea
        id="ask-input"
        ref={inputRef}
        rows={1}
        value={input}
        maxLength={2000}
        placeholder="Ask anything about open source"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKey}
        autoComplete="off"
      />
      {busy ? (
        <button
          type="button"
          className="chat-send"
          aria-label="Stop answering"
          onClick={() => abortRef.current?.abort()}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <rect x="2" y="2" width="10" height="10" rx="2" fill="currentColor" />
          </svg>
        </button>
      ) : (
        <button type="submit" className="chat-send" aria-label="Send" disabled={!input.trim()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 19V5M5 12l7-7 7 7"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </form>
  );

  return (
    <div
      ref={rootRef}
      className={`chat${sidebarOpen ? "" : " sidebar-closed"}${mobileOpen ? " mobile-open" : ""}`}
      data-testid="ask-chat"
    >
      <aside className="chat-side" aria-label="Chat history">
        <div className="chat-side-top">
          <button
            type="button"
            className="chat-icon-btn"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path d="M9 4v16" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </button>
          <button
            type="button"
            className="chat-icon-btn mobile-only"
            onClick={() => setMobileOpen(false)}
            aria-label="Close history"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <button
          type="button"
          className="chat-new"
          onClick={newChat}
          data-testid="ask-new-chat"
          title="New chat"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
          <span>New chat</span>
        </button>
        <div className="chat-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="m20 20-3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="search"
            placeholder="Search chats"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Search chats"
          />
        </div>
        <div className="chat-side-label">Recents</div>
        <nav className="chat-list" data-testid="ask-history">
          {historyUnavailable && (
            <p className="chat-side-note">Chat history is unavailable right now.</p>
          )}
          {!historyUnavailable && !shown.length && (
            <p className="chat-side-note">
              {filter ? "No chats match." : "Your chats will appear here."}
            </p>
          )}
          {shown.map((c) => (
            <div key={c.id} className={`chat-item${c.id === id ? " active" : ""}`}>
              {confirmDelete === c.id ? (
                <div className="chat-confirm">
                  <span>Delete this chat?</span>
                  <button type="button" onClick={() => void remove(c.id)} className="danger">
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <Link href={`/ask/${c.id}`} onClick={() => setMobileOpen(false)} title={c.title}>
                    {c.title}
                  </Link>
                  <button
                    type="button"
                    className="chat-item-del"
                    aria-label={`Delete chat ${c.title}`}
                    onClick={() => setConfirmDelete(c.id)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}
        </nav>
      </aside>
      <button
        type="button"
        className="chat-scrim"
        aria-label="Close history"
        onClick={() => setMobileOpen(false)}
        tabIndex={-1}
      />

      <section className="chat-main">
        <div className="chat-topbar">
          <button
            type="button"
            className="chat-icon-btn mobile-only"
            onClick={() => setMobileOpen(true)}
            aria-label="Open chat history"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {!sidebarOpen && (
            <>
              <button
                type="button"
                className="chat-icon-btn desktop-only"
                onClick={toggleSidebar}
                aria-label="Open sidebar"
                title="Open sidebar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="16"
                    rx="3"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path d="M9 4v16" stroke="currentColor" strokeWidth="1.7" />
                </svg>
              </button>
              <button
                type="button"
                className="chat-icon-btn desktop-only"
                onClick={newChat}
                aria-label="New chat"
                title="New chat"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          )}
          <button
            type="button"
            className="chat-icon-btn mobile-only"
            onClick={newChat}
            aria-label="New chat"
            style={{ marginLeft: "auto" }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {empty ? (
          <div className="chat-empty">
            <h1>What do you want to know about open source?</h1>
            {composer}
          </div>
        ) : (
          <>
            <div
              className="chat-scroll"
              ref={scrollRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              }}
            >
              <div className="chat-thread" aria-live="polite" data-testid="ask-thread">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="msg user" data-testid="ask-user-message">
                      <div className="bubble">{m.content}</div>
                    </div>
                  ) : (
                    <div
                      key={m.id}
                      className={`msg bot${m.error ? " error" : ""}`}
                      data-testid="ask-answer"
                      data-engine={m.engine ?? ""}
                    >
                      {m.pending && !m.content ? (
                        <div className="chat-status">
                          <span className="chat-dots" aria-hidden="true">
                            <i />
                            <i />
                            <i />
                          </span>
                          {status ?? "Thinking"}
                        </div>
                      ) : (
                        <>
                          <Markdown text={m.content} />
                          {!m.pending && (
                            <div className="msg-tools">
                              <button
                                type="button"
                                onClick={() => copy(m.content)}
                                aria-label="Copy answer"
                                title="Copy"
                              >
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  aria-hidden="true"
                                >
                                  <rect
                                    x="8"
                                    y="8"
                                    width="12"
                                    height="12"
                                    rx="2.5"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                  />
                                  <path
                                    d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                  />
                                </svg>
                              </button>
                              {m.error && lastUser && (
                                <button
                                  type="button"
                                  onClick={() => void send(lastUser.content)}
                                  title="Try again"
                                >
                                  Retry
                                </button>
                              )}
                              {engineLabel(m.engine) && (
                                <span className="msg-engine">{engineLabel(m.engine)}</span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="chat-bottom">
              {composer}
              <p className="chat-foot">
                Answers can be wrong. Check important details on the linked official sources.
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

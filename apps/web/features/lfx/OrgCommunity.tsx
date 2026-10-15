import type { ChatPlatform, OrgChat, OrgCommunity as Community } from "@/lib/org-community";

const PLATFORM: Record<ChatPlatform, { label: string; verb: string }> = {
  slack: { label: "Slack", verb: "Join Slack" },
  discord: { label: "Discord", verb: "Join Discord" },
  matrix: { label: "Matrix", verb: "Join on Matrix" },
  irc: { label: "IRC", verb: "Open IRC chat" },
};

function PlatformIcon({ platform }: { platform: ChatPlatform }) {
  if (platform === "slack") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path fill="#E01E5A" d="M5.04 15.17a2.52 2.52 0 1 1-2.52-2.52h2.52zm1.27 0a2.52 2.52 0 0 1 5.04 0v6.31a2.52 2.52 0 1 1-5.04 0z" />
        <path fill="#36C5F0" d="M8.83 5.04a2.52 2.52 0 1 1 2.52-2.52v2.52zm0 1.27a2.52 2.52 0 0 1 0 5.04H2.52a2.52 2.52 0 1 1 0-5.04z" />
        <path fill="#2EB67D" d="M18.96 8.83a2.52 2.52 0 1 1 2.52 2.52h-2.52zm-1.27 0a2.52 2.52 0 0 1-5.04 0V2.52a2.52 2.52 0 1 1 5.04 0z" />
        <path fill="#ECB22E" d="M15.17 18.96a2.52 2.52 0 1 1-2.52 2.52v-2.52zm0-1.27a2.52 2.52 0 0 1 0-5.04h6.31a2.52 2.52 0 1 1 0 5.04z" />
      </svg>
    );
  }
  if (platform === "discord") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="#5865F2"
          d="M20.32 4.37A19.8 19.8 0 0 0 15.4 2.85a13.7 13.7 0 0 0-.63 1.29 18.4 18.4 0 0 0-5.53 0 12.6 12.6 0 0 0-.64-1.29 19.7 19.7 0 0 0-4.93 1.52C.53 9.05-.32 13.6.1 18.09a19.9 19.9 0 0 0 6.04 3.05c.49-.66.92-1.36 1.3-2.1a12.9 12.9 0 0 1-2.05-.98l.5-.39a14.2 14.2 0 0 0 12.22 0l.5.39c-.65.39-1.34.72-2.05.99.38.73.81 1.43 1.3 2.09a19.8 19.8 0 0 0 6.04-3.05c.5-5.2-.84-9.71-3.58-13.72zM8.02 15.33c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42 2.17 1.09 2.15 2.42c0 1.33-.95 2.42-2.15 2.42zm7.96 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42 2.17 1.09 2.15 2.42c0 1.33-.94 2.42-2.15 2.42z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M4 5h16v11H9l-5 4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** One sentence on how to reach the project, built only from what the source says. */
function howTo(chat: OrgChat, orgName: string): string {
  const where = chat.channels?.length
    ? `the ${chat.channels.join(" and ")} channel${chat.channels.length > 1 ? "s" : ""}`
    : `the ${orgName} channel`;
  switch (chat.platform) {
    case "slack":
      return `${orgName} contributors and mentors talk in ${where} on the ${chat.workspace} workspace. Join the workspace first, then open the channel to ask questions and follow mentorship updates.`;
    case "discord":
      return `${orgName} runs a Discord server, ${chat.workspace}. Accept the invite to chat with maintainers and other contributors.`;
    case "matrix":
      return `${orgName} developers chat on Matrix in ${where}. Any Matrix client works, including the web client.`;
    case "irc":
      return `${orgName} developers chat on ${chat.workspace} in ${where}. The link opens a web client, no install needed.`;
  }
}

function prettySource(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/#readme$/, "").replace("/blob/HEAD/", " › ");
}

export function OrgCommunity({ community, orgName }: { community: Community; orgName: string }) {
  const { chats } = community;
  return (
    <section className="block org-community" aria-labelledby="org-community-h" data-testid="org-community">
      <div className="section-head">
        <h2 id="org-community-h">Community</h2>
        <span className="dim">Where {orgName} talks</span>
      </div>

      {chats.length === 0 ? (
        <div className="card org-chat org-chat-none">
          <p style={{ margin: 0 }}>
            {orgName} does not list a public Slack or Discord channel in its repository. The best
            place to reach maintainers is the issue tracker on the repository.
          </p>
          <div className="actions" style={{ marginTop: 14 }}>
            <a className="btn" href={`${community.repoUrl}/issues`} target="_blank" rel="noreferrer noopener">
              Open issues ↗
            </a>
          </div>
        </div>
      ) : (
        <div className="org-chat-grid">
          {chats.map((chat, i) => {
            const p = PLATFORM[chat.platform];
            return (
              <article key={i} className={`card org-chat chat-${chat.platform}`}>
                <div className="org-chat-top">
                  <span className="org-chat-icon">
                    <PlatformIcon platform={chat.platform} />
                  </span>
                  <div className="org-chat-title">
                    <strong>{chat.workspace}</strong>
                    <span className="dim">{p.label}</span>
                  </div>
                </div>
                {chat.channels?.length ? (
                  <div className="chips" style={{ marginTop: 12 }}>
                    {chat.channels.map((c) => (
                      <span key={c} className="pill org-chat-channel">
                        {c}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="org-chat-desc">{howTo(chat, orgName)}</p>
                <div className="actions">
                  <a
                    className="btn primary"
                    href={chat.joinUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    data-testid="org-chat-join"
                  >
                    {p.verb} ↗
                  </a>
                  {chat.channelUrl && (
                    <a className="btn" href={chat.channelUrl} target="_blank" rel="noreferrer noopener">
                      {chat.channels?.length === 1 ? `Open ${chat.channels[0]}` : "Open channel"} ↗
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="dim org-community-src">
        Source:{" "}
        <a href={community.source} target="_blank" rel="noreferrer noopener">
          {prettySource(community.source)}
        </a>
      </p>
    </section>
  );
}

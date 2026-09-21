"use client";

import Link from "next/link";
import { useState } from "react";
import { Notice } from "@/components/feedback/Notice";
import { StatusChip } from "@/components/status/StatusChip";

export interface InterviewContext {
  id: string;
  name: string;
  summary: string | null;
  technologies: string[];
  repoUrl: string | null;
  mentors: string[];
}

const QUESTIONS = [
  {
    id: "basics",
    category: "Project basics",
    text: "What problem does this project solve, and for whom?",
  },
  {
    id: "tech",
    category: "Technology",
    text: "Which technologies does this project use, and why might it use them?",
  },
  {
    id: "contrib",
    category: "Contribution",
    text: "Where would you look first to start contributing, and what would you need to understand?",
  },
] as const;

export function InterviewSession({ ctx }: { ctx: InterviewContext }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const q = QUESTIONS[i]!;
  const answer = answers[q.id] ?? "";
  const done = submitted[q.id];
  const mentioned = ctx.technologies.filter((t) => answer.toLowerCase().includes(t.toLowerCase()));
  const missed = ctx.technologies.filter((t) => !answer.toLowerCase().includes(t.toLowerCase()));

  return (
    <div className="card fade" style={{ marginTop: 16 }} data-testid="interview-session">
      <div className="chips" style={{ marginBottom: 8 }}>
        <span className="tag">
          Question {i + 1} of {QUESTIONS.length}
        </span>
        <span className="tag">{q.category}</span>
        <StatusChip status="DEVELOPMENT" label="Development version" />
      </div>
      <h2 style={{ fontSize: 20 }}>{ctx.name}</h2>
      <p style={{ fontSize: 18, margin: "8px 0 12px" }} data-testid="question">
        {q.text}
      </p>
      <div className="field">
        <label htmlFor="answer">Your answer</label>
        <textarea
          id="answer"
          value={answer}
          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
          disabled={done}
          maxLength={4000}
          aria-describedby="ans-hint"
        />
        <span id="ans-hint" className="hint">
          Up to 4,000 characters. Answers are not sent anywhere in this build.
        </span>
      </div>
      {!done ? (
        <div className="actions">
          <button
            className="btn primary"
            type="button"
            onClick={() => setSubmitted({ ...submitted, [q.id]: true })}
            disabled={answer.trim().length < 10}
          >
            Submit answer
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 16, display: "grid", gap: 12 }} data-testid="feedback">
          <Notice kind="dev">
            <strong>Development feedback, not AI evaluation.</strong> It only compares your answer
            with recorded facts.
          </Notice>
          <div className="card">
            <h3>Recorded facts for this project</h3>
            <dl className="kv">
              {q.id === "basics" && (
                <>
                  <dt>Summary</dt>
                  <dd>{ctx.summary ?? "Not recorded"}</dd>
                </>
              )}
              {q.id === "tech" && (
                <>
                  <dt>Technologies</dt>
                  <dd>{ctx.technologies.length ? ctx.technologies.join(", ") : "Not recorded"}</dd>
                </>
              )}
              {q.id === "contrib" && (
                <>
                  <dt>Repository</dt>
                  <dd>
                    {ctx.repoUrl ? (
                      <a href={ctx.repoUrl} target="_blank" rel="noreferrer noopener">
                        {ctx.repoUrl}
                      </a>
                    ) : (
                      "Not verified"
                    )}
                  </dd>
                </>
              )}
              <dt>Mentors (recorded)</dt>
              <dd>{ctx.mentors.length ? ctx.mentors.join(", ") : "Not verified"}</dd>
            </dl>
            {q.id === "tech" && (
              <ul className="crit">
                <li>
                  <span className="c-ok" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    You mentioned:{" "}
                    {mentioned.length ? mentioned.join(", ") : "none of the recorded technologies"}
                  </span>
                </li>
                <li>
                  <span className="c-unk" aria-hidden="true">
                    ?
                  </span>
                  <span>
                    Not mentioned: {missed.length ? missed.join(", ") : "nothing missing"}
                  </span>
                </li>
              </ul>
            )}
            <p className="hint">
              Source: recorded snapshot.{" "}
              <Link href={`/projects/${ctx.id}`}>Open the project and its sources</Link>.
            </p>
          </div>
          <div className="actions">
            {i < QUESTIONS.length - 1 ? (
              <button className="btn primary" type="button" onClick={() => setI(i + 1)}>
                Next question
              </button>
            ) : (
              <Link className="btn primary" href={`/projects/${ctx.id}`}>
                Review the project
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

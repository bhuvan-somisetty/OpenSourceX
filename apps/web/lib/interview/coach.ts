/**
 * Interview coach: question banks, answer scoring and the final report. Everything here is pure
 * and runs without AI, so practice still works when no provider is configured or the free daily
 * AI answers are used up. The AI interviewer (./ai.ts) returns the same shapes.
 */

export const MODES = {
  understanding: {
    label: "Project understanding",
    blurb: "What it solves, who uses it, how it fits together.",
  },
  contribution: {
    label: "Contribution",
    blurb: "How you would start, plan and land your first changes.",
  },
  pr: { label: "PR review", blurb: "Walk a reviewer through a change, handle feedback." },
  technical: { label: "Technical", blurb: "The stack, trade-offs and debugging under pressure." },
  architecture: { label: "Architecture", blurb: "Components, data flow, scaling and failure." },
} as const;
export type Mode = keyof typeof MODES;
export const MODE_KEYS = Object.keys(MODES) as Mode[];

export const LEVELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
} as const;
export type Level = keyof typeof LEVELS;

export const DIMENSIONS = {
  relevance: "Answers the question",
  knowledge: "Project knowledge",
  depth: "Technical depth",
  structure: "Structure",
  clarity: "Clarity",
} as const;
export type Dimension = keyof typeof DIMENSIONS;
export type Scores = Record<Dimension, number>;

export interface InterviewProject {
  id: string;
  name: string;
  org: string | null;
  program: string;
  summary: string | null;
  technologies: string[];
  repoUrl: string | null;
  mentors: string[];
}

export interface Question {
  id: string;
  text: string;
  /** What a strong answer covers; shown after the answer, never before. */
  lookFor: string[];
  followUp?: boolean;
  /** which interview type it came from */
  mode?: Mode;
}

export interface Delivery {
  /** false when the answer was typed: no pace or talk time then */
  spoken: boolean;
  words: number;
  seconds: number;
  wpm: number | null;
  fillers: { word: string; count: number }[];
  fillerCount: number;
}

export interface Feedback {
  scores: Scores;
  /** 0-100 */
  overall: number;
  /** One or two sentences the interviewer says out loud. */
  spoken: string;
  strengths: string[];
  improve: string[];
  /** Outline of a stronger answer. */
  stronger: string[];
  /** the answer said nothing scoreable */
  empty?: boolean;
}

export interface Turn {
  question: Question;
  answer: string;
  seconds: number;
  feedback: Feedback;
  delivery: Delivery;
}

export interface FocusArea {
  dimension: Dimension;
  title: string;
  why: string;
  actions: string[];
}

export interface Report {
  overall: number;
  verdict: string;
  scores: Scores;
  summary: string;
  focus: FocusArea[];
  delivery: {
    wpm: number | null;
    fillerCount: number;
    topFillers: string[];
    talkSeconds: number;
    /** how many answers were spoken rather than typed */
    spokenAnswers: number;
  };
  /** answers that said nothing ("I don't know", one word, skipped) */
  emptyAnswers: number;
  /** One model answer per question, in order, written by the AI interviewer from the project's facts. */
  models?: { text: string; by: "ai" }[];
}

/**
 * Recorded skills are sometimes sentences ("familiarity with Golang, some knowledge about the K8s
 * architecture"). Keep short technology names only, so questions read naturally.
 */
const ALIASES: Record<string, string> = {
  golang: "Go",
  go: "Go",
  k8s: "Kubernetes",
  kubernetes: "Kubernetes",
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  py: "Python",
  python: "Python",
  rust: "Rust",
  rustlang: "Rust",
};

export function tidyTechnologies(list: string[], max = 6): string[] {
  const out: string[] = [];
  for (const raw of list.flatMap((t) => t.split(/[,;/]| and /))) {
    const t = raw
      .replace(/\(.*?\)/g, "")
      .replace(
        /^\s*[-*]?\s*(basic |some |good |strong )?(familiarity with|knowledge (of|about)|experience (with|in)|proficiency in|understanding of|skills? in)\s+(the\s+)?/i,
        "",
      )
      .replace(/\s+(is|are) (essential|required|a plus|preferred|nice to have).*$/i, "")
      .replace(/\s+architecture$/i, "")
      .trim();
    if (!t || t.length > 24 || t.split(/\s+/).length > 3 || /^(some|basic|good)\b/i.test(t))
      continue;
    const name = ALIASES[t.toLowerCase()] ?? t;
    if (!out.some((o) => o.toLowerCase() === name.toLowerCase())) out.push(name);
    if (out.length >= max) break;
  }
  return out;
}

/** Long idea titles read badly inside a spoken question; refer to them more briefly. */
/** How the interviewer says the subject out loud: a repository is its name, not "owner/name". */
export function spokenName(p: InterviewProject): string {
  const repo = p.name.match(/^[\w.-]+\/([\w.-]+)$/);
  if (repo) return repo[1]!.replace(/[-_.]+/g, " ");
  if (p.name.length <= 40) return p.name;
  return p.org ? `this ${p.org} project` : "this project";
}

const techList = (p: InterviewProject, n = 3) =>
  p.technologies.length ? p.technologies.slice(0, n).join(", ") : "its main language";
const tech1 = (p: InterviewProject) => p.technologies[0] ?? "the main language";

type Bank = ((p: InterviewProject) => Omit<Question, "id">)[];

const BANKS: Record<Mode, Bank> = {
  understanding: [
    (p) => ({
      text: `In your own words, what problem does ${p.name} solve, and who is it for?`,
      lookFor: ["the problem in one sentence", "who has it", "what changes once it is solved"],
    }),
    (p) => ({
      text: `${p.name} uses ${techList(p)}. Why do you think the project chose them?`,
      lookFor: ["each technology's role", "a trade-off it brings", "how they connect"],
    }),
    (p) => ({
      text: `Describe how a user or another system interacts with ${p.name}, step by step.`,
      lookFor: ["the entry point", "the main steps in order", "what the user gets back"],
    }),
    (p) => ({
      text: `What would break, or get harder, for people if ${p.name} did not exist?`,
      lookFor: ["the manual alternative", "a concrete pain point", "who feels it most"],
    }),
    (p) => ({
      text: `If you had to explain ${p.name} to a new contributor in two minutes, what would you cover first?`,
      lookFor: ["purpose first", "the main parts", "where to look in the repository"],
    }),
    (p) => ({
      text: `What do you think is the hardest part of building ${p.name} well?`,
      lookFor: ["a specific hard problem", "why it is hard", "how the project might handle it"],
    }),
    (p) => ({
      text: `Who are the main users of ${p.name}, and what does a normal day of using it look like for them?`,
      lookFor: ["a concrete user", "their workflow", "where the project fits in it"],
    }),
    (p) => ({
      text: `How is ${p.name} different from the alternatives people could use instead?`,
      lookFor: ["at least one alternative", "a real difference", "when the alternative is better"],
    }),
    (p) => ({
      text: `What does success look like for ${p.name} at the end of the mentorship?`,
      lookFor: ["a measurable outcome", "who benefits", "how you would show it"],
    }),
    (p) => ({
      text: `Why did you choose ${p.name} over other projects?`,
      lookFor: ["a genuine reason", "a link to your skills", "what you want to learn"],
    }),
  ],
  contribution: [
    (p) => ({
      text: `You've just been selected for ${p.name}. What do you do in your first week?`,
      lookFor: ["build and run it locally", "talk to mentors early", "a small first change"],
    }),
    (p) => ({
      text: `Walk me through how you'd find a good first issue in ${p.org ?? p.name} and claim it.`,
      lookFor: ["labels or the issue tracker", "asking before starting", "reading related code"],
    }),
    (p) => ({
      text: `Break ${p.name} into milestones: what would you deliver first, and why?`,
      lookFor: ["small, testable milestones", "the riskiest part early", "a buffer for review"],
    }),
    () => ({
      text: "Tell me about a pull request you opened. What did it change, and what did you learn from the review?",
      lookFor: ["what and why", "the feedback you got", "what you changed because of it"],
    }),
    () => ({
      text: "You're stuck on a bug for two days. What do you do?",
      lookFor: ["how you narrowed it down", "when and how you ask for help", "what you share"],
    }),
    (p) => ({
      text: `How will you keep your mentors updated during the ${p.program} term?`,
      lookFor: ["a regular cadence", "written updates", "raising blockers early"],
    }),
    () => ({
      text: "How do you set up the project locally, and what do you do when the setup guide doesn't work?",
      lookFor: ["follow the docs", "read the error carefully", "fix or report the docs"],
    }),
    () => ({
      text: "You disagree with how a maintainer wants something done. How do you handle it?",
      lookFor: ["ask why", "share evidence politely", "respect the decision"],
    }),
    (p) => ({
      text: `What have you already contributed to ${p.org ?? "this project"} or similar projects?`,
      lookFor: ["specific PRs or issues", "what you learned", "what it shows about you"],
    }),
    () => ({
      text: "Your milestone is running late. What do you do?",
      lookFor: ["tell mentors early", "re-plan scope", "protect quality"],
    }),
  ],
  pr: [
    () => ({
      text: "Pick a change you'd make to this project. Walk me through the pull request as if I'm the reviewer.",
      lookFor: ["the problem it fixes", "the approach and alternatives", "how it was tested"],
    }),
    () => ({
      text: "A maintainer asks you to split your large PR into smaller ones. How do you respond and how do you split it?",
      lookFor: ["agreeing without defensiveness", "a logical split", "keeping each PR green"],
    }),
    () => ({
      text: "A reviewer disagrees with your approach. What do you do?",
      lookFor: ["understand their reason", "evidence, not opinion", "accept the project's call"],
    }),
    (p) => ({
      text: `What tests would you add with a change to ${p.name}, and how would you show the reviewer it works?`,
      lookFor: ["unit and integration tests", "edge cases", "screenshots, logs or benchmarks"],
    }),
    () => ({
      text: "What makes a pull request description good?",
      lookFor: ["linked issue", "what and why", "how to test", "small focused diff"],
    }),
    () => ({
      text: "CI fails on your PR in a test you didn't touch. What do you do?",
      lookFor: ["read the log", "reproduce locally", "check main", "flag a flaky test"],
    }),
    () => ({
      text: "How do you review someone else's pull request?",
      lookFor: ["understand the goal", "run it", "kind, specific comments"],
    }),
    () => ({
      text: "Your PR has had no review for two weeks. What do you do?",
      lookFor: ["polite follow-up", "the right channel", "keep it up to date"],
    }),
    () => ({
      text: "How do you write commit messages, and why does it matter?",
      lookFor: ["clear summary line", "the why", "project conventions such as DCO"],
    }),
    () => ({
      text: "A reviewer leaves twenty comments on your PR. How do you work through them?",
      lookFor: ["read all first", "ask about unclear ones", "reply to each", "push focused fixes"],
    }),
  ],
  technical: [
    (p) => ({
      text: `Explain one core concept of ${tech1(p)} that matters for ${p.name}.`,
      lookFor: ["the concept clearly", "why it matters here", "a concrete example"],
    }),
    (p) => ({
      text: `How would you debug a failure in ${p.name} that only happens in production?`,
      lookFor: ["logs and metrics", "reproducing it", "narrowing down", "a safe fix"],
    }),
    (p) => ({
      text: `What trade-offs come with using ${techList(p, 2)} for this kind of project?`,
      lookFor: ["at least one real downside", "when it is worth it", "an alternative"],
    }),
    () => ({
      text: "How do you make sure your code is correct before a reviewer sees it?",
      lookFor: ["tests", "linters and type checks", "running it for real", "self-review"],
    }),
    (p) => ({
      text: `What could slow ${p.name} down as usage grows, and how would you measure it?`,
      lookFor: ["a likely bottleneck", "how to measure", "one way to improve it"],
    }),
    () => ({
      text: "Explain a technical decision you made recently and what you'd change now.",
      lookFor: ["the context", "the options", "the outcome", "what you learned"],
    }),
    (p) => ({
      text: `How does error handling usually work in ${tech1(p)}, and what would you watch for in ${p.name}?`,
      lookFor: ["the language's approach", "a common mistake", "how to test it"],
    }),
    (p) => ({
      text: `How would you write tests for a new feature in ${p.name}?`,
      lookFor: ["unit tests", "integration or end-to-end tests", "edge cases"],
    }),
    () => ({
      text: "What does concurrency mean to you, and where can it go wrong?",
      lookFor: ["a clear definition", "a race or deadlock example", "how to prevent it"],
    }),
    () => ({
      text: "How do you learn a large codebase you've never seen before?",
      lookFor: ["start from the entry point", "run and debug it", "read tests and docs"],
    }),
  ],
  architecture: [
    (p) => ({
      text: `Sketch the main components of ${p.name} and how data moves between them.`,
      lookFor: ["three to five components", "the direction of data", "where state lives"],
    }),
    (p) => ({
      text: `Where are the boundaries in ${p.name}: what is core, and what is pluggable or optional?`,
      lookFor: ["core vs extension", "interfaces between them", "why that split helps"],
    }),
    () => ({
      text: "What happens when one component fails? How should the system behave?",
      lookFor: ["failure detection", "retries or fallbacks", "what the user sees"],
    }),
    (p) => ({
      text: `If ${p.name} had ten times more users tomorrow, what would you change first?`,
      lookFor: ["the first bottleneck", "a concrete change", "how you'd verify it"],
    }),
    () => ({
      text: "How would you add a new feature without breaking existing users?",
      lookFor: ["backward compatibility", "feature flags or versioning", "migration path"],
    }),
    () => ({
      text: "Which part of this design would you test most carefully, and how?",
      lookFor: ["the riskiest part", "test types", "how to keep tests fast"],
    }),
    (p) => ({
      text: `Where does ${p.name} keep its state or data, and why there?`,
      lookFor: ["the storage", "the reason", "what happens on restart"],
    }),
    () => ({
      text: "How would you make this system observable in production?",
      lookFor: ["logs", "metrics", "traces or alerts"],
    }),
    (p) => ({
      text: `What security risks should ${p.name} think about?`,
      lookFor: ["a concrete risk", "who could exploit it", "a mitigation"],
    }),
    (p) => ({
      text: `If you could redesign one part of ${p.name}, which would it be and why?`,
      lookFor: ["a specific part", "the problem with it now", "the trade-off of changing it"],
    }),
  ],
};

const OPENERS: Record<Level, string> = {
  beginner: "Take your time and think out loud.",
  intermediate: "Be specific where you can.",
  advanced: "I'll push for depth and trade-offs.",
};

export const modesLabel = (modes: Mode[]) =>
  modes.length === MODE_KEYS.length
    ? "everything"
    : modes.map((m) => MODES[m].label.toLowerCase()).join(", ");

export function opening(
  p: InterviewProject,
  modes: Mode[],
  level: Level,
  total: number,
  /** the interviewer's name, when a voice reads the interview */
  name?: string,
): string {
  const hi = name
    ? `Hi, I'm ${name}, and I'll be your interviewer today.`
    : "Hi, I'll be your interviewer today.";
  return `${hi} We'll do ${total} questions on ${spokenName(p)}, covering ${modesLabel(modes)}. ${OPENERS[level]}`;
}

/** Most questions one session can have without repeats. */
export const maxQuestions = (modes: Mode[]) => modes.reduce((n, m) => n + BANKS[m].length, 0);

/**
 * Deterministic question list for a session, taking turns across the chosen modes; `seed`
 * rotates it so repeats feel fresh.
 */
export function offlineQuestions(
  p: InterviewProject,
  modes: Mode | Mode[],
  count: number,
  seed = 0,
): Question[] {
  const list = (Array.isArray(modes) ? modes : [modes]).filter((m) => BANKS[m]);
  if (!list.length) return [];
  const named = { ...p, name: spokenName(p) };
  const out: Question[] = [];
  const total = Math.min(count, maxQuestions(list));
  for (let i = 0; out.length < total; i++) {
    const mode = list[(i + seed) % list.length]!;
    const bank = BANKS[mode];
    const round = Math.floor(i / list.length);
    if (round >= bank.length) continue;
    const idx = (round + seed) % bank.length;
    out.push({ id: `${mode}-${idx}`, mode, ...bank[idx]!(named) });
  }
  return out;
}

const FILLERS = [
  "um",
  "uh",
  "erm",
  "like",
  "basically",
  "actually",
  "literally",
  "you know",
  "i mean",
  "kind of",
  "sort of",
  "so yeah",
];

export function analyzeDelivery(answer: string, seconds: number, spoken = true): Delivery {
  const text = ` ${answer.toLowerCase().replace(/[^a-z0-9' ]+/g, " ")} `;
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const fillers = FILLERS.map((word) => ({
    word,
    count: text.split(` ${word} `).length - 1,
  })).filter((f) => f.count > 0);
  return {
    spoken,
    words,
    seconds,
    wpm: spoken && seconds >= 5 && words >= 5 ? Math.round((words / seconds) * 60) : null,
    fillers,
    fillerCount: fillers.reduce((s, f) => s + f.count, 0),
  };
}

const STOP = new Set(
  "a an and are as at be but by can do does for from has have how i if in into is it its of on or that the their them then there these they this to was we what when where which who why will with would you your about".split(
    " ",
  ),
);
const terms = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );

const STRUCTURE =
  /\b(first|second|then|next|finally|because|so that|for example|for instance|which means|as a result|the reason)\b/g;
const SPECIFIC =
  /\b(\d+|test(s|ing)?|benchmark|log(s|ging)?|metric(s)?|api|function|module|package|config|issue|commit|pull request|pr|ci|error|cache|database|queue|interface|controller|endpoint|schema|cli|command|flag|manifests?|pods?|cluster|container|script|file|version|release|branch|repo|repository|docs)\b/g;

const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));

/** 0-100 from the five 1-10 scores; answering the question counts most. */
export function weighted(s: Scores): number {
  return (
    ((s.relevance * 0.3 +
      s.knowledge * 0.2 +
      s.depth * 0.2 +
      s.structure * 0.15 +
      s.clarity * 0.15) /
      10) *
    100
  );
}

const NON_ANSWER =
  /^(sorry,?\s*)?(i\s*)?(idk|dunno|don'?t know|do not know|dont kn[ow]+|have no idea|no idea|not sure|no clue|forgot|can'?t say|can'?t remember|pass|skip|next|nothing|none|no|nope|yes|ok(ay)?|maybe|hm+|um+|uh+|n\/?a|\?+|\.+)(\s+(anything|really|much|about (it|this|that)|sorry))*[.!?\s]*$/i;

/** "idk", "I don't know", a single word or only fillers: there is nothing to score. */
export function isNonAnswer(answer: string): boolean {
  const t = answer.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return true;
  if (NON_ANSWER.test(t)) return true;
  const words = t.split(" ").filter((w) => /[a-z0-9]/.test(w));
  const meaningful = words.filter((w) => !STOP.has(w.replace(/[^a-z']/g, "")) && w.length > 2);
  return words.length < 4 || meaningful.length < 2;
}

const ZERO: Scores = { relevance: 0, knowledge: 0, depth: 0, structure: 0, clarity: 0 };

/** Feedback for an answer that said nothing: zero, and a kind push to try. */
export function emptyFeedback(q: Question): Feedback {
  return {
    scores: { ...ZERO },
    overall: 0,
    empty: true,
    spoken:
      "No answer there. That's okay, it happens in real interviews too. Next time, say what you do know and how you would find out the rest.",
    strengths: [],
    improve: [
      "Never stop at \"I don't know\": say what you do know, then how you'd find the answer (docs, code, asking mentors).",
      `This question wanted: ${q.lookFor.join(", ")}.`,
    ],
    stronger: [
      `Open with a one-line direct answer to: "${q.text}"`,
      ...q.lookFor.map((l) => l[0]!.toUpperCase() + l.slice(1)),
      "If you're unsure, say how you'd find out.",
    ],
  };
}

export function scoreOffline(
  p: InterviewProject,
  q: Question,
  answer: string,
  d: Delivery,
): Feedback {
  if (isNonAnswer(answer)) return emptyFeedback(q);
  const lower = answer.toLowerCase();
  const ans = terms(answer);
  const want = new Set([...terms(q.text), ...q.lookFor.flatMap((l) => [...terms(l)])]);
  const overlap = [...want].filter((w) => ans.has(w)).length;
  const facts = terms(`${p.summary ?? ""} ${p.name}`);
  const factHits = [...facts].filter((w) => ans.has(w)).length;
  const techHits = p.technologies.filter((t) => lower.includes(t.toLowerCase()));
  const connectors = lower.match(STRUCTURE)?.length ?? 0;
  const specifics = lower.match(SPECIFIC)?.length ?? 0;
  const sentences = answer.split(/[.!?]+/).filter((s) => s.trim()).length || 1;
  const avgSentence = d.words / sentences;
  const fillerRate = d.words ? d.fillerCount / d.words : 0;
  const lengthScore =
    d.words < 15 ? 2 : d.words < 40 ? 5 : d.words < 80 ? 7 : d.words <= 260 ? 8 : 6;

  const scores: Scores = {
    relevance: clamp(2 + overlap * 1.4 + (d.words >= 25 ? 1.5 : 0)),
    knowledge: clamp(2 + factHits * 1.2 + techHits.length * 1.5),
    depth: clamp(lengthScore * 0.6 + specifics * 0.9 + techHits.length * 0.5),
    structure: clamp(3 + connectors * 1.3 + (sentences >= 3 ? 1.5 : 0)),
    clarity: clamp(9 - fillerRate * 60 - (avgSentence > 35 ? 2 : 0) - (d.words < 15 ? 3 : 0)),
  };
  // a short answer can't be a strong one, however well it is phrased
  const overall = Math.round(weighted(scores) * Math.min(1, 0.35 + (0.65 * d.words) / 40));

  const strengths: string[] = [];
  const improve: string[] = [];
  if (scores.relevance >= 7) strengths.push("You stayed on the question.");
  if (techHits.length) strengths.push(`You named the stack: ${techHits.join(", ")}.`);
  if (scores.structure >= 7) strengths.push("Your answer had a clear order.");
  if (specifics >= 3) strengths.push("You used concrete details, not just general ideas.");
  if (scores.clarity >= 8 && d.words >= 25)
    strengths.push(d.spoken ? "Clear delivery with few filler words." : "Clear, readable answer.");
  if (d.words < 25) improve.push("Say more: aim for 45 to 90 seconds with one concrete example.");
  if (scores.relevance < 6)
    improve.push(
      `Answer the question directly in your first sentence, then cover: ${q.lookFor.join(", ")}.`,
    );
  if (!techHits.length && p.technologies.length)
    improve.push(`Tie it to the project's stack (${techList(p)}).`);
  if (scores.structure < 6)
    improve.push(
      'Give it a shape: "First... then... as a result..." or situation, action, result.',
    );
  if (specifics < 2)
    improve.push("Add a specific: a file, a command, a number, a test or an error.");
  if (d.fillerCount >= 3)
    improve.push(
      `Cut fillers (${d.fillers.map((f) => `"${f.word}" ×${f.count}`).join(", ")}): pause silently instead.`,
    );
  if (!strengths.length) strengths.push("You made an attempt, which is how this gets easier.");

  const spoken =
    overall >= 75
      ? `Strong answer. ${strengths[0]}`
      : overall >= 55
        ? `Decent start. ${improve[0] ?? "Add one more concrete detail next time."}`
        : `Let's tighten that. ${improve[0] ?? "Answer more directly."}`;

  return {
    scores,
    overall,
    spoken,
    strengths: strengths.slice(0, 3),
    improve: improve.slice(0, 3),
    stronger: [
      `Open with a one-line direct answer to: "${q.text}"`,
      ...q.lookFor.map((l) => l[0]!.toUpperCase() + l.slice(1)),
      "Close with what you'd do next, or what you learned.",
    ],
  };
}

const FOCUS: Record<Dimension, { title: string; actions: (p: InterviewProject) => string[] }> = {
  relevance: {
    title: "Answer the question that was asked",
    actions: () => [
      "Repeat the question in your head, then answer it in your first sentence.",
      "Stop once you have covered it; extra topics dilute a good answer.",
    ],
  },
  knowledge: {
    title: "Know the project cold",
    actions: (p) => [
      "Read the project idea and the repository README again, and write the project's purpose in one sentence.",
      p.repoUrl
        ? "Run the Analyze page on its repository to learn the structure, activity and good first issues."
        : "Find its repository and skim the top-level folders.",
      p.mentors.length
        ? `Read recent issues and PRs by the mentors (${p.mentors.slice(0, 2).join(", ")}).`
        : "Read the last few merged pull requests to see how the team works.",
    ],
  },
  depth: {
    title: "Go one level deeper",
    actions: (p) => [
      `For each of ${techList(p)}, prepare one sentence on what it does in this project.`,
      "Bring one concrete example per answer: a file, a command, an error, a test or a number.",
      "Practice the Technical and Architecture modes.",
    ],
  },
  structure: {
    title: "Give answers a shape",
    actions: () => [
      "Use situation, action, result for experience questions.",
      'Signpost: "There are three parts. First..."',
      "End with the outcome or what you learned.",
    ],
  },
  clarity: {
    title: "Speak clearly and calmly",
    actions: () => [
      "Replace fillers with a short silent pause.",
      "Aim for about 120 to 160 words a minute, with short sentences.",
      "Record one answer and listen back once.",
    ],
  },
};

export function averageScores(turns: { feedback: Feedback }[]): Scores {
  const out = {} as Scores;
  for (const k of Object.keys(DIMENSIONS) as Dimension[]) {
    out[k] = turns.length
      ? Math.round((turns.reduce((s, t) => s + t.feedback.scores[k], 0) / turns.length) * 10) / 10
      : 0;
  }
  return out;
}

export function verdictFor(overall: number): string {
  if (overall < 10) return "No real answers yet";
  if (overall >= 85) return "Interview ready";
  if (overall >= 70) return "Almost there";
  if (overall >= 55) return "Getting there";
  return "Keep practicing";
}

export function offlineReport(p: InterviewProject, turns: Turn[]): Report {
  const scores = averageScores(turns);
  const overall = turns.length
    ? Math.round(turns.reduce((s, t) => s + t.feedback.overall, 0) / turns.length)
    : 0;
  const ranked = (Object.keys(scores) as Dimension[]).sort((a, b) => scores[a] - scores[b]);
  const best = ranked[ranked.length - 1]!;
  const focus = ranked
    .filter((k) => scores[k] < 8)
    .slice(0, 3)
    .map((k) => ({
      dimension: k,
      title: FOCUS[k].title,
      why: `Your average for ${DIMENSIONS[k].toLowerCase()} was ${scores[k]}/10.`,
      actions: FOCUS[k].actions(p),
    }));
  const spoken = turns.filter((t) => t.delivery.spoken && !t.feedback.empty);
  const empty = turns.filter((t) => t.feedback.empty).length;
  const talk = spoken.reduce((s, t) => s + t.delivery.seconds, 0);
  const words = spoken.reduce((s, t) => s + t.delivery.words, 0);
  const fillerTotals = new Map<string, number>();
  for (const t of turns)
    for (const f of t.delivery.fillers)
      fillerTotals.set(f.word, (fillerTotals.get(f.word) ?? 0) + f.count);
  return {
    overall,
    verdict: verdictFor(overall),
    scores,
    summary: !turns.length
      ? "No answers were recorded."
      : empty === turns.length
        ? "You didn't answer any question yet, so there is nothing to score. Try again and say whatever you know, even a little: interviewers reward honest reasoning far more than silence."
        : `${empty ? `${empty} of ${turns.length} answers were empty. ` : ""}${scores[best] >= 6 ? `Your strongest area was ${DIMENSIONS[best].toLowerCase()} (${scores[best]}/10). ` : ""}${
            focus.length
              ? `Focus next on: ${focus.map((f) => f.title.toLowerCase()).join("; ")}.`
              : "Every area scored 8 or more: try a harder level or another mode."
          }`,
    focus,
    delivery: {
      wpm: talk >= 10 && words >= 20 ? Math.round((words / talk) * 60) : null,
      fillerCount: [...fillerTotals.values()].reduce((s, n) => s + n, 0),
      topFillers: [...fillerTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([w, n]) => `"${w}" ×${n}`),
      talkSeconds: talk,
      spokenAnswers: spoken.length,
    },
    emptyAnswers: empty,
  };
}

# AI Architecture

## Role

AI explains, questions and evaluates. It is not a source of facts. Facts
come from the database with provenance.

## Pipeline

1. **Retrieve** facts and text chunks for the question (structured queries
   first; text search over docs; vectors only if justified, D-005).
2. **Assemble** context as numbered evidence items `[E1]...`, each with
   source, tier, date. Untrusted text is wrapped and marked as data.
3. **Generate** structured output (JSON schema): `answer`, `claims[]` each
   with `evidence_ids[]` and `type` (fact|inference), `confidence`,
   `unknowns[]`.
4. **Validate** in code: schema valid; every fact-claim cites existing
   evidence ids; no URLs not in evidence; otherwise reject or downgrade to
   "unsupported" and regenerate once, then fall back to plain evidence.
5. **Render** with evidence list, confidence and last verified date.

## Trust boundaries

Trusted: system prompt, schemas. Untrusted: README, issues, PR comments,
code, commit messages, websites, and user answers. Untrusted text is
delimited, never placed in the system role, and the model has no tools that
act on the outside world. Instructions inside repo text are treated as
content ("this README contains an instruction"), not obeyed. Output is
validated by code, not by the model.

## Interview evaluation

The user answers first. Evaluation compares the answer to evidence, marks
covered/missed points with citations, and labels inference. It does not
score people; it shows gaps.

## Providers

`LlmProvider` interface (`generate(schema, messages)`); provider is a
configurable product dependency. If unavailable, features degrade to
evidence-only views. Timeouts, size limits and cost caps apply.

## Tests

Schema validation, unsupported-claim rejection, grounding, and injection
fixtures (e.g. README saying "ignore previous instructions").

## Data minimization and confidence

- AI context is assembled only from stored, sanitized data. Because contact
  data (emails, LFIDs) is never stored (DATA_POLICY.md section 3), it cannot
  appear in prompts, embeddings or answers. A test with planted contact data
  must confirm this.
- Confidence uses the single scale from DATA_PROVENANCE.md (high, medium,
  low, none); no numeric scores.
- Granularity is part of grounding: a claim about GSoC must say
  "organization" unless a verified project-level record is cited. The
  validator rejects a project-level GSoC claim without such evidence.
- Ecosystem coverage is part of grounding: CNCF-derived claims must say
  "CNCF projects" and never generalize to all of LFX Mentorship.
- Recommendation explanations may only rephrase criteria supplied by the
  matching engine (RECOMMENDATION_ENGINE.md).

## Budgets, limits, caching and fallback (proposed; Q26)

`AI_ENABLED` is false by default and no provider is connected. The proposed
defaults live in `packages/shared/src/ai-budget.ts` and are not approved:

| Limit                          | Proposed                                  |
| ------------------------------ | ----------------------------------------- |
| Max context tokens per request | 6,000                                     |
| Max output tokens              | 800                                       |
| Max evidence items in context  | 24 (extra items dropped, count reported)  |
| Max answer length              | 4,000 characters                          |
| Requests per IP per hour       | 20                                        |
| Requests per session per day   | 60                                        |
| Global daily token cap         | 2,000,000 (hard stop)                     |
| Response cache TTL             | 24 h, keyed by question and evidence hash |
| Timeout                        | 20 s                                      |

Fallback when AI is disabled, over budget, timing out or failing validation:
show the evidence-only view (facts, sources, learning links) with a clear
note; never show unvalidated model text. Cache hits do not count against
per-user limits. Spend and cap breaches are logged as metrics (counts only).

---
id: writing-a-proposal
title: Writing a mentorship proposal (LFX, GSoC, Summer of Bitcoin)
tags: proposal, project proposal, gsoc proposal, lfx proposal, timeline, milestones, technical plan, template, structure
sources: OpenSourceX reference proposals (four LFX proposals, personal details removed, kept private)
---

## How to write a good mentorship proposal: the structure strong proposals share

The reference proposals OpenSourceX keeps (LFX proposals for Kyverno integration testing, Kthena HPA/KEDA autoscaling, gittuf TUI and temporary approvals, and Hiero SDK V3) all follow this structure:

1. **Title block:** program and term, project title, mentors, link to the mentorship issue or repo.
2. **Contact information:** name, GitHub, email, university, year, timezone.
3. **How I found the project:** a short, honest story that ends at this mentorship issue.
4. **Why I want to work on this:** a real problem you hit yourself (for example, "I waited 30+ minutes for E2E tests to tell me something I could have known in 5 seconds").
5. **Experience and skills:** languages and the internals you learned *by contributing to this project*.
6. **"3 PRs that show I can do this":** a table with PR, what I did, and why it matters for this project.
7. **Proof of concept:** a draft PR or prototype, with a short code excerpt and what you learned from building it.
8. **Full contribution history:** a table of PRs with status (merged, open, cherry-picked).
9. **Problem statement:** the gap today, ideally with numbers (test counts, CI minutes, missing features).
10. **Architecture context and technical design:** the files, functions and data flow you will change, with code sketches.
11. **Phased plan:** 3–5 phases over 12 (or 24) weeks, each with tasks, a **milestone**, and a test count or deliverable.
12. **Timeline summary table:** phase, weeks, tests and deliverable.
13. **Testing strategy:** unit, integration and end-to-end tests, and the tools you will use.
14. **Risks and mitigation:** technical risks plus personal ones (exams, timezone), each with a plan.
15. **Communication plan:** weekly sync, async updates, small reviewable PRs, where you will talk (Slack, Discord, GitHub).
16. **Availability:** hours per week, timezone, flexibility.
17. **What I hope to get out of it, and my post-mentorship commitment.**

## Tips for writing a strong proposal (from the reference examples)

- **Lead with evidence.** Every reference shows merged or open PRs *in the same project* before the plan begins.
- **Ship a proof of concept before applying.** A draft PR that already works (for example, an envtest bootstrap with 4 passing smoke tests, or a TypeScript PoC with 24 tests) is the strongest signal you can send.
- **Quote the real code.** Point at actual files, functions and line ranges (for example `pkg/policycache/cache.go`), not generic descriptions.
- **Make milestones measurable:** "`make test-integration` passes in ≤10 seconds, no cluster needed", "CI green on all three language PoCs".
- **Order the work by dependency** and say why: build the foundation first, then features, then CI and docs.
- **Name your gaps honestly**, for example "I have not built a KEDA external scaler before, so I budget extra time in weeks 7–8".
- **Plan for stretch goals and fallbacks:** "if webhook tests are flaky, I focus on engine-level tests and treat webhooks as a stretch goal".
- **Commit beyond the term.** Say what you will keep owning afterwards.

## Proposal timeline template (12 weeks)

| Phase | Weeks | Work | Milestone |
| --- | --- | --- | --- |
| 1. Foundation | 1–3 | Set up the structure, extend your PoC, first tests, docs skeleton | Foundation merged, CI runs |
| 2. Core feature | 4–6 | Main implementation, with tests for each piece | Core flow works end to end |
| 3. Advanced cases | 7–9 | Hard parts, edge cases, integrations | Feature complete behind a flag |
| 4. Hardening | 10–12 | CI, docs, migration guide, review fixes | Everything merged and documented |

For 24-week part-time terms, double each phase, or add phases.

## Using the reference proposals as examples

Ask OpenSourceX for "an example proposal for testing", "an example for an SDK project" or "an example timeline" to see the matching excerpt. Use them to learn the structure and the level of detail. Never copy them: mentors compare applications, and your proposal must describe your own contributions and plan.

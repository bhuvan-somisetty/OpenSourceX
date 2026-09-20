# Open Questions

| # | Question | Why it matters | Recommendation | Status |
|---|----------|----------------|----------------|--------|
| Q1 | The original project handoff was not provided; its content beyond the master prompt is unknown | May contradict decisions here | Provide it and reconcile | Open |
| Q2 | Terms of use and permission for the GSoC and LFX endpoints (LFX site robots.txt is `Disallow: /`) | Legality and durability of the core data | Read both terms; ask Google and the Linux Foundation for permission or an official path | Open, blocks production ingestion |
| Q3 | GSoC data before 2022 and any project-level or mentor data | History and mentor claims | 2022-2026 org-level verified; earlier years 404; projects endpoint 403. Claim nothing more | Partly answered, still open |
| Q4 | LFX term-name normalization | Correct history grid | Map by dates | Open |
| Q5 | Which LLM provider | Cost, privacy | Keep provider abstraction; decide later | Open |
| Q6 | Repository visibility and license | Distribution | Private, no license (proprietary product; see D-006) | Resolved |
| Q16 | **DECISION NEEDED.** Mentor data policy: which fields from the CNCF repository may be stored and shown (name and GitHub handle only, never email/LFID) and attribution wording | Privacy and CC-BY compliance | Store name and GitHub handle only; show CNCF attribution | Open |
| Q7 | **DECISION NEEDED.** Provide the original handoff | Traceability (review C-1) | Owner supplies it; re-run review | Open |
| Q8 | **DECISION NEEDED.** How to present GSoC history given it is org-level only | Avoid false project-level claims (H-1) | Show as organization participation, label grain in UI | Open |
| Q9 | **DECISION NEEDED.** Keep PR/contribution intelligence in P2 or pull a thin version into MVP | Core differentiator vs scope (H-8) | Owner decides; thin PR explainer is feasible from GitHub data | Open |
| Q10 | **DECISION NEEDED.** Typed tables with provenance columns vs generic fact table | Query safety vs flexibility (M-1) | Typed core entities plus a provenance table | Open |
| Q11 | **DECISION NEEDED.** Recommendation ranking with shown weights vs no ordering score | Consistency with D-004 (M-3) | Transparent, user-visible weights, labeled as ranking | Open |
| Q12 | **DECISION NEEDED.** Separate Fastify API vs Next.js route handlers for MVP | Complexity vs D-001 (M-5) | Route handlers plus a worker for the MVP | Open, needed before M0 |
| Q13 | **DECISION NEEDED.** Security contact for SECURITY.md | Private repo may not accept advisories (M-9) | Owner-supplied email | Open |
| Q14 | Is CODE_OF_CONDUCT.md needed for a proprietary product | Prompt listed it (L-6) | Not needed | Open |
| Q15 | **DECISION NEEDED.** Content, licensing and personal-data policy | Storing third-party text and GitHub logins (H-5) | Link-first, short attributed excerpts, no emails | Open, needed before M3 |

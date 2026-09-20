# Open Questions

Status: Open, Resolved (with decision), or Partly answered. Resolved items
point to DECISIONS.md.

## Resolved (2026-09-21)
| # | Question | Resolution |
|---|----------|------------|
| Q1, Q7 | Original handoff | The full handoff/master prompt is the source of truth; TRACEABILITY.md maps every requirement |
| Q4 | LFX term normalization | Design decided (D-015, INGESTION_PIPELINE.md); implementation in M1 |
| Q6 | Repository visibility and license | Private, no license (D-006) |
| Q8 | GSoC granularity | D-007 |
| Q9 | PR intelligence phase | D-011 |
| Q10 | Typed vs generic data model | D-008 |
| Q11 | Recommendation ranking | D-010 |
| Q12 | API architecture | D-009 |
| Q14 | Code of conduct | Not needed now (D-012) |
| Q15 | Content, licensing, privacy policy | DATA_POLICY.md (D-014) |
| Q16 | CNCF contact data | Never ingest; broader than the CSV (D-014) |

## Still open
| # | Question | Why it matters | Current recommendation | Status |
|---|----------|----------------|------------------------|--------|
| Q2 | Terms and permission for GSoC and LFX endpoints (LFX site robots.txt is `Disallow: /`; GSoC and LFX terms unread) | Legality and durability of the core data | Read both terms in a browser; ask Google and the Linux Foundation for permission or an official data path | **Open, blocks production ingestion** |
| Q3 | GSoC data before 2022 and any project-level or mentor data | History and mentor claims | 2022-2026 org-level verified; earlier years 404 at the API path; projects endpoint 403. Show "Not verified" | Partly answered |
| Q5 | Which LLM provider | Cost, privacy | Keep the provider abstraction; decide at M5 | Open |
| Q13 | Security contact address | Vulnerability reporting | **Owner must supply a real address.** None is invented; SECURITY.md says so | **Open, owner input needed** |
| Q17 | Other authoritative sources for project-level GSoC participation | Could allow project-level claims | Investigate; attach only with separate provenance | Open |
| Q18 | Scope of CNCF's Apache-2.0 vs CC BY 4.0 licences over specific files | CC BY attribution obligations | Treat documentation content as CC BY; confirm scope with CNCF or the repo docs before approval | Open, blocks CNCF approval |
| Q19 | Retention periods (interviews 30 days, logs 30 days are proposals) | Privacy compliance | Confirm before M5 | Open |
| Q20 | Channel for person-removal requests | DATA_POLICY commitment | Depends on the Q13 contact | Open |
| Q21 | GitHub token model (GitHub App vs personal token) and rate budget split | Quota safety, terms compliance | GitHub App preferred; decide in M3 | Open |
| Q22 | Design phase: visual direction and wireframes | Premium UX requirement | Run a design phase in parallel with M1; owner approves before M4 | Open |
| Q23 | Entity-resolution review queue: admin UI in MVP or scripts | Operational load | Scripts and a simple internal page first | Open |
| Q24 | Comfort level showing named mentors (public GitHub handles only) | Privacy posture | Show name, handle, role, term with source; removal on request | Open |
| Q25 | Whether the LFX API lag (26 of 59 CNCF 2026 Term 3 projects not yet present) is expected | Coverage claims | Say "published projects visible via the endpoint"; investigate | Open |

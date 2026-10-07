# Attribution for recorded fixtures

These files are small, sanitized excerpts of public data recorded for local
testing. They are not endorsed by the sources.

- `cncf-lfx-export-2026-t3.json`: derived from the CNCF mentoring repository,
  https://github.com/cncf/mentoring (`programs/lfx-mentorship/2026/03-Sep-Nov/lfx-export.json`,
  commit `17ef996a1fc7b266dbf2cfa6362752d6bb5c4c3d`). CNCF's content is licensed
  under Creative Commons Attribution 4.0 (CC BY 4.0),
  https://creativecommons.org/licenses/by/4.0/. **Changes made:** three programs
  selected; only allowlisted fields kept (email, LFID and all other fields
  removed); descriptions shortened with HTML markup stripped; field names normalized. The scope of the
  licence over individual files is still being confirmed (docs/OPEN_QUESTIONS.md Q18).
- `cncf-lfx-history.json`: derived from every LFX Mentorship term README of the CNCF mentoring
  repository, https://github.com/cncf/mentoring (`programs/lfx-mentorship/{year}/{term}/README.md`
  and `selected_projects.md`, 2019 to 2027 Term 1, commit
  `97525d8f004aa477c24f6ce2f34ce4d9b51bf75c`). CNCF's content is licensed under Creative Commons
  Attribution 4.0 (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/. **Changes made:**
  parsed into structured records; only the term timeline, CNCF project, program title, a shortened
  description, recommended skills, upstream issue, LFX project link and mentor name plus GitHub
  handle are kept; mentor emails, mentee names and profile links removed; markup stripped;
  spellings of the same CNCF project merged. Regenerate with
  `tsx services/providers/src/record-cncf-history-cli.ts <path-to-local-clone>`.
- `lfx-projects-sample.json`: three records from the LFX Mentorship service
  (https://mentorship.lfx.dev/), sanitized and shortened. Terms of use are not yet
  reviewed (Q2).
- `gsoc-2025-orgs-sample.json`: three organization records from the Google Summer
  of Code archive (https://summerofcode.withgoogle.com/), sanitized and shortened.
  Terms of use are not yet reviewed (Q2).

The rest of this repository is proprietary and not licensed for reuse.

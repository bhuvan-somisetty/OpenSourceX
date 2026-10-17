---
id: git-and-pull-requests
title: Git, forks and pull requests for contributors
tags: git, github, pull request, pr, fork, branch, commit, rebase, merge conflict, dco, sign-off, cla, review
sources: GitHub Docs, Contributing to a project | https://docs.github.com/en/get-started/exploring-projects-on-github/contributing-to-a-project
---

## The fork and pull request workflow

```bash
# 1. fork on GitHub, then clone your fork
git clone https://github.com/<you>/<project>.git
cd <project>
git remote add upstream https://github.com/<org>/<project>.git

# 2. branch from the latest main
git fetch upstream
git switch -c fix-typo upstream/main

# 3. change, test, commit (add -s if the project uses DCO sign-off)
git commit -s -m "docs: fix typo in install guide"

# 4. push and open the PR on GitHub
git push -u origin fix-typo
```

Keep each PR to one change, link the issue ("Fixes #123"), describe what changed and how you tested it, and follow the project's commit message style.

## Keeping a PR up to date and fixing conflicts

```bash
git fetch upstream
git rebase upstream/main      # replay your commits on the latest main
# fix any conflicts, then:
git add <files> && git rebase --continue
git push --force-with-lease   # update the PR safely
```

Use `--force-with-lease`, not `--force`, so you never overwrite someone else's pushed work.

## DCO sign-off and CLAs

- **DCO (Developer Certificate of Origin):** many Linux Foundation and CNCF projects require every commit to carry `Signed-off-by: Your Name <email>`. Add it with `git commit -s`. To fix earlier commits, run `git rebase --signoff upstream/main` and force-push.
- **CLA (Contributor License Agreement):** some projects (for example, Google-run or Apache projects) ask you to sign a CLA once, usually through a bot comment on your first PR.

## Getting your PR reviewed

- Make CI pass first, and read the failure logs yourself before asking.
- Respond to every review comment, and push fixes as new commits unless the project asks you to squash.
- Be patient. Maintainers are often volunteers. Ping politely after about a week, in the PR or the project channel.
- A closed PR is not a failure. Ask what would make the next one land.

---
id: free-public-apis
title: Free public APIs for open source projects and contributors
tags: api, apis, free api, public apis, no api key, github api, npm api, pypi api, osv, stack overflow api, hacker news api, wikipedia api, project ideas
sources: public-apis catalog | https://github.com/public-apis/public-apis
---

## Where to find free APIs for your project

The [public-apis](https://github.com/public-apis/public-apis) repository is a community catalog of more than 2,000 free APIs, grouped by category (Development, Open Data, Science, Weather, Games and more). Each entry says whether it needs a key (`No`, `apiKey` or `OAuth`) and whether it supports HTTPS and CORS. Entries with **Auth: No** work right away. The catalog holds no API keys: for `apiKey` APIs you sign up with that provider for your own key.

## Free APIs OpenSourceX Ask uses live

Ask calls these no-key APIs when you ask for current data:

| API                                                               | Ask it for                                                                   | Example question                                                                                 |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| GitHub REST + search                                              | Repo stars, forks, licence, last push; open good first issues; popular repos | "how many stars does volcano have", "good first issues in kubeflow", "popular Rust CLI projects" |
| npm, PyPI, crates.io, RubyGems, Packagist, NuGet, Go module proxy | Latest version, licence, repository                                          | "latest version of requests on pypi"                                                             |
| OSV.dev                                                           | Known vulnerabilities (CVE/GHSA) for a package                               | "vulnerabilities in npm package lodash 4.17.15"                                                  |
| Hacker News (Algolia search)                                      | Recent open source news and discussions                                      | "news about open source mentorship"                                                              |
| Stack Exchange                                                    | Stack Overflow answers to errors and how-tos                                 | "how do I fix a git rebase conflict"                                                             |
| Wikipedia                                                         | Short explanations of projects and concepts                                  | "what is copyleft"                                                                               |

## Tips for building on free APIs

- Read each API's rate limits. For example, unauthenticated GitHub allows 60 requests an hour per IP, and a personal access token raises that to 5,000.
- Cache responses and set timeouts, so a slow API never blocks your app.
- Never put API keys in client-side code or in public repositories. Use environment variables.
- Check the API's terms before storing or redistributing its data.
- APIs disappear. Check that the endpoint still answers, and handle errors gracefully.
- A small project built on a free API (a CLI, a bot, a dashboard) makes a good portfolio piece for mentorship applications.

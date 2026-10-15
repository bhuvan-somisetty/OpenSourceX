Source: https://docs.linuxfoundation.org/lfx/mentorship/mentee-stipends.md
Retrieved: 2026-10-15

> For the complete documentation index, see [llms.txt](https://docs.linuxfoundation.org/lfx/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.linuxfoundation.org/lfx/mentorship/mentee-stipends.md).

# Mentee Stipends

**How much stipend will I receive?**

Stipend [amounts](/lfx/mentorship/mentee-stipends/total-stipend-amount.md) are calculated based on your location.

**How is my location determined?**

Your location is determined by where you currently reside, that is, your country of current residence. If you are enrolled at an online institution or are a recent graduate, your stipend is determined by the location of your permanent residence.

**How are the stipend amounts determined?**

We are using a Purchasing Power Parity (PPP)-based calculation to determine the stipend. We start with a base amount of 6,000 USD and then adjust it based on each country's PPP value. There is a minimum (1,000 USD) and maximum (6,600 USD) stipend amount. The base amount takes into consideration the fact that many universities are in urban centers, which can be more expensive than in other parts of the country. We review these amounts periodically to keep them aligned with industry standards and economic conditions.

**What is Purchasing Power Parity? (PPP)**

Purchasing Power Parity is a way to estimate the exchange rate between two currencies to determine equivalent purchasing power. For details, refer following links:

* [Wikipedia: Purchasing Power Parity](https://en.wikipedia.org/wiki/Purchasing_power_parity)
* [World Bank: What is Purchasing Power Parity?](http://pubdocs.worldbank.org/en/332341517441011666/PPP-brochure-2017-webformat-rev.pdf)


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.linuxfoundation.org/lfx/mentorship/mentee-stipends.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.


import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { buildTools, configuredProviders, markFailed, streamAnswer, type Provider } from "./ai";
import { buildKnowledge, type Knowledge } from "./knowledge";

const usage = {
  inputTokens: { total: 3, noCache: 3, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 3, text: 3, reasoning: undefined },
};

const talking = (text: string) =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "t" },
          { type: "text-delta", id: "t", delta: text },
          { type: "text-end", id: "t" },
          { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
        ],
      }),
    }),
  });

const broken = () =>
  new MockLanguageModelV4({
    doStream: async () => {
      throw new Error("credits exhausted");
    },
  });

async function collect(providers: Provider[], k: Knowledge) {
  const gen = streamAnswer(providers, [{ role: "user", content: "hi" }], k);
  let text = "";
  while (true) {
    const s = await gen.next();
    if (s.done) return { text, engine: s.value.engine };
    if (s.value.type === "text") text += s.value.text;
  }
}

let k: Knowledge;
beforeAll(async () => {
  k = await buildKnowledge(null);
});

describe("AI provider fallback", () => {
  it("falls through a failing provider to the next one", async () => {
    const r = await collect(
      [
        { engine: "gateway", label: "g", model: broken() },
        { engine: "anthropic", label: "a", model: talking("from anthropic") },
      ],
      k,
    );
    expect(r).toEqual({ text: "from anthropic", engine: "anthropic" });
  });

  it("throws when every provider fails, so the offline engine answers", async () => {
    await expect(collect([{ engine: "openai", label: "o", model: broken() }], k)).rejects.toThrow();
  });
});

describe("AI tools", () => {
  it("only return links from recorded data", async () => {
    const tools = buildTools(k);
    const exec = tools.findOrganization.execute!;
    const hit = (await exec({ name: "Python Software Foundation" }, {
      toolCallId: "1",
      messages: [],
    } as never)) as {
      found: boolean;
      organization?: { programs: { page: string }[] };
    };
    expect(hit.found).toBe(true);
    expect(hit.organization!.programs[0]!.page).toMatch(/^\/programs\//);
    const miss = (await exec({ name: "zzqx not an org" }, {
      toolCallId: "2",
      messages: [],
    } as never)) as { found: boolean };
    expect(miss.found).toBe(false);
  });

  it("give the model the offline engine's recorded answers", async () => {
    const exec = buildTools(k).recordedAnswer.execute!;
    const r = (await exec({ question: "how do i save an organization" }, {
      toolCallId: "3",
      messages: [],
    } as never)) as { markdown: string };
    expect(r.markdown).toMatch(/^### Saving organizations/);
  });
});

describe("provider configuration", () => {
  afterEach(() => vi.unstubAllEnvs());
  const clear = () => {
    for (const k of [
      "GOOGLE_GENERATIVE_AI_API_KEY",
      "GEMINI_API_KEY",
      "GROQ_API_KEY",
      "CEREBRAS_API_KEY",
      "OPENROUTER_API_KEY",
      "ASK_COMPAT_BASE_URL",
      "AI_GATEWAY_API_KEY",
      "VERCEL_OIDC_TOKEN",
      "VERCEL",
      "ANTHROPIC_API_KEY",
      "OPENAI_API_KEY",
      "ASK_PROVIDER_ORDER",
    ])
      vi.stubEnv(k, "");
  };

  it("uses only providers that have a key, free ones first", () => {
    clear();
    vi.stubEnv("AI_ENABLED", "true");
    vi.stubEnv("CEREBRAS_API_KEY", "test");
    vi.stubEnv("OPENROUTER_API_KEY", "test");
    vi.stubEnv("ASK_COMPAT_BASE_URL", "http://localhost:3001/v1");
    expect(configuredProviders().map((p) => p.engine)).toEqual([
      "cerebras",
      "openrouter",
      "compat",
    ]);
  });

  it("is off when AI is disabled, and skips a provider that just failed", () => {
    clear();
    vi.stubEnv("CEREBRAS_API_KEY", "test");
    vi.stubEnv("AI_ENABLED", "false");
    expect(configuredProviders()).toEqual([]);
    vi.stubEnv("AI_ENABLED", "true");
    markFailed("cerebras", 1_000);
    expect(configuredProviders(2_000)).toEqual([]);
    expect(configuredProviders(1_000 + 6 * 60_000).map((p) => p.engine)).toEqual(["cerebras"]);
  });
});

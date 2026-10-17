import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeAll, describe, expect, it } from "vitest";
import { buildTools, streamAnswer, type Provider } from "./ai";
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
});

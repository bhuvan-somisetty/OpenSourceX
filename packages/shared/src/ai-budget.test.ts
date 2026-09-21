import { describe, expect, it } from "vitest";
import { AiDisabledError, assertAiEnabled, fitEvidence, PROPOSED_AI_BUDGET } from "./ai-budget";
import { inc, resetMetrics, snapshot } from "./metrics";
import { loadEnv } from "./env";

describe("AI guard", () => {
  it("is off by default and refuses use", () => {
    expect(loadEnv({}).AI_ENABLED).toBe(false);
    expect(() => assertAiEnabled(false)).toThrow(AiDisabledError);
    expect(() => assertAiEnabled(true)).not.toThrow();
  });
  it("budget is frozen and evidence is capped", () => {
    expect(Object.isFrozen(PROPOSED_AI_BUDGET)).toBe(true);
    const r = fitEvidence(
      Array.from({ length: 30 }, (_, i) => i),
      PROPOSED_AI_BUDGET,
    );
    expect(r.kept).toHaveLength(24);
    expect(r.dropped).toBe(6);
  });
});

describe("metrics", () => {
  it("counts by name and labels", () => {
    resetMetrics();
    inc("sync_failure_total", { dataset: "x" });
    inc("sync_failure_total", { dataset: "x" });
    expect(snapshot()).toEqual({ "sync_failure_total,dataset=x": 2 });
  });
});

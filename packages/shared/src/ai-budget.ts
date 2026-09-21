/**
 * AI spend and safety limits (docs/AI_ARCHITECTURE.md). Production AI activation requires
 * explicit owner approval (Q5, Q26): AI is OFF by default and no provider is connected.
 * The numbers below are PROPOSED defaults, not approved budgets.
 */
export interface AiBudget {
  maxContextTokens: number;
  maxOutputTokens: number;
  maxEvidenceItems: number;
  maxAnswerChars: number;
  requestsPerIpPerHour: number;
  requestsPerSessionPerDay: number;
  globalDailyTokenCap: number;
  cacheTtlSeconds: number;
  timeoutMs: number;
}

export const PROPOSED_AI_BUDGET: Readonly<AiBudget> = Object.freeze({
  maxContextTokens: 6_000,
  maxOutputTokens: 800,
  maxEvidenceItems: 24,
  maxAnswerChars: 4_000,
  requestsPerIpPerHour: 20,
  requestsPerSessionPerDay: 60,
  globalDailyTokenCap: 2_000_000,
  cacheTtlSeconds: 86_400,
  timeoutMs: 20_000,
});

export class AiDisabledError extends Error {
  constructor() {
    super("AI is disabled (AI_ENABLED is not true). Falling back to evidence-only views.");
    this.name = "AiDisabledError";
  }
}

export function assertAiEnabled(enabled: boolean): void {
  if (!enabled) throw new AiDisabledError();
}

/** Truncate evidence to the budget; returns what was kept and how many items were dropped. */
export function fitEvidence<T>(
  items: readonly T[],
  budget: Pick<AiBudget, "maxEvidenceItems">,
): { kept: T[]; dropped: number } {
  const kept = items.slice(0, budget.maxEvidenceItems);
  return { kept, dropped: items.length - kept.length };
}

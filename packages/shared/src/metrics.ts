/** Minimal in-process counters for observability. Labels are ids and counts only, never record bodies. */
const counters = new Map<string, number>();
const key = (name: string, labels: Record<string, string>) =>
  name +
  Object.entries(labels)
    .sort()
    .map(([k, v]) => `,${k}=${v}`)
    .join("");

export function inc(name: string, labels: Record<string, string> = {}, by = 1): void {
  counters.set(key(name, labels), (counters.get(key(name, labels)) ?? 0) + by);
}
export function snapshot(): Record<string, number> {
  return Object.fromEntries([...counters.entries()].sort());
}
export function resetMetrics(): void {
  counters.clear();
}

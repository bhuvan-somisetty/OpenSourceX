/** Build a query string from current params plus a patch. `null` removes a key; arrays become repeated keys. */
export type Params = Record<string, string | string[] | undefined>;

export function withParams(
  path: string,
  current: Params,
  patch: Record<string, string | string[] | null>,
): string {
  const q = new URLSearchParams();
  const merged: Params = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete merged[k];
    else merged[k] = v;
  }
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === "") continue;
    for (const x of Array.isArray(v) ? v : [v]) if (x !== "") q.append(k, x);
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

export const first = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? "";
export const many = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

import Link from "next/link";
import { withParams, type Params } from "@/lib/url";

export const PAGE_SIZE = 50;

/** Current page from `?page=`, clamped to the available pages. */
export function pageOf(raw: string, total: number): number {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return Math.min(pages, Math.max(1, Math.floor(Number(raw)) || 1));
}

export function pageSlice<T>(items: T[], page: number): T[] {
  return items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
}

/** Previous / next links for long result lists; page state lives in the URL. */
export function Pager({
  path,
  params,
  page,
  total,
}: {
  path: string;
  params: Params;
  page: number;
  total: number;
}) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  return (
    <nav className="pager" aria-label="Pages" data-testid="pager">
      {page > 1 ? (
        <Link className="btn sm" href={withParams(path, params, { page: String(page - 1) })}>
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="muted">
        {from} to {to} of {total} · page {page} of {pages}
      </span>
      {page < pages ? (
        <Link
          className="btn sm"
          href={withParams(path, params, { page: String(page + 1) })}
          data-testid="pager-next"
        >
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

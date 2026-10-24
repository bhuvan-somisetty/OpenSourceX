import type { Metadata } from "next";
import Link from "next/link";
import { CompareForm } from "@/features/repositories/CompareForm";

export const metadata: Metadata = { title: "Compare repositories" };

const one = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v)?.slice(0, 300) ?? "";

export default async function Compare({
  searchParams,
}: {
  searchParams: Promise<{ a?: string | string[]; b?: string | string[] }>;
}) {
  const sp = await searchParams;
  return (
    <div className="ra-page">
      <section className="page-hero ra-hero">
        <div className="eyebrow">
          <Link href="/repositories/analyze">Repositories</Link> · Compare
        </div>
        <h1 className="page" style={{ marginTop: 14 }}>
          Two repositories, <span className="ra-grad">side by side.</span>
        </h1>
        <p className="sub">
          Paste two GitHub links to see their stack, activity, community and first issues next to
          each other, before you pick where to contribute.
        </p>
      </section>
      <CompareForm initialA={one(sp.a)} initialB={one(sp.b)} />
    </div>
  );
}

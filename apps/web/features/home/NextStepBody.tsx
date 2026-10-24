import Link from "next/link";
import type { ReactNode } from "react";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { ProgramOrgLogo } from "@/features/programs/ProgramOrgLogo";
import type { Deadline, NextStep } from "@/lib/home-insights";

const span = (ys: number[]) =>
  !ys.length ? "" : ys.length > 1 ? `${ys[0]}–${ys.at(-1)}` : String(ys[0]);

function Step({
  n,
  title,
  sub,
  href,
  external,
}: {
  n: number;
  title: string;
  sub: string;
  href: string;
  external?: boolean;
}) {
  const inner: ReactNode = (
    <>
      <span className="nsx-n">{n}</span>
      <span className="nsx-step-text">
        <b>{title}</b>
        <span>{sub}</span>
      </span>
      <span className="nsx-go" aria-hidden="true">
        {external ? "↗" : "→"}
      </span>
    </>
  );
  return (
    <li>
      {external ? (
        <a className="nsx-step" href={href} target="_blank" rel="noreferrer">
          {inner}
        </a>
      ) : (
        <Link className="nsx-step" href={href}>
          {inner}
        </Link>
      )}
    </li>
  );
}

/** The saved organization at a glance, then a three-step path to a first contribution. */
export function NextStepBody({ step, deadline }: { step: NextStep; deadline: Deadline | null }) {
  const steps = [
    step.chat && {
      title: "Say hi to the team",
      sub: step.chat.label,
      href: step.chat.url,
      external: true,
    },
    step.issuesUrl && {
      title: "Pick a first issue",
      sub: "Open good first issues on GitHub",
      href: step.issuesUrl,
      external: true,
    },
    !step.chat &&
      step.repoUrl && {
        title: "Read the contributor guide",
        sub: "Start from the repository's README",
        href: step.repoUrl,
        external: true,
      },
    {
      title: "Ask how to make it count",
      sub: `What to build first at ${step.name}`,
      href: `/ask?q=${encodeURIComponent(step.askQuery)}`,
      external: false,
    },
  ].filter(Boolean) as { title: string; sub: string; href: string; external: boolean }[];

  const stats = [
    step.terms
      ? { n: String(step.terms), l: step.terms === 1 ? "LFX term" : "LFX terms" }
      : step.years.length
        ? {
            n: String(step.years.length),
            l: `${step.years.length === 1 ? "year" : "years"} in ${step.programShort}`,
          }
        : null,
    step.projectCount ? { n: String(step.projectCount), l: "mentorship projects" } : null,
    deadline ? { n: `${deadline.days}d`, l: `${deadline.label}`, hot: deadline.days <= 14 } : null,
  ].filter(Boolean) as { n: string; l: string; hot?: boolean }[];

  return (
    <div className="nsx">
      <div className="nsx-head">
        <Link href={step.href} className="nsx-logo" aria-hidden="true" tabIndex={-1}>
          {step.logo ? (
            <ProgramOrgLogo src={step.logo} name={step.name} size={60} dark={step.logoOnDark} />
          ) : (
            <OrgLogo slug={step.lfxSlug ?? step.name} name={step.name} size={60} />
          )}
        </Link>
        <div className="nsx-id">
          <h2 className="home-next-title">
            You saved <Link href={step.href}>{step.name}</Link>
          </h2>
          <div className="nsx-meta">
            <span className="pill lfx-org-latest-pill">{step.programShort}</span>
            {step.years.length > 0 && <span>{span(step.years)}</span>}
          </div>
        </div>
      </div>

      {step.description && <p className="nsx-desc">{step.description}</p>}

      {step.tags.length > 0 && (
        <div className="nsx-tags">
          {step.tags.map((t) => (
            <Link key={t} href={`/discover?i=${encodeURIComponent(t)}`}>
              {t}
            </Link>
          ))}
        </div>
      )}

      {stats.length > 0 && (
        <dl className="nsx-stats">
          {stats.map((s) => (
            <div key={s.l} className={s.hot ? "nsx-hot" : undefined}>
              <dt>{s.n}</dt>
              <dd>{s.l}</dd>
            </div>
          ))}
        </dl>
      )}

      <ol className="nsx-path" aria-label={`Start contributing to ${step.name}`}>
        {steps.map((s, i) => (
          <Step key={s.title} n={i + 1} {...s} />
        ))}
      </ol>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { developmentAuthAvailable, getSession, guestPreviewAvailable } from "@/lib/auth";
import { OAUTH_PROVIDERS, oauthConfigured } from "@/lib/auth-config";
import { LogoMark } from "@/components/ui/Logo";
import { PublicNav } from "@/features/landing/PublicNav";
import { knowledge } from "@/lib/assistant/engine";
import { PROGRAM_CATALOG } from "@/lib/programs";
import {
  continueAsGuest,
  continueInDevelopmentMode,
  signInWithGitHub,
  signInWithGoogle,
} from "@/features/auth/actions";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const POINTS = [
  {
    title: "Every program in one place",
    text: "GSoC, LFX, Outreachy, Summer of Bitcoin and more, side by side.",
    icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  },
  {
    title: "An AI guide that knows them",
    text: "Ask anything about open source, with your chat history saved.",
    icon: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  },
  {
    title: "Facts with sources",
    text: "Evidence behind every answer, never a guess.",
    icon: "M9 12l2 2 4-4M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z",
  },
];

const ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "That email is already linked to another sign-in method.",
  AccessDenied: "Sign-in was cancelled.",
  Configuration: "Sign-in is not set up correctly yet. Please continue as a guest for now.",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.44-2.43-.86-2.43-.86-.33-.83-.8-1.05-.8-1.05-.65-.45.05-.44.05-.44.72.05 1.1.74 1.1.74.64 1.1 1.68.78 2.09.6.06-.46.25-.78.46-.96-1.6-.18-3.28-.8-3.28-3.57 0-.79.28-1.43.74-1.94-.07-.18-.32-.92.07-1.92 0 0 .6-.19 1.98.74a6.9 6.9 0 0 1 3.6 0c1.38-.93 1.98-.74 1.98-.74.39 1 .14 1.74.07 1.92.46.51.74 1.15.74 1.94 0 2.78-1.69 3.39-3.3 3.57.26.22.49.66.49 1.33l-.01 1.97c0 .21.14.45.55.38A8 8 0 0 0 8 0Z" />
    </svg>
  );
}

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const current = await getSession();
  // guests may come here to sign in for real; everyone else goes straight in
  if (current && current.kind !== "guest") redirect("/app");
  const error = (await searchParams).error;
  const dev = developmentAuthAvailable();
  const guest = !dev && guestPreviewAvailable();
  const oauth = oauthConfigured();
  const github = oauth && OAUTH_PROVIDERS.github;
  const google = oauth && OAUTH_PROVIDERS.google;
  const orgCount = (await knowledge().catch(() => null))?.orgs.length ?? 0;

  return (
    <div className="auth" data-testid="login-page">
      <div className="atmos" aria-hidden="true" />
      <PublicNav />
      <div className="auth-body">
        <section className="auth-card" aria-labelledby="login-h" data-testid="login-card">
          <div className="auth-visual" aria-hidden="true">
            <div className="auth-glow" />
            <div className="auth-orb o1" />
            <div className="auth-orb o2" />
            <LogoMark size={64} />
            <h1 id="login-h">
              Your path into <span className="auth-gradient">open source</span> starts here.
            </h1>
            <p className="muted">Explore programs, save organizations and prepare to contribute.</p>
            <ul className="auth-points">
              {POINTS.map((p) => (
                <li key={p.title}>
                  <span className="auth-point-icon">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={p.icon} />
                    </svg>
                  </span>
                  <span>
                    <strong>{p.title}</strong>
                    {p.text}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="auth-stats">
              <div>
                <dt>{PROGRAM_CATALOG.slice(0, 10).length}</dt>
                <dd>programs</dd>
              </div>
              {orgCount > 0 && (
                <div>
                  <dt>{orgCount}</dt>
                  <dd>organizations</dd>
                </div>
              )}
              <div>
                <dt>24/7</dt>
                <dd>AI guide</dd>
              </div>
            </dl>
          </div>

          <div className="auth-form">
            <div className="auth-form-head">
              <h2>Welcome to OpenSourceX</h2>
              <p>Choose how you want to continue.</p>
            </div>
            {error && (
              <p className="notice err" role="alert" style={{ margin: "0 0 14px" }}>
                {ERRORS[error] ?? "Sign-in did not complete. Please try again."}
              </p>
            )}
            <div className="auth-stack">
              <form action={signInWithGoogle}>
                <button
                  className="btn oauth"
                  type="submit"
                  disabled={!google}
                  aria-disabled={!google}
                  data-testid="oauth-google"
                  style={{ width: "100%" }}
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
              </form>
              <form action={signInWithGitHub}>
                <button
                  className="btn oauth"
                  type="submit"
                  disabled={!github}
                  aria-disabled={!github}
                  data-testid="oauth-github"
                  style={{ width: "100%" }}
                >
                  <GitHubIcon />
                  Continue with GitHub
                </button>
              </form>
              {(!google || !github) && (
                <p className="hint" style={{ margin: 0 }}>
                  {!google && !github
                    ? "Google and GitHub sign-in are coming soon."
                    : `${!google ? "Google" : "GitHub"} sign-in is coming soon.`}
                </p>
              )}
            </div>

            <p className="hint" style={{ margin: "12px 0 0" }} data-testid="legal-links">
              By continuing you agree to the <Link href="/terms">Terms of Service</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>

            {(guest || dev) && <div className="divider">or</div>}

            {guest ? (
              <form action={continueAsGuest} data-testid="local-preview">
                <button className="guest-cta" type="submit" data-testid="guest-login">
                  <span className="guest-cta-icon" aria-hidden="true">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
                    </svg>
                  </span>
                  <span className="guest-cta-text">
                    <strong>Continue as guest</strong>
                    <small>Jump straight in, no sign-up</small>
                  </span>
                  <span className="guest-cta-arrow" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
                <ul className="guest-perks" aria-label="Guest access">
                  <li>Free</li>
                  <li>Instant</li>
                  <li>Saved for 7 days</li>
                </ul>
                <p className="hint" style={{ margin: "10px 0 0" }}>
                  Your chats and saved items stay in this browser for up to 7 days
                  {oauth ? ", and move to your account if you sign in later" : ""}.
                </p>
              </form>
            ) : dev ? (
              <form action={continueInDevelopmentMode} data-testid="local-preview">
                <button
                  className="btn primary"
                  type="submit"
                  style={{ width: "100%" }}
                  data-testid="dev-login"
                >
                  Continue in Local Preview
                </button>
                <p className="hint" style={{ margin: "10px 0 0" }}>
                  Development only: a temporary local session on this machine, not a real account.
                </p>
              </form>
            ) : (
              !oauth && (
                <p className="notice err" role="alert" style={{ margin: 0 }}>
                  Sign-in is not available right now.
                </p>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

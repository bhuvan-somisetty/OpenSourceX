import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { developmentAuthAvailable, getSession } from "@/lib/auth";
import { LogoMark } from "@/components/ui/Logo";
import { PublicNav } from "@/features/landing/PublicNav";
import { continueInDevelopmentMode } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const POINTS = [
  "Programs, organizations, projects and repositories in one place",
  "Evidence and provenance behind every fact, not a guess",
  "A local preview session: no real account, no live data",
];

export default async function Login() {
  if (await getSession()) redirect("/app");
  const dev = developmentAuthAvailable();
  return (
    <div className="auth" data-testid="login-page">
      <div className="atmos" aria-hidden="true" />
      <PublicNav />
      <div className="auth-body">
        <section className="auth-card" aria-labelledby="login-h" data-testid="login-card">
          <div className="auth-visual" aria-hidden="true">
            <div className="auth-glow" />
            <LogoMark size={40} />
            <h1 id="login-h">Your path into open source starts here.</h1>
            <p className="muted">
              Sign in to explore programs, save projects and prepare to contribute.
            </p>
            <ul className="auth-points">
              {POINTS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>

          <div className="auth-form">
            <div className="auth-stack">
              <button
                className="btn oauth"
                type="button"
                disabled
                aria-disabled="true"
                data-testid="oauth-google"
              >
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
                Continue with Google
              </button>
              <button
                className="btn oauth"
                type="button"
                disabled
                aria-disabled="true"
                data-testid="oauth-github"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.44-2.43-.86-2.43-.86-.33-.83-.8-1.05-.8-1.05-.65-.45.05-.44.05-.44.72.05 1.1.74 1.1.74.64 1.1 1.68.78 2.09.6.06-.46.25-.78.46-.96-1.6-.18-3.28-.8-3.28-3.57 0-.79.28-1.43.74-1.94-.07-.18-.32-.92.07-1.92 0 0 .6-.19 1.98.74a6.9 6.9 0 0 1 3.6 0c1.38-.93 1.98-.74 1.98-.74.39 1 .14 1.74.07 1.92.46.51.74 1.15.74 1.94 0 2.78-1.69 3.39-3.3 3.57.26.22.49.66.49 1.33l-.01 1.97c0 .21.14.45.55.38A8 8 0 0 0 8 0Z" />
                </svg>
                Continue with GitHub
              </button>
              <p className="hint" style={{ margin: 0 }}>
                Google and GitHub sign-in are not connected in this development build.
              </p>
            </div>

            <div className="divider">or</div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                disabled
                aria-describedby="email-hint"
              />
              <span id="email-hint" className="hint">
                Email sign-in is not configured in this development build.
              </span>
            </div>

            <div className="local-preview" data-testid="local-preview">
              <div className="lp-head">
                <span className="lp-tag">Local preview</span>
                <span className="dim">development only</span>
              </div>
              {dev ? (
                <form action={continueInDevelopmentMode}>
                  <button
                    className="btn primary"
                    type="submit"
                    style={{ width: "100%" }}
                    data-testid="dev-login"
                  >
                    Continue in Local Preview
                  </button>
                  <p className="hint" style={{ margin: "10px 0 0" }}>
                    Creates a temporary local development session for this machine. No Google,
                    GitHub or real account is used, and this does not create a real OpenSourceX
                    account.
                  </p>
                </form>
              ) : (
                <p className="notice err" role="alert" style={{ margin: 0 }}>
                  Local preview is disabled in this environment and real sign-in is not connected.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

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
  "A local preview session — no real account, no live data",
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
                className="btn"
                type="button"
                disabled
                aria-disabled="true"
                data-testid="oauth-google"
              >
                Continue with Google
              </button>
              <button
                className="btn"
                type="button"
                disabled
                aria-disabled="true"
                data-testid="oauth-github"
              >
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

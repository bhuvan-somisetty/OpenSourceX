import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { developmentAuthAvailable, getSession } from "@/lib/auth";
import { Logo, PublicNav } from "@/features/landing/PublicNav";
import { continueInDevelopmentMode } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function Login() {
  if (await getSession()) redirect("/app");
  const dev = developmentAuthAvailable();
  return (
    <>
      <PublicNav />
      <div className="auth">
        <div className="beams" aria-hidden="true" />
        <section className="auth-card" aria-labelledby="login-h" data-testid="login-card">
          <Logo />
          <h1 id="login-h">Your path into open source starts here.</h1>
          <p className="muted" style={{ margin: 0 }}>
            Sign in to explore programs, save projects and prepare to contribute.
          </p>

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

          <form>
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
            <div className="auth-stack">
              <button className="btn" type="button" disabled aria-disabled="true">
                Continue
              </button>
            </div>
          </form>

          <div className="divider">development only</div>

          {dev ? (
            <form action={continueInDevelopmentMode}>
              <button
                className="btn primary"
                type="submit"
                style={{ width: "100%" }}
                data-testid="dev-login"
              >
                Continue in Development Mode
              </button>
              <p className="hint" style={{ marginTop: 10 }}>
                Creates a local <strong>development session</strong> so saved items persist on this
                machine. It is not a real account and is disabled in production.
              </p>
            </form>
          ) : (
            <p className="notice err" role="alert">
              Development sessions are disabled in this environment and real sign-in is not
              connected.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import { ensureUser, mergeGuestInto } from "@opensourcex/database";
import { db } from "@/lib/data";

/**
 * Real sign-in with GitHub and Google (Auth.js, JWT sessions, no extra tables). A provider is
 * offered only when its OAuth app credentials are set (AUTH_GITHUB_ID/SECRET,
 * AUTH_GOOGLE_ID/SECRET) and AUTH_SECRET exists. Accounts are app_user rows with ids such as
 * "github:12345" and kind 'oauth'. A guest's chats and saves move to the account on first sign-in.
 */
const has = (k: string) => !!process.env[k]?.trim();

export const OAUTH_PROVIDERS = {
  github: has("AUTH_GITHUB_ID") && has("AUTH_GITHUB_SECRET"),
  google: has("AUTH_GOOGLE_ID") && has("AUTH_GOOGLE_SECRET"),
};

export function oauthConfigured(): boolean {
  return has("AUTH_SECRET") && (OAUTH_PROVIDERS.github || OAUTH_PROVIDERS.google);
}

const providers: Provider[] = [];
if (OAUTH_PROVIDERS.github) providers.push(GitHub);
if (OAUTH_PROVIDERS.google) providers.push(Google);

export const GUEST_COOKIE = "osx_session";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    jwt({ token, account }) {
      if (account) token.uid = `${account.provider}:${account.providerAccountId}`;
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!account) return;
      const id = `${account.provider}:${account.providerAccountId}`;
      const name = (user.name || user.email?.split("@")[0] || "Member").slice(0, 80);
      await ensureUser(db(), id, name, "oauth");
      const jar = await cookies();
      const guest = jar.get(GUEST_COOKIE)?.value;
      if (guest?.startsWith("guest:")) {
        try {
          await mergeGuestInto(db(), `guest-${guest.slice("guest:".length)}`, id);
        } catch {
          /* a failed merge must never block sign-in */
        }
        jar.delete(GUEST_COOKIE);
      }
    },
  },
});

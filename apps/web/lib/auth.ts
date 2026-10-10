import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureUser } from "@opensourcex/database";
import { loadEnv } from "@opensourcex/shared";
import { db } from "@/lib/data";

/**
 * Auth-ready session layer. Two labeled, non-authenticated sessions exist today:
 * - DEVELOPMENT: one shared local user, refused in production.
 * - GUEST: hosted preview (GUEST_PREVIEW=true). Each visitor gets an anonymous id in a cookie.
 * Real Google/GitHub/email sign-in replaces `getSession` and the start functions without touching
 * pages or APIs.
 */
export interface Session {
  userId: string;
  name: string;
  kind: "development" | "guest";
}

export const SESSION_COOKIE = "osx_session";
const DEV_USER = { userId: "development-user", name: "Development User" } as const;
const GUEST_NAME = "Guest";
const GUEST_PREFIX = "guest:";
const GUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const WEEK = 60 * 60 * 24 * 7;

/**
 * A valid session must always have its user row (saved items reference it). Idempotent upsert, so
 * a reset database self-heals. Guest rows use kind 'development' (not an authenticated identity).
 */
async function ensureSessionUser(s: Session): Promise<void> {
  try {
    await ensureUser(db(), s.userId, s.name, "development");
  } catch {
    /* database unavailable: pages render their own error state */
  }
}

export function developmentAuthAvailable(): boolean {
  return loadEnv().AUTH_MODE === "development" && process.env.NODE_ENV !== "production";
}

export function guestPreviewAvailable(): boolean {
  return loadEnv().GUEST_PREVIEW;
}

function sessionFromCookie(value: string | undefined): Session | null {
  if (value === "development" && developmentAuthAvailable())
    return { ...DEV_USER, kind: "development" };
  if (value?.startsWith(GUEST_PREFIX) && guestPreviewAvailable()) {
    const id = value.slice(GUEST_PREFIX.length);
    if (GUEST_ID.test(id)) return { userId: `guest-${id}`, name: GUEST_NAME, kind: "guest" };
  }
  return null;
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const s = sessionFromCookie(jar.get(SESSION_COOKIE)?.value);
  if (s) await ensureSessionUser(s);
  return s;
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

async function setSessionCookie(value: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: WEEK,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function startDevelopmentSession(): Promise<void> {
  if (!developmentAuthAvailable())
    throw new Error("Development sessions are disabled in this environment.");
  try {
    await ensureUser(db(), DEV_USER.userId, DEV_USER.name, "development");
  } catch {
    /* database unavailable: pages render their own error state */
  }
  await setSessionCookie("development");
}

export async function startGuestSession(): Promise<void> {
  if (!guestPreviewAvailable()) throw new Error("Guest preview is disabled in this environment.");
  const id = randomUUID();
  try {
    await ensureUser(db(), `guest-${id}`, GUEST_NAME, "development");
  } catch {
    /* database unavailable: pages render their own error state */
  }
  await setSessionCookie(`${GUEST_PREFIX}${id}`);
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

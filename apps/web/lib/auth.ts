import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureUser } from "@opensourcex/database";
import { loadEnv } from "@opensourcex/shared";
import { db } from "@/lib/data";

/**
 * Auth-ready session layer. Only a DEVELOPMENT session exists today: it is not an authenticated
 * identity, it is refused in production, and the UI always labels it. Real Google/GitHub/email
 * sign-in replaces `getSession` and `startDevelopmentSession` without touching pages or APIs.
 */
export interface Session {
  userId: string;
  name: string;
  kind: "development";
}

export const SESSION_COOKIE = "osx_session";
const DEV_USER = { userId: "development-user", name: "Development User" } as const;

/** A valid session must always have its user row (saved items reference it). Idempotent upsert, so a reset database self-heals. */
async function ensureDevUser(): Promise<void> {
  try {
    await ensureUser(db(), DEV_USER.userId, DEV_USER.name, "development");
  } catch {
    /* database unavailable: pages render their own error state */
  }
}

export function developmentAuthAvailable(): boolean {
  return loadEnv().AUTH_MODE === "development" && process.env.NODE_ENV !== "production";
}

export async function getSession(): Promise<Session | null> {
  if (!developmentAuthAvailable()) return null;
  const jar = await cookies();
  if (jar.get(SESSION_COOKIE)?.value !== "development") return null;
  await ensureDevUser();
  return { ...DEV_USER, kind: "development" };
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function startDevelopmentSession(): Promise<void> {
  if (!developmentAuthAvailable())
    throw new Error("Development sessions are disabled in this environment.");
  await ensureUser(db(), DEV_USER.userId, DEV_USER.name, "development");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "development", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: false,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

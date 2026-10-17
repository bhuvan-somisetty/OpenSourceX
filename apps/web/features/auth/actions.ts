"use server";

import { redirect } from "next/navigation";
import { endSession, getSession, startDevelopmentSession, startGuestSession } from "@/lib/auth";
import { signIn } from "@/lib/auth-config";

/** Development-only: creates a clearly labeled local session. It is not an authenticated identity. */
export async function continueInDevelopmentMode() {
  await startDevelopmentSession();
  redirect("/app");
}

/** Hosted preview: an anonymous, labeled guest session for this browser. Not a real account. */
export async function continueAsGuest() {
  // keep an existing guest session (and its chats) instead of starting a new one
  if ((await getSession())?.kind !== "guest") await startGuestSession();
  redirect("/app");
}

/** Real sign-in. A guest's chats and saves move to the account (lib/auth-config.ts). */
export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/app" });
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/app" });
}

export async function signOut() {
  await endSession();
  redirect("/");
}

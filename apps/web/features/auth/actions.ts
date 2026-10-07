"use server";

import { redirect } from "next/navigation";
import { endSession, startDevelopmentSession, startGuestSession } from "@/lib/auth";

/** Development-only: creates a clearly labeled local session. It is not an authenticated identity. */
export async function continueInDevelopmentMode() {
  await startDevelopmentSession();
  redirect("/app");
}

/** Hosted preview: an anonymous, labeled guest session for this browser. Not a real account. */
export async function continueAsGuest() {
  await startGuestSession();
  redirect("/app");
}

export async function signOut() {
  await endSession();
  redirect("/");
}

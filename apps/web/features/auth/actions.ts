"use server";

import { redirect } from "next/navigation";
import { endSession, startDevelopmentSession } from "@/lib/auth";

/** Development-only: creates a clearly labeled local session. It is not an authenticated identity. */
export async function continueInDevelopmentMode() {
  await startDevelopmentSession();
  redirect("/app");
}

export async function signOut() {
  await endSession();
  redirect("/");
}

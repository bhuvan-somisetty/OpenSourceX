import { NextResponse } from "next/server";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(() => NextResponse.json({ status: "ok" }));

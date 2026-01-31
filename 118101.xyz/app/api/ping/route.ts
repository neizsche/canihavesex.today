import { NextResponse } from "next/server";
import { pingTarget } from "@/lib/uptime";
import { storeEntry } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TARGET_URL = "https://jellyfin.118101.xyz";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const url = new URL(request.url);
    const provided =
      request.headers.get("x-cron-secret") ?? url.searchParams.get("secret");
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const entry = await pingTarget(TARGET_URL);
    await storeEntry(entry);
    return NextResponse.json(entry);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to store uptime check.",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { readEntries } from "@/lib/kv";
import { computeStats } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const targetUrl = "https://jellyfin.118101.xyz";
  const targetHost = new URL(targetUrl).host;

  try {
    const entries = await readEntries();
    const stats = computeStats(entries, targetHost);
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to read uptime checks.",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

import { kv } from "@vercel/kv";
import type { PingEntry } from "./types";

const KV_KEY = "uptime:checks";
const MAX_ENTRIES = 2000;
const TTL_SECONDS = 60 * 60 * 72; // 3 days

export async function storeEntry(entry: PingEntry) {
  await kv.lpush(KV_KEY, JSON.stringify(entry));
  await kv.ltrim(KV_KEY, 0, MAX_ENTRIES - 1);
  await kv.expire(KV_KEY, TTL_SECONDS);
}

export async function readEntries(limit = MAX_ENTRIES): Promise<PingEntry[]> {
  const raw = await kv.lrange<string[]>(KV_KEY, 0, limit - 1);
  if (!raw) return [];
  const parsed: PingEntry[] = [];
  for (const item of raw) {
    try {
      parsed.push(JSON.parse(item) as PingEntry);
    } catch {
      // Skip malformed entries
    }
  }
  return parsed;
}

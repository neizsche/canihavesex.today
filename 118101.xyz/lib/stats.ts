import type { PingEntry, StatsResponse } from "./types";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export function computeStats(entries: PingEntry[], target: string | null): StatsResponse {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const recent = entries.filter((entry) => entry.ts >= windowStart);
  const sortedAsc = [...recent].sort((a, b) => a.ts - b.ts);
  const latest = sortedAsc[sortedAsc.length - 1];

  const total = sortedAsc.length;
  const upCount = sortedAsc.filter((entry) => entry.ok).length;
  const uptimePct = total ? (upCount / total) * 100 : null;

  const msValues = sortedAsc.filter((entry) => entry.ok && entry.ms !== null).map((entry) => entry.ms as number);
  const avgMs = msValues.length
    ? Math.round(msValues.reduce((sum, value) => sum + value, 0) / msValues.length)
    : null;

  let downtimeMs = 0;
  for (let i = 0; i < sortedAsc.length; i += 1) {
    const current = sortedAsc[i];
    const next = sortedAsc[i + 1];
    const end = next ? next.ts : now;
    if (!current.ok) {
      downtimeMs += Math.max(0, end - current.ts);
    }
  }

  const downtimeMinutes = total ? Math.round(downtimeMs / 60000) : null;

  let incidents = 0;
  for (let i = 1; i < sortedAsc.length; i += 1) {
    if (sortedAsc[i - 1].ok && !sortedAsc[i].ok) {
      incidents += 1;
    }
  }

  let streakMinutes: number | null = null;
  if (latest) {
    let changeTs = sortedAsc[0]?.ts ?? latest.ts;
    for (let i = sortedAsc.length - 1; i >= 0; i -= 1) {
      if (sortedAsc[i].ok !== latest.ok) {
        changeTs = sortedAsc[i + 1]?.ts ?? latest.ts;
        break;
      }
    }
    streakMinutes = Math.round((now - changeTs) / 60000);
  }

  return {
    target,
    status: latest ? (latest.ok ? "up" : "down") : "unknown",
    lastCheck: latest?.ts ?? null,
    uptimePct,
    downtimeMinutes,
    avgMs,
    incidents,
    streakMinutes,
    series: sortedAsc
  };
}

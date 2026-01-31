"use client";

import { useEffect, useMemo, useState } from "react";
import type { PingEntry, StatsResponse } from "@/lib/types";

const REFRESH_MS = 30000;
const BUCKETS_DESKTOP = 96;
const BUCKETS_MOBILE = 48;

const emptyStats: StatsResponse = {
  target: null,
  status: "unknown",
  lastCheck: null,
  uptimePct: null,
  downtimeMinutes: null,
  avgMs: null,
  incidents: 0,
  streakMinutes: null,
  series: []
};

function formatPercent(value: number | null) {
  if (value === null) return "--";
  return `${value.toFixed(2)}%`;
}

function formatMs(value: number | null) {
  if (value === null) return "--";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

function formatMinutes(value: number | null) {
  if (value === null) return "--";
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatAgo(ts: number | null) {
  if (!ts) return "--";
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function buildBuckets(series: PingEntry[], buckets: number) {
  const windowMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const start = now - windowMs;
  const bucketMs = windowMs / buckets;
  const stats = Array.from({ length: buckets }, () => ({ up: 0, total: 0 }));

  for (const point of series) {
    if (point.ts < start) continue;
    const idx = Math.min(
      buckets - 1,
      Math.max(0, Math.floor((point.ts - start) / bucketMs))
    );
    stats[idx].total += 1;
    if (point.ok) stats[idx].up += 1;
  }

  return stats.map((bucket) => {
    if (bucket.total === 0) return null;
    return bucket.up / bucket.total;
  });
}

export default function Home() {
  const [stats, setStats] = useState<StatsResponse>(emptyStats);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bucketCount, setBucketCount] = useState(BUCKETS_DESKTOP);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await fetch("/api/stats", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load stats");
        }
        const payload = (await response.json()) as StatsResponse;
        if (isMounted) {
          setStats(payload);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    const interval = setInterval(load, REFRESH_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const updateBuckets = () => {
      setBucketCount(window.innerWidth < 720 ? BUCKETS_MOBILE : BUCKETS_DESKTOP);
    };
    updateBuckets();
    window.addEventListener("resize", updateBuckets);
    return () => window.removeEventListener("resize", updateBuckets);
  }, []);

  const buckets = useMemo(() => {
    return buildBuckets(stats.series, bucketCount);
  }, [stats.series, bucketCount]);

  const statusLabel =
    stats.status === "up" ? "Operational" : stats.status === "down" ? "Down" : "No Data";

  const statusColor =
    stats.status === "up" ? "var(--up)" : stats.status === "down" ? "var(--down)" : "var(--warn)";

  return (
    <main>
      <header>
        <div className="brand">
          <h1>Uptime Mini</h1>
          <p>Real-time availability for a single URL, refreshed every minute.</p>
        </div>
        <div className="status-pill">
          <span className="dot" style={{ background: statusColor }} />
          {statusLabel}
        </div>
      </header>

      <section className="card">
        <div className="card-header">
          <h2>{stats.target ? `Monitoring ${stats.target}` : "Waiting for first check"}</h2>
          <span className="subtle">Last check {formatAgo(stats.lastCheck)}</span>
        </div>

        {error ? (
          <p className="subtle">{error}</p>
        ) : (
          <div className="grid" style={{ marginTop: "18px" }}>
            <div className="stat">
              <h3>Uptime 24h</h3>
              <p>{formatPercent(stats.uptimePct)}</p>
            </div>
            <div className="stat">
              <h3>Downtime 24h</h3>
              <p>{formatMinutes(stats.downtimeMinutes)}</p>
            </div>
            <div className="stat">
              <h3>Avg latency</h3>
              <p>{formatMs(stats.avgMs)}</p>
            </div>
            <div className="stat">
              <h3>Incidents</h3>
              <p>{stats.incidents}</p>
            </div>
            <div className="stat">
              <h3>Current streak</h3>
              <p>{formatMinutes(stats.streakMinutes)}</p>
            </div>
          </div>
        )}

        <div style={{ marginTop: "22px" }}>
          <div className="card-header">
            <h2>Last 24 hours</h2>
            <span className="subtle">Buckets show 15-minute health.</span>
          </div>
          {isLoading ? (
            <p className="subtle">Loading data...</p>
          ) : (
            <div
              className="timeline"
              style={{ gridTemplateColumns: `repeat(${bucketCount}, 1fr)` }}
            >
              {buckets.map((ratio, idx) => {
                let background = "rgba(15, 23, 42, 0.1)";
                if (ratio !== null) {
                  if (ratio === 1) background = "rgba(20, 184, 110, 0.9)";
                  else if (ratio >= 0.8) background = "rgba(20, 184, 110, 0.5)";
                  else if (ratio >= 0.5) background = "rgba(245, 158, 11, 0.7)";
                  else background = "rgba(239, 68, 68, 0.85)";
                }
                return <span key={idx} className="bucket" style={{ background }} />;
              })}
            </div>
          )}
        </div>
      </section>

      <section className="footer">
        <span className="badge">Refreshes every 30s</span>
        <span>
          {stats.series.length} checks stored in the last 24h
        </span>
      </section>
    </main>
  );
}

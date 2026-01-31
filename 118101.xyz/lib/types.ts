export type PingEntry = {
  ts: number;
  ok: boolean;
  status: number | null;
  ms: number | null;
  error?: string;
};

export type StatsResponse = {
  target: string | null;
  status: "up" | "down" | "unknown";
  lastCheck: number | null;
  uptimePct: number | null;
  downtimeMinutes: number | null;
  avgMs: number | null;
  incidents: number;
  streakMinutes: number | null;
  series: PingEntry[];
};

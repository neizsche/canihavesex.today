import type { PingEntry } from "./types";

export async function pingTarget(targetUrl: string, timeoutMs = 10000): Promise<PingEntry> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "user-agent": "uptime-mini/1.0"
      }
    });

    return {
      ts: Date.now(),
      ok: response.ok,
      status: response.status,
      ms: Date.now() - start
    };
  } catch (error) {
    return {
      ts: Date.now(),
      ok: false,
      status: null,
      ms: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  } finally {
    clearTimeout(timeout);
  }
}

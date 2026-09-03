export const SYSTEM_STATS_BASE_URL = "http://localhost:4317";
export const SYSTEM_STATS_POLL_MS = 8000;

const FETCH_TIMEOUT_MS = 5000;

export type SystemStats = {
  cpuPercent: number;
  memUsedMb: number;
  memTotalMb: number;
};

export type FetchSystemStatsResult =
  | { ok: true; stats: SystemStats }
  | { ok: false };

type SystemStatsResponse = {
  cpuPercent?: unknown;
  memUsedMb?: unknown;
  memTotalMb?: unknown;
};

function asFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export async function fetchSystemStats(): Promise<FetchSystemStatsResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${SYSTEM_STATS_BASE_URL}/system-stats`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false };
    }
    const body = (await res.json()) as SystemStatsResponse;
    return {
      ok: true,
      stats: {
        cpuPercent: asFiniteNumber(body.cpuPercent),
        memUsedMb: asFiniteNumber(body.memUsedMb),
        memTotalMb: asFiniteNumber(body.memTotalMb),
      },
    };
  } catch {
    return { ok: false };
  } finally {
    window.clearTimeout(timer);
  }
}

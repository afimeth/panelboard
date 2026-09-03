export const API_USAGE_BASE_URL = "http://localhost:4317";

const FETCH_TIMEOUT_MS = 5000;

export type ApiUsageEntry = {
  task: string;
  timestamp: string;
  tokens: number;
  cost_usd: number;
  model: string;
};

export type ApiUsage = {
  entries: ApiUsageEntry[];
  totalTokens: number;
  totalCostUsd: number;
};

export type FetchApiUsageResult =
  | { ok: true; usage: ApiUsage }
  | { ok: false };

type ApiUsageResponse = {
  entries?: unknown;
  totalTokens?: unknown;
  totalCostUsd?: unknown;
};

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseEntry(value: unknown): ApiUsageEntry | null {
  if (value === null || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const task = asText(row.task);
  const timestamp = asText(row.timestamp);
  const model = asText(row.model);
  const tokens = asFiniteNumber(row.tokens);
  const costUsd = asFiniteNumber(row.cost_usd);
  if (!task || !timestamp || !model || tokens === null || costUsd === null) {
    return null;
  }
  return { task, timestamp, tokens, cost_usd: costUsd, model };
}

export async function fetchApiUsage(): Promise<FetchApiUsageResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_USAGE_BASE_URL}/api-usage`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false };
    }
    const body = (await res.json()) as ApiUsageResponse;
    const list = Array.isArray(body.entries) ? body.entries : [];
    const entries = list
      .map((entry) => parseEntry(entry))
      .filter((entry): entry is ApiUsageEntry => entry !== null);
    const totalTokens = asFiniteNumber(body.totalTokens);
    const totalCostUsd = asFiniteNumber(body.totalCostUsd);
    return {
      ok: true,
      usage: {
        entries,
        totalTokens:
          totalTokens ?? entries.reduce((sum, entry) => sum + entry.tokens, 0),
        totalCostUsd:
          totalCostUsd ?? entries.reduce((sum, entry) => sum + entry.cost_usd, 0),
      },
    };
  } catch {
    return { ok: false };
  } finally {
    window.clearTimeout(timer);
  }
}

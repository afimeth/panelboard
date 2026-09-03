export const ACTIVE_WORKERS_BASE_URL = "http://localhost:4317";
export const ACTIVE_WORKERS_POLL_MS = 5000;

const FETCH_TIMEOUT_MS = 5000;

export type WorkerStatus = "idle" | "busy";

export type ActiveWorker = {
  id: string;
  label: string;
  status: WorkerStatus;
  task: string | null;
  detail: string | null;
  since: string | null;
};

export type FetchActiveWorkersResult =
  | { ok: true; workers: ActiveWorker[] }
  | { ok: false };

type ActiveWorkersResponse = {
  workers?: Array<{
    id?: unknown;
    label?: unknown;
    status?: unknown;
    task?: unknown;
    detail?: unknown;
    since?: unknown;
  }>;
};

export const IDLE_WORKERS: ActiveWorker[] = [
  { id: "agent-primary", label: "assistant", status: "idle", task: null, detail: null, since: null },
  { id: "api-worker", label: "api service", status: "idle", task: null, detail: null, since: null },
  { id: "local-llm", label: "qwen2.5-coder", status: "idle", task: null, detail: null, since: null },
];

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableText(value: unknown): string | null {
  const text = asText(value);
  return text.length > 0 ? text : null;
}

function asStatus(value: unknown): WorkerStatus {
  return asText(value).toLowerCase() === "busy" ? "busy" : "idle";
}

function mergeWorkers(list: ActiveWorkersResponse["workers"]): ActiveWorker[] {
  const rows = Array.isArray(list) ? list : [];
  const byId = new Map<string, (typeof rows)[number]>();
  for (const entry of rows) {
    const id = asText(entry.id);
    if (id) byId.set(id, entry);
  }
  return IDLE_WORKERS.map((fallback) => {
    const row = byId.get(fallback.id);
    if (!row) return { ...fallback };
    return {
      id: fallback.id,
      label: asText(row.label) || fallback.label,
      status: asStatus(row.status),
      task: asNullableText(row.task),
      detail: asNullableText(row.detail),
      since: asNullableText(row.since),
    };
  });
}

export async function fetchActiveWorkers(): Promise<FetchActiveWorkersResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${ACTIVE_WORKERS_BASE_URL}/active-workers`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false };
    }
    const body = (await res.json()) as ActiveWorkersResponse;
    return { ok: true, workers: mergeWorkers(body.workers) };
  } catch {
    return { ok: false };
  } finally {
    window.clearTimeout(timer);
  }
}

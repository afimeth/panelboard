export const OLLAMA_BASE_URL = "http://localhost:11434";
export const MODELS_POLL_MS = 5000;

const FETCH_TIMEOUT_MS = 4000;

export type ModelStatus = "idle" | "busy";

export type LocalModel = {
  name: string;
  size: number;
  status: ModelStatus;
};

export type FetchModelsResult =
  | { ok: true; models: LocalModel[] }
  | { ok: false };

type TagsResponse = {
  models?: Array<{ name?: string; model?: string; size?: number }>;
};

type PsResponse = {
  models?: Array<{ name?: string; model?: string }>;
};

async function fetchJson(path: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}${path}`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`ollama ${path} ${res.status}`);
    }
    return (await res.json()) as unknown;
  } finally {
    window.clearTimeout(timer);
  }
}

function modelName(entry: { name?: string; model?: string }): string {
  return (entry.name ?? entry.model ?? "").trim();
}

export async function fetchLocalModels(): Promise<FetchModelsResult> {
  try {
    const tags = (await fetchJson("/api/tags")) as TagsResponse;
    const list = Array.isArray(tags.models) ? tags.models : [];

    const busy = new Set<string>();
    try {
      const ps = (await fetchJson("/api/ps")) as PsResponse;
      for (const running of ps.models ?? []) {
        const name = modelName(running);
        if (name) busy.add(name);
      }
    } catch {
      // /api/ps optional — status stays idle placeholder
    }

    const models: LocalModel[] = list
      .map((entry) => {
        const name = modelName(entry);
        return {
          name,
          size: typeof entry.size === "number" ? entry.size : 0,
          status: (busy.has(name) ? "busy" : "idle") as ModelStatus,
        };
      })
      .filter((model) => model.name.length > 0);

    return { ok: true, models };
  } catch {
    return { ok: false };
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 10 || unit === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

export const ACTIVE_PROCESS_BASE_URL = "http://localhost:4317";
export const ACTIVE_PROCESS_POLL_MS = 3000;

const FETCH_TIMEOUT_MS = 5000;

export type ActiveProcess = {
  actor: string;
  label: string;
  since: string | null;
};

export type FetchActiveProcessResult =
  | { ok: true; process: ActiveProcess }
  | { ok: false };

type ActiveProcessResponse = {
  actor?: unknown;
  label?: unknown;
  since?: unknown;
};

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asSince(value: unknown): string | null {
  const text = asText(value);
  return text.length > 0 ? text : null;
}

export async function fetchActiveProcess(): Promise<FetchActiveProcessResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${ACTIVE_PROCESS_BASE_URL}/active-process`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false };
    }
    const body = (await res.json()) as ActiveProcessResponse;
    const actor = asText(body.actor) || "idle";
    const label = asText(body.label) || (actor === "idle" ? "beklemede" : "");
    return { ok: true, process: { actor, label, since: asSince(body.since) } };
  } catch {
    return { ok: false };
  } finally {
    window.clearTimeout(timer);
  }
}

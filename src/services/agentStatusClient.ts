export const AGENT_STATUS_BASE_URL = "http://localhost:4317";
export const AGENT_STATUS_POLL_MS = 8000;

const FETCH_TIMEOUT_MS = 5000;

export type AgentStatus = {
  active: boolean;
  pids: string[];
};

export type FetchAgentStatusResult =
  | { ok: true; status: AgentStatus }
  | { ok: false };

type AgentStatusResponse = {
  active?: unknown;
  pids?: unknown;
};

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function fetchAgentStatus(): Promise<FetchAgentStatusResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${AGENT_STATUS_BASE_URL}/agent-status`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false };
    }
    const body = (await res.json()) as AgentStatusResponse;
    const list = Array.isArray(body.pids) ? body.pids : [];
    const pids = list.map((entry) => asText(entry)).filter((id) => id.length > 0);
    return { ok: true, status: { active: body.active === true, pids } };
  } catch {
    return { ok: false };
  } finally {
    window.clearTimeout(timer);
  }
}

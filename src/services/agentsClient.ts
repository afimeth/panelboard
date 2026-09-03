export const AGENTS_BASE_URL = "http://localhost:4317";
export const AGENTS_POLL_MS = 5000;

const FETCH_TIMEOUT_MS = 5000;

export type AgentStatus = "idle" | "busy";

export type Agent = {
  id: string;
  label: string;
  status: AgentStatus;
  task: string | null;
  detail: string | null;
  since: string | null;
};

export type FetchAgentsResult =
  | { ok: true; agents: Agent[] }
  | { ok: false };

type AgentsResponse = {
  agents?: Array<{
    id?: unknown;
    label?: unknown;
    status?: unknown;
    task?: unknown;
    detail?: unknown;
    since?: unknown;
  }>;
};

export const IDLE_AGENTS: Agent[] = [
  { id: "agent-primary", label: "assistant", status: "idle", task: null, detail: null, since: null },
  { id: "api-agent", label: "api service", status: "idle", task: null, detail: null, since: null },
  { id: "local-llm", label: "qwen2.5-coder", status: "idle", task: null, detail: null, since: null },
];

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableText(value: unknown): string | null {
  const text = asText(value);
  return text.length > 0 ? text : null;
}

function asStatus(value: unknown): AgentStatus {
  return asText(value).toLowerCase() === "busy" ? "busy" : "idle";
}

function mergeAgents(list: AgentsResponse["agents"]): Agent[] {
  const rows = Array.isArray(list) ? list : [];
  const byId = new Map<string, (typeof rows)[number]>();
  for (const entry of rows) {
    const id = asText(entry.id);
    if (id) byId.set(id, entry);
  }
  return IDLE_AGENTS.map((fallback) => {
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

export async function fetchAgents(): Promise<FetchAgentsResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${AGENTS_BASE_URL}/agents`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false };
    }
    const body = (await res.json()) as AgentsResponse;
    return { ok: true, agents: mergeAgents(body.agents) };
  } catch {
    return { ok: false };
  } finally {
    window.clearTimeout(timer);
  }
}

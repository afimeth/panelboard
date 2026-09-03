export const TASKS_BASE_URL = "http://localhost:4317";
export const TASKS_POLL_MS = 8000;

const FETCH_TIMEOUT_MS = 5000;

export type TaskStatus = "open" | "doing" | "review" | "done";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  worker: string;
  mtimeIso: string;
};

export type FetchTasksResult =
  | { ok: true; tasks: Task[] }
  | { ok: false };

type TasksResponse = {
  tasks?: Array<{
    id?: unknown;
    title?: unknown;
    status?: unknown;
    worker?: unknown;
    mtimeIso?: unknown;
  }>;
};

const TASK_STATUSES = new Set<string>(["open", "doing", "review", "done"]);

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStatus(value: unknown): TaskStatus {
  const raw = asText(value).toLowerCase();
  if (TASK_STATUSES.has(raw)) return raw as TaskStatus;
  return "open";
}

export async function fetchTasks(): Promise<FetchTasksResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${TASKS_BASE_URL}/tasks`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false };
    }
    const body = (await res.json()) as TasksResponse;
    const list = Array.isArray(body.tasks) ? body.tasks : [];
    const tasks: Task[] = list
      .map((entry, index) => {
        const id = asText(entry.id) || `task-${index}`;
        const title = asText(entry.title) || id;
        const status = asStatus(entry.status);
        const worker = asText(entry.worker);
        const mtimeIso = asText(entry.mtimeIso);
        return { id, title, status, worker, mtimeIso };
      })
      .filter((task) => task.id.length > 0);
    return { ok: true, tasks };
  } catch {
    return { ok: false };
  } finally {
    window.clearTimeout(timer);
  }
}

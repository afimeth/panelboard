export const SESSIONS_BASE_URL = "http://localhost:4317";
export const SESSIONS_POLL_MS = 8000;

const FETCH_TIMEOUT_MS = 5000;

export type Session = {
  id: string;
  title: string;
  workspace: string;
};

export type FetchSessionsResult =
  | { ok: true; sessions: Session[] }
  | { ok: false };

type SessionsResponse = {
  sessions?: Array<{
    id?: unknown;
    title?: unknown;
    workspace?: unknown;
  }>;
};

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function fetchSessions(): Promise<FetchSessionsResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${SESSIONS_BASE_URL}/sessions`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false };
    }
    const body = (await res.json()) as SessionsResponse;
    const list = Array.isArray(body.sessions) ? body.sessions : [];
    const sessions: Session[] = list
      .map((entry, index) => {
        const title = asText(entry.title);
        const workspace = asText(entry.workspace) || title;
        const id = asText(entry.id) || `${workspace}-${index}`;
        return { id, title, workspace };
      })
      .filter((session) => session.workspace.length > 0 || session.title.length > 0);
    return { ok: true, sessions };
  } catch {
    return { ok: false };
  } finally {
    window.clearTimeout(timer);
  }
}

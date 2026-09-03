export const DOCS_FEED_BASE_URL = "http://localhost:4317";

const FETCH_TIMEOUT_MS = 5000;
export const DOCS_PREVIEW_CHARS = 500;

export type DocsFeedItem = {
  path: string;
  mtimeIso: string;
  title: string;
  preview: string;
};

export type FetchDocsFeedResult =
  | { ok: true; docs: DocsFeedItem[] }
  | { ok: false };

type DocsFeedResponse = {
  docs?: Array<{
    path?: unknown;
    mtimeIso?: unknown;
    title?: unknown;
    preview?: unknown;
  }>;
};

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function fetchDocsFeed(): Promise<FetchDocsFeedResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${DOCS_FEED_BASE_URL}/docs-feed`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false };
    }
    const body = (await res.json()) as DocsFeedResponse;
    const list = Array.isArray(body.docs) ? body.docs : [];
    const docs: DocsFeedItem[] = list
      .map((entry, index) => {
        const path = asText(entry.path) || `doc-${index}`;
        const title = asText(entry.title) || path;
        const mtimeIso = asText(entry.mtimeIso);
        const preview = typeof entry.preview === "string" ? entry.preview : "";
        return { path, mtimeIso, title, preview };
      })
      .filter((doc) => doc.path.length > 0);
    return { ok: true, docs };
  } catch {
    return { ok: false };
  } finally {
    window.clearTimeout(timer);
  }
}

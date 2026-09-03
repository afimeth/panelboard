import { useCallback, useEffect, useState } from "react";
import {
  DOCS_PREVIEW_CHARS,
  fetchDocsFeed,
  type DocsFeedItem,
  type FetchDocsFeedResult,
} from "../services/docsFeedClient";

type PanelState = FetchDocsFeedResult | { loading: true };

function formatMtime(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("tr-TR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function clipPreview(text: string): { text: string; truncated: boolean } {
  const truncated = text.length >= DOCS_PREVIEW_CHARS;
  return { text: text.slice(0, DOCS_PREVIEW_CHARS), truncated };
}

export default function RecentDocsPanel(): JSX.Element {
  const [state, setState] = useState<PanelState>({ loading: true });
  const [openPath, setOpenPath] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const result = await fetchDocsFeed();
    setState(result);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchDocsFeed().then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const connected = "ok" in state && state.ok;
  const docs = connected ? state.docs : [];

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        minHeight: 0,
        minWidth: 0,
        flex: 1,
        overflow: "hidden",
        padding: "10px 12px",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          letterSpacing: "0.1em",
          fontSize: "15px",
          marginBottom: "8px",
          flexShrink: 0,
        }}
      >
        <span>son belgeler</span>
        <button
          type="button"
          onClick={() => {
            void load();
          }}
          style={{
            background: "transparent",
            border: "1px solid var(--border-glow)",
            color: "var(--accent-cyan)",
            fontFamily: "inherit",
            fontSize: "13px",
            letterSpacing: "0.08em",
            cursor: "pointer",
            padding: "2px 8px",
            borderRadius: "6px",
          }}
        >
          yenile
        </button>
      </header>
      <div className="glow-line" style={{ marginBottom: "8px", flexShrink: 0 }} />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {"loading" in state ? (
          <HudLine text="taraniyor..." />
        ) : !state.ok ? (
          <HudLine text="baglanti yok" tone="offline" />
        ) : docs.length === 0 ? (
          <HudLine text="kayit yok" />
        ) : (
          docs.map((doc) => (
            <DocRow
              key={doc.path}
              doc={doc}
              open={openPath === doc.path}
              onToggle={() => {
                setOpenPath((current) => (current === doc.path ? null : doc.path));
              }}
            />
          ))
        )}
      </div>
    </section>
  );
}

function HudLine({
  text,
  tone = "dim",
}: {
  text: string;
  tone?: "dim" | "offline";
}): JSX.Element {
  return (
    <div
      style={{
        fontSize: "14px",
        color: tone === "offline" ? "var(--accent-violet)" : "var(--text-dim)",
        letterSpacing: "0.08em",
      }}
    >
      {text}
    </div>
  );
}

function DocRow({
  doc,
  open,
  onToggle,
}: {
  doc: DocsFeedItem;
  open: boolean;
  onToggle: () => void;
}): JSX.Element {
  const clipped = clipPreview(doc.preview);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          width: "100%",
          minWidth: 0,
          background: "transparent",
          border: "none",
          padding: 0,
          margin: 0,
          color: "inherit",
          fontFamily: "inherit",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "8px",
            fontSize: "13px",
            letterSpacing: "0.06em",
          }}
        >
          <span
            style={{
              color: "var(--accent-cyan)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {doc.title}
          </span>
          <span style={{ color: "var(--text-dim)", flexShrink: 0 }}>{formatMtime(doc.mtimeIso)}</span>
        </div>
        <span
          style={{
            fontSize: "13px",
            color: "var(--text-dim)",
            letterSpacing: "0.04em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {doc.path}
        </span>
      </button>
      {open ? (
        <div
          style={{
            fontSize: "13px",
            color: "var(--text-dim)",
            letterSpacing: "0.02em",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            border: "1px solid var(--border-glow)",
            borderRadius: "6px",
            padding: "6px 8px",
            background: "rgba(79, 209, 255, 0.06)",
          }}
        >
          {clipped.text}
          {clipped.truncated ? (
            <div style={{ marginTop: "6px", color: "var(--accent-violet)", letterSpacing: "0.08em" }}>
              devamı var
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

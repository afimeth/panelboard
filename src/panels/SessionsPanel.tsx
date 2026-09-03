import { useEffect, useState } from "react";
import {
  fetchSessions,
  SESSIONS_POLL_MS,
  type FetchSessionsResult,
  type Session,
} from "../services/sessionsClient";

type PanelState = FetchSessionsResult | { loading: true };

export default function SessionsPanel(): JSX.Element {
  const [state, setState] = useState<PanelState>({ loading: true });

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      const result = await fetchSessions();
      if (!cancelled) setState(result);
    };

    void load();
    const id = window.setInterval(() => {
      void load();
    }, SESSIONS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const connected = "ok" in state && state.ok;
  const sessions = connected ? state.sessions : [];

  return (
    <section
      className="glass-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        flex: 1,
        minHeight: 0,
        padding: "12px",
        overflow: "hidden",
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
        }}
      >
        <span>SESSIONS</span>
        <span style={{ color: "var(--text-dim)", letterSpacing: "0.08em" }}>
          {"loading" in state ? "…" : connected ? `${sessions.length}` : "offline"}
        </span>
      </header>
      <div className="glow-line" style={{ marginBottom: "12px" }} />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {"loading" in state ? (
          <HudMessage text="taraniyor..." />
        ) : !state.ok ? (
          <HudMessage text="baglanti yok" tone="offline" />
        ) : sessions.length === 0 ? (
          <HudMessage text="acik pencere yok" />
        ) : (
          sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))
        )}
      </div>
    </section>
  );
}

function HudMessage({
  text,
  tone = "dim",
}: {
  text: string;
  tone?: "dim" | "offline";
}): JSX.Element {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: tone === "offline" ? "var(--accent-violet)" : "var(--text-dim)",
        fontSize: "15px",
        letterSpacing: "0.08em",
        padding: "16px",
      }}
    >
      {text}
    </div>
  );
}

function SessionCard({ session }: { session: Session }): JSX.Element {
  const pip = "var(--accent-cyan)";
  const label = session.workspace || session.title;

  return (
    <article
      className="glass-panel"
      style={{
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        boxShadow: `0 0 16px -10px ${pip}`,
      }}
    >
      <div
        style={{
          fontSize: "16px",
          color: "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={session.title || label}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "14px",
          color: "var(--text-dim)",
          letterSpacing: "0.05em",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
            paddingRight: "8px",
          }}
          title={session.title}
        >
          {session.title}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: pip,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: pip,
              boxShadow: `0 0 8px ${pip}`,
            }}
          />
          active
        </span>
      </div>
    </article>
  );
}

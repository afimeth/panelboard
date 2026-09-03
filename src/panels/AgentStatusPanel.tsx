import { useEffect, useState } from "react";
import {
  AGENT_STATUS_POLL_MS,
  fetchAgentStatus,
  type FetchAgentStatusResult,
} from "../services/agentStatusClient";

type PanelState = FetchAgentStatusResult | { loading: true };

export default function AgentStatusPanel(): JSX.Element {
  const [state, setState] = useState<PanelState>({ loading: true });

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      const result = await fetchAgentStatus();
      if (!cancelled) setState(result);
    };

    void load();
    const id = window.setInterval(() => {
      void load();
    }, AGENT_STATUS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const connected = "ok" in state && state.ok;
  const active = connected && state.status.active;
  const pids = connected ? state.status.pids : [];

  let badge = "offline";
  if ("loading" in state) badge = "…";
  else if (connected) badge = active ? "aktif" : "pasif";

  const pip = active ? "var(--accent-cyan)" : "var(--text-dim)";

  return (
    <section
      className="glass-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        flexShrink: 0,
        padding: "10px 12px",
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
        <span>agent</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: connected ? pip : "var(--accent-violet)",
            letterSpacing: "0.08em",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: connected ? pip : "var(--accent-violet)",
              boxShadow: `0 0 8px ${connected ? pip : "var(--accent-violet)"}`,
            }}
          />
          {badge}
        </span>
      </header>
      <div className="glow-line" style={{ marginBottom: "8px" }} />
      <div
        style={{
          fontSize: "14px",
          color: "var(--text-dim)",
          letterSpacing: "0.05em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={pids.join(", ")}
      >
        {"loading" in state
          ? "taraniyor..."
          : !connected
            ? "baglanti yok"
            : pids.length === 0
              ? "pid yok"
              : `pid ${pids.join(", ")}`}
      </div>
    </section>
  );
}

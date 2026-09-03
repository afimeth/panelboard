import { useEffect, useState } from "react";
import {
  AGENTS_POLL_MS,
  fetchAgents,
  IDLE_AGENTS,
  type Agent,
  type FetchAgentsResult,
} from "../services/agentsClient";

type PanelState = FetchAgentsResult | { loading: true };

export default function ActiveModelsPanel(): JSX.Element {
  const [state, setState] = useState<PanelState>({ loading: true });
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      const result = await fetchAgents();
      if (!cancelled) setState(result);
    };

    void load();
    const id = window.setInterval(() => {
      void load();
    }, AGENTS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const connected = "ok" in state && state.ok;
  const agents = connected ? state.agents : IDLE_AGENTS;
  const busyCount = agents.filter((a) => a.status === "busy").length;

  const toggle = (id: string): void => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
        <span>AKTIF MODELLER</span>
        <span style={{ color: "var(--text-dim)", letterSpacing: "0.08em" }}>
          {"loading" in state ? "…" : connected ? `${busyCount} busy` : "offline"}
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
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            open={Boolean(openIds[agent.id])}
            onToggle={() => toggle(agent.id)}
          />
        ))}
      </div>
    </section>
  );
}

function AgentCard({
  agent,
  open,
  onToggle,
}: {
  agent: Agent;
  open: boolean;
  onToggle: () => void;
}): JSX.Element {
  const busy = agent.status === "busy";
  const pip = busy ? "var(--accent-cyan)" : "var(--text-dim)";
  const labelColor = busy ? "var(--accent-cyan)" : "var(--text-dim)";

  return (
    <article
      className="glass-panel"
      onClick={onToggle}
      style={{
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        cursor: "pointer",
        color: labelColor,
        boxShadow: busy
          ? `0 0 18px -6px var(--accent-cyan), var(--shadow-depth)`
          : "var(--shadow-depth)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontSize: "16px",
            color: busy ? "var(--accent-cyan)" : "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={agent.label}
        >
          {agent.label}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: pip,
            textTransform: "lowercase",
            flexShrink: 0,
            fontSize: "14px",
            letterSpacing: "0.05em",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: pip,
              boxShadow: busy ? `0 0 8px ${pip}` : "none",
            }}
          />
          {agent.status}
        </span>
      </div>
      {agent.task ? (
        <div
          style={{
            fontSize: "14px",
            color: "var(--text-dim)",
            letterSpacing: "0.05em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={agent.task}
        >
          {agent.task}
        </div>
      ) : null}
      {open ? (
        <div
          style={{
            marginTop: "2px",
            paddingTop: "8px",
            borderTop: "1px solid var(--border-glow)",
            fontSize: "14px",
            color: "var(--text-dim)",
            letterSpacing: "0.04em",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {agent.detail ?? "detay yok"}
        </div>
      ) : null}
    </article>
  );
}

import { useEffect, useState } from "react";
import {
  ACTIVE_WORKERS_POLL_MS,
  fetchActiveWorkers,
  IDLE_WORKERS,
  type ActiveWorker,
  type FetchActiveWorkersResult,
} from "../services/activeWorkersClient";

type PanelState = FetchActiveWorkersResult | { loading: true };

export default function ActiveModelsPanel(): JSX.Element {
  const [state, setState] = useState<PanelState>({ loading: true });
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      const result = await fetchActiveWorkers();
      if (!cancelled) setState(result);
    };

    void load();
    const id = window.setInterval(() => {
      void load();
    }, ACTIVE_WORKERS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const connected = "ok" in state && state.ok;
  const workers = connected ? state.workers : IDLE_WORKERS;
  const busyCount = workers.filter((w) => w.status === "busy").length;

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
        {workers.map((worker) => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            open={Boolean(openIds[worker.id])}
            onToggle={() => toggle(worker.id)}
          />
        ))}
      </div>
    </section>
  );
}

function WorkerCard({
  worker,
  open,
  onToggle,
}: {
  worker: ActiveWorker;
  open: boolean;
  onToggle: () => void;
}): JSX.Element {
  const busy = worker.status === "busy";
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
          title={worker.label}
        >
          {worker.label}
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
          {worker.status}
        </span>
      </div>
      {worker.task ? (
        <div
          style={{
            fontSize: "14px",
            color: "var(--text-dim)",
            letterSpacing: "0.05em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={worker.task}
        >
          {worker.task}
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
          {worker.detail ?? "detay yok"}
        </div>
      ) : null}
    </article>
  );
}

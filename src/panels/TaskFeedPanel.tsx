import { useEffect, useState } from "react";
import {
  fetchTasks,
  TASKS_POLL_MS,
  type FetchTasksResult,
  type Task,
  type TaskStatus,
} from "../services/tasksClient";

type PanelState = FetchTasksResult | { loading: true };

const STATUS_COLOR: Record<TaskStatus, string> = {
  open: "var(--accent-cyan)",
  doing: "#fbbf24",
  review: "var(--accent-violet)",
  done: "#4ade80",
};

function asciiLower(value: string): string {
  return value
    .replace(/[Çç]/g, "c")
    .replace(/[Ğğ]/g, "g")
    .replace(/[İıI]/g, "i")
    .replace(/[Öö]/g, "o")
    .replace(/[Şş]/g, "s")
    .replace(/[Üü]/g, "u")
    .replace(/[Ââ]/g, "a")
    .toLowerCase();
}

export default function TaskFeedPanel(): JSX.Element {
  const [state, setState] = useState<PanelState>({ loading: true });

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      const result = await fetchTasks();
      if (!cancelled) setState(result);
    };

    void load();
    const id = window.setInterval(() => {
      void load();
    }, TASKS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const connected = "ok" in state && state.ok;
  const tasks = connected ? state.tasks : [];

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
        <span>gorev akisi</span>
        <span style={{ color: "var(--text-dim)", letterSpacing: "0.08em" }}>
          {"loading" in state ? "..." : connected ? `${tasks.length}` : "offline"}
        </span>
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
        ) : tasks.length === 0 ? (
          <HudLine text="kayit yok" />
        ) : (
          tasks.map((task) => <TaskRow key={task.id} task={task} />)
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

function TaskRow({ task }: { task: Task }): JSX.Element {
  const color = STATUS_COLOR[task.status];
  const title = asciiLower(task.title);
  const worker = asciiLower(task.worker || "unknown");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
          {asciiLower(task.id)}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
          />
          {task.status}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "8px",
          fontSize: "13px",
          color: "var(--text-dim)",
          letterSpacing: "0.04em",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
          title={title}
        >
          {title}
        </span>
        <span style={{ flexShrink: 0 }}>{worker}</span>
      </div>
    </div>
  );
}

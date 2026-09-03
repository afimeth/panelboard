import { useCallback, useEffect, useState } from "react";
import {
  fetchApiUsage,
  type ApiUsageEntry,
  type FetchApiUsageResult,
} from "../services/apiUsageClient";

type PanelState = FetchApiUsageResult | { loading: true };

type TaskRow = {
  task: string;
  tokens: number;
  cost_usd: number;
};

function groupByTask(entries: ApiUsageEntry[]): TaskRow[] {
  const map = new Map<string, TaskRow>();
  const order: string[] = [];
  for (const entry of entries) {
    const prev = map.get(entry.task);
    if (prev) {
      prev.tokens += entry.tokens;
      prev.cost_usd += entry.cost_usd;
    } else {
      map.set(entry.task, {
        task: entry.task,
        tokens: entry.tokens,
        cost_usd: entry.cost_usd,
      });
      order.push(entry.task);
    }
  }
  return order.map((task) => map.get(task)!);
}

function formatTokens(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function formatUsd(n: number): string {
  return n.toFixed(3);
}

export default function ApiUsagePanel(): JSX.Element {
  const [state, setState] = useState<PanelState>({ loading: true });

  const load = useCallback(async (): Promise<void> => {
    const result = await fetchApiUsage();
    setState(result);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchApiUsage().then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const connected = "ok" in state && state.ok;
  const entries = connected ? state.usage.entries : [];
  const rows = groupByTask(entries);
  const maxCost = rows.reduce((max, row) => Math.max(max, row.cost_usd), 0);
  const totalTokens = connected ? state.usage.totalTokens : 0;
  const totalCostUsd = connected ? state.usage.totalCostUsd : 0;

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
        <span>api kullanim</span>
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
      {"loading" in state ? (
        <HudLine text="taraniyor..." />
      ) : !connected ? (
        <HudLine text="baglanti yok" tone="offline" />
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
              color: "var(--text-dim)",
              letterSpacing: "0.05em",
              marginBottom: "8px",
              flexShrink: 0,
            }}
          >
            <span>{formatTokens(totalTokens)} token</span>
            <span>{formatUsd(totalCostUsd)} usd</span>
          </div>
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
            {rows.length === 0 ? (
              <HudLine text="kayit yok" />
            ) : (
              rows.map((row) => (
                <UsageRow key={row.task} row={row} maxCost={maxCost} />
              ))
            )}
          </div>
        </>
      )}
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

function UsageRow({
  row,
  maxCost,
}: {
  row: TaskRow;
  maxCost: number;
}): JSX.Element {
  const pct = maxCost > 0 ? Math.max(0, Math.min(100, (row.cost_usd / maxCost) * 100)) : 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontSize: "13px",
          letterSpacing: "0.06em",
          color: "var(--text-dim)",
        }}
      >
        <span style={{ color: "var(--accent-cyan)" }}>{row.task.toLowerCase()}</span>
        <span>
          {formatTokens(row.tokens)} · {formatUsd(row.cost_usd)} usd
        </span>
      </div>
      <div
        style={{
          height: "8px",
          border: "1px solid var(--border-glow)",
          borderRadius: "4px",
          overflow: "hidden",
          background: "rgba(79, 209, 255, 0.08)",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "linear-gradient(90deg, var(--accent-cyan), var(--accent-violet))",
            boxShadow: "0 0 8px var(--accent-cyan)",
          }}
        />
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  SYSTEM_STATS_POLL_MS,
  fetchSystemStats,
  type FetchSystemStatsResult,
} from "../services/systemStatsClient";

type PanelState = FetchSystemStatsResult | { loading: true };

export default function SystemStatsPanel(): JSX.Element {
  const [state, setState] = useState<PanelState>({ loading: true });

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      const result = await fetchSystemStats();
      if (!cancelled) setState(result);
    };

    void load();
    const id = window.setInterval(() => {
      void load();
    }, SYSTEM_STATS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const connected = "ok" in state && state.ok;
  const cpu = connected ? state.stats.cpuPercent : 0;
  const memUsed = connected ? state.stats.memUsedMb : 0;
  const memTotal = connected ? state.stats.memTotalMb : 0;

  let badge = "offline";
  if ("loading" in state) badge = "…";
  else if (connected) badge = `${Math.round(cpu)}%`;

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
        <span>sistem</span>
        <span
          style={{
            color: connected ? "var(--text-dim)" : "var(--accent-violet)",
            letterSpacing: "0.08em",
          }}
        >
          {badge}
        </span>
      </header>
      <div className="glow-line" style={{ marginBottom: "8px" }} />
      {"loading" in state ? (
        <HudLine text="taraniyor..." />
      ) : !connected ? (
        <HudLine text="baglanti yok" tone="offline" />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            fontSize: "14px",
            color: "var(--text-dim)",
            letterSpacing: "0.05em",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>cpu</span>
            <span>{Math.round(cpu)}%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>ram</span>
            <span>
              {Math.round(memUsed)} / {Math.round(memTotal)} mb
            </span>
          </div>
        </div>
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

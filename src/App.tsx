import { useEffect, useState } from "react";
import AgentStatusPanel from "./panels/AgentStatusPanel";
import ActiveModelsPanel from "./panels/ActiveModelsPanel";
import SessionsPanel from "./panels/SessionsPanel";
import SystemStatsPanel from "./panels/SystemStatsPanel";
import DockviewHost from "./panels/dock/DockviewHost";
import WorkflowCanvas from "./panels/WorkflowCanvas";

function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString("tr-TR", { hour12: false });
}

export default function App(): JSX.Element {
  const time = useClock();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "48px 1fr 220px",
        gridTemplateColumns: "72px 1fr 300px",
        gridTemplateAreas: `"header header header" "nav main aside" "nav dock dock"`,
        height: "100vh",
        gap: "8px",
        padding: "8px",
      }}
    >
      <header
        className="glass-panel"
        style={{
          gridArea: "header",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          fontSize: "16px",
          letterSpacing: "0.08em",
        }}
      >
        <span>PANELBOARD</span>
        <span style={{ color: "var(--text-dim)" }}>SYS NOMINAL</span>
        <span>{time}</span>
      </header>

      <nav
        className="glass-panel"
        style={{
          gridArea: "nav",
          gridRow: "2 / 4",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          padding: "16px 0",
        }}
      >
        <div className="glow-line" style={{ width: "60%" }} />
      </nav>

      <main
        className="glass-panel"
        style={{
          gridArea: "main",
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <WorkflowCanvas />
      </main>

      <aside
        style={{
          gridArea: "aside",
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <ActiveModelsPanel />
        <SessionsPanel />
        <AgentStatusPanel />
        <SystemStatsPanel />
      </aside>

      <div className="glass-panel dock" style={{ gridArea: "dock", overflow: "hidden", minHeight: 0 }}>
        <DockviewHost />
      </div>
    </div>
  );
}

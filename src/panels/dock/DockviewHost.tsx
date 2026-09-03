import { useCallback, useState } from "react";
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
} from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import ApiUsagePanel from "../ApiUsagePanel";
import RecentDocsPanel from "../RecentDocsPanel";
import TaskFeedPanel from "../TaskFeedPanel";

type PanelDef = {
  id: string;
  component: string;
  title: string;
};

const PANEL_DEFS: readonly PanelDef[] = [
  { id: "taskFeed", component: "taskFeed", title: "Tasks" },
  { id: "apiUsage", component: "apiUsage", title: "API Usage" },
  { id: "recentDocs", component: "recentDocs", title: "Recent Docs" },
];

function TaskFeedDock(_props: IDockviewPanelProps): JSX.Element {
  return <TaskFeedPanel />;
}

function ApiUsageDock(_props: IDockviewPanelProps): JSX.Element {
  return <ApiUsagePanel />;
}

function RecentDocsDock(_props: IDockviewPanelProps): JSX.Element {
  return <RecentDocsPanel />;
}

const components = {
  taskFeed: TaskFeedDock,
  apiUsage: ApiUsageDock,
  recentDocs: RecentDocsDock,
};

const hudTheme = {
  name: "hud",
  className: "dockview-theme-hud",
  colorScheme: "dark" as const,
};

function openPanel(api: DockviewApi, def: PanelDef): void {
  if (api.getPanel(def.id)) return;
  const last = api.panels[api.panels.length - 1];
  if (last) {
    api.addPanel({
      id: def.id,
      component: def.component,
      title: def.title,
      position: { referencePanel: last.id, direction: "right" },
    });
    return;
  }
  api.addPanel({
    id: def.id,
    component: def.component,
    title: def.title,
  });
}

export default function DockviewHost(): JSX.Element {
  const [api, setApi] = useState<DockviewApi | null>(null);
  const [openIds, setOpenIds] = useState<string[]>([]);

  const syncOpenIds = useCallback((dock: DockviewApi): void => {
    setOpenIds(dock.panels.map((panel) => panel.id));
  }, []);

  const onReady = useCallback(
    (event: DockviewReadyEvent): void => {
      const dock = event.api;
      setApi(dock);
      for (const def of PANEL_DEFS) {
        openPanel(dock, def);
      }
      syncOpenIds(dock);
      dock.onDidAddPanel(() => {
        syncOpenIds(dock);
      });
      dock.onDidRemovePanel(() => {
        syncOpenIds(dock);
      });
    },
    [syncOpenIds],
  );

  const missing = PANEL_DEFS.filter((def) => !openIds.includes(def.id));

  return (
    <div
      className="dockview-theme-hud"
      style={{ height: "100%", width: "100%", position: "relative" }}
    >
      <DockviewReact
        components={components}
        onReady={onReady}
        className="dockview-theme-hud"
        theme={hudTheme}
      />
      {api && missing.length > 0 ? (
        <div
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
            zIndex: 6,
            display: "flex",
            gap: 6,
          }}
        >
          {missing.map((def) => (
            <button
              key={def.id}
              type="button"
              onClick={() => {
                openPanel(api, def);
              }}
              style={{
                background: "var(--bg-panel)",
                border: "1px solid var(--border-glow)",
                color: "var(--accent-cyan)",
                fontFamily: "inherit",
                fontSize: "11px",
                letterSpacing: "0.08em",
                cursor: "pointer",
                padding: "2px 8px",
                borderRadius: "6px",
              }}
            >
              + {def.title}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

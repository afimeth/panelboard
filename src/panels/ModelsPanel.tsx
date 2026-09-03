import { useEffect, useState } from "react";
import {
  fetchLocalModels,
  formatBytes,
  MODELS_POLL_MS,
  type FetchModelsResult,
  type LocalModel,
} from "../services/ollamaClient";

type PanelState = FetchModelsResult | { loading: true };

export default function ModelsPanel(): JSX.Element {
  const [state, setState] = useState<PanelState>({ loading: true });

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      const result = await fetchLocalModels();
      if (!cancelled) setState(result);
    };

    void load();
    const id = window.setInterval(() => {
      void load();
    }, MODELS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const connected = "ok" in state && state.ok;
  const models = connected ? state.models : [];

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
        <span>MODELS</span>
        <span style={{ color: "var(--text-dim)", letterSpacing: "0.08em" }}>
          {"loading" in state ? "…" : connected ? `${models.length}` : "offline"}
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
        ) : models.length === 0 ? (
          <HudMessage text="kayitli model yok" />
        ) : (
          models.map((model) => <ModelCard key={model.name} model={model} />)
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

function ModelCard({ model }: { model: LocalModel }): JSX.Element {
  const busy = model.status === "busy";
  const pip = busy ? "var(--accent-violet)" : "var(--accent-cyan)";

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
        title={model.name}
      >
        {model.name}
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
        <span>{formatBytes(model.size)}</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: pip,
            textTransform: "lowercase",
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
          {model.status}
        </span>
      </div>
    </article>
  );
}

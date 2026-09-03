import { useEffect, useState } from "react";
import {
  ACTIVE_PROCESS_POLL_MS,
  fetchActiveProcess,
  type ActiveProcess,
} from "../services/activeProcessClient";

const IDLE: ActiveProcess = { actor: "idle", label: "beklemede", since: null };

export default function ActiveProcessPopup(): JSX.Element {
  const [process, setProcess] = useState<ActiveProcess>(IDLE);

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      const result = await fetchActiveProcess();
      if (cancelled) return;
      if (result.ok) setProcess(result.process);
    };

    void load();
    const id = window.setInterval(() => {
      void load();
    }, ACTIVE_PROCESS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const actor = process.actor.trim() || "idle";
  const visible = actor !== "idle";
  const label = process.label.trim() || (visible ? "calisiyor" : "beklemede");

  return (
    <div
      className={`active-process-overlay${visible ? " is-visible" : ""}`}
      aria-hidden={!visible}
    >
      <article className="active-process-card" key={actor}>
        <span className="active-process-card__pip" />
        <div className="active-process-card__actor">{actor}</div>
        <div className="active-process-card__label">{label}</div>
      </article>
    </div>
  );
}

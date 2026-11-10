import { useEffect } from "react";
import { useEditorStore } from "../store";

// "Il lavoro non è salvato": asked before New / Open would replace what is on the platform.
export function UnsavedDialog() {
  const action = useEditorStore((s) => s.pendingAction);
  const busy = useEditorStore((s) => s.busy);
  const resolve = useEditorStore((s) => s.resolvePending);

  useEffect(() => {
    if (!action) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        void resolve("cancel");
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [action, resolve]);

  if (!action) return null;
  const what = action.kind === "new" ? "creare un nuovo progetto" : `aprire «${action.file.name}»`;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h3>Il lavoro non è salvato</h3>
        <p>Vuoi salvarlo prima di {what}? Se non lo salvi, le modifiche andranno perse.</p>
        <div className="modal-actions">
          <button className="primary-btn" disabled={busy} onClick={() => void resolve("save")}>
            Salva e continua
          </button>
          <button className="ghost-btn danger" disabled={busy} onClick={() => void resolve("discard")}>
            Non salvare
          </button>
          <button className="ghost-btn" onClick={() => void resolve("cancel")}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}

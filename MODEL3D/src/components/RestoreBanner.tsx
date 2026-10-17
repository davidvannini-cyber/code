import { useEditorStore } from "../store";

const time = (ms: number) => new Date(ms).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Shown when the previous session left an automatic copy (typically after a crash).
// Automatic copies stay paused until the user picks, so the old one is never overwritten blindly.
export function RestoreBanner() {
  const offer = useEditorStore((s) => s.autosaveOffer);
  const engineReady = useEditorStore((s) => s.engineReady);
  const restore = useEditorStore((s) => s.restoreAutosave);
  const discard = useEditorStore((s) => s.discardAutosave);
  if (!offer) return null;

  return (
    <div className="restore-banner">
      <span>Lavoro non salvato trovato · {time(offer.savedAt)}</span>
      <button className="primary-btn small" disabled={!engineReady} onClick={restore}>
        Ripristina
      </button>
      <button className="ghost-btn" onClick={discard}>
        Scarta
      </button>
    </div>
  );
}

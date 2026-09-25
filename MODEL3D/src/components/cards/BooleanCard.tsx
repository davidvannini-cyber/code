import { useEditorStore } from "../../store";
import { Icon } from "../icons/Icon";

export function BooleanCard() {
  const engineReady = useEditorStore((s) => s.engineReady);
  const busy = useEditorStore((s) => s.busy);
  const bodyCount = useEditorStore((s) => s.bodies.length);
  const booleanPick = useEditorStore((s) => s.booleanPick);
  const startBooleanPick = useEditorStore((s) => s.startBooleanPick);
  const cancelBooleanPick = useEditorStore((s) => s.cancelBooleanPick);
  const disabled = !engineReady || busy || bodyCount < 2;

  return (
    <div className="card">
      <div className="card-head">Booleane</div>
      <div className="card-body">
        {booleanPick ? (
          <>
            <p className="hint-text">Tocca 2 corpi nella scena ({booleanPick.picked.length}/2).</p>
            <button className="ghost-btn full" onClick={cancelBooleanPick}>
              Annulla
            </button>
          </>
        ) : (
          <div className="tile-list">
            <button className="tile-btn" disabled={disabled} onClick={() => startBooleanPick("union")}>
              <Icon name="union" size={18} /> Unisci
            </button>
            <button className="tile-btn" disabled={disabled} onClick={() => startBooleanPick("subtract")}>
              <Icon name="subtract" size={18} /> Sottrai
            </button>
            <button className="tile-btn" disabled={disabled} onClick={() => startBooleanPick("intersect")}>
              <Icon name="intersect" size={18} /> Interseca
            </button>
            {bodyCount < 2 && <p className="hint-text muted">Servono almeno 2 corpi.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

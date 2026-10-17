import { NumberInput } from "../NumberInput";
import { useEditorStore } from "../../store";

// Choosing a 2D shape extrudes it at once; the height field then edits that
// extrusion live (no apply button), like the parameter fields.
export function ExtrudeCard() {
  const engineReady = useEditorStore((s) => s.engineReady);
  const busy = useEditorStore((s) => s.busy);
  const pendingShapes = useEditorStore((s) => s.pendingShapes);
  const extrudePickActive = useEditorStore((s) => s.extrudePickActive);
  const extrudeEditId = useEditorStore((s) => s.extrudeEditId);
  const extrudeHeight = useEditorStore((s) => s.extrudeHeight);
  const startExtrudeTool = useEditorStore((s) => s.startExtrudeTool);
  const cancelExtrudeTool = useEditorStore((s) => s.cancelExtrudeTool);
  const setExtrudeHeight = useEditorStore((s) => s.setExtrudeHeight);
  const disabled = !engineReady || busy;

  return (
    <div className="card">
      <div className="card-head">Estrusione</div>
      <div className="card-body">
        {extrudePickActive ? (
          <>
            <p className="hint-text">Tocca una forma 2D nella scena.</p>
            <button className="ghost-btn full" onClick={cancelExtrudeTool}>
              Annulla
            </button>
          </>
        ) : extrudeEditId ? (
          <>
            <label className="sk-field">
              <span>Altezza (mm)</span>
              <NumberInput step={1} min={0.1} value={extrudeHeight} onValue={(v) => setExtrudeHeight(v)} />
            </label>
            <p className="hint-text muted">Si applica mentre cambi l'altezza.</p>
            <div className="sk-row">
              <button className="ghost-btn" disabled={disabled || pendingShapes.length === 0} onClick={startExtrudeTool}>
                Altra forma
              </button>
              <button className="ghost-btn" onClick={cancelExtrudeTool}>
                Fine
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="hint-text">Seleziona una forma 2D da estrudere in solido.</p>
            <button className="primary-btn" disabled={disabled || pendingShapes.length === 0} onClick={startExtrudeTool}>
              Estrudi forma 2D
            </button>
            {pendingShapes.length === 0 && <p className="hint-text muted">Crea prima una forma con lo strumento Schizzo.</p>}
          </>
        )}
      </div>
    </div>
  );
}

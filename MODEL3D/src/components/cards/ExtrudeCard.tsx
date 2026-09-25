import { useEditorStore } from "../../store";

export function ExtrudeCard() {
  const engineReady = useEditorStore((s) => s.engineReady);
  const busy = useEditorStore((s) => s.busy);
  const pendingShapes = useEditorStore((s) => s.pendingShapes);
  const extrudePickActive = useEditorStore((s) => s.extrudePickActive);
  const extrudeTargetId = useEditorStore((s) => s.extrudeTargetId);
  const extrudeHeight = useEditorStore((s) => s.extrudeHeight);
  const startExtrudeTool = useEditorStore((s) => s.startExtrudeTool);
  const cancelExtrudeTool = useEditorStore((s) => s.cancelExtrudeTool);
  const setExtrudeHeight = useEditorStore((s) => s.setExtrudeHeight);
  const applyExtrusion = useEditorStore((s) => s.applyExtrusion);
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
        ) : extrudeTargetId ? (
          <>
            <label className="sk-field">
              <span>Altezza (mm)</span>
              <input type="number" step="1" value={extrudeHeight} onChange={(e) => setExtrudeHeight(parseFloat(e.target.value) || 0.1)} />
            </label>
            <button className="primary-btn" onClick={applyExtrusion}>
              APPLICA ESTRUSIONE
            </button>
            <button className="ghost-btn full" onClick={cancelExtrudeTool}>
              Annulla
            </button>
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

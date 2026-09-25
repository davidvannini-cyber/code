import { useEditorStore } from "../../store";

export function FilletCard() {
  const engineReady = useEditorStore((s) => s.engineReady);
  const busy = useEditorStore((s) => s.busy);
  const pendingShapes = useEditorStore((s) => s.pendingShapes);
  const filletPickActive = useEditorStore((s) => s.filletPickActive);
  const filletTargetShapeId = useEditorStore((s) => s.filletTargetShapeId);
  const filletCornerIndex = useEditorStore((s) => s.filletCornerIndex);
  const filletKind = useEditorStore((s) => s.filletKind);
  const filletAmount = useEditorStore((s) => s.filletAmount);
  const startFilletTool = useEditorStore((s) => s.startFilletTool);
  const cancelFilletTool = useEditorStore((s) => s.cancelFilletTool);
  const setFilletKind = useEditorStore((s) => s.setFilletKind);
  const setFilletAmount = useEditorStore((s) => s.setFilletAmount);
  const applyFillet = useEditorStore((s) => s.applyFillet);
  const disabled = !engineReady || busy;

  return (
    <div className="card">
      <div className="card-head">Raccordo/Smusso · spigolo schizzo 2D</div>
      <div className="card-body">
        {filletPickActive ? (
          <>
            <p className="hint-text">Tocca uno spigolo di una forma 2D nella scena.</p>
            <button className="ghost-btn full" onClick={cancelFilletTool}>
              Annulla
            </button>
          </>
        ) : filletTargetShapeId && filletCornerIndex !== null ? (
          <>
            <div className="segmented">
              <button className={filletKind === "fillet" ? "active" : ""} onClick={() => setFilletKind("fillet")}>
                Raccordo
              </button>
              <button className={filletKind === "chamfer" ? "active" : ""} onClick={() => setFilletKind("chamfer")}>
                Smusso
              </button>
            </div>
            <label className="sk-field">
              <span>Misura (mm)</span>
              <input type="number" step="0.5" min="0.1" value={filletAmount} onChange={(e) => setFilletAmount(parseFloat(e.target.value) || 0.1)} />
            </label>
            <button className="primary-btn" onClick={applyFillet}>
              APPLICA RACCORDO/SMUSSO
            </button>
            <button className="ghost-btn full" onClick={cancelFilletTool}>
              Annulla
            </button>
          </>
        ) : (
          <>
            <p className="hint-text">Solo su spigoli di forme 2D non ancora estruse (limite del motore CAD).</p>
            <button className="primary-btn" disabled={disabled || pendingShapes.length === 0} onClick={startFilletTool}>
              Raccorda/smussa spigolo
            </button>
            {pendingShapes.length === 0 && <p className="hint-text muted">Crea prima una forma con lo strumento Schizzo.</p>}
          </>
        )}
      </div>
    </div>
  );
}

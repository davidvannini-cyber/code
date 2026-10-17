import { NumberInput } from "../NumberInput";
import { useEditorStore } from "../../store";

// Keeps the focus in the amount field when clicking Raccordo/Smusso/Annulla, so
// only Tab, Enter or a click elsewhere counts as "leaving the field".
const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault();

export function FilletCard() {
  const engineReady = useEditorStore((s) => s.engineReady);
  const busy = useEditorStore((s) => s.busy);
  const pendingShapes = useEditorStore((s) => s.pendingShapes);
  const filletPickActive = useEditorStore((s) => s.filletPickActive);
  const filletTargetShapeId = useEditorStore((s) => s.filletTargetShapeId);
  const filletCornerIndex = useEditorStore((s) => s.filletCornerIndex);
  const filletTargetEdge = useEditorStore((s) => s.filletTargetEdge);
  const bodies = useEditorStore((s) => s.bodies);
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
      <div className="card-head">Raccordo/Smusso</div>
      <div className="card-body">
        {filletPickActive ? (
          <>
            <p className="hint-text">Tocca uno spigolo di un solido (linea) o un vertice di una forma 2D.</p>
            <button onMouseDown={keepFocus} className="ghost-btn full" onClick={cancelFilletTool}>
              Annulla
            </button>
          </>
        ) : (filletTargetShapeId && filletCornerIndex !== null) || filletTargetEdge ? (
          <>
            <div className="segmented">
              <button onMouseDown={keepFocus} className={filletKind === "fillet" ? "active" : ""} onClick={() => setFilletKind("fillet")}>
                Raccordo
              </button>
              <button onMouseDown={keepFocus} className={filletKind === "chamfer" ? "active" : ""} onClick={() => setFilletKind("chamfer")}>
                Smusso
              </button>
            </div>
            <label className="sk-field">
              <span>Misura (mm)</span>
              <NumberInput
                autoFocus
                step={0.5}
                min={0.1}
                value={filletAmount}
                onValue={(v) => setFilletAmount(v)}
                onCommit={() => applyFillet()}
              />
            </label>
            <p className="hint-text muted">Scrivi la misura e premi Tab, Invio o clicca fuori dal campo per applicare.</p>
            <button onMouseDown={keepFocus} className="ghost-btn full" onClick={cancelFilletTool}>
              Annulla
            </button>
          </>
        ) : (
          <>
            <p className="hint-text">Scegli uno spigolo di un solido 3D oppure un vertice di una forma 2D non ancora estrusa.</p>
            <button className="primary-btn" disabled={disabled || (pendingShapes.length === 0 && bodies.length === 0)} onClick={startFilletTool}>
              Scegli spigolo
            </button>
            {pendingShapes.length === 0 && bodies.length === 0 && <p className="hint-text muted">Crea prima un solido o una forma 2D.</p>}
          </>
        )}
      </div>
    </div>
  );
}

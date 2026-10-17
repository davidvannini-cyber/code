import { NumberInput } from "../NumberInput";
import { useEditorStore } from "../../store";

// Keeps the focus where it is when clicking Raccordo/Smusso/Annulla.
const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault();

// Choosing an edge (solid) or corner (2D shape) applies the fillet/chamfer at
// once; the kind and size then edit it live (no apply button), like the parameter fields.
export function FilletCard() {
  const engineReady = useEditorStore((s) => s.engineReady);
  const busy = useEditorStore((s) => s.busy);
  const pendingShapes = useEditorStore((s) => s.pendingShapes);
  const bodies = useEditorStore((s) => s.bodies);
  const filletPickActive = useEditorStore((s) => s.filletPickActive);
  const filletEditId = useEditorStore((s) => s.filletEditId);
  const filletTargetShapeId = useEditorStore((s) => s.filletTargetShapeId);
  const filletCornerIndex = useEditorStore((s) => s.filletCornerIndex);
  const filletKind = useEditorStore((s) => s.filletKind);
  const filletAmount = useEditorStore((s) => s.filletAmount);
  const startFilletTool = useEditorStore((s) => s.startFilletTool);
  const cancelFilletTool = useEditorStore((s) => s.cancelFilletTool);
  const setFilletKind = useEditorStore((s) => s.setFilletKind);
  const setFilletAmount = useEditorStore((s) => s.setFilletAmount);
  const disabled = !engineReady || busy;
  const editing = !!filletEditId || (!!filletTargetShapeId && filletCornerIndex !== null);

  return (
    <div className="card">
      <div className="card-head">Raccordo/Smusso</div>
      <div className="card-body">
        {filletPickActive ? (
          <>
            <p className="hint-text">Tocca uno spigolo di un solido (linea) o un vertice di una forma 2D.</p>
            <button className="ghost-btn full" onClick={cancelFilletTool}>
              Annulla
            </button>
          </>
        ) : editing ? (
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
              <NumberInput step={1} min={0.1} value={filletAmount} onValue={(v) => setFilletAmount(v)} />
            </label>
            <p className="hint-text muted">Si applica mentre cambi tipo e misura.</p>
            <div className="sk-row">
              <button className="ghost-btn" disabled={disabled} onClick={startFilletTool}>
                Altro spigolo
              </button>
              <button className="ghost-btn" onClick={cancelFilletTool}>
                Fine
              </button>
            </div>
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

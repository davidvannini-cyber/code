import { NumberInput } from "../NumberInput";
import { useEditorStore } from "../../store";
import type { PlaneKind } from "../../occ/types";
import type { SketchShapeKind } from "../../utils/sketchShapes";
import { Icon } from "../icons/Icon";

const PLANES: { key: PlaneKind; label: string }[] = [
  { key: "top", label: "Top" },
  { key: "front", label: "Fronte" },
  { key: "right", label: "Destra" }
];

const SHAPES: { key: SketchShapeKind; label: string }[] = [
  { key: "square", label: "Quadrato" },
  { key: "rectangle", label: "Rettangolo" },
  { key: "triangle", label: "Triangolo" },
  { key: "circle", label: "Cerchio" },
  { key: "ellipse", label: "Ellisse" },
  { key: "polygon", label: "Poligono" }
];

export function SketchCard() {
  const sketchPlane = useEditorStore((s) => s.sketchPlane);
  const setSketchPlane = useEditorStore((s) => s.setSketchPlane);
  const sketchOffset = useEditorStore((s) => s.sketchOffset);
  const setSketchOffset = useEditorStore((s) => s.setSketchOffset);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const snapSize = useEditorStore((s) => s.snapSize);
  const setSnap = useEditorStore((s) => s.setSnap);
  const sketchForme = useEditorStore((s) => s.sketchForme);
  const setSketchForme = useEditorStore((s) => s.setSketchForme);
  const sketchShapeParams = useEditorStore((s) => s.sketchShapeParams);
  const setSketchShapeParam = useEditorStore((s) => s.setSketchShapeParam);
  const createShape2D = useEditorStore((s) => s.createShape2D);

  const drafting = useEditorStore((s) => s.drafting);
  const draftPoints = useEditorStore((s) => s.draftPoints);
  const draftClosed = useEditorStore((s) => s.draftClosed);
  const undoDraftPoint = useEditorStore((s) => s.undoDraftPoint);
  const clearDraft = useEditorStore((s) => s.clearDraft);
  const closeDraft = useEditorStore((s) => s.closeDraft);

  const pendingShapes = useEditorStore((s) => s.pendingShapes);
  const removePendingShape = useEditorStore((s) => s.removePendingShape);

  const isLibero = sketchForme === "libero";
  const createLabel = !isLibero ? "CREA FORMA 2D" : !drafting ? "INIZIA SCHIZZO LIBERO" : draftClosed ? "CREA FORMA 2D" : "CHIUDI PRIMA IL POLIGONO";

  return (
    <div className="card wide">
      <div className="card-head">Schizzo</div>
      <div className="card-body">
        <label className="sk-field">
          <span>Piano</span>
          <select value={sketchPlane} onChange={(e) => setSketchPlane(e.target.value as PlaneKind)}>
            {PLANES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <div className="sk-row">
          <label className="sk-field small">
            <span>Offset (mm)</span>
            <NumberInput step={1} value={sketchOffset} onValue={(v) => setSketchOffset(v)} />
          </label>
          <label className="sk-field small checkbox">
            <span>
              <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnap(e.target.checked)} /> Snap
            </span>
          </label>
          {snapEnabled && (
            <label className="sk-field small">
              <span>Passo (mm)</span>
              <NumberInput step={1} min={1} value={snapSize} onValue={(v) => setSnap(true, v)} />
            </label>
          )}
        </div>

        <label className="sk-field">
          <span>Forme</span>
          <select value={sketchForme} onChange={(e) => setSketchForme(e.target.value as any)}>
            <option value="libero">Libero</option>
            {SHAPES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {sketchForme === "polygon" && (
          <label className="sk-field">
            <span>Nr. lati</span>
            <select value={sketchShapeParams.sides} onChange={(e) => setSketchShapeParam({ sides: parseInt(e.target.value) })}>
              {Array.from({ length: 22 }, (_, i) => i + 3).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        {!isLibero && (
          <div className="sk-dims">
            <span className="section-label">Dimensioni (mm)</span>
            <div className="sk-row">
              <label className="sk-field small">
                <span>cx</span>
                <NumberInput step={1} value={sketchShapeParams.cx} onValue={(v) => setSketchShapeParam({ cx: v })} />
              </label>
              <label className="sk-field small">
                <span>cy</span>
                <NumberInput step={1} value={sketchShapeParams.cy} onValue={(v) => setSketchShapeParam({ cy: v })} />
              </label>
            </div>
            {sketchForme === "square" && (
              <label className="sk-field small">
                <span>Lato</span>
                <NumberInput step={1} min={1} value={sketchShapeParams.width} onValue={(v) => setSketchShapeParam({ width: v })} />
              </label>
            )}
            {(sketchForme === "rectangle" || sketchForme === "triangle") && (
              <div className="sk-row">
                <label className="sk-field small">
                  <span>Largh.</span>
                  <NumberInput step={1} min={1} value={sketchShapeParams.width} onValue={(v) => setSketchShapeParam({ width: v })} />
                </label>
                <label className="sk-field small">
                  <span>Alt.</span>
                  <NumberInput step={1} min={1} value={sketchShapeParams.height} onValue={(v) => setSketchShapeParam({ height: v })} />
                </label>
              </div>
            )}
            {(sketchForme === "circle" || sketchForme === "polygon") && (
              <label className="sk-field small">
                <span>Raggio</span>
                <NumberInput step={1} min={1} value={sketchShapeParams.radius} onValue={(v) => setSketchShapeParam({ radius: v })} />
              </label>
            )}
            {sketchForme === "ellipse" && (
              <div className="sk-row">
                <label className="sk-field small">
                  <span>Raggio X</span>
                  <NumberInput step={1} min={1} value={sketchShapeParams.radiusX} onValue={(v) => setSketchShapeParam({ radiusX: v })} />
                </label>
                <label className="sk-field small">
                  <span>Raggio Y</span>
                  <NumberInput step={1} min={1} value={sketchShapeParams.radiusY} onValue={(v) => setSketchShapeParam({ radiusY: v })} />
                </label>
              </div>
            )}
          </div>
        )}

        {isLibero && drafting && (
          <div className="sk-dims">
            <span className="section-label">
              {draftClosed ? "Poligono chiuso" : "Tocca il piano per punti"} ({draftPoints.length})
            </span>
            {!draftClosed ? (
              <div className="sk-row">
                <button className="ghost-btn" disabled={draftPoints.length === 0} onClick={undoDraftPoint}>
                  Annulla punto
                </button>
                <button className="ghost-btn" disabled={draftPoints.length < 3} onClick={closeDraft}>
                  Chiudi poligono
                </button>
              </div>
            ) : null}
            <button className="ghost-btn" disabled={draftPoints.length === 0} onClick={clearDraft}>
              Svuota
            </button>
          </div>
        )}

        <button className="primary-btn" disabled={isLibero && drafting && !draftClosed} onClick={createShape2D}>
          {createLabel}
        </button>

        {pendingShapes.length > 0 && (
          <div className="sk-dims">
            <span className="section-label">Forme 2D in attesa</span>
            <ul className="pending-list">
              {pendingShapes.map((p, i) => (
                <li key={p.id} className="pending-row">
                  <span>
                    forma_{i + 1} ({p.plane})
                  </span>
                  <button className="icon-btn small danger" onClick={() => removePendingShape(p.id)}>
                    <Icon name="close" size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

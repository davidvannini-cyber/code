import { useEditorStore } from "../../store";
import type { PrimitiveType } from "../../occ/types";

const PRIMITIVE_DEFS: { type: PrimitiveType; label: string; params: Record<string, number> }[] = [
  { type: "box", label: "Cubo", params: { width: 20, height: 20, depth: 20 } },
  { type: "sphere", label: "Sfera", params: { radius: 10 } },
  { type: "cylinder", label: "Cilindro", params: { radius: 10, height: 20 } },
  { type: "cone", label: "Cono", params: { radius1: 10, radius2: 0, height: 20 } },
  { type: "torus", label: "Toro", params: { radius: 12, tube: 4 } }
];

export function PrimitivesCard() {
  const engineReady = useEditorStore((s) => s.engineReady);
  const busy = useEditorStore((s) => s.busy);
  const addPrimitive = useEditorStore((s) => s.addPrimitive);
  const disabled = !engineReady || busy;

  return (
    <div className="card">
      <div className="card-head">Primitive · mm</div>
      <div className="card-body">
        <div className="tile-list">
          {PRIMITIVE_DEFS.map((p) => (
            <button key={p.type} className="tile-btn" disabled={disabled} onClick={() => addPrimitive(p.type, p.params)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

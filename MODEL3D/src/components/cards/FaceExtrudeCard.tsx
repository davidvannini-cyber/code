import { NumberInput } from "../NumberInput";
import { useEditorStore } from "../../store";

// Shown right after "Estrudi faccia": the distance edits the extrusion live (no apply
// button). Positive adds material, negative digs into the solid.
export function FaceExtrudeCard() {
  const id = useEditorStore((s) => s.faceExtrudeEditId);
  const feature = useEditorStore((s) => s.features.find((f) => f.id === id));
  const setDistance = useEditorStore((s) => s.setFaceExtrudeDistance);
  const end = useEditorStore((s) => s.endFaceExtrude);
  if (!feature || feature.type !== "faceExtrude") return null;

  return (
    <div className="card">
      <div className="card-head">Estrudi faccia</div>
      <div className="card-body">
        <label className="sk-field">
          <span>Distanza (mm)</span>
          <NumberInput step={1} min={-1e6} value={feature.distance} onValue={setDistance} />
        </label>
        <p className="hint-text">Positiva: aggiunge materiale. Negativa: scava nel solido.</p>
        <button className="ghost-btn full" onClick={end}>
          Fine
        </button>
      </div>
    </div>
  );
}

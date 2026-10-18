import { useMemo } from "react";
import { useEditorStore } from "../../store";
import { IDENTITY_PLACEMENT } from "../../occ/types";
import { faceInfo } from "../../utils/faceMate";

const fmt = (v: number) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
const triple = (v: [number, number, number]) => v.map(fmt).join(" · ");

// Direction the face looks towards, in words when it is axis-aligned.
function directionLabel(n: [number, number, number]): string {
  const axes = ["X", "Y", "Z"];
  const i = n.reduce((best, v, k) => (Math.abs(v) > Math.abs(n[best]) ? k : best), 0);
  if (Math.abs(n[i]) > 0.999) return `${n[i] > 0 ? "+" : "−"}${axes[i]}`;
  return triple(n);
}

// Read-only characteristics of the single face the user clicked (a double click
// selects the whole body instead and shows its sizes in the Parametri card).
export function FaceCard() {
  const selectedFace = useEditorStore((s) => s.selectedFace);
  const selectedBodyId = useEditorStore((s) => s.selectedBodyId);
  const bodies = useEditorStore((s) => s.bodies);
  const features = useEditorStore((s) => s.features);
  const placements = useEditorStore((s) => s.placements);
  const layFaceOnPlane = useEditorStore((s) => s.layFaceOnPlane);

  const info = useMemo(() => {
    if (!selectedFace || selectedBodyId) return null;
    const body = bodies.find((b) => b.bodyId === selectedFace.bodyId);
    return body ? faceInfo(body, selectedFace.faceIndex, placements[body.bodyId] ?? IDENTITY_PLACEMENT) : null;
  }, [selectedFace, selectedBodyId, bodies, placements]);

  if (!info) return null;

  // The face made by a fillet/chamfer: say which and how big.
  const body = bodies.find((b) => b.bodyId === selectedFace?.bodyId);
  const treatment = features.find((x) => x.bodyId === body?.bodyId);
  const isTreatmentFace = !!selectedFace && !!body?.treatmentFaces.includes(selectedFace.faceIndex) && treatment?.type === "edgeFillet";

  const rows: [string, string][] = isTreatmentFace && treatment?.type === "edgeFillet"
    ? [[treatment.kind === "fillet" ? "Raccordo" : "Smusso", `${fmt(treatment.amount)} mm`]]
    : [];
  rows.push(
    ["Tipo", info.planar ? "Piana" : "Curva"],
    ["Area", `${fmt(info.area)} mm²`],
    ["Dim. X·Y·Z", triple(info.size)],
    ["Centro", triple(info.centroid)]
  );
  if (info.normal) rows.push(["Verso", directionLabel(info.normal)]);

  return (
    <div className="card face-card">
      <div className="card-head">Faccia</div>
      <div className="card-body">
        {rows.map(([label, value]) => (
          <div key={label} className="info-row">
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}
        {info.planar && (
          <button className="ghost-btn full" onClick={() => layFaceOnPlane()}>
            Appoggia sul piano
          </button>
        )}
      </div>
    </div>
  );
}

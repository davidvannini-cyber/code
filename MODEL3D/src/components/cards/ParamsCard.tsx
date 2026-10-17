import { NumberInput } from "../NumberInput";
import { useEditorStore } from "../../store";

const LABELS: Record<string, string> = {
  width: "Larghezza",
  height: "Altezza",
  depth: "Profondità",
  radius: "Raggio",
  radius1: "Raggio base",
  radius2: "Raggio punta",
  tube: "Spessore tubo"
};

// Parameters that may legitimately be 0 (a cone with a sharp tip).
const ALLOW_ZERO = new Set(["radius2"]);

function ParamField({ label, value, min, onCommit }: { label: string; value: number; min: number; onCommit: (v: number) => void }) {
  return (
    <label className="sk-field">
      <span>{label} (mm)</span>
      <NumberInput step={1} min={min} value={value} onValue={onCommit} />
    </label>
  );
}

// Shown while a body is selected: edits the parameters of the feature that made
// it (primitive sizes, extrusion height/offset, fillet/chamfer size) and rebuilds
// the model through updateFeatureParams.
export function ParamsCard() {
  const selectedBodyId = useEditorStore((s) => s.selectedBodyId);
  const features = useEditorStore((s) => s.features);
  const busy = useEditorStore((s) => s.busy);
  const updateFeatureParams = useEditorStore((s) => s.updateFeatureParams);

  const feature = features.find((f) => f.bodyId === selectedBodyId);
  if (!feature || feature.type === "boolean") return null;

  let fields: { key: string; label: string; value: number; min: number; apply: (v: number) => void }[];
  if (feature.type === "primitive") {
    fields = Object.entries(feature.params).map(([key, value]) => ({
      key,
      label: LABELS[key] ?? key,
      value,
      min: ALLOW_ZERO.has(key) ? 0 : 0.1,
      apply: (v) => updateFeatureParams(feature.id, { params: { ...feature.params, [key]: v } })
    }));
  } else if (feature.type === "sketchExtrude") {
    fields = [
      { key: "height", label: "Altezza", value: feature.height, min: 0.1, apply: (v) => updateFeatureParams(feature.id, { height: v }) },
      { key: "offset", label: "Offset", value: feature.offset, min: -1e6, apply: (v) => updateFeatureParams(feature.id, { offset: v }) }
    ];
  } else {
    fields = [
      {
        key: "amount",
        label: feature.kind === "fillet" ? "Raccordo" : "Smusso",
        value: feature.amount,
        min: 0.1,
        apply: (v) => updateFeatureParams(feature.id, { amount: v })
      }
    ];
  }

  return (
    <div className={`card params-card ${busy ? "busy" : ""}`}>
      <div className="card-head">Parametri · {feature.label}</div>
      <div className="card-body">
        {fields.map((f) => (
          <ParamField key={`${feature.id}:${f.key}`} label={f.label} value={f.value} min={f.min} onCommit={f.apply} />
        ))}
      </div>
    </div>
  );
}

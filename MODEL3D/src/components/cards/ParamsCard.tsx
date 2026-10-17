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

function ParamField({ name, value, onCommit }: { name: string; value: number; onCommit: (v: number) => void }) {
  return (
    <label className="sk-field">
      <span>{LABELS[name] ?? name} (mm)</span>
      <NumberInput step={1} min={ALLOW_ZERO.has(name) ? 0 : 0.1} value={value} onValue={onCommit} />
    </label>
  );
}

// Shown while a primitive body is selected: edits its parameters and rebuilds
// the model through updateFeatureParams.
export function ParamsCard() {
  const selectedBodyId = useEditorStore((s) => s.selectedBodyId);
  const features = useEditorStore((s) => s.features);
  const busy = useEditorStore((s) => s.busy);
  const updateFeatureParams = useEditorStore((s) => s.updateFeatureParams);

  const feature = features.find((f) => f.bodyId === selectedBodyId);
  if (!feature || feature.type !== "primitive") return null;

  return (
    <div className={`card params-card ${busy ? "busy" : ""}`}>
      <div className="card-head">Parametri · {feature.label}</div>
      <div className="card-body">
        {Object.entries(feature.params).map(([key, value]) => (
          <ParamField
            key={`${feature.id}:${key}`}
            name={key}
            value={value}
            onCommit={(v) => updateFeatureParams(feature.id, { params: { ...feature.params, [key]: v } })}
          />
        ))}
        <p className="hint-text muted">Le modifiche si applicano mentre scrivi.</p>
      </div>
    </div>
  );
}

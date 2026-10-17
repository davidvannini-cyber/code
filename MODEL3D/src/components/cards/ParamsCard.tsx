import { NumberInput } from "../NumberInput";
import type { Feature } from "../../occ/types";
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

type Field = { key: string; label: string; value: number; min: number; apply: (v: number) => void };

function fieldsFor(feature: Feature, update: (id: string, patch: Record<string, any>) => void): Field[] {
  if (feature.type === "primitive") {
    return Object.entries(feature.params).map(([key, value]) => ({
      key,
      label: LABELS[key] ?? key,
      value,
      min: ALLOW_ZERO.has(key) ? 0 : 0.1,
      apply: (v) => update(feature.id, { params: { ...feature.params, [key]: v } })
    }));
  }
  if (feature.type === "sketchExtrude") {
    return [
      { key: "height", label: "Altezza", value: feature.height, min: 0.1, apply: (v) => update(feature.id, { height: v }) },
      { key: "offset", label: "Offset", value: feature.offset, min: -1e6, apply: (v) => update(feature.id, { offset: v }) }
    ];
  }
  if (feature.type === "edgeFillet") {
    return [{ key: "amount", label: feature.kind === "fillet" ? "Raccordo" : "Smusso", value: feature.amount, min: 0.1, apply: (v) => update(feature.id, { amount: v }) }];
  }
  return [];
}

// Shown while a body is selected: edits the parameters of the feature that made
// it and, for a fillet/chamfer result, of the features it was built from (the
// original cube's sizes, earlier fillets...), then rebuilds through updateFeatureParams.
export function ParamsCard() {
  const selectedBodyId = useEditorStore((s) => s.selectedBodyId);
  const features = useEditorStore((s) => s.features);
  const busy = useEditorStore((s) => s.busy);
  const updateFeatureParams = useEditorStore((s) => s.updateFeatureParams);

  // Walk back from the selected body through fillet sources, original feature first.
  const chain: Feature[] = [];
  let current = features.find((f) => f.bodyId === selectedBodyId);
  while (current && chain.length < 20) {
    chain.unshift(current);
    const src: string | null = current.type === "edgeFillet" ? current.sourceId : null;
    current = src ? features.find((f) => f.bodyId === src) : undefined;
  }
  const groups = chain.map((f) => ({ feature: f, fields: fieldsFor(f, updateFeatureParams) })).filter((g) => g.fields.length > 0);
  if (groups.length === 0) return null;

  return (
    <div className={`card params-card ${busy ? "busy" : ""}`}>
      <div className="card-head">Parametri</div>
      <div className="card-body">
        {groups.map(({ feature, fields }) => (
          <div key={feature.id}>
            {groups.length > 1 && <span className="section-label">{feature.label}</span>}
            {fields.map((f) => (
              <ParamField key={`${feature.id}:${f.key}`} label={f.label} value={f.value} min={f.min} onCommit={f.apply} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

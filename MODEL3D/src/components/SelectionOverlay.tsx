import { useState } from "react";
import { NumberInput } from "./NumberInput";
import { useEditorStore, type TransformMode } from "../store";
import { IDENTITY_PLACEMENT } from "../occ/types";
import { Icon } from "./icons/Icon";

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

interface Props {
  bodyId: string;
}

export function SelectionOverlay({ bodyId }: Props) {
  const placements = useEditorStore((s) => s.placements);
  const colors = useEditorStore((s) => s.colors);
  const features = useEditorStore((s) => s.features);
  const transformMode = useEditorStore((s) => s.transformMode);
  const setTransformMode = useEditorStore((s) => s.setTransformMode);
  const updatePlacement = useEditorStore((s) => s.updatePlacement);
  const updateColor = useEditorStore((s) => s.updateColor);
  const deleteFeature = useEditorStore((s) => s.deleteFeature);
  const rotateAroundPoint = useEditorStore((s) => s.rotateAroundPoint);

  const [expanded, setExpanded] = useState<TransformMode | "color" | null>(null);
  const [pivot, setPivot] = useState<[number, number, number]>([0, 0, 0]);
  const [pivotAxis, setPivotAxis] = useState<0 | 1 | 2>(1);
  const [pivotDegrees, setPivotDegrees] = useState(90);

  const placement = placements[bodyId] ?? IDENTITY_PLACEMENT;
  const feature = features.find((f) => f.bodyId === bodyId);

  const toggle = (mode: TransformMode) => {
    setTransformMode(mode);
    setExpanded((cur) => (cur === mode ? null : mode));
  };

  const setPos = (i: number, v: number) => {
    const next = [...placement.position] as [number, number, number];
    next[i] = v;
    updatePlacement(bodyId, { position: next });
  };
  const setRotDeg = (i: number, deg: number) => {
    const next = placement.rotation.map((r) => r * RAD2DEG) as [number, number, number];
    next[i] = deg;
    updatePlacement(bodyId, { rotation: next.map((d) => d * DEG2RAD) as [number, number, number] });
  };
  const setScale = (i: number, v: number) => {
    const next = [...placement.scale] as [number, number, number];
    next[i] = v;
    updatePlacement(bodyId, { scale: next });
  };

  return (
      <div className="selection-overlay">
        <div className="selection-toolbar">
          <button className={transformMode === "translate" && expanded === "translate" ? "active" : ""} onClick={() => toggle("translate")} title="Sposta">
            <Icon name="move" size={15} />
          </button>
          <button className={transformMode === "rotate" && expanded === "rotate" ? "active" : ""} onClick={() => toggle("rotate")} title="Ruota">
            <Icon name="rotate" size={15} />
          </button>
          <button className={transformMode === "scale" && expanded === "scale" ? "active" : ""} onClick={() => toggle("scale")} title="Scala">
            <Icon name="scale" size={15} />
          </button>
          <button className={expanded === "color" ? "active" : ""} onClick={() => setExpanded((c) => (c === "color" ? null : "color"))} title="Colore">
            <Icon name="palette" size={15} />
          </button>
          <div className="selection-sep" />
          <button className="danger" onClick={() => feature && deleteFeature(feature.id)} title="Elimina">
            <Icon name="trash" size={15} />
          </button>
        </div>

        {expanded === "translate" && (
          <div className="selection-expand">
            <span className="section-label">Posizione (mm)</span>
            <div className="xyz-row">
              {placement.position.map((v, i) => (
                <NumberInput key={i} step={1} value={Number(v.toFixed(2))} onValue={(v) => setPos(i, v)} />
              ))}
            </div>
          </div>
        )}

        {expanded === "scale" && (
          <div className="selection-expand">
            <span className="section-label">Scala (×)</span>
            <div className="xyz-row">
              {placement.scale.map((v, i) => (
                <NumberInput key={i} step={0.1} min={0.01} value={Number(v.toFixed(3))} onValue={(v) => setScale(i, v)} />
              ))}
            </div>
          </div>
        )}

        {expanded === "color" && (
          <div className="selection-expand">
            <span className="section-label">Colore</span>
            <input type="color" className="color-input" value={colors[bodyId] ?? "#4f8dfd"} onChange={(e) => updateColor(bodyId, e.target.value)} />
          </div>
        )}

        {expanded === "rotate" && (
          <div className="selection-expand">
            <span className="section-label">Rotazione (°)</span>
            <div className="xyz-row">
              {placement.rotation.map((r, i) => (
                <NumberInput key={i} step={1} value={Number((r * RAD2DEG).toFixed(1))} onValue={(v) => setRotDeg(i, v)} />
              ))}
            </div>
            <span className="section-label">Ruota attorno a punto</span>
            <div className="xyz-row">
              {pivot.map((v, i) => (
                <NumberInput
                  key={i}
                  step={1}
                  value={v}
                  onValue={(nv) => {
                    const next = [...pivot] as [number, number, number];
                    next[i] = nv;
                    setPivot(next);
                  }}
                />
              ))}
            </div>
            <div className="segmented">
              {(["X", "Y", "Z"] as const).map((label, idx) => (
                <button key={label} className={pivotAxis === idx ? "active" : ""} onClick={() => setPivotAxis(idx as 0 | 1 | 2)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="pivot-degrees-row">
              <NumberInput step={1} value={pivotDegrees} onValue={(v) => setPivotDegrees(v)} />
              <button className="primary-btn small" onClick={() => rotateAroundPoint(bodyId, pivot, pivotAxis, pivotDegrees)}>
                Ruota
              </button>
            </div>
          </div>
        )}
      </div>
  );
}

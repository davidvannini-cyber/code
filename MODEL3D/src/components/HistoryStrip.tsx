import { useState } from "react";
import { useEditorStore } from "../store";
import type { Feature } from "../occ/types";
import { Icon } from "./icons/Icon";

function FeatureParams({ feature }: { feature: Feature }) {
  const updateFeatureParams = useEditorStore((s) => s.updateFeatureParams);

  if (feature.type === "primitive") {
    return (
      <div className="feature-params">
        {Object.entries(feature.params).map(([key, value]) => (
          <label key={key} className="hint-text">
            {key} (mm)
            <input
              type="number"
              step="1"
              value={value}
              onChange={(e) => updateFeatureParams(feature.id, { params: { ...feature.params, [key]: parseFloat(e.target.value) || 0 } })}
            />
          </label>
        ))}
      </div>
    );
  }

  if (feature.type === "sketchExtrude") {
    const treated = feature.corners.filter((c) => c.kind !== "none").length;
    return (
      <div className="feature-params">
        <label className="hint-text">
          altezza (mm)
          <input type="number" step="1" value={feature.height} onChange={(e) => updateFeatureParams(feature.id, { height: parseFloat(e.target.value) || 0 })} />
        </label>
        <label className="hint-text">
          offset (mm)
          <input type="number" step="1" value={feature.offset} onChange={(e) => updateFeatureParams(feature.id, { offset: parseFloat(e.target.value) || 0 })} />
        </label>
        {treated > 0 && <span className="hint-text muted">{treated} spigoli raccordati/smussati</span>}
      </div>
    );
  }

  return (
    <div className="feature-params">
      <span className="hint-text muted">{feature.op}</span>
    </div>
  );
}

export function HistoryStrip() {
  const features = useEditorStore((s) => s.features);
  const toggleFeatureActive = useEditorStore((s) => s.toggleFeatureActive);
  const deleteFeature = useEditorStore((s) => s.deleteFeature);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`history-strip ${expanded ? "expanded" : ""}`}>
      {!expanded ? (
        <div className="history-collapsed">
          {features.length === 0 && <span className="hint-text muted">Nessuna feature ancora</span>}
          {features.map((f) => (
            <div key={f.id} className={`history-chip ${!f.active ? "suppressed" : ""}`}>
              <span className="dot" />
              {f.label}
            </div>
          ))}
          <button className="history-expand-btn" onClick={() => setExpanded(true)} disabled={features.length === 0}>
            Storico <Icon name="chevron-right" size={12} />
          </button>
        </div>
      ) : (
        <div className="history-expanded">
          <div className="history-expanded-head">
            <span className="section-label">Storico</span>
            <button className="icon-btn small" onClick={() => setExpanded(false)}>
              <Icon name="close" size={13} />
            </button>
          </div>
          <ul className="history-list">
            {features.map((f) => (
              <li key={f.id} className={`history-row ${!f.active ? "suppressed" : ""}`}>
                <div className="history-head">
                  <input type="checkbox" checked={f.active} onChange={() => toggleFeatureActive(f.id)} />
                  <span className="history-label">{f.label}</span>
                  <button className="icon-btn small danger" onClick={() => deleteFeature(f.id)}>
                    <Icon name="close" size={12} />
                  </button>
                </div>
                <FeatureParams feature={f} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

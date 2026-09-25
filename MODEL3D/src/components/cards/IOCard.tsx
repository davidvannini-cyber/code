import { useRef } from "react";
import { useEditorStore } from "../../store";
import { Icon } from "../icons/Icon";

export function IOCard() {
  const engineReady = useEditorStore((s) => s.engineReady);
  const busy = useEditorStore((s) => s.busy);
  const bodyCount = useEditorStore((s) => s.bodies.length);
  const saveProject = useEditorStore((s) => s.saveProject);
  const loadProject = useEditorStore((s) => s.loadProject);
  const exportModel = useEditorStore((s) => s.exportModel);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const disabled = !engineReady || busy;

  return (
    <div className="card io-card">
      <div className="card-head">Progetto</div>
      <div className="card-body">
        <button className="menu-item" disabled={disabled} onClick={saveProject}>
          <Icon name="save" size={16} /> Salva progetto (.3mf)
        </button>
        <button className="menu-item" disabled={disabled} onClick={() => fileInputRef.current?.click()}>
          <Icon name="folder" size={16} /> Apri progetto (.3mf)
        </button>
        <div className="menu-divider" />
        <button className="menu-item" disabled={disabled || bodyCount === 0} onClick={() => exportModel("stl")}>
          <Icon name="download" size={16} /> Esporta STL
        </button>
        <button className="menu-item" disabled={disabled || bodyCount === 0} onClick={() => exportModel("step")}>
          <Icon name="download" size={16} /> Esporta STEP
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".3mf"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) loadProject(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

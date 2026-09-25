import { useEditorStore } from "../store";
import { Icon } from "./icons/Icon";
import { IOCard } from "./cards/IOCard";

export function TopBar() {
  const engineReady = useEditorStore((s) => s.engineReady);
  const busy = useEditorStore((s) => s.busy);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const undoStack = useEditorStore((s) => s.undoStack);
  const redoStack = useEditorStore((s) => s.redoStack);
  const sceneBackground = useEditorStore((s) => s.sceneBackground);
  const setSceneBackground = useEditorStore((s) => s.setSceneBackground);
  const activeCard = useEditorStore((s) => s.activeCard);
  const setActiveCard = useEditorStore((s) => s.setActiveCard);

  return (
    <div className="topbar">
      <span className="title">MODEL3D</span>
      <div className="icons">
        <button className="icon-btn" disabled={undoStack.length === 0} title="Annulla" onClick={undo}>
          <Icon name="undo" size={16} />
        </button>
        <button className="icon-btn" disabled={redoStack.length === 0} title="Ripeti" onClick={redo}>
          <Icon name="redo" size={16} />
        </button>
        <div className="topbar-anchor">
          <button className={`icon-btn ${activeCard === "io" ? "active" : ""}`} title="Progetto" onClick={() => setActiveCard("io")}>
            <Icon name="folder" size={16} />
          </button>
          {activeCard === "io" && <IOCard />}
        </div>
        <button
          className="icon-btn"
          title={sceneBackground === "dark" ? "Passa a sfondo chiaro" : "Passa a sfondo scuro"}
          onClick={() => setSceneBackground(sceneBackground === "dark" ? "light" : "dark")}
        >
          <Icon name={sceneBackground === "dark" ? "moon" : "sun"} size={16} />
        </button>
      </div>
      <span className="status">{!engineReady ? "Avvio motore CAD…" : busy ? "Elaborazione…" : "Pronto"}</span>
    </div>
  );
}

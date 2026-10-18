import { useEditorStore } from "../../store";

// Dedicated tool: touch a flat face and the body turns to rest on it, on the ground plane.
export function FloorCard() {
  const engineReady = useEditorStore((s) => s.engineReady);
  const bodyCount = useEditorStore((s) => s.bodies.length);
  const floorPickActive = useEditorStore((s) => s.floorPickActive);
  const startFloorTool = useEditorStore((s) => s.startFloorTool);
  const cancelFloorTool = useEditorStore((s) => s.cancelFloorTool);

  return (
    <div className="card">
      <div className="card-head">Appoggia sul piano</div>
      <div className="card-body">
        {floorPickActive ? (
          <>
            <p className="hint-text">Tocca una faccia piana: l'oggetto si appoggia sul piano con quella faccia in basso.</p>
            <button className="ghost-btn full" onClick={cancelFloorTool}>
              Fine
            </button>
          </>
        ) : (
          <>
            <p className="hint-text">Appoggia un oggetto sul piano di stampa a partire da una sua faccia.</p>
            <button className="primary-btn" disabled={!engineReady || bodyCount === 0} onClick={startFloorTool}>
              Scegli la faccia
            </button>
            {bodyCount === 0 && <p className="hint-text muted">Serve almeno un oggetto.</p>}
          </>
        )}
      </div>
    </div>
  );
}

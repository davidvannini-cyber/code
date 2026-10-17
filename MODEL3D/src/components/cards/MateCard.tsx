import { useEditorStore } from "../../store";

export function MateCard() {
  const engineReady = useEditorStore((s) => s.engineReady);
  const bodies = useEditorStore((s) => s.bodies);
  const features = useEditorStore((s) => s.features);
  const mateActive = useEditorStore((s) => s.mateActive);
  const mateFaceA = useEditorStore((s) => s.mateFaceA);
  const mateFaceB = useEditorStore((s) => s.mateFaceB);
  const mateCenter = useEditorStore((s) => s.mateCenter);
  const startMateTool = useEditorStore((s) => s.startMateTool);
  const cancelMateTool = useEditorStore((s) => s.cancelMateTool);
  const setMateCenter = useEditorStore((s) => s.setMateCenter);
  const applyMate = useEditorStore((s) => s.applyMate);

  const labelFor = (bodyId: string) => features.find((f) => f.bodyId === bodyId)?.label ?? bodyId;

  return (
    <div className="card">
      <div className="card-head">Affianca facce</div>
      <div className="card-body">
        {!mateActive ? (
          <>
            <p className="hint-text">Scegli una faccia fissa e una faccia dell'oggetto da spostare: la seconda va a toccare la prima.</p>
            <button className="primary-btn" disabled={!engineReady || bodies.length < 2} onClick={startMateTool}>
              Scegli le facce
            </button>
            {bodies.length < 2 && <p className="hint-text muted">Servono almeno due oggetti.</p>}
          </>
        ) : (
          <>
            <p className="hint-text">
              {!mateFaceA
                ? "1. Tocca la faccia che resta ferma."
                : !mateFaceB
                  ? `Ferma: ${labelFor(mateFaceA.bodyId)}. 2. Tocca la faccia dell'altro oggetto, quello che si sposta.`
                  : `${labelFor(mateFaceB.bodyId)} si sposterà contro ${labelFor(mateFaceA!.bodyId)}.`}
            </p>
            <label className="sk-field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={mateCenter} onChange={(e) => setMateCenter(e.target.checked)} style={{ width: "auto" }} />
              <span>Centra le facce</span>
            </label>
            <button className="primary-btn" disabled={!mateFaceA || !mateFaceB} onClick={applyMate}>
              AFFIANCA
            </button>
            <button className="ghost-btn full" onClick={cancelMateTool}>
              Annulla
            </button>
          </>
        )}
      </div>
    </div>
  );
}

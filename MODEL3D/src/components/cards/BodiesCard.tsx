import { useEditorStore } from "../../store";

export function BodiesCard() {
  const bodies = useEditorStore((s) => s.bodies);
  const colors = useEditorStore((s) => s.colors);
  const features = useEditorStore((s) => s.features);
  const selectedBodyId = useEditorStore((s) => s.selectedBodyId);
  const selectBody = useEditorStore((s) => s.selectBody);
  const booleanPick = useEditorStore((s) => s.booleanPick);
  const pickForBoolean = useEditorStore((s) => s.pickForBoolean);

  const labelFor = (bodyId: string) => features.find((f) => f.bodyId === bodyId)?.label ?? bodyId;

  return (
    <div className="card wide">
      <div className="card-head">Corpi</div>
      <div className="card-body">
        {bodies.length === 0 && <p className="hint-text muted">Nessun corpo. Aggiungi una primitiva o uno schizzo estruso.</p>}
        <ul className="object-list">
          {bodies.map((b) => {
            const isPicked = booleanPick?.picked.includes(b.bodyId);
            return (
              <li
                key={b.bodyId}
                className={`object-row ${selectedBodyId === b.bodyId ? "selected" : ""} ${isPicked ? "picked" : ""}`}
                onClick={() => (booleanPick ? pickForBoolean(b.bodyId) : selectBody(b.bodyId))}
              >
                <span className="swatch" style={{ background: colors[b.bodyId] ?? "#4f8dfd" }} />
                {labelFor(b.bodyId)}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

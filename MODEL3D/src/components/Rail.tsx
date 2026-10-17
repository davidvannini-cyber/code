import { useEditorStore } from "../store";
import { Icon } from "./icons/Icon";

const RAIL_ITEMS = [
  { key: "primitives", icon: "shapes", title: "Primitive" },
  { key: "sketch", icon: "pen", title: "Schizzo" },
  null,
  { key: "extrude", icon: "extrude", title: "Estrusione" },
  { key: "fillet", icon: "fillet", title: "Raccordo/Smusso" },
  { key: "boolean", icon: "union", title: "Booleane" },
  { key: "mate", icon: "mate", title: "Affianca" },
  null,
  { key: "bodies", icon: "layers", title: "Corpi" }
] as const;

export function Rail() {
  const activeCard = useEditorStore((s) => s.activeCard);
  const setActiveCard = useEditorStore((s) => s.setActiveCard);
  const engineReady = useEditorStore((s) => s.engineReady);

  return (
    <>
      <div className="rail">
        {RAIL_ITEMS.map((item, i) =>
          item === null ? (
            <div key={i} className="rail-sep" />
          ) : (
            <button
              key={item.key}
              className={`rail-btn ${activeCard === item.key ? "active" : ""}`}
              disabled={!engineReady}
              title={item.title}
              onClick={() => setActiveCard(item.key)}
            >
              <Icon name={item.icon} />
            </button>
          )
        )}
      </div>

    </>
  );
}

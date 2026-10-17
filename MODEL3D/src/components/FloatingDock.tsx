import { useEditorStore } from "../store";
import { PrimitivesCard } from "./cards/PrimitivesCard";
import { SketchCard } from "./cards/SketchCard";
import { ExtrudeCard } from "./cards/ExtrudeCard";
import { FilletCard } from "./cards/FilletCard";
import { BooleanCard } from "./cards/BooleanCard";
import { MateCard } from "./cards/MateCard";
import { BodiesCard } from "./cards/BodiesCard";
import { ParamsCard } from "./cards/ParamsCard";
import { SelectionOverlay } from "./SelectionOverlay";

// All floating menus live here, pinned top-centre just under the top bar, so
// they never sit on top of the object being edited.
export function FloatingDock() {
  const activeCard = useEditorStore((s) => s.activeCard);
  const selectedBodyId = useEditorStore((s) => s.selectedBodyId);
  const drafting = useEditorStore((s) => s.drafting);
  const booleanPick = useEditorStore((s) => s.booleanPick);
  const extrudePickActive = useEditorStore((s) => s.extrudePickActive);
  const filletPickActive = useEditorStore((s) => s.filletPickActive);
  const mateActive = useEditorStore((s) => s.mateActive);

  const showSelection = !!selectedBodyId && !drafting && !booleanPick && !extrudePickActive && !filletPickActive && !mateActive;

  return (
    <div className="dock">
      {activeCard === "primitives" && <PrimitivesCard />}
      {activeCard === "sketch" && <SketchCard />}
      {activeCard === "extrude" && <ExtrudeCard />}
      {activeCard === "fillet" && <FilletCard />}
      {activeCard === "boolean" && <BooleanCard />}
      {activeCard === "mate" && <MateCard />}
      {activeCard === "bodies" && <BodiesCard />}
      {showSelection && <SelectionOverlay key={selectedBodyId} bodyId={selectedBodyId} />}
      <ParamsCard />
    </div>
  );
}

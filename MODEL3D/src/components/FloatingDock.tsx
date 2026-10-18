import { useEditorStore } from "../store";
import { PrimitivesCard } from "./cards/PrimitivesCard";
import { SketchCard } from "./cards/SketchCard";
import { ExtrudeCard } from "./cards/ExtrudeCard";
import { FilletCard } from "./cards/FilletCard";
import { BooleanCard } from "./cards/BooleanCard";
import { MateCard } from "./cards/MateCard";
import { FloorCard } from "./cards/FloorCard";
import { BodiesCard } from "./cards/BodiesCard";
import { ParamsCard } from "./cards/ParamsCard";
import { FaceCard } from "./cards/FaceCard";
import { SelectionOverlay } from "./SelectionOverlay";

// Everything chosen from the left rail, plus the sizes / face details of the
// selection, stacks in one column next to the rail. The move/rotate/scale bar of
// the selected object is pinned top-centre under the top bar, off the object.
export function FloatingDock() {
  const activeCard = useEditorStore((s) => s.activeCard);
  const selectedBodyId = useEditorStore((s) => s.selectedBodyId);
  const drafting = useEditorStore((s) => s.drafting);
  const booleanPick = useEditorStore((s) => s.booleanPick);
  const extrudePickActive = useEditorStore((s) => s.extrudePickActive);
  const filletPickActive = useEditorStore((s) => s.filletPickActive);
  const mateActive = useEditorStore((s) => s.mateActive);
  const floorPickActive = useEditorStore((s) => s.floorPickActive);

  const showSelection = !!selectedBodyId && !drafting && !booleanPick && !extrudePickActive && !filletPickActive && !mateActive && !floorPickActive;

  return (
    <>
      <div className="dock-left">
        {activeCard === "primitives" && <PrimitivesCard />}
        {activeCard === "sketch" && <SketchCard />}
        {activeCard === "extrude" && <ExtrudeCard />}
        {activeCard === "fillet" && <FilletCard />}
        {activeCard === "boolean" && <BooleanCard />}
        {activeCard === "mate" && <MateCard />}
        {activeCard === "floor" && <FloorCard />}
        {activeCard === "bodies" && <BodiesCard />}
        <ParamsCard />
        <FaceCard />
      </div>
      <div className="dock">
        {showSelection && <SelectionOverlay key={selectedBodyId} bodyId={selectedBodyId} />}
      </div>
    </>
  );
}

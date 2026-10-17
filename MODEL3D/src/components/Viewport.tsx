import { useCallback, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { useEditorStore } from "../store";
import { SceneMesh } from "./SceneMesh";
import { PendingShapesRenderer } from "./PendingShapesRenderer";
import { IDENTITY_PLACEMENT } from "../occ/types";

export function Viewport() {
  const bodies = useEditorStore((s) => s.bodies);
  const placements = useEditorStore((s) => s.placements);
  const colors = useEditorStore((s) => s.colors);
  const selectedBodyId = useEditorStore((s) => s.selectedBodyId);
  const selectBody = useEditorStore((s) => s.selectBody);
  const selectFace = useEditorStore((s) => s.selectFace);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const transformMode = useEditorStore((s) => s.transformMode);
  const updatePlacement = useEditorStore((s) => s.updatePlacement);
  const drafting = useEditorStore((s) => s.drafting);
  const booleanPick = useEditorStore((s) => s.booleanPick);
  const mateActive = useEditorStore((s) => s.mateActive);
  const pickMateFace = useEditorStore((s) => s.pickMateFace);
  const pickForBoolean = useEditorStore((s) => s.pickForBoolean);
  const extrudePickActive = useEditorStore((s) => s.extrudePickActive);
  const filletPickActive = useEditorStore((s) => s.filletPickActive);
  const sceneBackground = useEditorStore((s) => s.sceneBackground);
  const isLight = sceneBackground === "light";

  const objRefs = useRef(new Map<string, THREE.Group>());
  const [orbitEnabled, setOrbitEnabled] = useState(true);

  const registerRef = useCallback((id: string, obj: THREE.Group | null) => {
    if (obj) objRefs.current.set(id, obj);
    else objRefs.current.delete(id);
  }, []);

  const handleFaceClick = useCallback(
    (bodyId: string, faceIndex: number) => {
      if (mateActive) {
        pickMateFace(bodyId, faceIndex);
      } else if (booleanPick) {
        pickForBoolean(bodyId);
      } else if (!extrudePickActive && !filletPickActive) {
        // A single click selects the whole body (opens the parameters card) and
        // highlights the clicked face; selectBody clears the face, so it goes first.
        selectBody(bodyId);
        selectFace(bodyId, faceIndex);
      }
    },
    [mateActive, pickMateFace, booleanPick, pickForBoolean, selectBody, selectFace, extrudePickActive, filletPickActive]
  );

  const handleBodyDoubleClick = useCallback(
    (bodyId: string) => {
      if (mateActive) return;
      if (booleanPick) {
        pickForBoolean(bodyId);
      } else if (!extrudePickActive && !filletPickActive) {
        selectBody(bodyId);
      }
    },
    [mateActive, booleanPick, pickForBoolean, selectBody, extrudePickActive, filletPickActive]
  );

  const selectedObj = selectedBodyId ? objRefs.current.get(selectedBodyId) ?? null : null;
  const pickModeActive = !!booleanPick || extrudePickActive || filletPickActive || mateActive;

  return (
    <Canvas
      shadows
      camera={{ position: [80, 80, 80], fov: 45, near: 0.1, far: 5000 }}
      onPointerMissed={clearSelection}
    >
      <color attach="background" args={[isLight ? "#f2f2f4" : "#1b1c1f"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[100, 150, 80]} intensity={1.1} castShadow />
      <directionalLight position={[-80, 60, -80]} intensity={0.3} />

      <Grid
        args={[400, 400]}
        cellSize={10}
        sectionSize={100}
        cellColor={isLight ? "#c9c9cc" : "#3a3a3a"}
        sectionColor={isLight ? "#9a9a9e" : "#5a5a5a"}
        fadeDistance={400}
        infiniteGrid
        position={[0, -0.01, 0]}
      />

      {bodies.map((body) => (
        <SceneMesh
          key={body.bodyId}
          body={body}
          placement={placements[body.bodyId] ?? IDENTITY_PLACEMENT}
          color={colors[body.bodyId] ?? "#4f8dfd"}
          onFaceClick={handleFaceClick}
          onBodyDoubleClick={handleBodyDoubleClick}
          registerRef={registerRef}
        />
      ))}

      <PendingShapesRenderer />

      {selectedObj && !drafting && !pickModeActive && (
        <TransformControls
          object={selectedObj}
          mode={transformMode}
          onMouseDown={() => setOrbitEnabled(false)}
          onMouseUp={() => {
            setOrbitEnabled(true);
            const o = selectedObj;
            const euler = new THREE.Euler().setFromQuaternion(o.quaternion);
            updatePlacement(selectedBodyId as string, {
              position: [o.position.x, o.position.y, o.position.z],
              rotation: [euler.x, euler.y, euler.z],
              scale: [o.scale.x, o.scale.y, o.scale.z]
            });
          }}
        />
      )}

      <OrbitControls
        enabled={orbitEnabled}
        makeDefault
        // While drafting, the left button / one finger draws; orbit moves to the right button / two fingers.
        touches={drafting ? { TWO: THREE.TOUCH.DOLLY_PAN } : { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
        mouseButtons={drafting ? { MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE } : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
      />
    </Canvas>
  );
}

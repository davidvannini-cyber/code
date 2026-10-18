import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEditorStore } from "../store";
import { SceneMesh } from "./SceneMesh";
import { BodyGizmo } from "./BodyGizmo";
import { PendingShapesRenderer } from "./PendingShapesRenderer";
import { IDENTITY_PLACEMENT } from "../occ/types";

// Apple Pencil (pointerType "pen") draws and selects but never orbits the view,
// so fingers stay free for rotate/zoom/pan and a resting hand can't turn the scene.
// While the pen touches the screen the orbit controls are switched off.
function PenGuard({ orbitEnabled }: { orbitEnabled: boolean }) {
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;
  const root = useThree((s) => s.gl.domElement.parentElement);
  const penId = useRef<number | null>(null);
  const enabledRef = useRef(orbitEnabled);
  enabledRef.current = orbitEnabled;

  useEffect(() => {
    if (!controls || !root) return;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "pen") return;
      penId.current = e.pointerId;
      controls.enabled = false;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== penId.current) return;
      penId.current = null;
      controls.enabled = enabledRef.current;
    };
    root.addEventListener("pointerdown", down, true); // capture: runs before OrbitControls
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      root.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [controls, root]);
  return null;
}

// Tablets: cap the pixel ratio and drop antialiasing and shadows. A 12.9" iPad
// renders ~5.6M pixels at 2x, which with MSAA plus the CAD engine's memory can
// make Safari freeze or reload the page.
const COARSE = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export function Viewport() {
  const bodies = useEditorStore((s) => s.bodies);
  const placements = useEditorStore((s) => s.placements);
  const colors = useEditorStore((s) => s.colors);
  const selectedBodyId = useEditorStore((s) => s.selectedBodyId);
  const selectBody = useEditorStore((s) => s.selectBody);
  const selectFace = useEditorStore((s) => s.selectFace);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const transformMode = useEditorStore((s) => s.transformMode);
  const drafting = useEditorStore((s) => s.drafting);
  const booleanPick = useEditorStore((s) => s.booleanPick);
  const mateActive = useEditorStore((s) => s.mateActive);
  const floorPickActive = useEditorStore((s) => s.floorPickActive);
  const layFaceOnPlane = useEditorStore((s) => s.layFaceOnPlane);
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
      if (floorPickActive) {
        selectFace(bodyId, faceIndex);
        layFaceOnPlane(bodyId, faceIndex);
      } else if (mateActive) {
        pickMateFace(bodyId, faceIndex);
      } else if (booleanPick) {
        pickForBoolean(bodyId);
      } else if (!extrudePickActive && !filletPickActive) {
        // Single click: just the face. Double click selects the whole body.
        selectFace(bodyId, faceIndex);
      }
    },
    [floorPickActive, layFaceOnPlane, mateActive, pickMateFace, booleanPick, pickForBoolean, selectFace, extrudePickActive, filletPickActive]
  );

  const handleBodyDoubleClick = useCallback(
    (bodyId: string) => {
      if (mateActive || floorPickActive) return;
      if (booleanPick) {
        pickForBoolean(bodyId);
      } else if (!extrudePickActive && !filletPickActive) {
        selectBody(bodyId);
      }
    },
    [floorPickActive, mateActive, booleanPick, pickForBoolean, selectBody, extrudePickActive, filletPickActive]
  );

  const selectedObj = selectedBodyId ? objRefs.current.get(selectedBodyId) ?? null : null;
  const pickModeActive = !!booleanPick || extrudePickActive || filletPickActive || mateActive || floorPickActive;

  return (
    <Canvas
      shadows={!COARSE}
      dpr={COARSE ? [1, 1.5] : [1, 2]}
      frameloop="demand"
      gl={{ antialias: !COARSE, powerPreference: "high-performance" }}
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

      {selectedObj && selectedBodyId && !drafting && !pickModeActive && (
        <BodyGizmo
          key={selectedBodyId}
          bodyId={selectedBodyId}
          group={selectedObj}
          mode={transformMode}
          onDragging={(d) => setOrbitEnabled(!d)}
        />
      )}

      <PenGuard orbitEnabled={orbitEnabled} />
      <OrbitControls
        enabled={orbitEnabled}
        makeDefault
        // Fingers always navigate (the pen draws); with a mouse, drafting moves orbit to the right button.
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
        mouseButtons={drafting ? { MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE } : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
      />
    </Canvas>
  );
}

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Line, Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEditorStore, type PendingShape } from "../store";
import type { PlaneKind } from "../occ/types";

const SIZE = 400; // mm
const DOUBLE_TAP_MS = 400;

// Must mirror occWorker.ts's planeBasis() exactly (same right-handed u/v/normal
// triples), otherwise what's drawn on screen won't match what OCC extrudes.
const PLANE_DEFS: Record<PlaneKind, { normal: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3 }> = {
  top: { normal: new THREE.Vector3(0, 1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, -1) },
  front: { normal: new THREE.Vector3(0, 0, 1), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0) },
  right: { normal: new THREE.Vector3(1, 0, 0), u: new THREE.Vector3(0, 0, 1), v: new THREE.Vector3(0, -1, 0) }
};

function usePlaneTransform(plane: PlaneKind, offset: number) {
  const def = PLANE_DEFS[plane];
  const origin3D = useMemo(() => def.normal.clone().multiplyScalar(offset), [def, offset]);
  const quaternion = useMemo(() => {
    const basis = new THREE.Matrix4().makeBasis(def.u, def.v, def.normal);
    return new THREE.Quaternion().setFromRotationMatrix(basis);
  }, [def]);
  return { def, origin3D, quaternion };
}

const CORNER_COLOR: Record<string, string> = { none: "#ff8800", fillet: "#4f8dfd", chamfer: "#b24ffd" };

function PendingShapeOutline({ shape, index }: { shape: PendingShape; index: number }) {
  const { origin3D, quaternion } = usePlaneTransform(shape.plane, shape.offset);
  const extrudePickActive = useEditorStore((s) => s.extrudePickActive);
  const extrudeTargetId = useEditorStore((s) => s.extrudeTargetId);
  const pickExtrudeTarget = useEditorStore((s) => s.pickExtrudeTarget);
  const filletPickActive = useEditorStore((s) => s.filletPickActive);
  const filletTargetShapeId = useEditorStore((s) => s.filletTargetShapeId);
  const filletCornerIndex = useEditorStore((s) => s.filletCornerIndex);
  const pickFilletCorner = useEditorStore((s) => s.pickFilletCorner);

  const isExtrudeTarget = extrudeTargetId === shape.id;
  const linePts = useMemo(() => {
    const pts = shape.points.map((p) => new THREE.Vector3(p[0], p[1], 0.01));
    pts.push(pts[0]);
    return pts;
  }, [shape.points]);

  const shapePts2D = useMemo(() => shape.points.map((p) => new THREE.Vector2(p[0], p[1])), [shape.points]);

  return (
    <group position={origin3D} quaternion={quaternion}>
      <mesh
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          if (!extrudePickActive) return;
          e.stopPropagation();
          pickExtrudeTarget(shape.id);
        }}
      >
        <shapeGeometry args={[new THREE.Shape(shapePts2D)]} />
        <meshBasicMaterial
          color={isExtrudeTarget ? "#22aa55" : "#4f8dfd"}
          transparent
          opacity={isExtrudeTarget ? 0.35 : extrudePickActive ? 0.22 : 0.12}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Line points={linePts} color={isExtrudeTarget ? "#22aa55" : "#4f8dfd"} lineWidth={2} />
      {shape.points.map((p, i) => {
        const treated = shape.corners[i];
        const isPicked = filletTargetShapeId === shape.id && filletCornerIndex === i;
        return (
          <mesh
            key={i}
            position={[p[0], p[1], 0.02]}
            onPointerDown={(e: ThreeEvent<PointerEvent>) => {
              if (!filletPickActive) return;
              e.stopPropagation();
              pickFilletCorner(shape.id, i);
            }}
          >
            <sphereGeometry args={[isPicked ? 3.5 : filletPickActive ? 3 : 2, 12, 12]} />
            <meshBasicMaterial color={isPicked ? "#ffffff" : CORNER_COLOR[treated?.kind ?? "none"]} />
          </mesh>
        );
      })}
      <Html position={[shape.points[0][0], shape.points[0][1], 0.1]} center distanceFactor={40}>
        <div className="quote-label">forma_{index + 1}</div>
      </Html>
    </group>
  );
}

function DraftPlane() {
  const sketchPlane = useEditorStore((s) => s.sketchPlane);
  const sketchOffset = useEditorStore((s) => s.sketchOffset);
  const draftPoints = useEditorStore((s) => s.draftPoints);
  const draftPressures = useEditorStore((s) => s.draftPressures);
  const draftClosed = useEditorStore((s) => s.draftClosed);
  const addDraftPoint = useEditorStore((s) => s.addDraftPoint);
  const closeDraft = useEditorStore((s) => s.closeDraft);
  const setDraftSegmentLength = useEditorStore((s) => s.setDraftSegmentLength);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const snapSize = useEditorStore((s) => s.snapSize);
  const lastTapRef = useRef<{ index: number; time: number } | null>(null);

  const { def, origin3D, quaternion } = usePlaneTransform(sketchPlane, sketchOffset);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (draftClosed) return;
    e.stopPropagation();
    const local = e.point.clone().sub(origin3D);
    const u = local.dot(def.u);
    const v = local.dot(def.v);
    const pressure = (e.nativeEvent as PointerEvent).pressure ?? 0.5;
    addDraftPoint([u, v], e.nativeEvent && (e.nativeEvent as PointerEvent).pointerType === "pen" ? pressure : 0.5);
  };

  const handlePointTap = (index: number) => {
    const isLast = index === draftPoints.length - 1;
    if (!isLast || draftPoints.length < 3) return;
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.index === index && now - last.time < DOUBLE_TAP_MS) {
      closeDraft();
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { index, time: now };
    }
  };

  return (
    <group position={origin3D} quaternion={quaternion}>
      <mesh onPointerDown={handlePointerDown}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshBasicMaterial color="#4f8dfd" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>

      {snapEnabled && <SnapGrid size={SIZE} step={snapSize} />}

      {draftPoints.map((p, i) => {
        const pressure = draftPressures[i] ?? 0.5;
        const isLast = i === draftPoints.length - 1;
        const radius = (0.6 + pressure * 1) * (isLast && !draftClosed ? 1.5 : 1);
        return (
          <mesh
            key={i}
            position={[p[0], p[1], 0.02]}
            onPointerDown={(e) => {
              if (!isLast || draftClosed) return;
              e.stopPropagation();
              handlePointTap(i);
            }}
            onDoubleClick={(e) => {
              if (!isLast || draftClosed) return;
              e.stopPropagation();
              closeDraft();
            }}
          >
            <sphereGeometry args={[radius, 12, 12]} />
            <meshBasicMaterial color={isLast && !draftClosed ? "#ffffff" : "#ff8800"} />
          </mesh>
        );
      })}

      {draftPoints.length > 1 && (
        <Line points={draftPoints.map((p) => new THREE.Vector3(p[0], p[1], 0.015))} color="#ff8800" lineWidth={2} />
      )}
      {draftPoints.length > 2 && (
        <Line
          points={[
            new THREE.Vector3(draftPoints[draftPoints.length - 1][0], draftPoints[draftPoints.length - 1][1], 0.01),
            new THREE.Vector3(draftPoints[0][0], draftPoints[0][1], 0.01)
          ]}
          color={draftClosed ? "#ff8800" : "#ff880088"}
          lineWidth={draftClosed ? 2 : 1}
        />
      )}

      {draftPoints.slice(0, -1).map((p, i) => {
        const q = draftPoints[i + 1];
        const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
        const mid: [number, number] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        return (
          <Html key={i} position={[mid[0], mid[1], 0.05]} center distanceFactor={80}>
            <div
              className="quote-label"
              onPointerDown={(ev) => ev.stopPropagation()}
              onClick={(ev) => {
                ev.stopPropagation();
                const input = window.prompt("Lunghezza segmento (mm)", length.toFixed(1));
                if (input) {
                  const val = parseFloat(input.replace(",", "."));
                  if (!Number.isNaN(val) && val > 0) setDraftSegmentLength(i, val);
                }
              }}
            >
              {length.toFixed(1)} mm
            </div>
          </Html>
        );
      })}
    </group>
  );
}

function SnapGrid({ size, step }: { size: number; step: number }) {
  const lines = useMemo(() => {
    const segs: [THREE.Vector3, THREE.Vector3][] = [];
    const half = size / 2;
    for (let x = -half; x <= half; x += step) {
      segs.push([new THREE.Vector3(x, -half, 0.005), new THREE.Vector3(x, half, 0.005)]);
    }
    for (let y = -half; y <= half; y += step) {
      segs.push([new THREE.Vector3(-half, y, 0.005), new THREE.Vector3(half, y, 0.005)]);
    }
    return segs;
  }, [size, step]);

  return (
    <group>
      {lines.map((pts, i) => (
        <Line key={i} points={pts} color="#3a3a3a" lineWidth={1} transparent opacity={0.4} />
      ))}
    </group>
  );
}

export function PendingShapesRenderer() {
  const pendingShapes = useEditorStore((s) => s.pendingShapes);
  const drafting = useEditorStore((s) => s.drafting);

  return (
    <group>
      {pendingShapes.map((shape, i) => (
        <PendingShapeOutline key={shape.id} shape={shape} index={i} />
      ))}
      {drafting && <DraftPlane />}
    </group>
  );
}

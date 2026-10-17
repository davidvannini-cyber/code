import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { TransformControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEditorStore, type TransformMode } from "../store";
import { IDENTITY_PLACEMENT } from "../occ/types";

interface Props {
  bodyId: string;
  group: THREE.Group;
  mode: TransformMode;
  onDragging: (dragging: boolean) => void;
}

// Move / rotate / scale handles for the selected body, anchored at the centre of
// the body's bounding box. A body's origin can be far from its geometry (a
// union is built in world coordinates), so the handles ride on a separate pivot
// and the pivot's movement is applied to the body's placement about that centre.
export function BodyGizmo({ bodyId, group, mode, onDragging }: Props) {
  const invalidate = useThree((s) => s.invalidate);
  const body = useEditorStore((s) => s.bodies.find((b) => b.bodyId === bodyId));
  const placement = useEditorStore((s) => s.placements[bodyId] ?? IDENTITY_PLACEMENT);
  const updatePlacement = useEditorStore((s) => s.updatePlacement);

  const [pivot, setPivot] = useState<THREE.Object3D | null>(null);
  const dragging = useRef(false);
  const start = useRef<{ pivot: THREE.Matrix4; body: THREE.Matrix4 } | null>(null);

  // Centre of the mesh's bounding box, in the body's own coordinates
  const center = useMemo(() => {
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    const p = body?.mesh.positions;
    if (!p || p.length === 0) return new THREE.Vector3();
    for (let i = 0; i < p.length; i += 3) {
      min.set(Math.min(min.x, p[i]), Math.min(min.y, p[i + 1]), Math.min(min.z, p[i + 2]));
      max.set(Math.max(max.x, p[i]), Math.max(max.y, p[i + 1]), Math.max(max.z, p[i + 2]));
    }
    return min.add(max).multiplyScalar(0.5);
  }, [body?.mesh.positions]);

  // Put the pivot on the body's centre (in the scene) whenever the body changes
  useLayoutEffect(() => {
    if (!pivot || dragging.current) return;
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...placement.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...placement.rotation)),
      new THREE.Vector3(...placement.scale)
    );
    pivot.position.copy(center).applyMatrix4(m);
    pivot.quaternion.identity();
    pivot.scale.set(1, 1, 1);
    pivot.updateMatrixWorld();
    invalidate();
  }, [pivot, center, placement, invalidate]);

  return (
    <>
      <object3D ref={setPivot} />
      {pivot && (
        <TransformControls
          object={pivot}
          mode={mode}
          onMouseDown={() => {
            dragging.current = true;
            onDragging(true);
            pivot.updateMatrixWorld();
            group.updateMatrix();
            start.current = { pivot: pivot.matrixWorld.clone(), body: group.matrix.clone() };
          }}
          onObjectChange={() => {
            const s = start.current;
            if (!s) return;
            pivot.updateMatrixWorld();
            // body' = (pivot now × pivot at start⁻¹) × body at start: the same move, about the centre
            const delta = new THREE.Matrix4().multiplyMatrices(pivot.matrixWorld, s.pivot.clone().invert());
            delta.multiply(s.body).decompose(group.position, group.quaternion, group.scale);
            invalidate();
          }}
          onMouseUp={() => {
            dragging.current = false;
            start.current = null;
            onDragging(false);
            const euler = new THREE.Euler().setFromQuaternion(group.quaternion);
            updatePlacement(bodyId, {
              position: [group.position.x, group.position.y, group.position.z],
              rotation: [euler.x, euler.y, euler.z],
              scale: [group.scale.x, group.scale.y, group.scale.z]
            });
          }}
        />
      )}
    </>
  );
}

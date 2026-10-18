import { useMemo } from "react";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { useEditorStore } from "../store";
import { IDENTITY_PLACEMENT } from "../occ/types";

const fmt = (v: number) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);

// Three pills in the top bar: for the selected object, how far its nearest end
// is from the origin along X, Y and Z (Y is the height above the ground plane).
export function PositionPills() {
  const selectedBodyId = useEditorStore((s) => s.selectedBodyId);
  const selectedFace = useEditorStore((s) => s.selectedFace);
  const bodies = useEditorStore((s) => s.bodies);
  const placements = useEditorStore((s) => s.placements);

  const bodyId = selectedBodyId ?? selectedFace?.bodyId ?? null;
  const body = bodies.find((b) => b.bodyId === bodyId);
  const placement = bodyId ? placements[bodyId] ?? IDENTITY_PLACEMENT : null;

  const mins = useMemo(() => {
    if (!body || !placement) return null;
    const m = new Matrix4().compose(
      new Vector3(...placement.position),
      new Quaternion().setFromEuler(new Euler(...placement.rotation)),
      new Vector3(...placement.scale)
    );
    const v = new Vector3();
    const min = [Infinity, Infinity, Infinity];
    const p = body.mesh.positions;
    for (let i = 0; i < p.length; i += 3) {
      v.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(m);
      if (v.x < min[0]) min[0] = v.x;
      if (v.y < min[1]) min[1] = v.y;
      if (v.z < min[2]) min[2] = v.z;
    }
    return min;
  }, [body, placement]);

  if (!mins) return null;
  return (
    <div className="pos-pills" title="Distanza dell'estremo dell'oggetto dagli assi (mm)">
      {(["X", "Y", "Z"] as const).map((axis, i) => (
        <span key={axis} className={`pos-pill ${axis}`}>
          <b>{axis}</b> {fmt(mins[i])}
        </span>
      ))}
    </div>
  );
}

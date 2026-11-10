import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEditorStore, type ViewFace, type ViewRequest } from "../store";
import { IDENTITY_PLACEMENT } from "../occ/types";

const DURATION_MS = 450;
const EPS = 1e-4;

// Direction of the camera (theta = turn around Y, phi = angle from the top) for each face.
const FACE_ANGLES: Record<ViewFace, { theta?: number; phi: number }> = {
  front: { theta: 0, phi: Math.PI / 2 },
  back: { theta: Math.PI, phi: Math.PI / 2 },
  right: { theta: Math.PI / 2, phi: Math.PI / 2 },
  left: { theta: -Math.PI / 2, phi: Math.PI / 2 },
  top: { phi: EPS },
  bottom: { phi: Math.PI - EPS }
};

interface Anim {
  t0: number;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  from: THREE.Spherical;
  to: THREE.Spherical;
  fit: boolean;
}

function sceneBox(): THREE.Box3 {
  const { bodies, placements } = useEditorStore.getState();
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (const b of bodies) {
    const p = placements[b.bodyId] ?? IDENTITY_PLACEMENT;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...p.position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rotation)), new THREE.Vector3(...p.scale));
    const pos = b.mesh.positions;
    for (let i = 0; i < pos.length; i += 3) box.expandByPoint(v.set(pos[i], pos[i + 1], pos[i + 2]).applyMatrix4(m));
  }
  // Empty platform: the default working area.
  if (box.isEmpty()) box.set(new THREE.Vector3(-50, 0, -50), new THREE.Vector3(50, 40, 50));
  return box;
}

/**
 * Lives inside the Canvas. Moves the camera when the store asks (frame everything,
 * look at a face) with a short animation, and keeps the little navigation cube
 * (ViewCube, plain HTML) turned like the scene.
 */
export function ViewController() {
  const request = useEditorStore((s) => s.viewRequest);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update: () => void } | null;
  const invalidate = useThree((s) => s.invalidate);
  const anim = useRef<Anim | null>(null);
  const cube = useRef<HTMLElement | null>(null);
  const handled = useRef(0);

  useEffect(() => {
    if (!request || !controls || request.id === handled.current) return;
    handled.current = request.id;
    anim.current = startAnimation(request, camera, controls.target);
    invalidate();
  }, [request, camera, controls, invalidate]);

  useFrame(() => {
    const a = anim.current;
    if (a && controls) {
      const k = Math.min(1, (performance.now() - a.t0) / DURATION_MS);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // ease in-out
      let dTheta = a.to.theta - a.from.theta;
      dTheta = ((((dTheta + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI; // shortest way round
      const s = new THREE.Spherical(
        a.from.radius + (a.to.radius - a.from.radius) * e,
        a.from.phi + (a.to.phi - a.from.phi) * e,
        a.from.theta + dTheta * e
      );
      const target = a.fromTarget.clone().lerp(a.toTarget, e);
      controls.target.copy(target);
      camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(s));
      if (a.fit) {
        camera.near = Math.max(s.radius / 1000, 0.01);
        camera.far = Math.max(5000, s.radius * 20);
        camera.updateProjectionMatrix();
      }
      controls.update();
      if (k >= 1) anim.current = null;
      else invalidate();
    }
    // Turn the cube like the scene: scene->screen rotation, with the Y axis flipped for CSS.
    if (!cube.current || !cube.current.isConnected) cube.current = document.getElementById("viewcube-3d");
    if (cube.current) {
      const e = new THREE.Matrix4().makeRotationFromQuaternion(camera.quaternion.clone().invert()).elements;
      const m = e.map((v, k) => {
        const row = k % 4, col = Math.floor(k / 4);
        return row < 3 && col < 3 && (row === 1) !== (col === 1) ? -v : v;
      });
      cube.current.style.transform = `matrix3d(${m.join(",")})`;
    }
  });

  return null;
}

function startAnimation(req: ViewRequest, camera: THREE.PerspectiveCamera, currentTarget: THREE.Vector3): Anim {
  const offset = camera.position.clone().sub(currentTarget);
  const from = new THREE.Spherical().setFromVector3(offset);
  if (req.kind === "face" && req.face) {
    const f = FACE_ANGLES[req.face];
    const to = new THREE.Spherical(from.radius, f.phi, f.theta ?? from.theta);
    return { t0: performance.now(), fromTarget: currentTarget.clone(), toTarget: currentTarget.clone(), from, to, fit: false };
  }
  // fit: frame everything, keeping the current direction (or the given one)
  const box = sceneBox();
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 1);
  const dist = (radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.15;
  const dir = req.dir ? new THREE.Vector3(...req.dir) : offset.clone();
  const to = new THREE.Spherical().setFromVector3(dir.normalize().multiplyScalar(dist));
  to.phi = Math.min(Math.max(to.phi, EPS), Math.PI - EPS);
  return { t0: performance.now(), fromTarget: currentTarget.clone(), toTarget: center, from, to, fit: true };
}

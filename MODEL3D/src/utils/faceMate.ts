import { Euler, Matrix3, Matrix4, Quaternion, Vector3 } from "three";
import type { LiveBody, Placement } from "../occ/types";

export interface FaceFrame {
  centroid: Vector3; // world space
  normal: Vector3; // world space, unit, pointing out of the body
  planar: boolean;
}

function placementMatrix(p: Placement): Matrix4 {
  return new Matrix4().compose(new Vector3(...p.position), new Quaternion().setFromEuler(new Euler(...p.rotation)), new Vector3(...p.scale));
}

/** Area-weighted centroid and normal of one OCC face, transformed to world space. */
export function faceFrame(body: LiveBody, faceIndex: number, placement: Placement): FaceFrame | null {
  const range = body.faceRanges[faceIndex];
  if (!range || range[1] === 0) return null;
  const { positions, indices } = body.mesh;
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  const centroid = new Vector3();
  const normal = new Vector3();
  const triNormals: Vector3[] = [];
  let area = 0;
  for (let t = range[0]; t < range[0] + range[1]; t++) {
    a.fromArray(positions, indices[t * 3] * 3);
    b.fromArray(positions, indices[t * 3 + 1] * 3);
    c.fromArray(positions, indices[t * 3 + 2] * 3);
    const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)); // length = 2 * area
    const triArea = n.length() / 2;
    if (triArea < 1e-12) continue;
    area += triArea;
    centroid.add(new Vector3().add(a).add(b).add(c).multiplyScalar(triArea / 3));
    normal.add(n);
    triNormals.push(n.normalize());
  }
  if (area === 0 || normal.lengthSq() < 1e-12) return null;
  centroid.divideScalar(area);
  normal.normalize();
  const planar = triNormals.every((n) => n.dot(normal) > 0.999);

  const m = placementMatrix(placement);
  const worldNormal = normal.clone().applyMatrix3(new Matrix3().getNormalMatrix(m)).normalize();
  return { centroid: centroid.applyMatrix4(m), normal: worldNormal, planar };
}

/**
 * New placement for the moving body so that its face lies flat against the fixed
 * face: rotated until the normals oppose each other, then slid (horizontally)
 * until it touches, optionally aligned sideways, and pushed MATE_OVERLAP into the fixed body.
 */
// The faces are pushed this far into each other so a later union fuses the two
// bodies into one solid instead of leaving a hairline gap or a bare touch.
export const MATE_OVERLAP = 0.01; // mm

export function matePlacement(moving: Placement, fixed: FaceFrame, face: FaceFrame, center: boolean): Placement {
  const q = new Quaternion().setFromUnitVectors(face.normal, fixed.normal.clone().negate());
  const pivot = face.centroid;
  const pos = new Vector3(...moving.position).sub(pivot).applyQuaternion(q).add(pivot);
  const rot = q.multiply(new Quaternion().setFromEuler(new Euler(...moving.rotation)));

  // Contact: the moving face has to end up on the fixed face's plane. Slide the
  // body horizontally when the fixed face is not (nearly) horizontal, so it never
  // rises or sinks; only a horizontal face (stacking) is reached by moving up/down.
  const nA = fixed.normal;
  const dist = new Vector3().subVectors(pivot, fixed.centroid).dot(nA); // moving face to fixed plane
  const horiz = new Vector3(nA.x, 0, nA.z);
  const slideHorizontally = horiz.length() > 0.2;
  const contact = new Vector3();
  if (slideHorizontally) {
    const hu = horiz.clone().normalize();
    contact.copy(hu).multiplyScalar(-dist / hu.dot(nA));
  } else {
    contact.copy(nA).multiplyScalar(-dist);
  }
  pos.add(contact);

  // Alignment: line the faces up sideways, in the horizontal plane only (never vertically).
  if (center) {
    const delta = new Vector3().subVectors(fixed.centroid, new Vector3().addVectors(pivot, contact));
    if (slideHorizontally) {
      const hu = horiz.clone().normalize();
      const along = new Vector3(0, 1, 0).cross(hu); // horizontal, in the contact plane
      pos.addScaledVector(along, delta.dot(along));
    } else {
      pos.add(new Vector3(delta.x, 0, delta.z)); // stacking: centre over the face
    }
  }
  pos.addScaledVector(nA, -MATE_OVERLAP);

  const e = new Euler().setFromQuaternion(rot);
  return { position: [pos.x, pos.y, pos.z], rotation: [e.x, e.y, e.z], scale: moving.scale };
}

export interface FaceInfo {
  planar: boolean;
  area: number; // mm², world scale
  size: [number, number, number]; // extent along world X, Y, Z
  centroid: [number, number, number];
  normal: [number, number, number] | null; // unit, only for planar faces
}

/** Read-only characteristics of one face, in world space (placement applied). */
export function faceInfo(body: LiveBody, faceIndex: number, placement: Placement): FaceInfo | null {
  const range = body.faceRanges[faceIndex];
  if (!range || range[1] === 0) return null;
  const m = placementMatrix(placement);
  const { positions, indices } = body.mesh;
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  const centroid = new Vector3();
  const normal = new Vector3();
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  const triNormals: Vector3[] = [];
  let area = 0;
  for (let t = range[0]; t < range[0] + range[1]; t++) {
    a.fromArray(positions, indices[t * 3] * 3).applyMatrix4(m);
    b.fromArray(positions, indices[t * 3 + 1] * 3).applyMatrix4(m);
    c.fromArray(positions, indices[t * 3 + 2] * 3).applyMatrix4(m);
    for (const v of [a, b, c]) {
      min.min(v);
      max.max(v);
    }
    const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    const triArea = n.length() / 2;
    if (triArea < 1e-12) continue;
    area += triArea;
    centroid.add(new Vector3().add(a).add(b).add(c).multiplyScalar(triArea / 3));
    normal.add(n);
    triNormals.push(n.normalize());
  }
  if (area === 0) return null;
  centroid.divideScalar(area);
  normal.normalize();
  const planar = triNormals.every((n) => n.dot(normal) > 0.999);
  const size = new Vector3().subVectors(max, min);
  return {
    planar,
    area,
    size: [size.x, size.y, size.z],
    centroid: [centroid.x, centroid.y, centroid.z],
    normal: planar ? [normal.x, normal.y, normal.z] : null
  };
}

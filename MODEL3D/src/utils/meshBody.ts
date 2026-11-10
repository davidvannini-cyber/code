import type { FaceRange } from "../occ/types";

export interface MeshBodyData {
  positions: number[];
  indices: number[];
  faceRanges: FaceRange[];
}

// Normals closer than this (cosine) count as the same flat face (about 1.8 degrees).
const SAME_FACE_COS = 0.9995;

/**
 * Turns a plain triangle mesh (imported from a .3mf made by another program)
 * into what the viewport expects from a CAD body: triangles grouped into
 * "faces" (flat, connected areas), each face with its own vertices so that
 * edges between faces stay sharp. One click then selects one face, like on a
 * normal body.
 */
export function meshToBody(srcPositions: ArrayLike<number>, srcIndices: ArrayLike<number>): MeshBodyData {
  const triCount = Math.floor(srcIndices.length / 3);

  // 1. Weld vertices by position (3MF files often repeat vertices).
  const weld = new Map<string, number>();
  const welded = new Int32Array(srcPositions.length / 3);
  for (let v = 0; v < welded.length; v++) {
    const key = `${Math.round(srcPositions[v * 3] * 1e4)},${Math.round(srcPositions[v * 3 + 1] * 1e4)},${Math.round(srcPositions[v * 3 + 2] * 1e4)}`;
    let id = weld.get(key);
    if (id === undefined) {
      id = v;
      weld.set(key, id);
    }
    welded[v] = id;
  }

  // 2. Triangle normals.
  const normals = new Float32Array(triCount * 3);
  const valid = new Uint8Array(triCount);
  for (let t = 0; t < triCount; t++) {
    const a = srcIndices[t * 3] * 3, b = srcIndices[t * 3 + 1] * 3, c = srcIndices[t * 3 + 2] * 3;
    const ux = srcPositions[b] - srcPositions[a], uy = srcPositions[b + 1] - srcPositions[a + 1], uz = srcPositions[b + 2] - srcPositions[a + 2];
    const vx = srcPositions[c] - srcPositions[a], vy = srcPositions[c + 1] - srcPositions[a + 1], vz = srcPositions[c + 2] - srcPositions[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-12) continue; // degenerate triangle: dropped
    valid[t] = 1;
    normals[t * 3] = nx / len;
    normals[t * 3 + 1] = ny / len;
    normals[t * 3 + 2] = nz / len;
  }

  // 3. Edge -> triangles, to know which triangles touch.
  const edgeTris = new Map<number, number[]>();
  const N = welded.length;
  for (let t = 0; t < triCount; t++) {
    if (!valid[t]) continue;
    const w = [welded[srcIndices[t * 3]], welded[srcIndices[t * 3 + 1]], welded[srcIndices[t * 3 + 2]]];
    for (let e = 0; e < 3; e++) {
      const p = w[e], q = w[(e + 1) % 3];
      const key = Math.min(p, q) * N + Math.max(p, q);
      const list = edgeTris.get(key);
      if (list) list.push(t);
      else edgeTris.set(key, [t]);
    }
  }

  // 4. Flood fill: connected triangles with (almost) the same normal = one face.
  const group = new Int32Array(triCount).fill(-1);
  const groups: number[][] = [];
  for (let seed = 0; seed < triCount; seed++) {
    if (!valid[seed] || group[seed] !== -1) continue;
    const gid = groups.length;
    const members: number[] = [];
    const stack = [seed];
    group[seed] = gid;
    while (stack.length) {
      const t = stack.pop()!;
      members.push(t);
      const w = [welded[srcIndices[t * 3]], welded[srcIndices[t * 3 + 1]], welded[srcIndices[t * 3 + 2]]];
      for (let e = 0; e < 3; e++) {
        const p = w[e], q = w[(e + 1) % 3];
        const neighbours = edgeTris.get(Math.min(p, q) * N + Math.max(p, q));
        if (!neighbours) continue;
        for (const n of neighbours) {
          if (group[n] !== -1) continue;
          const dot = normals[t * 3] * normals[n * 3] + normals[t * 3 + 1] * normals[n * 3 + 1] + normals[t * 3 + 2] * normals[n * 3 + 2];
          if (dot >= SAME_FACE_COS) {
            group[n] = gid;
            stack.push(n);
          }
        }
      }
    }
    groups.push(members);
  }

  // 5. Output: faces one after the other, each with its own (welded) vertices.
  const positions: number[] = [];
  const indices: number[] = [];
  const faceRanges: FaceRange[] = [];
  for (const members of groups) {
    const local = new Map<number, number>();
    const start = indices.length / 3;
    for (const t of members) {
      for (let k = 0; k < 3; k++) {
        const v = welded[srcIndices[t * 3 + k]];
        let id = local.get(v);
        if (id === undefined) {
          id = positions.length / 3;
          local.set(v, id);
          positions.push(srcPositions[v * 3], srcPositions[v * 3 + 1], srcPositions[v * 3 + 2]);
        }
        indices.push(id);
      }
    }
    faceRanges.push([start, members.length]);
  }
  return { positions, indices, faceRanges };
}

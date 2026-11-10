import { Matrix4, Vector3 } from "three";
import type { LiveBody } from "../occ/types";

/** Binary STL of all bodies, each moved by its 4x4 matrix (column-major). */
export function writeStlBinary(items: { body: LiveBody; matrix: number[] }[]): Uint8Array {
  const total = items.reduce((n, it) => n + it.body.mesh.indices.length / 3, 0);
  const buf = new ArrayBuffer(84 + total * 50);
  const view = new DataView(buf);
  new TextEncoder().encodeInto("MODEL3D", new Uint8Array(buf, 0, 80));
  view.setUint32(80, total, true);
  let off = 84;
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), n = new Vector3(), e = new Vector3();
  for (const { body, matrix } of items) {
    const m = new Matrix4().fromArray(matrix);
    const flip = m.determinant() < 0;
    const { positions, indices } = body.mesh;
    for (let t = 0; t < indices.length; t += 3) {
      a.fromArray(positions, indices[t] * 3).applyMatrix4(m);
      b.fromArray(positions, indices[flip ? t + 2 : t + 1] * 3).applyMatrix4(m);
      c.fromArray(positions, indices[flip ? t + 1 : t + 2] * 3).applyMatrix4(m);
      n.subVectors(b, a).cross(e.subVectors(c, a)).normalize();
      for (const v of [n, a, b, c]) {
        view.setFloat32(off, v.x, true);
        view.setFloat32(off + 4, v.y, true);
        view.setFloat32(off + 8, v.z, true);
        off += 12;
      }
      view.setUint16(off, 0, true);
      off += 2;
    }
  }
  return new Uint8Array(buf);
}

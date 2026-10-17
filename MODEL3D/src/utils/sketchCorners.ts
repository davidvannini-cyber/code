import type { CornerTreatment } from "../occ/types";

const ARC_SEGMENTS = 8;

// Rounds/chamfers the sketch outline in 2D instead of asking the WASM kernel
// (BRepFilletAPI_MakeFillet2d fails on vertices extracted from the face).
// Fillets become short polyline arcs; chamfers are a single cut. corners[i]
// belongs to points[i]; the setback is clamped to half of each adjacent edge
// so neighbouring corners can never overlap.
export function applySketchCorners(
  points2D: [number, number][],
  corners: CornerTreatment[],
  warnings: string[] = []
): [number, number][] {
  const n = points2D.length;
  if (!corners.some((c) => c && c.kind !== "none" && c.amount > 0)) return points2D;
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const cur = points2D[i];
    const c = corners[i];
    if (!c || c.kind === "none" || !(c.amount > 0)) {
      out.push(cur);
      continue;
    }
    const prev = points2D[(i + n - 1) % n];
    const next = points2D[(i + 1) % n];
    const ax = prev[0] - cur[0], ay = prev[1] - cur[1];
    const bx = next[0] - cur[0], by = next[1] - cur[1];
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    if (la < 1e-9 || lb < 1e-9) {
      out.push(cur);
      continue;
    }
    const ux = ax / la, uy = ay / la, vx = bx / lb, vy = by / lb;
    const cosT = Math.max(-1, Math.min(1, ux * vx + uy * vy));
    const theta = Math.acos(cosT); // interior angle at the corner
    if (theta < 1e-3 || Math.PI - theta < 1e-3) {
      out.push(cur); // degenerate or collinear: nothing to round
      continue;
    }
    const maxSetback = 0.5 * Math.min(la, lb);
    if (c.kind === "chamfer") {
      const d = Math.min(c.amount, maxSetback);
      out.push([cur[0] + ux * d, cur[1] + uy * d], [cur[0] + vx * d, cur[1] + vy * d]);
      continue;
    }
    const half = theta / 2;
    const t = Math.min(c.amount / Math.tan(half), maxSetback);
    const r = t * Math.tan(half);
    let bxs = ux + vx, bys = uy + vy;
    const bl = Math.hypot(bxs, bys);
    bxs /= bl;
    bys /= bl;
    const dc = r / Math.sin(half);
    const cx = cur[0] + bxs * dc, cy = cur[1] + bys * dc;
    const t1: [number, number] = [cur[0] + ux * t, cur[1] + uy * t];
    const t2: [number, number] = [cur[0] + vx * t, cur[1] + vy * t];
    const a1 = Math.atan2(t1[1] - cy, t1[0] - cx);
    let delta = Math.atan2(t2[1] - cy, t2[0] - cx) - a1;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    for (let k = 0; k <= ARC_SEGMENTS; k++) {
      const ang = a1 + (delta * k) / ARC_SEGMENTS;
      out.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
    }
  }
  if (out.length < 3 || out.some((p) => !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) {
    warnings.push("Raccordo/smusso non applicato: geometria non valida, schizzo originale usato.");
    return points2D;
  }
  return out;
}


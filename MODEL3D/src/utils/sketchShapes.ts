export type SketchShapeKind = "square" | "rectangle" | "triangle" | "circle" | "ellipse" | "polygon";

export interface SketchShapeParams {
  cx: number;
  cy: number;
  width: number;
  height: number;
  radius: number;
  radiusX: number;
  radiusY: number;
  sides: number;
}

const SEGMENTS = 48;

export function generateShapePoints(kind: SketchShapeKind, p: SketchShapeParams): [number, number][] {
  switch (kind) {
    case "square": {
      const h = p.width / 2;
      return [
        [p.cx - h, p.cy - h],
        [p.cx + h, p.cy - h],
        [p.cx + h, p.cy + h],
        [p.cx - h, p.cy + h]
      ];
    }
    case "rectangle": {
      const hw = p.width / 2;
      const hh = p.height / 2;
      return [
        [p.cx - hw, p.cy - hh],
        [p.cx + hw, p.cy - hh],
        [p.cx + hw, p.cy + hh],
        [p.cx - hw, p.cy + hh]
      ];
    }
    case "triangle": {
      const hw = p.width / 2;
      const hh = p.height / 2;
      return [
        [p.cx, p.cy + hh],
        [p.cx - hw, p.cy - hh],
        [p.cx + hw, p.cy - hh]
      ];
    }
    case "circle":
      return ring(p.cx, p.cy, p.radius, p.radius, SEGMENTS);
    case "ellipse":
      return ring(p.cx, p.cy, p.radiusX, p.radiusY, SEGMENTS);
    case "polygon":
      return ring(p.cx, p.cy, p.radius, p.radius, Math.max(3, Math.round(p.sides)));
  }
}

function ring(cx: number, cy: number, rx: number, ry: number, segments: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
  }
  return pts;
}

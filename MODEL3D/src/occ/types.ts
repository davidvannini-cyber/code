export type PrimitiveType = "box" | "sphere" | "cylinder" | "cone" | "torus";
export type BooleanOp = "union" | "subtract" | "intersect";
export type ExportFormat = "stl" | "step";
export type PlaneKind = "top" | "front" | "right";

export interface Placement {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export const IDENTITY_PLACEMENT: Placement = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1]
};

interface FeatureBase {
  id: string;
  active: boolean;
  label: string;
}

export interface PrimitiveFeature extends FeatureBase {
  type: "primitive";
  bodyId: string;
  primType: PrimitiveType;
  params: Record<string, number>;
}

export type CornerKind = "none" | "fillet" | "chamfer";

export interface CornerTreatment {
  kind: CornerKind;
  amount: number;
}

export interface SketchExtrudeFeature extends FeatureBase {
  type: "sketchExtrude";
  bodyId: string;
  plane: PlaneKind;
  offset: number;
  points: [number, number][];
  corners: CornerTreatment[]; // one per point, same index order
  height: number;
}

export interface BooleanFeature extends FeatureBase {
  type: "boolean";
  bodyId: string;
  op: BooleanOp;
  inputA: string;
  inputB: string;
}

export type Feature = PrimitiveFeature | SketchExtrudeFeature | BooleanFeature;

export interface MeshData {
  positions: Float32Array;
  indices: Uint32Array;
}

export interface EdgeData {
  points: number[]; // flat xyz triplets, polyline
}

// [triangleStartIndex, triangleCount] per OCC face, in the same order they
// were triangulated — lets the client map a raycast hit (triangle index)
// back to "which face of the solid was clicked".
export type FaceRange = [number, number];

export interface BodyResult {
  bodyId: string;
  mesh: { positions: number[]; indices: number[] };
  edges: EdgeData[];
  faceRanges: FaceRange[];
}

/** Client-side body with typed-array mesh data, ready for a BufferGeometry. */
export interface LiveBody {
  bodyId: string;
  mesh: MeshData;
  edges: EdgeData[];
  faceRanges: FaceRange[];
}

export interface ShapeExportRef {
  bodyId: string;
  matrix: number[]; // column-major 4x4
}

export type WorkerRequest =
  | { id: string; type: "init" }
  | {
      id: string;
      type: "rebuild";
      payload: { features: Feature[]; placements: Record<string, number[]> };
    }
  | {
      id: string;
      type: "exportFile";
      payload: { format: ExportFormat; shapes: ShapeExportRef[] };
    };

export type WorkerResponse =
  | { id: string; type: "ready" }
  | { id: string; type: "rebuildResult"; payload: { bodies: BodyResult[]; warnings: string[] } }
  | { id: string; type: "exportResult"; payload: { data: number[]; filename: string; mime: string } }
  | { id: string; type: "error"; payload: { message: string } };

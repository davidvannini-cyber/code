/// <reference lib="webworker" />
import { initOpenCascade } from "opencascade.js";
import type {
  WorkerRequest,
  WorkerResponse,
  ShapeExportRef,
  Feature,
  PlaneKind,
  BodyResult,
  CornerTreatment
} from "./types";

let oc: any = null;

/**
 * opencascade.js exposes embind overloads as Name_1, Name_2, ... in the order
 * declared in the OCCT header (see embind/conventions.md in the package). The
 * exact index is not published anywhere for every class, so these helpers
 * probe the low-numbered overloads (and the bare, unsuffixed name, used when
 * a class only has a single constructor/overload) instead of hardcoding one.
 */
function construct(ns: any, className: string, args: any[]): any {
  let lastErr: unknown;
  // Some OCCT classes have dozens of constructor overloads (e.g.
  // BRepBuilderAPI_MakeFace goes up to _22, BRepBuilderAPI_MakeEdge to _35) —
  // a low cap here silently skips the real one and reports "no accessible
  // constructor", which is exactly the bug this range fixes.
  for (let i = 1; i <= 40; i++) {
    const Ctor = ns[`${className}_${i}`];
    if (!Ctor) continue;
    try {
      return new Ctor(...args);
    } catch (e) {
      lastErr = e;
    }
  }
  if (ns[className]) {
    try {
      return new ns[className](...args);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`construct(${className}) failed with ${args.length} args: ${lastErr}`);
}

function call(obj: any, methodBase: string, args: any[]): any {
  let lastErr: unknown;
  for (let i = 1; i <= 20; i++) {
    const fn = obj[`${methodBase}_${i}`];
    if (typeof fn !== "function") continue;
    try {
      return fn.apply(obj, args);
    } catch (e) {
      lastErr = e;
    }
  }
  if (typeof obj[methodBase] === "function") {
    try {
      return obj[methodBase](...args);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`call(${methodBase}) failed with ${args.length} args: ${lastErr}`);
}

function tryCall(obj: any, methodBase: string, args: any[]): { ok: boolean; value?: any } {
  try {
    return { ok: true, value: call(obj, methodBase, args) };
  } catch {
    return { ok: false };
  }
}

function post(msg: WorkerResponse) {
  (self as unknown as Worker).postMessage(msg);
}

// ---------- mesh / edge extraction ----------

function shapeToMesh(shape: any): { positions: number[]; indices: number[]; faceRanges: [number, number][] } {
  construct(oc, "BRepMesh_IncrementalMesh", [shape, 0.15, false, 0.5, false]);

  const positions: number[] = [];
  const indices: number[] = [];
  const faceRanges: [number, number][] = [];

  const explorer = construct(oc, "TopExp_Explorer", [
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_FACE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE
  ]);

  for (; explorer.More(); explorer.Next()) {
    try {
      const face = call(oc.TopoDS, "Face", [explorer.Current()]);
      const location = construct(oc, "TopLoc_Location", []);
      const triHandle = call(oc.BRep_Tool, "Triangulation", [face, location]);
      if (!triHandle || triHandle.IsNull()) continue;
      const tri = triHandle.get();
      const trsf = location.Transformation();

      const nbNodes = tri.NbNodes();
      const startIndex = positions.length / 3;
      for (let i = 1; i <= nbNodes; i++) {
        const p = tri.Node(i).Transformed(trsf);
        positions.push(p.X(), p.Y(), p.Z());
      }

      const orientation = call(face, "Orientation", []);
      const nbTriangles = tri.NbTriangles();
      const triangleStart = indices.length / 3;
      for (let i = 1; i <= nbTriangles; i++) {
        const t = tri.Triangle(i);
        let n1 = t.Value(1);
        let n2 = t.Value(2);
        let n3 = t.Value(3);
        if (orientation === oc.TopAbs_Orientation.TopAbs_REVERSED) {
          const tmp = n2;
          n2 = n3;
          n3 = tmp;
        }
        indices.push(startIndex + n1 - 1, startIndex + n2 - 1, startIndex + n3 - 1);
      }
      faceRanges.push([triangleStart, nbTriangles]);
    } catch (e) {
      console.error("MODEL3D: face triangulation skipped", e);
    }
  }

  return { positions, indices, faceRanges };
}

function shapeEdges(shape: any): { points: number[] }[] {
  const edges: { points: number[] }[] = [];
  const explorer = construct(oc, "TopExp_Explorer", [
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_EDGE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE
  ]);
  const SEGMENTS = 20;
  for (; explorer.More(); explorer.Next()) {
    try {
      const edge = call(oc.TopoDS, "Edge", [explorer.Current()]);
      const adaptor = construct(oc, "BRepAdaptor_Curve", [edge]);
      const first = call(adaptor, "FirstParameter", []);
      const last = call(adaptor, "LastParameter", []);
      const points: number[] = [];
      for (let i = 0; i <= SEGMENTS; i++) {
        const t = first + ((last - first) * i) / SEGMENTS;
        const p = call(adaptor, "Value", [t]);
        points.push(p.X(), p.Y(), p.Z());
      }
      edges.push({ points });
    } catch (e) {
      console.error("MODEL3D: edge sampling skipped", e);
    }
  }
  return edges;
}

// ---------- transform helpers ----------

function makeGTrsfFromMatrix(m: number[]): any {
  // gp_GTrsf has no confirmed bulk "SetValues" in this build; SetValue(row,
  // col, value) (1-based, col 4 = translation) is the grounded, always-there
  // per-cell setter.
  const gtrsf = construct(oc, "gp_GTrsf", []);
  const rows = [
    [m[0], m[4], m[8], m[12]],
    [m[1], m[5], m[9], m[13]],
    [m[2], m[6], m[10], m[14]]
  ];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      call(gtrsf, "SetValue", [r + 1, c + 1, rows[r][c]]);
    }
  }
  return gtrsf;
}

function bakeMatrix(shape: any, matrix: number[] | undefined): any {
  if (!matrix) return shape;
  const gtrsf = makeGTrsfFromMatrix(matrix);
  const transformer = construct(oc, "BRepBuilderAPI_GTransform", [shape, gtrsf, true]);
  return call(transformer, "Shape", []);
}

// ---------- primitives ----------
// All primitives are built so their lowest point sits at local Y=0 (ground),
// centered on X/Z — so a freshly added body (identity placement) rests on
// the grid instead of being buried half below it.

function translateShape(shape: any, vec: [number, number, number]): any {
  const trsf = construct(oc, "gp_Trsf", []);
  call(trsf, "SetTranslation", [construct(oc, "gp_Vec", vec)]);
  return call(construct(oc, "BRepBuilderAPI_Transform", [shape, trsf, true]), "Shape", []);
}

function rotateXMinus90(shape: any): any {
  const rot = construct(oc, "gp_Trsf", []);
  const axis = construct(oc, "gp_Ax1", [construct(oc, "gp_Pnt", [0, 0, 0]), construct(oc, "gp_Dir", [1, 0, 0])]);
  call(rot, "SetRotation", [axis, -Math.PI / 2]);
  return call(construct(oc, "BRepBuilderAPI_Transform", [shape, rot, true]), "Shape", []);
}

function makePrimitive(primType: string, params: Record<string, number>): any {
  switch (primType) {
    case "box": {
      const { width, height, depth } = params;
      // MakeBox already spans [0,w]x[0,h]x[0,d]; only X/Z need centering.
      const raw = call(construct(oc, "BRepPrimAPI_MakeBox", [width, height, depth]), "Shape", []);
      return translateShape(raw, [-width / 2, 0, -depth / 2]);
    }
    case "sphere": {
      const { radius } = params;
      const raw = call(construct(oc, "BRepPrimAPI_MakeSphere", [radius]), "Shape", []);
      return translateShape(raw, [0, radius, 0]);
    }
    case "cylinder": {
      const { radius, height } = params;
      // MakeCylinder spans z:[0,H]; rotating -90 about X maps z->y directly,
      // so the base lands exactly on y=0 with no extra translation needed.
      const raw = call(construct(oc, "BRepPrimAPI_MakeCylinder", [radius, height]), "Shape", []);
      return rotateXMinus90(raw);
    }
    case "cone": {
      const { radius1, radius2, height } = params;
      const raw = call(construct(oc, "BRepPrimAPI_MakeCone", [radius1, radius2, height]), "Shape", []);
      return rotateXMinus90(raw);
    }
    case "torus": {
      const { radius, tube } = params;
      // MakeTorus is centered on its axis; after the same -90 X rotation it's
      // centered on y=0 spanning [-tube,tube], so shift up by tube.
      const raw = call(construct(oc, "BRepPrimAPI_MakeTorus", [radius, tube]), "Shape", []);
      return translateShape(rotateXMinus90(raw), [0, tube, 0]);
    }
    default:
      throw new Error(`Unknown primitive type ${primType}`);
  }
}

// ---------- sketch plane math ----------

// u, v, normal must form a right-handed basis (u x v = normal) so the client
// can render the sketch plane with a plain rotation matrix (PendingShapesRenderer.tsx
// uses the identical basis below); a left-handed triple can't be represented
// by a quaternion and silently mirrors one axis.
function planeBasis(plane: PlaneKind, offset: number): { origin: [number, number, number]; u: [number, number, number]; v: [number, number, number]; normal: [number, number, number] } {
  switch (plane) {
    case "top": // ground plane, sketch in XZ, extrude along +Y
      return { origin: [0, offset, 0], u: [1, 0, 0], v: [0, 0, -1], normal: [0, 1, 0] };
    case "front": // sketch in XY, extrude along +Z
      return { origin: [0, 0, offset], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] };
    case "right": // sketch in ZY, extrude along +X
      return { origin: [offset, 0, 0], u: [0, 0, 1], v: [0, -1, 0], normal: [1, 0, 0] };
  }
}

function to3D(pt: [number, number], basis: ReturnType<typeof planeBasis>): [number, number, number] {
  return [
    basis.origin[0] + basis.u[0] * pt[0] + basis.v[0] * pt[1],
    basis.origin[1] + basis.u[1] * pt[0] + basis.v[1] * pt[1],
    basis.origin[2] + basis.u[2] * pt[0] + basis.v[2] * pt[1]
  ];
}

// Applies each point's own fillet/chamfer treatment to the matching face
// vertex. TopExp_Explorer's traversal order over a face's vertices is not
// guaranteed to match the input points[] order, so vertices are matched to
// points by 3D position instead of by index.
function applySketchCorners(
  face: any,
  points2D: [number, number][],
  basis: ReturnType<typeof planeBasis>,
  corners: CornerTreatment[],
  warnings: string[]
): any {
  const hasAny = corners.some((c) => c.kind !== "none" && c.amount > 0);
  if (!hasAny) return face;
  const targets3D = points2D.map((p) => to3D(p, basis));
  try {
    const mf = construct(oc, "BRepFilletAPI_MakeFillet2d", [face]);
    const vExplorer = construct(oc, "TopExp_Explorer", [face, oc.TopAbs_ShapeEnum.TopAbs_VERTEX, oc.TopAbs_ShapeEnum.TopAbs_SHAPE]);
    let appliedAny = false;
    for (; vExplorer.More(); vExplorer.Next()) {
      const vertex = call(oc.TopoDS, "Vertex", [vExplorer.Current()]);
      const pnt = call(oc.BRep_Tool, "Pnt", [vertex]);
      const vx = pnt.X();
      const vy = pnt.Y();
      const vz = pnt.Z();
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < targets3D.length; i++) {
        const [tx, ty, tz] = targets3D[i];
        const d = (vx - tx) ** 2 + (vy - ty) ** 2 + (vz - tz) ** 2;
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      const c = bestIdx >= 0 ? corners[bestIdx] : undefined;
      if (!c || c.kind === "none" || c.amount <= 0) continue;
      const method = c.kind === "fillet" ? "AddFillet" : "AddChamfer";
      const args = c.kind === "fillet" ? [c.amount] : [c.amount, c.amount];
      if (tryCall(mf, method, [vertex, ...args]).ok) appliedAny = true;
    }
    if (!appliedAny) throw new Error("nessuno spigolo modificato (funzione non disponibile in questa build)");
    call(mf, "Build", []);
    const result = call(mf, "Shape", []);
    return call(oc.TopoDS, "Face", [result]);
  } catch (e) {
    warnings.push(`Raccordo/smusso non applicato: ${(e as Error).message ?? e}`);
    return face;
  }
}

function extrudeSketch(
  points2D: [number, number][],
  plane: PlaneKind,
  offset: number,
  height: number,
  corners: CornerTreatment[],
  warnings: string[]
): any {
  const basis = planeBasis(plane, offset);
  const polygon = construct(oc, "BRepBuilderAPI_MakePolygon", []);
  for (const pt of points2D) {
    const [x, y, z] = to3D(pt, basis);
    call(polygon, "Add", [construct(oc, "gp_Pnt", [x, y, z])]);
  }
  call(polygon, "Close", []);
  const wire = call(polygon, "Wire", []);
  let face = call(construct(oc, "BRepBuilderAPI_MakeFace", [wire, true]), "Shape", []);
  face = call(oc.TopoDS, "Face", [face]);

  face = applySketchCorners(face, points2D, basis, corners, warnings);

  const dir = construct(oc, "gp_Vec", [basis.normal[0] * height, basis.normal[1] * height, basis.normal[2] * height]);
  const prism = construct(oc, "BRepPrimAPI_MakePrism", [face, dir, false, true]);
  return call(prism, "Shape", []);
}

function booleanOp(op: string, a: any, b: any): any {
  const className = op === "union" ? "BRepAlgoAPI_Fuse" : op === "subtract" ? "BRepAlgoAPI_Cut" : "BRepAlgoAPI_Common";
  const opShape = construct(oc, className, [a, b]);
  return call(opShape, "Shape", []);
}

// ---------- rebuild (parametric history replay) ----------

let lastShapesById = new Map<string, any>();

function rebuild(features: Feature[], placements: Record<string, number[]>): { bodies: BodyResult[]; warnings: string[] } {
  const shapes = new Map<string, any>();
  const consumed = new Set<string>();
  const warnings: string[] = [];

  for (const f of features) {
    if (!f.active) continue;
    try {
      if (f.type === "primitive") {
        shapes.set(f.bodyId, makePrimitive(f.primType, f.params));
      } else if (f.type === "sketchExtrude") {
        shapes.set(f.bodyId, extrudeSketch(f.points, f.plane, f.offset, f.height, f.corners, warnings));
      } else if (f.type === "boolean") {
        const rawA = shapes.get(f.inputA);
        const rawB = shapes.get(f.inputB);
        if (!rawA || !rawB) {
          warnings.push(`Operazione booleana "${f.label}" saltata: corpo di origine mancante.`);
          continue;
        }
        const a = bakeMatrix(rawA, placements[f.inputA]);
        const b = bakeMatrix(rawB, placements[f.inputB]);
        shapes.set(f.bodyId, booleanOp(f.op, a, b));
        consumed.add(f.inputA);
        consumed.add(f.inputB);
      }
    } catch (e: any) {
      warnings.push(`Errore in feature "${f.label}": ${e?.message ?? e}`);
    }
  }

  lastShapesById = shapes;

  const bodies: BodyResult[] = [];
  for (const [bodyId, shape] of shapes.entries()) {
    if (consumed.has(bodyId)) continue;
    try {
      const { positions, indices, faceRanges } = shapeToMesh(shape);
      bodies.push({ bodyId, mesh: { positions, indices }, edges: shapeEdges(shape), faceRanges });
    } catch (e: any) {
      warnings.push(`Errore triangolazione corpo ${bodyId}: ${e?.message ?? e}`);
    }
  }

  return { bodies, warnings };
}

// ---------- export ----------

function writeStl(shape: any): Uint8Array {
  construct(oc, "BRepMesh_IncrementalMesh", [shape, 0.15, false, 0.5, false]);
  const writer = construct(oc, "StlAPI_Writer", []);
  const path = "/tmp_export.stl";
  call(writer, "Write", [shape, path]);
  const data = oc.FS.readFile(path);
  oc.FS.unlink(path);
  return data;
}

function writeStep(shapes: any[]): Uint8Array {
  const writer = construct(oc, "STEPControl_Writer", []);
  for (const s of shapes) {
    call(writer, "Transfer", [s, oc.STEPControl_StepModelType.STEPControl_AsIs]);
  }
  const path = "/tmp_export.step";
  call(writer, "Write", [path]);
  const data = oc.FS.readFile(path);
  oc.FS.unlink(path);
  return data;
}

function combineShapes(shapes: any[]): any {
  if (shapes.length === 1) return shapes[0];
  const builder = construct(oc, "BRep_Builder", []);
  const compound = construct(oc, "TopoDS_Compound", []);
  call(builder, "MakeCompound", [compound]);
  for (const s of shapes) call(builder, "Add", [compound, s]);
  return compound;
}

async function handle(req: WorkerRequest) {
  try {
    switch (req.type) {
      case "init": {
        oc = await initOpenCascade();
        post({ id: req.id, type: "ready" });
        return;
      }
      case "rebuild": {
        const { bodies, warnings } = rebuild(req.payload.features, req.payload.placements);
        post({ id: req.id, type: "rebuildResult", payload: { bodies, warnings } });
        return;
      }
      case "exportFile": {
        const baked = req.payload.shapes.map((ref) => {
          const shape = lastShapesById.get(ref.bodyId);
          if (!shape) throw new Error(`Corpo ${ref.bodyId} non trovato per l'esportazione`);
          return bakeMatrix(shape, ref.matrix);
        });
        if (req.payload.format === "stl") {
          const combined = combineShapes(baked);
          const data = writeStl(combined);
          post({ id: req.id, type: "exportResult", payload: { data: Array.from(data), filename: "model3d.stl", mime: "model/stl" } });
        } else {
          const data = writeStep(baked);
          post({ id: req.id, type: "exportResult", payload: { data: Array.from(data), filename: "model3d.step", mime: "application/step" } });
        }
        return;
      }
    }
  } catch (e: any) {
    post({ id: req.id, type: "error", payload: { message: e?.message ?? String(e) } });
  }
}

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  handle(ev.data);
};

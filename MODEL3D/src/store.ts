import { create } from "zustand";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { occClient } from "./occ/occClient";
import { write3MF, read3MFProject } from "./io/threeMF";
import type { BooleanOp, PrimitiveType, PlaneKind, Feature, LiveBody, Placement, ShapeExportRef, CornerTreatment } from "./occ/types";
import { IDENTITY_PLACEMENT } from "./occ/types";
import { faceFrame, layFacePlacement, matePlacement } from "./utils/faceMate";
import { generateShapePoints, type SketchShapeKind, type SketchShapeParams } from "./utils/sketchShapes";

export type SceneBackground = "dark" | "light";
export type TransformMode = "translate" | "rotate" | "scale";
export type RailCard = "primitives" | "sketch" | "extrude" | "fillet" | "boolean" | "mate" | "bodies" | "io" | null;
export type SketchForme = "libero" | SketchShapeKind;

interface BooleanPick {
  op: BooleanOp;
  picked: string[];
}

export interface PendingShape {
  id: string;
  plane: PlaneKind;
  offset: number;
  points: [number, number][];
  corners: CornerTreatment[];
}

const defaultColorByType: Record<PrimitiveType, string> = {
  box: "#4f8dfd",
  sphere: "#fd6a4f",
  cylinder: "#4ffd8d",
  cone: "#fdd74f",
  torus: "#b24ffd"
};

const DEFAULT_SHAPE_PARAMS: SketchShapeParams = { cx: 0, cy: 0, width: 20, height: 20, radius: 10, radiusX: 14, radiusY: 8, sides: 6 };

let featureCounter = 0;
const nextFeatureId = () => `f_${Date.now()}_${featureCounter++}`;
let pendingCounter = 0;
const nextPendingId = () => `p_${Date.now()}_${pendingCounter++}`;

function matrixFor(p: Placement): number[] {
  const m = new Matrix4();
  m.compose(new Vector3(...p.position), new Quaternion().setFromEuler(new Euler(...p.rotation)), new Vector3(...p.scale));
  return Array.from(m.elements);
}

function collectDependents(id: string, features: Feature[]): Set<string> {
  const toDelete = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of features) {
      if (toDelete.has(f.id)) continue;
      const dependsOnDeleted =
        (f.type === "boolean" && (toDelete.has(f.inputA) || toDelete.has(f.inputB))) ||
        (f.type === "edgeFillet" && toDelete.has(f.sourceId));
      if (dependsOnDeleted) {
        toDelete.add(f.id);
        changed = true;
      }
    }
  }
  return toDelete;
}

// One undo step: the feature history plus where each body sits and its colour,
// so moving, rotating and recolouring bodies can be undone like feature edits.
interface Snapshot {
  features: Feature[];
  placements: Record<string, Placement>;
  colors: Record<string, string>;
}

const takeSnapshot = (s: { features: Feature[]; placements: Record<string, Placement>; colors: Record<string, string> }): Snapshot => ({
  features: s.features,
  placements: s.placements,
  colors: s.colors
});

// Rapid edits of the same thing (typing in a position field, dragging a colour
// picker) collapse into one undo step.
let lastEditKey = "";
let lastEditTime = 0;
function pushHistory(set: any, key: string) {
  const now = Date.now();
  const coalesce = key === lastEditKey && now - lastEditTime < 1000;
  lastEditKey = key;
  lastEditTime = now;
  if (coalesce) return;
  set((s: EditorState) => ({ undoStack: [...s.undoStack, takeSnapshot(s)], redoStack: [] }));
}

interface EditorState {
  engineReady: boolean;
  busy: boolean;
  logs: string[];
  sceneBackground: SceneBackground;
  setSceneBackground: (bg: SceneBackground) => void;
  activeCard: RailCard;
  setActiveCard: (card: RailCard) => void;

  features: Feature[];
  bodies: LiveBody[];
  placements: Record<string, Placement>;
  colors: Record<string, string>;

  undoStack: Snapshot[];
  redoStack: Snapshot[];

  selectedBodyId: string | null;
  selectedFace: { bodyId: string; faceIndex: number } | null;
  transformMode: TransformMode;

  log: (message: string) => void;
  initEngine: () => Promise<void>;

  addPrimitive: (type: PrimitiveType, params: Record<string, number>) => void;
  updateFeatureParams: (id: string, patch: Record<string, any>) => void;
  toggleFeatureActive: (id: string) => void;
  deleteFeature: (id: string) => void;
  undo: () => void;
  redo: () => void;

  selectBody: (id: string | null) => void;
  selectFace: (bodyId: string, faceIndex: number) => void;
  clearSelection: () => void;
  layFaceOnPlane: () => void;
  setTransformMode: (mode: TransformMode) => void;
  updatePlacement: (bodyId: string, patch: Partial<Placement>) => void;
  updateColor: (bodyId: string, color: string) => void;
  rotateAroundPoint: (bodyId: string, pivot: [number, number, number], axis: 0 | 1 | 2, degrees: number) => void;

  // --- Schizzo: plane/offset/snap config + shape picker + freehand draft ---
  sketchPlane: PlaneKind;
  sketchOffset: number;
  snapEnabled: boolean;
  snapSize: number;
  sketchForme: SketchForme;
  sketchShapeParams: SketchShapeParams;
  setSketchPlane: (plane: PlaneKind) => void;
  setSketchOffset: (offset: number) => void;
  setSnap: (enabled: boolean, size?: number) => void;
  setSketchForme: (forme: SketchForme) => void;
  setSketchShapeParam: (patch: Partial<SketchShapeParams>) => void;

  drafting: boolean;
  draftPoints: [number, number][];
  draftPressures: number[];
  draftClosed: boolean;
  addDraftPoint: (pt: [number, number], pressure: number) => void;
  undoDraftPoint: () => void;
  clearDraft: () => void;
  cancelDraft: () => void;
  closeDraft: () => void;
  setDraftSegmentLength: (index: number, newLength: number) => void;
  createShape2D: () => void;

  pendingShapes: PendingShape[];
  removePendingShape: (id: string) => void;

  // --- Estrusione: choosing a shape extrudes it at once; the height field then edits that feature live ---
  extrudePickActive: boolean;
  extrudeEditId: string | null;
  extrudeHeight: number;
  startExtrudeTool: () => void;
  cancelExtrudeTool: () => void;
  pickExtrudeTarget: (pendingId: string) => void;
  setExtrudeHeight: (h: number) => void;

  // --- Raccordo/Smusso: choosing an edge/corner applies it at once; kind and size then edit it live ---
  filletPickActive: boolean;
  filletEditId: string | null;
  filletTargetShapeId: string | null;
  filletCornerIndex: number | null;
  filletKind: "fillet" | "chamfer";
  filletAmount: number;
  pickFilletEdge: (bodyId: string, edgeIndex: number) => void;
  startFilletTool: () => void;
  cancelFilletTool: () => void;
  pickFilletCorner: (shapeId: string, cornerIndex: number) => void;
  setFilletKind: (kind: "fillet" | "chamfer") => void;
  setFilletAmount: (amount: number) => void;

  // --- Affianca: pick a face on the fixed body, then a face on the body to move ---
  mateActive: boolean;
  mateFaceA: { bodyId: string; faceIndex: number } | null;
  mateFaceB: { bodyId: string; faceIndex: number } | null;
  mateCenter: boolean;
  startMateTool: () => void;
  cancelMateTool: () => void;
  pickMateFace: (bodyId: string, faceIndex: number) => void;
  setMateCenter: (center: boolean) => void;
  applyMate: () => void;

  booleanPick: BooleanPick | null;
  startBooleanPick: (op: BooleanOp) => void;
  cancelBooleanPick: () => void;
  pickForBoolean: (id: string) => void;

  exportModel: (format: "stl" | "step") => Promise<void>;
  saveProject: () => void;
  loadProject: (file: File) => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  engineReady: false,
  busy: false,
  logs: [],
  sceneBackground: "dark",
  setSceneBackground: (bg) => set({ sceneBackground: bg }),
  activeCard: null,
  setActiveCard: (card) =>
    set((s) => {
      const next = s.activeCard === card ? null : card;
      const mateReset = next !== "mate" ? { mateActive: false, mateFaceA: null, mateFaceB: null } : {};
      // Leaving the sketch card ends any free-hand drafting in progress.
      const draftReset = next !== "sketch" ? { drafting: false, draftPoints: [], draftPressures: [], draftClosed: false } : {};
      return { activeCard: next, ...mateReset, ...draftReset };
    }),

  features: [],
  bodies: [],
  placements: {},
  colors: {},

  undoStack: [],
  redoStack: [],

  selectedBodyId: null,
  selectedFace: null,
  transformMode: "translate",

  log: (message) => set((s) => ({ logs: [...s.logs.slice(-49), message] })),

  initEngine: async () => {
    get().log("Avvio motore geometrico (OpenCascade)...");
    try {
      await occClient.whenReady();
      set({ engineReady: true });
      get().log("Motore geometrico pronto.");
    } catch (e: any) {
      get().log(`Errore avvio motore: ${e?.message ?? e}`);
    }
  },

  addPrimitive: (type, params) => {
    const id = nextFeatureId();
    const count = get().features.filter((f) => f.type === "primitive" && f.primType === type).length + 1;
    const feature: Feature = { id, active: true, label: `${type}_${count}`, type: "primitive", bodyId: id, primType: type, params };
    ensureDefaults(set, get, id, defaultColorByType[type]);
    // The new primitive is selected once it exists, so its sizes show up right away.
    commit(set, get, [...get().features, feature]).then(() => {
      if (get().bodies.some((b) => b.bodyId === id)) set({ selectedBodyId: id, selectedFace: null });
    });
  },

  updateFeatureParams: (id, patch) => {
    const features = get().features.map((f) => (f.id === id ? ({ ...f, ...patch } as Feature) : f));
    commit(set, get, features, `feature:${id}`);
  },

  toggleFeatureActive: (id) => {
    const features = get().features.map((f) => (f.id === id ? { ...f, active: !f.active } : f));
    commit(set, get, features);
  },

  deleteFeature: (id) => {
    const toDelete = collectDependents(id, get().features);
    const features = get().features.filter((f) => !toDelete.has(f.id));
    if (toDelete.size > 1) get().log(`Eliminate ${toDelete.size} feature collegate.`);
    commit(set, get, features);
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const current = takeSnapshot(get());
    lastEditKey = "";
    set({ undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, current], placements: prev.placements, colors: prev.colors, filletEditId: null, extrudeEditId: null });
    if (prev.features !== current.features) applyFeatures(set, get, prev.features);
  },

  redo: () => {
    const { redoStack, undoStack } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const current = takeSnapshot(get());
    lastEditKey = "";
    set({ redoStack: redoStack.slice(0, -1), undoStack: [...undoStack, current], placements: next.placements, colors: next.colors, filletEditId: null, extrudeEditId: null });
    if (next.features !== current.features) applyFeatures(set, get, next.features);
  },

  selectBody: (id) => set({ selectedBodyId: id, selectedFace: null }),
  // Picking a face drops the whole-body selection (gizmo, parameters); double click selects the body.
  selectFace: (bodyId, faceIndex) => set({ selectedBodyId: null, selectedFace: { bodyId, faceIndex } }),
  clearSelection: () => {
    const s = get();
    set({ selectedBodyId: null, selectedFace: null });
    if (s.drafting) set({ drafting: false, draftPoints: [], draftPressures: [], draftClosed: false });
    if (s.extrudePickActive || s.extrudeEditId) get().cancelExtrudeTool();
    if (s.filletPickActive || s.filletEditId || s.filletTargetShapeId) get().cancelFilletTool();
    if (s.booleanPick) get().cancelBooleanPick();
    if (s.mateActive) get().cancelMateTool();
  },
  setTransformMode: (mode) => set({ transformMode: mode }),

  // Lays the selected face flat on the ground plane (face down, lowest point at y = 0).
  layFaceOnPlane: () => {
    const { selectedFace, bodies, placements } = get();
    if (!selectedFace) return;
    const body = bodies.find((b) => b.bodyId === selectedFace.bodyId);
    if (!body) return;
    const result = layFacePlacement(body, selectedFace.faceIndex, placements[body.bodyId] ?? IDENTITY_PLACEMENT);
    if (!result) {
      get().log("Scegli una faccia piana per appoggiarla sul piano.");
      return;
    }
    get().updatePlacement(body.bodyId, result.placement);
    get().log(result.faceIsLowest ? "Faccia appoggiata sul piano." : "Oggetto appoggiato sul piano: la faccia scelta non è la parte più bassa.");
  },

  updatePlacement: (bodyId, patch) => {
    pushHistory(set, `placement:${bodyId}`);
    set((s) => ({ placements: { ...s.placements, [bodyId]: { ...(s.placements[bodyId] ?? IDENTITY_PLACEMENT), ...patch } } }));
  },

  updateColor: (bodyId, color) => {
    pushHistory(set, `color:${bodyId}`);
    set((s) => ({ colors: { ...s.colors, [bodyId]: color } }));
  },

  rotateAroundPoint: (bodyId, pivot, axis, degrees) => {
    const placement = get().placements[bodyId] ?? IDENTITY_PLACEMENT;
    const rad = (degrees * Math.PI) / 180;
    const axisVec = new Vector3(axis === 0 ? 1 : 0, axis === 1 ? 1 : 0, axis === 2 ? 1 : 0);
    const deltaQuat = new Quaternion().setFromAxisAngle(axisVec, rad);
    const pivotVec = new Vector3(...pivot);
    const relative = new Vector3(...placement.position).sub(pivotVec).applyQuaternion(deltaQuat);
    const newPos = pivotVec.clone().add(relative);
    const oldQuat = new Quaternion().setFromEuler(new Euler(...placement.rotation));
    const newQuat = deltaQuat.clone().multiply(oldQuat);
    const newEuler = new Euler().setFromQuaternion(newQuat);
    get().updatePlacement(bodyId, { position: [newPos.x, newPos.y, newPos.z], rotation: [newEuler.x, newEuler.y, newEuler.z] });
  },

  // ---------------- Schizzo config ----------------
  sketchPlane: "top",
  sketchOffset: 0,
  snapEnabled: true,
  snapSize: 5,
  sketchForme: "libero",
  sketchShapeParams: DEFAULT_SHAPE_PARAMS,

  setSketchPlane: (plane) => set({ sketchPlane: plane }),
  setSketchOffset: (offset) => set({ sketchOffset: offset }),
  setSnap: (enabled, size) => set((s) => ({ snapEnabled: enabled, snapSize: size ?? s.snapSize })),
  setSketchForme: (forme) =>
    set(forme === "libero" ? { sketchForme: forme } : { sketchForme: forme, drafting: false, draftPoints: [], draftPressures: [], draftClosed: false }),
  setSketchShapeParam: (patch) => set((s) => ({ sketchShapeParams: { ...s.sketchShapeParams, ...patch } })),

  drafting: false,
  draftPoints: [],
  draftPressures: [],
  draftClosed: false,

  addDraftPoint: (pt, pressure) => {
    if (get().draftClosed) return;
    const { snapEnabled, snapSize, draftPoints } = get();
    let [x, y] = pt;
    if (snapEnabled) {
      const gridded: [number, number] = [Math.round(x / snapSize) * snapSize, Math.round(y / snapSize) * snapSize];
      const near = draftPoints.find((p) => Math.hypot(p[0] - pt[0], p[1] - pt[1]) < snapSize * 0.6);
      [x, y] = near ?? gridded;
    }
    set((s) => ({ draftPoints: [...s.draftPoints, [x, y]], draftPressures: [...s.draftPressures, pressure] }));
  },
  undoDraftPoint: () =>
    set((s) => ({ draftPoints: s.draftPoints.slice(0, -1), draftPressures: s.draftPressures.slice(0, -1), draftClosed: false })),
  clearDraft: () => set({ draftPoints: [], draftPressures: [], draftClosed: false }),
  cancelDraft: () => set({ drafting: false, draftPoints: [], draftPressures: [], draftClosed: false }),
  closeDraft: () => {
    const { draftPoints, draftPressures } = get();
    // A closing click that landed on the first point must not duplicate it.
    const first = draftPoints[0];
    const last = draftPoints[draftPoints.length - 1];
    const dup = draftPoints.length > 3 && first && Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-6;
    const points = dup ? draftPoints.slice(0, -1) : draftPoints;
    if (points.length >= 3) set({ draftClosed: true, draftPoints: points, draftPressures: dup ? draftPressures.slice(0, -1) : draftPressures });
  },
  setDraftSegmentLength: (index, newLength) => {
    const points = get().draftPoints;
    const a = points[index];
    const b = points[index + 1];
    if (!a || !b || newLength <= 0) return;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nb: [number, number] = [a[0] + (dx / len) * newLength, a[1] + (dy / len) * newLength];
    const next = [...points];
    next[index + 1] = nb;
    set({ draftPoints: next });
  },

  createShape2D: () => {
    const { sketchForme, sketchShapeParams, drafting, draftPoints, draftClosed, sketchPlane, sketchOffset } = get();
    if (sketchForme === "libero") {
      if (!drafting) {
        set({ drafting: true, draftPoints: [], draftPressures: [], draftClosed: false });
        return;
      }
      if (draftClosed && draftPoints.length >= 3) {
        const shape: PendingShape = {
          id: nextPendingId(),
          plane: sketchPlane,
          offset: sketchOffset,
          points: draftPoints,
          corners: draftPoints.map(() => ({ kind: "none", amount: 0 }))
        };
        set((s) => ({
          pendingShapes: [...s.pendingShapes, shape],
          drafting: false,
          draftPoints: [],
          draftPressures: [],
          draftClosed: false
        }));
        get().log(`Forma 2D creata (${shape.points.length} punti).`);
      } else {
        get().log("Chiudi il poligono (doppio tocco sull'ultimo punto) prima di creare la forma.");
      }
      return;
    }
    const points = generateShapePoints(sketchForme, sketchShapeParams);
    const shape: PendingShape = {
      id: nextPendingId(),
      plane: sketchPlane,
      offset: sketchOffset,
      points,
      corners: points.map(() => ({ kind: "none", amount: 0 }))
    };
    set((s) => ({ pendingShapes: [...s.pendingShapes, shape] }));
    get().log(`Forma 2D creata: ${sketchForme}.`);
  },

  pendingShapes: [],
  removePendingShape: (id) => set((s) => ({ pendingShapes: s.pendingShapes.filter((p) => p.id !== id) })),

  // ---------------- Estrusione tool ----------------
  extrudePickActive: false,
  extrudeEditId: null,
  extrudeHeight: 20,

  startExtrudeTool: () =>
    set({ mateActive: false, mateFaceA: null, mateFaceB: null, extrudePickActive: true, extrudeEditId: null, filletPickActive: false, filletEditId: null, booleanPick: null }),
  cancelExtrudeTool: () => set({ extrudePickActive: false, extrudeEditId: null }),

  pickExtrudeTarget: (pendingId) => {
    const { extrudeHeight, pendingShapes, features } = get();
    const shape = pendingShapes.find((p) => p.id === pendingId);
    if (!shape) return;
    const id = nextFeatureId();
    const count = features.filter((f) => f.type === "sketchExtrude").length + 1;
    const feature: Feature = {
      id,
      active: true,
      label: `estrusione_${count}`,
      type: "sketchExtrude",
      bodyId: id,
      plane: shape.plane,
      offset: shape.offset,
      points: shape.points,
      corners: shape.corners,
      height: extrudeHeight
    };
    ensureDefaults(set, get, id, "#4f8dfd");
    set((s) => ({ pendingShapes: s.pendingShapes.filter((p) => p.id !== shape.id), extrudePickActive: false, extrudeEditId: id }));
    commit(set, get, [...features, feature]);
  },

  setExtrudeHeight: (h) => {
    set({ extrudeHeight: h });
    const id = get().extrudeEditId;
    if (id) get().updateFeatureParams(id, { height: h });
  },

  // ---------------- Raccordo/Smusso tool ----------------
  filletPickActive: false,
  filletEditId: null,
  filletTargetShapeId: null,
  filletCornerIndex: null,
  filletKind: "fillet",
  filletAmount: 2,

  startFilletTool: () =>
    set({
      mateActive: false,
      mateFaceA: null,
      mateFaceB: null,
      filletPickActive: true,
      filletEditId: null,
      filletTargetShapeId: null,
      filletCornerIndex: null,
      extrudePickActive: false,
      extrudeEditId: null,
      booleanPick: null,
      selectedBodyId: null,
      selectedFace: null
    }),
  cancelFilletTool: () => set({ filletPickActive: false, filletEditId: null, filletTargetShapeId: null, filletCornerIndex: null }),

  pickFilletCorner: (shapeId, cornerIndex) => {
    set({ filletTargetShapeId: shapeId, filletCornerIndex: cornerIndex, filletEditId: null, filletPickActive: false });
    syncFillet(set, get);
  },

  pickFilletEdge: (bodyId, edgeIndex) => {
    const { filletKind, filletAmount, features } = get();
    const id = nextFeatureId();
    const count = features.filter((f) => f.type === "edgeFillet").length + 1;
    const feature: Feature = {
      id,
      active: true,
      label: `${filletKind === "fillet" ? "raccordo" : "smusso"}_${count}`,
      type: "edgeFillet",
      bodyId: id,
      sourceId: bodyId,
      edgeIndex,
      kind: filletKind,
      amount: filletAmount
    };
    // The result stays where the source body was placed, with the same colour.
    set((s) => ({
      placements: { ...s.placements, [id]: s.placements[bodyId] ?? IDENTITY_PLACEMENT },
      colors: { ...s.colors, [id]: s.colors[bodyId] ?? "#4f8dfd" },
      filletEditId: id,
      filletTargetShapeId: null,
      filletCornerIndex: null,
      filletPickActive: false
    }));
    commit(set, get, [...features, feature]);
  },

  setFilletKind: (kind) => {
    set({ filletKind: kind });
    syncFillet(set, get);
  },
  setFilletAmount: (amount) => {
    set({ filletAmount: amount });
    syncFillet(set, get);
  },

  // ---------------- Affianca ----------------
  mateActive: false,
  mateFaceA: null,
  mateFaceB: null,
  mateCenter: true,

  startMateTool: () =>
    set({
      mateActive: true,
      mateFaceA: null,
      mateFaceB: null,
      extrudePickActive: false,
      filletPickActive: false,
      booleanPick: null,
      selectedBodyId: null,
      selectedFace: null
    }),
  cancelMateTool: () => set({ mateActive: false, mateFaceA: null, mateFaceB: null }),
  setMateCenter: (center) => set({ mateCenter: center }),

  pickMateFace: (bodyId, faceIndex) => {
    const { mateFaceA, mateFaceB, bodies, placements } = get();
    const body = bodies.find((b) => b.bodyId === bodyId);
    const frame = body && faceFrame(body, faceIndex, placements[bodyId] ?? IDENTITY_PLACEMENT);
    if (!frame) {
      get().log("Faccia non valida per l'affiancamento.");
      return;
    }
    if (!frame.planar) {
      get().log("Scegli una faccia piana (le superfici curve non si possono affiancare).");
      return;
    }
    if (!mateFaceA) {
      set({ mateFaceA: { bodyId, faceIndex } });
    } else if (mateFaceA.bodyId === bodyId) {
      get().log("Scegli la seconda faccia su un altro oggetto.");
    } else {
      set({ mateFaceB: { bodyId, faceIndex } });
    }
  },

  applyMate: () => {
    const { mateFaceA, mateFaceB, mateCenter, bodies, placements } = get();
    if (!mateFaceA || !mateFaceB) return;
    const bodyA = bodies.find((b) => b.bodyId === mateFaceA.bodyId);
    const bodyB = bodies.find((b) => b.bodyId === mateFaceB.bodyId);
    if (!bodyA || !bodyB) {
      get().log("Corpo non trovato: affiancamento annullato.");
      get().cancelMateTool();
      return;
    }
    const pA = placements[bodyA.bodyId] ?? IDENTITY_PLACEMENT;
    const pB = placements[bodyB.bodyId] ?? IDENTITY_PLACEMENT;
    const fa = faceFrame(bodyA, mateFaceA.faceIndex, pA);
    const fb = faceFrame(bodyB, mateFaceB.faceIndex, pB);
    if (!fa || !fb) {
      get().log("Affiancamento non riuscito: faccia non valida.");
      return;
    }
    get().updatePlacement(bodyB.bodyId, matePlacement(pB, fa, fb, mateCenter));
    get().log("Oggetti affiancati.");
    set({ mateActive: false, mateFaceA: null, mateFaceB: null });
  },

  // ---------------- Booleane ----------------
  booleanPick: null,
  startBooleanPick: (op) => set({ filletEditId: null, extrudeEditId: null, mateActive: false, mateFaceA: null, mateFaceB: null, booleanPick: { op, picked: [] }, selectedBodyId: null, extrudePickActive: false, filletPickActive: false }),
  cancelBooleanPick: () => set({ booleanPick: null }),

  pickForBoolean: (id) => {
    const pick = get().booleanPick;
    if (!pick || pick.picked.includes(id)) return;
    const picked = [...pick.picked, id];
    if (picked.length < 2) {
      set({ booleanPick: { ...pick, picked } });
      return;
    }
    set({ booleanPick: null });
    const featId = nextFeatureId();
    const count = get().features.filter((f) => f.type === "boolean").length + 1;
    const feature: Feature = {
      id: featId,
      active: true,
      label: `${pick.op}_${count}`,
      type: "boolean",
      bodyId: featId,
      op: pick.op,
      inputA: picked[0],
      inputB: picked[1]
    };
    const sourceColor = get().colors[picked[0]] ?? "#4f8dfd";
    ensureDefaults(set, get, featId, sourceColor);
    commit(set, get, [...get().features, feature]);
  },

  exportModel: async (format) => {
    const { bodies, placements } = get();
    if (bodies.length === 0) {
      get().log("Nessun oggetto da esportare.");
      return;
    }
    set({ busy: true });
    try {
      const shapes: ShapeExportRef[] = bodies.map((b) => ({ bodyId: b.bodyId, matrix: matrixFor(placements[b.bodyId] ?? IDENTITY_PLACEMENT) }));
      const { data, filename, mime } = await occClient.exportFile(format, shapes);
      downloadBlob(data, filename, mime);
      get().log(`Esportato ${filename}`);
    } catch (e: any) {
      get().log(`Errore esportazione: ${e?.message ?? e}`);
    } finally {
      set({ busy: false });
    }
  },

  saveProject: () => {
    const { features, placements, colors, bodies, pendingShapes } = get();
    if (pendingShapes.length > 0) {
      get().log("Nota: le forme 2D non ancora estruse non vengono salvate nel .3mf — estrudile prima di salvare.");
    }
    try {
      const data = write3MF({ features, placements, colors }, bodies);
      downloadBlob(data, "progetto.3mf", "model/3mf");
      get().log("Progetto salvato come progetto.3mf");
    } catch (e: any) {
      get().log(`Errore salvataggio: ${e?.message ?? e}`);
    }
  },

  loadProject: async (file) => {
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const project = read3MFProject(buf);
      if (!project) {
        get().log("File .3mf non creato da MODEL3D: importazione non supportata in questa versione.");
        return;
      }
      set({ placements: project.placements, colors: project.colors, undoStack: [], redoStack: [], selectedBodyId: null });
      applyFeatures(set, get, project.features);
      get().log(`Progetto caricato da ${file.name}`);
    } catch (e: any) {
      get().log(`Errore caricamento: ${e?.message ?? e}`);
    }
  }
}));

// Writes the current kind/size into whatever the fillet tool is editing: the
// solid's fillet/chamfer feature, or a corner of a 2D shape.
function syncFillet(set: any, get: () => EditorState) {
  const { filletEditId, filletTargetShapeId, filletCornerIndex, filletKind, filletAmount } = get();
  if (filletEditId) {
    get().updateFeatureParams(filletEditId, { kind: filletKind, amount: filletAmount });
  } else if (filletTargetShapeId && filletCornerIndex !== null) {
    set((s: EditorState) => ({
      pendingShapes: s.pendingShapes.map((p) =>
        p.id === filletTargetShapeId
          ? { ...p, corners: p.corners.map((c, i) => (i === filletCornerIndex ? { kind: filletKind, amount: filletAmount } : c)) }
          : p
      )
    }));
  }
}

function ensureDefaults(set: any, get: () => EditorState, id: string, color: string) {
  set((s: EditorState) => ({
    placements: s.placements[id] ? s.placements : { ...s.placements, [id]: IDENTITY_PLACEMENT },
    colors: s.colors[id] ? s.colors : { ...s.colors, [id]: color }
  }));
}

function commit(set: any, get: () => EditorState, newFeatures: Feature[], key?: string): Promise<void> {
  // Repeated edits of one feature (holding a − / + button) count as a single undo step.
  const now = Date.now();
  const coalesce = key !== undefined && key === lastEditKey && now - lastEditTime < 1000;
  lastEditKey = key ?? "";
  lastEditTime = now;
  if (!coalesce) set((s: EditorState) => ({ undoStack: [...s.undoStack, takeSnapshot(s)], redoStack: [] }));
  return applyFeatures(set, get, newFeatures);
}

async function applyFeatures(set: any, get: () => EditorState, newFeatures: Feature[]) {
  set({ features: newFeatures, busy: true });
  try {
    const placements = get().placements;
    const matrices = Object.fromEntries(Object.entries(placements).map(([id, p]) => [id, matrixFor(p)]));
    const { bodies, warnings } = await occClient.rebuild(newFeatures, matrices);
    const liveIds = new Set(bodies.map((b) => b.bodyId));
    set((s: EditorState) => ({ bodies, selectedBodyId: s.selectedBodyId && liveIds.has(s.selectedBodyId) ? s.selectedBodyId : null }));
    for (const w of warnings) get().log(w);
  } catch (e: any) {
    get().log(`Errore ricostruzione modello: ${e?.message ?? e}`);
  } finally {
    set({ busy: false });
  }
}

function downloadBlob(data: Uint8Array, filename: string, mime: string) {
  const blob = new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

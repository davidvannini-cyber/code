import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { Feature, Placement } from "../occ/types";
import type { LiveBody } from "../occ/types";

export interface ProjectData {
  features: Feature[];
  placements: Record<string, Placement>;
  colors: Record<string, string>;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
  <Default Extension="json" ContentType="application/json"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rel0" Target="/3D/3dmodel.model" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

function placementMatrixRow(p: Placement): string {
  const m = new Matrix4();
  m.compose(
    new Vector3(...p.position),
    new Quaternion().setFromEuler(new Euler(...p.rotation)),
    new Vector3(...p.scale)
  );
  const e = m.elements;
  const vals = [e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10], e[12], e[13], e[14]];
  return vals.map((v) => v.toFixed(6)).join(" ");
}

function hexToDisplayColor(hex: string): string {
  return `${hex.toUpperCase()}FF`;
}

export function write3MF(project: ProjectData, bodies: LiveBody[]): Uint8Array {
  const objectsXml: string[] = [];
  const itemsXml: string[] = [];
  const baseXml: string[] = [];

  bodies.forEach((body, i) => {
    const objectId = i + 1;
    const positions = body.mesh.positions;
    const indices = body.mesh.indices;
    const vertices: string[] = [];
    for (let v = 0; v < positions.length; v += 3) {
      vertices.push(`<vertex x="${positions[v].toFixed(5)}" y="${positions[v + 1].toFixed(5)}" z="${positions[v + 2].toFixed(5)}"/>`);
    }
    const triangles: string[] = [];
    for (let t = 0; t < indices.length; t += 3) {
      triangles.push(`<triangle v1="${indices[t]}" v2="${indices[t + 1]}" v3="${indices[t + 2]}" pid="1" p1="${i}"/>`);
    }
    objectsXml.push(
      `<object id="${objectId}" type="model"><mesh><vertices>${vertices.join("")}</vertices><triangles>${triangles.join("")}</triangles></mesh></object>`
    );
    const placement = project.placements[body.bodyId] ?? { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
    itemsXml.push(`<item objectid="${objectId}" transform="${placementMatrixRow(placement)}"/>`);
    const color = project.colors[body.bodyId] ?? "#4f8dfd";
    baseXml.push(`<base name="body${i}" displaycolor="${hexToDisplayColor(color)}"/>`);
  });

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="it" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Application">MODEL3D</metadata>
  <resources>
    <basematerials id="1">${baseXml.join("")}</basematerials>
    ${objectsXml.join("\n    ")}
  </resources>
  <build>
    ${itemsXml.join("\n    ")}
  </build>
</model>`;

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(CONTENT_TYPES),
    "_rels/.rels": strToU8(RELS),
    "3D/3dmodel.model": strToU8(modelXml),
    "Metadata/model3d.json": strToU8(JSON.stringify(project))
  };

  return zipSync(files, { level: 6 });
}

export interface ImportedMesh {
  name: string;
  positions: number[]; // flat xyz, millimetres, Y up
  indices: number[];
}

const UNIT_TO_MM: Record<string, number> = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 };

interface ParsedObject {
  type: string;
  name: string;
  vertices?: Float64Array;
  triangles?: number[];
  components: { objectId: string; path: string | null; matrix: Matrix4 }[];
}

interface ParsedModel {
  scale: number;
  objects: Map<string, ParsedObject>;
  items: { objectId: string; matrix: Matrix4 }[];
}

// 3MF writes a matrix as 12 numbers, row-vector style: x' = x*m0 + y*m3 + z*m6 + m9.
function parseTransform(text: string | null): Matrix4 {
  const m = new Matrix4();
  if (!text) return m;
  const v = text.trim().split(/\s+/).map(Number);
  if (v.length !== 12 || v.some((n) => !Number.isFinite(n))) return m;
  return m.set(v[0], v[3], v[6], v[9], v[1], v[4], v[7], v[10], v[2], v[5], v[8], v[11], 0, 0, 0, 1);
}

function attr(el: Element, name: string): string | null {
  return el.getAttribute(name) ?? el.getAttribute(`p:${name}`);
}

function parseModelXml(xml: string): ParsedModel {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) throw new Error("file .3mf non leggibile (XML non valido)");
  const root = doc.documentElement;
  const scale = UNIT_TO_MM[(root.getAttribute("unit") ?? "millimeter").toLowerCase()] ?? 1;
  const objects = new Map<string, ParsedObject>();
  for (const o of Array.from(doc.getElementsByTagName("object"))) {
    const id = o.getAttribute("id");
    if (!id) continue;
    const parsed: ParsedObject = { type: o.getAttribute("type") ?? "model", name: o.getAttribute("name") ?? "", components: [] };
    const meshEl = o.getElementsByTagName("mesh")[0];
    if (meshEl) {
      const verts = Array.from(meshEl.getElementsByTagName("vertex"));
      const vertices = new Float64Array(verts.length * 3);
      verts.forEach((v, i) => {
        vertices[i * 3] = Number(v.getAttribute("x"));
        vertices[i * 3 + 1] = Number(v.getAttribute("y"));
        vertices[i * 3 + 2] = Number(v.getAttribute("z"));
      });
      const tris = Array.from(meshEl.getElementsByTagName("triangle"));
      const triangles: number[] = [];
      for (const t of tris) triangles.push(Number(t.getAttribute("v1")), Number(t.getAttribute("v2")), Number(t.getAttribute("v3")));
      parsed.vertices = vertices;
      parsed.triangles = triangles;
    }
    for (const c of Array.from(o.getElementsByTagName("component"))) {
      const objectId = c.getAttribute("objectid");
      if (objectId) parsed.components.push({ objectId, path: attr(c, "path"), matrix: parseTransform(c.getAttribute("transform")) });
    }
    objects.set(id, parsed);
  }
  const items: ParsedModel["items"] = [];
  const build = doc.getElementsByTagName("build")[0];
  if (build) {
    for (const it of Array.from(build.getElementsByTagName("item"))) {
      const objectId = it.getAttribute("objectid");
      if (objectId) items.push({ objectId, matrix: parseTransform(it.getAttribute("transform")) });
    }
  }
  return { scale, objects, items };
}

/**
 * Reads the geometry of ANY .3mf (slicers, Thingiverse, other CAD programs):
 * one mesh per object of the build plate, units converted to mm, rotated from
 * the 3MF convention (Z up) to MODEL3D's (Y up), and moved so the whole model
 * stands on the ground plane around the origin.
 */
export function read3MFMeshes(bytes: Uint8Array): ImportedMesh[] {
  const files = unzipSync(bytes);
  const modelPaths = Object.keys(files).filter((p) => p.toLowerCase().endsWith(".model"));
  if (modelPaths.length === 0) throw new Error("nel file .3mf non c'è nessun modello 3D");

  // The root model is the one the package relationships point to; "3D/3dmodel.model" otherwise.
  let rootPath = modelPaths.find((p) => p.toLowerCase() === "3d/3dmodel.model") ?? modelPaths[0];
  const rels = files["_rels/.rels"];
  if (rels) {
    const m = /Target="([^"]+\.model)"/i.exec(strFromU8(rels));
    const target = m?.[1].replace(/^\//, "");
    if (target && files[target]) rootPath = target;
  }

  const cache = new Map<string, ParsedModel>();
  const modelAt = (path: string): ParsedModel | null => {
    const clean = path.replace(/^\//, "");
    if (!cache.has(clean)) {
      const data = files[clean];
      if (!data) return null;
      cache.set(clean, parseModelXml(strFromU8(data)));
    }
    return cache.get(clean)!;
  };

  const root = modelAt(rootPath);
  if (!root) throw new Error("modello principale non trovato nel file .3mf");

  // Z up -> Y up: (x, y, z) -> (x, z, -y)
  const zUpToYUp = new Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1);
  const unit = new Matrix4().makeScale(root.scale, root.scale, root.scale);

  const results: ImportedMesh[] = [];
  const collect = (path: string, objectId: string, matrix: Matrix4, out: { positions: number[]; indices: number[] }, depth: number) => {
    if (depth > 16) return;
    const model = modelAt(path);
    const obj = model?.objects.get(objectId);
    if (!obj || obj.type === "support" || obj.type === "solidsupport") return;
    if (obj.vertices && obj.triangles) {
      const base = out.positions.length / 3;
      const v = new Vector3();
      for (let i = 0; i < obj.vertices.length; i += 3) {
        v.set(obj.vertices[i], obj.vertices[i + 1], obj.vertices[i + 2]).applyMatrix4(matrix);
        out.positions.push(v.x, v.y, v.z);
      }
      const mirrored = matrix.determinant() < 0; // a mirror flips the triangles inside out
      const vertCount = obj.vertices.length / 3;
      for (let i = 0; i + 2 < obj.triangles.length; i += 3) {
        const [a, b, c] = [obj.triangles[i], obj.triangles[i + 1], obj.triangles[i + 2]];
        if (!(a < vertCount && b < vertCount && c < vertCount) || a < 0 || b < 0 || c < 0) continue;
        if (mirrored) out.indices.push(base + a, base + c, base + b);
        else out.indices.push(base + a, base + b, base + c);
      }
    }
    for (const comp of obj.components) {
      collect(comp.path ?? path, comp.objectId, matrix.clone().multiply(comp.matrix), out, depth + 1);
    }
  };

  const items = root.items.length > 0 ? root.items : Array.from(root.objects.keys()).map((objectId) => ({ objectId, matrix: new Matrix4() }));
  for (const item of items) {
    const out = { positions: [] as number[], indices: [] as number[] };
    const matrix = zUpToYUp.clone().multiply(unit).multiply(item.matrix);
    collect(rootPath, item.objectId, matrix, out, 0);
    if (out.indices.length === 0) continue;
    results.push({ name: root.objects.get(item.objectId)?.name || `oggetto_${item.objectId}`, positions: out.positions, indices: out.indices });
  }
  if (results.length === 0) throw new Error("il file .3mf non contiene nessuna forma (mesh) leggibile");

  // Put the whole model on the ground plane, centred on the origin (X/Z).
  let minX = Infinity, maxX = -Infinity, minY = Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const r of results) {
    for (let i = 0; i < r.positions.length; i += 3) {
      const x = r.positions[i], y = r.positions[i + 1], z = r.positions[i + 2];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }
  const dx = -(minX + maxX) / 2, dy = -minY, dz = -(minZ + maxZ) / 2;
  for (const r of results) {
    for (let i = 0; i < r.positions.length; i += 3) {
      r.positions[i] = Math.round((r.positions[i] + dx) * 1e4) / 1e4;
      r.positions[i + 1] = Math.round((r.positions[i + 1] + dy) * 1e4) / 1e4;
      r.positions[i + 2] = Math.round((r.positions[i + 2] + dz) * 1e4) / 1e4;
    }
  }
  return results;
}

export function read3MFProject(bytes: Uint8Array): ProjectData | null {
  const files = unzipSync(bytes);
  const metaFile = files["Metadata/model3d.json"];
  if (!metaFile) return null;
  try {
    const parsed = JSON.parse(strFromU8(metaFile));
    if (!parsed.features) return null;
    return parsed as ProjectData;
  } catch {
    return null;
  }
}

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

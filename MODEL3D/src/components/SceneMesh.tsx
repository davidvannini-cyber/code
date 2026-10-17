import { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEditorStore } from "../store";
import type { LiveBody, Placement } from "../occ/types";

const CLICK_DELAY_MS = 300;

interface Props {
  body: LiveBody;
  placement: Placement;
  color: string;
  onFaceClick: (bodyId: string, faceIndex: number) => void;
  onBodyDoubleClick: (bodyId: string) => void;
  registerRef: (id: string, obj: THREE.Group | null) => void;
}

function findFaceForTriangle(faceRanges: [number, number][], triIndex: number): number {
  for (let i = 0; i < faceRanges.length; i++) {
    const [start, count] = faceRanges[i];
    if (triIndex >= start && triIndex < start + count) return i;
  }
  return -1;
}

export function SceneMesh({ body, placement, color, onFaceClick, onBodyDoubleClick, registerRef }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedBodyId = useEditorStore((s) => s.selectedBodyId);
  const selectedFace = useEditorStore((s) => s.selectedFace);
  const booleanPick = useEditorStore((s) => s.booleanPick);
  const mateFaceA = useEditorStore((s) => s.mateFaceA);
  const mateFaceB = useEditorStore((s) => s.mateFaceB);
  const filletPickActive = useEditorStore((s) => s.filletPickActive);
  const pickFilletEdge = useEditorStore((s) => s.pickFilletEdge);
  const [hoverEdge, setHoverEdge] = useState<number | null>(null);
  const pendingClickRef = useRef<{ time: number; faceIndex: number } | null>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(body.mesh.positions, 3));
    geo.setIndex(new THREE.BufferAttribute(body.mesh.indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, [body.mesh.positions, body.mesh.indices]);

  useEffect(() => {
    registerRef(body.bodyId, groupRef.current);
    return () => registerRef(body.bodyId, null);
  }, [body.bodyId, registerRef]);

  const isSelected = selectedBodyId === body.bodyId;
  const isPicked = booleanPick?.picked.includes(body.bodyId);
  const highlightedFaceIndex = selectedFace?.bodyId === body.bodyId ? selectedFace.faceIndex : -1;

  const edgeLines = useMemo(
    () =>
      body.edges.map((e) => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i < e.points.length; i += 3) {
          pts.push(new THREE.Vector3(e.points[i], e.points[i + 1], e.points[i + 2]));
        }
        return pts;
      }),
    [body.edges]
  );

  const highlightGeometry = useMemo(() => {
    if (highlightedFaceIndex < 0) return null;
    const range = body.faceRanges[highlightedFaceIndex];
    if (!range) return null;
    const [start, count] = range;
    const srcIndex = body.mesh.indices;
    const subset = srcIndex.subarray(start * 3, (start + count) * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(body.mesh.positions, 3));
    geo.setIndex(new THREE.BufferAttribute(subset, 1));
    geo.computeVertexNormals();
    return geo;
  }, [highlightedFaceIndex, body.faceRanges, body.mesh.positions, body.mesh.indices]);

  // Faces chosen for "Affianca": green = stays, orange = moves.
  const mateHighlights = useMemo(() => {
    const out: { geo: THREE.BufferGeometry; color: string }[] = [];
    for (const [face, color] of [[mateFaceA, "#22cc66"], [mateFaceB, "#ff9922"]] as const) {
      if (!face || face.bodyId !== body.bodyId) continue;
      const range = body.faceRanges[face.faceIndex];
      if (!range) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(body.mesh.positions, 3));
      geo.setIndex(new THREE.BufferAttribute(body.mesh.indices.subarray(range[0] * 3, (range[0] + range[1]) * 3), 1));
      geo.computeVertexNormals();
      out.push({ geo, color });
    }
    return out;
  }, [mateFaceA, mateFaceB, body.bodyId, body.faceRanges, body.mesh.positions, body.mesh.indices]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const faceIndex = findFaceForTriangle(body.faceRanges, e.faceIndex ?? -1);
    const now = Date.now();
    const last = pendingClickRef.current;
    // Second click of a double click: the whole body. The first click already
    // selected the face right away, so single clicks have no delay.
    if (last && now - last.time < CLICK_DELAY_MS) {
      pendingClickRef.current = null;
      onBodyDoubleClick(body.bodyId);
      return;
    }
    pendingClickRef.current = { time: now, faceIndex };
    onFaceClick(body.bodyId, faceIndex);
  };

  return (
    <group ref={groupRef} position={placement.position} rotation={placement.rotation} scale={placement.scale} userData={{ id: body.bodyId }}>
      <mesh geometry={geometry} onClick={handleClick} castShadow receiveShadow>
        <meshStandardMaterial
          color={color}
          emissive={isPicked ? "#ffcc00" : isSelected ? "#2255ff" : "#000000"}
          emissiveIntensity={isPicked ? 0.5 : isSelected ? 0.25 : 0}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>
      {highlightGeometry && (
        <mesh geometry={highlightGeometry} renderOrder={1}>
          <meshBasicMaterial color="#22ddaa" transparent opacity={0.55} depthTest={true} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      )}
      {mateHighlights.map((h, i) => (
        <mesh key={`mate${i}`} geometry={h.geo} renderOrder={2}>
          <meshBasicMaterial color={h.color} transparent opacity={0.7} polygonOffset polygonOffsetFactor={-3} />
        </mesh>
      ))}
      {edgeLines.map((pts, i) => {
        if (pts.length < 2) return null;
        const hovered = filletPickActive && hoverEdge === i;
        return (
          <Line
            key={i}
            points={pts}
            color={hovered ? "#22ddaa" : filletPickActive ? "#7aa2ff" : "#111111"}
            lineWidth={hovered ? 4 : filletPickActive ? 3 : 1}
            onPointerOver={filletPickActive ? (e: ThreeEvent<PointerEvent>) => (e.stopPropagation(), setHoverEdge(i)) : undefined}
            onPointerOut={filletPickActive ? () => setHoverEdge((cur) => (cur === i ? null : cur)) : undefined}
            onPointerDown={filletPickActive ? (e: ThreeEvent<PointerEvent>) => (e.stopPropagation(), pickFilletEdge(body.bodyId, i)) : undefined}
          />
        );
      })}
    </group>
  );
}

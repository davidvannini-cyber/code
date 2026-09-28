import { useMemo } from 'react';
import * as THREE from 'three';
import { railDimensions as R } from './dimensions';

/** Un punto 3D in millimetri, in coordinate locali "rail space". */
export type Vec3mm = [number, number, number];

interface RailGeometryProps {
  /**
   * Punti 3D lungo il bordo/nosing dei gradini (mm) — la stessa polilinea
   * usata per la stima della posa camera. Il binario reale viene derivato
   * da questa linea con un offset verticale (montanti + tubo), non
   * coincide con essa.
   */
  path: Vec3mm[];
}

const MM = 0.001; // conversione mm -> metri (unità scena Three.js)

/**
 * Frame locale stabile lungo la curva: tangente (direzione di marcia),
 * "lateral" (attraverso la larghezza rampa) e "vertical" (nel piano
 * verticale di marcia, perpendicolare alla tangente). A differenza del
 * Frenet frame nativo di Three.js, non degenera su tratti rettilinei.
 */
function getLocalFrame(curve: THREE.CatmullRomCurve3, t: number) {
  const tangent = curve.getTangentAt(t).normalize();
  const lateral = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 0, 1));
  if (lateral.lengthSq() < 1e-8) lateral.set(1, 0, 0);
  lateral.normalize();
  const vertical = new THREE.Vector3().crossVectors(lateral, tangent).normalize();
  if (vertical.y < 0) vertical.negate();
  return { tangent, lateral, vertical };
}

/**
 * Binario proxy: due tubi impilati nel piano verticale di marcia (pignone +
 * cremagliera su due livelli, interasse reale 170mm) sostenuti da montanti
 * a passo regolare. Non fotorealistico: serve a validare che la geometria
 * segua correttamente la rampa (niente compenetrazioni coi gradini), non a
 * mostrare dettagli del prodotto reale.
 */
export function RailGeometry({ path }: RailGeometryProps) {
  const noseCurve = useMemo(() => {
    const pts = path.map((p) => new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM));
    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
  }, [path]);

  const lowerTubeOffset = (R.postHeight + R.tubeDiameter / 2) * MM;
  const tubeGap = R.tubeSpacing * MM;

  const { lowerCurve, upperCurve } = useMemo(() => {
    const segments = 64;
    const lowerPts: THREE.Vector3[] = [];
    const upperPts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const pt = noseCurve.getPointAt(t);
      const { vertical } = getLocalFrame(noseCurve, t);
      const lower = pt.clone().addScaledVector(vertical, lowerTubeOffset);
      const upper = lower.clone().addScaledVector(vertical, tubeGap);
      lowerPts.push(lower);
      upperPts.push(upper);
    }
    return {
      lowerCurve: new THREE.CatmullRomCurve3(lowerPts, false, 'catmullrom', 0.2),
      upperCurve: new THREE.CatmullRomCurve3(upperPts, false, 'catmullrom', 0.2),
    };
  }, [noseCurve, lowerTubeOffset, tubeGap]);

  const posts = useMemo(() => {
    const totalLength = noseCurve.getLength();
    const count = Math.max(2, Math.floor(totalLength / (R.postSpacing * MM)));
    const result: THREE.Vector3[] = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      result.push(noseCurve.getPointAt(t));
    }
    return result;
  }, [noseCurve]);

  return (
    <group name="rail-proxy">
      {[lowerCurve, upperCurve].map((tubeCurve, i) => (
        <mesh key={i} castShadow receiveShadow>
          <tubeGeometry args={[tubeCurve, 64, (R.tubeDiameter / 2) * MM, 12, false]} />
          <meshStandardMaterial color="#c9ccd1" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {posts.map((base, i) => (
        <group key={i} position={[base.x, base.y, base.z]}>
          <mesh position={[0, (R.postHeight * MM) / 2, 0]} castShadow>
            <cylinderGeometry
              args={[(R.postDiameter / 2) * MM, (R.postDiameter / 2) * MM, R.postHeight * MM, 16]}
            />
            <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.6} />
          </mesh>
          <mesh position={[0, (R.postBaseSize.thickness * MM) / 2, 0]} receiveShadow>
            <boxGeometry
              args={[
                R.postBaseSize.width * MM,
                R.postBaseSize.thickness * MM,
                R.postBaseSize.depth * MM,
              ]}
            />
            <meshStandardMaterial color="#d4d4d4" metalness={0.1} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export { MM };

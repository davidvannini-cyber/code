import { chairDimensions as C } from './dimensions';
import { MM } from './RailGeometry';

interface ChairGeometryProps {
  /** Posizione del carrello lungo il binario (mm, coordinate rail space). */
  position: [number, number, number];
  /** Rotazione Y (radianti) per orientare la poltroncina verso la corretta direzione di seduta. */
  rotationY?: number;
}

/**
 * Poltroncina proxy: seduta, schienale, braccioli, poggiapiedi e
 * carrello/centralina come volumi semplici. Le proporzioni sono placeholder
 * (vedi dimensions.ts) da sostituire con le misure reali del modello
 * "Facile Robusta per esterno".
 */
export function ChairGeometry({ position, rotationY = 0 }: ChairGeometryProps) {
  const [x, y, z] = position;
  const seatY = (y + C.seatHeightFromRail) * MM;

  return (
    <group position={[x * MM, y * MM, z * MM]} rotation={[0, rotationY, 0]}>
      {/* Carrello / centralina sul binario */}
      <mesh position={[0, (C.carriageSize.height * MM) / 2, 0]} castShadow>
        <boxGeometry
          args={[C.carriageSize.width * MM, C.carriageSize.height * MM, C.carriageSize.depth * MM]}
        />
        <meshStandardMaterial color="#f2f2f2" metalness={0.1} roughness={0.5} />
      </mesh>

      {/* Seduta */}
      <mesh position={[0, seatY, 0]} castShadow>
        <boxGeometry args={[C.seatWidth * MM, C.seatThickness * MM, C.seatDepth * MM]} />
        <meshStandardMaterial color="#2b3a55" roughness={0.8} />
      </mesh>

      {/* Schienale */}
      <mesh
        position={[0, seatY + (C.backrestHeight * MM) / 2, -(C.seatDepth * MM) / 2]}
        castShadow
      >
        <boxGeometry
          args={[C.seatWidth * MM, C.backrestHeight * MM, C.backrestThickness * MM]}
        />
        <meshStandardMaterial color="#2b3a55" roughness={0.8} />
      </mesh>

      {/* Braccioli */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            (side * (C.armrestSpan * MM)) / 2,
            seatY + (C.armrestHeight * MM),
            0,
          ]}
          castShadow
        >
          <boxGeometry args={[30 * MM, 30 * MM, C.armrestLength * MM]} />
          <meshStandardMaterial color="#e8e8e8" roughness={0.6} />
        </mesh>
      ))}

      {/* Poggiapiedi */}
      <mesh
        position={[0, seatY - (C.seatHeightFromRail * MM) * 0.6, (C.seatDepth * MM) / 2 + 0.15]}
        castShadow
      >
        <boxGeometry
          args={[C.footrestSize.width * MM, 20 * MM, C.footrestSize.depth * MM]}
        />
        <meshStandardMaterial color="#3a3a3a" roughness={0.9} />
      </mesh>
    </group>
  );
}

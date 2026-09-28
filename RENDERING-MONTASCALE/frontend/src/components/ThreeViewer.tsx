import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { RailGeometry, MM } from '../geometry/RailGeometry';
import { ChairGeometry } from '../geometry/ChairGeometry';
import { centerlineFromPairedPoints } from '../geometry/path';
import type { Vec3mm } from '../geometry/RailGeometry';
import type { CameraPoseResult } from '../lib/pnp';

interface ThreeViewerProps {
  pairedPathMm: Vec3mm[]; // punti a coppie sx/dx (mm)
  cameraPose: CameraPoseResult | null;
  imageAspect: number; // width / height della foto, per il fov camera
  chairAtStepIndex: number; // indice gradino su cui posizionare la poltroncina
}

/**
 * Canvas Three.js a sfondo trasparente, da sovrapporre alla foto originale
 * (vedi App.tsx: stack di due layer con position absolute). La camera
 * virtuale è impostata DICHIARATIVAMENTE (drei <PerspectiveCamera
 * makeDefault>): passare un oggetto `camera={{...}}` inline al Canvas e poi
 * mutare `useThree().camera` in un effect è un pattern fragile in R3F — ogni
 * re-render con un nuovo oggetto camera letterale può far sì che R3F
 * ripristini i default, vanificando la posa stimata (bug riscontrato e
 * corretto: vedi anche src/lib/pnp.ts per il bug di orientamento a monte).
 */
export function ThreeViewer({ pairedPathMm, cameraPose, imageAspect, chairAtStepIndex }: ThreeViewerProps) {
  const centerline = centerlineFromPairedPoints(pairedPathMm);
  const chairPoint = centerline[Math.min(chairAtStepIndex, centerline.length - 1)] ?? [0, 0, 0];

  return (
    <Canvas
      gl={{ alpha: true, antialias: true }}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 4, 2]} intensity={1} castShadow />
      {cameraPose && (
        <PerspectiveCamera
          makeDefault
          position={cameraPose.position}
          quaternion={cameraPose.quaternion}
          fov={cameraPose.fovYDeg}
          aspect={imageAspect}
          near={0.05}
          far={100}
        />
      )}
      {centerline.length >= 2 && <RailGeometry path={centerline} />}
      {centerline.length >= 1 && <ChairGeometry position={chairPoint} />}
    </Canvas>
  );
}

export { MM };

import * as THREE from 'three';
import { estimateCameraPose } from '../src/lib/pnp';
import { buildAssumedPath3D, buildFloorReferencePoint3D } from '../src/geometry/path';

const pairedMm = buildAssumedPath3D(4);
const floorMm = buildFloorReferencePoint3D();
const objectPointsMm = [...pairedMm, floorMm];
const objectPointsM: [number, number, number][] = objectPointsMm.map(([x, y, z]) => [
  x / 1000,
  y / 1000,
  z / 1000,
]);

const imagePoints: [number, number][] = [
  [699.6577777777777, 959.8244147157191], [1149.151111111111, 939.757525083612],
  [688.9555555555555, 769.8578595317725], [1159.8533333333332, 749.7909698996656],
  [679.5911111111111, 579.8913043478261], [1169.2177777777777, 559.8244147157191],
  [668.8888888888889, 389.9247491638796], [1179.92, 369.8578595317726],
  [800, 1000],
];

async function main() {
  const pose = await estimateCameraPose(objectPointsM, imagePoints, 1204, 1600, 65);
  if (!pose) {
    console.log('Stima fallita');
    return;
  }
  console.log('position:', pose.position.toArray());
  console.log('fovYDeg:', pose.fovYDeg);
  console.log('meanReprojectionErrorPx:', pose.meanReprojectionErrorPx);

  const cam = new THREE.PerspectiveCamera(pose.fovYDeg, 1204 / 1600, 0.05, 100);
  cam.position.copy(pose.position);
  cam.quaternion.copy(pose.quaternion);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);

  for (let i = 0; i < objectPointsM.length; i++) {
    const [x, y, z] = objectPointsM[i];
    const p = new THREE.Vector3(x, y, z);
    const local = p.clone().applyMatrix4(cam.matrixWorldInverse);
    const ndc = p.clone().project(cam);
    console.log(
      `punto ${i}: local-Z=${local.z.toFixed(3)} (${local.z < 0 ? 'DAVANTI' : 'DIETRO'}) ` +
        `NDC=(${ndc.x.toFixed(2)},${ndc.y.toFixed(2)},${ndc.z.toFixed(2)}) ` +
        `dentro-frustum=${Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z >= -1 && ndc.z <= 1}`,
    );
  }

  // Anche il centro rampa (centerline) e un punto vicino alla poltroncina
  const centerline0 = [
    (objectPointsM[0][0] + objectPointsM[1][0]) / 2,
    (objectPointsM[0][1] + objectPointsM[1][1]) / 2,
    (objectPointsM[0][2] + objectPointsM[1][2]) / 2,
  ];
  const localC = new THREE.Vector3(...(centerline0 as [number, number, number])).applyMatrix4(
    cam.matrixWorldInverse,
  );
  console.log('centerline gradino 0 local-Z:', localC.z.toFixed(3), 'distanza da camera:', pose.position.length());
}
main();

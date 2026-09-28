import * as THREE from 'three';
import { estimateCameraPose } from '../src/lib/pnp';
import { buildAssumedPath3D } from '../src/geometry/path';

// Camera "vera" nota, in coordinate world Three.js (Y su).
const knownPosition = new THREE.Vector3(-0.5, -1.0, 0);
const knownTarget = new THREE.Vector3(0.4, 0.2, 0);
const knownUp = new THREE.Vector3(0, 1, 0);

// IMPORTANTE: usare una Camera per lookAt, non un Object3D generico -
// hanno convenzioni opposte (-Z vs +Z verso il target). Vedi commento in src/lib/pnp.ts.
const dummy = new THREE.PerspectiveCamera();
dummy.position.copy(knownPosition);
dummy.up.copy(knownUp);
dummy.lookAt(knownTarget);
const knownQuaternion = dummy.quaternion.clone();

const imageWidth = 1204;
const imageHeight = 1600;
const fovYDeg = 60;

const camera = new THREE.PerspectiveCamera(fovYDeg, imageWidth / imageHeight, 0.01, 100);
camera.position.copy(knownPosition);
camera.quaternion.copy(knownQuaternion);
camera.updateProjectionMatrix();
camera.updateMatrixWorld(true);

const pairedMm = buildAssumedPath3D(4); // stessa geometria assunta usata dall'app
const objectPointsM: [number, number, number][] = pairedMm.map(([x, y, z]) => [
  x / 1000,
  y / 1000,
  z / 1000,
]);

// Proietto ogni punto 3D nello schermo usando la camera "vera" (NDC -> pixel).
const imagePoints: [number, number][] = objectPointsM.map(([x, y, z]) => {
  const v = new THREE.Vector3(x, y, z).project(camera); // NDC [-1,1]
  const px = ((v.x + 1) / 2) * imageWidth;
  const py = ((1 - v.y) / 2) * imageHeight; // Y schermo cresce verso il basso
  return [px, py];
});

console.log('Object points (m):', objectPointsM);
console.log('Synthetic image points (px):', imagePoints);

// FOV orizzontale "vero" da passare come assunzione a estimateCameraPose
const fovXDegKnown = 2 * Math.atan(Math.tan((fovYDeg * Math.PI) / 360) * (imageWidth / imageHeight)) * (180 / Math.PI);
console.log('fovXDegKnown:', fovXDegKnown);


estimateCameraPose(objectPointsM, imagePoints, imageWidth, imageHeight, fovXDegKnown).then((pose) => {
  if (!pose) {
    console.log('RISULTATO: stima fallita');
    return;
  }
  console.log('--- CONFRONTO ---');
  console.log('Posizione VERA:      ', knownPosition.toArray());
  console.log('Posizione STIMATA:   ', pose.position.toArray());
  console.log('Quaternion VERO:     ', knownQuaternion.toArray());
  console.log('Quaternion STIMATO:  ', pose.quaternion.toArray());
  const posError = knownPosition.distanceTo(pose.position);
  const angleErrorDeg = (knownQuaternion.angleTo(pose.quaternion) * 180) / Math.PI;
  console.log('Errore posizione (m):', posError);
  console.log('Errore angolare (deg):', angleErrorDeg);

  console.log('--- check con camera VERA (knownPosition/knownQuaternion) ---');
  const trueCheckCam = new THREE.PerspectiveCamera(fovYDeg, imageWidth / imageHeight, 0.05, 100);
  trueCheckCam.position.copy(knownPosition);
  trueCheckCam.quaternion.copy(knownQuaternion);
  trueCheckCam.updateMatrixWorld(true);
  for (const [x, y, z] of objectPointsM) {
    const local = new THREE.Vector3(x, y, z).applyMatrix4(trueCheckCam.matrixWorldInverse);
    console.log(`  punto (${x},${y},${z}) -> camera-local Z=${local.z.toFixed(3)} (${local.z < 0 ? 'DAVANTI' : 'DIETRO'})`);
  }

  console.log('--- check con camera STIMATA (pose) ---');
  const checkCam = new THREE.PerspectiveCamera(pose.fovYDeg, imageWidth / imageHeight, 0.05, 100);
  checkCam.position.copy(pose.position);
  checkCam.quaternion.copy(pose.quaternion);
  checkCam.updateMatrixWorld(true);
  for (const [x, y, z] of objectPointsM) {
    const local = new THREE.Vector3(x, y, z).applyMatrix4(checkCam.matrixWorldInverse);
    console.log(`  punto (${x},${y},${z}) -> camera-local Z=${local.z.toFixed(3)} (${local.z < 0 ? 'DAVANTI' : 'DIETRO'})`);
  }
});

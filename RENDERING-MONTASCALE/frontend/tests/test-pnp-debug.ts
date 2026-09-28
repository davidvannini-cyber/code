import * as THREE from 'three';
import cvReadyPromise from '@techstark/opencv-js';
import { buildAssumedPath3D } from '../src/geometry/path';

const knownPosition = new THREE.Vector3(-0.5, -1.0, 0);
const knownTarget = new THREE.Vector3(0.4, 0.2, 0);
const knownUp = new THREE.Vector3(0, 1, 0);

const dummy0 = new THREE.Object3D();
dummy0.position.copy(knownPosition);
dummy0.up.copy(knownUp);
dummy0.lookAt(knownTarget);
const knownQuaternion = dummy0.quaternion.clone();

const imageWidth = 1204;
const imageHeight = 1600;
const fovYDeg = 60;
const camera = new THREE.PerspectiveCamera(fovYDeg, imageWidth / imageHeight, 0.01, 100);
camera.position.copy(knownPosition);
camera.quaternion.copy(knownQuaternion);
camera.updateProjectionMatrix();
camera.updateMatrixWorld(true);

const pairedMm = buildAssumedPath3D(4);
const objectPointsM: [number, number, number][] = pairedMm.map(([x, y, z]) => [x / 1000, y / 1000, z / 1000]);
const imagePoints: [number, number][] = objectPointsM.map(([x, y, z]) => {
  const v = new THREE.Vector3(x, y, z).project(camera);
  return [((v.x + 1) / 2) * imageWidth, ((1 - v.y) / 2) * imageHeight];
});
const fovXDegKnown = (2 * Math.atan(Math.tan((fovYDeg * Math.PI) / 360) * (imageWidth / imageHeight)) * 180) / Math.PI;

const toCv = (v: [number, number, number]): [number, number, number] => [v[0], -v[1], v[2]];
const toThreeDir = (v: [number, number, number]) => new THREE.Vector3(v[0], -v[1], v[2]);

async function main() {
  const cv: any = await cvReadyPromise;
  const cvObjectPoints = objectPointsM.map(toCv);
  const objMat = cv.matFromArray(objectPointsM.length, 3, cv.CV_64F, cvObjectPoints.flat());
  const imgMat = cv.matFromArray(imagePoints.length, 2, cv.CV_64F, imagePoints.flat());
  const fx = imageWidth / (2 * Math.tan((fovXDegKnown * Math.PI) / 360));
  const fy = fx;
  const cx = imageWidth / 2;
  const cy = imageHeight / 2;
  const cameraMatrix = cv.matFromArray(3, 3, cv.CV_64F, [fx, 0, cx, 0, fy, cy, 0, 0, 1]);
  const distCoeffs = cv.Mat.zeros(4, 1, cv.CV_64F);
  const rvec = new cv.Mat();
  const tvec = new cv.Mat();
  cv.solvePnP(objMat, imgMat, cameraMatrix, distCoeffs, rvec, tvec, false, cv.SOLVEPNP_ITERATIVE);
  const rotMat = new cv.Mat();
  cv.Rodrigues(rvec, rotMat);
  const R = Array.from(rotMat.data64F as Float64Array);
  const t = Array.from(tvec.data64F as Float64Array) as [number, number, number];

  function transpose3(M: number[]): number[] {
    return [M[0], M[3], M[6], M[1], M[4], M[7], M[2], M[5], M[8]];
  }
  function matVec3(M: number[], v: [number, number, number]): [number, number, number] {
    return [
      M[0] * v[0] + M[1] * v[1] + M[2] * v[2],
      M[3] * v[0] + M[4] * v[1] + M[5] * v[2],
      M[6] * v[0] + M[7] * v[1] + M[8] * v[2],
    ];
  }
  const Rt = transpose3(R);
  const camPosCv = matVec3(Rt, [-t[0], -t[1], -t[2]]);
  const position = toThreeDir(camPosCv);
  console.log('Posizione stimata (dovrebbe combaciare):', position.toArray(), 'vera:', knownPosition.toArray());

  // Righe di R (= colonne di Rt): candidate axes
  const rowsOfR: [number, number, number][] = [
    [R[0], R[1], R[2]],
    [R[3], R[4], R[5]],
    [R[6], R[7], R[8]],
  ];
  const labels = ['row0(X)', 'row1(Y)', 'row2(Z)'];

  let best: { err: number; fLabel: string; uLabel: string; fSign: number; uSign: number } | null = null;

  for (let fi = 0; fi < 3; fi++) {
    for (let ui = 0; ui < 3; ui++) {
      if (fi === ui) continue;
      for (const fSign of [1, -1]) {
        for (const uSign of [1, -1]) {
          const forwardCv: [number, number, number] = [
            fSign * rowsOfR[fi][0],
            fSign * rowsOfR[fi][1],
            fSign * rowsOfR[fi][2],
          ];
          const upCv: [number, number, number] = [
            uSign * rowsOfR[ui][0],
            uSign * rowsOfR[ui][1],
            uSign * rowsOfR[ui][2],
          ];
          const forwardThree = toThreeDir(forwardCv).normalize();
          const upThree = toThreeDir(upCv).normalize();
          const d = new THREE.Object3D();
          d.position.copy(position);
          d.up.copy(upThree);
          d.lookAt(position.clone().add(forwardThree));
          const q = d.quaternion.clone();
          const err = (knownQuaternion.angleTo(q) * 180) / Math.PI;
          if (!best || err < best.err) {
            best = { err, fLabel: labels[fi], uLabel: labels[ui], fSign, uSign };
          }
        }
      }
    }
  }
  console.log('MIGLIOR COMBINAZIONE:', best);

  [objMat, imgMat, cameraMatrix, distCoeffs, rvec, tvec, rotMat].forEach((m) => m.delete());
}

main();

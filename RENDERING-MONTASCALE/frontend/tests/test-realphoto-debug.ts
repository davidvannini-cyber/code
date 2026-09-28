import * as THREE from 'three';
import cvReadyPromise from '@techstark/opencv-js';

// Stessi dati esatti del run browser reale su rail-01.jpg (da log DEBUG pose)
const objectPointsM: [number, number, number][] = [
  [0, 0, -0.45], [0, 0, 0.45],
  [0.28, 0.17, -0.45], [0.28, 0.17, 0.45],
  [0.56, 0.34, -0.45], [0.56, 0.34, 0.45],
  [0.84, 0.51, -0.45], [0.84, 0.51, 0.45],
];
const imagePoints: [number, number][] = [
  [699.6577777777777, 959.8244147157191], [1149.151111111111, 939.757525083612],
  [688.9555555555555, 769.8578595317725], [1159.8533333333332, 749.7909698996656],
  [679.5911111111111, 579.8913043478261], [1169.2177777777777, 559.8244147157191],
  [668.8888888888889, 389.9247491638796], [1179.92, 369.8578595317726],
];
const imageWidth = 1204;
const imageHeight = 1600;
const assumedFovXDeg = 65;

const toCv = (v: [number, number, number]): [number, number, number] => [v[0], -v[1], v[2]];

async function main() {
  const cv: any = await cvReadyPromise;
  const cvObjectPoints = objectPointsM.map(toCv);
  const objMat = cv.matFromArray(objectPointsM.length, 3, cv.CV_64F, cvObjectPoints.flat());
  const imgMat = cv.matFromArray(imagePoints.length, 2, cv.CV_64F, imagePoints.flat());
  const fx = imageWidth / (2 * Math.tan((assumedFovXDeg * Math.PI) / 360));
  const fy = fx;
  const cx = imageWidth / 2;
  const cy = imageHeight / 2;
  const cameraMatrix = cv.matFromArray(3, 3, cv.CV_64F, [fx, 0, cx, 0, fy, cy, 0, 0, 1]);
  const distCoeffs = cv.Mat.zeros(4, 1, cv.CV_64F);
  const rvec = new cv.Mat();
  const tvec = new cv.Mat();
  const ok = cv.solvePnP(objMat, imgMat, cameraMatrix, distCoeffs, rvec, tvec, false, cv.SOLVEPNP_ITERATIVE);
  console.log('solvePnP ok?', ok);
  const rotMat = new cv.Mat();
  cv.Rodrigues(rvec, rotMat);
  const R = Array.from(rotMat.data64F as Float64Array);
  const t = Array.from(tvec.data64F as Float64Array) as [number, number, number];
  console.log('R:', R);
  console.log('t:', t);

  // Profondita' (Z camera-space) di ogni punto: Xcam = R*Xworld + t
  for (let i = 0; i < objectPointsM.length; i++) {
    const [x, y, z] = cvObjectPoints[i];
    const Xc = R[0] * x + R[1] * y + R[2] * z + t[0];
    const Yc = R[3] * x + R[4] * y + R[5] * z + t[1];
    const Zc = R[6] * x + R[7] * y + R[8] * z + t[2];
    console.log(`punto ${i}: camera-space Z=${Zc.toFixed(3)} (${Zc > 0 ? 'DAVANTI' : 'DIETRO'} la camera)`);
  }

  // Reprojection error: proietto i punti stimati e confronto con i click reali
  console.log('--- reprojection check ---');
  for (let i = 0; i < objectPointsM.length; i++) {
    const [x, y, z] = cvObjectPoints[i];
    const Xc = R[0] * x + R[1] * y + R[2] * z + t[0];
    const Yc = R[3] * x + R[4] * y + R[5] * z + t[1];
    const Zc = R[6] * x + R[7] * y + R[8] * z + t[2];
    const u = fx * (Xc / Zc) + cx;
    const v = fy * (Yc / Zc) + cy;
    const [ru, rv] = imagePoints[i];
    console.log(`punto ${i}: riproiettato=(${u.toFixed(1)},${v.toFixed(1)}) reale=(${ru.toFixed(1)},${rv.toFixed(1)}) errore=${Math.hypot(u-ru,v-rv).toFixed(2)}px`);
  }

  [objMat, imgMat, cameraMatrix, distCoeffs, rvec, tvec, rotMat].forEach((m) => m.delete());
}
main();

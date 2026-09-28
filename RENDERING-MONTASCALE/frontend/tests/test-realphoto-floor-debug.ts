import cvReadyPromise from '@techstark/opencv-js';
import { buildAssumedPath3D, buildFloorReferencePoint3D } from '../src/geometry/path';

const pairedMm = buildAssumedPath3D(4);
const floorMm = buildFloorReferencePoint3D();
const stepObjectPointsM: [number, number, number][] = pairedMm.map(([x, y, z]) => [
  x / 1000,
  y / 1000,
  z / 1000,
]);
const floorObjectPointM: [number, number, number] = [floorMm[0] / 1000, floorMm[1] / 1000, floorMm[2] / 1000];

const stepImagePoints: [number, number][] = [
  [699.6577777777777, 959.8244147157191], [1149.151111111111, 939.757525083612],
  [688.9555555555555, 769.8578595317725], [1159.8533333333332, 749.7909698996656],
  [679.5911111111111, 579.8913043478261], [1169.2177777777777, 559.8244147157191],
  [668.8888888888889, 389.9247491638796], [1179.92, 369.8578595317726],
];
const imageWidth = 1204;
const imageHeight = 1600;
const assumedFovXDeg = 65;

const toCv = (v: [number, number, number]): [number, number, number] => [v[0], -v[1], v[2]];

async function solveAndScore(floorImagePoint: [number, number]) {
  const cv: any = await cvReadyPromise;
  const objectPointsM = [...stepObjectPointsM, floorObjectPointM];
  const imagePoints = [...stepImagePoints, floorImagePoint];
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
  const rotMat = new cv.Mat();
  cv.Rodrigues(rvec, rotMat);
  const R = Array.from(rotMat.data64F as Float64Array);
  const t = Array.from(tvec.data64F as Float64Array) as [number, number, number];

  let sumErr = 0;
  let maxErr = 0;
  for (let i = 0; i < objectPointsM.length; i++) {
    const [x, y, z] = cvObjectPoints[i];
    const Xc = R[0] * x + R[1] * y + R[2] * z + t[0];
    const Yc = R[3] * x + R[4] * y + R[5] * z + t[1];
    const Zc = R[6] * x + R[7] * y + R[8] * z + t[2];
    const u = fx * (Xc / Zc) + cx;
    const v = fy * (Yc / Zc) + cy;
    const [ru, rv] = imagePoints[i];
    const e = Math.hypot(u - ru, v - rv);
    sumErr += e;
    maxErr = Math.max(maxErr, e);
  }
  const dist = Math.hypot(t[0], t[1], t[2]);
  [objMat, imgMat, cameraMatrix, distCoeffs, rvec, tvec, rotMat].forEach((m) => m.delete());
  return { ok, meanErr: sumErr / objectPointsM.length, maxErr, dist };
}

async function main() {
  // Griglia di candidati attorno alla mia stima iniziale (700,1150), per
  // trovare empiricamente il punto pavimento che minimizza l'errore di
  // riproiezione — serve a compensare l'imprecisione del click "a occhio"
  // fatto in un test automatizzato (un utente reale guarderebbe lo schermo).
  const candidates: [number, number][] = [];
  for (let dy = -150; dy <= 250; dy += 50) {
    for (let dx = -100; dx <= 100; dx += 50) {
      candidates.push([700 + dx, 1150 + dy]);
    }
  }

  let best: { p: [number, number]; meanErr: number; dist: number } | null = null;
  for (const p of candidates) {
    const r = await solveAndScore(p);
    if (!r.ok) continue;
    if (!best || r.meanErr < best.meanErr) {
      best = { p, meanErr: r.meanErr, dist: r.dist };
    }
  }
  console.log('MIGLIOR CANDIDATO:', best);

  if (best) {
    const detail = await solveAndScore(best.p);
    console.log('Dettaglio:', detail);
  }
}
main();

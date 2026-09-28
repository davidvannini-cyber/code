import cvReadyPromise from '@techstark/opencv-js';
import * as THREE from 'three';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cvPromise: Promise<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCv(): Promise<any> {
  if (!cvPromise) cvPromise = cvReadyPromise as unknown as Promise<any>;
  return cvPromise;
}

export interface CameraPoseResult {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  fovYDeg: number;
  /** Errore medio di riproiezione in pixel — indicatore di affidabilità della stima. */
  meanReprojectionErrorPx: number;
}

/**
 * Convenzione: le coordinate world usate in tutta l'app sono quelle di
 * Three.js (X destra, Y su). OpenCV si aspetta X destra, Y giù, Z avanti
 * (nella scena). toCv/toThreeDir applicano il cambio di convenzione
 * (riflessione sull'asse Y) in modo simmetrico su punti e vettori.
 */
const toCv = (v: [number, number, number]): [number, number, number] => [v[0], -v[1], v[2]];
const toThreeDir = (v: [number, number, number]): THREE.Vector3 =>
  new THREE.Vector3(v[0], -v[1], v[2]);

function transpose3(R: number[]): number[] {
  return [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]];
}

function matVec3(M: number[], v: [number, number, number]): [number, number, number] {
  return [
    M[0] * v[0] + M[1] * v[1] + M[2] * v[2],
    M[3] * v[0] + M[4] * v[1] + M[5] * v[2],
    M[6] * v[0] + M[7] * v[1] + M[8] * v[2],
  ];
}

interface RawSolution {
  R: number[];
  t: [number, number, number];
  meanReprojectionErrorPx: number;
  /** Quanti punti risultano dietro la camera (Z camera-space <= 0) — fisicamente impossibile per una foto reale. */
  behindCount: number;
}

/**
 * Esegue solvePnP con un flag/algoritmo specifico e calcola le metriche di
 * validità (errore di riproiezione, punti dietro la camera).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function solveOnce(
  cv: any,
  cvObjectPoints: [number, number, number][],
  imagePoints: [number, number][],
  fx: number,
  fy: number,
  cx: number,
  cy: number,
  flag: number,
): RawSolution | null {
  const objMat = cv.matFromArray(cvObjectPoints.length, 3, cv.CV_64F, cvObjectPoints.flat());
  const imgMat = cv.matFromArray(imagePoints.length, 2, cv.CV_64F, imagePoints.flat());
  const cameraMatrix = cv.matFromArray(3, 3, cv.CV_64F, [fx, 0, cx, 0, fy, cy, 0, 0, 1]);
  const distCoeffs = cv.Mat.zeros(4, 1, cv.CV_64F);
  const rvec = new cv.Mat();
  const tvec = new cv.Mat();

  let ok = false;
  try {
    ok = cv.solvePnP(objMat, imgMat, cameraMatrix, distCoeffs, rvec, tvec, false, flag);
  } catch (e) {
    console.error('solvePnP failed', e);
    ok = false;
  }

  if (!ok) {
    [objMat, imgMat, cameraMatrix, distCoeffs, rvec, tvec].forEach((m) => m.delete());
    return null;
  }

  const rotMat = new cv.Mat();
  cv.Rodrigues(rvec, rotMat);
  const R = Array.from(rotMat.data64F as Float64Array) as number[];
  const t = Array.from(tvec.data64F as Float64Array) as [number, number, number];

  let reprojErrorSum = 0;
  let behindCount = 0;
  for (let i = 0; i < cvObjectPoints.length; i++) {
    const [x, y, z] = cvObjectPoints[i];
    const Xc = R[0] * x + R[1] * y + R[2] * z + t[0];
    const Yc = R[3] * x + R[4] * y + R[5] * z + t[1];
    const Zc = R[6] * x + R[7] * y + R[8] * z + t[2];
    if (Zc <= 0) behindCount++;
    const u = fx * (Xc / Zc) + cx;
    const v = fy * (Yc / Zc) + cy;
    const [ru, rv] = imagePoints[i];
    reprojErrorSum += Math.hypot(u - ru, v - rv);
  }

  [objMat, imgMat, cameraMatrix, distCoeffs, rvec, tvec, rotMat].forEach((m) => m.delete());

  return { R, t, meanReprojectionErrorPx: reprojErrorSum / cvObjectPoints.length, behindCount };
}

/**
 * Stima la posa della camera reale a partire da corrispondenze punti 3D
 * assunti (coordinate world Three.js, metri) <-> punti 2D cliccati
 * dall'utente sulla foto (pixel). Richiede almeno 4 punti NON allineati e
 * NON tutti complanari (vedi geometry/path.ts — punti a coppie sx/dx per
 * gradino + un punto pavimento fuori piano).
 *
 * La focale è assunta fissa da un FOV orizzontale tipico di smartphone
 * (default 65°), non stimata: con pochi punti risolvere anche
 * l'intrinseca è numericamente instabile. Il FOV assunto è regolabile in
 * UI come correzione manuale se il risultato non combacia.
 *
 * ROBUSTEZZA CONTRO L'AMBIGUITÀ PLANARE: anche con un punto fuori piano,
 * per configurazioni quasi-planari SOLVEPNP_ITERATIVE può convergere alla
 * soluzione "gemella" della bas-relief ambiguity — matematicamente valida
 * (basso errore di riproiezione) ma fisicamente impossibile (i punti
 * risultano dietro la camera: una foto reale non può fotografare ciò che
 * ha alle spalle). Verificato empiricamente su foto reali. Mitigazione:
 * si prova ITERATIVE e, se produce punti dietro la camera, si ritenta con
 * EPNP (empiricamente più robusto su questa configurazione) e si tiene la
 * soluzione con meno punti "dietro" (a parità, quella con errore minore).
 */
export async function estimateCameraPose(
  objectPointsM: [number, number, number][],
  imagePoints: [number, number][],
  imageWidth: number,
  imageHeight: number,
  assumedFovXDeg = 65,
): Promise<CameraPoseResult | null> {
  if (objectPointsM.length < 4 || objectPointsM.length !== imagePoints.length) return null;

  const cv = await getCv();
  const cvObjectPoints = objectPointsM.map(toCv);

  const fx = imageWidth / (2 * Math.tan((assumedFovXDeg * Math.PI) / 360));
  const fy = fx;
  const cx = imageWidth / 2;
  const cy = imageHeight / 2;

  const candidates: RawSolution[] = [];
  for (const flag of [cv.SOLVEPNP_ITERATIVE, cv.SOLVEPNP_EPNP]) {
    const sol = solveOnce(cv, cvObjectPoints, imagePoints, fx, fy, cx, cy, flag);
    if (sol) candidates.push(sol);
    // Se la prima soluzione è già fisicamente valida (nessun punto dietro),
    // non serve provare l'algoritmo successivo.
    if (sol && sol.behindCount === 0) break;
  }

  if (candidates.length === 0) return null;

  // Preferisci la soluzione con meno punti "dietro la camera" (fisicamente
  // impossibile); a parità, quella con errore di riproiezione minore.
  candidates.sort((a, b) => a.behindCount - b.behindCount || a.meanReprojectionErrorPx - b.meanReprojectionErrorPx);
  const best = candidates[0];

  const { R, t, meanReprojectionErrorPx } = best;
  const Rt = transpose3(R);

  const camPosCv = matVec3(Rt, [-t[0], -t[1], -t[2]]);
  const position = toThreeDir(camPosCv);

  // Righe di R = colonne di R^T = assi camera espressi in world(cv):
  // forward = riga Z, up = riga Y (nessuna negazione aggiuntiva necessaria,
  // la conversione di convenzione Y-down OpenCV -> Y-up Three tramite
  // toThreeDir la assorbe). Verificato con test-pnp-groundtruth.ts.
  const forwardCv: [number, number, number] = [Rt[2], Rt[5], Rt[8]];
  const upCv: [number, number, number] = [Rt[1], Rt[4], Rt[7]];

  const forwardThree = toThreeDir(forwardCv).normalize();
  const upThree = toThreeDir(upCv).normalize();

  // IMPORTANTE: usare una vera Camera (non un Object3D generico) per il
  // lookAt. Three.js orienta gli Object3D generici con l'asse +Z verso il
  // target, ma le Camera con l'asse -Z (convenzione standard "la camera
  // guarda lungo -Z locale") — sono convenzioni OPPOSTE. Usare un Object3D
  // qui produrrebbe una camera orientata esattamente a 180° dal previsto.
  const dummy = new THREE.PerspectiveCamera();
  dummy.position.copy(position);
  dummy.up.copy(upThree);
  dummy.lookAt(position.clone().add(forwardThree));
  const quaternion = dummy.quaternion.clone();

  const fovYDeg = (2 * Math.atan(imageHeight / (2 * fy)) * 180) / Math.PI;

  return { position, quaternion, fovYDeg, meanReprojectionErrorPx };
}

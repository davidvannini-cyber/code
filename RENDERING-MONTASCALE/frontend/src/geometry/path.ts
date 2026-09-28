import { stairAssumptions } from './dimensions';
import type { Vec3mm } from './RailGeometry';

/**
 * Converte il numero di gradini tracciati dall'utente in punti 3D assunti
 * lungo la rampa, assumendo alzata/pedata/larghezza standard e gradini
 * regolari. Per ogni gradino genera DUE punti (bordo sinistro e destro del
 * nosing) anziché uno solo: punti collineari lungo un'unica linea di
 * salita renderebbero la stima della posa camera (PnP) indeterminata
 * (manca il vincolo sulla rotazione attorno alla linea). Con punti
 * complanari-ma-non-allineati la stima è ben posta.
 *
 * Ordine di ritorno: [sx0, dx0, sx1, dx1, ...] dal basso verso l'alto —
 * deve combaciare con l'ordine di tracciamento richiesto in UI.
 */
export function buildAssumedPath3D(stepCount: number): Vec3mm[] {
  const { riserHeight, treadDepth, stairWidth } = stairAssumptions;
  const halfWidth = stairWidth / 2;
  const points: Vec3mm[] = [];
  for (let i = 0; i < stepCount; i++) {
    const x = i * treadDepth;
    const y = i * riserHeight;
    points.push([x, y, -halfWidth]); // bordo sinistro
    points.push([x, y, halfWidth]); // bordo destro
  }
  return points;
}

/**
 * Punto di riferimento dove la faccia verticale (alzata) del PRIMO gradino
 * incontra il pavimento — NON complanare con il piano inclinato dei
 * gradini (il pavimento è orizzontale, la rampa no). Serve a rompere
 * l'ambiguità planare del PnP: con soli punti complanari (i bordi dei
 * gradini giacciono tutti sullo stesso piano inclinato) esistono due pose
 * camera distinte che spiegano ugualmente bene la stessa proiezione 2D
 * ("bas-relief ambiguity", nota in letteratura PnP) — OpenCV può
 * convergere a quella sbagliata. Un solo punto fuori dal piano basta a
 * eliminare l'ambiguità.
 *
 * Scelto proprio sotto il punto 0 (stessa X=0, Z=0) invece che "a distanza"
 * davanti alla rampa: è uno spigolo fisico preciso e facile da individuare
 * con un click accurato (il punto dove l'alzata del primo scalino tocca il
 * pavimento), a differenza di un punto generico sul pavimento la cui
 * distanza esatta dalla rampa è impossibile da giudicare a occhio — un
 * click impreciso lì manda in crisi il solver (verificato: errori di
 * riproiezione di centinaia di px con un punto scelto "a distanza").
 */
export function buildFloorReferencePoint3D(): Vec3mm {
  const { riserHeight } = stairAssumptions;
  return [0, -riserHeight, 0];
}

/** Linea centrale (per il rendering del binario) derivata dai punti a coppie. */
export function centerlineFromPairedPoints(pairedPoints: Vec3mm[]): Vec3mm[] {
  const centerline: Vec3mm[] = [];
  for (let i = 0; i < pairedPoints.length; i += 2) {
    const [lx, ly, lz] = pairedPoints[i];
    const [rx, ry, rz] = pairedPoints[i + 1];
    centerline.push([(lx + rx) / 2, (ly + ry) / 2, (lz + rz) / 2]);
  }
  return centerline;
}

/**
 * Moduli d'estremità del binario (partenza / arrivo / curve di percorso),
 * generati come punti di controllo 2D a partire dall'ancora sulla rampa.
 * Sono solo un punto di partenza sensato: l'utente li corregge trascinandoli.
 */
import { railDimensions } from '../geometry/dimensions'
import type { PathPoint } from './montage'

export type EndType = 'none' | 'drop' | 'prolungato' | '90' | '180'
export type Side = 'sx' | 'dx'
export type RampKind = 'partenza' | 'percorso' | 'arrivo'

export const END_LABELS: Record<EndType, string> = {
  none: 'Filo gradino',
  drop: 'Drop',
  prolungato: 'Prolungato',
  '90': 'Curva 90°',
  '180': 'Curva 180°',
}

/** Quali moduli e quali default per tipo di rampa */
export const KIND_PRESETS: Record<RampKind, { start: EndType; end: EndType }> = {
  partenza: { start: 'prolungato', end: '180' }, // curva in alto semi visibile
  percorso: { start: '180', end: '180' }, // due curve semi visibili
  arrivo: { start: '180', end: 'none' }, // curva in basso semi visibile
}

export const START_OPTIONS: EndType[] = ['drop', 'prolungato', '90', '180']
export const END_OPTIONS: EndType[] = ['none', 'prolungato', '90', '180']

const FLATTEN = 0.35 // quanto appiattisce in immagine la direzione orizzontale rispetto alla rampa
const FORESHORTEN = 0.45 // accorciamento della direzione laterale sul piano del pavimento
/** Senza tromba la curva è stretta: raggio ~15 cm */
export const NO_WELL_RADIUS_MM = 150

/** Raggio di curvatura: metà della larghezza della tromba scale, o curva stretta se non c'è. */
export const turnRadiusMm = (wellWidthCm: number) =>
  wellWidthCm > 0 ? (wellWidthCm * 10) / 2 : NO_WELL_RADIUS_MM

const norm = (x: number, y: number) => {
  const l = Math.hypot(x, y) || 1
  return { x: x / l, y: y / l }
}

/** Punti del modulo, ordinati dall'ancora verso l'esterno (ancora esclusa). */
export function endModule(
  anchor: PathPoint,
  run: { x: number; y: number }, // direzione rampa in immagine, dal basso verso l'alto
  which: 'start' | 'end',
  type: EndType,
  side: Side,
  radiusMm: number,
): PathPoint[] {
  if (type === 'none') return []
  const k = anchor.s / railDimensions.tubeDiameter // px per mm
  // direzione orizzontale verso l'esterno: in basso indietro, in alto in avanti
  const ex =
    which === 'start' ? norm(-run.x, -run.y * FLATTEN) : norm(run.x, run.y * FLATTEN)
  let lat = { x: -ex.y, y: ex.x }
  if (lat.x < 0) lat = { x: -lat.x, y: -lat.y } // lat punta verso destra nell'immagine
  const sign = side === 'dx' ? 1 : -1
  lat = { x: lat.x * sign, y: lat.y * sign * FORESHORTEN }
  const at = (a: number, b: number, dy = 0): PathPoint => ({
    x: anchor.x + (ex.x * a + lat.x * b) * k,
    y: anchor.y + (ex.y * a + lat.y * b + dy) * k,
    s: anchor.s,
  })

  switch (type) {
    case 'prolungato':
      return [at(500, 0), at(1000, 0)]
    case 'drop':
      return [at(250, 0, 40), at(450, 0, 240)]
    case '90':
    case '180': {
      const R = radiusMm
      const end = type === '90' ? 90 : 180
      const pts: PathPoint[] = []
      for (let deg = 30; deg <= end; deg += 30) {
        const r = (deg * Math.PI) / 180
        pts.push(at(R * Math.sin(r), R * (1 - Math.cos(r))))
      }
      const a = R * Math.sin((end * Math.PI) / 180)
      const b = R * (1 - Math.cos((end * Math.PI) / 180))
      // tratto dritto dopo la curva: 90° prosegue lateralmente, 180° torna parallelo
      pts.push(type === '90' ? at(a, b + 350) : at(a - 350, b))
      return pts
    }
  }
}

/** Percorso completo dal basso verso l'alto: [modulo partenza (dall'esterno), ancora bassa, ancora alta, modulo arrivo]. */
export function buildPath(
  anchors: PathPoint[],
  start: EndType,
  end: EndType,
  side: Side,
  radiusMm: number,
): { key: string; p: PathPoint }[] {
  if (anchors.length < 2) return anchors.map((p, i) => ({ key: `a${i}`, p }))
  // anchors[0] = basso, anchors[1] = alto: ruoli fissi anche se l'utente li incrocia
  const [low, high] = anchors
  const run = norm(high.x - low.x, high.y - low.y)
  const startPts = endModule(low, run, 'start', start, side, radiusMm)
  const endPts = endModule(high, run, 'end', end, side, radiusMm)
  return [
    ...startPts.map((p, i) => ({ key: `s${i}`, p })).reverse(),
    { key: 'a0', p: low },
    { key: 'a1', p: high },
    ...endPts.map((p, i) => ({ key: `e${i}`, p })),
  ]
}

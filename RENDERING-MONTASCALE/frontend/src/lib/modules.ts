/**
 * Disegno del binario "a pezzi": una sequenza di elementi toccati sulla foto
 * (partenza, rettilineo, pianerottolo, curve, arrivo). Ogni elemento è un punto
 * = parte più bassa del binario in quel punto. I moduli (partenza/curva/arrivo)
 * generano punti di controllo 2D, correggibili trascinandoli.
 */
import { railDimensions } from '../geometry/dimensions'
import type { PathPoint } from './montage'

export type Side = 'sx' | 'dx'
export type ElemType = 'partenza' | 'inizioRett' | 'fineRett' | 'inizioPian' | 'finePian' | 'curva' | 'arrivo'
export type ModuleKind = 'none' | 'drop' | 'prolungato' | '90' | '180'

export interface Elem {
  id: number
  x: number
  y: number
  s: number
  type: ElemType
  kind: ModuleKind
  side: Side
}

export const ELEM_LABELS: Record<ElemType, string> = {
  partenza: 'PARTENZA',
  inizioRett: 'INIZIO RETTILINEO',
  fineRett: 'FINE RETTILINEO',
  inizioPian: 'INIZIO PIANEROTTOLO',
  finePian: 'FINE PIANEROTTOLO',
  curva: 'CURVA',
  arrivo: 'ARRIVO',
}

/** Opzioni a tendina per gli elementi che ne hanno: valore "kind" o "kind:lato" */
export const ELEM_OPTIONS: Partial<Record<ElemType, { value: string; label: string }[]>> = {
  partenza: [
    { value: 'drop', label: 'Drop' },
    { value: 'prolungato', label: 'Prolungato' },
    { value: '90:sx', label: '90° sinistra' },
    { value: '90:dx', label: '90° destra' },
    { value: '180:sx', label: '180° sinistra' },
    { value: '180:dx', label: '180° destra' },
  ],
  curva: [
    { value: '90:sx', label: '90° sinistra' },
    { value: '90:dx', label: '90° destra' },
    { value: '180:sx', label: '180° sinistra' },
    { value: '180:dx', label: '180° destra' },
  ],
  arrivo: [
    { value: 'none', label: 'Filo gradino' },
    { value: 'prolungato', label: 'Prolungato' },
    { value: '90:sx', label: '90° sinistra' },
    { value: '90:dx', label: '90° destra' },
    { value: '180:sx', label: '180° sinistra' },
    { value: '180:dx', label: '180° destra' },
  ],
}

export const parseOption = (v: string): { kind: ModuleKind; side: Side } => {
  const [k, s] = v.split(':')
  return { kind: k as ModuleKind, side: (s as Side) ?? 'dx' }
}

const FLATTEN = 0.35 // appiattimento in immagine di una direzione orizzontale rispetto alla rampa
const FORESHORTEN = 0.45 // accorciamento della direzione laterale sul piano del pavimento

/** Senza tromba la curva è stretta: raggio ~15 cm */
export const NO_WELL_RADIUS_MM = 150
/** Raggio di curvatura: metà della larghezza della tromba scale, o curva stretta se non c'è. */
export const turnRadiusMm = (wellWidthCm: number) =>
  wellWidthCm > 0 ? (wellWidthCm * 10) / 2 : NO_WELL_RADIUS_MM

type V = { x: number; y: number }
const norm = (x: number, y: number): V => {
  const l = Math.hypot(x, y) || 1
  return { x: x / l, y: y / l }
}

/** Punti di un modulo a partire da `anchor` verso la direzione orizzontale `ex` (unitaria, in immagine). */
function moduleFrom(anchor: PathPoint, ex: V, kind: ModuleKind, side: Side, radiusMm: number): PathPoint[] {
  if (kind === 'none') return []
  const k = anchor.s / railDimensions.tubeDiameter // px per mm
  let lat = { x: -ex.y, y: ex.x }
  if (lat.x < 0) lat = { x: -lat.x, y: -lat.y } // lat punta verso destra nell'immagine
  const sign = side === 'dx' ? 1 : -1
  lat = { x: lat.x * sign, y: lat.y * sign * FORESHORTEN }
  const at = (a: number, b: number, dy = 0): PathPoint => ({
    x: anchor.x + (ex.x * a + lat.x * b) * k,
    y: anchor.y + (ex.y * a + lat.y * b + dy) * k,
    s: anchor.s,
  })
  switch (kind) {
    case 'prolungato':
      return [at(500, 0), at(1000, 0)]
    case 'drop':
      return [at(250, 0, 40), at(450, 0, 240)]
    case '90':
    case '180': {
      const R = radiusMm
      const end = kind === '90' ? 90 : 180
      const pts: PathPoint[] = []
      for (let deg = 30; deg <= end; deg += 30) {
        const r = (deg * Math.PI) / 180
        pts.push(at(R * Math.sin(r), R * (1 - Math.cos(r))))
      }
      const a = R * Math.sin((end * Math.PI) / 180)
      const b = R * (1 - Math.cos((end * Math.PI) / 180))
      pts.push(kind === '90' ? at(a, b + 350) : at(a - 350, b))
      return pts
    }
  }
}

export interface PathEntry {
  key: string
  p: PathPoint // punto sul percorso (asse del tubo inferiore)
  h: { x: number; y: number } // dove disegnare/afferrare la maniglia
  elemId: number | null // elemento di origine (null = punto generato da un modulo)
}

/** Percorso completo, nell'ordine dei tocchi. */
export function buildPiecewise(elems: Elem[], radiusMm: number): PathEntry[] {
  const out: PathEntry[] = []
  const verts = elems.map((e) => ({ e, p: { x: e.x, y: e.y - e.s / 2, s: e.s } as PathPoint }))
  verts.forEach(({ e, p }, i) => {
    const prev = i > 0 ? verts[i - 1].p : null
    const next = i < verts.length - 1 ? verts[i + 1].p : null
    const dIn = prev ? norm(p.x - prev.x, p.y - prev.y) : next ? norm(next.x - p.x, next.y - p.y) : { x: 0, y: -1 }
    const dOut = next ? norm(next.x - p.x, next.y - p.y) : dIn
    const gen = (pts: PathPoint[], tag: string) =>
      pts.map((q, j) => ({ key: `g${e.id}${tag}${j}`, p: q, h: { x: q.x, y: q.y }, elemId: null as number | null }))

    if (e.type === 'partenza') {
      const back = norm(-dOut.x, -dOut.y * FLATTEN)
      out.push(...gen(moduleFrom(p, back, e.kind, e.side, radiusMm), 'b').reverse())
    }
    out.push({ key: `e${e.id}`, p, h: { x: e.x, y: e.y }, elemId: e.id })
    if (e.type === 'curva' || e.type === 'arrivo') {
      const fwd = norm(dIn.x, dIn.y * FLATTEN)
      out.push(...gen(moduleFrom(p, fwd, e.kind, e.side, radiusMm), 'f'))
    }
  })
  return out
}

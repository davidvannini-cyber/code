/**
 * Rendering 2D del binario lungo un percorso libero (spline) disegnato
 * dall'utente sulla foto. Nessuna stima di posa: la forma è quella del
 * percorso, la prospettiva è data dalla dimensione `s` di ogni punto.
 */
import { railDimensions } from '../geometry/dimensions'

/** x,y in pixel immagine; s = diametro del tubo in pixel a quel punto (scala locale) */
export interface PathPoint {
  x: number
  y: number
  s: number
}

const SAMPLES_PER_SEGMENT = 24

/** Catmull-Rom attraverso i punti, con `s` interpolato linearmente. */
export function sampleSpline(pts: PathPoint[]): PathPoint[] {
  if (pts.length < 2) return [...pts]
  const out: PathPoint[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(i + 2, pts.length - 1)]
    for (let k = 0; k < SAMPLES_PER_SEGMENT; k++) {
      const t = k / SAMPLES_PER_SEGMENT
      const t2 = t * t
      const t3 = t2 * t
      const cr = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push({ x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y), s: p1.s + (p2.s - p1.s) * t })
    }
  }
  out.push({ ...pts[pts.length - 1] })
  return out
}

/** mm -> pixel alla scala locale s (s = diametro tubo in px) */
const mmToPx = (mm: number, s: number) => (mm * s) / railDimensions.tubeDiameter

function tube(ctx: CanvasRenderingContext2D, line: PathPoint[], dy: (s: number) => number) {
  // passate sovrapposte con larghezza decrescente: bordo scuro -> corpo -> riflesso
  const passes: { w: number; color: string; shift: number }[] = [
    { w: 1.0, color: '#5d656c', shift: 0 },
    { w: 0.82, color: '#9aa3aa', shift: -0.03 },
    { w: 0.55, color: '#d3d9dd', shift: -0.12 },
    { w: 0.18, color: '#ffffff', shift: -0.22 },
  ]
  ctx.lineCap = 'round'
  for (const p of passes) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i]
      const b = line[i + 1]
      ctx.strokeStyle = p.color
      ctx.lineWidth = Math.max(1, a.s * p.w)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y + dy(a.s) + a.s * p.shift)
      ctx.lineTo(b.x, b.y + dy(b.s) + b.s * p.shift)
      ctx.stroke()
    }
  }
}

function post(ctx: CanvasRenderingContext2D, p: PathPoint) {
  const { postDiameter, postBaseSize, tubeSpacing, postHeight, tubeDiameter } = railDimensions
  const top = p.y - mmToPx(tubeSpacing, p.s)
  const bottom = p.y + mmToPx(postHeight + tubeDiameter / 2, p.s)
  const w = mmToPx(postDiameter, p.s)
  // piastra a pavimento
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(p.x, bottom + w * 0.15, mmToPx(postBaseSize.width, p.s) * 0.6, mmToPx(postBaseSize.depth, p.s) * 0.7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#d9dcde'
  ctx.beginPath()
  ctx.ellipse(p.x, bottom, mmToPx(postBaseSize.width, p.s) * 0.5, mmToPx(postBaseSize.depth, p.s) * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()
  // montante verticale, cilindro bianco con ombreggiatura laterale
  const g = ctx.createLinearGradient(p.x - w / 2, 0, p.x + w / 2, 0)
  g.addColorStop(0, '#c9ccce')
  g.addColorStop(0.35, '#ffffff')
  g.addColorStop(1, '#b4b8bb')
  ctx.fillStyle = g
  ctx.fillRect(p.x - w / 2, top, w, bottom - top)
}

/** Distribuisce i montanti lungo l'arco: uno ogni `postSpacing` mm alla scala locale. */
function postPositions(line: PathPoint[]): PathPoint[] {
  const res: PathPoint[] = []
  if (line.length === 0) return res
  res.push(line[0])
  let acc = 0
  for (let i = 1; i < line.length; i++) {
    acc += Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y)
    if (acc >= mmToPx(railDimensions.postSpacing, line[i].s)) {
      res.push(line[i])
      acc = 0
    }
  }
  const last = line[line.length - 1]
  if (res[res.length - 1] !== last) res.push(last)
  return res
}

export function drawRail(ctx: CanvasRenderingContext2D, pts: PathPoint[]) {
  if (pts.length < 2) return
  const line = sampleSpline(pts)
  for (const p of postPositions(line)) post(ctx, p)
  const { tubeSpacing } = railDimensions
  // tubo inferiore (sul percorso) e superiore (sopra di interasse)
  tube(ctx, line, () => 0)
  tube(ctx, line, (s) => -mmToPx(tubeSpacing, s))
}

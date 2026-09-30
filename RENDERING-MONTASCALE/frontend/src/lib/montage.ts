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

/**
 * Catmull-Rom centripetale (Barry-Goldman) attraverso i punti, con `s`
 * interpolato linearmente. La parametrizzazione centripeta evita ricci e
 * overshoot quando i punti sono a distanze molto diverse (rettilineo + curva).
 */
export function sampleSpline(pts: PathPoint[]): PathPoint[] {
  if (pts.length < 2) return [...pts]
  const ext = (a: PathPoint, b: PathPoint): PathPoint => ({ x: 2 * a.x - b.x, y: 2 * a.y - b.y, s: a.s })
  const P = [ext(pts[0], pts[1]), ...pts, ext(pts[pts.length - 1], pts[pts.length - 2])]
  const out: PathPoint[] = []
  const lerp = (a: PathPoint, b: PathPoint, ta: number, tb: number, u: number) => {
    const w = (u - ta) / (tb - ta || 1)
    return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w }
  }
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]]
    const d = (a: PathPoint, b: PathPoint) => Math.max(Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)), 1e-3)
    const t0 = 0
    const t1 = t0 + d(p0, p1)
    const t2 = t1 + d(p1, p2)
    const t3 = t2 + d(p2, p3)
    for (let k = 0; k < SAMPLES_PER_SEGMENT; k++) {
      const f = k / SAMPLES_PER_SEGMENT
      const u = t1 + (t2 - t1) * f
      const A1 = lerp(p0, p1, t0, t1, u)
      const A2 = lerp(p1, p2, t1, t2, u)
      const A3 = lerp(p2, p3, t2, t3, u)
      const B1 = lerp({ ...A1, s: 0 }, { ...A2, s: 0 }, t0, t2, u)
      const B2 = lerp({ ...A2, s: 0 }, { ...A3, s: 0 }, t1, t3, u)
      const C = lerp({ ...B1, s: 0 }, { ...B2, s: 0 }, t1, t2, u)
      out.push({ x: C.x, y: C.y, s: p1.s + (p2.s - p1.s) * f })
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

import { useCallback, useEffect, useRef, useState } from 'react'
import { drawRail, sampleSpline, type PathPoint } from '../lib/montage'

const HIT_RADIUS = 28

interface Props {
  image: HTMLImageElement
  onComposite?: (canvas: HTMLCanvasElement) => void
}

/** Distanza punto-segmento, per inserire un nuovo punto sul tratto più vicino. */
function segDist(p: PathPoint, a: PathPoint, b: PathPoint) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

export function MontageEditor({ image, onComposite }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pts, setPts] = useState<PathPoint[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const dragging = useRef<number | null>(null)
  const [showHandles, setShowHandles] = useState(true)

  const render = useCallback(
    (handles: boolean) => {
      const c = canvasRef.current
      if (!c) return
      const ctx = c.getContext('2d')!
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.drawImage(image, 0, 0)
      drawRail(ctx, pts)
      if (!handles) return
      const line = sampleSpline(pts)
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(255,60,60,0.9)'
      ctx.beginPath()
      line.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      ctx.stroke()
      pts.forEach((p, i) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, i === sel ? 14 : 10, 0, Math.PI * 2)
        ctx.fillStyle = i === sel ? '#ffd400' : '#ff3c3c'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.stroke()
      })
    },
    [image, pts, sel],
  )

  useEffect(() => {
    const c = canvasRef.current
    if (c) {
      c.width = image.naturalWidth
      c.height = image.naturalHeight
    }
  }, [image])

  useEffect(() => render(showHandles), [render, showHandles])

  const toImage = (e: React.PointerEvent): PathPoint => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height, s: 0 }
  }

  const hitScale = () => {
    const c = canvasRef.current!
    return (c.width / c.getBoundingClientRect().width) * HIT_RADIUS
  }

  const onDown = (e: React.PointerEvent) => {
    const p = toImage(e)
    const r = hitScale()
    const hit = pts.findIndex((q) => Math.hypot(q.x - p.x, q.y - p.y) < r)
    if (hit >= 0) {
      dragging.current = hit
      setSel(hit)
      ;(e.target as Element).setPointerCapture(e.pointerId)
      return
    }
    const baseS = image.naturalWidth / 28
    if (pts.length === 0) {
      setPts([{ ...p, s: baseS }])
      setSel(0)
      return
    }
    if (pts.length >= 2) {
      // inserisce sul tratto vicino se il click è vicino al percorso
      let best = -1
      let bestD = r * 1.5
      for (let i = 0; i < pts.length - 1; i++) {
        const d = segDist(p, pts[i], pts[i + 1])
        if (d < bestD) {
          bestD = d
          best = i
        }
      }
      if (best >= 0) {
        const s = (pts[best].s + pts[best + 1].s) / 2
        setPts([...pts.slice(0, best + 1), { ...p, s }, ...pts.slice(best + 1)])
        setSel(best + 1)
        return
      }
    }
    // altrimenti aggiunge in coda: il punto successivo è un po' più piccolo (più lontano)
    const last = pts[pts.length - 1]
    setPts([...pts, { ...p, s: last.s * 0.93 }])
    setSel(pts.length)
  }

  const onMove = (e: React.PointerEvent) => {
    const i = dragging.current
    if (i === null) return
    const p = toImage(e)
    setPts((cur) => cur.map((q, k) => (k === i ? { ...q, x: p.x, y: p.y } : q)))
  }

  const onUp = () => {
    dragging.current = null
  }

  const setScale = (factor: number) => {
    if (sel === null) return
    setPts((cur) => cur.map((q, k) => (k === sel ? { ...q, s: Math.max(4, q.s * factor) } : q)))
  }

  const removeSel = () => {
    if (sel === null) return
    setPts((cur) => cur.filter((_, k) => k !== sel))
    setSel(null)
  }

  const exportComposite = () => {
    render(false)
    const c = canvasRef.current!
    onComposite?.(c)
    render(showHandles)
  }

  return (
    <div>
      <div className="toolbar">
        <button onClick={() => setScale(1.1)} disabled={sel === null}>Punto più grande</button>
        <button onClick={() => setScale(1 / 1.1)} disabled={sel === null}>Punto più piccolo</button>
        <button onClick={removeSel} disabled={sel === null}>Elimina punto</button>
        <button onClick={() => { setPts([]); setSel(null) }} disabled={!pts.length}>Azzera</button>
        <label>
          <input type="checkbox" checked={showHandles} onChange={(e) => setShowHandles(e.target.checked)} /> Mostra guide
        </label>
        <button onClick={exportComposite} disabled={pts.length < 2}>Genera fotomontaggio</button>
      </div>
      <p className="hint">
        Tocca la foto lungo il percorso del binario, dal basso verso l'alto, seguendo la curva. Trascina i punti per
        correggere; tocca un punto e usa "più grande/piccolo" per la prospettiva (vicino = grande, lontano = piccolo).
      </p>
      <canvas
        ref={canvasRef}
        className="montage-canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      />
    </div>
  )
}

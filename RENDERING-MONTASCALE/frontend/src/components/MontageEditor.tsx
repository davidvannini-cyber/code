import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { drawRail, sampleSpline, type PathPoint } from '../lib/montage'
import {
  buildPath,
  END_LABELS,
  END_OPTIONS,
  KIND_PRESETS,
  START_OPTIONS,
  turnRadiusMm,
  type EndType,
  type RampKind,
  type Side,
} from '../lib/modules'

const HIT_RADIUS = 28

interface Props {
  image: HTMLImageElement
  onComposite?: (canvas: HTMLCanvasElement) => void
}

export function MontageEditor({ image, onComposite }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [kind, setKind] = useState<RampKind>('partenza')
  const [startType, setStartType] = useState<EndType>(KIND_PRESETS.partenza.start)
  const [endType, setEndType] = useState<EndType>(KIND_PRESETS.partenza.end)
  const [side, setSide] = useState<Side>('dx')
  const [wellCm, setWellCm] = useState(0) // larghezza tromba scale, 0 = senza tromba
  // ancore sulla rampa (max 2) e spostamenti manuali dei punti dei moduli
  const [anchors, setAnchors] = useState<PathPoint[]>([])
  const [offsets, setOffsets] = useState<Record<string, { dx: number; dy: number }>>({})
  const [showHandles, setShowHandles] = useState(true)
  const dragging = useRef<string | null>(null)

  const path = useMemo(() => {
    const raw = buildPath(anchors, startType, endType, side, turnRadiusMm(wellCm))
    return raw.map(({ key, p }) => {
      const o = offsets[key]
      return { key, p: o ? { ...p, x: p.x + o.dx, y: p.y + o.dy } : p }
    })
  }, [anchors, startType, endType, side, wellCm, offsets])

  const pickKind = (k: RampKind) => {
    setKind(k)
    setStartType(KIND_PRESETS[k].start)
    setEndType(KIND_PRESETS[k].end)
    setOffsets({})
  }

  const render = useCallback(
    (handles: boolean) => {
      const c = canvasRef.current
      if (!c) return
      const ctx = c.getContext('2d')!
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.drawImage(image, 0, 0)
      const pts = path.map((q) => q.p)
      drawRail(ctx, pts)
      if (!handles) return
      const u = c.width / 45 // unità di interfaccia proporzionale alla larghezza immagine
      ctx.lineWidth = Math.max(2, u / 6)
      ctx.strokeStyle = 'rgba(255,60,60,0.9)'
      ctx.beginPath()
      sampleSpline(pts).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      ctx.stroke()
      path.forEach(({ key, p }) => {
        const anchor = key.startsWith('a')
        ctx.beginPath()
        ctx.arc(p.x, p.y, anchor ? u : u * 0.65, 0, Math.PI * 2)
        ctx.fillStyle = anchor ? '#ffd400' : '#ff3c3c'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = Math.max(2, u / 5)
        ctx.stroke()
      })
    },
    [image, path],
  )

  useEffect(() => {
    const c = canvasRef.current
    if (c) {
      c.width = image.naturalWidth
      c.height = image.naturalHeight
    }
    setAnchors([])
    setOffsets({})
  }, [image])

  useEffect(() => render(showHandles), [render, showHandles])

  const toImage = (e: React.PointerEvent) => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height }
  }

  const onDown = (e: React.PointerEvent) => {
    const p = toImage(e)
    const c = canvasRef.current!
    const r = (c.width / c.getBoundingClientRect().width) * HIT_RADIUS
    const hit = path.find(({ p: q }) => Math.hypot(q.x - p.x, q.y - p.y) < r)
    if (hit) {
      dragging.current = hit.key
      ;(e.target as Element).setPointerCapture(e.pointerId)
      return
    }
    if (anchors.length === 0) {
      // un solo tocco: il binario compare subito, poi si trascina per adattarlo
      const s = image.naturalWidth / 45
      const top = {
        x: Math.min(image.naturalWidth * 0.95, p.x + image.naturalWidth * 0.06),
        y: Math.max(image.naturalHeight * 0.1, p.y - image.naturalHeight * 0.4),
        s: s * 0.75,
      }
      setAnchors([{ ...p, s }, top])
    }
  }

  const onMove = (e: React.PointerEvent) => {
    const key = dragging.current
    if (!key) return
    const p = toImage(e)
    if (key.startsWith('a')) {
      const idx = key === 'a0' ? 0 : 1
      setAnchors((cur) => cur.map((q, k) => (k === idx ? { ...q, x: p.x, y: p.y } : q)))
    } else {
      const base = path.find((q) => q.key === key)!.p
      setOffsets((cur) => {
        const o = cur[key] ?? { dx: 0, dy: 0 }
        return { ...cur, [key]: { dx: o.dx + (p.x - base.x), dy: o.dy + (p.y - base.y) } }
      })
    }
  }

  const onUp = () => {
    dragging.current = null
  }

  const setAnchorScale = (which: 'low' | 'high', s: number) => {
    setAnchors((cur) => {
      const idx = which === 'low' ? 0 : 1
      return cur.map((q, k) => (k === idx ? { ...q, s } : q))
    })
  }

  const sortedAnchors = anchors
  const maxS = image.naturalWidth / 12

  const exportComposite = () => {
    render(false)
    onComposite?.(canvasRef.current!)
    render(showHandles)
  }

  return (
    <div>
      <div className="toolbar">
        <strong>Rampa:</strong>
        {(['partenza', 'percorso', 'arrivo'] as RampKind[]).map((k) => (
          <button key={k} onClick={() => pickKind(k)} className={kind === k ? 'on' : ''}>
            {k[0].toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <label>
          {kind === 'partenza' ? 'Tipo partenza (in basso)' : 'In basso'}{' '}
          <select value={startType} onChange={(e) => { setStartType(e.target.value as EndType); setOffsets({}) }}>
            {START_OPTIONS.map((t) => <option key={t} value={t}>{END_LABELS[t]}</option>)}
          </select>
        </label>
        <label>
          {kind === 'arrivo' ? 'Tipo arrivo (in alto)' : 'In alto'}{' '}
          <select value={endType} onChange={(e) => { setEndType(e.target.value as EndType); setOffsets({}) }}>
            {END_OPTIONS.map((t) => <option key={t} value={t}>{END_LABELS[t]}</option>)}
          </select>
        </label>
        <label>
          Tromba (cm, 0 = senza){' '}
          <input type="number" min={0} max={200} value={wellCm} style={{ width: 60 }} onChange={(e) => { setWellCm(Math.max(0, +e.target.value || 0)); setOffsets({}) }} />
        </label>
        <label>
          Lato curve{' '}
          <select value={side} onChange={(e) => { setSide(e.target.value as Side); setOffsets({}) }}>
            <option value="sx">Sinistra</option>
            <option value="dx">Destra</option>
          </select>
        </label>
      </div>
      <div className="toolbar">
        <label>
          Scala punto basso{' '}
          <input type="range" min={4} max={maxS} disabled={anchors.length < 2} value={sortedAnchors[0]?.s ?? 4} onChange={(e) => setAnchorScale('low', +e.target.value)} />
        </label>
        <label>
          Scala punto alto{' '}
          <input type="range" min={4} max={maxS} disabled={anchors.length < 2} value={sortedAnchors[1]?.s ?? 4} onChange={(e) => setAnchorScale('high', +e.target.value)} />
        </label>
      </div>
      <div className="toolbar">
        <button onClick={() => { setAnchors([]); setOffsets({}) }} disabled={!anchors.length}>Azzera</button>
        <label>
          <input type="checkbox" checked={showHandles} onChange={(e) => setShowHandles(e.target.checked)} /> Mostra guide
        </label>
        <button onClick={exportComposite} disabled={anchors.length < 2}>Genera fotomontaggio</button>
      </div>
      <p className="status">
        {anchors.length === 0 ? 'Tocca la foto dove inizia il binario (in basso)' : 'Trascina le estremità per adattare il binario'}
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

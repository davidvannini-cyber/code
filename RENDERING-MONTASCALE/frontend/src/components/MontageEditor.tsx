import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { chairRect, drawChairRect, drawRail, sampleSpline, type Rect } from '../lib/montage'
import {
  buildPiecewise,
  ELEM_LABELS,
  ELEM_OPTIONS,
  parseOption,
  turnRadiusMm,
  type Elem,
  type ElemType,
} from '../lib/modules'

const HIT_RADIUS = 28
const PLAIN: ElemType[] = ['inizioRett', 'fineRett', 'inizioPian', 'finePian']
const WITH_OPTIONS: ElemType[] = ['partenza', 'curva', 'arrivo']

interface Props {
  image: HTMLImageElement
  onComposite?: (canvas: HTMLCanvasElement, chair: Rect | null) => void
  disabled?: boolean
}

export function MontageEditor({ image, onComposite, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [elems, setElems] = useState<Elem[]>([])
  const [offsets, setOffsets] = useState<Record<string, { dx: number; dy: number }>>({})
  const [sel, setSel] = useState<number | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; sx: number; sy: number } | null>(null)
  const [wellCm, setWellCm] = useState(0) // larghezza tromba, 0 = senza tromba
  const [showHandles, setShowHandles] = useState(true)
  const [chairOn, setChairOn] = useState(true)
  const [chairT, setChairT] = useState(0.1)
  const dragging = useRef<string | null>(null)
  const nextId = useRef(1)

  const path = useMemo(
    () =>
      buildPiecewise(elems, turnRadiusMm(wellCm)).map((q) => {
        const o = offsets[q.key]
        return o ? { ...q, p: { ...q.p, x: q.p.x + o.dx, y: q.p.y + o.dy }, h: { x: q.h.x + o.dx, y: q.h.y + o.dy } } : q
      }),
    [elems, wellCm, offsets],
  )

  const chair = useMemo(() => {
    if (!chairOn || path.length < 2) return null
    const line = sampleSpline(path.map((q) => q.p))
    return chairRect(line[Math.round(chairT * (line.length - 1))])
  }, [chairOn, chairT, path])

  const render = useCallback(
    (handles: boolean, placeholder = true) => {
      const c = canvasRef.current
      if (!c) return
      const ctx = c.getContext('2d')!
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.drawImage(image, 0, 0)
      const pts = path.map((q) => q.p)
      drawRail(ctx, pts)
      if (placeholder && chair) drawChairRect(ctx, chair, Math.max(2, c.width / 300))
      if (!handles) return
      const u = c.width / 45
      ctx.lineWidth = Math.max(2, u / 6)
      ctx.strokeStyle = 'rgba(255,60,60,0.9)'
      ctx.beginPath()
      sampleSpline(pts).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      ctx.stroke()
      path.forEach(({ h, elemId }) => {
        ctx.beginPath()
        ctx.arc(h.x, h.y, elemId !== null ? u : u * 0.6, 0, Math.PI * 2)
        ctx.fillStyle = elemId === sel ? '#00c853' : elemId !== null ? '#ffd400' : '#ff3c3c'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = Math.max(2, u / 5)
        ctx.stroke()
      })
    },
    [image, path, chair, sel],
  )

  useEffect(() => {
    const c = canvasRef.current
    if (c) {
      c.width = image.naturalWidth
      c.height = image.naturalHeight
    }
    setElems([])
    setOffsets({})
    setSel(null)
    setMenu(null)
  }, [image])

  useEffect(() => render(showHandles), [render, showHandles])

  const toImage = (e: React.PointerEvent) => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
      sx: e.clientX - r.left,
      sy: e.clientY - r.top,
    }
  }

  const onDown = (e: React.PointerEvent) => {
    if (disabled) return
    const p = toImage(e)
    const c = canvasRef.current!
    const r = (c.width / c.getBoundingClientRect().width) * HIT_RADIUS
    const hit = [...path].reverse().find(({ h }) => Math.hypot(h.x - p.x, h.y - p.y) < r)
    setMenu(null)
    if (hit) {
      dragging.current = hit.key
      setSel(hit.elemId)
      ;(e.target as Element).setPointerCapture(e.pointerId)
      return
    }
    setMenu({ x: p.x, y: p.y, sx: p.sx, sy: p.sy })
  }

  const onMove = (e: React.PointerEvent) => {
    const key = dragging.current
    if (!key) return
    const p = toImage(e)
    if (key.startsWith('e')) {
      const id = +key.slice(1)
      // la maniglia è nel punto toccato: il binario sta mezzo tubo più in alto
      setElems((cur) => cur.map((q) => (q.id === id ? { ...q, x: p.x, y: p.y } : q)))
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

  const addElem = (type: ElemType, option?: string) => {
    if (!menu) return
    const prev = elems[elems.length - 1]
    const s = prev ? prev.s * 0.85 : image.naturalWidth / 45
    const { kind, side } = option ? parseOption(option) : { kind: 'none' as const, side: 'dx' as const }
    const id = nextId.current++
    setElems([...elems, { id, x: menu.x, y: menu.y, s, type, kind, side }])
    setOffsets({})
    setSel(id)
    setMenu(null)
  }

  const selected = elems.find((q) => q.id === sel)
  const setSelScale = (s: number) => setElems((cur) => cur.map((q) => (q.id === sel ? { ...q, s } : q)))
  const removeSel = () => {
    setElems((cur) => cur.filter((q) => q.id !== sel))
    setOffsets({})
    setSel(null)
  }

  const exportComposite = () => {
    render(false, false) // senza sagoma: la poltroncina si aggiunge in un secondo passaggio
    onComposite?.(canvasRef.current!, chair)
    render(showHandles)
  }

  const first = elems.length === 0
  const types: ElemType[] = first
    ? ['partenza', 'inizioRett', 'fineRett', 'inizioPian', 'finePian', 'curva', 'arrivo']
    : ['inizioRett', 'fineRett', 'inizioPian', 'finePian', 'curva', 'arrivo']

  return (
    <div>
      <div className="toolbar">
        <button onClick={() => { const last = elems[elems.length - 1]; if (last) { setElems(elems.slice(0, -1)); setOffsets({}); setSel(null) } }} disabled={!elems.length}>
          Annulla ultimo
        </button>
        <button onClick={() => { setElems([]); setOffsets({}); setSel(null) }} disabled={!elems.length}>Azzera</button>
        <label>
          Tromba (cm){' '}
          <input type="number" min={0} max={200} value={wellCm} style={{ width: 60 }} onChange={(e) => { setWellCm(Math.max(0, +e.target.value || 0)); setOffsets({}) }} />
        </label>
        <label>
          <input type="checkbox" checked={showHandles} onChange={(e) => setShowHandles(e.target.checked)} /> Guide
        </label>
      </div>
      <div className="toolbar">
        <label>
          <input type="checkbox" checked={chairOn} onChange={(e) => setChairOn(e.target.checked)} /> Poltroncina
        </label>
        <input type="range" min={0} max={1} step={0.01} disabled={!chairOn} value={chairT} onChange={(e) => setChairT(+e.target.value)} />
        <label>
          Scala{' '}
          <input
            type="range"
            min={4}
            max={image.naturalWidth / 12}
            disabled={!selected}
            value={selected?.s ?? 4}
            onChange={(e) => setSelScale(+e.target.value)}
          />
        </label>
        <button onClick={removeSel} disabled={!selected}>Elimina punto</button>
        <button className="primary" onClick={exportComposite} disabled={path.length < 2 || disabled}>
          Genera
        </button>
      </div>
      <div className="canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="montage-canvas"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
        />
        {menu && (
          <div
            className="menu"
            style={{ left: Math.min(menu.sx, (wrapRef.current?.clientWidth ?? 300) - 210), top: menu.sy }}
          >
            {types.map((t) =>
              WITH_OPTIONS.includes(t) ? (
                <select
                  key={t}
                  value=""
                  onChange={(e) => e.target.value && addElem(t, e.target.value)}
                >
                  <option value="">{ELEM_LABELS[t]} ▾</option>
                  {ELEM_OPTIONS[t]!.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : PLAIN.includes(t) ? (
                <button key={t} onClick={() => addElem(t)}>{ELEM_LABELS[t]}</button>
              ) : null,
            )}
          </div>
        )}
      </div>
    </div>
  )
}

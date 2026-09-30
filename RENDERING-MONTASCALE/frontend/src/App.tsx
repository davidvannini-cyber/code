import { useState } from 'react'
import { MontageEditor } from './components/MontageEditor'
import { drawChairRect, type Rect } from './lib/montage'
import './App.css'

type Phase = 'edit' | 'loading' | 'done' | 'error'

function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [phase, setPhase] = useState<Phase>('edit')
  const [montageUrl, setMontageUrl] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    img.onload = () => {
      setImage(img)
      setMontageUrl(null)
      setResultUrl(null)
      setPhase('edit')
    }
    img.src = URL.createObjectURL(file)
  }

  const generate = async (dataUrl: string, chairOnly: boolean) => {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compositeImageBase64: dataUrl.split(',')[1], withChair: chairOnly, chairOnly }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Errore')
    return `data:image/png;base64,${json.resultImageBase64}`
  }

  const loadImg = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = src
    })

  /** Aggiunge la poltroncina solo in un ritaglio attorno alla sagoma e lo reincolla con bordi sfumati. */
  const addChair = async (resultUrl: string, rect: Rect, origWidth: number) => {
    const base = await loadImg(resultUrl)
    const k = base.naturalWidth / origWidth
    const r = { x: rect.x * k, y: rect.y * k, w: rect.w * k, h: rect.h * k }
    const pad = 0.4
    const cx = Math.max(0, Math.floor(r.x - r.w * pad))
    const cy = Math.max(0, Math.floor(r.y - r.h * pad))
    const cw = Math.min(base.naturalWidth - cx, Math.ceil(r.w * (1 + 2 * pad)))
    const ch = Math.min(base.naturalHeight - cy, Math.ceil(r.h * (1 + 2 * pad)))

    const full = document.createElement('canvas')
    full.width = base.naturalWidth
    full.height = base.naturalHeight
    const fctx = full.getContext('2d')!
    fctx.drawImage(base, 0, 0)

    const crop = document.createElement('canvas')
    crop.width = cw
    crop.height = ch
    const cctx = crop.getContext('2d')!
    cctx.drawImage(base, cx, cy, cw, ch, 0, 0, cw, ch)
    drawChairRect(cctx, { x: r.x - cx, y: r.y - cy, w: r.w, h: r.h }, 2)

    const out = await loadImg(await generate(crop.toDataURL('image/png'), true))

    // ritaglio risultante -> stessa dimensione, maschera sfumata, reincollo
    const patch = document.createElement('canvas')
    patch.width = cw
    patch.height = ch
    const pctx = patch.getContext('2d')!
    pctx.drawImage(out, 0, 0, cw, ch)
    const mask = document.createElement('canvas')
    mask.width = cw
    mask.height = ch
    const mctx = mask.getContext('2d')!
    const feather = Math.min(cw, ch) * 0.08
    mctx.filter = `blur(${feather}px)`
    mctx.fillStyle = '#fff'
    mctx.fillRect(feather * 2, feather * 2, cw - feather * 4, ch - feather * 4)
    pctx.globalCompositeOperation = 'destination-in'
    pctx.drawImage(mask, 0, 0)
    fctx.drawImage(patch, cx, cy)
    return full.toDataURL('image/png')
  }

  const handleComposite = async (canvas: HTMLCanvasElement, chair: Rect | null) => {
    const dataUrl = canvas.toDataURL('image/png')
    setMontageUrl(dataUrl)
    setResultUrl(null)
    setPhase('loading')
    try {
      let result = await generate(dataUrl, false)
      if (chair) result = await addChair(result, chair, canvas.width)
      setResultUrl(result)
      setPhase('done')
    } catch (err) {
      // il fotomontaggio resta comunque disponibile anche senza passaggio AI
      setError(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }

  return (
    <div className="app">
      <h1>Rendering montascale</h1>
      <input type="file" accept="image/*" onChange={handleFile} />
      {image && <MontageEditor image={image} onComposite={handleComposite} />}
      {montageUrl && (
        <section>
          <h2>Fotomontaggio</h2>
          <img src={montageUrl} className="result" />
        </section>
      )}
      {phase === 'loading' && <p>Ritocco fotorealistico in corso…</p>}
      {phase === 'error' && <p>Ritocco AI non disponibile: {error}</p>}
      {resultUrl && (
        <section>
          <h2>Risultato fotorealistico</h2>
          <img src={resultUrl} className="result" />
        </section>
      )}
    </div>
  )
}

export default App

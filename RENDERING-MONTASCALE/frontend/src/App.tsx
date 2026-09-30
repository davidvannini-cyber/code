import { useState } from 'react'
import { MontageEditor } from './components/MontageEditor'
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

  const handleComposite = async (canvas: HTMLCanvasElement) => {
    const dataUrl = canvas.toDataURL('image/png')
    setMontageUrl(dataUrl)
    setResultUrl(null)
    setPhase('loading')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compositeImageBase64: dataUrl.split(',')[1] }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Errore')
      setResultUrl(`data:image/png;base64,${json.resultImageBase64}`)
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

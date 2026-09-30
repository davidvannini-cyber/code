// Test di fattibilità: Gemini genera l'installazione del montascale su una foto di scala.
// Uso: GEMINI_API_KEY=... node experiments/feasibility.mjs <foto-scala> [<foto-con-linea-guida>] [out.png]
import fs from 'node:fs'
import path from 'node:path'

const [stairPath, guidePath, out = 'out.png'] = process.argv.slice(2)
const key = process.env.GEMINI_API_KEY
const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-image-preview'
if (!key || !stairPath) { console.error('serve GEMINI_API_KEY e <foto-scala>'); process.exit(1) }

const ref = (f) => path.join(import.meta.dirname, '..', 'assets', 'reference', f)
const img = (p) => ({ inline_data: { mime_type: p.endsWith('.png') ? 'image/png' : 'image/jpeg', data: fs.readFileSync(p).toString('base64') } })

const prompt = `Immagine 1: la scala del cliente (foto da modificare).
${guidePath ? 'Immagine 2: la stessa foto con una linea rossa a mano libera che indica dove installare il binario, dal basso verso l\'alto.\n' : ''}Immagini di riferimento successive: foto reali del prodotto (binario tubolare in acciaio zincato su montanti bianchi, poltroncina grigia/blu).

Compito: restituisci la foto 1 con un montascale installato, come in un rendering commerciale fotorealistico.
- Binario: due tubi d'acciaio zincato (diam. 48 mm) sovrapposti, paralleli alla pendenza della scala, a ~10-12 cm dal piano dei gradini, sostenuto da montanti bianchi verticali ogni 2-3 gradini con piastra a pavimento.
- Il binario segue la pendenza reale dei gradini (NON verticale), sul lato indicato${guidePath ? ' dalla linea rossa (che non deve comparire nel risultato)' : ''}.
- Poltroncina in posizione di riposo in fondo alla scala, schienale ripiegato.
- Prospettiva, scala, luci e ombre coerenti con la foto. Non modificare nient'altro.`

const parts = [{ text: prompt }, img(stairPath)]
if (guidePath) parts.push(img(guidePath))
for (const f of ['rail-01.jpg', 'rail-02-curve.jpg', 'chair-01.jpg']) parts.push(img(ref(f)))

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
  body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } }),
})
const json = await res.json()
if (!res.ok) { console.error(JSON.stringify(json).slice(0, 800)); process.exit(1) }
for (const p of json.candidates?.[0]?.content?.parts ?? []) {
  if (p.text) console.log('TEXT:', p.text)
  const d = p.inlineData ?? p.inline_data
  if (d) { fs.writeFileSync(out, Buffer.from(d.data, 'base64')); console.log('salvato', out) }
}

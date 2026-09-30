import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY non configurata');
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

export interface FuseImageInput {
  /** Foto originale + proxy 3D già compositati (PNG base64, senza prefisso data:) */
  compositeImageBase64: string;
  /** Opzionale: bianco = area modificabile, nero = area protetta */
  maskImageBase64?: string;
  /** Se true, nel composito c'è la sagoma blu della poltroncina da sostituire col prodotto reale */
  withChair?: boolean;
  /** Immagine = ritaglio con solo la sagoma da sostituire: nient'altro va modificato */
  chairOnly?: boolean;
}

const CHAIR_PROMPT = `
Nel composito c'è anche una sagoma BLU PIENA rettangolare: è il segnaposto della poltroncina.
Sostituiscila con la poltroncina del prodotto, identica a quella delle foto di riferimento
allegate (seduta e schienale imbottiti grigio-blu, braccioli bianchi ripiegati, corpo bianco),
nella stessa posizione, con lo stesso ingombro e la stessa prospettiva della sagoma, appoggiata
al binario. Nessuna traccia della sagoma blu deve restare visibile.
`.trim();

const CHAIR_ONLY_PROMPT = `
Questo è il ritaglio di una foto di una scala con un binario d'acciaio. C'è una sagoma BLU PIENA
rettangolare: è il segnaposto della poltroncina di un montascale.
Sostituisci SOLO la sagoma con la poltroncina del prodotto, identica a quella delle foto di
riferimento allegate (seduta e schienale imbottiti grigio-blu, braccioli bianchi, corpo bianco),
stessa posizione, stesso ingombro, stessa prospettiva, appoggiata al binario, con ombra coerente.
NON modificare in alcun modo il resto dell'immagine: scala, binario, montanti e sfondo devono
restare identici pixel per pixel. Non aggiungere altri elementi. Nessuna traccia di blu resta.
`.trim();

const REFERENCE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'reference');
function referenceParts() {
  return ['chair-01.jpg', 'chair-02.jpg'].flatMap((f) => {
    const p = path.join(REFERENCE_DIR, f);
    return fs.existsSync(p)
      ? [{ inlineData: { mimeType: 'image/jpeg', data: fs.readFileSync(p).toString('base64') } }]
      : [];
  });
}

const FUSION_PROMPT = `
Sei uno strumento di ritocco fotorealistico per un fotomontaggio di montascale su una foto reale.
Nell'immagine il binario (due tubi d'acciaio con montanti bianchi) è già disegnato in posizione
e prospettiva corrette: MANTIENI esattamente forma, posizione e percorso del binario, compresi
i tratti curvi. Rendilo fotorealistico: materiale metallico zincato con riflessi coerenti con
l'ambiente, montanti bianchi verniciati, ombre proiettate e di contatto sui gradini, grana e
nitidezza uguali alla foto. Non alterare la scala né il resto della scena.
`.trim();

/**
 * NOTA: chiamata non ancora validata contro l'API reale (nessuna key
 * disponibile in fase di sviluppo iniziale). Formato contents/response da
 * verificare/adattare alla prima prova con key attiva — in particolare se
 * il modello supporta davvero un input maschera dedicato o se va gestito
 * diversamente (es. crop dell'area da rigenerare).
 */
export async function fuseImage({
  compositeImageBase64,
  maskImageBase64,
  withChair,
  chairOnly,
}: FuseImageInput): Promise<string> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-image-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { text: chairOnly ? CHAIR_ONLY_PROMPT : withChair ? `${FUSION_PROMPT}\n\n${CHAIR_PROMPT}` : FUSION_PROMPT },
          { inlineData: { mimeType: 'image/png', data: compositeImageBase64 } },
          ...(withChair ? referenceParts() : []),
          ...(maskImageBase64 ? [{ inlineData: { mimeType: 'image/png', data: maskImageBase64 } }] : []),
        ],
      },
    ],
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error('Nessuna immagine restituita da Gemini');
  }
  return imagePart.inlineData.data;
}

import { GoogleGenAI } from '@google/genai';

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
}: FuseImageInput): Promise<string> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-image-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { text: FUSION_PROMPT },
          { inlineData: { mimeType: 'image/png', data: compositeImageBase64 } },
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

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
  /** Bianco = area modificabile (alone luci/ombre attorno al prodotto), nero = area protetta (pixel prodotto, intoccabili) */
  maskImageBase64: string;
}

const FUSION_PROMPT = `
Sei uno strumento di fusione fotorealistica per un montascale composito su una foto reale.
Nell'immagine fornita, il prodotto (binario e poltroncina) è già posizionato correttamente
in prospettiva: NON modificare forma, colore o dettagli del prodotto.
Il tuo unico compito è armonizzare l'illuminazione, generare ombre coerenti con la luce
della stanza/ambiente, e sfumare i contorni del prodotto con la scena circostante SOLO
nell'area indicata dalla maschera fornita (area bianca = modificabile, area nera =
intoccabile). Non alterare la geometria della scala, non aggiungere o rimuovere elementi.
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
    model: 'gemini-2.5-flash-image',
    contents: [
      {
        role: 'user',
        parts: [
          { text: FUSION_PROMPT },
          { inlineData: { mimeType: 'image/png', data: compositeImageBase64 } },
          { inlineData: { mimeType: 'image/png', data: maskImageBase64 } },
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

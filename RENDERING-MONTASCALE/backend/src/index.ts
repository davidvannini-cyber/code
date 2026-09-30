import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { fuseImage } from './gemini.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, geminiConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

app.post('/api/generate', async (req, res) => {
  const { compositeImageBase64, maskImageBase64, withChair, chairOnly } = req.body ?? {};
  if (!compositeImageBase64) {
    res.status(400).json({ error: 'compositeImageBase64 è richiesto' });
    return;
  }
  if (!process.env.GEMINI_API_KEY) {
    res.status(501).json({ error: 'GEMINI_API_KEY non configurata sul server' });
    return;
  }
  try {
    const resultImageBase64 = await fuseImage({ compositeImageBase64, maskImageBase64, withChair: Boolean(withChair), chairOnly: Boolean(chairOnly) });
    res.json({ resultImageBase64 });
  } catch (err) {
    console.error('Errore fusione Gemini', err);
    res.status(502).json({ error: 'Errore durante la generazione' });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`Backend RENDERING MONTASCALE in ascolto su http://localhost:${port}`);
});

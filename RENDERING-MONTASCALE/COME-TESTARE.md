# Come testare

Doppio clic su `AVVIA-TEST.command` (prima volta: tasto destro > Apri). Fa tutto da solo.

Procedura manuale (solo se serve):

```bash
git fetch origin claude/adoring-darwin-3jf3eu
git checkout claude/adoring-darwin-3jf3eu

# terminale 1 - backend
cd RENDERING-MONTASCALE/backend
npm install
echo "GEMINI_API_KEY=la_tua_chiave" > .env
npm run dev

# terminale 2 - frontend
cd RENDERING-MONTASCALE/frontend
npm install
npm run dev
```

Apri http://localhost:5173, carica una foto di rampa, scegli Partenza/Percorso/Arrivo,
tocca 2 punti sul tratto dritto, poi "Genera fotomontaggio".
Senza backend/chiave vedi comunque il fotomontaggio (senza ritocco fotorealistico).

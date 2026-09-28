# RENDERING MONTASCALE

Configuratore AI per generare anteprime fotorealistiche di montascale (modello
"Facile Robusta per esterno") su foto reali della scala del cliente, per uso
commerciale sul campo.

Architettura ibrida: geometria del binario/poltroncina gestita da un motore
3D (deterministico, mai lasciato all'AI), fusione fotorealistica finale
(luci/ombre) affidata a Gemini solo su un'area mascherata, senza mai toccare
i pixel del prodotto.

## Struttura

```
frontend/   React + TypeScript + Three.js (react-three-fiber) + OpenCV.js
backend/    Node/Express — proxy verso Gemini API (la key resta sul server)
assets/reference/   Foto reali del prodotto fornite dal cliente (riferimento)
```

## Stato attuale — RELEASE DI TEST (prototipo testato end-to-end in browser reale)

Testato con Playwright + Chromium headless su una foto reale (non un mock):
upload foto → tracciamento gradini → tracciamento punto pavimento → stima
posa camera → render 3D compositato sopra la foto, con verifica automatica
di affidabilità della stima. Il meccanismo end-to-end funziona; la
precisione fine dipende dalla cura con cui l'utente clicca i punti (vedi
"Come testarlo" sotto).

- Geometria parametrica di binario e poltroncina (`frontend/src/geometry/`),
  dimensionata sulle misure reali del modello "Facile Robusta per esterno"
  fornite dal cliente (vedi `dimensions.ts` — unico file da editare per
  aggiornare le proporzioni).
- UI di tracciamento a due passi (`PhotoTracer.tsx` + `App.tsx`):
  1. bordo sinistro/destro di ogni gradino visibile, dal basso verso l'alto;
  2. un punto dove l'alzata del primo gradino tocca il pavimento (rompe
     l'ambiguità planare — vedi sotto).
- Stima della posa camera reale (`lib/pnp.ts`) tramite OpenCV.js, con
  fallback automatico tra algoritmi (`SOLVEPNP_ITERATIVE` → `SOLVEPNP_EPNP`)
  quando la prima soluzione risulta fisicamente impossibile (punti dietro
  la camera), e calcolo dell'errore medio di riproiezione come indicatore
  di affidabilità mostrato all'utente.
- Viewer Three.js (`ThreeViewer.tsx`) che compositi binario+poltroncina
  sopra la foto originale, con camera virtuale impostata sulla posa
  stimata (drei `<PerspectiveCamera makeDefault>` dichiarativa).
- Scheletro backend Express con endpoint `/api/generate`, proxy verso
  Gemini (`gemini.ts`) — non ancora testato contro l'API reale (manca la
  key).
- Suite di test di regressione in `frontend/tests/` (vedi sotto).

### Bug reali trovati e corretti durante il test in browser

1. **Camera orientata a 180° (geometria sempre "dietro" la camera,
   invisibile).** Causa: `src/lib/pnp.ts` costruiva l'orientamento con
   `new THREE.Object3D().lookAt(...)`. In Three.js `Object3D.lookAt`
   orienta l'oggetto con l'asse **+Z** verso il target, mentre
   `Camera.lookAt` usa **-Z** — convenzioni opposte. Fix: usare
   `new THREE.PerspectiveCamera()` invece di `Object3D`.
2. **Pattern R3F fragile per la camera.** Un oggetto `camera={{fov:50,...}}`
   inline al `Canvas` + mutazione imperativa in un `useEffect` rischia il
   reset ai default ad ogni re-render. Fix: camera dichiarativa con drei
   `<PerspectiveCamera makeDefault position=... quaternion=... />`.
3. **Ambiguità planare del PnP.** I punti sui bordi gradino giacciono tutti
   sul piano inclinato della rampa — configurazione classica per la
   "bas-relief ambiguity": due pose camera distinte spiegano ugualmente
   bene la stessa immagine. Fix in due parti:
   - aggiunto un punto di tracciamento extra NON complanare (dove l'alzata
     del primo gradino tocca il pavimento — `buildFloorReferencePoint3D`
     in `geometry/path.ts`, UI in due passi in `PhotoTracer.tsx`);
   - anche con questo punto, `SOLVEPNP_ITERATIVE` può ancora convergere
     alla soluzione "gemella" fisicamente impossibile (punti dietro la
     camera) per configurazioni quasi-planari: `estimateCameraPose` ora
     rileva questo caso (conta i punti con profondità negativa) e ritenta
     automaticamente con `SOLVEPNP_EPNP`, tenendo la soluzione fisicamente
     valida. Verificato su foto reale: senza il fix la geometria appariva
     fuori scala o non allineata; con il fix appare nella zona corretta
     della rampa.
4. **Layout shift durante il test automatizzato** (non un bug applicativo,
   ma un'insidia per chi scrive test Playwright su questa UI): i bottoni
   "1. Gradini / 2. Punto pavimento" compaiono solo dopo il secondo
   gradino tracciato, spostando la foto nella pagina. Un test che calcola
   le coordinate di click una sola volta a inizio script finisce per
   cliccare nel posto sbagliato a metà tracciamento — il bounding box va
   ricalcolato ad ogni click (vedi `tests/manual-browser-test.cjs`).

## Come testarlo tu stesso

Il dev server frontend gira su **http://localhost:5173** (avvialo con
`cd frontend && npm run dev` se non è già attivo). Apri l'app, carica una
foto di scala (anche una di quelle in `assets/reference/`, o una tua foto
di una scala **senza** montascale installato — quello è il caso d'uso
reale), poi:

1. Traccia bordo sinistro poi destro di almeno 2-3 gradini, dal basso
   verso l'alto (segui l'indicazione a schermo per sapere quale bordo
   cliccare ad ogni click).
2. Clicca "2. Punto pavimento" e clicca con precisione dove la faccia
   verticale del primo gradino tocca il pavimento — questo punto è
   **critico**: più è preciso, più la stima sarà affidabile (verificato:
   un click impreciso di qualche decina di pixel può far esplodere
   l'errore da ~10px a centinaia). Consiglio: zooma l'immagine del browser
   se il punto è piccolo/difficile da individuare.
3. Clicca "Genera anteprima 3D". Il messaggio sotto al bottone ti dice
   l'errore medio di riproiezione: sotto i 40px la stima è considerata
   affidabile; sopra, un avviso ⚠️ suggerisce di ritracciare.
4. Se la prospettiva non combacia bene, prova a regolare il campo "FOV
   orizzontale assunto" (default 65°, tipico di uno smartphone).

## Cosa NON è ancora fatto / rischi noti

1. **Nessuna API key Gemini configurata** — l'endpoint `/api/generate`
   risponde 501 finché non si imposta `GEMINI_API_KEY` in `backend/.env`
   (copiare da `.env.example`). Il prompt di fusione e il formato
   richiesta/risposta verso Gemini sono da verificare/adattare alla prima
   chiamata reale.
2. **Compositing finale foto+3D+maschera → invio a Gemini non ancora
   implementato** in frontend: oggi il viewer sovrappone il render 3D alla
   foto solo a schermo (canvas trasparente su `<img>`), manca la funzione
   che cattura lo screenshot compositato + genera la maschera di
   protezione prodotto da inviare al backend.
3. **Node.js locale è 18.19.1**, ma `@google/genai` richiede Node ≥20
   (warning in fase di install, funziona per ora ma va aggiornato Node
   prima di affidarsi alla chiamata Gemini in produzione).
4. **Precisione del punto pavimento.** È il singolo fattore che più
   influenza l'affidabilità della stima — un miglioramento futuro naturale
   è rendere l'assunzione meno rigida (es. permettere di cliccare un punto
   pavimento a distanza arbitraria invece che esattamente sotto il gradino
   0, stimando anche quella distanza) o aggiungere un secondo punto fuori
   piano per un fit più robusto/ridondante.
5. Diverse dimensioni non misurate restano stime placeholder — vedi
   commenti `NON misurato/misurata` in `dimensions.ts`.
6. Un solo modello (A) implementato; B/C/D, lato sinistro/destro, e i
   tratti curvi (partenza/arrivo con drop/90°/180°) non ancora gestiti.

## Test di regressione (`frontend/tests/`)

```bash
cd frontend
npx tsx tests/test-pnp-groundtruth.ts          # verità nota: proietta punti da una camera nota, verifica che la stima combaci
npx tsx tests/test-frustum-check.ts            # verifica che i punti stimati siano davanti alla camera (Three.js convention)
npx tsx tests/test-realphoto-floor-debug.ts    # grid-search del punto pavimento su foto reale, diagnosi errore di riproiezione
npx tsx tests/test-real-pose-render-check.ts   # verifica frustum/validità fisica della posa stimata (funzione reale dell'app)
node tests/manual-browser-test.cjs             # test end-to-end reale in Chromium: richiede il dev server frontend attivo su :5173
```

## Setup

```bash
# Frontend
cd frontend
npm install
npm run dev        # http://localhost:5173

# Backend
cd backend
npm install
cp .env.example .env   # poi inserire GEMINI_API_KEY quando disponibile
npm run dev         # http://localhost:3001
```

## Prossimi passi consigliati

1. Aggiornare Node a ≥20 nell'ambiente di sviluppo.
2. Test manuale in browser: caricare una delle foto in
   `assets/reference/`, tracciare i gradini, verificare visivamente se la
   posa camera stimata è plausibile — prima iterazione di debug su
   `lib/pnp.ts`.
3. Creare l'API key Gemini e testare `/api/generate` end-to-end con un
   caso semplice.
4. Implementare cattura screenshot canvas + generazione maschera in
   frontend, per chiudere il flusso completo foto→3D→AI→risultato.

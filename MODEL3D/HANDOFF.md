# MODEL3D · Passaggio di consegne

**Aggiornato:** 2026-10-18 · **Ultimo commit al momento della scrittura:** vedi `REGISTRO-SALVATAGGI.md` (radice del repository)
**Sito online:** https://davidvannini-cyber.github.io/code/MODEL3D/ (GitHub Pages, repository `davidvannini-cyber/code`)
**Stato:** funzionante e in uso su Mac (Chrome, online) e su iPad Pro 3ª generazione con Apple Pencil (Safari, icona sulla Home).

MODEL3D è un CAD 3D nel browser per preparare modelli da stampare in 3D: React + Three.js (react-three-fiber) + OpenCascade.js (kernel CAD in WebAssembly, in un Web Worker) + Zustand. Tutto gira sul dispositivo, senza backend.

---

## 1. Come lavorare con David (da leggere per prima)

- Parla italiano, vuole risposte brevi e passi chiari. È spesso sull'iPad o su telefono: spiegazioni semplici, un passo alla volta, niente gergo.
- All'avvio della sessione un hook (`.claude/hooks/consensi-avvio.sh`) chiede in ordine: progetto nuovo/esistente, cartella di lavoro, autorizzazione a pubblicare su `main`, promemoria `/restore`. In questa chat: progetto **MODEL3D**, cartella **radice**, sicurezza **SÌ**.
- Con "Sì" alla sicurezza: si pubblica su branch e su `main` **senza chiedere** (push fast-forward, mai force push), si aggiorna `REGISTRO-SALVATAGGI.md` (data, commit di partenza, file modificati, `git checkout <commit>`) e a fine lavoro si scrive **"Fai Sync"** (lo Sync porta le modifiche sul Mac).
- **Eccezione concordata:** quando David chiede di vedere uno screenshot o una bozza "prima di modificare", NON pubblicare su `main` finché non conferma. Si può salvare solo sul branch di lavoro (`claude/...`), perché lo Sync legge `main`.
- David preferisce vedere le alternative con **screenshot** prima di una modifica grafica (ha scelto così per menu, stile, pulsanti freccia).
- Dopo ogni risposta: promemoria "Ricorda: con /restore vedi gli ultimi 20 salvataggi…".
- Non dichiarare mai "fatto" senza verifica: tutto è stato provato con un browser vero (Playwright + Chromium) prima di pubblicare. Dire chiaramente cosa NON si può verificare (l'iPad reale).

## 2. Cosa fa l'app

**Strumenti (barra laterale a sinistra, a capsula):**
- **Primitive:** cubo, sfera, cilindro, cono, toro. Il nuovo oggetto viene selezionato e le sue misure compaiono subito.
- **Schizzo:** piano Top/Fronte/Destra, offset, snap a griglia, forme predefinite (quadrato, rettangolo, triangolo, cerchio, ellisse, poligono) o **mano libera**. Mano libera: si mettono i punti con Pencil o mouse, **doppio tocco/clic chiude** la forma (posiziona l'ultimo punto e si salda al primo), Esc o "Esci dallo schizzo" annulla.
- **Estrusione:** si sceglie la forma 2D e si estrude subito (altezza di partenza 20 mm); l'altezza si cambia dal campo (aggiornamento dal vivo, nessun pulsante Applica).
- **Raccordo/Smusso:** su uno **spigolo di un solido 3D** (le linee diventano selezionabili) o su un **vertice di una forma 2D**. Si applica subito; tipo (Raccordo/Smusso) e misura si cambiano dal vivo. Un solo spigolo alla volta ("Altro spigolo" per il successivo).
- **Booleane:** unione, sottrazione, intersezione tra due corpi (si scelgono in sequenza).
- **Affianca:** si sceglie la faccia piana dell'oggetto fermo (verde) e quella dell'oggetto che si sposta (arancione). L'oggetto 2 ruota finché le facce si oppongono (anche inclinate), poi **scorre in orizzontale** fino a toccare, **senza mai alzarsi o abbassarsi** (regola voluta da David), con "Allinea in orizzontale" opzionale. Sovrapposizione di **0,01 mm** (`MATE_OVERLAP`) perché una successiva unione fonda davvero i due solidi.
- **Corpi:** elenco degli oggetti.
- **Barra in alto:** Annulla, Ripeti, **Salva**, cartella (Progetto: salva/apri .3mf, esporta STL/STEP), sfondo chiaro/scuro. A destra "Pronto · salvato hh:mm · auto hh:mm".

**Selezione (regola concordata):** **1 clic = una faccia** (scheda "Faccia" con tipo, area, dimensioni X·Y·Z, centro, verso; se è la faccia creata da un raccordo/smusso mostra anche la misura; pulsante **Appoggia sul piano**). **Doppio clic/doppio tocco = tutto l'oggetto** (gizmo, barra spostamento/rotazione/scala/colore/elimina, scheda misure).

**Appoggia sul piano:** con una faccia piana selezionata, ruota l'oggetto con quella faccia in basso e lo porta a quota 0 (utile per la stampa). L'allineamento all'asse X NON è stato fatto: David lo ruota a mano.

**Misure:** ogni campo numerico ha **2 decimali** sempre (arrotonda a 2), frecce **+ sopra / − sotto** a passi di **1 mm** (scala: 0,1; i decimali si scrivono con la tastiera). Tenendo premuto la cifra cambia subito e il modello si ricostruisce ogni 220 ms, con il valore finale al rilascio. I campi si cancellano con backspace (nessun "0,1" forzato). Le modifiche si applicano dal vivo; non ci sono pulsanti "Applica".

**Menu:** le schede degli strumenti, la scheda **misure** (Parametri) e la scheda **Faccia** stanno in colonna a sinistra, attaccate alla barra laterale. In alto al centro c'è solo la barra dell'oggetto (spostamento/rotazione/scala/colore/elimina). Le schede Parametri valgono per primitive, estrusioni e anche per i risultati di raccordo/smusso (mostrano le misure del solido di partenza + del raccordo).

**Undo/Redo:** copre feature, posizioni/rotazioni/scala e colori (le modifiche ripetute alla stessa cosa entro 1 s contano come un passo).

**Salvataggio:**
- Pulsante **Salva** → file `progetto.3mf` (contiene mesh + JSON del progetto). Su tablet usa il menu di condivisione di iOS (Web Share, solo il file, **senza titolo** altrimenti iOS crea un .txt in più) e ricade sul download se Safari rifiuta il .3mf. Su Mac scarica in Download.
- **Copia automatica** nel `localStorage` del browser (1,5 s dopo ogni modifica e quando la pagina va in background). Al riavvio, se c'è una copia, compare l'avviso **Ripristina / Scarta**; la copia vecchia non viene sovrascritta finché non si sceglie. Non salva le forme 2D non ancora estruse.
- Limite: il Web non può sovrascrivere un file esistente né scrivere in "File" da solo (Safari non ha la File System Access API). Soluzione completa possibile solo con un'**app nativa** (vedi §8).

## 3. Aspetto e dispositivi

- **Stile "pillole flottanti"** su tutti i dispositivi: niente cornici (David odia le cornici pesanti), pannelli scuri sfumati (`backdrop-filter`), forme tonde, selezione con cerchio blu. Dimensioni **compatte** sul Mac; **icone e menu grandi** per i puntatori touch (`@media (pointer: coarse)`). Le schede delle misure mantengono la loro dimensione (il campo con le frecce è già grande su touch).
- Il tema si definisce con le variabili CSS in `:root` di `src/index.css`. Le dimensioni delle icone sono scritte **inline** da `<Icon size>`: per ingrandirle serve `!important` (già fatto nel blocco coarse).
- **iPad/Pencil:** la **Pencil** disegna, seleziona, trascina il gizmo ma **non ruota mai la vista**; le **dita** ruotano (1 dito) e zoomano/spostano (2 dita), anche durante lo schizzo (`PenGuard` in `Viewport.tsx`). In schizzo i punti li mettono solo penna o mouse, non le dita. Due **tasti tondi semitrasparenti** (solo touch): Annulla ed Esci (come Esc). Sui campi touch il font è 16 px (altrimenti Safari ingrandisce la pagina); tastierino decimale dove non servono negativi.
- Su tablet: risoluzione limitata (dpr ≤ 1,5), niente antialiasing né ombre, disegno solo su richiesta (`frameloop="demand"`) per evitare i blocchi di Safari. Sul Mac antialiasing/ombre restano.
- Meta tag per "Aggiungi a Home" (schermo intero, zoom bloccato) e icona `public/apple-touch-icon.png`.

## 4. Architettura e file

```
src/
├─ App.tsx                 Layout, Esc, autosave (debounce), RestoreBanner, QuickButtons
├─ store.ts                Zustand: feature, posizioni, colori, undo/redo, strumenti, salvataggio
├─ index.css               Tutto lo stile (variabili, stile pillole, blocco touch)
├─ occ/
│  ├─ occWorker.ts         Kernel OpenCascade nel worker: ricostruzione della storia, mesh, spigoli, esportazioni
│  ├─ occClient.ts         Ponte main thread ↔ worker (errori del worker respinti, niente stato "busy" infinito)
│  └─ types.ts             Feature (primitive, sketchExtrude, boolean, edgeFillet), BodyResult/LiveBody
├─ io/
│  ├─ threeMF.ts           Scrittura/lettura .3mf (JSON progetto in Metadata/model3d.json)
│  └─ autosave.ts          Copia nel localStorage (chiave model3d-autosave-v1)
├─ utils/
│  ├─ sketchShapes.ts      Punti delle forme predefinite
│  ├─ sketchCorners.ts     Raccordi/smussi di un contorno 2D (usato da worker e anteprima)
│  └─ faceMate.ts          Frame/informazioni di una faccia, Affianca, Appoggia sul piano
└─ components/
   ├─ Viewport.tsx         Canvas, selezioni, PenGuard, OrbitControls
   ├─ BodyGizmo.tsx        Gizmo ancorato al centro del bounding box (pivot separato)
   ├─ SceneMesh.tsx        Un corpo: mesh, spigoli selezionabili, facce evidenziate, doppio clic
   ├─ PendingShapesRenderer.tsx  Forme 2D in attesa + schizzo a mano libera
   ├─ FloatingDock.tsx     Colonna sinistra (schede) + barra dell'oggetto in alto
   ├─ Rail.tsx · TopBar.tsx · HistoryStrip.tsx · SelectionOverlay.tsx
   ├─ NumberInput.tsx      Campo numerico (2 decimali, frecce, ripetizione, tastiera)
   ├─ QuickButtons.tsx · RestoreBanner.tsx
   └─ cards/               Primitives, Sketch, Extrude, Fillet, Boolean, Mate, Bodies, IO, Params, Face
```

## 5. Dettagli tecnici da non dimenticare

- **Worker OCC e overload:** `construct()`/`call()` provano gli overload `Nome_1…_N` di embind; la cache (`ctorCache`, `methodCache`) è essenziale per le prestazioni (senza, il worker satura la CPU). Raccordi 2D: calcolati in 2D (`applySketchCorners`), NON con `BRepFilletAPI_MakeFillet2d` (fallisce nel WASM).
- **Raccordo/smusso 3D:** `edgeFillet` consuma il corpo di partenza (come una booleana). Lo spigolo è l'**indice** nella lista di spigoli unici (`uniqueEdges()`, deduplicati con `IsSame()` perché la build non ha `TopTools_IndexedMapOfShape`). `BRepFilletAPI_MakeFillet` vuole il profilo `ChFi3d_Rational`; `MakeChamfer` solo la forma. La faccia nuova si trova con `maker.Generated(edge)` → `treatmentFaces` nei corpi.
- **Errori:** un'operazione geometrica fallita su Safari appare come `ReferenceError: __cxa_is_pointer_type`; `friendlyError()` lo traduce ("operazione non riuscita, elimina la feature o premi Annulla"). La feature fallita resta nello Storico.
- **Booleane** costruiscono la geometria in coordinate del mondo (con le posizioni dei due operandi cotte dentro): l'origine del corpo risultante è lontana dalla geometria → per questo il gizmo usa il **centro del bounding box** (`BodyGizmo`, pivot separato che applica la variazione alla placement).
- **Posizioni (`placements`)** sono stato client, non feature: l'undo ne tiene lo snapshot insieme alle feature.
- **Doppio clic:** in `SceneMesh` il primo clic seleziona la faccia subito; un secondo clic entro 300 ms seleziona il corpo.
- **Rebuild frequenti:** `updateFeatureParams` usa `commit(...,key)` per raggruppare gli undo; un rebuild costa ~13-25 ms su Chromium (più lento su iPad).
- **`tsconfig.tsbuildinfo`** è tracciato ma cambia a ogni build: ripristinarlo con `git checkout` prima di committare per non sporcare.

## 6. Hosting (GitHub Pages) — importante

- Workflow: `.github/workflows/deploy-model3d.yml` (alla **radice** del repository, GitHub non legge quelli in sottocartelle). Parte a ogni push su `main` e a mano ("Run workflow").
- Il sito pubblicato è **tutto il repository** (come prima, quando Pages pubblicava il ramo) con la cartella `MODEL3D` sostituita dalla build (`MODEL3D/dist`). Pubblicare solo `dist` cancellerebbe le altre cartelle dal sito (è già successo e corretto).
- In **Settings → Pages → Source** deve esserci **GitHub Actions** (non "Deploy from a branch", altrimenti parte in parallelo il workflow standard e le pubblicazioni si scontrano).
- `dist/` è nel `.gitignore` (attenzione: nel `.gitignore` i commenti vanno su una riga a parte, un commento dopo il pattern lo rompe). `vite.config.ts`: `base` è `/` in sviluppo e `/code/MODEL3D/` solo in build.
- Dopo un push il sito si aggiorna in 1-2 minuti; sul Mac ricaricare con Cmd+Shift+R, su iPad usare un indirizzo con `?v=N` se la cache insiste.
- `RELAUNCH/` si pubblica da un altro repository (`RE-LAUNCH-MMNDS`): non c'entra.
- Il tuo ambiente cloud non raggiunge `github.io`: la verifica del sito online la fa David (screenshot).

## 7. Come testare (senza iPad)

- `cd MODEL3D && npm ci && npx vite --port 5170 --strictPort` poi Playwright con Chromium già installato (`/opt/pw-browsers`; modulo in `/opt/node-tools/node_modules/playwright`, lanciare con `args: ["--use-gl=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]`).
- Trucco per leggere/guidare lo stato: `await import("/src/store.ts")` dentro `page.evaluate` (in dev) dà accesso a `useEditorStore`.
- Per simulare l'iPad: contesto con `hasTouch: true, isMobile: true`, viewport 1366×1024; penna: `Input.dispatchMouseEvent` via CDP con `pointerType: "pen"`; dita: `Input.dispatchTouchEvent`.
- Non usare `pkill -f` (ha già ucciso la shell): fermare i server con `kill $(lsof -ti:PORTA)`.
- Selettori: attenzione a `text=...` che può prendere un titolo; usare locatori su `button`.

## 8. Limiti noti e idee in sospeso

- **Memoria su iPad (Safari/WebKit):** il motore da ~65 MB più operazioni pesanti possono far chiudere la scheda; già alleggerito il rendering. Un blocco dell'iPad è stato segnalato una volta dopo l'installazione (poi risolto con riavvio). Chrome su iPad usa lo stesso motore: nessun vantaggio.
- **Non verificabile qui:** menu di condivisione per il `.3mf` (Safari può rifiutare il tipo di file), tastiera con Pencil (se Scribble è attivo può mostrare la scrittura a mano invece della tastiera: si disattiva in Impostazioni → Apple Pencil), comportamento su iPad reale in generale.
- **App nativa per iPad** (prossimo passo scelto da David): wrapper (Capacitor o simile) per salvare direttamente in File con sovrascrittura e salvataggio automatico. Servono Mac con Xcode e account sviluppatore Apple (gratuito = app valida 7 giorni). Progetto da fare in una cartella nuova del repository con istruzioni passo-passo.
- Altre idee non fatte: installazione come app sul Mac (manifest PWA), uso offline (service worker), allineamento di un lato all'asse X, un solo spigolo alla volta nei raccordi 3D, scorciatoia per più spigoli.
- **Checklist di prova sull'iPad** (David la segue da solo): esportazione STL/STEP e apertura nello slicer; apertura di un `.3mf`; ripristino dopo un crash; booleane sottrazione/intersezione; spostamento/rotazione/scala con i campi; forme 2D predefinite e raccordi 2D; salvataggio sovrascritto con "Sostituisci".
- Funzioni dichiarate nel vecchio README (es. "no undo") sono superate: l'undo c'è.

## 9. Cronologia sintetica del lavoro (2026-10)

1. Worker: cache degli overload, raccordi 2D in 2D, robustezza (faceRanges, punti duplicati, errori propagati).
2. Avvio locale (`Avvia-MODEL3D.command`) e correzione di `base` Vite (sviluppo su `/`).
3. Scheda Parametri, doppio clic/clic, undo di posizioni e colori, Affianca, Appoggia sul piano, scheda Faccia, raccordo/smusso 3D con misura della faccia.
4. Campi numerici: cancellabili, 2 decimali, frecce, ripetizione, applicazione dal vivo (anche raccordo/estrusione).
5. Menu a sinistra, stile compatto, poi stile **pillole** (bozza D scelta da David) su tutti i dispositivi, icone/menu grandi su touch.
6. iPad/Pencil: PenGuard, tasti tondi, hosting su GitHub Pages, alleggerimento del rendering.
7. Salvataggio: pulsante Salva, condivisione iOS, copia automatica con ripristino.

Il dettaglio commit per commit con i comandi per tornare indietro è in `REGISTRO-SALVATAGGI.md` (radice). Per tornare a una versione: skill `/restore`.

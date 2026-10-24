# NeonPlan 3D – Appunti e guida (Home Assistant)

Versione in uso: NeonPlan 3D v1.25.1.
Nomi dei pulsanti presi dal manuale inglese: nella tua interfaccia italiana possono essere leggermente diversi.

---

## 1. Vista iniziale della casa sballata (troppo in basso e troppo vicina)

### Cosa è emerso
- Nell'editor di NeonPlan 3D la vista è corretta; nella plancia pubblicata (card, pannello laterale e anteprima) la casa si apre troppo in basso e troppo vicina.
- Succede su tutti i dispositivi, anche rifacendo la plancia da zero.
- Nella scheda **3D**, passando il mouse sulle puntine, il fumetto dice **"Vista iniziale: Predefinita"**: quindi non risulta nessuna vista salvata.
- La YAML della card non contiene opzioni di camera, quindi non è lei a sovrascrivere nulla.

### Come si salva la vista iniziale della casa intera
1. Apri la scheda **3D** (in alto, accanto a **Editor**).
2. Seleziona **Tutti i piani** (barra in alto nella vista 3D).
3. Allontana, ruota e **sposta** la casa finché l'inquadratura è quella voluta. Per spostare: tasto destro o centrale del mouse, oppure due dita sul tablet.
4. Clicca la **puntina rossa 📌** (quella senza la X). **📌✕** azzera la vista.
5. Ricontrolla il fumetto sulla puntina: non dovrebbe più dire "Predefinita".
6. Ricarica la plancia con **Ctrl+Shift+R**.

Dalla v1.12.6 la vista iniziale salva anche il punto verso cui guarda la camera (non solo angolo e zoom): una vista salvata con una versione più vecchia va rifatta.

Esistono anche viste iniziali **per singolo piano** ("Impostazioni del piano → Vista come iniziale di questo piano") e **per singola stanza** ("Vista come iniziale di questa stanza"): non sono quelle della casa intera.

### Soluzione alternativa solo per la card: `start_view` nello YAML
1. Modifica la plancia (⋮ → Modifica plancia).
2. Clicca sulla card NeonPlan 3D → apri l'**editor di codice**.
3. Aggiungi una riga in fondo, senza spazi iniziali:

```yaml
type: custom:neonplan3d-card
height: 700
marker_size: small
heatmap: temperature
flows: true
start_view: { theta: 0.8, phi: 1.0, radius: 35 }
```

4. Salva, esci dalla modifica e ricarica con Ctrl+Shift+R.

Note:
- I valori `theta`, `phi`, `radius` sono l'esempio del manuale (radius 20): ho messo 35 per allontanare la vista. Vanno regolati a tentativi (`radius` più alto = più lontano; `phi` = inclinazione). Non ho verificato come reagiscono.
- Il manuale dice che la riga giusta si vede nell'editor visuale della card, sotto **Start view**.
- Vale solo per la card, non per il pannello laterale.

### Se il problema resta: segnalazione su GitHub
Pagina: https://github.com/Mastershort/neonplan3d/issues (New issue)

```
Title: Start view for the whole house is not saved ("Vista iniziale: Predefinita" after pressing the red pin)

Version: NeonPlan 3D 1.25.1, Home Assistant [la tua versione]

In the 3D tab, with "All floors" selected, I turn/zoom/move the house and press the red pin (remember current 3D view as start). The tooltip still shows "Start view: Default" and the card, the sidebar panel and the 3D preview open with a camera that is too low and too close. Tried about 20 times, also after recreating the dashboard, on PC, phone and tablet, and with the pin on every floor.

Expected: the saved view is used when opening the house.
Card YAML: type: custom:neonplan3d-card, height: 700, marker_size: small, heatmap: temperature, flows: true (no start_view).
```

---

## 2. Aggiungere altoparlanti (Echo) nella casa 3D

Dall'**Editor**, con la barra laterale destra aperta (freccia **‹** in alto a destra) e una stanza selezionata:

**Dal dispositivo**
1. Clicca dentro la stanza, in un punto libero.
2. Nella sezione **Dispositivi** cerca il media player (es. `media_player.camera_echo_show_5_2`).
3. Premi **Posiziona**.
4. Selezionalo e usa **Mostra come mobile** per sostituire la puntina con un modello di altoparlante o smart display.

**Dalla libreria mobili**
1. Premi **Mobili**, cerca "speaker"/"altoparlante" (sezione TV e audio).
2. Clicca la stanza e scegli il modello.
3. Collega il dispositivo nel modulo a destra ("Automatico" lo cerca nell'area).

Se il dispositivo non compare nell'elenco:
- la stanza deve avere un'**Area** collegata e l'Echo deve appartenere a quella area in Home Assistant;
- in alternativa cambia la sorgente da **Quest'area** ad **Altre aree** o **Nessuna area**.

Se è posizionato ma non si vede: controlla **Indicatore in 3D** (non deve essere "Nascondi", meglio "Mostra sempre") e che nella vista 3D l'interruttore dei marcatori sia su **Tutti**.

Gli effetti "altoparlante che pulsa a tempo di musica" e le schede "in riproduzione" fanno parte dell'estensione a pagamento Sound & Cinema.

---

## 3. Slider del volume

Cliccando l'Echo in 3D si apre la finestra standard di Home Assistant (con slider, play e power). Uno slider del volume sempre visibile, come lo swipe della luminosità delle luci, **non risulta nel manuale**.

### Opzione A: card di Home Assistant accanto alla card NeonPlan
Una card *tile* sul media player con la funzione **Slider del volume** (dal menu **Funzioni** dell'editor visuale). Non verificato nella tua versione di Home Assistant.

### Opzione B: pulsante nel menu a stella della vista 3D (popup con `browser_mod`)
1. Installa **Browser Mod** da HACS, riavvia Home Assistant, aggiungi l'integrazione e registra il browser (segui la documentazione del progetto).
2. In NeonPlan 3D: **Editor → Impostazioni → Preferiti → Pulsanti propri**: aggiungine uno.
3. Imposta etichetta (es. "Volumi") e icona.
4. Azione: **fire-dom-event**.
5. Dati (esempio scritto da me, non verificato):

```json
{"browser_mod": {"service": "browser_mod.popup", "data": {"title": "Volumi", "content": {"type": "tile", "entity": "media_player.camera_echo_show_5_2", "name": "Echo Show 5", "features": [{"type": "media-player-volume-slider"}]}}}}
```

6. Salva. Nella scheda **3D** clicca la **stella** sopra la lente: sotto i preferiti trovi il pulsante.

### Opzione C: richiesta di funzione
https://github.com/Mastershort/neonplan3d/discussions/categories/ideas – chiedere lo slider del volume (swipe) sui media player; si vota con 👍.

### Il tuo selettore di uscita audio
Un pulsante proprio può anche chiamare un servizio:
- Servizio: `script.audio_seleziona`
- Dati: `{"uscita": "media_player.camera_echo_show_5_2"}`

Il codice `card_mod` (bordo verde) della tua tile non si può usare in NeonPlan: lì si lavora con entità e pulsanti.

---

## Fonti
- Manuale NeonPlan 3D, cap. 4 (editor): https://mastershort.de/en/neonplan3d/manual/editor/
- Manuale NeonPlan 3D, cap. 5 (vista 3D): https://mastershort.de/en/neonplan3d/manual/3d-view/
- Release v1.12.6: https://github.com/Mastershort/neonplan3d/releases/tag/v1.12.6
- Repository: https://github.com/Mastershort/neonplan3d

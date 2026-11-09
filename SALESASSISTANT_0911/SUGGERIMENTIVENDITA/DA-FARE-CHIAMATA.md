# Suggerimenti Vendita — cosa resta da fare per finire la chiamata

Aggiornato: 22 ottobre 2026.
Questo file riguarda **solo la chiamata dal Sales Assistant** (pannello «Suggerimenti Live»,
tasto Termina, telefono Android, note e misure). Il problema dei backup dei lead è un altro lavoro
e **non** è qui.

Come leggerlo: ✅ = fatto e provato · 🟡 = fatto ma NON provato sul tuo Mac/telefono · ⬜ = da fare.

---

## 1. A che punto siamo

### Già fatto e pubblicato (sul sito/repository: `main`)

| Cosa | Stato |
|---|---|
| Guida chiamata: una frase alla volta, tutte le frasi visibili, frase in corso evidenziata, barra di avanzamento, tasti ◀ ▶ uguali | ✅ provato in un browser di prova · 🟡 non con una chiamata vera |
| Dettagli scala (8 tasti): lunghezza, interno/esterno, larghezza minima, n° rampe, curve 90°, curve 180°, partenza, arrivo, con popup | ✅ provato in un browser di prova |
| Layout compatto, grafica «Stile 1 blu» con icone, valori compilati in verde | ✅ provato in un browser di prova |
| Tasto «Note» (linguetta gialla sul bordo destro, apre e chiude, tasto N) e finestra Note a forma di post-it | 🟡 la posizione vera della finestra sul tuo schermo non l'ho vista |
| Misure e note → campo «Note YM:» dello Storico (lead già in Storico, trovato dal telefono) | ✅ provato con una Console di prova |
| Chiamata senza lead («Chiamata YesMobility», «Rinforzo Facile Salire») → alla fine si apre «Nuovo» con le note in attesa; scheda in compilazione salvata in Storico con avviso | ✅ provato con una Console di prova |
| Pannello chiamata aperto sempre nel profilo Chrome `Profile 1` (quello con l'estensione) | 🟡 non provato sul tuo Mac |
| **Termina**: ferma ascolto, manda lo stato finale alla Console, e (se la chiamata è partita dal pannello) manda il comando «termina» al telefono | ✅ comando e popup provati in un browser di prova · 🟡 non sul telefono |
| Popup dopo Termina: «Chiudi scheda chiamata» / «Rimani in scheda chiamata» | ✅ provato in un browser di prova |
| La X della finestra equivale a Termina (con avviso se ci sono dati) | 🟡 non provato in Chrome vero |
| **App Android «Rubrica YesMobility» versione 1.5**: comando «termina chiamata» (usa il permesso «Rispondi alle chiamate») | ✅ **costruita con successo da GitHub** (esecuzione n. 15, 22/10/2026) · ⬜ **non ancora installata sul telefono** |

### Dove sta l'APK
Release GitHub **`rubrica-android`**, file **`RubricaYesMobility.apk`**:
`https://github.com/davidvannini-cyber/code/releases/tag/rubrica-android`

---

## 2. Cosa resta da fare (in ordine)

### A. Installare l'app Android 1.5 sul telefono ⬜
1. Dal telefono apri il link della release qui sopra e scarica `RubricaYesMobility.apk`.
2. Installalo sopra la versione precedente (stessa chiave: si aggiorna senza disinstallare).
3. Apri l'app e premi **«2. Concedi i permessi»**. Ora deve chiedere anche **«Rispondi alle chiamate»**: consenti.
4. Controlla che la scritta in alto dica **Versione 1.5** e che l'ascolto sia attivo (codice impostato).

### B. Prova vera di «Termina» con Lyber ⬜ (il punto più incerto)
L'app chiude la chiamata con la funzione di Android `endCall()`. **Non sappiamo se funziona con le chiamate fatte da Lyber**: dipende da come Lyber chiama (chiamata normale del telefono: sì; chiamata interna di Lyber: forse no).
Prova:
1. Dal pannello premi «Invia a telefono» → **Salva e chiama** (parte la chiamata con Lyber).
2. Lascia squillare o rispondi (con un numero tuo, non un cliente).
3. Premi **Termina** nel pannello.
4. Guarda: la chiamata sul telefono si chiude entro 1-2 secondi?
5. Sul telefono, nell'app Rubrica, nel registro («Ultimi lead») compare una riga:
   - «Chiamata terminata dal Mac» → ha funzionato;
   - «nessuna chiamata da chiudere (o non chiudibile da qui)» → Lyber non è chiudibile così;
   - «permesso … mancante» → manca il permesso del punto A.3;
   - «Comando «termina» scaduto» → il messaggio è arrivato con più di 30 secondi di ritardo.

**Se non funziona con Lyber (piano B, da decidere con te):**
- B1. Far chiudere la chiamata con un altro metodo (per esempio un servizio di accessibilità o un'automazione tipo Tasker). Più invasivo: serve un permesso speciale sul telefono.
- B2. Lasciare Termina solo sul pannello (ferma ascolto e suggerimenti) e chiudere la chiamata a mano sul telefono. Il popup «Chiudi/Rimani» resta.
- B3. Provare a chiamare **senza Lyber**, con la chiamata normale del telefono, che `endCall()` chiude di sicuro (si perde però quello che Lyber aggiunge).

### C. Provare sul tuo Mac le cose non ancora viste in Chrome vero 🟡
Dopo **Sync**, **Cmd+Q** all'app Suggerimenti Vendita e riapertura:

- [ ] **Profilo:** il pannello si apre con nome, telefono e guida del lead (se no, vedi «Se qualcosa non va» sotto).
- [ ] **Finestra Note:** il tasto giallo (o il tasto N) la apre **a destra del pannello, all'altezza della guida**; un secondo clic la chiude; il testo scritto resta.
- [ ] **Misure:** cliccando un tasto si apre il popup giusto (◀ ▶ con passi 0,5 / 0,05 / 1; scelte per interno-esterno, partenza, arrivo).
- [ ] **Lead già in Storico:** dopo una misura e una nota, nel lead in Storico, **«Note YM:»** contiene le righe (es. `Lunghezza: 6,5 m`, `Note chiamata: …`).
- [ ] **Chiamata senza lead** («Chiamata YesMobility» o «Rinforzo Facile Salire»): alla fine (Termina, chiusura delle Note o X) la Console si apre su **«Nuovo»** con il banner; dopo «Salva lead in storico» le righe sono in «Note YM:» del nuovo lead. Se c'era una scheda in compilazione, è stata salvata prima in Storico con un avviso.
- [ ] **Chiusura con la X** della finestra del pannello: equivale a Termina; con dati da salvare Chrome chiede conferma prima.
- [ ] **Popup dopo Termina:** «Chiudi scheda chiamata» chiude la finestra (se Chrome non lo permette, resta il messaggio per chiuderla a mano); «Rimani in scheda chiamata» la lascia aperta.
- [ ] **Guida:** con lo script di un lead vero (da Lead Rework Console) le frasi sono spezzate bene, i «(Attendi conferma.)» tra parentesi diventano il segno STOP.

### D. Cose che possono ancora servire
- [ ] **Messaggi più vecchi di 30 secondi** vengono ignorati dall'app Android: se il telefono era senza rete, il «termina» può essere scartato.
- [ ] **Telefono e Mac su reti diverse:** il comando passa da internet (servizio ntfy.sh), non serve la stessa rete, ma serve connessione su entrambi.
- [ ] **Più chiamate in sequenza:** controllare che dopo una chiamata terminata il pannello se ne possa aprire un'altra senza residui (note vecchie, misure vecchie).

---

## 3. Decisioni ancora aperte
1. Se **B** (Lyber) non funziona: scegliere fra B1, B2, B3.
2. Il popup dopo Termina deve comparire **sempre**, anche se non c'era una chiamata sul telefono? (Ora sì.)
3. Se il telefono **non risponde** al comando «termina»: vuoi un avviso nel pannello? (Ora il pannello dice solo «Comando di chiusura inviato al telefono».)

---

## 4. Se qualcosa non va

| Sintomo | Cosa controllare |
|---|---|
| Pannello senza nome, telefono e guida del lead | Il pannello si è aperto in un altro profilo di Chrome. Controlla `PROFILO_CHROME="Profile 1"` nei file `avvia` e `avvia_sistema.command` (e in `LEADREWORKS/apri-console.command`) |
| «Termina» non chiude la chiamata sul telefono | Vedi punto B: guarda il registro dell'app Rubrica sul telefono |
| La finestra Note si apre nel posto sbagliato | Mandami uno screenshot: sposto la formula di posizione |
| Le note non arrivano in «Note YM:» | Controlla che il servizio dati sia acceso (led verdi nella Console) e che la Console sia aperta durante la chiamata |
| Il pannello non si chiude | Chrome blocca `window.close()` su alcune finestre: chiudila a mano, il resto funziona |

---

## 5. Dove sta il codice (per chi riprende il lavoro)
- Pannello: `SALESASSISTANT/SUGGERIMENTIVENDITA/overlay/index.html` (+ `overlay/note.html`); copia nel bundle `Suggerimenti Vendita.app/Contents/Resources/progetto/overlay/`.
- Server del pannello (ponte verso la Console): `server/server_suggerimenti.py` (`/api/chiamata`).
- Console (riceve misure e note): `SALESASSISTANT/LEADREWORKS/src/lead-rework-console.html` (blocco «MISURE E NOTE DALLA CHIAMATA»).
- App Android: `SALESASSISTANT/RUBRICA-ANDROID/` (`NtfyService.kt`: `terminaChiamata`; `MainActivity.kt`; manifest). La compila GitHub a ogni modifica di quella cartella.
- Dettagli tecnici e storia: `SUGGERIMENTIVENDITA/HANDOFF.md` e `LEADREWORKS/docs/HANDOFF.md`.

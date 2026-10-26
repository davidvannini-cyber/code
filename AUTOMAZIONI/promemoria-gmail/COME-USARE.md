# Promemoria via Gmail — come si usa

Serve a far inviare email programmate (promemoria) **senza che nessuna conversazione di Claude resti aperta**: lavora dentro l'account Google di David (`davan1972@gmail.com`, quello collegato a Gmail in Claude), anche a computer spento.

## Come funziona (per David)
1. Chiedi a Claude: «mandami un promemoria ogni giorno alle 17:00 a …» (o «il 5 novembre alle 9»).
2. Claude crea in Gmail una **bozza** con l'oggetto `[PROM quando] Titolo`, il destinatario e il testo.
3. Lo script (installato una volta, vedi sotto) controlla le Bozze **ogni 5 minuti** e, all'ora giusta, invia l'email.
4. Per **fermare** un promemoria: cancella la bozza da Gmail (o chiedilo a Claude).

Scritture riconosciute nell'oggetto della bozza (senza accenti obbligatori, ora italiana):
- `[PROM ogni giorno 17:00] Titolo`
- `[PROM ogni lunedi 09:30] Titolo` (martedi, mercoledi, giovedi, venerdi, sabato, domenica)
- `[PROM il 2026-11-05 17:00] Titolo` — una volta sola; dopo l'invio la bozza si cancella.
Il **Titolo** (dopo le parentesi quadre) diventa l'oggetto dell'email; destinatario e testo sono quelli della bozza. **Non inviare a mano la bozza.**

## Installazione (una volta sola, circa 5 minuti)
1. Apri `https://script.google.com` con l'account **davan1972@gmail.com** e premi **Nuovo progetto**.
2. Cancella il codice di esempio e **incolla tutto il contenuto di `promemoria.gs`** (stessa cartella di questo file).
3. In alto rinomina il progetto «Promemoria» e premi il dischetto (**Salva**).
4. Nel menu a tendina delle funzioni (in alto) scegli **`configura`** e premi **Esegui**.
5. Google chiede i permessi: **Esamina le autorizzazioni** → scegli l'account → **Avanzate** → **Vai a Promemoria (non sicuro)** → **Consenti**. (L'avviso «non sicuro» compare perché è uno script tuo, non pubblicato da Google. Il codice legge solo le Bozze e invia email; lo puoi leggere nel file.)
6. Scegli la funzione **`prova`** e premi **Esegui**: in basso, nel **Registro esecuzione**, devi leggere «Bozze con promemoria trovate: N».

## Per Claude (sessioni future)
- Per creare un promemoria: `create_draft` con `to`, `subject` = `[PROM quando] Titolo`, testo semplice, link inclusi. **Non** usare `send_message` (invia subito).
- Per cambiarlo/fermarlo: modificare/cancellare la bozza (strumenti Gmail `update_draft` / `delete_draft`).
- Non c'è altro modo affidabile qui: le «routine» create dalle sessioni **non portano il collegamento a Gmail** (verificato il 26/10/2026 con un avviso di `create_trigger`).
- Limiti Google (account gratuito): circa 100 destinatari al giorno via script; lo script è eseguito ogni 5 minuti, quindi l'email può arrivare con qualche minuto di ritardo.
- Test del codice (senza Google): `node` con le funzioni `leggiQuando` ed `eDaInviare` esportate in fondo a `promemoria.gs`.
- Provato il 26/10/2026: la bozza `[PROM il … ]` è stata inviata con 3 minuti di ritardo e cancellata. Con destinatario iCloud (`me.com`) la email può finire in una **cartella diversa dalla posta in arrivo**: se «non arriva», chiedere a David di cercarla in «Tutte le caselle». Gmail non segnala errori in questo caso (la email risulta in «Inviata»).
- Il promemoria giornaliero delle 17:00 per TV-PLAYER è la bozza `[PROM ogni giorno 17:00] Promemoria: TV-PLAYER (momandis)`; l'evento Google Calendar equivalente è stato eliminato per evitare doppioni.

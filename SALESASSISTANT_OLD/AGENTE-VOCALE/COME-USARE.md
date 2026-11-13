# Agente vocale di richiamo lead — come si usa

Specifica completa: `SPECIFICA.md`. Questa guida è la parte pratica, passo passo.
Stato al 9 novembre 2026: **costruito e provato con motore e telefono finti; nulla ancora provato con telefono, cavo, cuffie e account veri** (vedi «Cosa è provato»).

## Come funziona, in breve
1. In Lead Rework, nella finestra «Vedi» di un lead, premi **AI** (a destra di SUGG) e scegli il tipo di lead.
2. L'orchestratore (programma sul Mac) manda al telefono l'ordine «chiama» (stesso canale ntfy del tasto TEL). L'app Rubrica apre **Lyber** e compone.
3. L'audio del telefono arriva al Mac dal cavo jack. Quando il cliente risponde, parte l'assistente virtuale (ElevenLabs).
4. Se il lead è caldo l'assistente dice «un attimo, la passo a un collega» e in basso nella Console compare **«Il cliente aspetta: rispondi!»** con **Ci sono / Non posso** (anche una notifica del Mac).
   - **Ci sono**: il Mac chiude l'assistente e collega il cavo alle tue cuffie Bluetooth. Parli tu. Per finire premi **Chiudi chiamata**.
   - **Non posso** o nessuna risposta in 20 secondi: l'assistente propone un richiamo e scrive il report.
5. A fine chiamata l'esito si scrive nel lead: elenco `chiamate_ai` e una riga in **Note YM**.

Regole dell'assistente (nel prompt, `orchestratore/prompt.py`): si dichiara assistente virtuale, mai cifre/sconti, frasi corte, una domanda per volta, massimo 8 minuti, squillo massimo 35 secondi.

## Installazione sul Mac (una volta)
1. «Sync» come al solito.
2. Doppio clic su **`Agente Vocale - Installa.command`** (se macOS lo blocca: tasto destro → Apri). Crea l'ambiente Python e il file `orchestratore/config.local.json` (resta solo sul tuo Mac, non va su GitHub).
3. Apri `config.local.json` e scrivi:
   - `"audio_attivo": true`
   - `"audio": {"telefono": "…", "cuffie": "…"}`: un pezzo del nome del dispositivo del cavo (es. «USB Audio») e delle cuffie Bluetooth. Per vedere i nomi: in Terminale `cd` nella cartella `orchestratore` e `./.venv/bin/python3 prova_audio.py dispositivi`.
   - `"motore": "elevenlabs"` (dopo la Fase 0; all'inizio lascia `"simulato"` per provare i pulsanti senza voce vera).
4. **Telefono**: installare la nuova versione dell'app Rubrica (1.6, vedi sotto) e dare il nuovo permesso «Stato del telefono» (pulsante 2).
5. **ElevenLabs** (solo per il motore vero): crea un agente in italiano con una voce italiana; in «Security» attiva gli override di prompt e primo messaggio; aggiungi 5 strumenti di tipo **client** con questi nomi esatti: `score_lead` (score numero, reasons lista), `request_handoff` (reason, summary), `book_appointment` (datetime_local, type, notes), `create_callback` (datetime_local, who), `end_call` (outcome). Metti `agent_id` in `config.local.json`. La chiave API **non** va nei file: in Terminale `export ELEVENLABS_API_KEY=…` oppure nel file `~/.zprofile`.

## Uso quotidiano
1. Doppio clic su **`Agente Vocale.command`** e lascia la finestra aperta. Si apre il cruscotto (stato, conversazione, pulsanti di emergenza).
2. La prima volta che premi AI nella Console chiede il **codice**: è la riga «Codice per la Console» scritta all'avvio. Lo ricorda.
3. Cuffie Bluetooth collegate al Mac, telefono col cavo, app Rubrica in ascolto.

## App Android 1.6 (cosa cambia)
Oltre a quanto già faceva, racconta al Mac cosa succede (`ricevuto`, `lyber_aperta`, `non_partita`, `linea_occupata`, `libera`) su un secondo canale ntfy (`<codice>-stato`). L'APK si costruisce da GitHub (workflow «Compila app Rubrica YesMobility»): serve che la compilazione riesca. **Non ho potuto compilarla qui (niente Android SDK).**

## Se qualcosa non va
| Sintomo | Cosa fare |
|---|---|
| «Non trovo l'agente AI sul Mac» | `Agente Vocale.command` non è aperto |
| Il telefono non chiama | stesse verifiche del tasto TEL (app in ascolto, «Mostra sopra altre app») |
| Il Mac non sa se ha risposto | pulsante **Ha risposto (a mano)** nella striscia; poi vedi T4 in `PROVE-FASE-0.md` |
| Segreteria | pulsante **Segreteria** (riaggancia, nessun messaggio) |
| Qualsiasi dubbio | **Termina**: chiude AI e telefono |

## Cosa è provato
| Cosa | Stato |
|---|---|
| Stati della chiamata, timeout, passaggio sì/no/scaduto, esito, una chiamata alla volta, codice di sicurezza (22 prove automatiche, `python3 -I orchestratore/test_orchestratore.py`) | ✅ con motore e telefono finti |
| Pulsante AI → striscia → Ci sono → esito in «Note YM» nella Console vera | ✅ in Chromium con orchestratore finto (`orchestratore/prove/`) |
| Rilevatore «ha risposto» (tono di libero ≠ voce) | ✅ su segnali sintetici · 🟡 non su linee vere |
| Commutazione audio AI → cuffie | ✅ nella logica · 🟡 con audio vero (T3) |
| Motore ElevenLabs | 🟡 solo i nomi dell'API controllati sulla libreria; mai eseguito con account |
| App Android 1.6 | 🟡 non compilata e non provata |
| Jack, Lyber, eco, qualità italiano, costi | 🟡 tutto da Fase 0 |

## Limiti noti (decisioni prese o da prendere)
- **Retell** non è ancora collegato: la specifica lo cita accanto a ElevenLabs, ma non ha un modo semplice di parlare con l'audio di un Mac. Si decide dopo T5.
- «Obiezione», «concorrente», «chi decide» nell'esito restano vuoti: servirebbe l'analisi post-chiamata con un modello leggero (Fase 2 della specifica, non fatta).
- Lo scheduler (orari, massimo 3–4 tentativi, coda) non c'è: oggi ogni chiamata parte quando premi AI (Fase 3).
- Il tipo di lead (a/b/c) è proposto dai dati del lead e confermato da te.

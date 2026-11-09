# SALES ASSISTANT – Modulo "Agente vocale di richiamo lead"

Documento di specifica per iniziare a lavorare. Versione 1.0 – 9 novembre 2026.
Autore: David Vannini (decisioni) · stesura con Claude.
Ambito: ascensori e montascale (YesMobility). **Privacy/GDPR esclusa**: i contatti arrivano già filtrati dal gruppo.

---

## 0. Come usare questo file

- Le sezioni 1–3 spiegano **cosa** si costruisce e **perché**.
- Le sezioni 4–9 sono la **specifica tecnica** (componenti, dati, prompt, audio, passaggio).
- La sezione 10 è il **piano di lavoro** con i test da fare per primi.
- Le sezioni 11–13 contengono costi, KPI e punti ancora incerti.
- Legenda affidabilità: **[DECISO]** deciso da David · **[FONTE]** dato da fonte pubblica (da riverificare) · **[IPOTESI]** stima/ragionamento non verificato · **[DA PROVARE]** va testato col tuo hardware.

---

## 1. Obiettivo

Un agente vocale AI che richiama i lead già lavorati, con tre scopi:
1. **Recuperare** il lead (farlo parlare).
2. **Fissare un appuntamento** (sopralluogo o richiamo del responsabile).
3. **Passare la chiamata in diretta al responsabile (David)** quando il potenziale è alto.
Se non riesce a passare la chiamata, produce un **report** strutturato.

Tipi di lead [DECISO]:
- **a)** nuovi che non hanno risposto alla chiamata;
- **b)** visitati (sopralluogo fatto) ma senza contratto firmato;
- **c)** arrivati da Facebook o Google.

Volumi [DECISO]: 200 lead/mese; oggi 30 appuntamenti ogni 100 lead (dato non storico affidabile: vedi §12). Vendite da 2.000 a 30.000 € (non rilevante per i costi).

Perché ha senso provarlo: il costo diretto è basso (circa 65–110 €/mese). Il rischio non è la spesa, è **quanti appuntamenti fissa l'agente** con un pubblico in buona parte anziano. In Italia non esiste un benchmark affidabile: lo misura il pilota (§12).

---

## 2. Decisioni prese [DECISO]

| # | Decisione |
|---|-----------|
| D1 | Una **chiamata alla volta** (basta per ~600 tentativi/mese). |
| D2 | **Nessun numero italiano nuovo per ora**: si chiama dal numero **Lyber** già noto ai lead. Il numero italiano nuovo resta un passo successivo (§9). |
| D3 | Il **telefono Android è collegato al PC solo e sempre via jack audio** (cavo). Le cuffie Bluetooth di David sono collegate **al PC**, non al telefono. |
| D4 | L'**app Android** (già esistente, da estendere) riceve l'ordine di chiamata e compone il numero su Lyber. |
| D5 | L'**AI gira sul PC**: ascolta e parla attraverso l'audio del jack. |
| D6 | **Passaggio al responsabile via PC**: il PC sposta l'audio dal jack alla cuffia Bluetooth e chiude la sessione AI; la chiamata col cliente resta aperta. |
| D7 | Piattaforma voce: **Retell AI** o **ElevenLabs Agents**, da scegliere dopo una prova comparativa (20 chiamate ciascuna). |
| D8 | L'agente **si dichiara assistente virtuale di YesMobility** (non dice "sono David"). |
| D9 | La **scheda del lead rework** (analisi, note, copione) è già il contesto e il prompt: non si ricostruiscono scoring e copioni da zero. |
| D10 | Prima di costruire si fanno i **test tecnici** (§10, fase 0). Poi **pilota** con gruppo di controllo (§12). |

---

## 3. Flusso di lavoro (workflow)

```
[1] LEAD REWORK                [2] APP ANDROID            [3] PC (orchestratore + AI)
 David seleziona il lead  ──►  riceve ordine di     ──►   avvia sessione AI con scheda+copione
 e preme "Chiama con AI"       chiamata, compone il        │
 (scheda + copione + id)       numero su Lyber             │ audio: jack ⇄ PC ⇄ AI
        ▲                       │ (telefono ⇄ jack ⇄ PC)    ▼
        │                       └─ stato chiamata ───────► [4] ESITO
        │                          (squilla/risposto/        a) non risponde → notifica a David
        │                           terminata)               b) risponde → AI conduce la conversazione
        │                                                    c) lead caldo → richiesta di passaggio:
        └──────────── esito + report scritto nella scheda ◄─    notifica a David → "Ci sono" →
                                                                PC collega jack ⇄ cuffie BT, chiude AI
                                                             d) altrimenti → report + prossima azione
```

### 3.1 Stati di una chiamata (macchina a stati, tutti nel PC)

`QUEUED → DIALING → RINGING → ANSWERED → AI_TALKING → (HANDOFF_REQUESTED → HANDOFF_WAITING → HUMAN_TALKING) → ENDED`

Stati terminali con esito:
- `NO_ANSWER` (nessuna risposta o rifiuto) → notifica a David, lead rimesso in coda secondo cadenza.
- `VOICEMAIL` (segreteria) → riaggancia, nessun messaggio (o messaggio breve, vedi §7.5).
- `COMPLETED_APPOINTMENT` · `COMPLETED_HANDOFF` · `COMPLETED_CALLBACK` · `COMPLETED_NOT_INTERESTED` · `COMPLETED_NO_DECISION`.
- `FAILED_TECH` (audio, rete, app) → notifica a David, nessun conteggio come tentativo.

Timeout di sicurezza: chiamata massima **8 minuti**; squillo massimo **35 s**; attesa conferma passaggio **20 s**.

---

## 4. Architettura

### 4.1 Componenti

1. **Lead rework (esistente)** – genera scheda, analisi/strategia, note, copione. Aggiunge: pulsante "Chiama con AI", ricezione dell'esito, aggiornamento stato lead.
2. **Orchestratore sul PC (nuovo)** – servizio locale (consigliato: Python + FastAPI, avviato come servizio). Compiti:
   - riceve i job dal lead rework;
   - comanda l'app Android (compone/riaggancia);
   - avvia e chiude la sessione AI;
   - gestisce l'audio (routing jack ⇄ AI ⇄ cuffie);
   - gestisce notifiche, timeout, stati, log;
   - invia l'esito al lead rework.
3. **App Android (esistente, da estendere)** – riceve il comando di chiamata, compone su Lyber, riaggancia, **riporta lo stato** al PC.
4. **Piattaforma voce AI** (Retell o ElevenLabs) – riconoscimento vocale, modello, sintesi vocale, gestione turni di parola e interruzioni; strumenti (tool) richiamabili durante la chiamata.
5. **Layer audio sul PC** – mixer virtuale per collegare: ingresso/uscita del jack (telefono), sessione AI, cuffie Bluetooth.
6. **Notifiche** – push al telefono/PC di David (esito, passaggio, errori).

### 4.2 Comunicazione tra componenti (proposta [IPOTESI])

- **Lead rework → Orchestratore:** HTTP POST su un endpoint raggiungibile (rete locale, oppure tunnel sicuro tipo Cloudflare Tunnel/Tailscale se il lead rework è nel cloud).
- **Orchestratore ⇄ App Android:** WebSocket o polling HTTP sulla rete locale (o via relay nel cloud se PC e telefono non sono sulla stessa rete). L'app invia eventi di stato.
- **Orchestratore ⇄ Piattaforma voce:** SDK ufficiale (sessione audio dal PC). Gli eventi di fine chiamata arrivano via SDK; se serve un webhook pubblico usare un tunnel.
- **Orchestratore → Lead rework:** HTTP POST dell'esito (JSON, §6.2) con ripetizione se fallisce (coda con retry, idempotente sull'`attempt_id`).

> Nota: l'architettura "piattaforma gestita + logica nel tuo CRM" è quella consigliata dalle ricerche. In questo progetto il PC fa da ponte audio, quindi la logica di orari/ritentativi sta nel lead rework e la logica di sessione nell'orchestratore.

---

## 5. Audio: collegamenti e passaggio

### 5.1 Schema del collegamento [DECISO + DA PROVARE]

```
Telefono Android (app → Lyber)
      │ cavo jack (cuffie/microfono del telefono)
      ▼
Interfaccia audio del PC  ("DEVICE_PHONE": ingresso + uscita)
      │
      ├── in modalità AI:  DEVICE_PHONE ⇄ sessione AI (microfono/altoparlante dell'agente)
      └── in modalità UMANO: DEVICE_PHONE ⇄ cuffie Bluetooth del PC ("DEVICE_HEADSET")
```

- Il cavo deve portare **entrambe** le direzioni (audio del cliente verso il PC, audio dell'AI verso il cliente). Servono un **cavo TRRS adatto** e, sul PC, un ingresso/uscita adatti (spesso un'interfaccia audio USB piccola: se il PC ha un solo jack combo, un adattatore da TRRS a due jack).
- Il telefono deve riconoscere il cavo come "cuffie con microfono" e instradare lì **l'audio della chiamata**: funziona di norma con qualsiasi app di chiamata, ma **[DA PROVARE]** con l'app Lyber e col tuo modello di telefono.

### 5.2 Routing sul PC

Il PC deve poter cambiare **a runtime** chi è collegato a `DEVICE_PHONE`. Opzioni per un mixer virtuale (dipende dal sistema operativo del PC, ancora da confermare):
- **Windows:** Voicemeeter (o VB-Cable) + libreria Python per gestire i device.
- **macOS:** BlackHole o Loopback + libreria audio.
- **Linux:** PipeWire/PulseAudio (moduli loopback).
- **Alternativa senza software di terzi:** programma Python (libreria di audio in streaming, es. `sounddevice`) che apre `DEVICE_PHONE` e `DEVICE_HEADSET` e copia i flussi nelle due direzioni durante il passaggio. È circa un centinaio di righe [IPOTESI].

Comportamento richiesto del layer audio:
1. **Modalità AI (default):** la sessione AI usa `DEVICE_PHONE` come ingresso (voce del cliente) e uscita (voce dell'AI).
2. **Modalità UMANO (dopo il passaggio):** flusso `DEVICE_PHONE → DEVICE_HEADSET` (cliente → David) e `microfono cuffie → DEVICE_PHONE` (David → cliente). La sessione AI viene chiusa **prima** o **nello stesso istante** per evitare che l'AI senta o parli.
3. **Silenzio e guadagni:** livelli tarati per evitare saturazioni e rimbombi. Nessun ascolto in loopback del proprio audio ("sidetone") verso `DEVICE_PHONE`.
4. **Eco:** non dovrebbe esserci, perché non ci sono altoparlanti aperti; è comunque da verificare con 5 chiamate di prova.

### 5.3 Qualità e ritardo [FONTE/ESPERIENZA]
- Le cuffie Bluetooth con microfono usano un profilo a banda stretta, ma una telefonata è già a banda stretta: nella pratica il cliente non nota la differenza. David usa le cuffie per le chiamate WhatsApp senza problemi.
- Il Bluetooth aggiunge una latenza piccola già presente nelle chiamate normali.
- Per l'AI il collegamento è via cavo, quindi senza questo ritardo.

### 5.4 Passaggio al responsabile: protocollo

1. L'AI decide che il lead è caldo (punteggio ≥ soglia, oppure il cliente chiede una persona, oppure è confuso/arrabbiato) e chiama il tool `request_handoff(reason, summary_3_righe)`.
2. L'orchestratore manda a David una **notifica con il riassunto** e due pulsanti: **"Ci sono"** / **"Non posso"**.
3. L'AI dice al cliente: «Un attimo, la passo a un collega.» e tiene una breve attesa (nessuna musica; silenzio breve o frase ogni 10 s).
4. Se David preme **"Ci sono"** entro 20 s: l'orchestratore chiude la sessione AI e collega `DEVICE_PHONE ⇄ DEVICE_HEADSET` (§5.2). David parla col cliente.
5. Se David preme **"Non posso"** o scade il tempo: l'AI riprende e dice: «Il responsabile la richiama oggi. Preferisce alle 16 o domani mattina?», registra un richiamo (`COMPLETED_CALLBACK`) e invia il report.
6. Fine chiamata: David chiude (pulsante sul PC o riaggancio sul telefono), l'orchestratore salva l'esito.

---

## 6. Dati

### 6.1 Cosa riceve l'agente (job) – payload dal lead rework

```json
{
  "attempt_id": "uuid",
  "lead_id": "string",
  "lead_type": "a_nuovo | b_visitato | c_social",
  "phone": "3331234567",
  "product": "Montascale",
  "zone": "Città (XX)",
  "existing_price_eur": 13000,
  "timeline": "Decisione entro due settimane",
  "analysis_and_strategy": "testo integrale del campo 'Analisi e strategia'",
  "notes": "testo integrale del campo 'Note'",
  "call_script": "testo integrale del copione, con istruzioni tra parentesi",
  "contact_name": "Rossi",
  "attempt_number": 1,
  "max_call_minutes": 8,
  "handoff_threshold": 70,
  "today": "2026-11-09",
  "now_local": "2026-11-09T17:30:00+01:00"
}
```
- `today` e `now_local` vanno **sempre passati**: il modello non conosce la data e sbaglia i giorni degli appuntamenti.
- Il campo `existing_price_eur` serve solo come contesto interno: l'agente **non cita cifre** al cliente (vedi §7.2).

### 6.2 Cosa restituisce l'agente (esito) – JSON da scrivere nella scheda

```json
{
  "attempt_id": "uuid",
  "lead_id": "string",
  "call_state": "NO_ANSWER | VOICEMAIL | COMPLETED_APPOINTMENT | COMPLETED_HANDOFF | COMPLETED_CALLBACK | COMPLETED_NOT_INTERESTED | COMPLETED_NO_DECISION | FAILED_TECH",
  "answered": true,
  "duration_seconds": 0,
  "billable_minutes_ai": 0,
  "score": 0,
  "score_reasons": ["..."],
  "handoff": { "requested": true, "accepted": false, "reason": "..." },
  "appointment": { "set": true, "datetime_local": "2026-11-12T10:00:00+01:00", "type": "sopralluogo | richiamo_responsabile", "notes": "..." },
  "objection": "prezzo | famiglia_decide | tempi | ha_scelto_altro | non_interessato | altro | nessuna",
  "competitor_mentioned": "string|null",
  "decision_maker_info": "string",
  "summary_3_lines": "...",
  "next_action": "ritentare_dopo_X_giorni | passare_a_umano | whatsapp | chiudere_lead",
  "next_action_when": "2026-11-12",
  "transcript": "testo",
  "recording_ref": "id/file",
  "tech_flags": ["eco", "latenza_alta", "audio_interrotto"]
}
```
Il campo `score` viene riempito dal modello a fine chiamata (analisi post-chiamata con un modello leggero che rilegge la trascrizione) oppure dal lead rework se ha già un suo scoring: **scegli un solo posto** in cui vive la soglia (consigliato: nel lead rework, leggibile e modificabile, non dentro il prompt).

### 6.3 Tabella `call_attempts` (nel CRM)

`attempt_id, lead_id, started_at, ended_at, state, call_state_final, answered, duration_s, ai_minutes, score, handoff_requested, handoff_accepted, appointment_set, appointment_datetime, objection, next_action, next_action_when, summary, transcript_ref, recording_ref, tech_flags, cost_estimate_eur, platform (retell|elevenlabs), prompt_version`.
`prompt_version` è fondamentale per il pilota: permette di confrontare le versioni.

---

## 7. Prompt e comportamento dell'agente

### 7.1 Struttura del prompt di sistema (modello a blocchi)

1. **Ruolo:** assistente virtuale di YesMobility, che richiama per conto dell'azienda. Si presenta come assistente virtuale **subito** nella prima frase.
2. **Obiettivo della chiamata:** quello descritto in `analysis_and_strategy` per questo lead.
3. **Copione:** il campo `call_script`, **con le istruzioni tra parentesi trattate come regole di comportamento** (es. "ascolta la risposta senza mettere fretta") e non lette ad alta voce.
4. **Contesto del lead:** prodotto, zona, tempistica, note (sopralluogo, offerta, chi decide).
5. **Regole di conversazione** (§7.2).
6. **Strumenti disponibili** (§7.3).
7. **Condizioni di passaggio** (§7.4).
8. **Data e ora correnti.**

### 7.2 Regole di conversazione (da inserire nel prompt) [IPOTESI da fonti]

- **Si dichiara assistente virtuale** nella prima frase. È un vincolo di progetto (AI Act, art. 50, in vigore dal 2 agosto 2026), non solo una scelta di stile.
- Frasi **sotto le 15 parole**, **una domanda per volta**, ritmo lento, pausa dopo ogni domanda. Il pubblico è spesso anziano: la voce italiana e il riconoscimento sono il punto debole dichiarato dalle fonti.
- Se il cliente è **confuso due volte**, offre subito di passare a una persona.
- Se l'agente non capisce, **conferma a voce** («Ho capito bene: martedì mattina?»); dopo il secondo errore offre una persona.
- **Mai cifre, prezzi, sconti, aliquote o bonus.** Rimanda al responsabile («il responsabile le fa il calcolo preciso»). Mai dire "gratis" o "sconto totale".
- Mai promettere installazioni, date di consegna o IVA agevolata.
- Se chiede «sei un robot?»: «Sì, sono un assistente virtuale dell'azienda. Se preferisce, la faccio richiamare da una persona.»
- Se chiede di essere richiamato: proporre **due orari concreti**.
- Se dice no due volte o chiede di non essere richiamato: ringrazia, chiude, esito `COMPLETED_NOT_INTERESTED` e **blocca ulteriori tentativi** per quel lead.
- Date e orari: far **ripetere a voce** (la normalizzazione di numeri e date in italiano non è supportata in modo affidabile da Retell [FONTE]).
- Durata massima chiamata: 8 minuti, poi chiude con cortesia.

### 7.3 Strumenti (tool) da dare all'agente

| Tool | Cosa fa | Note |
|------|---------|------|
| `get_lead_context()` | Rilegge la scheda (se non già nel prompt) | Utile se si usano prompt corti + dati dinamici |
| `check_slots(date_range)` | Disponibilità appuntamenti | Da collegare all'agenda di David |
| `book_appointment(datetime, type, notes)` | Crea l'appuntamento nel CRM | Poi mirror su Google Calendar |
| `score_lead(signals)` | Calcola il punteggio col criterio del lead rework | La soglia sta nel lead rework |
| `request_handoff(reason, summary)` | Avvia il passaggio (§5.4) | Blocca la risposta finché David non conferma o scade |
| `create_callback(datetime, who)` | Registra un richiamo | Quando David non può rispondere |
| `end_call(outcome)` | Chiude e restituisce l'esito | L'orchestratore poi manda il JSON §6.2 |

### 7.4 Condizioni di passaggio

- Punteggio **≥ 70** (soglia iniziale [IPOTESI], da tarare sulle vendite reali), **oppure**
- il cliente chiede una persona, **oppure** è arrabbiato o confuso, **oppure**
- il cliente è un **decisore** con tempi entro 3 mesi e ha chiesto il prezzo.
Per i condomini: l'interlocutore può non essere il decisore (decide l'assemblea, con l'amministratore): il passaggio serve a **riaprire la trattativa**, non solo a prendere un appuntamento.

### 7.5 Segreteria e mancata risposta

- **Squilla senza risposta / rifiuto:** `NO_ANSWER` → notifica a David; il lead rework applica la cadenza (§8).
- **Segreteria:** riagganciare **senza lasciare messaggio** nel pilota (meno rischio di messaggi sbagliati); la variante con messaggio vocale di 15 secondi senza prezzo si prova in seguito.
- Riconoscere "risposta" vs "squillo/segreteria" **non dall'audio dell'AI da sola**: serve il segnale di stato dell'app Android (§9.2) con un controllo audio di rinforzo (rilevatore di voce dopo il segnale di libero).

---

## 8. Strategia per tipo di lead e cadenza [IPOTESI da testare]

Non esistono benchmark pubblici per lead italiani del settore: le cadenze sono **proposte da verificare nel pilota**.

| Tipo | Scopo | Cadenza proposta | Messaggi |
|------|-------|------------------|----------|
| **a) nuovo, senza risposta** | far parlare il lead | fino a 6 tentativi in 14 giorni; alternare mattina e primo pomeriggio | WhatsApp dopo la prima mancata risposta |
| **b) visitato, senza firma** | capire cosa è rimasto in sospeso | richiamo dopo 3–5 giorni; poi dopo 2 e 6 settimane | cambia il messaggio (novità, finanziamento, fine anno); domanda aperta «cosa le è rimasto in sospeso?» e tre opzioni a voce: costo, famiglia, tempi |
| **c) da Facebook/Google** | rispondere subito | richiamo entro pochi minuti dalla richiesta | senza risposta: WhatsApp e nuovo tentativo dopo un'ora |

Orari proposti: martedì–giovedì, 10:00–12:00 e 16:00–18:30; evitare il pranzo [IPOTESI: per B2C anziani non ci sono dati].
Limite generale: massimo **3–4 tentativi per ciclo** e **mai oltre la finestra concordata**; il lead rework è il responsabile degli orari (scheduler).

### 8.1 Caso di esempio (scheda reale del lead rework)

Lead condominiale (esempio inventato), preventivo da 13.000 €, visitato, poi ha scelto un'altra azienda. Obiettivo del copione: ringraziare, capire il motivo (prezzo, tempi o altro), proporre una condizione migliore (garanzia extra, binario su misura). L'agente deve:
- aprire come assistente virtuale di YesMobility;
- ascoltare senza mettere fretta;
- **non** citare cifre né sconti (il copione parla di "idea di prezzo di massima": rimandare al responsabile);
- passare a David se emerge margine di recupero.

---

## 9. Telefonia e numero

### 9.1 Numero Lyber [DECISO]
- Si chiama con **Lyber** dal telefono tramite la tua app. Il lead vede un numero già noto.
- Lyber è un prodotto di **Messagenet** (numero fisso sul cellulare) [FONTE: help center Messagenet]. Non sono confermati credenziali SIP per Lyber. Per verificare: area clienti → "Dettagli numero".
- Messagenet **non supporta il trasferimento SIP REFER** e controlla il numero chiamante [FONTE]: un motivo per non basare il passaggio su SIP.

### 9.2 Segnale "il cliente ha risposto" [DA PROVARE – punto critico]
L'orchestratore deve sapere se il cliente ha risposto. Possibilità, in ordine di preferenza:
1. **L'app Android legge lo stato** della chiamata (squilla / risposto / terminata). Con le chiamate GSM/di sistema è possibile; con l'app Lyber **può non esserlo** se è una VoIP con interfaccia propria [IPOTESI].
2. **Rilevazione sull'audio** (jack): riconoscere il segnale di libero (tono di chiamata) e poi la voce umana; usare anche il rilevatore di segreteria della piattaforma.
3. **Pulsante manuale** (fallback del pilota): David conferma a mano "ha risposto".
Priorità: provare 1; se non è disponibile, usare 2 con soglie prudenti e 3 come ripiego.

### 9.3 Numero italiano nuovo (passo successivo, non ora) [FONTE]
- Retell non vende numeri italiani: si compra da un carrier e si importa via SIP.
- Telnyx: numeri locali italiani da circa 2 $/mese; attivazione non pubblicata. Twilio: bundle di documenti, 2–5 giorni lavorativi secondo un rivenditore. Plivo e Zadarma come alternative.
- **Tariffe cellulari**: lo stesso minuto costa 7–10 volte di più se la tariffa applicata è quella "default": Twilio 0,0445 $ (origine UE) contro 0,3473 $; Plivo 0,0324 $ contro 0,45 $; Zadarma circa 0,03 $ contro 0,28 $. Va provato con 5–10 chiamate.
- Regole AGCOM: il numero mostrato deve essere assegnato alla linea dal carrier che origina la chiamata (delibera 21/26/CIR); le chiamate con numero italiano da interconnessione internazionale sono bloccate dal filtro anti-spoofing.
- Si passa al cloud quando serve più di una chiamata alla volta o il PC non può restare acceso.

---

## 10. Piano di lavoro

### Fase 0 – Test tecnici (1–2 sere, **prima** di scrivere codice)
Test da superare tutti prima di procedere:
- [ ] **T1 Audio jack:** il telefono con cavo jack porta l'audio della chiamata Lyber al PC e viceversa, nelle due direzioni. Controllare livelli e disturbi.
- [ ] **T2 Eco:** 5 chiamate a colleghi con un agente di prova; nessun eco/rimbombo.
- [ ] **T3 Passaggio audio:** commutare `DEVICE_PHONE` dall'AI alle cuffie Bluetooth durante una chiamata, senza cadere. Misurare la pausa di commutazione (obiettivo < 2 s).
- [ ] **T4 Stato chiamata:** l'app Android riceve/riporta squilla, risposta, fine con l'app Lyber. Altrimenti si attiva il piano 2/3 (§9.2).
- [ ] **T5 Qualità italiana:** 20 chiamate di prova (parenti/colleghi) su Retell e 20 su ElevenLabs, giudizio alla cieca su naturalezza e latenza. Scegliere la piattaforma.
- [ ] **T6 Costo reale:** verificare tariffe Lyber per cellulari e minuti fatturati dalla piattaforma sui 90 minuti di prova.

### Fase 1 – Prototipo (3–5 giorni)
- Orchestratore minimo: riceve il job, avvia la sessione AI, scrive l'esito.
- Prompt dal copione della scheda; apertura da assistente virtuale.
- App Android: comando "componi", stato chiamata (per quanto possibile).
- 10 lead di prova in un ambiente di test (numeri propri).
- Esito JSON scritto nella scheda.

### Fase 2 – Passaggio e analisi (3–5 giorni)
- `request_handoff` con notifica e pulsanti "Ci sono/Non posso".
- Commutazione audio verso cuffie Bluetooth.
- Fallback: richiamo programmato + report.
- Analisi post-chiamata (modello leggero): punteggio, obiezione, prossima azione.

### Fase 3 – Scheduler e cruscotto (4–6 giorni)
- Nel lead rework: finestre orarie, massimo 3–4 tentativi per ciclo, priorità, coda.
- Gestione `NO_ANSWER` e `VOICEMAIL`.
- Cruscotto KPI (§12).
- Tetto di spesa mensile e allarme.

### Fase 4 – Qualità (1–2 settimane in parallelo)
- Suite di 10–15 scenari di prova da rieseguire a ogni modifica del prompt.
- Versioni del prompt registrate (`prompt_version`).
- Lettura delle trascrizioni del pilota per correggere gli errori (prezzi/promesse).

### Tempi indicativi [IPOTESI]
Prototipo in meno di una settimana; sistema affidabile in 3–4 settimane. Le fonti non danno tempi per questo progetto specifico. L'app Android e il lead rework già esistenti riducono i tempi.

---

## 11. Costi

### 11.1 Costi iniziali
| Voce | Costo |
|------|-------|
| Account piattaforma (Retell/ElevenLabs) | 0 € (crediti di prova: Retell 10 $ e 20 chiamate insieme [FONTE]) |
| Cavo audio e adattatori | pochi euro (prezzo da verificare) |
| Mixer audio virtuale | 0 € o poche decine di euro (Voicemeeter a donazione; BlackHole gratuito) [DA VERIFICARE] |
| Chiamate di prova (90 min) | circa 9–10 € [IPOTESI], in gran parte coperte dai crediti |
| Numero italiano nuovo | non necessario ora |

### 11.2 Costi mensili (200 lead/mese)
| Scenario | Minuti | Costo piattaforma | Note |
|----------|--------|-------------------|------|
| Conservativo (900 min) | 900 | circa 65–80 € a 0,08–0,095 $/min | chiamate Lyber escluse |
| Base (~490 min) | 490 | circa 40–45 € | chiamate Lyber escluse |
- **Telefonia:** si paga la tariffa Lyber/SIM (non verificata). Non servono più i 30–50 $/mese di telefonia SIP della piattaforma.
- ElevenLabs a 0,08 $/min: le fonti discordano se include il modello AI (0,08–0,12 $ in tutto).
- Il costo per appuntamento nei calcoli economici è circa **1,6–2,1 €** (solo costi diretti, senza il tuo tempo).

### 11.3 Confronto con l'alternativa umana (costi diretti)
Part-time 10 h/settimana ~770 €/mese (~12,8 €/appuntamento); call center ~1.650–1.790 €/mese. Punto di pareggio: l'AI conviene se un appuntamento perso vale meno di circa 60 € nel caso base. Con vendite da 2.000 a 30.000 € quel valore è superato facilmente: **la scelta dipende dal tasso di appuntamenti dell'agente, non dal costo.**

---

## 12. Pilota, KPI e soglie

- **Prima:** prova tecnica di 1–2 settimane su 50–80 lead.
- **Poi:** 8–10 settimane, ~400 lead, **metà all'agente e metà al processo attuale (a sorte)**.
- Con 200 lead per gruppo si rileva una differenza di circa 13 punti (30% contro 17%). Per differenze più piccole il volume non basta: le soglie sono quindi decisionali.
- **Gruppo di controllo:** tenere un registro minimo (tentativi, esiti, orari), perché i "30 appuntamenti ogni 100 lead" di oggi non sono un dato storico affidabile.

**KPI da misurare**
Appuntamenti ogni 100 lead · appuntamenti effettuati · tasso di risposta · durata e minuti fatturati · costo per appuntamento effettuato · passaggi al responsabile riusciti · reclami · errori gravi nelle trascrizioni (prezzi/promesse).

**Soglie iniziali [IPOTESI]**
- **Via libera:** ≥ 25 appuntamenti ogni 100 lead, nessun errore grave, costo ≤ 15 € per appuntamento effettuato, reclami ≤ 1 ogni 100 contatti.
- **Iterare:** 15–25 ogni 100, o errori correggibili.
- **Fermarsi:** sotto 15 ogni 100, o 2 errori gravi non risolti, o più di 3 reclami ogni 100.

---

## 13. Rischi e punti incerti

| Rischio | Mitigazione |
|---------|-------------|
| Voce e riconoscimento italiano con anziani | Test cieco (T5); frasi brevi; conferma a voce; offerta persona |
| Stato chiamata non leggibile dall'app Lyber | Rilevazione audio + pulsante manuale (§9.2) |
| Commutazione audio non pulita | Test T3; cuffie con cavo come riserva |
| Promesse sbagliate su prezzi/bonus | Prompt che vieta cifre; lettura trascrizioni per 2 settimane |
| Una sola linea: lead in attesa troppo a lungo | Timeout 20 s; richiamo programmato |
| PC o telefono non disponibili | Notifica di errore; il lead rework non conta il tentativo |
| Dipendenza dal fornitore e prezzi che cambiano | Logica nel tuo codice; tetto di spesa; seconda piattaforma di confronto |
| Eventuale segnalazione come spam del numero | Volume graduale, numero stabile |

**Non verificato / da chiarire**
1. Se Lyber espone credenziali SIP (non necessario per questo flusso, utile come alternativa).
2. Tariffe Lyber/Messagenet per cellulari e costo effettivo dei minuti.
3. Sistema operativo del PC e hardware audio (interfaccia, cavo TRRS adatto).
4. Se l'app Lyber permette di leggere lo stato della chiamata da Android.
5. Benchmark italiani su anziani e tasso di appuntamento di agenti in uscita su lead freddi: non trovati.
6. Agevolazioni 2026: fonti discordi (50%/36% contro 30%/36%); non trovata la guida ufficiale delle Entrate. **Nel copione dire solo "di norma 50% sulla prima casa; il responsabile fa il calcolo"**, mai cifre precise.
7. Molte tariffe di piattaforme vengono da blog di terzi: **riverificare le pagine ufficiali prima di pagare**.

---

## 14. Prossimi passi immediati

1. Confermare **sistema operativo del PC** e procurare **cavo TRRS + interfaccia audio** se serve.
2. Aprire gli account **Retell** ed **ElevenLabs** (crediti gratuiti).
3. Eseguire la **Fase 0** (T1–T6).
4. Definire nel lead rework il **payload §6.1** e l'**endpoint di ritorno §6.2**.
5. Scrivere il **prompt di base** dal copione della scheda (§7) e provarlo su 10 lead di prova.
6. Solo dopo, estendere l'app Android (stato chiamata) e scrivere l'orchestratore.

---

## 15. Fonti principali (riverificare)

- Retell: prezzi e checklist numeri outbound · retellai.com/pricing (15/10/2026).
- ElevenLabs: guida prezzi agenti (4/11/2026) · elevenlabs.io/blog/ai-voice-agent-pricing-guide.
- Vapi: trillet.ai/blogs/vapi-pricing-per-minute (22/9/2026).
- Cekura: benchmark voce (4/9/2026).
- Caso italiano su voce e anziani: dev.to (21/5/2026).
- Telefonia: twilio.com/voice/pricing/it; telnyx.com/phone-numbers/italy; plivo.com/sip-trunking/pricing/it; zadarma.com; helpcenter.messagenet.com.
- Norme: agendadigitale.eu (AGCOM 21/26/CIR, 29/4/2026; AI Act, 22/10/2026); segugio.it (14/1/2026).
- Agevolazioni: lentepubblica.it (27/1/2026); lavoripubblici.it (3/3/2026); money.it (2/1/2026).
- Costi alternativa umana: leggeinchiaro.it; retellai.com/it/blog/call-center-outsourcing-costs; skipcall.io.
- Architettura: forasoft.com (13/10/2026); docs.livekit.io.
- Fogli e presentazione già prodotti: `costi_agente_chiamate_lead.xlsx` (costi iniziali e ricorrenti) e la presentazione "Agente vocale per recupero lead – valutazione del progetto" (27 slide).

# Agente vocale per il Sales Assistant — piano (bozza del 9 novembre 2026)

Scritto in italiano semplice. **Nessun codice è stato toccato**: questo è solo il piano da approvare.
Dove deve funzionare: Mac (Console Lead Rework + pannello chiamata) e telefono Android (app «Rubrica YesMobility»).

## 1. Che cosa intendiamo per «agente vocale»

Oggi il Sales Assistant ascolta il cliente, trova il suggerimento giusto e lo **mostra a schermo**.
L'agente vocale aggiunge la **voce**. Ci sono tre livelli, dal più semplice al più ambizioso:

| Livello | Cosa fa | Chi sente | Difficoltà |
|---|---|---|---|
| **1. Suggeritore a voce** | Legge a voce bassa il suggerimento giusto, in una cuffia solo per l'operatore | Solo l'operatore | Bassa |
| **2. Comandi a voce** | L'operatore dice «avanti», «note: scala 12 metri», «termina» e il pannello obbedisce | Solo l'operatore | Media |
| **3. Agente che parla al cliente** | L'agente fa la telefonata da solo (primo contatto, richiamo, conferma appuntamento) | Il cliente | Alta (servizio telefonico esterno, regole sulla privacy e sul consenso) |

**Proposta: fare solo i livelli 1 e 2 adesso.** Il livello 3 si decide dopo, con i risultati dei primi due.

## 2. Come si inserisce nel sistema che c'è già

Non si rifà nulla. Si aggiunge un pezzo in uscita:

```
cliente → splitter → Chrome → Deepgram → motore suggerimenti → pannello (già c'è)
                                                         └──► NUOVO: voce (TTS) → cuffia dell'operatore
operatore → «avanti / note / termina» → NUOVO: riconoscimento comandi → pannello
```

Punto delicato (dallo stato attuale): lo splitter manda al Mac **solo la voce del cliente**; la voce dell'operatore va diretta al telefono.
Quindi per i comandi a voce serve un **secondo microfono** (o la parola chiave detta con un tasto premuto) — va deciso (vedi §5).
E la voce dell'agente deve uscire da una **cuffia diversa dal telefono**, altrimenti il cliente la sentirebbe.

## 3. Fasi

### Fase 1 — Suggeritore a voce (Mac)
- Nel pannello chiamata (`SUGGERIMENTIVENDITA/overlay/index.html`) un interruttore «Leggi a voce».
- Voce: parte con quella del browser (gratis, già sul Mac); se non basta, voce migliore tramite servizio esterno (costo da valutare).
- Regole: legge **una frase corta** alla volta, si zittisce se il cliente riprende a parlare, non ripete lo stesso suggerimento.
- Uscita audio scelta dal selettore (come già si fa per il microfono) → cuffia dell'operatore.
- Prova: browser di prova + prova vera con una chiamata (da fare da David).

### Fase 2 — Comandi a voce (Mac)
- Parole fisse e poche: avanti, indietro, pausa, termina, «note …».
- Riusa Deepgram già in uso, su un canale separato (secondo microfono o tasto «parlo io»).
- «Note …» finisce nel campo «Note YM:» come già fa il tasto Note.

### Fase 3 — Telefono Android
- L'app «Rubrica YesMobility» (versione 1.5, già sa «termina chiamata») riceve anche «leggi suggerimento» dal Mac e lo legge con la voce del telefono nella cuffia Bluetooth.
- Da decidere se serve davvero: se la cuffia è già sul Mac, il telefono non aggiunge nulla.
- Ricordare: l'APK si costruisce da GitHub, non sul Mac; qui non c'è l'Android SDK.

### Fase 4 (solo se vuoi) — Agente che parla al cliente
- Richiede un servizio telefonico esterno, un numero, il consenso a registrare e a parlare con un'IA (obblighi di legge e privacy).
- Prima si prova su numeri di test, mai sui lead veri.

## 4. Cosa non potrò provare da qui
Cuffia e splitter veri, Chrome del Mac con l'estensione, telefono Android, chiamata reale. Ogni prova sarà segnata ✅ (provata in browser di prova) o 🟡 (da provare da David), come in `SUGGERIMENTIVENDITA/DA-FARE-CHIAMATA.md`.

## 5. Decisioni che servono da David
1. Hai una **seconda cuffia/microfono** per l'operatore, o l'uscita deve passare dal jack con lo splitter?
2. Voce gratuita del Mac (meno naturale) o voce a pagamento (più naturale, costo mensile)?
3. Comandi a voce: con un tasto «parlo io» (più sicuro) o sempre in ascolto (più comodo ma sbaglia di più)?
4. Il livello 4 (agente che chiama) ti interessa davvero, o ci fermiamo a 1–3?

## 6. Regole da rispettare
Repository pubblico: nessuna chiave o password nei file (le chiavi stanno sul Mac, come già per Deepgram).
La pagina normale e la Console non cambiano: tutto è dietro un interruttore, spento di default.

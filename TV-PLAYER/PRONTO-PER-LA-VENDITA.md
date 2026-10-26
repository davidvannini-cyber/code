# TV-PLAYER — cosa manca prima di vendere

Documento di lavoro, scritto il 26 ottobre 2026. Dice **onestamente** a che punto siamo, cosa va sistemato e in che ordine.
Non è un parere legale né fiscale: prima di vendere serve un consulto con un **avvocato** e un **commercialista**.
Le cose segnate «da verificare» sono mie conoscenze generali, non controllate su fonti ufficiali: non decidere sulla base di quelle.

## 0. Riassunto
- **Il prodotto funziona** (sito, app Fire TV/Android TV, modo auto, guida programmi, area admin).
- **Non è ancora vendibile**, per tre motivi grossi:
  1. **Legale**: nel progetto ci sono riferimenti a canali, liste ed elenchi programmi di terzi che non si possono rivendere, e bisogna decidere come proteggersi se i clienti usano liste illegali.
  2. **Tecnico**: oggi è fatto per **una persona** (un'unica lista, un'unica password). Per più clienti serve una struttura nuova.
  3. **Segreti e codice**: il repository è **pubblico**: chiunque può copiare tutto, e la chiave di firma dell'app è lì dentro.

## 1. Legale e contenuti (la parte più delicata)
**Cosa si può vendere, in linea di massima:** un lettore (software) che riproduce liste che l'utente porta da sé, **senza** includere o promuovere canali o liste. Molti prodotti sul mercato fanno così.

**Cosa non si deve fare:** vendere o regalare liste di canali, collegare il prodotto a servizi di canali a pagamento «aperti», dare assistenza per procurarsi flussi piratati.

**Da sistemare nel progetto attuale**
- `M3U-PLAYER-WEB/extra.m3u` contiene due canali specifici (Rai 3 Toscana, 50 Canale) con indirizzi di flussi di terzi: **non vanno nel prodotto**.
- Il progetto usa come esempio una lista pubblica (Free-TV su GitHub) e una playlist di esempio (`sample.m3u`): da togliere dal prodotto, o sostituire con dati propri.
- La **guida programmi** usa dati di terzi (epgshare01 e open-epg): **licenza e condizioni d'uso da verificare**; per vendere serve una fonte con licenza chiara, oppure si lascia all'utente il suo indirizzo.
- **Loghi e nomi dei canali** sono marchi di terzi: da non includere nei materiali di vendita.
- **Condizioni d'uso**: dichiarare che il prodotto non fornisce contenuti, che l'utente è responsabile di ciò che riproduce, e come si tratta la segnalazione di abusi.
- **Nome e marchio**: «TV Vannini» è un nome personale; «TV-PLAYER» è generico (difficile da registrare). Va scelto un nome e verificato che sia libero.
- **Licenze dei componenti** (da verificare e riportare nell'app): hls.js, dash.js, mpegts.js (nel sito) e Media3/ExoPlayer (nell'app). In genere sono licenze permissive (Apache o simili) che permettono di vendere, ma obbligano a citare l'autore.
- **Normativa**: in Italia le regole contro la pirateria sono severe. Chiedi all'avvocato cosa comporta vendere un lettore di liste proprie dei clienti.

## 2. Segreti e codice
- Il repository `davidvannini-cyber/code` è **pubblico**: chiunque può copiare il codice e rivenderlo.
- La **chiave di firma** dell'app Fire TV è nel repository (`tv-vannini.keystore`, con password nota): era una scelta comoda per uso personale. Per vendere va **creata una chiave nuova, custodita fuori dal repository**, e mai persa (senza, gli aggiornamenti non si installano più).
- Soluzione consigliata: **un repository privato** solo per TV-PLAYER (su GitHub si possono avere repository privati gratis, con limiti: ad esempio 2.000 minuti di automazioni al mese, da verificare). Conseguenza: i link pubblici di oggi (APK, guida programmi) smettono di essere pubblici, e i file vanno messi su un dominio vostro.
- Cambiare **password admin e segreti** e non riusare quelli attuali.

## 3. Tecnico: da «per me» a «per più clienti»
| Cosa | Oggi | Per vendere |
|---|---|---|
| Utenti | Una sola persona | **Account** o **codice licenza** per cliente |
| Liste dei canali | Un'unica lista unita | Una lista **per cliente**, separata dalle altre |
| Area admin | Una password per tutti | Un'area **per cliente**, con la propria password |
| Dati | Archivio semplice (KV) | Archivio per cliente con regole di isolamento e backup |
| Costi del servizio | Gratis (piano gratuito Cloudflare) | **A pagamento** appena i clienti crescono (limiti del piano gratuito: poche scritture al giorno, poca potenza per richiesta) |
| Installazione app | A mano, con Downloader | **Negozio di app** o aggiornamento automatico |
| Aggiornamenti | Tu lanci `git pull` e `npx wrangler deploy` | Procedura automatica e prove prima del rilascio |
| Guida programmi | Costruita ogni 2 ore da GitHub | Servizio proprio (con licenza dei dati) |
| Assistenza | Tu | Canale di supporto, risposte pronte, registro degli errori |
| Privacy | Nessun dato personale | Se ci sono account: informativa, trattamento dei dati (GDPR), chi è il titolare |
| Protezione anti-copia | Nessuna | Licenza/attivazione, controllo dei dispositivi |

## 4. Piattaforme: in che ordine
1. **Fire TV e Android TV** (già fatte). Pubblicare su **Amazon Appstore** e **Google Play**: servono un account sviluppatore e il rispetto delle regole sulle app per flussi video (da verificare); rischio che lo store rimuova l'app se qualcuno la usa con contenuti illegali.
2. **LG webOS** (richiesta in corso): app web impacchettata, installabile solo con la modalità sviluppatore o dal Content Store ufficiale (con approvazione di LG).
3. **Samsung Tizen**, **Apple TV**, **telefono Android/iPhone**: altre app da fare; ognuna è un lavoro a sé.
4. Il **sito** e il **modo auto** si vendono senza negozi, ma restano un'esperienza meno curata delle app.

## 5. Come si potrebbe far pagare
Senza cifre: da decidere dopo aver capito i costi e provato con i primi clienti.
- **Abbonamento** (mensile o annuale): si adatta bene se c'è un servizio online (aggiornamenti, guida programmi).
- **Licenza una tantum** per dispositivo o per famiglia: più semplice, ma i costi continuano.
- **Gratis con limiti + versione completa a pagamento** (una lista, senza guida programmi, con pubblicità lieve o senza app Fire TV).
- **Prova gratuita** di qualche giorno.
- **Sconsigliato**: fornire anche le liste dei canali. Vendere il servizio *con* i contenuti ti rende responsabile dei contenuti.
- **Incassare**: servono partita IVA e regole fiscali (commercialista). Per l'IVA estera esistono servizi che fanno da venditore ufficiale e gestiscono le tasse (da valutare).

## 6. Costi da stimare (voci, non cifre)
- Servizio online (Cloudflare o simile) a pagamento oltre il piano gratuito.
- Dominio e sito di vendita.
- Account sviluppatore per i negozi di app (Google e Apple chiedono una quota; Amazon, da verificare).
- Strumenti di pagamento (commissioni).
- Consulenza legale e fiscale.
- Fonte dati per la guida programmi (se a pagamento).
- Il tuo tempo per assistenza e aggiornamenti.

## 7. Rischi principali
| Rischio | Gravità | Come ridurlo |
|---|---|---|
| I clienti usano liste illegali | Alta | Nessun canale incluso, condizioni d'uso chiare, parere dell'avvocato |
| Qualcuno copia il codice dal repository pubblico | Alta | Repository privato, licenza, chiave nuova |
| Un negozio di app rimuove l'app | Media | Testo e immagini senza riferimenti a canali, nessun contenuto incluso |
| I flussi dei canali cambiano o muoiono | Media | Più fonti per canale (già c'è), messaggi chiari agli utenti |
| Costi del servizio più alti del previsto | Media | Misurare con pochi clienti prima di crescere |
| Troppa assistenza da gestire | Media | Guida chiara (c'è già un PDF), risposte pronte, aggiornamento automatico |
| Concorrenti già forti sul mercato | Media | Puntare sulle differenze (ordine DTT, risveglio automatico, un solo pannello) |

## 8. Passi consigliati, in ordine
1. **Decidere cosa si vende**: solo il lettore, senza contenuti (consigliato).
2. **Consulto con avvocato e commercialista** (condizioni d'uso, marchio, partita IVA, GDPR).
3. **Repository privato** e **nuova chiave di firma**, custodita bene.
4. **Pulire il prodotto**: togliere `extra.m3u`, le liste di esempio, il nome «Vannini», le fonti dati senza licenza.
5. **Scegliere il nome** e controllare che sia libero (anche il dominio).
6. **Costruire la parte per più clienti**: account/licenze, liste per cliente, admin per cliente.
7. **Beta**: 5-10 conoscenti per qualche settimana, con raccolta dei problemi.
8. **Negozi di app** e **pagamenti**.
9. **Pagina di vendita** (usare `CARATTERISTICHE.md` come base) e supporto.
10. **Lancio** e misura dei costi reali.

## 9. Domande aperte per David
- Vuoi vendere **il software** (consigliato) o anche un **servizio gestito**?
- Quale **mercato**: privati in Italia, gestori di bar/hotel, altro?
- Preferisci **abbonamento** o **licenza una tantum**?
- Che **nome** vuoi usare?
- Quante ore a settimana puoi dedicare all'**assistenza**?
- Vuoi che il prodotto abbia anche una **versione gratuita** limitata?

# Rilevazione prezzi — contesto per Claude Code

Cartella `RILEVAZIONE-PREZZI/` del repository `code` (pubblico: niente segreti, email o ID di account).

Lingua di lavoro con l'utente: **italiano**. L'utente (David) non è uno sviluppatore: vuole istruzioni passo passo, un comando alla volta, e si irrita se lo faccio girare tra più macchine. Dire sempre in quale finestra/macchina si scrive ogni comando.

## Obiettivo
Pagina web che rileva e archivia nel tempo i prezzi di strutture simili alle sue (Casa Pepi e Casa Vapi, Pievepelago MO, 6 ospiti, voti 4,7 e 5) su **Booking e Airbnb**. Zona e raggio modificabili. Monitoraggio continuo perché i prezzi "smart" cambiano di continuo. **VRBO è escluso**: risponde 429 già alla prima richiesta.

## Stack
Solo libreria standard di Python (server HTTP + SQLite) più Playwright per il browser. Nessun framework. Interfaccia in un unico `static/index.html` (Leaflet da CDN, grafico SVG scritto a mano).

| File | Ruolo |
|---|---|
| `server.py` | Server HTTP (porta 8000), API, SQLite `prezzi.db` |
| `providers.py` | Provider demo e registro `PROVIDERS`; si sostituiscono con quelli reali se `BOOKING_SOURCE` / `AIRBNB_SOURCE` sono impostate |
| `booking.py`, `booking_parser.py` | Booking: URL, fetch con Playwright, parser HTML (puro, testabile) |
| `airbnb.py` | Airbnb: Playwright, legge i link `a[href*="/rooms/"]` e risale al blocco col prezzo |
| `browser.py` | Chromium condiviso, profilo persistente `.browser-profile`, riprova se compare la verifica anti-bot |
| `rileva.py` | Rilevazione automatica da `config.json` (weekend + periodi), con pause tra le ricerche |
| `config.json` | Zona, raggio, ospiti, piattaforme, periodi da seguire |
| `installa_automatico.sh`, `disinstalla_automatico.sh` | launchd (macOS): server sempre attivo + rilevazione giornaliera 6:15 |
| `esempi/` | NON nel repository (è una copia di una pagina Booking): per provare il parser salva a mano una pagina dei risultati Booking in `esempi/` |

API: `GET /api/config`, `/api/geocode?q=`, `/api/history`, `/api/tracked`, `/api/latest`, `/api/changes?lat&lng&check_in&radius&soglia=10`; `POST /api/search`.

Perfezionamenti (1 nov 2026): `pulisci_annunci` in `server.py` toglie doppioni e prezzi fuori da 15–2500 €/notte prima di salvare; `changes()` confronta le ultime due rilevazioni (variazioni oltre `soglia_variazione_pct`, nuovi, spariti); `rileva.py` riprova una volta (dopo `pausa_riprova_secondi`) le piattaforme senza dati, scrive `ATTENZIONE` nel log se restano vuote e `VARIAZIONE` per i prezzi cambiati. Provato solo con dati demo, non su Booking/Airbnb veri.

## Come si lancia
```
python3 server.py                          # dati demo
BOOKING_SOURCE=playwright AIRBNB_SOURCE=playwright HEADED=1 python3 server.py   # dati reali
python3 rileva.py --dates                  # date che verranno rilevate
python3 rileva.py --demo                   # prova con dati simulati
python3 booking_parser.py esempi/<pagina-salvata>.html   # test del parser
```
Python 3.9 compatibile (usato sul MacBook e sull'M1). Playwright: `pip install playwright && playwright install chromium`.

## Dove gira in produzione
- **Mac mini M1** (macOS 27, utente `davidvannini`, indirizzo fisso sulla rete di casa (vedi il router)), sempre acceso: progetto in `~/rilevazione-prezzi` (NON in Download/Documenti/Scrivania: macOS blocca i processi automatici e ssh). venv in `venv/`.
- launchd: `online.vannini.prezzi.server` (KeepAlive) e `online.vannini.prezzi.rileva` (ogni giorno 6:15). Log in `logs/`. Entrambi con `HEADED=1`.
- Accesso da remoto: tunnel Cloudflare **`Prezzi-M1`** (cloudflared installato sull'M1 come servizio, in `/usr/local/bin/cloudflared`) → `https://prezziaffitti.vannini.online` → `http://localhost:8000`. Protetto da **Cloudflare Access** (app `prezziaffitti`, policy "Solo io", email dell'account Cloudflare, sessione 8760h). La pagina **non ha password propria**: non esporla senza Access.
- Un altro Mac mini vecchio (OS X 10.11) tiene solo il tunnel di Home Assistant; non può eseguire Playwright.
- L'utente lavora dal MacBook (`ssh davidvannini@<indirizzo-dell-M1>`). Aggiornare l'M1: copiare i file con `scp` nella cartella `~/rilevazione-prezzi`, poi `launchctl kickstart -k gui/$(id -u)/online.vannini.prezzi.server`.
- **Segreti**: mai scrivere token, password, email o ID di account nei file: il repository è PUBBLICO. Il token del tunnel Cloudflare sta solo sull'M1.

## Decisioni e perché
- **Locale e non hosting**: Booking e Airbnb bloccano molto più i datacenter; da casa funzionano. TinyFish (agente cloud a pagamento, 0,016 $/passo) è stato usato solo per provare la fattibilità.
- **Browser visibile (`HEADED=1`)**: con quello Booking ha risposto; il headless non è mai stato provato su Booking dopo la correzione. Booking mostra una verifica e perde i parametri della ricerca: `open_with_retry` riapre l'URL una seconda volta.
- **Prezzo a notte = totale / notti** (non il "a notte" mostrato da Booking, che non sempre torna con il totale). Airbnb mostra "N € in totale" per tutto il soggiorno.
- **Posizione approssimata**: le pagine di ricerca non danno le coordinate, quindi ogni annuncio è messo sul centro del suo paese (Nominatim, cache nella tabella `towns`) più un piccolo spostamento stabile. Il raggio è la distanza da quel punto.
- **Solo alloggi interi** per default (filtro su testo "Intero appartamento" / titolo Airbnb).
- Il prezzo riservato agli iscritti su Booking non è visibile: quelle strutture si saltano.

## Limiti noti / da fare
1. Airbnb legge solo la prima pagina (circa 18-27 annunci); Booking 25 per pagina (`BOOKING_PAGES` per leggerne di più).
2. Capienza non letta da Booking/Airbnb: si assume che la ricerca per 6 ospiti già filtri.
3. I propri annunci (Casa Pepi, Casa Vapi) non sono ancora nel sistema: aggiungere i prezzi reali per il confronto e il "tu vs media".
4. Variazioni di prezzo: fatto il rilevamento (log + `/api/changes`). Mancano: mostrarle nella pagina e inviare avvisi (anche verso Home Assistant).
5. Selettori di Booking/Airbnb possono cambiare: rifare il parser con una pagina salvata in `esempi/`. Airbnb non ha ancora un file di esempio.
6. Storico: `history` e `latest` filtrano per zona, data di arrivo e **raggio arrotondato**; il menu "Date già monitorate" imposta anche il raggio.
7. VRBO: ripensarci solo se serve davvero.
8. Prima verifica reale della rilevazione delle 6:15 (il 2 novembre 2026): controllare `logs/rileva.log` sull'M1.

## Regole di lavoro
- Non fare richieste ravvicinate ai siti: pause tra le ricerche, al massimo una rilevazione al giorno.
- Non aggirare protezioni anti-bot con modalità "stealth": se un sito blocca, dirlo e proporre alternative.
- Prima di modificare file sull'M1, ricordare che il server gira lì con KeepAlive; un errore di sintassi lo manda in crash ripetuto.

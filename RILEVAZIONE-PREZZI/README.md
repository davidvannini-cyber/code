# Rilevazione prezzi

Vedi anche `CLAUDE.md` (contesto completo per chi riprende il progetto).

Pagina web per tenere sotto controllo i prezzi di strutture simili alle mie (Casa Pepi e Casa Vapi, Pievepelago, 6 ospiti) su Booking e Airbnb. VRBO è escluso: ha bloccato la prima richiesta (errore 429).

## Avvio
```
python3 server.py                      # tutto con dati dimostrativi
```
Poi apri http://localhost:8000. In alto la pagina indica quali piattaforme sono reali e quali dimostrative.

### Dati reali (richiedono Playwright sul tuo computer)
```
pip install playwright
playwright install chromium
BOOKING_SOURCE=playwright AIRBNB_SOURCE=playwright python3 server.py
```
Prova senza browser: salva a mano la pagina dei risultati di Booking come HTML e usa
`BOOKING_SOURCE=file:/percorso/pagina.html python3 server.py`.

Se Booking non risponde: aggiungi `HEADED=1` davanti al comando per vedere la finestra del browser. Altre opzioni: `BOOKING_PAGES=2` legge più pagine di risultati (25 strutture per pagina).

## Stato verificato (1 nov 2026)
- **Booking**: la pagina dei risultati (italiano, euro) è stata letta con TinyFish e il lettore `booking_parser.py` estrae 25 strutture reali con nome, paese, voto e prezzo. Verificato su una pagina reale salvata. NON ancora verificato: il download diretto con Playwright dal tuo computer (Booking potrebbe mostrare una verifica anti-bot).
- **Airbnb**: i prezzi compaiono solo dopo il caricamento JavaScript; con un browser vero (agente TinyFish) sono stati letti 15 annunci in euro, "totale per 2 notti". Il provider `airbnb.py` con Playwright è scritto ma i selettori NON sono verificati su un computer reale.
- **VRBO**: bloccato (429). Escluso.

## Come funziona il prezzo
Il prezzo a notte è il totale del soggiorno diviso le notti. Le posizioni dei pin sono approssimate (centro del paese + piccolo spostamento), perché le pagine di ricerca non danno le coordinate esatte. Il raggio si calcola dal centro scelto fino al paese della struttura.
Alcuni prezzi Booking sono visibili solo agli iscritti: quelle strutture vengono saltate.

## Rilevazione automatica (Mac sempre acceso)
Le date e la zona da seguire stanno in `config.json` (si modifica con qualsiasi editor di testo).
```
python3 rileva.py --dates     # mostra le date che verranno rilevate
python3 rileva.py             # rilevazione subito, a mano
./installa_automatico.sh      # server sempre attivo + rilevazione ogni giorno alle 6:15
./installa_automatico.sh 7 30 # stessa cosa, ma alle 7:30
./disinstalla_automatico.sh   # toglie tutto (i dati restano)
```
Registri in `logs/`. Il programma automatico funziona solo con l'utente collegato al Mac e il Mac non in stop.
Metti la cartella in una posizione come `~/rilevazione-prezzi`, non in Download o Documenti (macOS blocca spesso l'accesso ai programmi automatici).

## Accesso da fuori casa
Cloudflare Tunnel: nuovo indirizzo `prezziaffitti.vannini.online` verso `http://localhost:8000`, protetto da Cloudflare Access (la pagina non ha password).

## Struttura
- `server.py`: server locale, API e database storico (`prezzi.db`)
- `providers.py`: provider demo e registro delle piattaforme
- `booking.py`, `booking_parser.py`: Booking
- `airbnb.py`: Airbnb
- `static/index.html`: interfaccia (mappa, raggio, date, tabella, grafico storico)

## Prossimi passi
1. Provare Playwright dal tuo computer su Booking e Airbnb e correggere i selettori
2. Rilevazione automatica periodica (ogni giorno) su date scelte
3. Più date insieme (weekend, vacanze, stagione sciistica)
4. Avvisi quando un concorrente cambia prezzo
5. I miei annunci (Casa Pepi, Casa Vapi) con i prezzi reali per il confronto

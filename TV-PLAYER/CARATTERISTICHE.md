# TV-PLAYER — caratteristiche del prodotto

Per ogni funzione: **cosa fa** (in parole semplici), **perché conta per chi compra**, **stato**.
Stato: ✅ provato dall'utente · 🔬 verificato solo da me (prove automatiche o dati veri) · ❓ da provare.
Fonte tecnica: `M3U-PLAYER-WEB/STATO-PROGETTO.md`.

## 1. In una frase
Un lettore di televisione in diretta, **leggero e veloce**, che mette in ordine i canali come sul telecomando della TV (ordine digitale terrestre),
funziona su **sito web, Fire TV, TV Android, iPhone e in auto**, e si gestisce da una pagina di amministrazione protetta da password.

## 2. Dove funziona
| Dispositivo | Come | Stato |
|---|---|---|
| Computer (Safari, Chrome) | Sito web, nessuna installazione | ✅ |
| iPhone | Sito installabile sulla schermata Home (PWA), schermo intero | ✅ |
| Amazon Fire TV (Lite, Stick, 4K) | App dedicata, lettore nativo, comandi del telecomando | ✅ |
| TV Android (provata su Xiaomi con Android 11) | La stessa app della Fire TV | ✅ |
| Auto (CarPlay + browser di APTV, BMW con manopola) | Pagina speciale `/auto` con comandi semplificati | 🔬 (da provare in auto) |
| Mac | Icona sul Desktop che apre il sito in Safari (script) | ✅ |
| LG webOS | Non ancora fatta | ❓ vedi `PRONTO-PER-LA-VENDITA.md` |
| Apple TV, Samsung Tizen, Roku, Android telefono | Non fatte | — |

## 3. Funzioni per chi guarda la TV
1. **Elenco canali ordinato come sul telecomando** (numeri del digitale terrestre italiano, canali raggruppati). Si capisce subito dove sono Rai 1, Canale 5, La7. ✅
2. **Più fonti per lo stesso canale** («×3»): se una non funziona, passa da sola alla successiva. ✅
3. **Cambio fonte automatico anche durante la visione**: se il canale si blocca per 20 secondi, passa alla fonte successiva. 🔬 (sito) ✅ (app Fire TV)
4. **Ricorda la fonte che funziona meglio** per ogni canale. ✅
5. **Guida programmi leggera**: sotto ogni canale «Programma in corso · poi HH:MM titolo», aggiornata ogni 2 ore, senza appesantire l'app. ✅
6. **Ripresa dell'ultimo canale**: riaprendo l'app (o dopo il riposo), riparte da dove eri. ✅ (Fire TV)
7. **Si apre da sola** all'accensione della Fire TV e al risveglio dal riposo. ✅ (Fire TV)
8. **Finestra flottante (PiP)** sul computer, con cambio canale dai tasti multimediali (F7/F9 su Mac). ✅
9. **5 temi grafici** (Aurora, Vetrina e altri), pagina bella e veloce. ✅
10. **Comandi del telecomando**: frecce per cambiare canale, OK per le informazioni, MENU per filtri e fonti. ✅
11. **Spiega perché un canale non parte** (link scaduto, blocco geografico, protezione DRM) invece di restare nero. 🔬
12. **Schermata di diagnosi** (tasto I): motore, risoluzione, fotogrammi persi, banda. ✅

## 4. Funzioni per chi gestisce il servizio (amministratore)
1. **Area admin protetta da password** (`/admin`); tutte le altre pagine si guardano senza password. ✅
2. **Più liste insieme**: si incollano gli indirizzi di più liste M3U e vengono unite; l'ordine decide la priorità. Fino a 8 fonti. ✅
3. **Aggiornamento automatico** delle liste ogni 6 ore. ✅
4. **Elenco dei canali con interruttore «visibile / nascosto»**, ricerca e filtri; i canali nascosti spariscono da sito **e** da app. ✅
5. **Canali aggiunti a mano** (file `extra.m3u`) che si sommano alle liste. ✅
6. **Stato di ogni fonte** (ok / avviso / errore). ✅

## 5. Funzioni tecniche che si vendono da sole
- **Costo di gestione quasi zero**: il servizio online gira sul piano gratuito di Cloudflare; nessun server da mantenere. ✅
- **App leggerissima** (circa 0,7 MB): pensata per la Fire TV Stick Lite (poca memoria). ✅
- **Una sola base dati per tutti i dispositivi**: cambi una cosa nell'admin e cambia ovunque. ✅
- **Nessun account per guardare**: l'utente apre e guarda. ✅
- **Nessun canale incluso nel prodotto**: l'utente porta la sua lista. (Importante per la parte legale.)
- **Provato in automatico**: prove per il lettore di liste, l'ordine dei canali, il servizio online, il browser. 🔬
- **Documentazione completa**: guida PDF per l'utente (24 pagine) e documento tecnico per chi continua il lavoro. ✅

## 6. Cosa lo distingue da altri lettori
(Confronto indicativo, da verificare con prove sul mercato.)
- L'ordine **DTT italiano** pronto, senza configurare nulla.
- **Una sola gestione** per sito, app e TV.
- **Il cambio fonte automatico**, che riduce le telefonate di assistenza.
- **Si apre da solo al risveglio** su Fire TV, anche con l'app chiusa.
- Funziona anche **in auto** con la manopola.
- Concorrenti da studiare: TiviMate, IPTV Smarters, Perfect Player, Kodi con estensioni.

## 7. Come raccontarlo (idee di frasi)
- «Tutti i tuoi canali, nell'ordine del tuo telecomando, su ogni schermo.»
- «Se un canale si blocca, passa da solo a un'altra fonte.»
- «Si accende insieme alla TV e riparte dall'ultimo canale.»
- «Leggero come una pagina web, anche sulle chiavette più piccole.»
- «Una sola gestione per sito, app e TV.»

## 8. Limiti noti (da dire onestamente ai clienti)
- Su **Safari**, alcuni canali con flusso DASH mostrano per qualche secondo schermo nero con audio.
- Nella finestra flottante di **Chrome** resta una fascia scura (è del browser).
- Nessun supporto **DRM**: i canali protetti non si possono riprodurre.
- La disponibilità dei canali dipende dalle liste dell'utente e dai loro server, non dal prodotto.
- La **manopola dell'auto** non è ancora provata sul campo.

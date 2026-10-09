# -*- coding: utf-8 -*-
"""Parte 4 (Suggerimenti Vendita), Parte 5 (App Android), Parte 6 (Manutenzione) e appendici."""
import json, os, re
from man_lib import *

P4, P5, P6 = "Parte 4", "Parte 5", "Parte 6"
RADICE = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))


def _script_console():
    s = open(os.path.join(RADICE, "LEADREWORKS/src/lead-rework-console.html"), encoding="utf-8").read()
    a = s.index("const SCRIPT_LIBRARY = [")
    b = s.index("\n];", a)
    items = re.findall(r'\{"numero":(\d+),"id":"([^"]+)","canale":"([^"]+)","titolo":"([^"]+)"', s[a:b])
    nome_canale = {"telefono": "Telefono", "whatsapp": "WhatsApp", "email": "Email"}
    return [[n, nome_canale.get(c, c), t] for n, _, c, t in items]


def _script_sv():
    lib = json.load(open(os.path.join(RADICE, "SUGGERIMENTIVENDITA/schema/esempio-libreria-script.json"), encoding="utf-8"))
    return [[x["fase_chiamata"].capitalize(), x["id"].replace("_", " "), x["trigger_categoria"].replace("_", " "), "sì" if x.get("attivo", True) else "no"] for x in lib]


def blocchi():
    B = []
    # ---------------------------------------------------------------- 22
    B.append(cap(22, "Il menu principale", P4, "c22",
                 "Il menu è la finestra stretta al centro dello schermo. Da qui avvii le chiamate e gestisci la libreria."))
    B.append(fig("menu-01-intero", legend=[
        ("yes", "Chiamata YesMobility.", "Solo suggerimenti live, senza guida."),
        ("gl", "Chiamata Gestione Lead.", "Guida del lead più suggerimenti. Si illumina quando c'è un lead in attesa."),
        ("rin", "Rinforzo Facile Salire.", "Suggerimenti più una guida fissa."),
        ("frasi", "Rivedi frasi raccolte.", "Le frasi dei clienti da rivedere (capitolo 28)."),
        ("aggiungi", "Aggiungi script.", "Crea una nuova voce della libreria (capitolo 27)."),
        ("libreria", "Vedi libreria.", "Elenco degli script già inseriti."),
        ("profilo", "Profilo azienda.", "Dati che aiutano l'AI a scrivere i testi (capitolo 29)."),
        ("ambiente", "Ambiente.", "Setup iniziale, una tantum."),
        ("apikey", "API key.", "Le chiavi Deepgram e Anthropic."),
        ("taudio", "Test: solo audio.", "Prova di cattura e trascrizione (capitolo 30)."),
        ("tmatch", "Test: solo matching.", "Scrivi una frase e vedi lo script scelto."),
        ("stato", "Stato.", "Pallino verde = «ambiente pronto»; giallo = manca qualcosa."),
        ("esci", "Esci.", "Chiude l'app e ferma il sistema."),
    ], layout="side", w="62mm"))
    B.append(ul([
        "Mentre un'azione è in corso i pulsanti si disattivano: non fare doppi clic.",
        "Quando l'azione finisce, il menu torna da solo in primo piano.",
        "Chiudere la finestra (il pallino rosso) equivale a premere «Esci»: l'app si chiude e il sistema si ferma.",
    ]))
    B.append(h2("c22-glow", "22.1", "Il pulsante viola che si illumina"))
    B.append(fig("menu-02-lead-in-attesa", w="70mm", did="«Chiamata Gestione Lead» con il bagliore: c'è un lead in attesa."))
    B.append(p("Quando dalla Console premi «Invia a Suggerimenti Vendita», il pulsante viola si illumina. Resta acceso finché non avvii quella chiamata. "
               "Se non si illumina, il lead resta comunque in attesa e comparirà alla prossima Chiamata Gestione Lead."))

    # ---------------------------------------------------------------- 23
    B.append(cap(23, "Le tre modalità di chiamata", P4, "c23",
                 "Tutte e tre aprono lo stesso pannello di chiamata. Cambia solo cosa compare nel riquadro verde «Guida chiamata»."))
    B.append(info(modalita_html()))
    B.append(h2("c23-prima", "23.1", "Prima di ogni chiamata"))
    B.append(ul([
        "Nel menu, in basso, il pallino deve essere verde: <b>«ambiente pronto»</b>.",
        "Lo splitter e le cuffie sono collegati (capitolo 7).",
        "Se vuoi la guida di un lead: l'hai inviato dalla Console e il pulsante viola brilla.",
    ]))
    B.append(box("consiglio", "Avvia il pannello <b>qualche istante prima</b> di comporre il numero. La prima volta il sistema carica il suo «cervello» (circa 15 secondi); dalle chiamate successive parte quasi subito."))
    B.append(h2("c23-avviare", "23.2", "Avviare la chiamata"))
    B += passi([
        "Nel menu premi il pulsante della modalità che ti serve.",
        "Attendi: il pannello si apre da solo in Chrome, a destra del menu. In alto a destra deve comparire <b>«connesso»</b>.",
        "La prima volta Chrome chiede il permesso del microfono: premi «Consenti».",
        "Controlla le due barre di livello (capitolo 25) e telefona.",
    ])
    B.append(h2("c23-ym", "23.3", "Chiamata YesMobility"))
    B.append(p("Solo suggerimenti live sulle frasi del cliente. Il riquadro «Guida chiamata» non compare. Un eventuale lead in attesa non viene toccato: resta per la prossima Chiamata Gestione Lead."))
    B.append(h2("c23-gl", "23.4", "Chiamata Gestione Lead"))
    B.append(p("Il pannello mostra il <b>nome e il numero</b> del lead e, nel riquadro verde, lo <b>script del telefono</b> preparato dalla Console. Sotto continuano i suggerimenti live. Il lead viene «consumato»: il pulsante viola si spegne."))
    B.append(fig("pannello-07-gestione-lead", legend=[("guida", "Guida chiamata.", "Lo script del telefono, diviso in paragrafi.")], layout="side", w="62mm"))
    B.append(h2("c23-rin", "23.5", "Rinforzo Facile Salire"))
    B.append(p("Il riquadro verde mostra subito una guida fissa, uguale per ogni chiamata, scritta per i lead da rinforzare. Non dipende dalla Console."))
    B.append(fig("pannello-08-rinforzo", legend=[("guida", "Guida fissa.", "Il canovaccio «Rinforzo Facile Salire».")], layout="side", w="62mm"))
    B.append(box("nota", "Se prima della chiamata compare «Devi prima usare Configura ambiente» o «Devi prima usare Configura API key», premi <b>«Ambiente»</b> oppure <b>«API key»</b> nel menu (capitolo 7). "
                         "Se compare «Il sistema impiega troppo tempo ad avviarsi», riprova dopo un minuto: sta ancora caricando."))

    # ---------------------------------------------------------------- 24
    B.append(cap(24, "Il pannello chiamata in dettaglio", P4, "c24",
                 "Il pannello è la finestra a destra, larga il 25% dello schermo. Ecco cosa c'è e a cosa serve."))
    B.append(fig("pannello-02-in-corso", legend=[
        ("selettore", "Selettore dell'audio.", "Scegli da quale ingresso ascoltare (capitolo 25)."),
        ("connesso", "Connesso.", "Il pannello è collegato al sistema. Se si scollega riprova da solo ogni 2 secondi."),
        ("mic", "Microfono attivo.", "Verde = sta ascoltando. Se è spento premi «Avvia microfono»."),
        ("pausa", "Pausa.", "Sospende l'ascolto. Premi «Riprendi» per continuare."),
        ("termina", "Termina.", "Chiude la chiamata."),
        ("barre", "Le due barre.", "Mostrano il livello dell'audio (capitolo 25)."),
        ("lead", "Nome e numero.", "Il lead della chiamata. Mostra «—» se non c'è."),
        ("tel", "Invia a telefono.", "Manda il lead al telefono (capitolo 26)."),
        ("sugg", "Suggerimento.", "L'etichetta colorata dice in che fase della chiamata sei; sotto, il testo da dire."),
        ("frasi", "Frasi cliente.", "Le frasi del cliente, una sotto l'altra."),
    ], layout="side", w="64mm"))
    B.append(h2("c24-fasi", "24.1", "I colori delle fasi"))
    B.append(tab(["Etichetta", "Colore", "Quando"], [
        ["Apertura", "Blu", "Inizio chiamata, saluti, presentazione."],
        ["Scoperta", "Turchese", "Domande per capire il bisogno."],
        ["Presentazione", "Viola", "Spiegazione della soluzione."],
        ["Obiezioni", "Arancione", "Il cliente solleva un dubbio (prezzo, tempi, fiducia)."],
        ["Chiusura", "Verde", "Segnali di interesse e chiusura."],
    ]))
    B.append(h2("c24-testi", "24.2", "Cosa leggi nel riquadro del suggerimento"))
    B.append(ul([
        "All'inizio compare «In attesa del primo suggerimento…».",
        "Quando il cliente parla, il testo cambia con il suggerimento più adatto. Se lo script ha un'alternativa, compare sotto con la scritta «Alternativa:».",
        "Se nessuno script è pertinente, compare «Nessuno script pertinente per l'ultima frase.».",
        "Alcuni suggerimenti contengono parole tra parentesi quadre (per esempio [Nome] o [tempistica]): sostituiscile a voce con il dato giusto. Leggi il testo come traccia, non parola per parola.",
    ]))

    # ---------------------------------------------------------------- 25
    B.append(cap(25, "Regolare il livello audio", P4, "c25",
                 "Da fare la prima volta, o quando la trascrizione non è precisa. Basta guardare due barre."))
    B.append(h2("c25-barre", "25.1", "Le due barre di livello"))
    B.append(fig("pannello-03a-barre", legend=[
        ("pre", "Prima del limiter.", "Il segnale che arriva dal telefono. È quella da guardare."),
        ("post", "Dopo il limiter.", "Quello che viene trascritto. È più lunga perché il sistema la rinforza."),
    ], layout="side", w="80mm"))
    B.append(tab(["Colore", "Cosa significa"], [
        ["Verde", "Il segnale c'è ma è ancora basso."],
        ["Arancione", "Segnale forte e sano: la zona giusta per il parlato."],
        ["Rosso", "Vicino alla saturazione: abbassa il livello."],
    ]))
    B.append(h2("c25-avvisi", "25.2", "Gli avvisi"))
    B.append(fig("pannello-03-avvisi", legend=[
        ("clip", "Segnale saturo (clipping).", "Compare in rosso per 3 secondi quando il segnale tocca il massimo. Abbassa il volume del telefono o il livello di ingresso del Mac."),
        ("ingresso", "Microfono integrato in uso.", "Compare in giallo quando stai ascoltando il microfono del Mac invece dello splitter."),
    ], layout="stack", w="100%"))
    B.append(box("nota", "Con lo splitter collegato, macOS chiama il jack <b>«External Microphone (Built-in)»</b>: l'avviso giallo non deve comparire. L'avviso scatta con «Internal Microphone (Built-in)»."))
    B.append(h2("c25-passi", "25.3", "Passo per passo"))
    B += passi([
        "Prepara <b>una voce che parla in modo continuo</b> sul telefono: un video, un podcast o una chiamata a un tuo secondo numero. Imposta il volume del telefono come lo userai in chiamata e poi non toccarlo.",
        "Sul Mac apri <b>Impostazioni di Sistema → Suono → Ingresso</b> e seleziona <b>External Microphone</b>.",
        "Apri una Chiamata YesMobility e guarda la barra in alto, «prima del limiter».",
        "Regola il <b>volume di ingresso</b> del Mac: la barra deve oscillare tra verde e arancione, con qualche picco verso il rosso.",
        "Se resta spesso rossa o compare il clipping, <b>abbassa</b>. Se resta corta e verde, <b>alza</b>.",
    ])
    B.append(box("consiglio", "Se i suggerimenti sono giusti ma le <b>frasi trascritte</b> non corrispondono a quelle dette, quasi sempre il livello è troppo basso: porta la barra alta verso l'arancione e riprova."))
    B.append(h2("c25-dispositivo", "25.4", "Scegliere il dispositivo"))
    B.append(fig("pannello-04-selettore", legend=[("selettore", "Selettore.", "Elenca gli ingressi audio del Mac."), ("connesso", "Connesso.", "Il pannello è collegato.")], layout="stack", w="100%"))
    B.append(ul([
        "<b>Predefinito di sistema</b> segue l'ingresso che macOS considera attivo in quel momento.",
        "Scegliendo un dispositivo preciso, la scelta resta salvata per le chiamate successive.",
        "Puoi cambiarlo anche durante la chiamata: l'ascolto riparte da solo, senza interrompere i suggerimenti.",
        "Se il dispositivo salvato non c'è più, il pannello torna al predefinito.",
    ]))
    B.append(box("nota", "Se la spia resta ferma mentre il cliente parla o la trascrizione è vuota, probabilmente stai ascoltando il dispositivo sbagliato: scegli «External Microphone»."))

    # ---------------------------------------------------------------- 26
    B.append(cap(26, "Durante la chiamata e a fine chiamata", P4, "c26",
                 "Cosa puoi fare mentre parli e come chiudere."))
    B.append(h2("c26-pausa", "26.1", "Pausa e Termina"))
    B.append(fig("pannello-05-pulsanti", legend=[
        ("mic", "Microfono attivo.", "L'ascolto è in corso."),
        ("pausa", "Pausa / Riprendi.", "Sospende l'invio delle frasi: le barre di livello continuano a muoversi."),
        ("termina", "Termina.", "Chiude la chiamata e riporta in primo piano il menu."),
    ], layout="stack", w="100%"))
    B.append(p("Dopo «Termina» il pulsante diventa «Chiamata terminata» e il selettore si blocca. Per una nuova chiamata torna al menu e premi di nuovo il pulsante: il sistema resta acceso e riparte subito."))
    B.append(h2("c26-frasi", "26.2", "Le frasi del cliente"))
    B.append(p("Nel riquadro «Frasi cliente» compaiono solo le frasi del <b>cliente</b>: la tua voce non viene mai trascritta. Le frasi vengono salvate sul Mac per poterle rivedere dopo (capitolo 28)."))
    B.append(box("attenzione", "Poiché le frasi dei clienti vengono salvate, è buona norma informare i clienti che la chiamata può essere monitorata o registrata a fini di qualità. Verifica con chi segue la privacy in azienda."))
    B.append(h2("c26-telefono", "26.3", "Invia a telefono dal pannello"))
    B += passi([
        "Premi <b>«Invia a telefono»</b> nel riquadro con nome e numero.",
        "La <b>prima volta</b> il pannello chiede «Incolla il codice segreto del telefono»: incolla il codice copiato dalla Console (capitolo 6). Resta salvato.",
        "Compare la striscia «Cosa faccio con questo lead?»: scegli <b>Salva e chiama</b>, <b>Solo salva</b> o <b>Annulla</b>.",
    ])
    B.append(fig("pannello-06-invia-telefono", legend=[
        ("salvachiama", "Salva e chiama.", "Salva il contatto sul telefono e avvia la chiamata."),
        ("solosalva", "Solo salva.", "Salva il contatto."),
        ("annulla", "Annulla.", "Non fa nulla."),
    ], layout="side", w="62mm"))
    B.append(box("nota", "Se non c'è un numero compare «Nessun numero da inviare». Gli esiti sono gli stessi della Console: «Inviato: il telefono chiama ✓», «Contatto inviato ✓», «Annullato», «Invio non riuscito: …»."))

    # ---------------------------------------------------------------- 27
    B.append(cap(27, "La libreria degli script", P4, "c27",
                 "La libreria contiene le frasi che il sistema suggerisce durante la chiamata. Puoi vederla e farla crescere."))
    B.append(h2("c27-vedi", "27.1", "Vedere la libreria"))
    B.append(p("Nel menu premi <b>«Vedi libreria»</b>. Compare una finestra con il totale degli script e una riga per ognuno, nel formato «[fase] nome». "
               "Guardala prima di aggiungere qualcosa, per non fare doppioni."))
    B.append(h2("c27-aggiungi", "27.2", "Aggiungere uno script"))
    B.append(p("Uno script ha due parti: le <b>frasi di esempio del cliente</b> (servono al sistema per capire quando usarlo e non si vedono mai in chiamata) e il <b>suggerimento</b> (il testo che comparirà nel pannello)."))
    B += passi([
        "Nel menu premi <b>«Aggiungi script»</b>.",
        "Scegli dalla lista <b>in quale fase della chiamata</b> si usa: apertura, scoperta, presentazione, obiezioni, chiusura.",
        "Scegli <b>quale situazione lo attiva</b> (tabella qui sotto).",
        "Scrivi un <b>nome breve</b>, per esempio «obiezione prezzo sconto». Va bene qualsiasi testo: il sistema lo trasforma in minuscolo con i trattini bassi. Se esiste già uno script con quel nome ti avvisa.",
        "Scrivi le <b>frasi di esempio del cliente</b>, una alla volta. Lascia vuoto quando hai finito. Serve almeno una frase: più ne scrivi (2-5 è l'ideale), meglio il sistema riconosce la situazione.",
        "Scegli come scrivere il suggerimento: <b>«Lo scrivo io»</b> o <b>«Genera con l'AI»</b> (vedi 27.3).",
        "Ti viene chiesto se vuoi anche un <b>suggerimento alternativo</b>, che comparirà sotto il principale: «Salta», «Lo scrivo io» o «Genera con l'AI».",
        "Facoltativo: scrivi una <b>priorità da 1 a 10</b>. Serve solo a scegliere tra due script ugualmente adatti. Se lasci vuoto vale 5.",
        "Compare la conferma «Script … aggiunto alla libreria». Lo script è <b>attivo subito</b>, dalla prossima chiamata o test: non serve riavviare niente.",
    ])
    B += tab_split(["Situazione", "Quando si attiva"], [
        ["obiezione prezzo", "Il cliente dice che costa troppo o chiede uno sconto."],
        ["obiezione tempo", "Il cliente teme i tempi di installazione."],
        ["obiezione concorrenza", "Il cliente confronta con un altro fornitore."],
        ["obiezione autorità decisionale", "Deve chiedere a qualcun altro prima di decidere."],
        ["obiezione fiducia", "Il cliente diffida o teme una truffa."],
        ["segnale interesse", "Il cliente mostra interesse."],
        ["richiesta informazioni", "Il cliente chiede dettagli."],
        ["richiesta referenze", "Il cliente chiede referenze o esempi."],
        ["silenzio o esitazione", "Il cliente tace o esita."],
        ["tentativo chiusura cliente", "Il cliente stesso propone di chiudere."],
        ["saluto apertura", "I primi saluti della chiamata."],
        ["altro", "Qualunque altra situazione."],
    ], per=6)
    B.append(h2("c27-ai", "27.3", "Far scrivere il testo all'AI"))
    B += passi([
        "Scegli <b>«Genera con l'AI»</b>.",
        "L'AI scrive una proposta usando fase, situazione, frasi di esempio e il profilo azienda (capitolo 29).",
        "La proposta compare in un campo che <b>puoi modificare liberamente</b>. Premi <b>«Usa questo testo»</b> per salvarla, <b>«Rigenera»</b> per averne un'altra, <b>«Annulla»</b> per rinunciare.",
    ])
    B.append(box("nota", "Il testo non viene mai salvato alla cieca: lo vedi sempre prima. Se la generazione non riesce compare «Non sono riuscito a generare una proposta»: scrivilo tu."))
    B.append(box("nota", "Le condizioni avanzate (per esempio «usa questo script solo per un certo tipo di lead») non si impostano da queste finestre: chiedi a chi cura il sistema."))

    # ---------------------------------------------------------------- 28
    B.append(cap(28, "Rivedere le frasi raccolte", P4, "c28",
                 "Ogni chiamata raccoglie le frasi nuove dei clienti. Rivederle fa crescere la libreria."))
    B.append(p("Le frasi si salvano da sole durante la chiamata, insieme allo script che era stato scelto. Quando vuoi, nel menu premi <b>«Rivedi frasi raccolte»</b>."))
    B += passi([
        "Compare il numero di frasi da rivedere. Premi OK.",
        "Per ogni frase vedi la fase della chiamata e se il sistema aveva trovato uno script («Durante la chiamata non era stato trovato nessuno script pertinente» è il segnale che quella situazione non è ancora coperta).",
        "Scegli: <b>«Ignora»</b> (non era utile), <b>«Usa questa frase»</b> o <b>«Interrompi»</b> (le frasi non riviste restano per la prossima volta).",
        "Se hai scelto «Usa questa frase», dalla lista scegli <b>a quale script aggiungerla</b> (così lo script riconosce meglio la situazione) oppure <b>«Crea un nuovo script con questa frase»</b>.",
        "Se la frase era già tra gli esempi di quello script, compare «Questa frase era già tra gli esempi» e viene segnata come rivista.",
        "Alla fine compare «Revisione completata».",
    ])
    B.append(box("nota", "Se non ci sono frasi nuove compare «Non ci sono nuove frasi da rivedere. Compariranno qui dopo le prossime chiamate»."))

    # ---------------------------------------------------------------- 29
    B.append(cap(29, "Profilo azienda, API key e Ambiente", P4, "c29",
                 "Tre pulsanti del menu che si usano raramente."))
    B.append(h2("c29-profilo", "29.1", "Profilo azienda"))
    B.append(box("attenzione", "Questo profilo è diverso da quello della Lead Rework Console (capitolo 6): serve solo a far scrivere i testi dell'AI quando aggiungi uno script (capitolo 27)."))
    B += passi([
        "Premi <b>«Profilo azienda»</b> e poi OK.",
        "Rispondi alle quattro domande, una alla volta: <b>nome dell'azienda</b>; <b>prodotti, servizi e contesto</b> (a chi vendete, cosa vi differenzia); <b>strategia commerciale</b> (per esempio «puntare sul valore, mai sul prezzo»); <b>regole fisse</b> (tono da usare, cose da non promettere mai).",
        "Compare «Profilo azienda salvato». La volta dopo vedrai i valori già salvati, pronti da modificare.",
    ])
    B.append(h2("c29-api", "29.2", "API key"))
    B += passi([
        "Premi <b>«API key»</b>.",
        "Incolla la chiave <b>Deepgram</b> (da deepgram.com) e premi OK.",
        "Incolla la chiave <b>Anthropic</b> (da console.anthropic.com) e premi OK.",
        "Compare «API key salvate». Se premi «Annulla» a metà compare «Operazione annullata».",
    ])
    B.append(h2("c29-ambiente", "29.3", "Ambiente"))
    B.append(p("«Ambiente» installa i componenti necessari al funzionamento. Si fa alla prima installazione e quando un aggiornamento lo richiede. Premi OK e attendi qualche minuto: non compare nulla mentre lavora. "
               "Se qualcosa va storto compare «Si è verificato un problema durante il setup» e i dettagli sono nel file <code>logs/setup.log</code>."))

    # ---------------------------------------------------------------- 30
    B.append(cap(30, "Test audio e test matching", P4, "c30",
                 "Due prove per controllare le due metà del sistema, una alla volta."))
    B.append(h2("c30-audio", "30.1", "Test: solo audio"))
    B.append(p("Controlla che il Mac senta il telefono e che la trascrizione funzioni, senza avviare una chiamata vera."))
    B += passi([
        "Premi <b>«Test: solo audio»</b>.",
        "Dalla lista scegli il <b>dispositivo audio</b> collegato allo splitter. Se non ne trova compare «Nessun device audio di input trovato».",
        "Compare «Il test durerà 15 secondi: parla vicino al telefono». Premi OK e parla.",
        "Alla fine compare «Test terminato» e le trascrizioni si aprono in TextEdit.",
    ])
    B.append(h2("c30-matching", "30.2", "Test: solo matching"))
    B.append(p("Controlla quale script sceglie il sistema per una frase, senza audio. È utile dopo aver aggiunto uno script."))
    B += passi([
        "Premi <b>«Test: solo matching»</b>. Compare «Carico il motore di matching, attendi qualche secondo»: succede una volta sola per il test.",
        "Scrivi <b>una frase come se fossi il cliente</b>, per esempio «il prezzo mi sembra eccessivo», e premi OK.",
        "Compare lo script scelto, nel formato «[fase] testo», con l'eventuale alternativa. Se nessuno è pertinente compare «Nessuno script pertinente trovato per questa frase».",
        "Scrivi un'altra frase, oppure lascia vuoto per tornare al menu.",
    ])

    # ---------------------------------------------------------------- 31
    B.append(cap(31, "Come funziona l'invio al telefono", P5, "c31",
                 "L'app Rubrica YesMobility riceve il lead dal Mac e lavora da sola, in sottofondo."))
    B.append(info(android_flusso_html()))
    B.append(p("Quando premi «Invia a telefono» sul Mac, il lead parte verso un servizio di messaggi (ntfy.sh) protetto dal <b>codice segreto</b>. "
               "L'app sul telefono è in ascolto con lo stesso codice, riceve il lead e lo elabora."))
    B.append(h2("c31-succede", "31.1", "Cosa succede quando arriva un lead"))
    B += passi([
        "L'app normalizza il numero: se manca il prefisso aggiunge <b>+39</b>.",
        "Salva il contatto in rubrica con il nome preceduto da <b>«YM_»</b> (per esempio «YM_Mario Rossi») e lo mette nell'etichetta <b>«YesMobility»</b>. Se il numero è già in rubrica, non crea un doppione.",
        "<b>Copia il numero negli appunti.</b>",
        "Se avevi scelto «Salva e chiama», apre <b>Lyber</b> e fa partire la chiamata.",
    ])
    B.append(h2("c31-ripiego", "31.2", "Se la chiamata non parte"))
    B.append(p("Se Android blocca l'apertura di Lyber (per esempio manca il permesso «Mostra sopra altre app»), compare una notifica <b>«Chiamata non partita»</b>: toccala per copiare il numero e chiamare con Lyber."))
    B.append(h2("c31-registro", "31.3", "Gli ultimi lead ricevuti"))
    B.append(p("Aprendo l'app, in fondo alla schermata trovi l'elenco degli ultimi <b>8 lead</b> ricevuti, con l'esito: «salvato in rubrica», «già in rubrica», «chiamata avviata con Lyber», «chiamata NON avviata (ripiego: notifica)»."))
    B.append(box("consiglio", "Per fermare l'ascolto apri l'app e premi «Ferma l'ascolto». Per ripartire premi di nuovo «1. Salva e avvia l'ascolto»."))

    # ---------------------------------------------------------------- 32
    B.append(cap(32, "Aggiornare il sistema", P6, "c32",
                 "Ogni tanto il sistema viene migliorato. Per avere le novità sul tuo Mac servono pochi passi."))
    B.append(info(aggiornare_html()))
    B.append(h2("c32-sync", "32.1", "Passo 1: il sync"))
    B += passi([
        "Fai doppio clic su <code>Sync.command</code> (si trova nella cartella principale <code>code</code>).",
        "Se va tutto bene compare «Fatto. Tutto allineato.» e la finestra si chiude da sola dopo 3 secondi. Se c'è un errore la finestra resta aperta e puoi leggerlo.",
        "Se il sync dice che è già aggiornato, significa che non ci sono novità: puoi fermarti qui.",
    ])
    B.append(h2("c32-app", "32.2", "Passo 2: se è cambiata l'app Suggerimenti Vendita"))
    B.append(p("Se tra le novità c'è una modifica all'app, vanno fatti questi passi (chi cura il sistema ti dirà se servono). L'app è «firmata» e ogni modifica rompe la firma: va rifatta."))
    B += passi([
        "Chiudi del tutto l'app con <b>Cmd+Q</b> (non basta chiudere la finestra).",
        "Apri <b>Terminale</b> e incolla <code>security find-identity -v -p codesigning</code>. Copia la sequenza di lettere e numeri che precede il nome del certificato (se ce ne sono due uguali usa la prima).",
        "Incolla <code>cd</code>, uno spazio e il percorso della cartella <code>SUGGERIMENTIVENDITA</code> (puoi trascinare la cartella dentro il Terminale), poi premi Invio.",
        "Incolla <code>codesign --force --deep --sign SEQUENZA \"Suggerimenti Vendita.app\"</code>, sostituendo SEQUENZA con quella copiata, e premi Invio. Se il Mac chiede la password, inseriscila. Può volerci qualche minuto: attendi che torni il simbolo %.",
        "Per controllare incolla <code>codesign --verify --deep \"Suggerimenti Vendita.app\" &amp;&amp; echo OK</code>: deve scrivere <b>OK</b>.",
        "Riapri l'app e avvia una chiamata di prova.",
    ])
    B.append(box("nota", "Se macOS rifiuta il microfono o i permessi dopo la firma, esegui <code>ripara_permessi.command</code>. Se il collegamento «Invia a Suggerimenti Vendita» non apre più l'app, riapri l'app una volta."))
    B.append(h2("c32-altro", "32.3", "Se sono cambiati altri pezzi"))
    B.append(ul([
        "<b>Estensione Chrome:</b> ricaricala da <code>chrome://extensions</code> (capitolo 4.2).",
        "<b>App Android:</b> scarica di nuovo <code>RubricaYesMobility.apk</code> dalla pagina Releases e installala sopra la vecchia.",
        "<b>Cartella spostata:</b> se sposti la cartella del progetto, l'estensione non trova più la Console: chiedi a chi cura il sistema di aggiornare l'indirizzo nel file <code>background.js</code> dell'estensione.",
    ]))

    # ---------------------------------------------------------------- 33
    B.append(cap(33, "Problemi frequenti e come risolverli", P6, "c33",
                 "Cerca qui il messaggio che vedi o il comportamento strano."))
    B.append(h2("c33-console", "33.1", "Lead Rework Console"))
    B += tab_split(["Cosa succede", "Cosa fare"], [
        ["Premo il pulsante blu sul CRM e nella Console non succede nulla", "Controlla in <code>chrome://extensions</code> che l'estensione sia attiva e che sia acceso «Consenti accesso agli URL di file» (capitolo 4). Ricarica l'estensione e premi F5 sul CRM."],
        ["«Impossibile leggere i dati di questa pagina»", "Premi F5 sulla pagina del CRM e riprova."],
        ["«Nessun runtime AI disponibile»", "Manca la chiave Anthropic: vai in Profilo Azienda → Impostazioni AI (capitolo 6)."],
        ["Errore che nomina il «Workspace ID»", "Incolla il Workspace ID nelle Impostazioni AI e riprova «Testa connessione»."],
        ["«Bozza da libreria (no AI)»", "L'AI non era raggiungibile: controlla la chiave e internet, poi premi «Genera script» o «Rigenera»."],
        ["«La risposta dell'AI è arrivata vuota»", "Riprova a generare. Se si ripete, aspetta qualche minuto."],
        ["«Testo grezzo»", "La risposta non era leggibile: correggi a mano il testo oppure rigenera."],
        ["Il logo di WhatsApp non apre nulla", "Installa WhatsApp Desktop sul Mac e controlla che il numero sia un cellulare."],
        ["La busta della mail non apre nulla", "Controlla che sul Mac ci sia un programma di posta predefinito e che il lead abbia un indirizzo."],
        ["«Prima imposta il codice del telefono»", "Premi «Genera codice» in Profilo Azienda (capitolo 6)."],
        ["«Invio non riuscito» o il telefono non riceve", "Controlla internet su Mac e telefono; che l'app Rubrica sia in ascolto; che il codice sia identico nei due posti."],
        ["Lo Storico è vuoto", "Premi «Recupera copia automatica». Se non basta usa «Ripristina» con un backup (capitolo 21)."],
    ], per=6)
    B.append(h2("c33-sv", "33.2", "Suggerimenti Vendita"))
    B += tab_split(["Cosa succede", "Cosa fare"], [
        ["«sviluppatore non identificato»", "Tasto destro sull'app, poi Apri, poi conferma. Solo la prima volta."],
        ["«Non disponi dei permessi necessari»", "Esegui <code>ripara_permessi.command</code>."],
        ["L'app mostra una lista invece dei pulsanti", "Premi «Ambiente» dalla lista: mancano i componenti del menu grafico."],
        ["«ambiente non configurato» o «API key non configurate»", "Premi «Ambiente» oppure «API key» (capitolo 7)."],
        ["«Il sistema impiega troppo tempo ad avviarsi»", "Il sistema sta caricando: riprova dopo un minuto. I dettagli sono in <code>logs/server.log</code>."],
        ["Il pannello resta su «disconnesso»", "Il sistema non è in esecuzione: chiudi l'app con Cmd+Q e riaprila."],
        ["Il pulsante «Chiamata Gestione Lead» non si illumina", "Controlla che l'estensione sia aggiornata e ricaricata e che l'app sia aperta. Il lead resta in attesa e compare alla prossima chiamata."],
        ["La barra di livello resta ferma, o la trascrizione è vuota", "Stai ascoltando il dispositivo sbagliato: scegli «External Microphone» nel selettore."],
        ["Avviso giallo «microfono integrato»", "Scegli lo splitter nel selettore e controlla che sia collegato."],
        ["Avviso rosso «clipping»", "Abbassa il volume del telefono o il livello di ingresso del Mac (capitolo 25)."],
        ["Le frasi trascritte non corrispondono a quelle dette", "Quasi sempre il livello è troppo basso: porta la barra «prima del limiter» verso l'arancione."],
        ["Dopo un aggiornamento le novità non si vedono", "Chiudi l'app con Cmd+Q, rifirma l'app e riaprila (capitolo 32)."],
    ], per=6)
    B.append(h2("c33-android", "33.3", "App Android"))
    B += tab_split(["Cosa succede", "Cosa fare"], [
        ["Il contatto non viene salvato", "Concedi i permessi dei contatti (pulsante 2)."],
        ["La chiamata non parte, arriva la notifica «Chiamata non partita»", "Attiva «Mostra sopra altre app» (pulsante 4), controlla che Lyber sia installata e tocca la notifica per chiamare."],
        ["L'app smette di ricevere lead", "Premi «3. Non limitare la batteria» e controlla che l'ascolto sia attivo (notifica fissa)."],
        ["Dopo aver cambiato codice non arriva nulla", "Incolla il nuovo codice nell'app e premi «1. Salva e avvia l'ascolto»."],
    ], per=6)

    # ---------------------------------------------------------------- 34
    B.append(cap(34, "Glossario", P6, "c34", "Le parole usate nel sistema, in ordine alfabetico."))
    B += tab_split(["Parola", "Significato"], sorted([
        ["AGC", "Regolazione automatica del volume del microfono, fatta dal browser."],
        ["API key", "Chiave segreta che dà accesso a un servizio (Anthropic, Deepgram). Tratta come una password."],
        ["Canale", "Il mezzo di contatto: telefono, WhatsApp o email."],
        ["Canovaccio / Guida chiamata", "Lo script del lead mostrato nel riquadro verde durante la chiamata."],
        ["Clipping", "Il segnale audio è troppo forte e si «taglia»: la voce risulta distorta."],
        ["CRM", "Il gestionale dove si trovano i lead (Facile Salire)."],
        ["Deepgram", "Il servizio che trascrive la voce del cliente in testo."],
        ["Estensione", "Un piccolo programma aggiunto a Chrome."],
        ["Lead", "Un cliente che ha chiesto informazioni."],
        ["Limiter", "Un limitatore che evita che l'audio diventi troppo forte."],
        ["Lyber", "L'app del telefono Android con cui parte la chiamata."],
        ["Matching", "Il confronto tra la frase del cliente e gli script, per scegliere il suggerimento."],
        ["Modello", "Quale versione dell'intelligenza artificiale usare."],
        ["ntfy.sh", "Il servizio di messaggi che porta il lead dal Mac al telefono."],
        ["Obiezione", "Un dubbio o un'opposizione del cliente (prezzo, tempi, fiducia)."],
        ["Script", "Il testo da dire o da inviare."],
        ["Splitter", "Il cavo a Y che separa la voce del cliente da quella dell'operatore."],
        ["Stato del lead", "A che punto è il lead; decide gli script preparati."],
        ["Suggerimento", "La frase consigliata che compare mentre il cliente parla."],
        ["Workspace ID", "Un codice che alcune chiavi Anthropic richiedono."],
    ], key=lambda r: r[0].lower()), per=10)

    # ---------------------------------------------------------------- Appendici
    B.append(cap("A", "Appendice A — Gli script della Lead Rework Console", P6, "cA",
                 "La libreria di riferimento che la Console usa per scrivere gli script. Sono 26, numerati da 1 a 27 (il numero 22 non esiste più)."))
    B += tab_split(["N.", "Canale", "Titolo"], _script_console(), per=9)
    B.append(box("nota", "Questa libreria è diversa da quella di Suggerimenti Vendita (Appendice B): ognuna ha il suo scopo."))

    B.append(cap("B", "Appendice B — Gli script di Suggerimenti Vendita", P6, "cB",
                 "La libreria che il sistema usa per i suggerimenti durante la chiamata. Sono 17, di cui 16 attivi."))
    B += tab_split(["Fase", "Script", "Situazione", "Attivo"], _script_sv(), per=9)

    B.append(cap("C", "Appendice C — Le regole che l'AI rispetta sempre", P6, "cC",
                 "Sono sempre attive, anche se il profilo azienda è vecchio. Servono a evitare errori già visti nella pratica."))
    B.append(tab(["N.", "Regola, in parole semplici"], [
        ["1", "Il cliente si chiama sempre per cognome con «Sig.» o «Sig.ra» (per esempio «Sig. Rossi»). Mai solo il nome, mai nome e cognome insieme. Se il nome non è noto, si usa «Buongiorno,»."],
        ["2", "Nei WhatsApp non ci sono mai emoji o faccine: solo testo semplice."],
        ["3", "YesMobility non ha mai parlato prima con il cliente. Frasi come «la richiamo» o «come detto la volta scorsa» sono vietate. «Trattativa persa» e «ultimo richiamo» sono nomi interni delle fasi, non telefonate già fatte."],
        ["4", "Non si inventano comportamenti, stati d'animo o frasi del cliente che non siano scritti nei dati del lead. Se un motivo non è nei dati, lo script resta generico."],
        ["5", "Non si rivelano informazioni interne che il cliente non ha detto in quella telefonata (per chi è il prodotto, condizioni di salute, dettagli di sopralluoghi), anche se sono nel CRM."],
        ["6", "L'obiettivo di ogni script è chiudere la trattativa. Il sopralluogo è un passo secondario, da proporre solo a chi ha già detto sì o quasi."],
        ["7", "Il nome dell'installatore partner non si dice mai al cliente: si usa «il nostro installatore locale certificato» o «il nostro partner di zona»."],
        ["8", "Prima di rispondere l'AI rilegge ogni script riga per riga e controlla di aver rispettato tutto quanto sopra."],
    ]))
    B.append(box("nota", "Le regole complete e i testi che la Console invia all'AI si trovano nei quattro PDF della cartella <code>PDF-REGOLE-ISTRUZIONI</code>."))

    B.append(cap("D", "Appendice D — Dove si trova ogni cosa", P6, "cD",
                 "Un elenco delle cartelle e dei file più importanti dentro la cartella del progetto."))
    B += tab_split(["Cosa", "Dove", "A cosa serve"], [
        ["Console", "LEADREWORKS/src/lead-rework-console.html", "La Lead Rework Console."],
        ["Apertura Console", "LEADREWORKS/apri-console.command", "Doppio clic per aprire la Console nella finestra giusta."],
        ["Estensione Chrome", "LEADREWORKS/browser-extension", "La cartella da caricare in chrome://extensions."],
        ["App Mac", "SUGGERIMENTIVENDITA/Suggerimenti Vendita.app", "L'app per le chiamate."],
        ["Libreria suggerimenti", "SUGGERIMENTIVENDITA/schema/esempio-libreria-script.json", "Gli script della libreria live."],
        ["Guida fissa", "SUGGERIMENTIVENDITA/schema/canovaccio-rinforzo-facile-salire.json", "Il canovaccio di «Rinforzo Facile Salire»."],
        ["Versione da terminale", "SUGGERIMENTIVENDITA/avvia_sistema.command", "Per vedere i dettagli a video se qualcosa non funziona."],
        ["Riparazione permessi", "SUGGERIMENTIVENDITA/ripara_permessi.command", "Se l'app non si apre."],
        ["Creazione installer", "SUGGERIMENTIVENDITA/Crea Installer.app", "Crea il file .dmg per installare l'app in Applicazioni."],
        ["Registri", "Dentro l'app: Contents/Resources/progetto/logs", "setup.log, server.log, test_audio.log, generazione.log e le frasi raccolte."],
        ["App Android", "RUBRICA-ANDROID", "Il codice dell'app Rubrica YesMobility (l'APK si scarica da GitHub, Releases)."],
        ["Regole e istruzioni dell'AI", "PDF-REGOLE-ISTRUZIONI", "Quattro PDF con i testi inviati all'AI."],
        ["Sync", "Sync.command (cartella code)", "Allinea il Mac con GitHub."],
        ["Registro dei salvataggi", "REGISTRO-SALVATAGGI.md", "Come tornare a una versione precedente."],
        ["Manuale", "SALESASSISTANT/MANUALE UTENTE", "Questo manuale e i file per rigenerarlo."],
        ["File sperimentali", "SUGGERIMENTIVENDITA/dashboard.html, unified-dashboard.html, open-dashboard.sh", "Prove di una finestra unica con le tre schermate affiancate. Non fanno parte dell'uso normale."],
    ], per=8)
    return B

# -*- coding: utf-8 -*-
"""Parte 3 (La telefonata), Parte 4 (WhatsApp ed email, a cascata), Parte 5 (modalità stand-alone)."""
from man_lib import *
from man_lib import _ic

P3, P4, P5 = "Parte 3", "Parte 4", "Parte 5"


def blocchi():
    B = []
    # =====================================================================  PARTE 3
    B.append(cap(9, "Dall'analisi alla chiamata", P3, "c9",
                 "La telefonata è l'azione base. Quando strategia e script sono pronti, la Console passa il lead all'app Suggerimenti Vendita, che ti guida mentre parli."))
    B.append(h2("c9-invia", "9.1", "«Invia a Suggerimenti Vendita»"))
    B.append(p("Il pulsante <b>«Invia a Suggerimenti Vendita»</b> (sezione 5 della scheda Lead) manda all'app il nome, il telefono, l'email e lo <b>script del telefono</b>: "
               "sarà la guida che leggi durante la chiamata."))
    B += passi([
        "Nella sezione 5 premi <b>«Invia a Suggerimenti Vendita»</b>. Accanto compare «Inviato ✓ — apro Suggerimenti Vendita…».",
        "L'app si apre (o torna in primo piano). La <b>prima volta</b> Chrome chiede «Apri Suggerimenti Vendita.app?»: conferma.",
        "Nel menu dell'app il pulsante viola <b>«Chiamata Gestione Lead»</b> si illumina: il lead è in attesa.",
    ])
    B.append(box("nota", "Viene inviato solo lo script del <b>telefono</b>: Suggerimenti Vendita gestisce solo chiamate. Senza script telefono compare «Nessuno script TELEFONO disponibile». "
                         "La stessa icona di invio è disponibile dalla finestra di un lead dello Storico."))
    B.append(h2("c9-menu", "9.2", "Il menu e il pulsante che si illumina"))
    B.append(p("Il menu di Suggerimenti Vendita è la finestra stretta al centro dello schermo. Nel lavoro sui lead ti interessa soprattutto un pulsante."))
    B.append(fig("menu-01-intero", legend=[
        ("yes", "Chiamata YesMobility.", "Modalità stand-alone (Parte 5)."),
        ("gl", "Chiamata Gestione Lead.", "È QUESTO il pulsante del flusso: si illumina quando il lead è in attesa."),
        ("rin", "Rinforzo Facile Salire.", "Modalità stand-alone (Parte 5)."),
        ("frasi", "Rivedi frasi raccolte.", "Appendice E."),
        ("aggiungi", "Aggiungi script.", "Appendice E."),
        ("libreria", "Vedi libreria.", "Elenco degli script già inseriti."),
        ("stato", "Stato.", "Pallino verde = «ambiente pronto»."),
        ("esci", "Esci.", "Chiude l'app e ferma il sistema."),
    ], layout="side", w="62mm"))
    B.append(fig("menu-02-lead-in-attesa", w="70mm", did="«Chiamata Gestione Lead» con il bagliore: c'è un lead in attesa."))
    B.append(p("Il pulsante resta acceso finché non avvii quella chiamata. Se non si illumina il lead resta comunque in attesa e comparirà alla prossima Chiamata Gestione Lead: puoi mandarlo con calma e telefonare dopo."))
    B.append(box("nota", "Le altre due modalità del menu non fanno parte di questo flusso: si usano da sole (Parte 5)."))
    B.append(h2("c9-avvio", "9.3", "Avviare la «Chiamata Gestione Lead»"))
    B.append(box("consiglio", "Avvia il pannello <b>qualche istante prima</b> di comporre il numero. La prima volta il sistema carica il suo «cervello» (circa 15 secondi); dalle chiamate successive parte quasi subito."))
    B += passi([
        "Nel menu premi il pulsante viola <b>«Chiamata Gestione Lead»</b>.",
        "Attendi: il pannello si apre da solo in Chrome, a destra del menu. In alto a destra deve comparire <b>«connesso»</b>.",
        "La prima volta Chrome chiede il permesso del microfono: premi «Consenti».",
        "Controlla le due barre di livello (capitolo 12) e telefona.",
    ])
    B.append(p("Il pannello mostra il <b>nome e il numero</b> del lead e, nel riquadro verde, lo <b>script del telefono</b> preparato dalla Console. Sotto continuano i suggerimenti live. "
               "Il lead viene «consumato»: il pulsante viola si spegne."))
    B.append(fig("pannello-07-gestione-lead", legend=[("guida", "Guida chiamata.", "Lo script del telefono, diviso in paragrafi.")], layout="side", w="62mm"))
    B.append(box("nota", "Se prima della chiamata compare «Devi prima usare Configura ambiente» o «Devi prima usare Configura API key», il sistema non è pronto: chiedi a chi cura il sistema. "
                         "Se compare «Il sistema impiega troppo tempo ad avviarsi», riprova dopo un minuto: sta ancora caricando."))
    B.append(h2("c9-finestre", "9.4", "Le tre finestre affiancate"))
    B.append(p("Console, menu e pannello si dispongono da soli una accanto all'altra, così vedi tutto insieme senza cercare le finestre."))
    B.append(info(finestre_html()))

    B.append(cap(10, "Il pannello di chiamata", P3, "c10",
                 "Il pannello è la finestra a destra, larga il 25% dello schermo. Ecco cosa c'è e a cosa serve."))
    B.append(fig("pannello-02-in-corso", legend=[
        ("selettore", "Selettore dell'audio.", "Scegli da quale ingresso ascoltare (capitolo 12)."),
        ("connesso", "Connesso.", "Il pannello è collegato al sistema. Se si scollega riprova da solo ogni 2 secondi."),
        ("mic", "Microfono attivo.", "Verde = sta ascoltando. Se è spento premi «Avvia microfono»."),
        ("pausa", "Pausa.", "Sospende l'ascolto. Premi «Riprendi» per continuare."),
        ("termina", "Termina.", "Chiude la chiamata."),
        ("barre", "Le due barre.", "Mostrano il livello dell'audio (capitolo 12)."),
        ("lead", "Nome e numero.", "Il lead della chiamata. Mostra «—» se non c'è."),
        ("tel", "Invia a telefono.", "Manda il lead al telefono (capitolo 13)."),
        ("sugg", "Suggerimento.", "L'etichetta colorata dice in che fase della chiamata sei; sotto, il testo da dire."),
        ("frasi", "Frasi cliente.", "Le frasi del cliente, una sotto l'altra."),
    ], layout="side", w="64mm"))
    B.append(h2("c10-fasi", "10.1", "I colori delle fasi"))
    B.append(tab(["Etichetta", "Colore", "Quando"], [
        ["Apertura", "Blu", "Inizio chiamata, saluti, presentazione."],
        ["Scoperta", "Turchese", "Domande per capire il bisogno."],
        ["Presentazione", "Viola", "Spiegazione della soluzione."],
        ["Obiezioni", "Arancione", "Il cliente solleva un dubbio (prezzo, tempi, fiducia)."],
        ["Chiusura", "Verde", "Segnali di interesse e chiusura."],
    ]))

    B.append(cap(11, "La guida alla telefonata", P3, "c11",
                 "Durante la chiamata hai due aiuti insieme: lo script del lead (la strategia) e i suggerimenti che reagiscono alle parole del cliente."))
    B.append(h2("c11-guida", "11.1", "Lo script del lead: il riquadro verde"))
    B.append(p("Il riquadro verde <b>«Guida chiamata»</b> contiene lo script del telefono preparato dalla Console: è il tuo filo conduttore, già costruito sui dati del CRM e sulla strategia. "
               "Leggilo come una traccia, non parola per parola."))
    B.append(h2("c11-sugg", "11.2", "I suggerimenti che cambiano mentre il cliente parla"))
    B.append(ul([
        "All'inizio compare «In attesa del primo suggerimento…».",
        "Quando il cliente parla, il testo cambia con il suggerimento più adatto. Se lo script ha un'alternativa, compare sotto con la scritta «Alternativa:».",
        "Se nessuno script è pertinente, compare «Nessuno script pertinente per l'ultima frase.».",
        "Alcuni suggerimenti contengono parole tra parentesi quadre (per esempio [Nome] o [tempistica]): sostituiscile a voce con il dato giusto.",
    ]))
    B.append(h2("c11-obiezioni", "11.3", "Quando il cliente fa un'obiezione"))
    B.append(p("Se il cliente dice per esempio «mi sembra troppo caro», l'etichetta diventa arancione (<b>Obiezioni</b>) e compare la risposta adatta. "
               "Le obiezioni che hai acceso nella Console (capitolo 5) hanno già la loro risposta dentro lo script; i suggerimenti live coprono anche quelle che non avevi previsto."))
    B.append(h2("c11-frasi", "11.4", "Le frasi del cliente"))
    B.append(p("Nel riquadro «Frasi cliente» compaiono solo le frasi del <b>cliente</b>: la tua voce non viene mai trascritta. Le frasi si salvano sul Mac per poterle rivedere dopo (Appendice E)."))
    B.append(box("attenzione", "Poiché le frasi dei clienti vengono salvate, è buona norma informare i clienti che la chiamata può essere monitorata o registrata a fini di qualità. Verifica con chi segue la privacy in azienda."))
    B.append(h2("c11-pausa", "11.5", "Pausa e Termina"))
    B.append(fig("pannello-05-pulsanti", legend=[
        ("mic", "Microfono attivo.", "L'ascolto è in corso."),
        ("pausa", "Pausa / Riprendi.", "Sospende l'invio delle frasi: le barre di livello continuano a muoversi."),
        ("termina", "Termina.", "Chiude la chiamata e riporta in primo piano il menu."),
    ], layout="stack", w="100%"))
    B.append(p("Dopo «Termina» il pulsante diventa «Chiamata terminata» e il selettore si blocca. Per una nuova chiamata torna al menu e premi di nuovo il pulsante: il sistema resta acceso e riparte subito."))

    B.append(cap(12, "Il livello audio e gli avvisi", P3, "c12",
                 "Perché la guida funzioni, il Mac deve sentire bene il cliente. Basta guardare due barre."))
    B.append(h2("c12-barre", "12.1", "Le due barre di livello"))
    B.append(fig("pannello-03a-barre", legend=[
        ("pre", "Prima del limiter.", "Il segnale che arriva dal telefono. È quella da guardare."),
        ("post", "Dopo il limiter.", "Quello che viene trascritto. È più lunga perché il sistema la rinforza."),
    ], layout="side", w="80mm"))
    B.append(tab(["Colore", "Cosa significa"], [
        ["Verde", "Il segnale c'è ma è ancora basso."],
        ["Arancione", "Segnale forte e sano: la zona giusta per il parlato."],
        ["Rosso", "Vicino alla saturazione: abbassa il livello."],
    ]))
    B.append(h2("c12-avvisi", "12.2", "Gli avvisi"))
    B.append(fig("pannello-03-avvisi", legend=[
        ("clip", "Segnale saturo (clipping).", "Compare in rosso per 3 secondi quando il segnale tocca il massimo. Abbassa il volume del telefono o il livello di ingresso del Mac."),
        ("ingresso", "Microfono integrato in uso.", "Compare in giallo quando stai ascoltando il microfono del Mac invece dello splitter."),
    ], layout="stack", w="100%"))
    B.append(box("nota", "Con lo splitter collegato, macOS chiama il jack <b>«External Microphone (Built-in)»</b>: l'avviso giallo non deve comparire. L'avviso scatta con «Internal Microphone (Built-in)»."))
    B.append(h2("c12-passi", "12.3", "Regolare il livello, passo per passo"))
    B += passi([
        "Prepara <b>una voce che parla in modo continuo</b> sul telefono: un video, un podcast o una chiamata a un tuo secondo numero. Imposta il volume del telefono come lo userai in chiamata e poi non toccarlo.",
        "Sul Mac apri <b>Impostazioni di Sistema → Suono → Ingresso</b> e seleziona <b>External Microphone</b>.",
        "Avvia una chiamata e guarda la barra in alto, «prima del limiter».",
        "Regola il <b>volume di ingresso</b> del Mac: la barra deve oscillare tra verde e arancione, con qualche picco verso il rosso.",
        "Se resta spesso rossa o compare il clipping, <b>abbassa</b>. Se resta corta e verde, <b>alza</b>.",
    ])
    B.append(box("consiglio", "Se i suggerimenti sono giusti ma le <b>frasi trascritte</b> non corrispondono a quelle dette, quasi sempre il livello è troppo basso: porta la barra alta verso l'arancione e riprova."))
    B.append(h2("c12-disp", "12.4", "Scegliere il dispositivo"))
    B.append(fig("pannello-04-selettore", legend=[("selettore", "Selettore.", "Elenca gli ingressi audio del Mac."), ("connesso", "Connesso.", "Il pannello è collegato.")], layout="stack", w="100%"))
    B.append(ul([
        "<b>Predefinito di sistema</b> segue l'ingresso che macOS considera attivo in quel momento.",
        "Scegliendo un dispositivo preciso, la scelta resta salvata per le chiamate successive e si può cambiare anche durante la chiamata.",
        "Se la spia resta ferma mentre il cliente parla o la trascrizione è vuota, probabilmente stai ascoltando il dispositivo sbagliato: scegli «External Microphone».",
    ]))

    B.append(cap(13, "Chiamare dal telefono: «Invia a telefono»", P3, "c13",
                 "Manda nome, cognome, numero ed email del lead all'app Rubrica YesMobility del telefono Android, che lo salva in rubrica e, se vuoi, avvia la chiamata."))
    B.append(info(android_flusso_html()))
    B.append(h2("c13-dove", "13.1", "Dove trovi il pulsante"))
    B.append(tab(["Dove", "Come si chiama"], [
        ["Scheda Lead, in alto a destra", "Pulsante «Invia a telefono»"],
        ["Storico, su ogni riga", "Pulsante «Tel»"],
        ["Finestra di un lead dello Storico", "Icona della cornetta"],
        ["Pannello di chiamata", "Pulsante «Invia a telefono»"],
    ]))
    B.append(fig("console-02b-intestazione-lead", legend=[
        ("telefono", "Invia a telefono.", "Manda il lead al telefono."),
        ("crm", "CRM.", "Apre il lead sul CRM (capitolo 22)."),
    ], layout="stack", w="100%"))
    B.append(h2("c13-uso", "13.2", "Come si usa"))
    B += passi([
        "Controlla che il lead abbia un numero di telefono (altrimenti compare «Questo lead non ha un numero di telefono»).",
        "Premi <b>«Invia a telefono»</b>. Dal pannello di chiamata, la prima volta, può chiedere il codice segreto del telefono: incollalo, resta salvato.",
        "In alto a destra compare una striscia con nome e numero e la domanda <b>«Cosa faccio con questo lead?»</b>.",
        "Scegli uno dei tre pulsanti (qui sotto).",
        "Accanto al pulsante compare l'esito, che sparisce dopo pochi secondi.",
    ])
    B.append(fig("console-09-invia-telefono-conferma", legend=[
        ("salvachiama", "Salva e chiama.", "Il telefono salva il contatto e fa partire la chiamata con Lyber."),
        ("solosalva", "Solo salva.", "Il telefono salva il contatto e copia il numero, ma non chiama."),
        ("annulla", "Annulla.", "Non succede nulla."),
    ], layout="stack", w="100%"))
    B.append(tab(["Messaggio", "Cosa significa"], [
        ["Inviato: il telefono chiama ✓", "Il telefono ha ricevuto l'ordine di chiamare."],
        ["Contatto inviato al telefono ✓", "Il telefono salva il contatto."],
        ["Annullato", "Hai scelto «Annulla»."],
        ["Invio non riuscito: …", "Controlla la connessione a internet e riprova."],
    ]))
    B.append(h2("c13-telefono", "13.3", "Cosa succede sul telefono"))
    B += passi([
        "L'app normalizza il numero: se manca il prefisso aggiunge <b>+39</b>.",
        "Salva il contatto in rubrica con il nome preceduto da <b>«YM_»</b> (per esempio «YM_Mario Rossi») e lo mette nell'etichetta <b>«YesMobility»</b>. Se il numero è già in rubrica, non crea un doppione.",
        "<b>Copia il numero negli appunti.</b>",
        "Se avevi scelto «Salva e chiama», apre <b>Lyber</b> e fa partire la chiamata.",
    ])
    B.append(p("Se Android blocca l'apertura di Lyber compare una notifica <b>«Chiamata non partita»</b>: toccala per copiare il numero e chiamare con Lyber. "
               "Aprendo l'app trovi in fondo l'elenco degli ultimi <b>8 lead</b> ricevuti, con l'esito di ognuno."))
    B.append(box("nota", "Funziona se l'app Rubrica sul telefono è in ascolto con lo stesso codice segreto della Console e se Mac e telefono hanno internet."))

    B.append(cap(14, "Dopo la chiamata: segnare l'esito", P3, "c14",
                 "Appena riattacchi, registra com'è andata: serve a non perdere il filo e a decidere il passo successivo."))
    B.append(h2("c14-chiudere", "14.1", "Chiudere il pannello"))
    B.append(p("Premi <b>«Termina»</b> nel pannello: la chiamata si chiude e il menu torna in primo piano. Le frasi del cliente restano salvate per essere riviste."))
    B.append(h2("c14-spunte", "14.2", "Le spunte nello Storico"))
    B.append(p("Nello Storico ogni lead ha delle caselle da spuntare con un clic (restano salvate):"))
    B.append(tab(["Casella", "Quando spuntarla"], [
        ["Telefonata", "Hai telefonato al cliente."],
        ["WhatsApp", "Hai inviato il WhatsApp."],
        ["Email", "Hai inviato l'email."],
        ["Lav. (Lavorato)", "Hai finito con questo lead e non serve altro."],
    ]))
    B.append(h2("c14-dopo", "14.3", "Com'è andata e cosa fare dopo"))
    B += tab_split(["Com'è andata", "Cosa fare"], [
        ["Il cliente ha risposto ed è interessato", "Spunta «Telefonata». Per organizzare il sopralluogo duplica il lead con lo stato «Cliente interessato — organizzare sopralluogo» (capitolo 21): prepara anche il WhatsApp di conferma e il promemoria."],
        ["Il cliente accetta", "Duplica il lead con lo stato «Cliente accetta — chiusura vendita»: la Console prepara il testo per spiegare il passaggio all'installatore partner. Poi spunta «Lav.»."],
        ["Il cliente ha un budget limitato", "Duplica il lead con lo stato «Budget limitato — proposta alternativa»: due opzioni di prezzo."],
        ["Il cliente vuole pensarci", "Spunta «Telefonata» e rimandalo alla cascata (Parte 4): un WhatsApp o un'email di richiamo."],
        ["Il cliente non risponde", "Spunta «Telefonata» e passa a WhatsApp (Parte 4). Dopo 1-2 tentativi senza risposta usa lo stato «Cliente irraggiungibile»."],
        ["Numero non valido", "Usa lo stato «Contatto non valido — ultimo richiamo»: un solo tentativo, poi chiusura."],
    ], per=6)
    B.append(box("nota", "Lo stato di un lead già salvato non si cambia da solo: per partire con un nuovo stato <b>duplichi</b> il lead (capitolo 21), scegli il nuovo stato e rigeneri gli script. I dati restano, gli script vecchi no."))

    # =====================================================================  PARTE 4
    B.append(cap(15, "Quando passare a WhatsApp o email", P4, "c15",
                 "La telefonata viene sempre per prima. WhatsApp ed email entrano a cascata, se la telefonata non va a buon fine."))
    B.append(h2("c15-cascata", "15.1", "Perché a cascata"))
    B.append(p("Un cliente che ha chiesto informazioni vuole una risposta personale: per questo l'azione base è la voce. Se non risponde, o se la conversazione chiede un seguito scritto, "
               "il messaggio è già pronto (lo hai generato con tutti gli altri, nel capitolo 7) e si invia con un clic."))
    B.append(h2("c15-decide", "15.2", "Cosa decide il canale"))
    B.append(p("Non c'è un automatismo che manda messaggi da solo: sei tu a decidere, guidato da due cose."))
    B.append(ul([
        "<b>Le caratteristiche del lead.</b> WhatsApp richiede un <b>cellulare</b> (se il numero è fisso il pulsante non ha senso); l'email richiede un <b>indirizzo</b>. "
        "Se i recapiti mancano, il canale è spento.",
        "<b>La strategia.</b> Lo stato del lead (capitolo 5) accende da solo i canali previsti per quella situazione.",
    ]))
    B += tab_split(["Stato del lead", "Telefonata", "Cascata prevista"], [
        ["Nuovo lead da portale", "Sì", "—"],
        ["Cliente già visitato da altri", "Sì", "Email, se interessato"],
        ["Trattativa persa — recupero", "Sì", "Email con la nuova proposta"],
        ["Cliente interessato — sopralluogo", "Sì", "WhatsApp di conferma e WhatsApp promemoria"],
        ["Cliente irraggiungibile", "Sì", "WhatsApp promemoria"],
        ["Cliente accetta — chiusura", "Sì", "Email di conferma"],
    ], per=6)
    B.append(box("nota", "Puoi sempre accendere o spegnere un canale a mano nella sezione 3. Se accendi un canale che lo stato non prevede, la Console prepara uno script di apertura dello stesso canale."))
    B.append(box("attenzione", "La Console <b>non invia nulla da sola</b>: l'invio resta sempre un tuo gesto dentro WhatsApp o dentro la posta."))

    B.append(cap(16, "Invia a WhatsApp", P4, "c16",
                 "Sopra il testo di WhatsApp c'è una riga con il numero del cliente e due pulsanti: copiare e inviare."))
    B.append(fig("console-08-blocco-1", w="100%", did="Il riquadro WhatsApp: il numero, l'icona per copiare e il logo WhatsApp per aprire il messaggio."))
    B.append(h2("c16-invio", "16.1", "Inviare il messaggio"))
    B += passi([
        "Controlla il <b>numero</b> (deve essere un cellulare) e il <b>testo</b>: rileggilo e correggilo se serve.",
        "Premi il pulsante con il <b>logo verde di WhatsApp</b>, accanto al numero.",
        "Si apre <b>WhatsApp Desktop</b> con la chat del cliente e il messaggio già scritto.",
        "Rileggi il messaggio e premi <b>Invio</b> dentro WhatsApp.",
        "Torna nella Console e spunta «WhatsApp» nello Storico (capitolo 14).",
    ])
    B.append(box("nota", "Se il numero non ha il prefisso, la Console aggiunge 39 (Italia). Se manca il numero compare «Numero di telefono mancante». "
                         "Se WhatsApp Desktop non è installato, il pulsante non fa nulla."))
    B.append(h2("c16-copia", "16.2", "Copiare il testo"))
    B.append(p("L'icona dei <b>due quadratini</b> si chiama «Copia negli appunti». Copia il valore attuale, anche se lo hai modificato, e per un attimo diventa una spunta (✓). "
               "Serve se preferisci incollare il testo da un'altra parte."))
    B.append(box("consiglio", "Gli stessi pulsanti si trovano anche nella finestra di un lead dello Storico: puoi inviare il WhatsApp anche giorni dopo, senza rigenerare niente."))

    B.append(cap(17, "Invia email", P4, "c17",
                 "Il riquadro Email ha l'indirizzo, l'oggetto e il corpo del messaggio, tutti già scritti."))
    B.append(fig("console-08-blocco-2", w="100%", did="Il riquadro Email: indirizzo con icona copia e busta blu, poi Oggetto e Corpo."))
    B.append(h2("c17-invio", "17.1", "Inviare la mail"))
    B += passi([
        "Controlla <b>indirizzo</b>, <b>oggetto</b> e <b>corpo</b>: correggi quello che serve.",
        "Premi la <b>busta blu</b> (l'icona di Mail), accanto all'indirizzo.",
        "Si apre il programma di posta del Mac con destinatario, oggetto e testo già compilati.",
        "Rileggi e premi <b>Invia</b> nel programma di posta.",
        "Torna nella Console e spunta «Email» nello Storico.",
    ])
    B.append(box("nota", "Se manca l'indirizzo compare «Indirizzo email mancante». Se la busta non apre nulla, controlla che sul Mac ci sia un programma di posta predefinito."))
    B.append(box("consiglio", "Nell'email la firma «David Vannini / YesMobility.it» è già in fondo: non aggiungerne un'altra."))

    B.append(cap(18, "Il seguito: richiamare, cambiare canale, chiudere", P4, "c18",
                 "Dopo il primo giro di contatti il lead resta aperto finché non lo chiudi tu."))
    B.append(h2("c18-segna", "18.1", "Tenere traccia"))
    B.append(p("Ogni volta che usi un canale spunta la casella corrispondente nello Storico (Telefonata, WhatsApp, Email). Colpo d'occhio: sai subito quali lead hanno già ricevuto cosa."))
    B.append(h2("c18-richiama", "18.2", "Riprendere un lead dopo qualche giorno"))
    B += passi([
        "Apri lo Storico e trova il lead (capitolo 21).",
        "Premi l'icona dei <b>due quadratini</b> (Duplica): i dati tornano nella scheda Lead, con stato e obiezioni, pronti per nuovi script.",
        "Se la situazione è cambiata, scegli un altro stato nella sezione 3 e rigenera.",
        "Riparti dal capitolo 9: telefonata e, se serve, cascata.",
    ])
    B.append(h2("c18-chiudi", "18.3", "Chiudere il lead"))
    B.append(p("Quando hai finito spunta <b>«Lav.»</b> (Lavorato). Con «Nascondi lavorati» (capitolo 21) i lead chiusi spariscono dall'elenco e vedi solo quelli ancora da lavorare."))
    B.append(box("consiglio", "Nel CRM, riapri il lead con il pulsante «CRM» (capitolo 22) per aggiornare lì l'esito della trattativa."))

    # =====================================================================  PARTE 5
    B.append(cap(19, "«Chiamata YesMobility»: solo obiezioni", P5, "c19",
                 "Una modalità che si usa da sola, senza passare dall'analisi del lead e senza la guida alla telefonata."))
    B.append(h2("c19-cosa", "19.1", "Cosa fa"))
    B.append(p("<b>«Chiamata YesMobility»</b> gestisce <b>le sole obiezioni</b>: ascolta la voce del cliente e, quando solleva un dubbio (prezzo, tempi, fiducia…), "
               "ti mostra la risposta adatta. Non c'è nessuna guida alla telefonata: il riquadro verde «Guida chiamata» non compare."))
    B.append(h2("c19-quando", "19.2", "Quando usarla"))
    B.append(ul([
        "Quando telefoni a un cliente senza aver preparato il lead nella Console.",
        "Quando conosci già la telefonata e ti serve solo un aiuto sulle obiezioni.",
    ]))
    B.append(box("nota", "Un eventuale lead in attesa non viene toccato: resta pronto per la prossima «Chiamata Gestione Lead»."))
    B.append(h2("c19-uso", "19.3", "Come si avvia"))
    B += passi([
        "Nel menu di Suggerimenti Vendita premi <b>«Chiamata YesMobility»</b>.",
        "Attendi che il pannello si apra in Chrome e che in alto a destra compaia <b>«connesso»</b>.",
        "Controlla le barre di livello (capitolo 12) e telefona: le risposte alle obiezioni compaiono nel pannello man mano che il cliente parla.",
        "A fine chiamata premi <b>«Termina»</b>.",
    ])
    B.append(fig("pannello-02-in-corso", w="64mm", did="Il pannello in modalità «Chiamata YesMobility»: nessun riquadro verde, solo suggerimenti e frasi del cliente."))

    B.append(cap(20, "«Rinforzo Facile Salire»: la guida fissa", P5, "c20",
                 "Anche questa modalità si usa da sola. Dà una guida fissa alla telefonata, pensata per rafforzare l'immagine di Facile Salire agli occhi del lead."))
    B.append(h2("c20-cosa", "20.1", "Cosa fa"))
    B.append(p("<b>«Rinforzo Facile Salire»</b> mostra subito, nel riquadro verde, una <b>guida fissa</b>, uguale per ogni chiamata: non dipende dalla Console né dal lead. "
               "Sotto continuano i suggerimenti live."))
    B.append(fig("pannello-08-rinforzo", legend=[("guida", "Guida fissa.", "Il canovaccio «Rinforzo Facile Salire».")], layout="side", w="62mm"))
    B.append(h2("c20-guida", "20.2", "Cosa dice la guida"))
    B.append(p("La guida è un canovaccio di apertura in sette paragrafi, da dire con parole tue:"))
    B += passi([
        "Presentarti: sei David di YesMobility, comparatore di montascale.",
        "Spiegare perché chiami: avete ricevuto la richiesta online per poltroncina o pedana montascale.",
        "Dire che chiami per capire meglio di cosa ha bisogno il cliente.",
        "Normalizzare la situazione: «immagino che sia già stata contattata da altri colleghi».",
        "Spiegare chi è YesMobility: un'azienda che studia le esigenze del cliente per proporre le soluzioni più convenienti, con il miglior servizio disponibile.",
        "Rinforzare Facile Salire: per le sue esigenze e per la sua zona, la gestione sarà affidata a Facile Salire, azienda produttrice con sede a Pontedera, che cura installazione e assistenza in modo esemplare ed è tra le prime 3 in Italia per prestazioni di assistenza.",
        "Offrire di metterti tu in contatto con Facile Salire, per intercedere e far ottenere al cliente anche il prezzo migliore.",
    ])
    B.append(h2("c20-uso", "20.3", "Quando usarla e come si avvia"))
    B.append(p("Usala per i lead da rinforzare nella fiducia verso Facile Salire. Nel menu premi <b>«Rinforzo Facile Salire»</b>, attendi «connesso» nel pannello e telefona."))
    B.append(box("nota", "La guida non dipende dal lead: non occorre preparare nulla nella Console. Per un lead lavorato a fondo usa invece la «Chiamata Gestione Lead» (capitolo 9)."))
    return B

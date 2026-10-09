# -*- coding: utf-8 -*-
"""Parte 3 (La telefonata), Parte 4 (WhatsApp ed email, a cascata), Parte 5 (modalità stand-alone)."""
from man_lib import *
from man_lib import _ic

P3, P4, P5 = "Parte 3", "Parte 4", "Parte 5"


def blocchi():
    B = []
    # =====================================================================  PARTE 3
    B.append(cap(None, "Dall'analisi alla chiamata", P3, "c-chiamata",
                 "La telefonata è l'azione base. Quando strategia e script sono pronti, la Console passa il lead a Suggerimenti Vendita, che ti guida mentre parli."))
    B.append(info(flusso_chiamata_html()))
    B.append(info(azione_risultato(["Nella Console premi «Invia a Suggerimenti Vendita».", "Nel menu premi il pulsante viola «Chiamata Gestione Lead».", "Telefona."],
                                   ["Il pulsante viola si illumina: il lead è in attesa.", "Il pannello si apre con nome, numero e script del lead.", "I suggerimenti compaiono mentre il cliente parla."])))
    B.append(h2("c-chiamata-invia", None, "Passo 1: «Invia a Suggerimenti Vendita»"))
    B += passi([
        "Nella sezione 5 della Console premi <b>«Invia a Suggerimenti Vendita»</b>. Accanto compare «Inviato ✓ — apro Suggerimenti Vendita…».",
        "L'app si apre (o torna in primo piano). La <b>prima volta</b> Chrome chiede «Apri Suggerimenti Vendita.app?»: conferma.",
        "Nel menu dell'app il pulsante viola <b>«Chiamata Gestione Lead»</b> si illumina: il lead è in attesa.",
    ])
    B.append(box("nota", "Viene inviato solo lo script del <b>telefono</b>. Se non c'è compare «Nessuno script TELEFONO disponibile». Il lead resta in attesa finché non avvii la chiamata: puoi mandarlo con calma e telefonare dopo."))
    B.append(h2("c-chiamata-avvio", None, "Passo 2: avviare la «Chiamata Gestione Lead»"))
    B += passi([
        "Nel menu premi il pulsante viola <b>«Chiamata Gestione Lead»</b>.",
        "Attendi: il pannello si apre da solo in Chrome, a destra del menu. In alto a destra deve comparire <b>«connesso»</b>.",
        "La prima volta Chrome chiede il permesso del microfono: premi «Consenti».",
        "Telefona: il riquadro verde mostra la guida e sotto compaiono i suggerimenti.",
    ])
    B.append(box("consiglio", "Avvia il pannello <b>qualche istante prima</b> di comporre il numero. La prima volta ci vogliono circa 15 secondi; dalle chiamate successive parte quasi subito."))
    B.append(fig2("menu-02-lead-in-attesa", "<b>1.</b> Nel menu il pulsante viola «Chiamata Gestione Lead» si illumina: il lead è in attesa.",
                  "pannello-07-gestione-lead", "<b>2.</b> Premendolo si apre il pannello, con nome, numero e la guida del lead nel riquadro verde.", w="52mm"))
    B.append(h2("c-chiamata-menu", None, "Il menu di Suggerimenti Vendita"))
    B.append(p("Nel lavoro sui lead ti serve un solo pulsante, quello viola. Gli altri servono per le modalità stand-alone (Parte 5) o per chi cura il sistema."))
    B.append(fig("menu-01-intero", legend=[
        ("yes", "Chiamata YesMobility.", "Modalità stand-alone (capitolo {c:c-yes})."),
        ("gl", "Chiamata Gestione Lead.", "È IL pulsante del flusso: si illumina quando il lead è in attesa."),
        ("rin", "Rinforzo Facile Salire.", "Modalità stand-alone (capitolo {c:c-rinforzo})."),
        ("libreria", "Vedi libreria.", "Elenco degli script già inseriti."),
        ("esci", "Esci.", "Chiude l'app."),
    ], layout="side", w="62mm"))
    B.append(box("nota", "Se compare «Devi prima usare Configura ambiente» o «Devi prima usare Configura API key», il sistema non è pronto: chiedi a chi cura il sistema. "
                         "Se compare «Il sistema impiega troppo tempo ad avviarsi», riprova dopo un minuto."))

    B.append(cap(None, "Il pannello di chiamata", P3, "c-pannello",
                 "La finestra a destra dello schermo: ci sono il lead, la guida e i suggerimenti. Ecco cosa c'è e come si usa."))
    B.append(fig("pannello-02-in-corso", legend=[
        ("selettore", "Ingresso audio.", "Da dove il Mac ascolta il cliente."),
        ("connesso", "Connesso.", "Il pannello è collegato. Se si scollega riprova da solo."),
        ("mic", "Microfono attivo.", "Verde = sta ascoltando."),
        ("pausa", "Pausa.", "Sospende l'ascolto; «Riprendi» per continuare."),
        ("termina", "Termina.", "Chiude la chiamata."),
        ("lead", "Nome e numero.", "Il lead della chiamata."),
        ("tel", "Invia a telefono.", "Manda il lead al telefono (vedi sotto)."),
        ("sugg", "Suggerimento.", "L'etichetta colorata dice la fase; sotto, il testo da dire."),
        ("frasi", "Frasi cliente.", "Quello che dice il cliente, una frase sotto l'altra."),
    ], layout="side", w="64mm"))
    B.append(h2("c-pannello-pausa", None, "Pausa e Termina"))
    B.append(fig("pannello-05-pulsanti", legend=[
        ("mic", "Microfono attivo.", "L'ascolto è in corso."),
        ("pausa", "Pausa / Riprendi.", "Sospende l'ascolto delle frasi."),
        ("termina", "Termina.", "Chiude la chiamata e riporta in primo piano il menu."),
    ], layout="stack", w="100%"))
    B.append(p("Dopo «Termina» il pulsante diventa «Chiamata terminata». Per una nuova chiamata torna al menu e premi di nuovo il pulsante: riparte subito."))
    B.append(h2("c-pannello-audio", None, "Scegliere l'ingresso audio"))
    B.append(fig("pannello-04-selettore", legend=[("selettore", "Selettore.", "Elenca gli ingressi audio del Mac."), ("connesso", "Connesso.", "Il pannello è collegato.")], layout="stack", w="100%"))
    B.append(ul([
        "Con lo splitter collegato scegli <b>«External Microphone»</b>: è l'ingresso da cui arriva la voce del cliente.",
        "La scelta resta salvata per le chiamate successive e si può cambiare anche durante la chiamata.",
        "Se la trascrizione resta vuota mentre il cliente parla, probabilmente l'ingresso scelto è quello sbagliato.",
    ]))
    B.append(h2("c-pannello-tel-dove", None, "«Invia a telefono»: dove trovi il pulsante"))
    B.append(info(android_flusso_html()))
    B.append(p("«Invia a telefono» manda nome, numero ed email del lead all'app Rubrica YesMobility del telefono Android, che lo salva in rubrica e, se vuoi, avvia la chiamata."))
    B.append(tab(["Dove", "Come si chiama"], [
        ["Scheda Lead, in alto a destra", "Pulsante «Invia a telefono»"],
        ["Storico, su ogni riga", "Pulsante «Tel»"],
        ["Finestra di un lead dello Storico", "Icona della cornetta"],
        ["Pannello di chiamata", "Pulsante «Invia a telefono»"],
    ]))
    B.append(fig("console-02b-intestazione-lead", legend=[
        ("telefono", "Invia a telefono.", "Manda il lead al telefono."),
        ("crm", "CRM.", "Apre il lead sul CRM (capitolo {c:c-crm})."),
    ], layout="stack", w="100%"))
    B.append(h2("c-pannello-tel-uso", None, "«Invia a telefono»: come si usa"))
    B.append(info(azione_risultato(["Premi «Invia a telefono».", "Scegli «Salva e chiama», «Solo salva» o «Annulla»."],
                                   ["Il contatto salvato in rubrica sul telefono.", "Con «Salva e chiama» parte anche la chiamata con Lyber."])))
    B.append(fig("console-09-invia-telefono-conferma", legend=[
        ("salvachiama", "Salva e chiama.", "Salva il contatto e fa partire la chiamata con Lyber."),
        ("solosalva", "Solo salva.", "Salva il contatto e copia il numero, senza chiamare."),
        ("annulla", "Annulla.", "Non succede nulla."),
    ], layout="stack", w="100%"))
    B.append(h2("c-pannello-tel-telefono", None, "«Invia a telefono»: cosa succede sul telefono"))
    B += passi([
        "L'app aggiunge <b>+39</b> se manca il prefisso.",
        "Salva il contatto con il nome preceduto da <b>«YM_»</b> (per esempio «YM_Mario Rossi») nell'etichetta <b>«YesMobility»</b>, senza doppioni.",
        "<b>Copia il numero negli appunti.</b>",
        "Con «Salva e chiama» apre <b>Lyber</b> e fa partire la chiamata.",
    ])
    B.append(box("nota", "Il lead deve avere un numero (altrimenti compare «Questo lead non ha un numero di telefono»). Dal pannello di chiamata, la prima volta, può chiedere il codice segreto del telefono: incollalo, resta salvato. Se Android blocca Lyber compare la notifica «Chiamata non partita»: toccala per copiare il numero e chiamare."))

    B.append(cap(None, "La guida alla telefonata", P3, "c-guida",
                 "Durante la chiamata hai due aiuti insieme: lo script del lead e i suggerimenti che reagiscono alle parole del cliente."))
    B.append(info(azione_risultato(["Leggi lo script nel riquadro verde.", "Guarda il suggerimento quando il cliente parla."],
                                   ["Una traccia già costruita sulla strategia del lead.", "La risposta giusta a ogni obiezione, nel momento in cui serve."])))
    B.append(h2("c-guida-fasi", None, "I colori delle fasi"))
    B.append(tab(["Etichetta", "Colore", "Quando"], [
        ["Apertura", "Blu", "Inizio chiamata, saluti, presentazione."],
        ["Scoperta", "Turchese", "Domande per capire il bisogno."],
        ["Presentazione", "Viola", "Spiegazione della soluzione."],
        ["Obiezioni", "Arancione", "Il cliente solleva un dubbio (prezzo, tempi, fiducia)."],
        ["Chiusura", "Verde", "Segnali di interesse e chiusura."],
    ]))
    B.append(h2("c-guida-script", None, "Lo script del lead: il riquadro verde"))
    B.append(p("Il riquadro <b>«Guida chiamata»</b> contiene lo script del telefono preparato dalla Console: è il tuo filo conduttore. Leggilo come una traccia, non parola per parola."))
    B.append(h2("c-guida-sugg", None, "I suggerimenti che cambiano mentre il cliente parla"))
    B.append(ul([
        "All'inizio compare «In attesa del primo suggerimento…».",
        "Quando il cliente parla, il testo cambia con il suggerimento più adatto; se c'è un'alternativa compare sotto, con «Alternativa:».",
        "Se nessuno script è pertinente compare «Nessuno script pertinente per l'ultima frase.».",
        "Le parole tra parentesi quadre (per esempio [Nome]) vanno sostituite a voce con il dato giusto.",
    ]))
    B.append(h2("c-guida-obiezioni", None, "Quando il cliente fa un'obiezione"))
    B.append(p("Se il cliente dice per esempio «mi sembra troppo caro», l'etichetta diventa arancione (<b>Obiezioni</b>) e compare la risposta adatta. "
               "Le obiezioni accese nella Console (capitolo {c:c-stato}) hanno già la risposta dentro lo script; i suggerimenti live coprono anche quelle impreviste."))
    B.append(h2("c-guida-frasi", None, "Le frasi del cliente"))
    B.append(p("Nel riquadro «Frasi cliente» compaiono solo le frasi del <b>cliente</b>: la tua voce non viene mai trascritta. Le frasi si salvano sul Mac per poterle rivedere dopo (Appendice E)."))
    B.append(box("attenzione", "Poiché le frasi dei clienti vengono salvate, è buona norma informare i clienti che la chiamata può essere monitorata o registrata a fini di qualità. Verifica con chi segue la privacy in azienda."))

    B.append(cap(None, "Dopo la chiamata: segnare l'esito", P3, "c-dopo",
                 "Appena riattacchi, registra com'è andata: serve a non perdere il filo e a decidere il passo successivo."))
    B.append(info(azione_risultato(["Premi «Termina» nel pannello.", "Spunta le caselle nello Storico."],
                                   ["La chiamata chiusa e le frasi salvate.", "Il lead aggiornato: sai sempre a che punto sei."])))
    B.append(p("Nello Storico spunta con un clic <b>Telefonata</b>, <b>WhatsApp</b> o <b>Email</b> quando li hai usati, e <b>Lav.</b> (Lavorato) quando hai finito con il lead: le spunte restano salvate."))
    B.append(h2("c-dopo-esito", None, "Com'è andata e cosa fare dopo"))
    B += tab_split(["Com'è andata", "Cosa fare"], [
        ["Il cliente è interessato", "Duplica il lead con lo stato «Cliente interessato — organizzare sopralluogo»: prepara anche WhatsApp di conferma e promemoria."],
        ["Il cliente accetta", "Duplica il lead con lo stato «Cliente accetta — chiusura vendita». Poi spunta «Lav.»."],
        ["Budget limitato", "Duplica il lead con lo stato «Budget limitato — proposta alternativa»."],
        ["Vuole pensarci", "Spunta «Telefonata» e passa alla cascata (capitolo {c:c-cascata})."],
        ["Non risponde", "Spunta «Telefonata» e passa a WhatsApp (capitolo {c:c-cascata}). Dopo 1-2 tentativi usa lo stato «Cliente irraggiungibile»."],
        ["Numero non valido", "Stato «Contatto non valido — ultimo richiamo»: un solo tentativo, poi chiusura."],
    ], per=6)
    B.append(box("nota", "Lo stato di un lead salvato non si cambia da solo: per ripartire con un nuovo stato <b>duplichi</b> il lead (capitolo {c:c-storico}), scegli lo stato e rigeneri gli script."))

    # =====================================================================  PARTE 4
    B.append(cap(None, "La cascata: telefono, WhatsApp, email", P4, "c-cascata",
                 "Si parte sempre dalla telefonata. Se il cliente non risponde si passa a WhatsApp; se non risponde nemmeno a WhatsApp, all'email."))
    B.append(h2("c-cascata-come", None, "Come funziona"))
    B.append(info(cascata_contatti_html()))
    B.append(info(azione_risultato(["Telefoni al cliente.", "Se non risponde: invii il WhatsApp.", "Se non risponde nemmeno a WhatsApp: invii l'email."],
                                   ["Ogni messaggio è già scritto.", "Si invia con un clic.", "Nessuno parte da solo."])))
    B.append(h2("c-cascata-chi", None, "Quando un canale è disponibile"))
    B.append(ul([
        "<b>WhatsApp</b> richiede un <b>cellulare</b>: se il numero è fisso non si può usare.",
        "<b>Email</b> richiede un <b>indirizzo</b>: se manca, il canale è spento.",
        "Lo stato del lead (capitolo {c:c-stato}) accende da solo i canali previsti per quella situazione; puoi sempre accenderli o spegnerli a mano.",
    ]))
    B.append(box("attenzione", "La Console <b>non invia nulla da sola</b>: l'invio resta sempre un tuo gesto dentro WhatsApp o dentro la posta."))

    B.append(cap(None, "Invia a WhatsApp", P4, "c-wa",
                 "Sopra il testo di WhatsApp c'è una riga con il numero del cliente e due pulsanti: copiare e inviare."))
    B.append(info(azione_risultato(["Controlla numero e testo.", "Premi il logo verde di WhatsApp.", "Premi Invio dentro WhatsApp."],
                                   ["WhatsApp Desktop si apre sulla chat del cliente.", "Con il messaggio già scritto."])))
    B.append(fig("console-08-blocco-1", w="100%", did="Il riquadro WhatsApp: il numero, l'icona per copiare e il logo WhatsApp per aprire il messaggio."))
    B += passi([
        "Controlla il <b>numero</b> (deve essere un cellulare) e il <b>testo</b>: correggilo se serve.",
        "Premi il <b>logo verde di WhatsApp</b> accanto al numero: si apre <b>WhatsApp Desktop</b> con la chat e il messaggio già scritto.",
        "Rileggi e premi <b>Invio</b> dentro WhatsApp. Poi spunta «WhatsApp» nello Storico.",
    ])
    B.append(box("nota", "Se il numero non ha il prefisso la Console aggiunge 39 (Italia); se manca compare «Numero di telefono mancante». Gli stessi pulsanti sono nella finestra di un lead dello Storico: puoi inviare anche giorni dopo."))


    B.append(cap(None, "Invia email", P4, "c-mail",
                 "Il riquadro Email ha l'indirizzo, l'oggetto e il corpo del messaggio, tutti già scritti."))
    B.append(info(azione_risultato(["Controlla indirizzo, oggetto e corpo.", "Premi la busta blu.", "Premi Invia nel programma di posta."],
                                   ["Il programma di posta del Mac si apre.", "Con destinatario, oggetto e testo già compilati."])))
    B.append(fig("console-08-blocco-2", w="100%", did="Il riquadro Email: indirizzo con icona copia e busta blu, poi Oggetto e Corpo."))
    B += passi([
        "Controlla <b>indirizzo</b>, <b>oggetto</b> e <b>corpo</b>: correggi quello che serve.",
        "Premi la <b>busta blu</b>: si apre la posta del Mac con tutto già compilato. Rileggi e premi <b>Invia</b>, poi spunta «Email» nello Storico.",
    ])

    B.append(cap(None, "Il seguito: richiamare, cambiare canale, chiudere", P4, "c-seguito",
                 "Dopo il primo giro di contatti il lead resta aperto finché non lo chiudi tu."))
    B.append(info(azione_risultato(["Spunta i canali usati.", "Per riprovare, duplica il lead.", "Quando hai finito, spunta «Lav.»."],
                                   ["Un colpo d'occhio su cosa ha già ricevuto ogni lead.", "Con «Nascondi lavorati» vedi solo quelli da lavorare."])))
    B.append(h2("c-seguito-richiama", None, "Riprendere un lead dopo qualche giorno"))
    B += passi([
        "Apri lo Storico e trova il lead (capitolo {c:c-storico}).",
        "Premi l'icona dei <b>due quadratini</b> (Duplica): i dati tornano nella scheda Lead, pronti per nuovi script.",
        "Se la situazione è cambiata, scegli un altro stato e rigenera.",
        "Riparti dalla telefonata (capitolo {c:c-chiamata}).",
    ])
    B.append(box("consiglio", "Riapri il lead sul CRM con il pulsante «CRM» (capitolo {c:c-crm}) per aggiornare lì l'esito della trattativa."))

    # =====================================================================  PARTE 5
    B.append(cap(None, "«Chiamata YesMobility»: solo obiezioni", P5, "c-yes",
                 "Una modalità che si usa da sola, senza passare dall'analisi del lead e senza la guida alla telefonata."))
    B.append(info(azione_risultato(["Nel menu premi «Chiamata YesMobility».", "Telefona."],
                                   ["Il pannello ascolta il cliente.", "Quando fa un'obiezione compare la risposta adatta.", "Nessuna guida: il riquadro verde non c'è."])))
    B.append(p("<b>«Chiamata YesMobility»</b> gestisce <b>le sole obiezioni</b>. Usala quando telefoni senza aver preparato il lead nella Console, o quando ti serve solo un aiuto sulle obiezioni. "
               "Un eventuale lead in attesa non viene toccato: resta pronto per la prossima «Chiamata Gestione Lead»."))
    B.append(fig("pannello-02-in-corso", w="44mm", did="Il pannello in modalità «Chiamata YesMobility»: nessun riquadro verde, solo suggerimenti e frasi del cliente."))

    B.append(cap(None, "«Rinforzo Facile Salire»: la guida fissa", P5, "c-rinforzo",
                 "Anche questa modalità si usa da sola. Dà una guida fissa alla telefonata, pensata per rafforzare l'immagine di Facile Salire agli occhi del lead."))
    B.append(info(azione_risultato(["Nel menu premi «Rinforzo Facile Salire».", "Telefona seguendo la guida."],
                                   ["Una guida fissa nel riquadro verde, uguale per ogni chiamata.", "I suggerimenti live sotto."])))
    B.append(fig("pannello-08-rinforzo", legend=[("guida", "Guida fissa.", "Il canovaccio «Rinforzo Facile Salire».")], layout="side", w="62mm"))
    B.append(h2("c-rinforzo-guida", None, "Cosa dice la guida"))
    B.append(p("È un canovaccio di apertura in sette paragrafi, da dire con parole tue:"))
    B += passi([
        "Presentarti: sei David di YesMobility, comparatore di montascale.",
        "Spiegare perché chiami: avete ricevuto la richiesta online per poltroncina o pedana montascale.",
        "Dire che chiami per capire meglio di cosa ha bisogno il cliente.",
        "Normalizzare: «immagino che sia già stata contattata da altri colleghi».",
        "Spiegare chi è YesMobility: studia le esigenze del cliente per proporre le soluzioni più convenienti, con il miglior servizio disponibile.",
        "Rinforzare Facile Salire: la gestione sarà affidata a Facile Salire, azienda produttrice con sede a Pontedera, che cura installazione e assistenza in modo esemplare ed è tra le prime 3 in Italia per assistenza.",
        "Offrire di metterti tu in contatto con Facile Salire, per intercedere e far ottenere al cliente anche il prezzo migliore.",
    ])
    B.append(box("nota", "La guida non dipende dal lead: non occorre preparare nulla nella Console. Per un lead lavorato a fondo usa invece la «Chiamata Gestione Lead» (capitolo {c:c-chiamata})."))
    return B

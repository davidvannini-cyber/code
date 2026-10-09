# -*- coding: utf-8 -*-
"""Parte 1 (Raccolta dati dal CRM) e Parte 2 (Strategia e script).
Il manuale segue il percorso reale di un lead, a partire dal pulsante «Invia a Lead Rework Console» dell'estensione."""
from man_lib import *
from man_lib import _ic

P1 = "Parte 1"
P2 = "Parte 2"


def blocchi():
    B = []
    # =====================================================================  PARTE 1
    B.append(cap(1, "Il pulsante da cui parte tutto", P1, "c1",
                 "Ogni lead si lavora partendo da un solo gesto: il pulsante blu «Invia a Lead Rework Console», che l'estensione mette sulla pagina del lead nel CRM."))
    B.append(h2("c1-dove", "1.1", "Dove si trova"))
    B.append(p("Quando apri la pagina di un lead sul <b>CRM Facile Salire</b> (l'indirizzo comincia con <code>app.facilesalire.it/leads/</code>), "
               "in basso a destra compare un pulsante blu, sempre visibile anche scorrendo la pagina:"))
    B.append(fig_crm(False))
    B.append(box("nota", "Il disegno è una rappresentazione della pagina del CRM: quello che conta è il <b>pulsante blu in basso a destra</b>. "
                         "Il pulsante c'è solo sulle pagine di dettaglio di un lead, non sull'elenco dei lead."))
    B.append(h2("c1-clic", "1.2", "Cosa succede quando lo premi"))
    B += passi([
        "Apri la pagina del lead da lavorare sul CRM.",
        "Premi il pulsante blu <b>«📤 Invia a Lead Rework Console»</b>.",
        "Per un attimo il pulsante diventa verde e dice <b>«✓ Inviato»</b>: i dati del lead sono partiti.",
        "La <b>Lead Rework Console</b> si apre da sola (se era già aperta torna in primo piano e si aggiorna) e i campi si riempiono senza che tu scriva niente.",
        "Compare la scritta <b>«Dati importati dal CRM ✓»</b>. Subito dopo l'intelligenza artificiale comincia a studiare il lead (Parte 2).",
    ])
    B.append(fig_crm(True))
    B.append(box("consiglio", "Non serve copiare, incollare o scaricare nulla dal CRM. Un clic sul pulsante e il lavoro comincia."))
    B.append(h2("c1-vecchi", "1.3", "Se compare un avviso sui dati vecchi"))
    B.append(p("Se passi da un lead all'altro cliccando dentro il CRM, senza ricaricare la pagina, i dati letti potrebbero essere ancora quelli del lead precedente. "
               "L'estensione se ne accorge e <b>non invia mai i dati sbagliati</b>: ricarica la pagina una volta da sola e poi invia."))
    B.append(p("Se compare comunque l'avviso <i>«Impossibile leggere i dati di questa pagina»</i>, premi <b>F5</b> sulla pagina del CRM e premi di nuovo il pulsante blu."))

    B.append(cap(2, "Cosa raccoglie dal CRM con un solo clic", P1, "c2",
                 "La raccolta dati è la base di tutto il resto: più il lead è conosciuto, più la strategia e gli script sono precisi."))
    B.append(h2("c2-dati", "2.1", "I dati che vengono letti"))
    B.append(p("Il CRM ha già tutto nella pagina del lead: non serve aprire le varie schede (Attività, Offerte, Note). L'estensione legge in un colpo solo:"))
    B += tab_split(["Dato", "Cosa viene letto", "A cosa serve nella strategia"], [
        ["Nome e cognome", "Nome e cognome del lead.", "Gli script chiamano il cliente per cognome («Sig. Rossi»)."],
        ["Telefono ed email", "I recapiti del lead.", "Decidono quali canali si accendono: WhatsApp se c'è un cellulare, Email se c'è un indirizzo."],
        ["Zona e indirizzo", "La città e l'indirizzo.", "Per i messaggi sul sopralluogo e per capire la zona."],
        ["Prodotto", "Montascale, Pedana o Elevatore, scelto dal nome del prodotto del CRM.", "Adatta gli argomenti dello script."],
        ["Note", "Le note scritte sul lead.", "L'AI le legge per capire situazione e bisogno del cliente."],
        ["Storico contatti", "Tutte le attività: tipo, data e testo di ognuna.", "È la <b>storia del lead</b>: cosa è già successo, con chi, quando."],
        ["Offerta esistente", "L'importo della prima offerta.", "Fa capire se c'è un confronto di prezzo e di quanto."],
        ["Motivo del rifiuto", "Il motivo per cui l'offerta è stata persa, se indicato.", "È la leva principale per i lead da recuperare."],
        ["Appuntamento", "Data e orario dell'ultima attività di tipo «Visita».", "Serve ai messaggi di conferma e di promemoria."],
        ["Data di assegnazione", "Quando il lead è stato assegnato a YesMobility.", "Diventa la data del lead nello Storico."],
        ["Codice del lead", "Il numero del lead sul CRM.", "Permette di riaprire il lead con il pulsante «CRM» (capitolo 22)."],
    ], per=6)
    B.append(h2("c2-non", "2.2", "Cosa non arriva dal CRM"))
    B.append(p("Lo <b>stato del lead</b> (a che punto è la trattativa), le <b>obiezioni</b> e la <b>strategia</b> non esistono nel CRM. "
               "Li ricava l'intelligenza artificiale studiando i dati appena raccolti: è il lavoro della Parte 2."))
    B.append(box("consiglio", "Più il CRM è aggiornato, meglio lavora la Console. Prima di premere il pulsante, controlla che note e attività del lead siano complete: "
                              "tutto quello che è scritto sul CRM entra nello studio della strategia."))

    B.append(cap(3, "Il lead arriva nella Console", P1, "c3",
                 "Dopo il clic i campi sono già compilati. Prima di andare avanti conviene dare un'occhiata ai dati."))
    B.append(h2("c3-barra", "3.1", "Orientarsi nella Console"))
    B.append(p("La Console è una pagina in Chrome. In alto ci sono tre schede: <b>Lead</b> (dove lavori), <b>Storico Lead</b> (i lead già salvati) e <b>Profilo Azienda</b> (impostazioni, già a posto)."))
    B.append(fig("console-02-barra-alto", legend=[
        ("lead", "Lead.", "Qui lavori un lead: dati, strategia, script."),
        ("storico", "Storico Lead.", "L'elenco dei lead già salvati."),
        ("profilo", "Profilo Azienda.", "Impostazioni: non servono nel lavoro di tutti i giorni."),
        ("stato", "Pallino di stato.", "Arancione = i dati sono salvati su questo Mac, nel browser. È normale."),
    ], layout="stack", w="100%"))
    B.append(h2("c3-campi", "3.2", "Controllare i dati importati"))
    B.append(p("La scheda Lead è divisa in cinque sezioni numerate. La sezione <b>«2. Dati lead»</b> contiene quello che è arrivato dal CRM: leggila prima di generare gli script."))
    B.append(fig("console-04a-dati-lead-chiuso", legend=[
        ("nome", "Nome cliente.", "Nome e cognome, per esempio «Mario Rossi»."),
        ("prodotto", "Prodotto.", "Montascale, Pedana o Elevatore."),
        ("zona", "Zona.", "La città."),
        ("tel1", "Numero di telefono.", "Il numero principale."),
        ("tel2", "Telefono secondario.", "Un secondo numero, se c'è."),
        ("email", "Indirizzo email.", "Se c'è, si attiva da solo il canale Email."),
        ("prezzo", "Prezzo esistente.", "L'importo dell'offerta già fatta."),
        ("motivo", "Motivazione rifiuto.", "Perché ha detto di no, se è noto."),
        ("tempistica", "Tempistica indicativa.", "Per esempio «3-4 settimane»."),
        ("note", "Note.", "Il campo si allunga da solo."),
        ("storico", "Storico contatti precedenti.", "Cosa è già successo con questo cliente."),
        ("appuntamento", "Dettagli appuntamento.", "Apre i campi data, orario e indirizzo."),
    ], layout="stack", w="100%", pos={"appuntamento": "l"}))
    B.append(box("attenzione", "<b>Nome e cognome.</b> La Console chiama il cliente per cognome («Sig. Rossi», «Sig.ra Verdi») e capisce il genere dal nome. "
                               "Se sul CRM il nome è scritto «Cognome Nome», controlla gli script: l'automatismo può sbagliare."))
    B.append(box("consiglio", "Controlla sempre <b>Prodotto</b> e <b>Appuntamento</b>: l'abbinamento è fatto per parole chiave e con prodotti insoliti può non essere perfetto."))
    B.append(h2("c3-ambra", "3.3", "I campi ambrati"))
    B.append(p("Quando un dato non si trova, il campo diventa <b>ambrato</b>. Significa «controlla qui». Appena scrivi qualcosa il colore sparisce; se un campo ambrato non ti serve, lascialo vuoto."))
    B.append(fig("console-04b-campi-ambra", w="100%", did="I campi ambrati sono quelli che non sono stati trovati: Zona, Prezzo esistente e Tempistica."))
    B.append(h2("c3-appunt", "3.4", "L'appuntamento o il sopralluogo"))
    B.append(p("Premi «Dettagli appuntamento / sopralluogo (opzionali)» per aprire tre campi: <b>Data</b> (per esempio «giovedì 15/10»), <b>Orario</b> e <b>Indirizzo</b>. "
               "Servono ai messaggi di conferma e di promemoria."))
    B.append(fig("console-04-dati-lead", legend=[
        ("data", "Data.", "Scrivila come la diresti a voce."),
        ("orario", "Orario.", "Per esempio 10:00."),
        ("indirizzo", "Indirizzo.", "Dove si svolge il sopralluogo."),
    ], layout="stack", w="100%"))
    B.append(h2("c3-collega", "3.5", "Se il lead era già nello Storico"))
    B.append(p("La Console controlla se quel lead è già tra quelli salvati (confronta telefono, email e nome). Se lo trova, lo collega al CRM e aggiorna la data. Vedrai uno di questi messaggi:"))
    B.append(ul([
        "<b>«Collegato al lead già in storico: …»</b>: ha riconosciuto il lead e salvato il collegamento con il CRM.",
        "<b>«Data dello Storico aggiornata ✓»</b>: il lead era già collegato; ha solo aggiornato la data.",
        "<b>«Più lead in storico corrispondono (N): nessun collegamento automatico»</b>: nel dubbio non collega nulla.",
    ]))
    B.append(h2("c3-altri", "3.6", "Se il CRM non è disponibile"))
    B.append(p("In casi eccezionali puoi caricare i dati a mano: nella sezione <b>«1. Import dati lead»</b> (premi «+ Apri») trascina screenshot, PDF, CSV o Excel, oppure incolla i dati copiati dal CRM. "
               "I PDF di più di 5 pagine vengono letti solo nelle prime 5."))
    B.append(fig("console-23-file-caricati", legend=[
        ("file", "Il file caricato.", "Una miniatura (immagini) o il numero di righe (fogli)."),
        ("rimuovi", "La ✕.", "Toglie il file dall'elenco."),
        ("riga", "Righe trovate nei file.", "Se il foglio ha più righe, scegli quella del lead."),
        ("estrai", "Estrai dati dai file caricati.", "Compila i campi e avvia lo studio del lead."),
    ], layout="stack", w="100%"))
    B.append(box("nota", "È un'alternativa di emergenza: il percorso normale è sempre il pulsante blu sul CRM, perché legge anche attività, offerte e note complete."))

    B.append(cap(4, "Il flusso completo, dal CRM al CRM", P1, "c4",
                 "Una vista d'insieme: ogni capitolo seguente spiega uno di questi passi."))
    B.append(h2("c4-schema", "4.1", "Lo schema"))
    B.append(info(cascata_html()))
    B.append(h2("c4-giornata", "4.2", "Gli otto passi di una giornata"))
    B.append(info(giornata_html()))
    B.append(h2("c4-logica", "4.3", "La logica in poche righe"))
    B.append(ul([
        "<b>Prima si studia</b> (Parte 2): i dati del CRM diventano una strategia e degli script su misura.",
        "<b>L'azione base è la telefonata</b> (Parte 3): la Console passa lo script al pannello di chiamata, che ti guida mentre parli.",
        "<b>WhatsApp ed email arrivano dopo</b> (Parte 4), se la telefonata non va a buon fine, in base alle caratteristiche del lead e alla strategia.",
        "<b>Alla fine si segna l'esito</b> nello Storico e, se serve, si riapre il lead sul CRM (Parte 6).",
    ]))
    B.append(box("nota", "Nella Parte 5 trovi due modalità che si usano <b>da sole</b>, senza passare da questo flusso: «Chiamata YesMobility» e «Rinforzo Facile Salire»."))

    # =====================================================================  PARTE 2
    B.append(cap(5, "Stato, canali e obiezioni del lead", P2, "c5",
                 "Sezione «3. Stato del lead e canali». Qui la Console fotografa la situazione: da questo dipende quali script prepara."))
    B.append(fig("console-05-stato-canali", legend=[
        ("ai", "Suggerisci stato, obiezioni e strategia con AI.", "L'AI legge i dati e propone tutto."),
        ("stato", "Stato del lead.", "Un menu con dieci stati. Sotto compare una breve spiegazione."),
        ("canali", "Canali da generare.", "Telefono, WhatsApp, Email."),
        ("obiezioni", "Obiezioni trasversali.", "Le cinque obiezioni più comuni."),
    ], layout="stack", w="100%"))
    B.append(h2("c5-ai", "5.1", "L'AI propone, tu confermi"))
    B.append(p("Dopo l'importazione dal CRM lo studio parte da solo. Se vuoi rifarlo (per esempio dopo aver corretto i dati) premi <b>«Suggerisci stato, obiezioni e strategia con AI»</b>: il pulsante mostra «Analisi in corso…» e dopo qualche secondo stato, obiezioni e analisi sono compilati."))
    B.append(p("Leggi e correggi quello che non ti convince: tutto si può cambiare."))
    B.append(box("nota", "Se non c'è nessuna chiave AI compare «Nessun runtime AI disponibile». In quel caso scegli tu stato e obiezioni: i campi ambrati ti ricordano cosa manca."))
    B.append(h2("c5-stati", "5.2", "I dieci stati del lead"))
    B.append(p("Lo stato dice <b>a che punto è la trattativa</b>. È la scelta più importante, perché decide cosa si deve fare con il lead e con quali canali."))
    B += stati_tabella()
    B.append(p("Quando cambi stato, i canali si riportano a quelli previsti per quello stato. Quando lo scegli tu, il campo non è più ambrato."))
    B.append(h2("c5-canali", "5.3", "I canali"))
    B.append(p("Ogni canale è un pulsante: <b>chiaro = acceso</b>, <b>scuro = spento</b>. Premilo per cambiarlo."))
    B.append(ul([
        "<b>Telefono</b> è il canale base: è sempre da usare per primo.",
        "<b>WhatsApp</b> si accende da solo se il lead ha un cellulare; <b>Email</b> si accende da solo se c'è un indirizzo. Puoi sempre spegnerli o riaccenderli tu.",
        "Se accendi un canale che lo stato non prevede, la Console usa uno script di apertura dello stesso canale, mai un messaggio che finge un contatto già avvenuto.",
    ]))
    B.append(h2("c5-obiezioni", "5.4", "Le cinque obiezioni"))
    B.append(tab(["Obiezione", "Quando usarla"], [
        ["Prezzo troppo alto", "Il cliente dice che costa troppo."],
        ["Tempi lunghi", "Il cliente teme che l'installazione richieda troppo."],
        ["Scetticismo sul modello", "Il cliente diffida: «come funzionate?», «è una truffa?»."],
        ["Vuole pensarci", "Il cliente prende tempo o vuole confrontare."],
        ["Familiare / caregiver", "Risponde un familiare o chi assiste il cliente."],
    ]))
    B.append(p("Ogni obiezione accesa aggiunge allo script la risposta adatta. Sono facoltative: non accendere quelle che non servono."))

    B.append(cap(6, "L'analisi: la strategia da seguire", P2, "c6",
                 "Sezione «4. Analisi e strategia»: il risultato dello studio del lead e il piano per avvicinarlo."))
    B.append(fig("console-06-analisi", legend=[("analisi", "Il testo.", "Compare da solo dopo lo studio del lead. Puoi riscriverlo liberamente.")], layout="stack", w="100%"))
    B.append(h2("c6-cosa", "6.1", "Cosa contiene"))
    B.append(p("L'AI studia tutti i dati raccolti dal CRM (note, attività, offerte, motivo del rifiuto) e scrive, in circa 100 parole, due cose:"))
    B.append(ul([
        "<b>Il risultato dello studio</b>: cosa emerge da questo cliente.",
        "<b>La strategia consigliata</b>: quali leve usare, che tono tenere, quali priorità dare.",
    ]))
    B.append(box("nota", "È una nota <b>per te</b>, da leggere prima di contattare il cliente. Non è un testo da dire al cliente e gli script non la citano mai."))
    B.append(h2("c6-guida", "6.2", "Come guida gli script"))
    B.append(ul([
        "L'analisi viene passata all'AI quando genera gli script: è la loro <b>guida strategica</b>.",
        "Se la correggi o la riscrivi, gli script successivi seguono la tua versione: è il modo più rapido per indirizzare l'AI.",
        "L'AI la usa solo per scegliere argomenti e priorità: non cita sopralluoghi già fatti, importi di preventivi precedenti o nomi di tecnici, a meno che lo script non sia proprio una conferma di appuntamento.",
        "Viene salvata con il lead nello Storico.",
    ]))
    B.append(box("consiglio", "Prima di generare gli script, leggi l'analisi con calma: se la strategia ti sembra sbagliata, correggila adesso. Tutto quello che viene dopo ne dipende."))

    B.append(cap(7, "La generazione degli script", P2, "c7",
                 "Sezione «5. Generazione script». Con un clic la Console prepara i testi per telefono, WhatsApp ed email, tutti costruiti su dati e strategia del lead."))
    B.append(h2("c7-genera", "7.1", "Come si genera"))
    B += passi([
        "Controlla in sezione 3 che ci sia <b>almeno un canale acceso</b> (altrimenti compare «Seleziona almeno un canale da generare»).",
        "Premi <b>«Genera script»</b>. Il pulsante mostra «Generazione in corso…».",
        "Compare un riquadro per ogni canale. Il riquadro Email ha due campi: Oggetto e Corpo.",
    ])
    B.append(fig("console-07-generazione", legend=[
        ("nuovo", "Nuovo lead vuoto.", "Svuota tutti i campi per ripartire da zero."),
        ("genera", "Genera script.", "Prepara i testi."),
        ("badge", "Etichetta.", "Dice come è stato scritto il testo (vedi 7.2)."),
        ("rigenera", "Rigenera.", "Crea una variante di quel solo canale."),
        ("copia", "Copia negli appunti.", "Copia il valore indicato."),
        ("whatsapp", "Logo WhatsApp.", "Apre WhatsApp con il messaggio già scritto (capitolo 16)."),
        ("email", "Busta Mail.", "Apre la posta con la mail già compilata (capitolo 17)."),
        ("salva", "Salva lead in storico.", "Capitolo 8."),
        ("sv", "Invia a Suggerimenti Vendita.", "Capitolo 9."),
    ], layout="stack", w="100%"))
    B.append(h2("c7-etichette", "7.2", "Le etichette sui riquadri"))
    B.append(tab(["Etichetta", "Significato"], [
        ["Generato da AI", "Lo script è stato scritto dall'AI per questo lead."],
        ["Bozza da libreria (no AI)", "L'AI non era disponibile o ha dato un errore. La Console ha preparato una bozza dagli script di libreria: modificala prima di usarla."],
        ["Testo grezzo", "La risposta dell'AI non era leggibile. Il testo è nel riquadro «Risposta grezza»: correggilo a mano."],
    ]))
    B.append(h2("c7-auto", "7.3", "Cosa fa la Console da sola"))
    B.append(ul([
        "<b>Firma.</b> In fondo a WhatsApp e email aggiunge «David Vannini / YesMobility.it». Una firma già presente viene sostituita, mai duplicata.",
        "<b>Il cliente per cognome.</b> Scrive «Sig. Rossi» o «Sig.ra Verdi».",
        "<b>WhatsApp senza emoji.</b> Se l'AI ne mette, le toglie.",
        "<b>Il nome dell'installatore partner non viene mai scritto</b>, in nessun canale.",
        "<b>Nessun contatto precedente inventato.</b> Gli script non fingono mai che YesMobility abbia già parlato con il cliente.",
    ]))
    B.append(box("attenzione", "<b>Rileggi sempre lo script prima di usarlo.</b> L'AI può sbagliare. Le regole sempre attive sono nell'Appendice C."))

    B.append(cap(8, "Rivedere, modificare e salvare gli script", P2, "c8",
                 "Gli script sono una bozza di partenza: sono tuoi, puoi cambiarli prima di usarli."))
    B.append(h2("c8-modifica", "8.1", "Correggere a mano"))
    B.append(p("Ogni testo è un campo che puoi riscrivere liberamente. Quello che lasci nei campi è quello che verrà usato: copiato, inviato su WhatsApp, mandato alla telefonata o salvato."))
    B.append(h2("c8-rigenera", "8.2", "Rigenerare una variante"))
    B.append(p("Se un testo non ti convince premi <b>«Rigenera»</b> nel suo riquadro: la Console ne scrive un'altra versione solo per quel canale, senza toccare gli altri. "
               "Se hai cambiato lo stato, le obiezioni o l'analisi, ripremi invece «Genera script» per rifare tutto."))
    B.append(h2("c8-salva", "8.3", "Salvare nello Storico"))
    B += passi([
        "In fondo alla sezione 5 premi <b>«Salva lead in storico»</b>.",
        "Compare il messaggio «Lead salvato nello storico» e la Console ti porta nello Storico.",
    ])
    B.append(p("Nello Storico restano salvati i dati, gli script (anche quelli che hai modificato), le obiezioni scelte, l'analisi e gli screenshot caricati. "
               "Se il lead arriva dal CRM, la data nello Storico è quella di assegnazione a YesMobility."))
    B.append(box("consiglio", "Salva il lead prima di telefonare: così, qualunque cosa succeda, hai già tutto pronto per i passi successivi."))
    return B

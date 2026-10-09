# -*- coding: utf-8 -*-
"""Parte 3: Lead Rework Console (uso quotidiano)."""
from man_lib import *

P3 = "Parte 3"


def blocchi():
    B = []
    # ---------------------------------------------------------------- 9
    B.append(cap(9, "Importare un lead dal CRM", P3, "c9",
                 "Il modo più comodo per caricare un lead: un solo clic sul CRM e la Console si compila da sola."))
    B.append(h2("c9-pulsante", "9.1", "Con il pulsante blu sul CRM"))
    B += passi([
        "Apri il <b>CRM Facile Salire</b> e vai sulla pagina del lead (l'indirizzo comincia con <code>app.facilesalire.it/leads/</code>).",
        "In basso a destra trovi il pulsante blu <b>«Invia a Lead Rework Console»</b>. Premilo.",
        "Il pulsante mostra per un attimo <b>«✓ Inviato»</b>.",
        "La Console si apre (o torna in primo piano e si ricarica) e i campi si riempiono da soli. Compare la scritta <b>«Dati importati dal CRM ✓»</b>.",
        "Subito dopo l'intelligenza artificiale propone da sola stato del lead, obiezioni e strategia (serve la chiave Anthropic, capitolo 6).",
    ])
    B.append(h2("c9-cosa", "9.2", "Cosa viene importato"))
    B.append(tab(["Campo della Console", "Da dove arriva nel CRM"], [
        ["Nome cliente", "Nome e cognome del lead."],
        ["Zona", "La città del lead."],
        ["Telefono, Email", "I recapiti del lead."],
        ["Note", "Le note del lead."],
        ["Storico contatti precedenti", "Tutte le attività, ognuna con tipo, data e testo."],
        ["Prezzo esistente", "L'importo della prima offerta."],
        ["Motivazione rifiuto", "Il motivo di perdita dell'offerta, se è stato indicato."],
        ["Appuntamento: data e orario", "L'attività di tipo «Visita» più recente."],
        ["Indirizzo", "Indirizzo e città del lead."],
        ["Prodotto", "Montascale, Pedana o Elevatore, scelto dal nome del prodotto. Se non lo riconosce, lascia il valore che c'era."],
        ["Data nello Storico", "La data in cui il lead è stato assegnato a YesMobility."],
    ]))
    B.append(box("attenzione", "Lo <b>stato del lead</b> e le <b>obiezioni</b> non esistono nel CRM, quindi non arrivano da lì. Li propone l'AI e tu li confermi o li correggi (capitolo 12)."))
    B.append(box("consiglio", "Controlla sempre <b>Prodotto</b> e <b>Appuntamento</b>: l'abbinamento è fatto per parole chiave e con prodotti insoliti può non essere perfetto."))
    B.append(h2("c9-vecchi", "9.3", "Se compare un avviso sui dati vecchi"))
    B.append(p("Se passi da un lead all'altro cliccando dentro il CRM, senza ricaricare la pagina, i dati letti potrebbero essere ancora quelli del lead precedente. "
               "L'estensione se ne accorge e <b>non invia mai i dati sbagliati</b>: ricarica la pagina una volta da sola e invia."))
    B.append(p("Se compare comunque un avviso che dice <i>«Impossibile leggere i dati di questa pagina»</i>, premi <b>F5</b> sulla pagina del CRM e riprova a premere il pulsante blu."))
    B.append(h2("c9-collega", "9.4", "Se il lead era già nello Storico"))
    B.append(p("La Console controlla se quel lead è già tra quelli salvati (confronta telefono, email e nome). Se lo trova, lo collega al CRM e aggiorna la data. Vedrai uno di questi messaggi:"))
    B.append(ul([
        "<b>«Collegato al lead già in storico: …»</b>: ha riconosciuto il lead e salvato il collegamento con il CRM.",
        "<b>«Data dello Storico aggiornata ✓»</b>: il lead era già collegato; ha solo aggiornato la data.",
        "<b>«Più lead in storico corrispondono (N): nessun collegamento automatico»</b>: nel dubbio non collega nulla.",
    ]))

    # ---------------------------------------------------------------- 10
    B.append(cap(10, "Altri modi per caricare i dati", P3, "c10",
                 "Se non vuoi usare il CRM puoi incollare i dati oppure caricare file e screenshot. È la sezione «1. Import dati lead», chiusa all'inizio."))
    B.append(h2("c10-apri", "10.1", "Aprire la sezione di importazione"))
    B.append(p("In cima alla scheda «Lead» premi <b>«+ Apri»</b> nella sezione «1. Import dati lead». Per richiuderla premi «− Chiudi»."))
    B.append(fig("console-03-import-dati", legend=[
        ("dropzone", "Area di caricamento.", "Trascina qui i file, oppure fai clic per sceglierli."),
        ("incolla", "Incolla dati dal CRM (dagli appunti).", "Legge i dati copiati dal CRM. Serve solo se non usi il pulsante blu."),
    ], layout="stack", w="100%"))
    B.append(h2("c10-file", "10.2", "Caricare file, screenshot, PDF, Excel"))
    B.append(p("Puoi caricare più file insieme: <b>screenshot</b> (JPG o PNG), <b>PDF</b>, <b>CSV</b> o <b>Excel</b>. "
               "I PDF diventano immagini pagina per pagina: se hanno più di 5 pagine vengono lette solo le prime 5 e la Console ti avvisa."))
    B.append(fig("console-23-file-caricati", legend=[
        ("file", "Il file caricato.", "Una miniatura (immagini) o il numero di righe (fogli)."),
        ("rimuovi", "La ✕.", "Toglie il file dall'elenco."),
        ("riga", "Righe trovate nei file.", "Se il foglio ha più righe, scegli quella del lead."),
        ("estrai", "Estrai dati dai file caricati.", "Compila i campi e fa leggere le immagini all'AI."),
    ], layout="stack", w="100%"))
    B += passi([
        "Trascina i file nell'area di caricamento, oppure fai clic sull'area e scegli i file.",
        "Controlla che compaiano nell'elenco. Per toglierne uno premi la ✕.",
        "Se hai caricato un foglio con più righe, scegli nel menu «Righe trovate nei file» quella del lead da lavorare.",
        "Se hai caricato screenshot puoi scrivere due righe nel campo «Note aggiuntive sugli screenshot»: è un aiuto in più se l'AI non coglie tutto.",
        "Premi <b>«Estrai dati dai file caricati»</b>. Compaiono i dati trovati e l'AI propone stato, obiezioni e strategia.",
        "I campi che non è riuscita a trovare restano <b>ambrati</b>: compilali a mano (capitolo 11).",
    ])
    B.append(box("nota", "Se il formato non è supportato compare «Formato file non supportato». Se la lettura di Excel non è disponibile, salva il foglio come CSV e riprova."))

    # ---------------------------------------------------------------- 11
    B.append(cap(11, "Controllare e completare i dati del lead", P3, "c11",
                 "Sezione «2. Dati lead». È il punto in cui verifichi che nome, telefono e note siano giusti prima di generare gli script."))
    B.append(h2("c11-campi", "11.1", "I campi"))
    B.append(fig("console-04a-dati-lead-chiuso", legend=[
        ("nome", "Nome cliente.", "Scrivi nome e cognome, per esempio «Mario Rossi»."),
        ("prodotto", "Prodotto.", "Montascale, Pedana o Elevatore."),
        ("zona", "Zona.", "La città."),
        ("tel1", "Numero di telefono.", "Il numero principale."),
        ("tel2", "Telefono secondario.", "Un secondo numero, se c'è."),
        ("email", "Indirizzo email.", "Se lo scrivi si attiva da solo il canale Email."),
        ("prezzo", "Prezzo esistente.", "Se il cliente ha già un'offerta."),
        ("motivo", "Motivazione rifiuto.", "Perché ha detto di no, se è noto."),
        ("tempistica", "Tempistica indicativa.", "Per esempio «3-4 settimane»."),
        ("note", "Note.", "Il campo si allunga da solo mentre scrivi."),
        ("storico", "Storico contatti precedenti.", "Cosa è già successo con questo cliente."),
        ("appuntamento", "Dettagli appuntamento.", "Apre i campi data, orario e indirizzo."),
    ], layout="stack", w="100%", pos={"appuntamento": "l"}))
    B.append(box("attenzione", "<b>Nome e cognome.</b> La Console chiama il cliente per cognome («Sig. Rossi», «Sig.ra Verdi») e capisce il genere dal nome. "
                               "Scrivi sempre prima il nome e poi il cognome: se il CRM ti dà «Cognome Nome» controlla gli script, perché l'automatismo può sbagliare."))
    B.append(box("nota", "Se scrivi un <b>cellulare</b> (comincia con 3, +39 3 oppure 0039 3) si accende da solo il canale WhatsApp. Se scrivi un indirizzo <b>email</b> si accende il canale Email."))
    B.append(h2("c11-appunt", "11.2", "L'appuntamento o il sopralluogo"))
    B.append(p("Premi «Dettagli appuntamento / sopralluogo (opzionali)» per aprire tre campi: <b>Data</b> (per esempio «giovedì 15/10»), <b>Orario</b> (per esempio «10:00») e <b>Indirizzo</b>. "
               "Servono per i messaggi di conferma e di promemoria dell'appuntamento."))
    B.append(fig("console-04-dati-lead", legend=[
        ("data", "Data.", "Scrivila come la diresti a voce."),
        ("orario", "Orario.", "Per esempio 10:00."),
        ("indirizzo", "Indirizzo.", "Dove si svolge il sopralluogo."),
    ], layout="stack", w="100%"))
    B.append(h2("c11-ambra", "11.3", "I campi ambrati"))
    B.append(p("Quando l'AI o l'importazione non riescono a trovare un dato, il campo diventa <b>ambrato</b>. Significa «controlla qui». "
               "Appena scrivi qualcosa il colore sparisce. Se un campo ambrato non ti serve, lascialo vuoto."))
    B.append(fig("console-04b-campi-ambra", w="100%", did="I campi ambrati sono quelli che non sono stati trovati: Zona, Prezzo esistente e Tempistica."))

    # ---------------------------------------------------------------- 12
    B.append(cap(12, "Stato del lead, canali e obiezioni", P3, "c12",
                 "Sezione «3. Stato del lead e canali». Qui dici alla Console a che punto è il lead: da questo dipende quali script prepara."))
    B.append(fig("console-05-stato-canali", legend=[
        ("ai", "Suggerisci stato, obiezioni e strategia con AI.", "L'AI legge i dati e propone tutto."),
        ("stato", "Stato del lead.", "Un menu con dieci stati. Sotto compare una breve spiegazione."),
        ("canali", "Canali da generare.", "Telefono, WhatsApp, Email."),
        ("obiezioni", "Obiezioni trasversali.", "Le cinque obiezioni più comuni."),
    ], layout="stack", w="100%"))
    B.append(h2("c12-ai", "12.1", "Lasciare che proponga l'AI"))
    B += passi([
        "Premi <b>«Suggerisci stato, obiezioni e strategia con AI»</b>. Il pulsante mostra «Analisi in corso…».",
        "Dopo qualche secondo lo stato, le obiezioni e il testo della sezione 4 sono compilati.",
        "Leggi e correggi quello che non ti convince: tutto si può cambiare.",
    ])
    B.append(box("nota", "Se non c'è nessuna chiave AI, compare «Nessun runtime AI disponibile». Scegli tu stato e obiezioni: i campi ambrati ti ricordano cosa manca."))
    B.append(h2("c12-stati", "12.2", "I dieci stati del lead"))
    B += stati_tabella()
    B.append(p("Quando cambi stato, i canali si riportano a quelli previsti per quello stato. Quando lo scegli tu, il campo non è più ambrato."))
    B.append(h2("c12-canali", "12.3", "I canali"))
    B.append(p("Ogni canale è un pulsante: <b>chiaro = acceso</b>, <b>scuro = spento</b>. Premilo per cambiarlo."))
    B.append(ul([
        "WhatsApp si accende da solo se il lead ha un cellulare; Email si accende da solo se c'è un indirizzo (succede quando scrivi i recapiti, importi i dati o cambi stato). Puoi sempre spegnerli o riaccenderli tu.",
        "Se accendi un canale che lo stato non prevede, la Console usa uno script di apertura dello stesso canale, mai un messaggio che finge un contatto già avvenuto.",
    ]))
    B.append(h2("c12-obiezioni", "12.4", "Le cinque obiezioni"))
    B.append(tab(["Obiezione", "Quando usarla"], [
        ["Prezzo troppo alto", "Il cliente dice che costa troppo."],
        ["Tempi lunghi", "Il cliente teme che l'installazione richieda troppo."],
        ["Scetticismo sul modello", "Il cliente diffida: «come funzionate?», «è una truffa?»."],
        ["Vuole pensarci", "Il cliente prende tempo o vuole confrontare."],
        ["Familiare / caregiver", "Risponde un familiare o chi assiste il cliente."],
    ]))
    B.append(p("Ogni obiezione acceso aggiunge allo script la risposta adatta. Sono facoltative: non accendere quelle che non servono."))

    # ---------------------------------------------------------------- 13
    B.append(cap(13, "Analisi e strategia", P3, "c13",
                 "Sezione «4. Analisi e strategia»: una breve nota che riassume il lead e come avvicinarlo."))
    B.append(fig("console-06-analisi", legend=[("analisi", "Il testo.", "Compare da solo dopo l'analisi dell'AI. Puoi riscriverlo liberamente.")], layout="stack", w="100%"))
    B.append(ul([
        "L'AI scrive al massimo circa 100 parole: cosa emerge dai dati e come conviene approcciare il lead.",
        "È una nota <b>per te</b>, non un testo da dire al cliente.",
        "Quello che scrivi qui viene passato all'AI quando genera gli script, quindi puoi correggerlo per guidarla.",
        "Viene salvato con il lead nello Storico.",
    ]))

    # ---------------------------------------------------------------- 14
    B.append(cap(14, "Generare gli script", P3, "c14",
                 "Sezione «5. Generazione script». Qui la Console prepara i testi da usare: telefono, WhatsApp ed email."))
    B.append(h2("c14-genera", "14.1", "Come si genera"))
    B += passi([
        "Controlla in sezione 3 che ci sia <b>almeno un canale acceso</b> (altrimenti compare «Seleziona almeno un canale da generare»).",
        "Premi <b>«Genera script»</b>. Il pulsante mostra «Generazione in corso…».",
        "Compare un riquadro per ogni canale. Il riquadro Email ha due campi: Oggetto e Corpo.",
        "Leggi e, se serve, <b>correggi direttamente nei campi</b>: puoi scrivere liberamente.",
        "Per avere una variante di un solo canale premi <b>«Rigenera»</b> in quel riquadro.",
    ])
    B.append(fig("console-07-generazione", legend=[
        ("nuovo", "Nuovo lead vuoto.", "Svuota tutti i campi per ripartire da zero."),
        ("genera", "Genera script.", "Prepara i testi."),
        ("badge", "Etichetta.", "Dice come è stato scritto il testo (vedi 14.2)."),
        ("rigenera", "Rigenera.", "Crea una variante di quel solo canale."),
        ("copia", "Copia negli appunti.", "Copia il valore indicato."),
        ("whatsapp", "Logo WhatsApp.", "Apre WhatsApp con il messaggio già scritto."),
        ("email", "Busta Mail.", "Apre la posta con la mail già compilata."),
        ("salva", "Salva lead in storico.", "Capitolo 18."),
        ("sv", "Invia a Suggerimenti Vendita.", "Capitolo 18."),
    ], layout="stack", w="100%"))
    B.append(h2("c14-etichette", "14.2", "Le etichette sui riquadri"))
    B.append(tab(["Etichetta", "Significato"], [
        ["Generato da AI", "Lo script è stato scritto dall'AI per questo lead."],
        ["Bozza da libreria (no AI)", "L'AI non era disponibile o ha dato un errore. La Console ha preparato una bozza dagli script di libreria: modificala prima di usarla."],
        ["Testo grezzo", "La risposta dell'AI non era leggibile. Il testo è nel riquadro «Risposta grezza»: correggilo a mano."],
    ]))
    B.append(h2("c14-auto", "14.3", "Cosa fa la Console da sola"))
    B.append(ul([
        "<b>Firma.</b> In fondo a WhatsApp e email aggiunge «David Vannini / YesMobility.it». Una firma già presente viene sostituita, mai duplicata.",
        "<b>Il cliente per cognome.</b> Scrive «Sig. Rossi» o «Sig.ra Verdi».",
        "<b>WhatsApp senza emoji.</b> Se l'AI ne mette, le toglie.",
        "<b>Il nome dell'installatore partner non viene mai scritto</b>, in nessun canale.",
        "<b>Nessun contatto precedente inventato.</b> Gli script non fingono mai che YesMobility abbia già parlato con il cliente.",
    ]))
    B.append(box("attenzione", "<b>Rileggi sempre lo script prima di usarlo.</b> L'AI può sbagliare. Le regole completamente automatiche sono nell'Appendice C."))

    # ---------------------------------------------------------------- 15
    B.append(cap(15, "Copiare e inviare: WhatsApp ed email", P3, "c15",
                 "Sopra il testo di WhatsApp e di Email c'è una riga con il contatto del cliente e due pulsanti: copiare e inviare."))
    B.append(fig("console-08-blocco-1", w="100%", did="Il riquadro WhatsApp: il numero, l'icona per copiare e il logo WhatsApp per aprire il messaggio."))
    B.append(h2("c15-copia", "15.1", "Copiare un testo"))
    B.append(p("L'icona dei <b>due quadratini</b> si chiama «Copia negli appunti». Copia il valore attuale, anche se lo hai modificato. Per un attimo diventa una spunta (✓). "
               "La trovi accanto a: numero WhatsApp, testo WhatsApp, indirizzo email, oggetto e corpo della mail. Per il telefono non c'è."))
    B.append(h2("c15-whatsapp", "15.2", "Inviare un WhatsApp"))
    B += passi([
        "Controlla il <b>numero</b> (deve essere un cellulare) e il <b>testo</b>.",
        "Premi il pulsante con il <b>logo verde di WhatsApp</b>, accanto al numero.",
        "Si apre <b>WhatsApp Desktop</b> con la chat del cliente e il messaggio già scritto.",
        "Rileggi il messaggio e premi <b>Invio</b> dentro WhatsApp.",
    ])
    B.append(box("attenzione", "La Console <b>non invia nulla da sola</b>: l'invio resta sempre un tuo gesto dentro WhatsApp o dentro la posta."))
    B.append(box("nota", "Se il numero non ha il prefisso, la Console aggiunge 39 (Italia). Se manca il numero compare «Numero di telefono mancante». "
                         "Se WhatsApp Desktop non è installato, il pulsante non fa nulla: installa l'app."))
    B.append(h2("c15-email", "15.3", "Inviare un'email"))
    B.append(fig("console-08-blocco-2", w="100%", did="Il riquadro Email: indirizzo con icona copia e busta blu, poi Oggetto e Corpo."))
    B += passi([
        "Controlla <b>indirizzo</b>, <b>oggetto</b> e <b>corpo</b>.",
        "Premi la <b>busta blu</b> (l'icona di Mail), accanto all'indirizzo.",
        "Si apre il programma di posta del Mac con destinatario, oggetto e testo già compilati.",
        "Rileggi e premi <b>Invia</b> nel programma di posta.",
    ])
    B.append(box("nota", "Se manca l'indirizzo compare «Indirizzo email mancante». Gli stessi pulsanti si trovano anche nella finestra di un lead dello Storico (capitolo 20)."))

    # ---------------------------------------------------------------- 16
    B.append(cap(16, "Invia a telefono", P3, "c16",
                 "Manda nome, cognome, numero ed email del lead all'app Rubrica sul telefono Android, che lo salva in rubrica e, se vuoi, chiama."))
    B.append(h2("c16-dove", "16.1", "Dove trovi il pulsante"))
    B.append(tab(["Dove", "Come si chiama"], [
        ["Scheda Lead, in alto a destra", "Pulsante «Invia a telefono»"],
        ["Storico, su ogni riga", "Pulsante «Tel»"],
        ["Finestra di un lead dello Storico", "Icona della cornetta"],
        ["Pannello di chiamata (Suggerimenti Vendita)", "Pulsante «Invia a telefono»"],
    ]))
    B.append(fig("console-02b-intestazione-lead", legend=[
        ("telefono", "Invia a telefono.", "Manda il lead al telefono."),
        ("crm", "CRM.", "Apre il lead sul CRM (capitolo 17)."),
    ], layout="stack", w="100%"))
    B.append(h2("c16-uso", "16.2", "Come si usa"))
    B += passi([
        "Controlla che il lead abbia un numero di telefono (altrimenti compare «Questo lead non ha un numero di telefono»).",
        "Premi <b>«Invia a telefono»</b>. Se non hai ancora il codice compare «Prima imposta il codice del telefono»: vai al capitolo 6.",
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
    B.append(box("nota", "Funziona se l'app Rubrica sul telefono è in ascolto (capitolo 8) con lo stesso codice segreto, e se Mac e telefono hanno internet."))

    # ---------------------------------------------------------------- 17
    B.append(cap(17, "Il pulsante CRM", P3, "c17",
                 "Il pulsante CRM apre il lead nel CRM Facile Salire, senza dover cercare a mano."))
    B.append(h2("c17-dove", "17.1", "I tre posti dove si trova"))
    B.append(tab(["Dove", "Come si presenta"], [
        ["Scheda Lead, in alto a destra", "Pulsante con l'icona di collegamento esterno e la scritta «CRM»."],
        ["Storico, su ogni riga", "Pulsante con la sola scritta «CRM», nella colonna a destra."],
        ["Finestra di un lead dello Storico", "Icona di collegamento esterno nella testata, prima delle altre icone."],
    ]))
    B.append(h2("c17-cosa", "17.2", "Cosa fa"))
    B.append(ul([
        "Se il lead ha già il suo <b>codice CRM</b> (si salva quando importi il lead dal CRM), apre <b>direttamente quel lead</b>.",
        "Se il codice non c'è ancora, apre l'<b>elenco dei lead</b> del CRM (il suggerimento sul pulsante dice «ID non ancora collegato»).",
        "Il CRM si apre in una finestra di Chrome a parte, larga il 40% e alta l'80% dello schermo, in alto a destra. Se il browser blocca la finestra, la apre in una scheda normale.",
    ]))
    B.append(box("consiglio", "Per far collegare un lead dello Storico al CRM basta importarlo una volta dal CRM con il pulsante blu (capitolo 9): la Console lo riconosce e salva il collegamento."))

    # ---------------------------------------------------------------- 18
    B.append(cap(18, "Salvare il lead e inviarlo a Suggerimenti Vendita", P3, "c18",
                 "Quando gli script sono pronti, salva il lead e, se vuoi telefonare con la guida, mandalo a Suggerimenti Vendita."))
    B.append(h2("c18-salva", "18.1", "Salvare nello Storico"))
    B += passi([
        "In fondo alla sezione 5 premi <b>«Salva lead in storico»</b>.",
        "Compare il messaggio «Lead salvato nello storico» e la Console ti porta nello Storico.",
    ])
    B.append(p("Nello Storico restano salvati i dati, gli script (anche quelli che hai modificato), le obiezioni scelte, l'analisi e gli screenshot caricati. "
               "Se il lead arriva dal CRM, la data nello Storico è quella di assegnazione a YesMobility."))
    B.append(h2("c18-sv", "18.2", "Inviare a Suggerimenti Vendita"))
    B.append(p("Il pulsante <b>«Invia a Suggerimenti Vendita»</b> manda all'app il nome, il telefono, l'email e lo <b>script del telefono</b>, che comparirà come guida nel riquadro verde durante la chiamata."))
    B += passi([
        "Nella sezione 5 premi <b>«Invia a Suggerimenti Vendita»</b>. Accanto compare «Inviato ✓ — apro Suggerimenti Vendita…».",
        "L'app si apre (o torna in primo piano). La <b>prima volta</b> Chrome chiede «Apri Suggerimenti Vendita.app?»: conferma.",
        "Nel menu dell'app il pulsante viola <b>«Chiamata Gestione Lead»</b> si illumina.",
        "Premi quel pulsante per avviare la chiamata con la guida (capitolo 23).",
    ])
    B.append(box("nota", "Viene inviato solo lo script del <b>telefono</b>: Suggerimenti Vendita gestisce solo chiamate. Senza script telefono compare «Nessuno script TELEFONO disponibile»."))
    B.append(box("consiglio", "Il lead resta «in attesa» finché non avvii una Chiamata Gestione Lead: puoi mandarlo con calma e telefonare dopo. La stessa icona di invio è disponibile dalla finestra di un lead dello Storico."))

    # ---------------------------------------------------------------- 19
    B.append(cap(19, "Lo Storico dei lead", P3, "c19",
                 "È la seconda scheda (l'icona dell'orologio). Qui trovi tutti i lead salvati e segni cosa hai già fatto."))
    B.append(h2("c19-elenco", "19.1", "L'elenco e le colonne"))
    B.append(fig("console-13-storico-tabella", legend=[
        ("data", "Data.", "Quando è stato creato o assegnato il lead."),
        ("cliente", "Cliente.", "Il nome. Passando il mouse vedi stato e prodotto."),
        ("icotel", "Telefonata.", "Spunta se hai già telefonato."),
        ("icowa", "WhatsApp.", "Spunta se hai già inviato il WhatsApp."),
        ("icomail", "Email.", "Spunta se hai già inviato l'email."),
        ("lav", "Lav. (Lavorato).", "Spunta quando hai finito con questo lead."),
        ("ckrow", "Le caselle.", "Si cambiano con un clic e restano salvate."),
        ("tel", "Tel.", "Invia il lead al telefono."),
        ("crm", "CRM.", "Apre il lead nel CRM."),
        ("apri", "Occhio.", "Apre la scheda del lead."),
        ("duplica", "Copia.", "Duplica il lead."),
        ("elimina", "Cestino.", "Elimina il lead."),
    ], layout="stack", w="100%"))
    B.append(box("nota", "Se la finestra è stretta, le colonne «Prodotto», «Stato» e «Gen.» (numero di canali generati) si nascondono per lasciare spazio. Allarga la finestra per vederle."))
    B.append(h2("c19-cerca", "19.2", "Cercare un lead"))
    B.append(fig("console-15-storico-ricerca", legend=[("cerca", "Campo di ricerca.", "Scrivi nome, telefono, email o zona."), ("conta", "Contatore.", "Quanti lead vedi sul totale.")], layout="stack", w="100%"))
    B.append(ul([
        "La ricerca ignora maiuscole e accenti. Per cercare un telefono bastano 3 cifre.",
        "Se scrivi più parole, il lead deve contenerle tutte.",
        "Per svuotare la ricerca premi la ✕ nel campo.",
    ]))
    B.append(h2("c19-ordina", "19.3", "Ordinare, nascondere e filtrare"))
    B.append(fig("console-12-storico-pannello", legend=[
        ("ordina", "Ordina per.", "Data (più o meno recenti prima) oppure Cliente A→Z / Z→A."),
        ("nascondi", "Nascondi lavorati.", "Toglie dall'elenco i lead già segnati come lavorati."),
        ("esporta", "Esporta storico.", "Scarica un foglio Excel (19.4)."),
        ("filtri", "Filtri.", "Apre i filtri. Il numero indica quanti sono attivi."),
    ], layout="stack", w="100%"))
    B.append(fig("console-14-storico-filtri", legend=[
        ("stato", "Stato.", "Mostra solo i lead di uno stato."),
        ("lavorati", "Lavorati.", "Tutti, solo lavorati o solo da lavorare."),
        ("dal", "Dal.", "Data di inizio."),
        ("al", "Al.", "Data di fine."),
    ], layout="stack", w="100%"))
    B.append(p("Quando almeno un filtro è attivo compare il link <b>«Azzera filtri»</b>. L'ordinamento e «Nascondi lavorati» vengono ricordati la volta dopo."))
    B.append(h2("c19-excel", "19.4", "Esportare in Excel"))
    B.append(p("«Esporta storico» scarica un file <code>storico_lead_AAAA-MM-GG.xlsx</code> con i lead che vedi in quel momento (quindi anche con ricerca e filtri applicati). "
               "Le colonne sono: Data, Cliente, Telefono, Telefono (secondario), Email, Prodotto, Zona, Stato, Canali generati, Telefonata, WhatsApp, Email inviata, Lavorato."))

    # ---------------------------------------------------------------- 20
    B.append(cap(20, "Aprire, duplicare, eliminare e stampare un lead", P3, "c20",
                 "Le azioni sulla singola riga dello Storico."))
    B.append(h2("c20-apri", "20.1", "Aprire la scheda del lead"))
    B.append(p("Premi l'<b>occhio</b> sulla riga. Si apre una finestra con tutto quello che hai salvato: dati, analisi, note e gli script, ognuno con il suo contatto, "
               "il pulsante per copiare e quello per inviare (WhatsApp ed email, come nel capitolo 15)."))
    B.append(fig("console-17-storico-apri-testata", legend=[
        ("crm", "Collegamento esterno.", "Apre il lead nel CRM."),
        ("telefono", "Cornetta.", "Invia il lead al telefono."),
        ("sv", "Freccia in alto (blu).", "Invia a Suggerimenti Vendita."),
        ("stampa", "Stampante.", "Stampa il lead o lo salva in PDF."),
        ("chiudi", "✕.", "Chiude la finestra."),
    ], layout="stack", w="100%"))
    B.append(p("Se hai modificato gli script a mano, sotto il nome compare «modificato manualmente». Per stampare usa la stampante: la stampa esce su fondo bianco senza i pulsanti."))
    B.append(h2("c20-duplica", "20.2", "Duplicare un lead"))
    B.append(p("L'icona dei due quadratini sulla riga <b>duplica</b> il lead: porta i suoi dati nella scheda «Lead», con lo stato e le obiezioni, pronti per generare nuovi script. "
               "Gli script vecchi non vengono copiati. È comodo per riprendere un lead dopo qualche giorno."))
    B.append(h2("c20-elimina", "20.3", "Eliminare un lead"))
    B += passi(["Premi il <b>cestino</b> rosso sulla riga.", "Conferma «Eliminare definitivamente questo lead dallo storico?»."])
    B.append(box("attenzione", "L'eliminazione è definitiva. Se elimini un lead per errore, prova subito «Recupera copia automatica» (capitolo 21)."))

    # ---------------------------------------------------------------- 21
    B.append(cap(21, "Backup e recupero dei lead", P3, "c21",
                 "I lead sono salvati nel browser di questo Mac. Il backup su file ti protegge se i dati del browser vengono cancellati."))
    B.append(fig("console-12-storico-pannello", legend=[
        ("scarica", "Scarica.", "Crea il file di backup."),
        ("ripristina", "Ripristina.", "Rimette i lead da un file di backup."),
        ("recupera", "Recupera copia automatica.", "Riprende lead dalle copie di riserva."),
        ("copiaauto", "Copia automatica.", "Data e ora dell'ultima copia di riserva."),
    ], layout="stack", w="100%"))
    B.append(h2("c21-scarica", "21.1", "Scaricare il backup"))
    B += passi([
        "Nello Storico premi <b>«Scarica»</b>, accanto a «Backup».",
        "Compare «Backup scaricato: N lead ✓» e il file <code>leadrework-lead-AAAA-MM-GG_HHMM.json</code> finisce nella cartella Download.",
        "Spostalo in un posto sicuro (una cartella sul Mac o un disco esterno).",
    ])
    B.append(p("Il backup contiene <b>tutti</b> i lead, anche quelli che al momento non vedi per la ricerca o i filtri."))
    B.append(h2("c21-ripristina", "21.2", "Ripristinare da un backup"))
    B += passi([
        "Premi <b>«Ripristina»</b> e scegli il file di backup.",
        "Se alcuni lead del file esistono già, la Console chiede: <b>OK</b> = sostituisci quelli attuali con la versione del backup; <b>Annulla</b> = tieni quelli attuali (i lead nuovi vengono aggiunti comunque).",
        "Compare il riepilogo: «Import completato: X aggiunti, Y sostituiti, Z già presenti lasciati invariati ✓».",
    ])
    B.append(box("nota", "Il ripristino <b>unisce</b> i lead e non cancella mai niente. Se il file non è un backup della Console compare «Backup non valido» e lo Storico non viene toccato."))
    B.append(h2("c21-auto", "21.3", "La copia automatica"))
    B.append(p("A ogni modifica dello Storico la Console tiene da sola <b>due copie di riserva</b> dentro il browser. «Recupera copia automatica» riaggiunge i lead che sono nelle copie ma non più nello Storico (per esempio eliminati per errore). "
               "Prima ti chiede conferma; i lead attuali non vengono toccati."))
    B.append(p("Se aprendo la Console lo Storico risulta assente ma esiste una copia, la Console lo ripristina da sola e avvisa «Storico lead non trovato: ho ripristinato automaticamente N lead dalla copia di sicurezza»."))
    B.append(box("consiglio", "La copia automatica sta nello stesso browser: se i dati del browser vengono cancellati sparisce anche lei. Scarica un backup su file ogni settimana."))
    return B

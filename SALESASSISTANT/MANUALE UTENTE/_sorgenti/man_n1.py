# -*- coding: utf-8 -*-
"""Parte 1 (Raccolta dati dal CRM) e Parte 2 (Strategia e script).
Numerazione dei capitoli/paragrafi automatica; i rimandi si scrivono {c:ancora} (capitolo) e {s:ancora} (paragrafo).
Principio: chi usa il programma vuole sapere COSA FARE e COSA RICEVE, non cosa c'è dietro."""
from man_lib import *
from man_lib import _ic

P1 = "Parte 1"
P2 = "Parte 2"


def blocchi():
    B = []
    # =====================================================================  PARTE 1
    B.append(cap(None, "Come funziona: il flusso completo", P1, "c-come",
                 "Tutto il lavoro su un lead segue sempre lo stesso percorso: parte dal pulsante blu «Invia a Lead Rework Console» e finisce con l'esito segnato."))
    B.append(h2("c-come-schema", None, "Lo schema"))
    B.append(info(schema_a_html()))
    B.append(h2("c-come-giornata", None, "Gli otto passi: cosa fai e cosa ricevi"))
    B.append(info(giornata_html()))
    B.append(box("nota", "Esistono anche due modalità che si usano <b>da sole</b>, senza passare da questo percorso: «Chiamata YesMobility» e «Rinforzo Facile Salire» (capitoli {c:c-yes} e {c:c-rinforzo})."))

    B.append(cap(None, "Il pulsante da cui parte tutto", P1, "c-pulsante",
                 "Ogni lead si lavora partendo da un solo gesto: il pulsante blu «Invia a Lead Rework Console», che l'estensione mette sulla pagina del lead nel CRM."))
    B.append(info(azione_risultato(["Apri la pagina del lead sul CRM.", "Premi il pulsante blu in basso a destra."],
                                   ["Il pulsante diventa verde: «✓ Inviato».", "La Console si apre da sola, già compilata."])))
    B.append(h2("c-pulsante-dove", None, "Dove si trova"))
    B.append(p("Sulla pagina di un lead del <b>CRM Facile Salire</b> (l'indirizzo comincia con <code>app.facilesalire.it/leads/</code>), "
               "in basso a destra, sempre visibile anche scorrendo la pagina:"))
    B.append(fig_crm(False))
    B.append(box("nota", "Il disegno rappresenta la pagina del CRM: quello che conta è il <b>pulsante blu in basso a destra</b>. Compare solo sulle pagine di dettaglio di un lead, non sull'elenco."))
    B.append(h2("c-pulsante-clic", None, "Cosa succede quando lo premi"))
    B += passi([
        "Premi il pulsante blu <b>«📤 Invia a Lead Rework Console»</b>.",
        "Per un attimo diventa verde e dice <b>«✓ Inviato»</b>: i dati del lead sono partiti.",
        "La <b>Lead Rework Console</b> si apre da sola (se era già aperta torna in primo piano) e i campi si riempiono senza che tu scriva niente.",
        "Subito dopo l'intelligenza artificiale comincia a studiare il lead (capitolo {c:c-stato}).",
    ])
    B.append(fig_crm(True))
    B.append(h2("c-pulsante-vecchi", None, "Se compare un avviso sui dati vecchi"))
    B.append(p("Se passi da un lead all'altro cliccando dentro il CRM senza ricaricare la pagina, l'estensione se ne accorge e <b>non invia mai dati sbagliati</b>: ricarica la pagina da sola e poi invia. "
               "Se compare <i>«Impossibile leggere i dati di questa pagina»</i>, premi <b>F5</b> sul CRM e premi di nuovo il pulsante blu."))

    B.append(cap(None, "La Console si apre e si compila da sola", P1, "c-raccolta",
                 "Dopo il clic non devi scrivere niente: la Console si apre da sola con tutti i dati del lead già al loro posto. Ecco la pagina «Lead» appena aperta: i numeri indicano cosa è stato compilato per te."))
    B.append(fig("console-00-dopo-import", legend=[
        ("dati", "Dati lead.", "Compilati dal CRM: nome, prodotto, zona, telefono, email, prezzo, motivo del rifiuto, note, appuntamento."),
        ("storico", "Storico contatti.", "Tutte le attività del CRM, una sotto l'altra: la storia del lead."),
        ("stato", "Stato del lead.", "Proposto dall'AI sui dati letti (capitolo {c:c-stato})."),
        ("canali", "Canali.", "Telefono, WhatsApp, Email: si accendono secondo stato e recapiti."),
        ("analisi", "Analisi e strategia.", "Il piano per avvicinare il lead, scritto dall'AI (capitolo {c:c-analisi})."),
        ("genera", "Genera script.", "Il passo successivo (capitolo {c:c-gen})."),
    ], layout="side", w="62mm", fm="150mm", did="La pagina «Lead» subito dopo l'apertura automatica (dati di prova)."))
    B.append(info(azione_risultato(["Niente: aspetta qualche secondo.", "Guarda i campi ambrati (se ci sono)."],
                                   ["Tutti i dati del lead nella sezione «2. Dati lead».", "Stato, canali e strategia proposti dall'AI."])))
    B.append(h2("c-raccolta-ambra", None, "I campi ambrati"))
    B.append(p("Un campo <b>ambrato</b> significa «controlla qui»: il dato non era nel CRM. Scrivilo tu; se non ti serve, lascialo vuoto."))
    B.append(fig("console-04b-campi-ambra", w="100%", did="I campi ambrati sono quelli che non sono stati trovati: Zona, Prezzo esistente e Tempistica."))
    B.append(box("attenzione", "Il cliente viene chiamato per cognome («Sig. Rossi»). Se sul CRM il nome è scritto «Cognome Nome», controlla gli script: l'automatismo può sbagliare."))
    B.append(h2("c-raccolta-storico", None, "Se il lead era già nello Storico"))
    B.append(p("La Console riconosce il lead (confronta telefono, email e nome) e lo collega al CRM: vedi «Collegato al lead già in storico» oppure «Data dello Storico aggiornata ✓». "
               "Se più lead corrispondono, nel dubbio non collega nulla."))
    B.append(h2("c-raccolta-manuale", None, "Se il CRM non è disponibile"))
    B.append(p("In casi eccezionali puoi caricare i dati a mano: nella sezione «1. Import dati lead» (premi «+ Apri») trascina screenshot, PDF, CSV o Excel e premi «Estrai dati dai file caricati». "
               "È un ripiego: il pulsante blu legge anche attività e note complete."))
    B.append(h2("c-raccolta-dettaglio", None, "Il dettaglio dei dati letti"))
    B.append(p("Per chi vuole sapere esattamente cosa viene letto dal CRM:"))
    B += tab_split(["Dato", "Cosa viene letto", "A cosa serve"], [
        ["Nome e cognome", "Nome e cognome del lead.", "Il cliente viene chiamato per cognome."],
        ["Telefono ed email", "I recapiti.", "Accendono WhatsApp (cellulare) ed Email (indirizzo)."],
        ["Zona e indirizzo", "Città e indirizzo.", "Messaggi sul sopralluogo."],
        ["Prodotto", "Montascale, Pedana o Elevatore, dal nome del prodotto.", "Adatta lo script."],
        ["Note", "Le note scritte sul lead.", "L'AI le legge per capire il bisogno."],
        ["Storico contatti", "Tipo, data e testo di ogni attività.", "La storia del lead."],
        ["Offerta esistente", "L'importo della prima offerta.", "Confronto di prezzo."],
        ["Motivo del rifiuto", "Perché l'offerta è stata persa.", "Leva per il recupero."],
        ["Appuntamento", "Data e orario dell'ultima «Visita».", "Conferma e promemoria."],
        ["Data di assegnazione", "Quando il lead è arrivato a YesMobility.", "Data nello Storico."],
        ["Codice del lead", "Il numero sul CRM.", "Il pulsante «CRM» riapre il lead."],
    ], per=11, cls="sec")
    B.append(box("nota", "Lo <b>stato</b>, le <b>obiezioni</b> e la <b>strategia</b> non esistono nel CRM: li ricava l'AI studiando questi dati."))

    # =====================================================================  PARTE 2
    B.append(cap(None, "Stato, canali e obiezioni del lead", P2, "c-stato",
                 "La Console fotografa la situazione del lead: da qui dipende quali script prepara."))
    B.append(info(azione_risultato(["Leggi lo stato proposto e correggilo se non ti convince.", "Accendi o spegni i canali e le obiezioni."],
                                   ["Gli script giusti per quel lead.", "I canali già accesi in base a cellulare ed email."])))
    B.append(fig("console-05-stato-canali", legend=[
        ("ai", "Suggerisci con AI.", "Rifà lo studio del lead (parte da solo dopo il clic)."),
        ("stato", "Stato del lead.", "A che punto è la trattativa: dieci stati."),
        ("canali", "Canali.", "Chiaro = acceso, scuro = spento."),
        ("obiezioni", "Obiezioni.", "Le cinque più comuni."),
    ], layout="stack", w="100%"))
    B.append(h2("c-stato-dieci", None, "I dieci stati"))
    B.append(info(stati_cards_html()))
    B.append(h2("c-stato-co", None, "Canali e obiezioni"))
    B.append(info(canali_obiezioni_html()))
    B.append(box("nota", "Se compare «Nessun runtime AI disponibile» l'AI non è raggiungibile: scegli tu stato e obiezioni."))

    B.append(cap(None, "L'analisi: la strategia da seguire", P2, "c-analisi",
                 "Lo studio del lead, in poche righe: cosa emerge e come avvicinarlo."))
    B.append(info(azione_risultato(["Leggi l'analisi prima di contattare il cliente.", "Correggila se la strategia ti sembra sbagliata."],
                                   ["Una nota di circa 100 parole: cosa emerge dai dati e quale strategia seguire.", "Gli script costruiti su quella strategia."])))
    B.append(fig("console-06-analisi", legend=[("analisi", "Il testo.", "Compare da solo. Puoi riscriverlo liberamente.")], layout="stack", w="100%"))
    B.append(ul([
        "È una nota <b>per te</b>: non è un testo da dire al cliente e gli script non la citano.",
        "Se la riscrivi, gli script successivi seguono la tua versione: è il modo più rapido per indirizzarli.",
        "Resta salvata con il lead nello Storico.",
    ]))

    B.append(cap(None, "La generazione degli script", P2, "c-gen",
                 "Con un clic la Console prepara i testi per telefono, WhatsApp ed email, tutti costruiti sulla strategia. Rileggi sempre gli script prima di usarli: l'AI può sbagliare (le regole sempre attive sono nell'Appendice C)."))
    B.append(info(azione_risultato(["Controlla che almeno un canale sia acceso.", "Premi «Genera script»."],
                                   ["Un testo per ogni canale acceso.", "Email con oggetto e corpo, WhatsApp pronto da inviare, script del telefono."])))
    B.append(fig("console-07-generazione", legend=[
        ("genera", "Genera script.", "Prepara i testi."),
        ("badge", "Etichetta.", "«Generato da AI», oppure «Bozza da libreria» se l'AI non era disponibile."),
        ("rigenera", "Rigenera.", "Un'altra versione di quel solo canale."),
        ("copia", "Copia.", "Copia il testo negli appunti."),
        ("whatsapp", "Logo WhatsApp.", "Apre WhatsApp col messaggio già scritto (capitolo {c:c-wa})."),
        ("email", "Busta Mail.", "Apre la posta con la mail già compilata (capitolo {c:c-mail})."),
        ("salva", "Salva lead in storico.", "Capitolo {c:c-rivedi}."),
        ("sv", "Invia a Suggerimenti Vendita.", "Capitolo {c:c-chiamata}."),
    ], layout="stack", w="100%", fm="72mm"))

    B.append(cap(None, "Rivedere, modificare e salvare gli script", P2, "c-rivedi",
                 "Gli script sono una bozza di partenza: sono tuoi, puoi cambiarli prima di usarli."))
    B.append(info(azione_risultato(["Correggi i testi direttamente nei campi.", "Rigenera un canale, se serve.", "Premi «Salva lead in storico»."],
                                   ["Il lead salvato con dati, strategia e script (anche modificati).", "Tutto pronto per telefonare."])))
    B += passi([
        "<b>Correggere:</b> ogni testo è un campo che puoi riscrivere. Quello che lasci è quello che verrà usato.",
        "<b>Rigenerare:</b> «Rigenera» nel riquadro scrive un'altra versione solo di quel canale. Se hai cambiato stato, obiezioni o analisi, ripremi «Genera script».",
        "<b>Salvare:</b> in fondo alla sezione 5 premi «Salva lead in storico»: compare «Lead salvato nello storico» e la Console ti porta nello Storico.",
    ])
    B.append(box("consiglio", "Salva il lead prima di telefonare: qualunque cosa succeda, hai già tutto pronto per i passi successivi."))
    return B

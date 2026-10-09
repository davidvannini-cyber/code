# -*- coding: utf-8 -*-
"""Parte 6 (Dopo il lavoro) e Appendici A-E."""
import json, os, re
from man_lib import *

P6, P7 = "Parte 6", "Parte 7"
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
    # ---------------------------------------------------------------- 19
    B.append(cap(21, "Lo Storico dei lead", P6, "c21",
                 "È la seconda scheda (l'icona dell'orologio). Qui trovi tutti i lead salvati e segni cosa hai già fatto."))
    B.append(h2("c21-elenco", "21.1", "L'elenco e le colonne"))
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
    B.append(h2("c21-cerca", "21.2", "Cercare un lead"))
    B.append(fig("console-15-storico-ricerca", legend=[("cerca", "Campo di ricerca.", "Scrivi nome, telefono, email o zona."), ("conta", "Contatore.", "Quanti lead vedi sul totale.")], layout="stack", w="100%"))
    B.append(ul([
        "La ricerca ignora maiuscole e accenti. Per cercare un telefono bastano 3 cifre.",
        "Se scrivi più parole, il lead deve contenerle tutte.",
        "Per svuotare la ricerca premi la ✕ nel campo.",
    ]))
    B.append(h2("c21-ordina", "21.3", "Ordinare, nascondere e filtrare"))
    B.append(fig("console-12-storico-pannello", legend=[
        ("ordina", "Ordina per.", "Data (più o meno recenti prima) oppure Cliente A→Z / Z→A."),
        ("nascondi", "Nascondi lavorati.", "Toglie dall'elenco i lead già segnati come lavorati."),
        ("esporta", "Esporta storico.", "Scarica un foglio Excel (21.4)."),
        ("filtri", "Filtri.", "Apre i filtri. Il numero indica quanti sono attivi."),
    ], layout="stack", w="100%"))
    B.append(fig("console-14-storico-filtri", legend=[
        ("stato", "Stato.", "Mostra solo i lead di uno stato."),
        ("lavorati", "Lavorati.", "Tutti, solo lavorati o solo da lavorare."),
        ("dal", "Dal.", "Data di inizio."),
        ("al", "Al.", "Data di fine."),
    ], layout="stack", w="100%"))
    B.append(p("Quando almeno un filtro è attivo compare il link <b>«Azzera filtri»</b>. L'ordinamento e «Nascondi lavorati» vengono ricordati la volta dopo."))
    B.append(h2("c21-excel", "21.4", "Esportare in Excel"))
    B.append(p("«Esporta storico» scarica un file <code>storico_lead_AAAA-MM-GG.xlsx</code> con i lead che vedi in quel momento (quindi anche con ricerca e filtri applicati). "
               "Le colonne sono: Data, Cliente, Telefono, Telefono (secondario), Email, Prodotto, Zona, Stato, Canali generati, Telefonata, WhatsApp, Email inviata, Lavorato."))

    # ---------------------------------------------------------------- 20
    B.append(h2("c21-apri", "21.5", "Aprire la scheda del lead"))
    B.append(p("Premi l'<b>occhio</b> sulla riga. Si apre una finestra con tutto quello che hai salvato: dati, analisi, note e gli script, ognuno con il suo contatto, "
               "il pulsante per copiare e quello per inviare (WhatsApp ed email, come nei capitoli 16 e 17)."))
    B.append(fig("console-17-storico-apri-testata", legend=[
        ("crm", "Collegamento esterno.", "Apre il lead nel CRM."),
        ("telefono", "Cornetta.", "Invia il lead al telefono."),
        ("sv", "Freccia in alto (blu).", "Invia a Suggerimenti Vendita."),
        ("stampa", "Stampante.", "Stampa il lead o lo salva in PDF."),
        ("chiudi", "✕.", "Chiude la finestra."),
    ], layout="stack", w="100%"))
    B.append(p("Se hai modificato gli script a mano, sotto il nome compare «modificato manualmente». Per stampare usa la stampante: la stampa esce su fondo bianco senza i pulsanti."))
    B.append(h2("c21-duplica", "21.6", "Duplicare un lead"))
    B.append(p("L'icona dei due quadratini sulla riga <b>duplica</b> il lead: porta i suoi dati nella scheda «Lead», con lo stato e le obiezioni, pronti per generare nuovi script. "
               "Gli script vecchi non vengono copiati. È comodo per riprendere un lead dopo qualche giorno."))
    B.append(h2("c21-elimina", "21.7", "Eliminare un lead"))
    B += passi(["Premi il <b>cestino</b> rosso sulla riga.", "Conferma «Eliminare definitivamente questo lead dallo storico?»."])
    B.append(box("attenzione", "L'eliminazione è definitiva. Se elimini un lead per errore, prova subito «Recupera copia automatica» (capitolo 23)."))

    # ---------------------------------------------------------------- 17
    B.append(cap(22, "Il pulsante «CRM»", P6, "c22",
                 "Il pulsante CRM apre il lead nel CRM Facile Salire, senza dover cercare a mano."))
    B.append(h2("c22-dove", "22.1", "I tre posti dove si trova"))
    B.append(tab(["Dove", "Come si presenta"], [
        ["Scheda Lead, in alto a destra", "Pulsante con l'icona di collegamento esterno e la scritta «CRM»."],
        ["Storico, su ogni riga", "Pulsante con la sola scritta «CRM», nella colonna a destra."],
        ["Finestra di un lead dello Storico", "Icona di collegamento esterno nella testata, prima delle altre icone."],
    ]))
    B.append(h2("c22-cosa", "22.2", "Cosa fa"))
    B.append(ul([
        "Se il lead ha già il suo <b>codice CRM</b> (si salva quando importi il lead dal CRM), apre <b>direttamente quel lead</b>.",
        "Se il codice non c'è ancora, apre l'<b>elenco dei lead</b> del CRM (il suggerimento sul pulsante dice «ID non ancora collegato»).",
        "Il CRM si apre in una finestra di Chrome a parte, larga il 40% e alta l'80% dello schermo, in alto a destra. Se il browser blocca la finestra, la apre in una scheda normale.",
    ]))
    B.append(box("consiglio", "Per far collegare un lead dello Storico al CRM basta importarlo una volta dal CRM con il pulsante blu (capitolo 1): la Console lo riconosce e salva il collegamento."))

    # ---------------------------------------------------------------- 21
    B.append(cap(23, "Backup dei dati", P6, "c23",
                 "I lead sono salvati nel browser di questo Mac. Il backup su file ti protegge se i dati del browser vengono cancellati."))
    B.append(fig("console-12-storico-pannello", legend=[
        ("scarica", "Scarica.", "Crea il file di backup."),
        ("ripristina", "Ripristina.", "Rimette i lead da un file di backup."),
        ("recupera", "Recupera copia automatica.", "Riprende lead dalle copie di riserva."),
        ("copiaauto", "Copia automatica.", "Data e ora dell'ultima copia di riserva."),
    ], layout="stack", w="100%"))
    B.append(h2("c23-scarica", "23.1", "Scaricare il backup"))
    B += passi([
        "Nello Storico premi <b>«Scarica»</b>, accanto a «Backup».",
        "Compare «Backup scaricato: N lead ✓» e il file <code>leadrework-lead-AAAA-MM-GG_HHMM.json</code> finisce nella cartella Download.",
        "Spostalo in un posto sicuro (una cartella sul Mac o un disco esterno).",
    ])
    B.append(p("Il backup contiene <b>tutti</b> i lead, anche quelli che al momento non vedi per la ricerca o i filtri."))
    B.append(h2("c23-ripristina", "23.2", "Ripristinare da un backup"))
    B += passi([
        "Premi <b>«Ripristina»</b> e scegli il file di backup.",
        "Se alcuni lead del file esistono già, la Console chiede: <b>OK</b> = sostituisci quelli attuali con la versione del backup; <b>Annulla</b> = tieni quelli attuali (i lead nuovi vengono aggiunti comunque).",
        "Compare il riepilogo: «Import completato: X aggiunti, Y sostituiti, Z già presenti lasciati invariati ✓».",
    ])
    B.append(box("nota", "Il ripristino <b>unisce</b> i lead e non cancella mai niente. Se il file non è un backup della Console compare «Backup non valido» e lo Storico non viene toccato."))
    B.append(h2("c23-auto", "23.3", "La copia automatica"))
    B.append(p("A ogni modifica dello Storico la Console tiene da sola <b>due copie di riserva</b> dentro il browser. «Recupera copia automatica» riaggiunge i lead che sono nelle copie ma non più nello Storico (per esempio eliminati per errore). "
               "Prima ti chiede conferma; i lead attuali non vengono toccati."))
    B.append(p("Se aprendo la Console lo Storico risulta assente ma esiste una copia, la Console lo ripristina da sola e avvisa «Storico lead non trovato: ho ripristinato automaticamente N lead dalla copia di sicurezza»."))
    B.append(box("consiglio", "La copia automatica sta nello stesso browser: se i dati del browser vengono cancellati sparisce anche lei. Scarica un backup su file ogni settimana."))
    B.append(cap("A", "Appendice A — Gli script della Lead Rework Console", P7, "cA",
                 "La libreria di riferimento che la Console usa per scrivere gli script. Sono 26, numerati da 1 a 27 (il numero 22 non esiste più)."))
    B += tab_split(["N.", "Canale", "Titolo"], _script_console(), per=9)
    B.append(box("nota", "Questa libreria è diversa da quella di Suggerimenti Vendita (Appendice B): ognuna ha il suo scopo."))

    B.append(cap("B", "Appendice B — Gli script di Suggerimenti Vendita", P7, "cB",
                 "La libreria che il sistema usa per i suggerimenti durante la chiamata. Sono 17, di cui 16 attivi."))
    B += tab_split(["Fase", "Script", "Situazione", "Attivo"], _script_sv(), per=9)

    B.append(cap("C", "Appendice C — Le regole che l'AI rispetta sempre", P7, "cC",
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

    # ---------------------------------------------------------------- 34
    B.append(cap("D", "Appendice D — Glossario", P7, "cD", "Le parole usate nel sistema, in ordine alfabetico."))
    B += tab_split(["Parola", "Significato"], sorted([
        ["AGC", "Regolazione automatica del volume del microfono, fatta dal browser."],
        ["API key", "Chiave segreta che dà accesso a un servizio (Anthropic, Deepgram). Tratta come una password."],
        ["Cascata", "L'ordine dei contatti: prima la telefonata, poi WhatsApp ed email se la telefonata non va a buon fine."],
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

    B.append(cap("E", "Appendice E — Gestire la libreria di Suggerimenti Vendita", P7, "cE",
                 "La libreria contiene le frasi che il sistema suggerisce durante la chiamata. Si usa di rado: serve per vederla, farla crescere e provarla."))
    # ---------------------------------------------------------------- 27
    B.append(h2("cE-vedi", "E.1", "Vedere la libreria"))
    B.append(p("Nel menu premi <b>«Vedi libreria»</b>. Compare una finestra con il totale degli script e una riga per ognuno, nel formato «[fase] nome». "
               "Guardala prima di aggiungere qualcosa, per non fare doppioni."))
    B.append(h2("cE-aggiungi", "E.2", "Aggiungere uno script"))
    B.append(p("Uno script ha due parti: le <b>frasi di esempio del cliente</b> (servono al sistema per capire quando usarlo e non si vedono mai in chiamata) e il <b>suggerimento</b> (il testo che comparirà nel pannello)."))
    B += passi([
        "Nel menu premi <b>«Aggiungi script»</b>.",
        "Scegli dalla lista <b>in quale fase della chiamata</b> si usa: apertura, scoperta, presentazione, obiezioni, chiusura.",
        "Scegli <b>quale situazione lo attiva</b> (tabella qui sotto).",
        "Scrivi un <b>nome breve</b>, per esempio «obiezione prezzo sconto». Va bene qualsiasi testo: il sistema lo trasforma in minuscolo con i trattini bassi. Se esiste già uno script con quel nome ti avvisa.",
        "Scrivi le <b>frasi di esempio del cliente</b>, una alla volta. Lascia vuoto quando hai finito. Serve almeno una frase: più ne scrivi (2-5 è l'ideale), meglio il sistema riconosce la situazione.",
        "Scegli come scrivere il suggerimento: <b>«Lo scrivo io»</b> o <b>«Genera con l'AI»</b> (vedi E.3).",
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
    B.append(h2("cE-ai", "E.3", "Far scrivere il testo all'AI"))
    B += passi([
        "Scegli <b>«Genera con l'AI»</b>.",
        "L'AI scrive una proposta usando fase, situazione, frasi di esempio e il profilo azienda.",
        "La proposta compare in un campo che <b>puoi modificare liberamente</b>. Premi <b>«Usa questo testo»</b> per salvarla, <b>«Rigenera»</b> per averne un'altra, <b>«Annulla»</b> per rinunciare.",
    ])
    B.append(box("nota", "Il testo non viene mai salvato alla cieca: lo vedi sempre prima. Se la generazione non riesce compare «Non sono riuscito a generare una proposta»: scrivilo tu."))
    B.append(box("nota", "Le condizioni avanzate (per esempio «usa questo script solo per un certo tipo di lead») non si impostano da queste finestre: chiedi a chi cura il sistema."))

    # ---------------------------------------------------------------- 28
    B.append(h2("cE-frasi", "E.4", "Rivedere le frasi raccolte"))
    B.append(p("Ogni chiamata raccoglie le frasi nuove dei clienti; rivederle fa crescere la libreria. Le frasi si salvano da sole durante la chiamata, insieme allo script che era stato scelto. Quando vuoi, nel menu premi <b>«Rivedi frasi raccolte»</b>."))
    B += passi([
        "Compare il numero di frasi da rivedere. Premi OK.",
        "Per ogni frase vedi la fase della chiamata e se il sistema aveva trovato uno script («Durante la chiamata non era stato trovato nessuno script pertinente» è il segnale che quella situazione non è ancora coperta).",
        "Scegli: <b>«Ignora»</b> (non era utile), <b>«Usa questa frase»</b> o <b>«Interrompi»</b> (le frasi non riviste restano per la prossima volta).",
        "Se hai scelto «Usa questa frase», dalla lista scegli <b>a quale script aggiungerla</b> (così lo script riconosce meglio la situazione) oppure <b>«Crea un nuovo script con questa frase»</b>.",
        "Se la frase era già tra gli esempi di quello script, compare «Questa frase era già tra gli esempi» e viene segnata come rivista.",
        "Alla fine compare «Revisione completata».",
    ])
    B.append(box("nota", "Se non ci sono frasi nuove compare «Non ci sono nuove frasi da rivedere. Compariranno qui dopo le prossime chiamate»."))

    # ---------------------------------------------------------------- 30
    B.append(h2("cE-taudio", "E.5", "Test: solo audio"))
    B.append(p("Controlla che il Mac senta il telefono e che la trascrizione funzioni, senza avviare una chiamata vera."))
    B += passi([
        "Premi <b>«Test: solo audio»</b>.",
        "Dalla lista scegli il <b>dispositivo audio</b> collegato allo splitter. Se non ne trova compare «Nessun device audio di input trovato».",
        "Compare «Il test durerà 15 secondi: parla vicino al telefono». Premi OK e parla.",
        "Alla fine compare «Test terminato» e le trascrizioni si aprono in TextEdit.",
    ])
    B.append(h2("cE-tmatch", "E.6", "Test: solo matching"))
    B.append(p("Controlla quale script sceglie il sistema per una frase, senza audio. È utile dopo aver aggiunto uno script."))
    B += passi([
        "Premi <b>«Test: solo matching»</b>. Compare «Carico il motore di matching, attendi qualche secondo»: succede una volta sola per il test.",
        "Scrivi <b>una frase come se fossi il cliente</b>, per esempio «il prezzo mi sembra eccessivo», e premi OK.",
        "Compare lo script scelto, nel formato «[fase] testo», con l'eventuale alternativa. Se nessuno è pertinente compare «Nessuno script pertinente trovato per questa frase».",
        "Scrivi un'altra frase, oppure lascia vuoto per tornare al menu.",
    ])

    return B

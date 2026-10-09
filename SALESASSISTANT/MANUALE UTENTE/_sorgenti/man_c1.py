# -*- coding: utf-8 -*-
"""Parte 1 (Presentazione) e Parte 2 (Installazione e primo avvio)."""
from man_lib import *
from man_lib import _ic

P1 = "Parte 1"
P2 = "Parte 2"


def telefono_android_html(righe, did):
    """Rappresentazione schematica della schermata dell'app Android (non è uno screenshot)."""
    out = []
    for n, (cls, testo) in enumerate(righe, 1):
        badge = '<span class="bd phb">%d</span>' % n if n is not None and cls != "x" else ""
        out.append('<div class="ph-r %s">%s%s</div>' % (cls, testo, badge))
    return ('<div class="fig-img"><div class="phone"><div class="ph-bar"></div>%s</div><div class="didascalia">%s</div></div>' % ("".join(out), did))


CSS_PHONE = ""


def blocchi():
    B = []
    # =====================================================================  PARTE 1
    B.append(cap(1, "Cos'è questo sistema e come funziona", P1, "c1",
                 "Il sistema ti aiuta a lavorare i lead di YesMobility: prepara i messaggi da inviare al cliente e, durante la telefonata, ti suggerisce cosa rispondere."))
    B.append(h2("c1-pezzi", "1.1", "I tre programmi che lavorano insieme"))
    B.append(p("Il sistema è fatto di <b>tre programmi</b>. Ognuno ha un compito preciso e li userai quasi sempre uno dopo l'altro."))
    B.append(info(tre_pezzi_html()))
    B.append(h2("c1-comunicano", "1.2", "Come si parlano tra loro"))
    B.append(p("Tutto parte dal <b>CRM Facile Salire</b>, dove si trovano i lead. Un piccolo pulsante, aggiunto a Chrome dall'<b>estensione</b>, "
               "porta i dati del lead nella <b>Lead Rework Console</b>. Da lì, per ogni lead, hai quattro strade."))
    B.append(info(arch_html()))
    B.append(p("Non devi spostare nessun file a mano: i dati viaggiano da soli da un programma all'altro."))
    B.append(h2("c1-riassunto", "1.3", "In una tabella"))
    B.append(tab(["Programma", "Dove si usa", "A cosa serve"], [
        ["Estensione Chrome", "Dentro Chrome, sulle pagine del CRM", "Aggiunge il pulsante blu «Invia a Lead Rework Console» e porta i dati del lead nella Console."],
        ["Lead Rework Console", "Una pagina in Chrome sul Mac", "Riceve il lead, ti fa controllare i dati e prepara gli script di telefono, WhatsApp ed email. Tiene lo Storico dei lead lavorati."],
        ["Suggerimenti Vendita", "App per Mac", "Ascolta la voce del cliente durante la chiamata e mostra il suggerimento più adatto. Mostra anche la guida (canovaccio) del lead."],
        ["Rubrica YesMobility", "App per telefono Android", "Riceve il lead dal Mac, lo salva in rubrica e, se vuoi, avvia la chiamata con Lyber."],
    ]))

    B.append(cap(2, "Una giornata di lavoro, passo per passo", P1, "c2",
                 "Ecco come si lavora un lead dall'inizio alla fine. Ogni passo è spiegato in dettaglio nei capitoli successivi."))
    B.append(h2("c2-giornata", "2.1", "Gli otto passi"))
    B.append(info(giornata_html()))
    B.append(h2("c2-audio", "2.2", "Cosa succede durante una chiamata"))
    B.append(p("Quando fai partire una chiamata da Suggerimenti Vendita, l'audio segue questo percorso. Tu non devi fare niente: "
               "devi solo leggere il suggerimento che compare nel pannello."))
    B.append(info(flusso_html()))
    B.append(p("Importante: il Mac riceve <b>solo la voce del cliente</b>. La tua voce va direttamente al telefono e non viene registrata né trascritta."))
    B.append(h2("c2-modalita", "2.3", "Le tre modalità di chiamata"))
    B.append(info(modalita_html()))
    B.append(h2("c2-finestre", "2.4", "Le tre finestre affiancate"))
    B.append(p("Le finestre si dispongono da sole una accanto all'altra, così le vedi tutte insieme senza cercarle."))
    B.append(info(finestre_html()))

    B.append(cap(3, "Prima di iniziare: cosa serve", P1, "c3",
                 "Controlla questa lista una volta sola. Quando è tutto a posto, i capitoli successivi ti guidano passo per passo."))
    B.append(h2("c3-lista", "3.1", "La lista di controllo"))
    B.append(tab(["Cosa serve", "A cosa serve", "Dove si trova"], [
        ["Un Mac con Google Chrome", "La Console e il pannello di chiamata si aprono in Chrome.", "Chrome si scarica da google.com/chrome."],
        ["La cartella del progetto aggiornata", "Contiene la Console, l'app Suggerimenti Vendita e l'estensione.", "Si aggiorna con Sync.command (capitolo 32)."],
        ["L'estensione Chrome installata", "Porta i dati dal CRM alla Console.", "Capitolo 4."],
        ["Una chiave Anthropic (API key)", "Fa scrivere gli script all'AI e aiuta a scegliere i suggerimenti.", "console.anthropic.com. La chiave inizia con sk-ant-."],
        ["Una chiave Deepgram", "Trascrive la voce del cliente in testo.", "deepgram.com (c'è una prova gratuita)."],
        ["Lo splitter per cuffie (TRRS) e le cuffie", "Porta la voce del cliente al Mac senza disturbare la chiamata.", "Fa arrivare al Mac solo la voce del cliente (capitolo 7)."],
        ["Un telefono Android (facoltativo)", "Per «Invia a telefono»: salva il contatto e chiama.", "Con l'app Rubrica YesMobility e l'app Lyber (capitolo 8)."],
    ]))
    B.append(box("consiglio", "Non serve avere tutto subito. Per cominciare a preparare script basta la Console con la chiave Anthropic. "
                              "Il resto si aggiunge quando serve."))
    B.append(h2("c3-parole", "3.2", "Poche parole da conoscere"))
    B.append(tab(["Parola", "Significato"], [
        ["Lead", "Un cliente che ha chiesto informazioni. Nel CRM ogni lead ha una sua pagina."],
        ["Script", "Il testo da dire al telefono o da inviare per WhatsApp o email."],
        ["Canovaccio / Guida chiamata", "Lo script del lead, mostrato in un riquadro verde durante la chiamata."],
        ["Suggerimento", "La frase consigliata che compare mentre il cliente parla (per esempio quando dice che il prezzo è alto)."],
        ["Stato del lead", "A che punto è il lead (per esempio «Nuovo lead» o «Trattativa persa»). Decide quali script vengono preparati."],
        ["API key", "Una chiave segreta che dà accesso a un servizio (Anthropic, Deepgram). Si tratta come una password."],
        ["Estensione", "Un piccolo programma aggiunto a Chrome."],
    ]))

    # =====================================================================  PARTE 2
    B.append(cap(4, "Installare l'estensione Chrome", P2, "c4",
                 "L'estensione serve per far arrivare i dati del lead dal CRM alla Console. Si installa una volta sola."))
    B.append(h2("c4-install", "4.1", "Installazione, una sola volta"))
    B += passi([
        "Apri <b>Google Chrome</b>.",
        "Nella barra degli indirizzi scrivi <code>chrome://extensions</code> e premi Invio.",
        "In alto a destra attiva l'interruttore <b>«Modalità sviluppatore»</b>.",
        "Premi il pulsante <b>«Carica estensione non pacchettizzata»</b>.",
        "Scegli la cartella <code>browser-extension</code>, che si trova dentro <code>SALESASSISTANT/LEADREWORKS</code>, e premi <b>Seleziona</b>.",
        "Nell'elenco compare <b>«YesMobility CRM -&gt; Lead Rework Console»</b>. Premi <b>«Dettagli»</b> su quella scheda.",
        "Attiva l'opzione <b>«Consenti accesso agli URL di file»</b>.",
    ])
    B.append(box("attenzione", "L'ultimo passo è indispensabile. La Console è un file sul tuo Mac: senza questa opzione l'estensione non la vede e i dati restano in attesa senza che succeda nulla."))
    B.append(h2("c4-aggiorna", "4.2", "Dopo un aggiornamento del sistema"))
    B += passi([
        "Apri di nuovo <code>chrome://extensions</code>.",
        "Sulla scheda dell'estensione premi il pulsante <b>«Ricarica»</b> (la freccia circolare).",
        "Torna sulla pagina del CRM e premi <b>F5</b> per ricaricarla.",
    ])
    B.append(h2("c4-cosafa", "4.3", "Cosa fa l'estensione"))
    B.append(ul([
        "Sulle pagine dei lead del CRM (<code>app.facilesalire.it/leads/…</code>) aggiunge in basso a destra il pulsante blu <b>«Invia a Lead Rework Console»</b>.",
        "Quando lo premi, legge i dati del lead dalla pagina e li consegna alla Console. Se la Console non è aperta, la apre da sola.",
        "Quando dalla Console premi «Invia a Suggerimenti Vendita», porta lo script alla pagina della chiamata.",
    ]))

    B.append(cap(5, "Aprire la Lead Rework Console", P2, "c5",
                 "La Console è la pagina dove prepari ogni lead. Si apre in Chrome, in una finestra senza barra degli indirizzi."))
    B.append(h2("c5-aprire", "5.1", "Come si apre"))
    B += passi([
        "Nella cartella <code>SALESASSISTANT/LEADREWORKS</code> fai doppio clic su <b><code>apri-console.command</code></b>.",
        "La prima volta macOS può chiedere conferma: fai clic con il tasto destro sul file, scegli <b>Apri</b> e conferma.",
        "Si apre una finestra di Chrome a sinistra dello schermo: larga il 35% e alta il 60%.",
    ])
    B.append(p("La Console si apre anche da sola quando premi il pulsante blu sul CRM e non era già aperta."))
    B.append(h2("c5-barra", "5.2", "La barra in alto"))
    B.append(fig("console-02-barra-alto", legend=[
        ("lead", "Lead.", "Qui lavori un lead: dati, stato, script."),
        ("storico", "Storico Lead.", "L'elenco dei lead già salvati."),
        ("profilo", "Profilo Azienda.", "Impostazioni: profilo, AI e codice per il telefono."),
        ("stato", "Pallino di stato.", "Arancione = i dati sono salvati su questo Mac, nel browser. È normale."),
    ], layout="stack", w="100%"))
    B.append(p("Nelle finestre strette si vede il nome solo della scheda aperta: passa il mouse sulle altre icone per leggere il nome."))
    B.append(h2("c5-ambiente", "5.3", "La striscia «Ambiente» in fondo"))
    B.append(fig("console-22-ambiente", legend=[
        ("db", "db.", "«fallback locale» (arancione) è normale: i lead sono salvati nel browser."),
        ("sample", "sample API.", "Verde = l'AI è pronta."),
        ("apikey", "API key.", "«configurata» = la chiave Anthropic è salvata."),
        ("immagini", "immagini.", "«abilitate» = si possono caricare screenshot da far leggere all'AI."),
    ], layout="stack", w="100%"))
    B.append(box("nota", "I lead restano su questo Mac, dentro il browser. Per non rischiare di perderli fai ogni tanto il backup (capitolo 21)."))

    B.append(cap(6, "Le impostazioni iniziali della Console", P2, "c6",
                 "Da fare una volta sola, nella scheda «Profilo Azienda» (la terza icona in alto)."))
    B.append(h2("c6-profilo", "6.1", "Il profilo azienda"))
    B.append(fig("console-19-profilo-card-0", w="100%", did="Il profilo azienda: i dati fissi usati ogni volta che l'AI scrive uno script."))
    B.append(tab(["Campo", "Cosa scrivere"], [
        ["Nome azienda", "YesMobility."],
        ["Nome operatore", "Il nome che compare negli script al posto di «[Nome operatore]»."],
        ["Ruolo percepito dal cliente", "Come il cliente vede YesMobility (per esempio un servizio di selezione e contatto con l'installatore)."],
        ["Settore", "Per esempio «Montascale, pedane, elevatori»."],
        ["Partner installazione default", "Il nome dell'installatore partner. È un dato interno: non viene mai detto al cliente."],
        ["Produttori partner", "I marchi, separati da virgola."],
        ["Value proposition", "I punti di forza, uno per riga."],
        ["Tono di voce", "Come devono suonare gli script (per esempio consulenziale, cordiale)."],
        ["Regole critiche di compliance", "Regole in più, una per riga. Le regole principali sono già sempre attive (Appendice C)."],
        ["Prodotti selezionabili", "Le voci del menu «Prodotto», separate da virgola."],
    ]))
    B.append(p("Quando hai finito premi <b>«Salva profilo»</b>: accanto compare «Salvato ✓»."))
    B.append(h2("c6-ai", "6.2", "Le impostazioni dell'intelligenza artificiale"))
    B.append(p("Per far scrivere gli script all'AI serve una chiave Anthropic."))
    B.append(fig("console-19c-profilo-ai", legend=[
        ("apikey", "Anthropic API key.", "Incolla qui la chiave (inizia con <code>sk-ant-</code>)."),
        ("modello", "Modello.", "Lascia quello proposto."),
        ("workspace", "Workspace ID.", "Solo se un errore lo richiede."),
        ("salva", "Salva.", "Conferma visiva: i campi si salvano già mentre scrivi."),
        ("testa", "Testa connessione.", "Controlla che la chiave funzioni."),
        ("rimuovi", "Rimuovi chiave.", "Cancella chiave e workspace."),
        ("esporta", "Esporta impostazioni AI.", "Salva un file di riserva."),
        ("importa", "Importa impostazioni AI.", "Rimette i valori da quel file."),
    ], layout="stack", w="100%"))
    B += passi([
        "Incolla la chiave nel campo <b>Anthropic API key</b>.",
        "Lascia il <b>Modello</b> com'è.",
        "Premi <b>«Testa connessione»</b>. Se tutto va bene compare «✓ Connessione riuscita».",
        "Se compare un errore che nomina il «Workspace ID», incollalo nel campo apposito (lo trovi su console.anthropic.com, in Settings → Workspaces) e riprova.",
    ])
    B.append(box("consiglio", "Alcuni browser non ricordano i dati quando la Console viene aperta con doppio clic. Premi «Esporta impostazioni AI» e conserva il file: se un giorno i valori sparissero, «Importa impostazioni AI» li rimette."))
    B.append(box("attenzione", "Il file esportato contiene la tua chiave in chiaro. Conservalo come una password e non condividerlo."))
    B.append(h2("c6-telefono", "6.3", "Il codice segreto per il telefono"))
    B.append(fig("console-19b-profilo-telefono", legend=[
        ("codice", "Codice segreto.", "Una scritta che inizia con <code>ym-</code>. Va copiata e incollata nell'app del telefono."),
        ("genera", "Genera codice.", "Crea un nuovo codice."),
    ], layout="stack", w="100%"))
    B += passi([
        "Premi <b>«Genera codice»</b>: nel campo compare il codice.",
        "Selezionalo e copialo con <b>Cmd+C</b>.",
        "Lo incollerai nell'app Android (capitolo 8) e, la prima volta che usi «Invia a telefono», nel pannello di chiamata.",
    ])
    B.append(box("attenzione", "Se generi un nuovo codice, quello vecchio smette di funzionare: il Mac ti avvisa «Generare un nuovo codice?». Dovrai incollare il nuovo anche nell'app sul telefono."))
    B.append(box("attenzione", "Il codice è come una password: chi lo conosce può mandare contatti al tuo telefono. Non condividerlo."))

    B.append(cap(7, "Installare e avviare Suggerimenti Vendita", P2, "c7",
                 "Suggerimenti Vendita è l'app per Mac che ascolta la chiamata. La prima volta va preparata: ci vogliono pochi minuti."))
    B.append(h2("c7-aprire", "7.1", "Aprire l'app"))
    B += passi([
        "Fai doppio clic su <b>«Suggerimenti Vendita.app»</b> (nella cartella <code>SUGGERIMENTIVENDITA</code> o, se l'hai spostata, in Applicazioni).",
        "Se macOS dice «sviluppatore non identificato», fai clic con il tasto destro sull'app, scegli <b>Apri</b> e conferma. Succede solo la prima volta.",
        "Se invece dice «Non disponi dei permessi necessari», fai doppio clic su <code>ripara_permessi.command</code> nella stessa cartella e riprova.",
    ])
    B.append(h2("c7-primo", "7.2", "Il primo avvio"))
    B.append(p("Al primissimo avvio, prima di aver fatto il setup, l'app può mostrare un menu a lista invece dei pulsanti colorati: è normale. Dopo il setup vedrai il menu a pulsanti."))
    B += passi([
        "Premi <b>«Ambiente»</b> (Setup iniziale). Premi OK e <b>aspetta qualche minuto</b>: l'app non mostra nulla mentre lavora, è normale. Alla fine compare «Setup completato con successo».",
        "Premi <b>«API key»</b>. Compaiono due finestre: incolla prima la chiave <b>Deepgram</b> (da deepgram.com), poi la chiave <b>Anthropic</b> (da console.anthropic.com). Alla fine compare «API key salvate».",
        "Guarda in fondo al menu: deve esserci un pallino verde con la scritta <b>«ambiente pronto»</b>.",
    ])
    B.append(fig("menu-03-stato-attenzione", w="70mm", did="Se manca qualcosa, il pallino è giallo e la scritta dice cosa fare: «ambiente non configurato» oppure «API key non configurate»."))
    B.append(box("nota", "Se compare «Python non è installato correttamente», installa Python da python.org/downloads/macos (circa 30 MB) e poi ripremi «Ambiente»."))
    B.append(h2("c7-mic", "7.3", "Il permesso del microfono"))
    B.append(p("La prima volta che avvii una chiamata, <b>Chrome</b> chiede il permesso di usare il microfono. Premi <b>«Consenti»</b>. Non è l'app Mac a chiederlo: per questo il pannello di chiamata si apre in Chrome."))
    B.append(h2("c7-splitter", "7.4", "Lo splitter e le cuffie"))
    B.append(p("Lo splitter è il piccolo cavo che separa le due voci della telefonata. Serve perché il Mac senta <b>solo il cliente</b> e il telefono senta <b>solo te</b>:"))
    B.append(ul([
        "la voce del <b>cliente</b> (l'uscita cuffie del telefono) arriva sia al microfono del Mac sia alla tua cuffia;",
        "la <b>tua voce</b> (il microfono della cuffia) va direttamente al telefono e non passa dal Mac.",
    ]))
    B.append(p("Il collegamento è già stato preparato e provato sulla postazione. Se devi rifarlo, controlla che il Mac, quando lo splitter è collegato, mostri l'ingresso «External Microphone» (capitolo 25)."))

    B.append(cap(8, "Installare l'app Android Rubrica YesMobility", P2, "c8",
                 "L'app riceve dal Mac il nome e il numero del lead, li salva in rubrica e, se vuoi, avvia la chiamata con Lyber."))
    B.append(h2("c8-install", "8.1", "Scaricare e installare"))
    B += passi([
        "Dal telefono apri la pagina <code>github.com/davidvannini-cyber/code/releases/tag/rubrica-android</code>.",
        "Scarica il file <b><code>RubricaYesMobility.apk</code></b>.",
        "Aprilo. Se Android lo chiede, consenti l'installazione da questa fonte.",
        "Premi <b>Installa</b> e poi <b>Apri</b>.",
    ])
    B.append(h2("c8-config", "8.2", "La prima configurazione"))
    righe = [
        ("t", "Rubrica YesMobility"), ("s", "Versione 1.4"), ("d", "Codice segreto (lo stesso della Lead Rework Console):"),
        ("c", "ym-prova1234…"), ("b", "1. Salva e avvia l'ascolto"), ("b", "2. Concedi i permessi (contatti e notifiche)"),
        ("b", "3. Non limitare la batteria"), ("b", "4. Consenti «Mostra sopra altre app»"), ("b", "Ferma l'ascolto"),
        ("st", "Codice: impostato ✓<br>Permessi: concessi ✓<br>Batteria: non limitata ✓<br>Mostra sopra altre app: concesso ✓<br>Ultimi lead: …"),
    ]
    numeri = [None, None, None, 1, 2, 3, 4, 5, 6, 7]
    ph = "".join('<div class="ph-r %s">%s%s</div>' % (c, t, ('<span class="bd phb">%d</span>' % n) if n else "") for (c, t), n in zip(righe, numeri))
    B.append(dict(k="fig", html=(
        '<div class="fig side" style="--fw:60mm"><div class="fig-img"><div class="phone"><div class="ph-bar"></div>%s</div>'
        '<div class="didascalia">Schermata dell\'app (rappresentazione).</div></div>'
        '<ol class="legenda">'
        '<li><span class="bd fisso">1</span><div><b>Campo del codice.</b> Incolla il codice segreto copiato dalla Console.</div></li>'
        '<li><span class="bd fisso">2</span><div><b>Salva e avvia l\'ascolto.</b> Da qui in poi l\'app aspetta i lead dal Mac.</div></li>'
        '<li><span class="bd fisso">3</span><div><b>Concedi i permessi.</b> Servono per salvare i contatti e mostrare le notifiche.</div></li>'
        '<li><span class="bd fisso">4</span><div><b>Non limitare la batteria.</b> Altrimenti Android può addormentare l\'app.</div></li>'
        '<li><span class="bd fisso">5</span><div><b>Mostra sopra altre app.</b> Serve per far partire Lyber da sola.</div></li>'
        '<li><span class="bd fisso">6</span><div><b>Ferma l\'ascolto.</b> Spegne l\'app finché non premi di nuovo il pulsante 2.</div></li>'
        '<li><span class="bd fisso">7</span><div><b>Riga di stato.</b> Ogni voce deve avere il segno ✓. Sotto compare l\'elenco degli ultimi lead ricevuti.</div></li>'
        '</ol></div>' % ph)))
    B += passi([
        "Incolla nel campo il <b>codice segreto</b> copiato dalla Console (capitolo 6).",
        "Premi <b>«1. Salva e avvia l'ascolto»</b>. Compare una notifica fissa «In ascolto dei lead dal Mac».",
        "Premi <b>«2. Concedi i permessi»</b> e consenti l'accesso ai contatti e alle notifiche.",
        "Premi <b>«3. Non limitare la batteria»</b> e consenti.",
        "Premi <b>«4. Consenti Mostra sopra altre app»</b> e attiva l'interruttore per Rubrica YesMobility.",
        "Torna nell'app: nella riga di stato ogni voce deve avere il segno <b>✓</b>.",
    ])
    B.append(box("consiglio", "Tieni installata l'app Lyber: è quella che fa partire la chiamata. Dopo un riavvio del telefono l'ascolto riparte da solo, se il codice è impostato."))
    return B

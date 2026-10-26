#!/usr/bin/env python3
"""Genera ISTRUZIONI-LEAD-COLLECTOR.pdf (in questa cartella). Uso: python3 genera_istruzioni.py
Richiede: reportlab e i font DejaVu."""
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, Preformatted, PageBreak

QUI = os.path.dirname(os.path.abspath(__file__))
for n, f in (("DV", "DejaVuSans.ttf"), ("DV-B", "DejaVuSans-Bold.ttf"), ("DVM", "DejaVuSansMono.ttf")):
    for b in ("/usr/share/fonts/truetype/dejavu/", "/usr/share/fonts/dejavu/"):
        if os.path.exists(b + f):
            pdfmetrics.registerFont(TTFont(n, b + f)); break
pdfmetrics.registerFontFamily("DV", normal="DV", bold="DV-B", italic="DV", boldItalic="DV-B")

BLU = colors.HexColor("#1b6a86")
S = {
 "t": ParagraphStyle("t", fontName="DV-B", fontSize=24, leading=29, textColor=BLU, spaceAfter=4),
 "s": ParagraphStyle("s", fontName="DV", fontSize=10, leading=14, textColor=colors.HexColor("#555555"), spaceAfter=10),
 "h1": ParagraphStyle("h1", fontName="DV-B", fontSize=14, leading=18, textColor=BLU, spaceBefore=14, spaceAfter=6, keepWithNext=1),
 "h2": ParagraphStyle("h2", fontName="DV-B", fontSize=10.5, leading=14, spaceBefore=8, spaceAfter=3, keepWithNext=1),
 "p": ParagraphStyle("p", fontName="DV", fontSize=9.5, leading=14, spaceAfter=5),
 "li": ParagraphStyle("li", fontName="DV", fontSize=9.5, leading=14, leftIndent=18, firstLineIndent=-18, spaceAfter=4),
 "c": ParagraphStyle("c", fontName="DVM", fontSize=8.5, leading=11.5, backColor=colors.HexColor("#f1f4f6"), borderPadding=5, leftIndent=4, spaceBefore=3, spaceAfter=9),
}
el = []
def h1(t): el.append(Paragraph(t, S["h1"]))
def h2(t): el.append(Paragraph(t, S["h2"]))
def p(t): el.append(Paragraph(t, S["p"]))
def passi(lista):
    for i, t in enumerate(lista, 1): el.append(Paragraph(f"<b>{i}.</b>&nbsp;&nbsp;{t}", S["li"]))
    el.append(Spacer(1, 3))
def cmd(t): el.append(Preformatted(t, S["c"]))
def box(titolo, t, col="#fff6dd"):
    tb = Table([[Paragraph(f"<b>{titolo}</b><br/>{t}", S["p"])]], colWidths=[174*mm])
    tb.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), colors.HexColor(col)), ("BOX", (0,0), (-1,-1), .6, colors.HexColor("#d9c98a")), ("LEFTPADDING", (0,0), (-1,-1), 8), ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 2)]))
    el.extend([tb, Spacer(1, 8)])
def tab(righe, larg):
    d = [[Paragraph(c, S["p"]) for c in r] for r in righe]
    tb = Table(d, colWidths=[w*mm for w in larg], repeatRows=1)
    tb.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), colors.HexColor("#dcebf1")), ("GRID", (0,0), (-1,-1), .4, colors.HexColor("#b8c4ca")), ("VALIGN", (0,0), (-1,-1), "TOP")]))
    el.extend([tb, Spacer(1, 8)])

# ------------------------------------------------------------------ contenuto
el.append(Paragraph("Lead Collector", S["t"]))
el.append(Paragraph("Istruzioni d'uso e importazione dei lead in LEADREWORKS — YesMobility", S["s"]))

h1("1. A cosa serve")
p("Lead Collector riceve le email che contengono un lead (un potenziale cliente), ne ricava da solo <b>nome, email, telefono, azienda, città e messaggio</b> "
  "e li mette in una <b>tabella</b> sul tuo Mac. Da lì li cerchi, li ordini, ne segni lo stato e li passi a <b>LEADREWORKS</b>, "
  "che li analizza e prepara gli script di primo contatto (telefono, WhatsApp, email).")
tab([["Pezzo", "Cosa fa"],
     ["Lead Collector", "Raccoglie le email e le trasforma in lead in tabella. Gira sul tuo Mac all'indirizzo <b>http://localhost:3000</b>."],
     ["LEADREWORKS", "Console che prende i lead da Lead Collector, fa l'analisi e crea gli script. Si apre con l'icona «Lead Rework»."]], [38, 136])

h1("2. Prima volta: installazione")
passi(["Fai «Fai Sync» (icona Sync sulla scrivania) così hai l'ultima versione della cartella <b>LEAD-COLLECTOR</b>.",
       "Se non hai ancora l'icona: doppio clic su <b>crea-app-scrivania.sh</b> nella cartella LEAD-COLLECTOR. Compare <b>Lead Collector.app</b> sulla scrivania. "
       "Se il Mac la blocca: tasto destro sul file → <b>Apri</b>.",
       "Nella cartella LEAD-COLLECTOR copia il file <b>.env.example</b> con il nome <b>.env</b> e scrivi i tuoi valori (vedi sezione 3). Il file .env resta solo sul tuo Mac e non va mai pubblicato.",
       "Serve Node versione 18 o più recente. Per leggere la casella email in automatico, una volta sola, apri il Terminale e scrivi:"])
cmd("cd LEAD-COLLECTOR\nnpm install")

h1("3. Le impostazioni (file .env)")
tab([["Voce", "Significato"],
     ["PAGE_PASSWORD", "Password per aprire la pagina. L'app la usa da sola, non devi digitarla."],
     ["IMAP_HOST / IMAP_USER / IMAP_PASS", "La casella email da leggere (es. Gmail). La password è quella «per app» creata nelle impostazioni di sicurezza dell'account, <b>non</b> la password normale."],
     ["OWN_ADDRESSES", "I vostri indirizzi: vengono ignorati quando si cerca l'email del cliente nel testo."],
     ["ALLOWED_SENDERS", "Se compilato, accetta solo email inviate da questi indirizzi (utile per evitare spam)."],
     ["INGEST_TOKEN", "Parola segreta per il metodo «webhook» (sezione 5, modo B)."]], [56, 118])

h1("4. Avviare e spegnere")
passi(["Doppio clic su <b>Lead Collector.app</b>: il programma parte in background (senza Terminale) e si apre la pagina <b>http://localhost:3000</b>.",
       "Per spegnerlo usa il pulsante <b>Chiudi Lead Collector</b> in fondo alla pagina: ferma il programma e chiude la scheda.",
       "Se qualcosa non va, gli errori sono scritti nel file <b>data/server.log</b>. I lead sono salvati in <b>data/leads.json</b>."])
box("Importante", "Lead Collector deve essere <b>acceso</b> mentre importi in LEADREWORKS e mentre vuoi che legga le email nuove. Spento non riceve nulla.")

h1("5. Come arrivano le email")
h2("Modo A — Casella email (consigliato)")
p("Usa una casella dedicata (es. quella dei lead) e fai inoltrare lì le email. Il programma la controlla ogni 60 secondi e segna come lette quelle già prese.")
h2("Modo B — Webhook")
p("Per servizi come Zapier, Mailgun o SendGrid: invia la email a <b>/api/inbound?token=INGEST_TOKEN</b>. Normalmente non serve.")
h2("Modo C — Incolla a mano")
p("Nella pagina apri «Aggiungi a mano una email», incolla il testo (o il sorgente .eml) e conferma. Comodo per provare o per un lead arrivato in altro modo.")
p("Le email già lette non vengono duplicate (si controlla l'identificativo del messaggio).")

h1("6. Come si legge la tabella")
tab([["Colonna", "Cosa contiene"],
     ["Ricevuto / Oggetto", "Data di arrivo e oggetto dell'email."],
     ["Nome, Email, Telefono, Azienda, Città, Messaggio", "Dati ricavati dal testo. Funziona al meglio se l'email ha righe tipo <b>Nome: Mario Rossi</b>, <b>Telefono: 333…</b>. Altrimenti usa mittente, prima email e primo numero trovati."],
     ["Stato", "Lo segni tu (es. nuovo, contattato…)."],
     ["Esportato", "Casella spuntata = il lead è già stato passato a LEADREWORKS. Passando il mouse vedi la data. Puoi spuntare o togliere la spunta a mano."]], [52, 122])
p("In alto trovi la ricerca, l'ordinamento cliccando sulle colonne, il filtro <b>Tutti / Non esportati / Esportati</b> e il pulsante <b>Esporta CSV</b> (nel file c'è anche la colonna «exported»).")

el.append(PageBreak())
h1("7. Importare i lead in LEADREWORKS (procedura passo-passo)")
p("LEADREWORKS chiede a Lead Collector i lead <b>non ancora esportati</b> e li lavora uno dopo l'altro, senza altri clic. Per ognuno:")
passi(["compila la scheda (nome, telefono, email, città, azienda e messaggio nelle note);",
       "fa l'<b>analisi AI</b> del lead («Analisi e strategia»);",
       "se l'analisi è riuscita, crea gli script di <b>primo contatto</b>: con il telefono → script telefono + WhatsApp; con l'email → script email (il canale senza contatto non viene creato);",
       "salva il lead nello <b>Storico</b> e lo segna come <b>Esportato</b> in Lead Collector."])
h2("Cosa fare")
passi(["Controlla che <b>Lead Collector sia acceso</b> (apri <b>Lead Collector.app</b>; la pagina http://localhost:3000 deve aprirsi) e che in tabella ci siano lead con «Esportato» non spuntato (filtro «Non esportati»).",
       "Apri LEADREWORKS con l'icona <b>Lead Rework</b> sulla scrivania. Serve un'AI collegata (Artifact o chiave API) come per l'uso normale della console.",
       "Nella sezione <b>«1. Import dati lead»</b> premi <b>Importa da Lead Collector</b>.",
       "Aspetta: il pulsante diventa «Importazione in corso…» e mostra l'avanzamento lead per lead. Non chiudere né Lead Collector né la console.",
       "Alla fine compare il <b>riepilogo</b>: quanti lead letti, quanti con script generati, quanti salvati senza script.",
       "Vai nello <b>Storico</b> di LEADREWORKS: i lead importati sono lì, pronti per telefonare o scrivere. In Lead Collector ora hanno la spunta «Esportato»."])
box("Cosa succede se qualcosa va storto",
    "• Se l'analisi o la generazione falliscono (o manca l'AI), il lead viene <b>comunque salvato</b> nello Storico, senza script, e compare nel riepilogo finale: potrai generare gli script dopo.<br/>"
    "• Un lead già importato non viene duplicato (LEADREWORKS ricorda l'identificativo di Lead Collector).<br/>"
    "• La scheda che stavi compilando a mano viene rimessa a posto alla fine.<br/>"
    "• Il segno «Esportato» resta anche se poi cancelli il lead dallo Storico: per rifarlo, togli la spunta in Lead Collector e importa di nuovo.", "#eaf6ef")

h2("Se la connessione non funziona")
tab([["Messaggio / sintomo", "Cosa fare"],
     ["«Non riesco a collegarmi a Lead Collector… sembra spento»", "Apri <b>Lead Collector.app</b> e riprova. Controlla che http://localhost:3000 si apra."],
     ["«Lead Collector è acceso ma non risponde alla console… versione vecchia»", "Fai «Fai Sync», poi chiudi Lead Collector con <b>Chiudi Lead Collector</b> e riaprilo dall'app."],
     ["Nessun lead importato", "Tutti sono già «Esportati»: togli la spunta ai lead da rifare, oppure aspetta nuove email."],
     ["I lead arrivano senza script", "Manca l'AI o l'analisi non è riuscita: controlla il collegamento AI di LEADREWORKS e rigenera gli script dallo Storico."]], [66, 108])
box("Sicurezza", "I due indirizzi usati da LEADREWORKS (<b>/api/ext/pending</b> e <b>/api/ext/exported</b>) rispondono <b>solo dal Mac stesso</b> e senza password. "
    "Il resto del sito è protetto dalla password. Anche se Lead Collector viene messo su un server in rete, quei due indirizzi restano chiusi agli altri.")

h1("8. Problemi frequenti")
tab([["Problema", "Soluzione"],
     ["Le email non arrivano in tabella", "Controlla che Lead Collector sia acceso, che nel .env nome casella e password «per app» siano giusti e che il mittente sia in ALLOWED_SENDERS (se lo usi). Guarda data/server.log."],
     ["Nome o telefono sbagliati o vuoti", "Il testo non ha righe «Etichetta: valore». Correggi a mano nello Storico di LEADREWORKS oppure chiedi di migliorare le regole (file extract.js)."],
     ["La pagina chiede la password", "Apri sempre dall'app; se serve usa la password scritta in PAGE_PASSWORD (utente qualsiasi)."],
     ["Il font sembra diverso", "I font arrivano da Google Fonts: senza internet si usa quello di sistema. Nessun problema."]], [56, 118])

h1("9. Promemoria")
p("• Per le prove automatiche del programma: <b>npm test</b> (nella cartella LEAD-COLLECTOR).<br/>"
  "• Dopo ogni aggiornamento: «Fai Sync», poi riapri Lead Collector.<br/>"
  "• Con <b>/restore</b> vedi gli ultimi 20 salvataggi e puoi tornare a una versione precedente.")

def piede(c, d):
    c.saveState(); c.setFont("DV", 7.5); c.setFillColor(colors.HexColor("#777777"))
    c.drawString(18*mm, 10*mm, "Lead Collector — Istruzioni"); c.drawRightString(A4[0]-18*mm, 10*mm, f"pag. {d.page}"); c.restoreState()

SimpleDocTemplate(os.path.join(QUI, "ISTRUZIONI-LEAD-COLLECTOR.pdf"), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm,
                  topMargin=16*mm, bottomMargin=18*mm, title="Lead Collector — Istruzioni", author="YesMobility").build(el, onFirstPage=piede, onLaterPages=piede)
print("ok")

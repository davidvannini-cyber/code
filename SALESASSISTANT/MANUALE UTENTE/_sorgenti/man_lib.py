# -*- coding: utf-8 -*-
"""Mattoncini per scrivere il manuale: ogni funzione restituisce un "blocco" (dict) che l'impaginatore
misura e distribuisce sulle pagine. Il contenuto è identico per tutti i layout."""
import json, os
from contenuto import icona, ICONE, PASSI_FLUSSO, flusso_html, modalita_html, finestre_html, avvisi_html, barre_html

QUI = os.path.dirname(os.path.abspath(__file__))
try:
    CALL = json.load(open(os.path.join(QUI, "callouts.json"), encoding="utf-8"))
except Exception:
    CALL = {}

ICONE.update({
    "home": '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    "upload": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    "mail": '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    "chat": '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    "smartphone": '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    "database": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    "puzzle": '<path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5a2.7 2.7 0 0 1 0 5.4H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.7 2.7 0 0 1 5.4 0V22H17a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"/>',
    "check": '<polyline points="20 6 9 17 4 12"/>',
    "search": '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    "external": '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    "folder": '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    "refresh": '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    "key": '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    "star": '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    "play": '<polygon points="5 3 19 12 5 21 5 3"/>',
    "wrench": '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
})


def _ic(n):
    return icona(n)


# ---------------------------------------------------------------- blocchi
def cap(num, titolo, parte, anc, intro=None):
    return dict(k="cap", num=str(num), titolo=titolo, parte=parte, id=anc, html=("<p class='lead'>%s</p>" % intro) if intro else "")


def h2(anc, num, titolo):
    return dict(k="h2", id=anc, num=num, titolo=titolo, html='<h2 class="h2" id="%s"><span class="hn">%s</span>%s</h2>' % (anc, num, titolo))


def p(html):
    return dict(k="p", html='<p class="par">%s</p>' % html)


def lead(html):
    return dict(k="p", html='<p class="lead">%s</p>' % html)


def ul(items, cls="elenco"):
    return dict(k="p", html='<ul class="%s">%s</ul>' % (cls, "".join("<li>%s</li>" % i for i in items)))


def passi(items, start=1):
    out = []
    for i, t in enumerate(items, start):
        out.append(dict(k="passo", html='<div class="stp"><span class="stp-n">%d</span><div class="stp-t">%s</div></div>' % (i, t)))
    return out


def box(tipo, html, titolo=None):
    ic, nome = {"nota": ("info", "Nota"), "attenzione": ("avviso", "Attenzione"), "consiglio": ("ok", "Consiglio")}[tipo]
    titolo = titolo or nome
    return dict(k="box", html='<div class="bx bx-%s"><div class="bx-ic">%s</div><div><b>%s.</b> %s</div></div>' % (tipo, _ic(ic), titolo, html))


def tab(head, rows, cols=None, cls=""):
    th = "".join("<th>%s</th>" % h for h in head)
    tr = "".join("<tr>%s</tr>" % "".join("<td>%s</td>" % c for c in r) for r in rows)
    return dict(k="tab", html='<table class="tbl %s"><thead><tr>%s</tr></thead><tbody>%s</tbody></table>' % (cls, th, tr))


def tab_split(head, rows, per=9, cls=""):
    """Tabella lunga: spezzata in blocchi da `per` righe (ognuno col proprio intestazione) così può andare a capo pagina."""
    return [tab(head, rows[i:i + per], cls=cls) for i in range(0, len(rows), per)]


def fig(img, key=None, legend=None, layout="side", w=None, did=None, pos=None):
    """Schermata con numeri. legend = [(chiave, titolo, testo)] nello stesso ordine dei numeri.
    layout: side = immagine a sinistra + legenda a destra; stack = immagine sopra e legenda sotto in 2 colonne;
    solo = solo immagine."""
    cinfo = CALL.get(key or img, {}).get("items", []) if legend else []
    pos_map = {c["k"]: c for c in cinfo}
    badges = ""
    for n, (k, _, _) in enumerate(legend or [], 1):
        c = pos_map.get(k)
        if not c:
            continue
        mode = (pos or {}).get(k, "tr")
        x, y = (c["xl"], c["yc"]) if mode == "l" else (c["x"], c["y"])
        badges += '<span class="bd%s" style="left:%.2f%%;top:%.2f%%">%d</span>' % (" up" if mode != "l" else "", x * 100, y * 100, n)
    im = '<div class="fig-img"><div class="fig-in"><img src="screenshots/%s.png" alt="">%s</div>%s</div>' % (
        img, badges, ('<div class="didascalia">%s</div>' % did) if did else "")
    if not legend:
        return dict(k="fig", html='<div class="fig solo" style="--fw:%s">%s</div>' % (w or "var(--figw)", im))
    leg = "".join('<li><span class="bd fisso">%d</span><div><b>%s</b> %s</div></li>' % (n, t, d) for n, (_, t, d) in enumerate(legend, 1))
    return dict(k="fig", html='<div class="fig %s" style="--fw:%s">%s<ol class="legenda">%s</ol></div>' % (layout, w or "var(--figw)", im, leg))


def info(html):
    return dict(k="info", html=html)


# ---------------------------------------------------------------- infografiche
def _fr():
    return ('<div class="fr"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" '
            'stroke-linejoin="round"><line x1="4" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg></div>')


def _frg():
    return ('<div class="frg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" '
            'stroke-linejoin="round"><line x1="12" y1="4" x2="12" y2="19"/><polyline points="6 13 12 19 18 13"/></svg></div>')


def arch_html():
    nodo = lambda ic, t, s, cls="": '<div class="nodo %s"><div class="nodo-ic">%s</div><div class="nodo-t">%s</div><div class="nodo-s">%s</div></div>' % (cls, _ic(ic), t, s)
    riga1 = ("".join([nodo("cloud", "CRM Facile Salire", "dove sono i lead", "crm"), _fr(),
                      nodo("puzzle", "Estensione Chrome", "pulsante «Invia a Lead Rework Console»", "est"), _fr(),
                      nodo("monitor", "Lead Rework Console", "prepara gli script per ogni lead", "con")]))
    riga2 = "".join([
        nodo("chat", "WhatsApp", "apre WhatsApp Desktop con il messaggio già scritto", "usc"),
        nodo("mail", "Email", "apre Mail con la lettera già compilata", "usc"),
        nodo("smartphone", "Telefono Android", "app Rubrica YesMobility: salva il contatto e chiama con Lyber", "usc"),
        nodo("telefono", "Suggerimenti Vendita", "chiamata live con suggerimenti sul Mac", "usc")])
    return ('<div class="arch"><div class="arch-r1">%s</div><div class="arch-mid">%s</div><div class="arch-r2">%s</div></div>'
            % (riga1, _frg() + '<span>il lead e gli script partono da qui verso quattro destinazioni</span>' + _frg(), riga2))


def giornata_html():
    passi_g = [
        ("cloud", "Apri il lead nel CRM", "Sul CRM Facile Salire apri la pagina del lead da lavorare."),
        ("puzzle", "Premi «Invia a Lead Rework Console»", "Un clic: i dati del lead partono dal CRM verso la Console."),
        ("search", "La Console raccoglie e studia", "Compila i campi, propone stato, obiezioni e <b>strategia</b>."),
        ("messaggio", "Genera gli script", "Telefono, WhatsApp, email: tutti costruiti sulla strategia."),
        ("telefono", "Telefona", "«Invia a SV» e «Chiamata Gestione Lead»: la guida compare mentre parli."),
        ("chat", "Se non risponde: WhatsApp", "Il messaggio è già scritto: si apre WhatsApp, premi Invio."),
        ("mail", "Se serve: email", "La lettera è già compilata: si apre la posta, premi Invia."),
        ("ok", "Segna l'esito", "Spunte nello Storico; «CRM» riapre il lead sul gestionale."),
    ]
    r = "".join('<div class="gs"><div class="gs-n">%d</div><div class="gs-i">%s</div><div><b>%s</b><br>%s</div></div>' % (i, _ic(ic), t, d)
                for i, (ic, t, d) in enumerate(passi_g, 1))
    return '<div class="giornata">%s</div>' % r


def cascata_html():
    """Il flusso reale del lead: CRM -> Console (dati + strategia + script) -> telefonata -> cascata WhatsApp / email -> Storico."""
    nodo = lambda ic, t, s, cls="": '<div class="nodo %s"><div class="nodo-ic">%s</div><div class="nodo-t">%s</div><div class="nodo-s">%s</div></div>' % (cls, _ic(ic), t, s)
    r1 = "".join([nodo("cloud", "1. CRM", "pagina del lead", "crm"), _fr(),
                  nodo("puzzle", "2. Pulsante", "«Invia a Lead Rework Console»", "est"), _fr(),
                  nodo("monitor", "3. Raccolta dati", "la Console si compila da sola", "con")])
    r2 = "".join([nodo("star", "4. Strategia", "stato, obiezioni, analisi", "con"), _fr(),
                  nodo("messaggio", "5. Script", "telefono, WhatsApp, email", "con")])
    r3 = nodo("telefono", "6. TELEFONATA", "azione base: «Invia a SV» + «Chiamata Gestione Lead»", "usc")
    r4 = "".join([nodo("chat", "7a. WhatsApp", "se la chiamata non va a buon fine", "usc"), _fr(),
                  nodo("mail", "7b. Email", "se serve ancora un contatto", "usc")])
    r5 = "".join([nodo("ok", "8. Storico", "spunte: telefonata, WhatsApp, email, lavorato", "crm"), _fr(),
                  nodo("cloud", "9. CRM", "pulsante «CRM» per riaprire il lead", "crm")])
    mid = lambda t: '<div class="arch-mid">%s<span>%s</span>%s</div>' % (_frg(), t, _frg())
    return ('<div class="arch cmp"><div class="arch-r1">%s</div>%s<div class="arch-r1">%s</div>%s<div class="arch-r1 solo">%s</div>%s<div class="arch-r1">%s</div>%s<div class="arch-r1">%s</div></div>'
            % (r1, mid("la Console studia il lead"), r2, mid("si passa all'azione"), r3, mid("a cascata, in base a lead e strategia"), r4, mid("in ogni caso"), r5))


def crm_mock_html(inviato=False):
    """Rappresentazione della pagina lead del CRM con il pulsante galleggiante dell'estensione (stesso aspetto del pulsante vero)."""
    btn = "✓ Inviato" if inviato else "📤 Invia a Lead Rework Console"
    righe = ["Nome e cognome", "Telefono · Email", "Città · Indirizzo", "Prodotto · Offerta", "Attività e note"]
    corpo = "".join('<div class="crm-r"><span class="crm-l"></span><span class="crm-v">%s</span></div>' % r for r in righe)
    return ('<div class="crm"><div class="crm-top"><span class="crm-d"></span><span class="crm-d"></span><span class="crm-d"></span>'
            '<span class="crm-url">app.facilesalire.it/leads/…</span></div>'
            '<div class="crm-body"><div class="crm-h">Scheda lead</div>%s'
            '%s<div class="crm-btn%s">%s</div></div></div>' % (corpo, "" if inviato else '<div class="crm-call">DA QUI PARTE TUTTO</div>', " ok" if inviato else "", btn))


def tre_pezzi_html():
    c = [("monitor", "Lead Rework Console", "Una pagina in Chrome. Qui prepari ogni lead e generi gli script."),
         ("telefono", "Suggerimenti Vendita", "Un'app per Mac. Ascolta la chiamata e ti mostra cosa dire."),
         ("smartphone", "Rubrica YesMobility", "Un'app per Android. Riceve il lead dal Mac e chiama.")]
    return '<div class="schede">%s</div>' % "".join(
        '<div class="scheda"><div class="scheda-ico">%s</div><div class="scheda-tit">%s</div><div class="scheda-txt">%s</div></div>' % (_ic(i), t, d) for i, t, d in c)


def android_flusso_html():
    nodo = lambda ic, t, s: '<div class="nodo usc"><div class="nodo-ic">%s</div><div class="nodo-t">%s</div><div class="nodo-s">%s</div></div>' % (_ic(ic), t, s)
    return '<div class="arch"><div class="arch-r1">%s</div></div>' % "".join([
        nodo("monitor", "Mac", "premi «Invia a telefono»"), _fr(),
        nodo("cloud", "ntfy.sh", "servizio di messaggi, protetto dal codice segreto"), _fr(),
        nodo("smartphone", "Telefono", "l'app Rubrica salva il contatto"), _fr(),
        nodo("telefono", "Lyber", "parte la chiamata")])


def aggiornare_html():
    items = [("download", "Sync", "Doppio clic su Sync.command"), ("avviso", "Chiudi l'app", "Cmd+Q su Suggerimenti Vendita"),
             ("shield", "Firma l'app", "comando codesign nel Terminale"), ("play", "Riapri", "avvia una chiamata di prova")]
    return '<div class="arch"><div class="arch-r1">%s</div></div>' % "".join(
        ('<div class="nodo usc"><div class="nodo-ic">%s</div><div class="nodo-t">%s</div><div class="nodo-s">%s</div></div>' % (_ic(i), t, s)) + (_fr() if n < len(items) - 1 else "")
        for n, (i, t, s) in enumerate(items))


def stati_tabella():
    rows = [
        ("1", "Nuovo lead da portale (primo contatto)", "Presentazione standard, raccolta dei dati tecnici", "Telefono"),
        ("2", "Lead freddo / secondo preventivo (Match4Markets)", "Capire a che punto è, senza pressione", "Telefono"),
        ("3", "Cliente già visitato da un altro installatore (offerta esistente)", "Mai anticipare di saperlo: farlo confermare al cliente", "Telefono; Email se interessato"),
        ("4", "Trattativa persa — recupero", "Nuova proposta migliorativa, leva sul prezzo", "Telefono, Email"),
        ("5", "Contatto non valido — ultimo richiamo", "Un solo tentativo, leva sul prezzo basso, poi chiusura", "Telefono"),
        ("6", "Cliente interessato — organizzare sopralluogo", "Il sopralluogo lo fa l'installatore partner, non YesMobility", "Telefono, WhatsApp conferma, WhatsApp reminder"),
        ("7", "Cliente irraggiungibile", "Dopo 1-2 tentativi senza risposta", "Telefono, WhatsApp promemoria"),
        ("8", "Cliente accetta — chiusura vendita", "Spiegare il passaggio all'installatore partner per il contratto", "Telefono, Email di conferma"),
        ("9", "Post-sopralluogo non chiuso — recupero", "Solo se l'installatore partner non ha chiuso da solo", "Telefono"),
        ("10", "Budget limitato — proposta alternativa", "Due opzioni di prezzo", "Telefono"),
    ]
    return tab_split(["N.", "Stato del lead", "Cosa fare", "Script che prepara"], [list(r) for r in rows], per=5)


def fig_crm(inviato=False):
    did = ("Dopo il clic il pulsante diventa verde per un attimo e dice «✓ Inviato»." if inviato
           else "La pagina di un lead sul CRM Facile Salire (rappresentazione) con il pulsante blu dell'estensione in basso a destra.")
    return dict(k="fig", html='<div class="fig solo" style="--fw:118mm"><div class="fig-img" style="width:118mm">%s<div class="didascalia">%s</div></div></div>'
                % (crm_mock_html(inviato), did))

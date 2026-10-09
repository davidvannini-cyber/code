# -*- coding: utf-8 -*-
"""Contenuto del manuale (comune a tutti i layout) come frammenti HTML.

Le classi CSS sono definite da ciascun layout in temi.py: il contenuto non
cambia mai, cambia solo la grafica. Le icone sono SVG in linea (stile
Feather) così il PDF è autosufficiente e identico ovunque venga generato.
"""

ICONE = {
    "indice": '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    "telefono": '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    "splitter": '<path d="M3 12h6"/><path d="M9 12l6-6h6"/><path d="M9 12l6 6h6"/><circle cx="3" cy="12" r="1"/><circle cx="21" cy="6" r="1"/><circle cx="21" cy="18" r="1"/>',
    "monitor": '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    "cloud": '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
    "cpu": '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
    "messaggio": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    "utente": '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    "ripeti": '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    "avviso": '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    "ok": '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    "info": '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    "slider": '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
}


def icona(nome, cls="ic"):
    return ('<svg class="%s" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">%s</svg>'
            % (cls, ICONE[nome]))


def link_indice():
    return '<a class="torna-indice" href="#p2" title="Torna all\'indice">%s<span>Indice</span></a>' % icona("indice")


# --- Indice: (livello, numero, titolo, pagina, ancora) -------------------
VOCI_INDICE = [
    (1, "1", "Presentazione del sistema", 3, "p3"),
    (2, "1.1", "Il percorso dell'audio, dalla voce al suggerimento", 3, "p3-flusso"),
    (2, "1.2", "Le tre modalità di chiamata", 3, "p3-modalita"),
    (2, "1.3", "Le tre finestre affiancate", 3, "p3-finestre"),
    (1, "2", "Il pannello chiamata", 4, "p4"),
    (2, "2.1", "Gli elementi del pannello", 4, "p4-elementi"),
    (1, "3", "Taratura del livello audio", 5, "p5"),
    (2, "3.1", "Le due barre di livello", 5, "p5-barre"),
    (2, "3.2", "Gli avvisi del pannello", 5, "p5-avvisi"),
    (2, "3.3", "Regolare il livello passo per passo", 5, "p5-passi"),
]


def indice_html():
    righe = []
    for liv, num, tit, pag, anc in VOCI_INDICE:
        righe.append(
            '<a class="toc-riga liv%d" href="#%s"><span class="toc-num">%s</span>'
            '<span class="toc-tit">%s</span><span class="toc-fill"></span>'
            '<span class="toc-pag">%d</span></a>' % (liv, anc, num, tit, pag))
    return '<nav class="toc">%s</nav>' % "".join(righe)


# --- Pagina 2: presentazione ----------------------------------------------
PASSI_FLUSSO = [
    ("telefono", "Telefono", "La voce del cliente esce dal jack del telefono."),
    ("splitter", "Splitter TRRS", "Porta la voce del cliente al Mac. La tua voce va dritta al telefono e non viene trascritta."),
    ("monitor", "Pannello in Chrome", "Cattura l'audio dal microfono scelto e lo invia al server locale."),
    ("cloud", "Deepgram", "Trascrive in italiano, una frase alla volta."),
    ("cpu", "Motore di matching", "Confronta la frase con la libreria di script. Solo nei casi dubbi interviene Claude."),
    ("messaggio", "Suggerimento", "Compare nel pannello, pronto da leggere durante la chiamata."),
]


def flusso_html():
    out = []
    for i, (ic, tit, txt) in enumerate(PASSI_FLUSSO, 1):
        out.append(
            '<div class="passo"><div class="passo-num">%d</div><div class="passo-ico">%s</div>'
            '<div class="passo-tit">%s</div><div class="passo-txt">%s</div></div>'
            % (i, icona(ic), tit, txt))
        if i < len(PASSI_FLUSSO):
            out.append('<div class="freccia"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                       'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
                       '<line x1="4" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg></div>')
    return '<div class="flusso">%s</div>' % "".join(out)


MODALITA = [
    ("utente", "Chiamata YesMobility", "Suggerimenti live sulle frasi del cliente. Nessun canovaccio."),
    ("telefono", "Chiamata Gestione Lead", "Suggerimenti live più il canovaccio del lead inviato dalla Lead Rework Console. Il pulsante si illumina quando c'è un lead in attesa."),
    ("ripeti", "Rinforzo Facile Salire", "Suggerimenti live più un canovaccio fisso, uguale per ogni chiamata."),
]


def modalita_html():
    out = []
    for ic, tit, txt in MODALITA:
        out.append('<div class="scheda"><div class="scheda-ico">%s</div><div class="scheda-tit">%s</div>'
                   '<div class="scheda-txt">%s</div></div>' % (icona(ic), tit, txt))
    return '<div class="schede">%s</div>' % "".join(out)


def finestre_html():
    return (
        '<div class="finestre">'
        '<div class="fin f1" style="flex:35"><b>35%</b><span>Lead Rework Console</span></div>'
        '<div class="fin f2" style="flex:15"><b>15%</b><span>Menu</span></div>'
        '<div class="fin f3" style="flex:25"><b>25%</b><span>Pannello chiamata</span></div>'
        '<div class="fin f4" style="flex:25"><span>libero</span></div>'
        '</div>'
        '<p class="nota-sotto">Le tre finestre sono alte il 60% dello schermo e si dispongono da sole, da sinistra a destra.</p>'
    )


# --- Pagina 3: pannello chiamata con screenshot e numeri ------------------
CALLOUT = [  # (numero, y in pixel sullo screenshot 458x627, titolo, testo)
    (1, 62, "Selettore del dispositivo", "Sceglie l'ingresso audio. Con lo splitter collegato va scelto \"External Microphone (Built-in)\". A destra, \"connesso\" indica il server pronto."),
    (2, 122, "Microfono, Pausa, Termina", "Microfono attivo mostra che l'audio sta arrivando. Pausa sospende l'invio delle frasi. Termina chiude la chiamata e riporta in primo piano il menu."),
    (3, 210, "Le due barre di livello", "Mostrano quanto segnale arriva: prima e dopo il limiter. Vedi il capitolo 3."),
    (4, 253, "Riquadro degli avvisi", "Compare solo quando serve: clipping oppure microfono integrato in uso."),
    (5, 331, "Dati del lead", "Nome e numero del lead. Il pulsante \"Invia a telefono\" manda i dati al telefono Android."),
    (6, 404, "Suggerimento in attesa", "Qui compare il suggerimento più adatto alla frase appena detta dal cliente."),
    (7, 468, "Frasi cliente", "Le frasi del cliente trascritte, una sotto l'altra. L'operatore non viene trascritto."),
]


def pannello_html():
    badges = "".join(
        '<span class="badge" style="top:%.2f%%">%d</span>' % (y / 627 * 100, n)
        for n, y, _, _ in CALLOUT)
    shot = ('<div class="shot"><div class="shot-in"><img src="assets/pannello-chiamata.png" alt="Pannello chiamata">'
            '%s</div><div class="didascalia">Il pannello chiamata durante una chiamata di prova.</div></div>' % badges)
    leg = "".join(
        '<li><span class="badge fisso">%d</span><div><b>%s</b><br>%s</div></li>' % (n, t, d)
        for n, _, t, d in CALLOUT)
    return '<div class="due-col">%s<ol class="legenda">%s</ol></div>' % (shot, leg)


# --- Pagina 4: taratura ----------------------------------------------------
def barre_html():
    return (
        '<div class="barre-blocco">'
        '<div class="shot piccolo"><div class="shot-in"><img src="assets/barre-livello.png" alt="Barre di livello"></div>'
        '<div class="didascalia">Le due barre, sul valore giusto per il parlato.</div></div>'
        '<div class="scala">'
        '<h4>Come leggere i colori</h4>'
        '<div class="riga-col"><i class="pallino verde"></i><div><b>Verde</b> segnale presente ma ancora basso.</div></div>'
        '<div class="riga-col"><i class="pallino arancio"></i><div><b>Arancione</b> segnale forte e sano: la zona giusta per il parlato.</div></div>'
        '<div class="riga-col"><i class="pallino rosso"></i><div><b>Rosso</b> vicino alla saturazione: abbassa il livello.</div></div>'
        '<p class="nota-sotto"><b>Barra in alto:</b> prima del limiter. <b>Barra in basso:</b> quello che viene trascritto; è più lunga perché il compressore di Chrome alza il segnale.</p>'
        '</div></div>')


def avvisi_html():
    return (
        '<div class="avvisi">'
        '<div class="avviso rosso-a"><div class="avviso-ico">%s</div><div><b>Segnale saturo (clipping)</b><br>'
        'Compare in rosso per 3 secondi quando il segnale tocca il massimo. Abbassa il volume media del telefono o il livello di ingresso del Mac.</div></div>'
        '<div class="avviso ambra-a"><div class="avviso-ico">%s</div><div><b>Microfono integrato in uso</b><br>'
        'Compare in giallo se il dispositivo è \"Internal Microphone (Built-in)\": stai ascoltando il Mac e non lo splitter. '
        'Con \"External Microphone (Built-in)\" l\'avviso non compare, perché è il jack.</div></div>'
        '</div>' % (icona("avviso"), icona("info")))


PASSI_TARATURA = [
    "Prepara una voce che parla in modo continuo sul telefono: un video, un podcast o una chiamata a un tuo secondo numero. Imposta il volume del telefono come lo userai in chiamata.",
    "Apri Impostazioni di Sistema → Suono → Ingresso e seleziona External Microphone.",
    "Apri una Chiamata YesMobility e guarda la barra in alto, \"prima del limiter\".",
    "Regola il volume di ingresso del Mac: la barra deve oscillare tra verde e arancione, con qualche picco verso il rosso.",
    "Se resta spesso rossa o compare il clipping, abbassa. Se resta corta e verde, alza.",
]


def passi_html():
    li = "".join('<li><span class="n">%d</span><div>%s</div></li>' % (i, t) for i, t in enumerate(PASSI_TARATURA, 1))
    return '<ol class="passi">%s</ol>' % li


# --- Copertina -------------------------------------------------------------
def copertina_blocco():
    return ('<div class="cov-logo"><img src="assets/logo-yesmobility.png" alt="YesMobility"></div>'
            '<div class="cov-title"><span class="t1">SALES ASSISTANT</span><span class="t2">User Manual</span></div>')


def copertina_piede():
    return ('<div class="cov-foot"><img src="assets/momandis-logo.png" alt="Momandis">'
            '<div>\u00a9 Designed and krafted by Momandis David Vannini</div></div>')

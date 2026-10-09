# -*- coding: utf-8 -*-
"""I cinque layout proposti. Stesso contenuto (contenuto.py), grafica diversa.

Ogni tema è una funzione che restituisce l'HTML completo del documento.
Il PDF si ottiene con genera.py (Chromium, stampa su A4).
"""
from contenuto import (copertina_blocco, copertina_piede, icona, link_indice, indice_html, flusso_html, modalita_html,
                       finestre_html, pannello_html, barre_html, avvisi_html, passi_html,
                       VOCI_INDICE)

TITOLO_MANUALE = "Manuale utente"
NOME_SISTEMA = "Suggerimenti Vendita"
SOTTOTITOLO = "L'assistente live per le chiamate di vendita YesMobility"
TOTALE_PAGINE = 5

# Palette dal logo YesMobility
TEAL = "#1b6a86"
TEAL_SCURO = "#0f3d52"
MENTA = "#4fc99b"
MENTA_CHIARO = "#dff6ec"


def h2(anc, num, testo):
    return '<h2 class="h2" id="%s"><span class="hn">%s</span>%s</h2>' % (anc, num, testo)


def pagine():
    """[(numero, kicker, titolo, corpo_html)] per le pagine 2-4."""
    p2 = (
        '<p class="lead">Suggerimenti Vendita ascolta la voce del cliente durante la chiamata, '
        'la trascrive e ti mostra il suggerimento più adatto, preso dalla libreria degli script YesMobility.</p>'
        + h2("p3-flusso", "1.1", "Il percorso dell'audio, dalla voce al suggerimento")
        + flusso_html()
        + h2("p3-modalita", "1.2", "Le tre modalità di chiamata")
        + modalita_html()
        + h2("p3-finestre", "1.3", "Le tre finestre affiancate")
        + finestre_html()
    )
    p3 = (
        '<p class="lead">Il pannello si apre da solo in Chrome, a destra del menu, quando premi uno dei pulsanti di chiamata. '
        'Qui vedi tutto quello che serve durante la telefonata.</p>'
        + h2("p4-elementi", "2.1", "Gli elementi del pannello")
        + pannello_html()
    )
    p4 = (
        h2("p5-barre", "3.1", "Le due barre di livello")
        + barre_html()
        + h2("p5-avvisi", "3.2", "Gli avvisi del pannello")
        + avvisi_html()
        + h2("p5-passi", "3.3", "Regolare il livello passo per passo")
        + passi_html()
    )
    return [
        (3, "Parte 1 · Presentazione", "Come funziona " + NOME_SISTEMA, p2),
        (4, "Parte 2 · Manuale", "Il pannello chiamata", p3),
        (5, "Parte 2 · Manuale", "Taratura del livello audio", p4),
    ]


# ---------------------------------------------------------------------------
# CSS di base: usa solo variabili, ogni tema le imposta e aggiunge le sue regole
# ---------------------------------------------------------------------------
BASE_CSS = """
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:var(--font);color:var(--ink);font-size:var(--fs);line-height:1.45;background:#888}
a{color:inherit;text-decoration:none}
.pagina{width:var(--W);height:var(--H);position:relative;overflow:hidden;break-after:page;page-break-after:always;background:var(--paper)}
.ic{width:1em;height:1em;display:block}
.lead{font-size:calc(var(--fs)*1.08);color:var(--muted);margin:0 0 4mm}
.h2{font-family:var(--font-h);font-weight:var(--fw-h);color:var(--ink-h);font-size:calc(var(--fs)*1.35);margin:5mm 0 3mm;display:flex;align-items:baseline;gap:2.5mm}
.h2 .hn{color:var(--accent);font-size:.85em;font-weight:700;min-width:8mm}
.didascalia{font-size:calc(var(--fs)*.78);color:var(--muted);margin-top:2mm;text-align:center}
.nota-sotto{font-size:calc(var(--fs)*.82);color:var(--muted);margin-top:2.5mm}

/* copertina */
.cov-logo{display:flex;justify-content:center}
.cov-logo img{width:var(--cov-logo-w,80mm);display:block}
.cov-title{text-align:center;margin-top:var(--cov-gap,10mm);font-family:var(--font-h);color:var(--ink-h)}
.cov-title .t1{display:block;font-size:var(--cov-t1,13mm);font-weight:800;letter-spacing:.8mm;line-height:1.05}
.cov-title .t2{display:block;font-size:var(--cov-t2,9mm);font-weight:300;letter-spacing:1mm;margin-top:2mm;color:var(--accent)}
.cov-foot{position:absolute;left:0;right:0;bottom:11mm;text-align:center;font-size:2.7mm;color:var(--muted)}
.cov-foot img{height:10mm;display:block;margin:0 auto 1.6mm}

/* indice */
.toc{display:flex;flex-direction:column}
.toc-riga{display:flex;align-items:baseline;gap:3mm;padding:1.6mm 0}
.toc-riga.liv1{font-weight:700;color:var(--ink-h);margin-top:3.2mm;font-size:calc(var(--fs)*1.12)}
.toc-riga.liv2{padding-left:9mm;color:var(--ink)}
.toc-num{min-width:9mm;color:var(--accent);font-weight:700}
.toc-riga.liv2 .toc-num{min-width:9mm;font-weight:600}
.toc-fill{flex:1;border-bottom:.35mm dotted var(--line);transform:translateY(-1mm)}
.toc-pag{font-variant-numeric:tabular-nums;font-weight:700;color:var(--ink-h)}
.torna-indice{display:inline-flex;align-items:center;gap:1.6mm}
.torna-indice .ic{font-size:5mm}

/* flusso audio */
.flusso{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:3mm 1.5mm;align-items:stretch;margin-top:1mm}
.flusso .freccia:nth-child(6){display:none}
.passo{position:relative;background:var(--card);border:var(--card-border);border-radius:var(--radius);padding:4.5mm 3.2mm 3.5mm;text-align:center;box-shadow:var(--card-shadow)}
.passo-num{position:absolute;top:-2.6mm;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;border-radius:50%;width:5.6mm;height:5.6mm;font-size:3.1mm;font-weight:700;display:flex;align-items:center;justify-content:center}
.passo-ico{font-size:9mm;color:var(--accent);display:flex;justify-content:center;margin:1.2mm 0 1.8mm}
.passo-tit{font-weight:700;color:var(--ink-h);font-size:calc(var(--fs)*.95);margin-bottom:1mm}
.passo-txt{font-size:calc(var(--fs)*.78);color:var(--muted);line-height:1.35}
.freccia{display:flex;align-items:center;color:var(--accent2);width:5.5mm}
.freccia svg{width:100%}

/* tre modalità */
.schede{display:grid;grid-template-columns:repeat(3,1fr);gap:3.5mm}
.scheda{background:var(--card);border:var(--card-border);border-radius:var(--radius);padding:4mm;box-shadow:var(--card-shadow)}
.scheda-ico{width:10mm;height:10mm;border-radius:var(--radius-chip);background:var(--chip-bg);color:var(--chip-fg);display:flex;align-items:center;justify-content:center;font-size:5.4mm;margin-bottom:2.4mm}
.scheda-tit{font-weight:700;color:var(--ink-h);margin-bottom:1.2mm}
.scheda-txt{font-size:calc(var(--fs)*.8);color:var(--muted);line-height:1.38}

/* finestre */
.finestre{display:flex;gap:1.5mm;height:17mm}
.fin{border-radius:calc(var(--radius)*.6);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-size:calc(var(--fs)*.78);text-align:center;padding:1mm}
.fin b{font-size:calc(var(--fs)*1.25)}
.fin.f1{background:var(--accent)}
.fin.f2{background:var(--accent2);color:var(--ink-h)}
.fin.f3{background:var(--ink-h)}
.fin.f4{background:transparent;border:.35mm dashed var(--line);color:var(--muted)}

/* pannello con numeri */
.due-col{display:grid;grid-template-columns:var(--shot-w) 1fr;gap:var(--gap-col);align-items:start}
.shot{text-align:center}
.shot-in{position:relative;border:.3mm solid var(--line);border-radius:calc(var(--radius)*.5);box-shadow:var(--shot-shadow);background:#fff;line-height:0}
.shot-in img{width:100%;display:block;border-radius:calc(var(--radius)*.5)}
.badge{position:absolute;left:-3mm;transform:translateY(-50%);width:6mm;height:6mm;border-radius:50%;background:var(--badge-bg);color:var(--badge-fg);font-size:3.2mm;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 0 0 .6mm #fff}
.badge.fisso{position:static;transform:none;flex:none;box-shadow:none}
.legenda{list-style:none;display:flex;flex-direction:column;gap:2.4mm}
.legenda li{display:flex;gap:2.6mm;font-size:calc(var(--fs)*.84);line-height:1.38;color:var(--muted)}
.legenda li b{color:var(--ink-h);font-size:calc(var(--fs)*.92)}

/* barre e colori */
.barre-blocco{display:grid;grid-template-columns:var(--barre-w) 1fr;gap:6mm;align-items:center}
.shot.piccolo .shot-in{max-width:100%}
.scala h4{font-size:calc(var(--fs)*.95);color:var(--ink-h);margin-bottom:2mm}
.riga-col{display:flex;gap:2.6mm;align-items:flex-start;font-size:calc(var(--fs)*.84);margin-bottom:1.8mm;color:var(--muted)}
.riga-col b{color:var(--ink-h)}
.pallino{flex:none;width:4mm;height:4mm;border-radius:50%;margin-top:.6mm}
.pallino.verde{background:#22c55e}.pallino.arancio{background:#f59e0b}.pallino.rosso{background:#ef4444}

/* avvisi */
.avvisi{display:grid;grid-template-columns:1fr 1fr;gap:3.5mm}
.avviso{display:flex;gap:3mm;padding:3.4mm;border-radius:var(--radius);font-size:calc(var(--fs)*.82);line-height:1.4}
.avviso b{font-size:calc(var(--fs)*.92)}
.avviso-ico{flex:none;font-size:6mm}
.avviso.rosso-a{background:#fee2e2;color:#7f1d1d}
.avviso.ambra-a{background:#fef3c7;color:#78350f}

/* passi */
.passi{list-style:none;display:flex;flex-direction:column;gap:2.2mm}
.passi li{display:flex;gap:3mm;align-items:flex-start;font-size:calc(var(--fs)*.86);line-height:1.4;color:var(--ink)}
.passi .n{flex:none;width:6mm;height:6mm;border-radius:50%;background:var(--accent);color:#fff;font-weight:700;font-size:3.2mm;display:flex;align-items:center;justify-content:center;margin-top:-.3mm}
"""


def documento(css_tema, corpo, orientamento="portrait"):
    if orientamento == "landscape":
        size, W, H = "297mm 210mm", "297mm", "210mm"
    else:
        size, W, H = "210mm 297mm", "210mm", "297mm"
    return ('<!doctype html><html lang="it"><head><meta charset="utf-8">'
            '<title>%s – %s</title><style>@page{size:%s;margin:0}:root{--W:%s;--H:%s}%s%s</style></head>'
            '<body>%s</body></html>' % (TITOLO_MANUALE, NOME_SISTEMA, size, W, H, BASE_CSS, css_tema, corpo))


# ===========================================================================
# LAYOUT A — Classico aziendale: fascia blu in alto, titoli con barra menta
# ===========================================================================
CSS_A = """
:root{--font:'Inter',sans-serif;--font-h:'Inter',sans-serif;--fw-h:700;--fs:3.55mm;
--ink:#26343d;--ink-h:#0f3d52;--muted:#5a6b76;--accent:#1b6a86;--accent2:#4fc99b;--paper:#fff;--card:#f5f9fb;
--line:#c9d6dd;--card-border:.3mm solid #d6e2e8;--card-shadow:none;--radius:2mm;--radius-chip:2mm;
--chip-bg:#dff6ec;--chip-fg:#1b6a86;--shot-w:84mm;--gap-col:8mm;--barre-w:78mm;--badge-bg:#0f3d52;--badge-fg:#fff;--shot-shadow:0 1mm 3mm rgba(0,0,0,.18)}
.testata{height:22mm;background:#0f3d52;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 16mm;border-bottom:1.6mm solid #4fc99b}
.testata .kick{font-size:3mm;letter-spacing:.35mm;text-transform:uppercase;color:#4fc99b;font-weight:600}
.testata .tit{font-size:6.2mm;font-weight:700;margin-top:.6mm}
.testata .torna-indice{background:rgba(255,255,255,.12);border-radius:5mm;padding:2mm 4mm;font-size:3.1mm;font-weight:600}
.contenuto{padding:9mm 16mm 0}
.piede{position:absolute;left:16mm;right:16mm;bottom:9mm;border-top:.3mm solid #c9d6dd;padding-top:2.4mm;display:flex;justify-content:space-between;font-size:2.9mm;color:#5a6b76}
.h2{border-left:1.4mm solid #4fc99b;padding-left:3mm}
.copertina{height:92mm;background:linear-gradient(135deg,#0f3d52 0%,#1b6a86 100%);color:#fff;padding:18mm 16mm 0;position:relative;border-bottom:2mm solid #4fc99b}
.copertina img{position:absolute;right:16mm;top:14mm;width:44mm}
.copertina .k{font-size:3.3mm;letter-spacing:.5mm;text-transform:uppercase;color:#4fc99b;font-weight:600}
.copertina h1{font-size:13mm;line-height:1.05;margin:4mm 0 4mm;max-width:120mm}
.copertina p{font-size:4.2mm;max-width:105mm;color:#d3e6ee}
.indice-corpo{padding:10mm 16mm 0}
.indice-corpo h2.t{font-size:6mm;color:#0f3d52;margin-bottom:2mm;display:flex;align-items:center;gap:2.4mm}
.cov .fascia-alta{position:absolute;left:0;right:0;top:0;height:22mm;background:#0f3d52;border-bottom:1.6mm solid #4fc99b}
.cov .cov-centro{position:absolute;left:0;right:0;top:48mm}
.cov-title .t1{color:#0f3d52}
.contenuto .toc{margin-top:-2mm}
"""


def tema_a():
    out = []
    out.append(
        '<section class="pagina cov" id="p1"><div class="fascia-alta"></div><div class="cov-centro">%s</div>%s</section>'
        % (copertina_blocco(), copertina_piede()))
    out.append(
        '<section class="pagina" id="p2"><div class="testata"><div><div class="kick">%s</div><div class="tit">Indice</div></div></div>'
        '<div class="contenuto">%s</div><div class="piede"><span>%s · %s</span><span>2</span></div></section>'
        % (NOME_SISTEMA, indice_html(), NOME_SISTEMA, TITOLO_MANUALE))
    for n, kick, tit, corpo in pagine():
        out.append(
            '<section class="pagina" id="p%d"><div class="testata"><div><div class="kick">%s</div><div class="tit">%s</div></div>%s</div>'
            '<div class="contenuto">%s</div><div class="piede"><span>%s · %s</span><span>%d</span></div></section>'
            % (n, kick, tit, link_indice(), corpo, NOME_SISTEMA, TITOLO_MANUALE, n))
    return documento(CSS_A, "".join(out))


# ===========================================================================
# LAYOUT B — Minimal: molto spazio bianco, grande numero di capitolo
# ===========================================================================
CSS_B = """
:root{--font:'Inter',sans-serif;--font-h:'Inter',sans-serif;--fw-h:600;--fs:3.5mm;
--ink:#2b3640;--ink-h:#111d24;--muted:#6b7780;--accent:#1b6a86;--accent2:#4fc99b;--paper:#fff;--card:#fff;
--line:#d9e0e4;--card-border:none;--card-shadow:none;--radius:1mm;--radius-chip:50%;
--chip-bg:#e9f8f1;--chip-fg:#1b6a86;--shot-w:82mm;--gap-col:10mm;--barre-w:76mm;--badge-bg:#1b6a86;--badge-fg:#fff;--shot-shadow:0 .6mm 2mm rgba(0,0,0,.14)}
.margine{padding:15mm 22mm 0}
.finestre{height:12mm}
.cap-num{font-size:24mm;font-weight:200;color:#4fc99b;line-height:.8;letter-spacing:-1.5mm}
.cap-kick{font-size:3mm;letter-spacing:.6mm;text-transform:uppercase;color:#6b7780;margin-top:3.5mm}
.cap-tit{font-size:8.6mm;font-weight:300;color:#111d24;line-height:1.1;margin:1.5mm 0 5mm;letter-spacing:-.2mm}
.filo{height:.35mm;background:#d9e0e4;margin-bottom:4mm}
.h2{border:none;font-weight:600;font-size:4.6mm}
.passo,.scheda{border-top:.7mm solid #4fc99b;border-radius:0;background:#f7fafb;padding-top:4mm}
.passo-num{display:none}
.passo-ico{font-size:7.5mm}
.scheda-ico{background:transparent;color:#1b6a86;width:auto;height:auto;justify-content:flex-start;font-size:7mm}
.piede{position:absolute;left:22mm;right:22mm;bottom:11mm;display:flex;justify-content:space-between;align-items:center;font-size:2.9mm;color:#8a949b;letter-spacing:.3mm}
.torna-indice{font-size:3mm;color:#1b6a86;font-weight:600;border:.3mm solid #1b6a86;border-radius:5mm;padding:1.6mm 3.6mm}
.top-dx{position:absolute;right:22mm;top:15mm}
.ind-wrap{padding:24mm 22mm 0}
.ind-wrap img{width:30mm;margin-bottom:10mm}
.ind-wrap h1{font-size:15mm;font-weight:200;line-height:1;color:#111d24;letter-spacing:-.6mm}
.ind-wrap h1 b{font-weight:700;color:#1b6a86}
.ind-wrap .sub{font-size:4mm;color:#6b7780;margin:5mm 0 12mm;max-width:120mm}
.toc-riga.liv2{color:#4a5660}
.cov .cov-centro{position:absolute;left:0;right:0;top:56mm;text-align:left;padding-left:22mm}
.cov .cov-logo{justify-content:flex-start}
.cov-logo img{width:62mm}
.cov-title{text-align:left}
.cov-title .t1{font-weight:200;font-size:15mm;letter-spacing:.2mm}
.cov-title .t2{font-weight:600;font-size:15mm;letter-spacing:0;margin-top:0;color:#1b6a86}
"""


def tema_b():
    out = []
    out.append(
        '<section class="pagina cov" id="p1"><div class="cov-centro">%s</div>%s</section>'
        % (copertina_blocco(), copertina_piede()))
    out.append(
        '<section class="pagina" id="p2"><div class="margine"><div class="cap-num">00</div><div class="cap-kick">%s</div>'
        '<div class="cap-tit">Indice</div><div class="filo"></div>%s</div>'
        '<div class="piede"><span>%s</span><span>2 / %d</span></div></section>'
        % (NOME_SISTEMA, indice_html(), NOME_SISTEMA, TOTALE_PAGINE))
    capitoli = {3: "01", 4: "02", 5: "03"}
    for n, kick, tit, corpo in pagine():
        out.append(
            '<section class="pagina" id="p%d"><div class="margine"><div class="top-dx">%s</div>'
            '<div class="cap-num">%s</div><div class="cap-kick">%s</div><div class="cap-tit">%s</div><div class="filo"></div>%s</div>'
            '<div class="piede"><span>%s</span><span>%d / %d</span></div></section>'
            % (n, link_indice(), capitoli[n], kick, tit, corpo, NOME_SISTEMA, n, TOTALE_PAGINE))
    return documento(CSS_B, "".join(out))


# ===========================================================================
# LAYOUT C — Barra laterale (A4 orizzontale): sommario sempre visibile a sinistra
# ===========================================================================
CSS_C = """
:root{--font:'Inter',sans-serif;--font-h:'Inter',sans-serif;--fw-h:700;--fs:3.3mm;
--ink:#26343d;--ink-h:#0f3d52;--muted:#5a6b76;--accent:#1b6a86;--accent2:#4fc99b;--paper:#fff;--card:#f3f8fa;
--line:#c9d6dd;--card-border:.3mm solid #dbe6eb;--card-shadow:none;--radius:2mm;--radius-chip:2mm;
--chip-bg:#dff6ec;--chip-fg:#1b6a86;--shot-w:62mm;--gap-col:7mm;--barre-w:80mm;--badge-bg:#0f3d52;--badge-fg:#fff;--shot-shadow:0 1mm 3mm rgba(0,0,0,.18)}
.lato{position:absolute;left:0;top:0;bottom:0;width:60mm;background:#0f3d52;color:#cfe3ec;padding:12mm 7mm 0}
.lato img{width:24mm;display:block;margin:0 0 7mm}
.lato .torna-indice{background:#4fc99b;color:#0f3d52;border-radius:2mm;padding:2.4mm 4mm;font-weight:700;font-size:3.3mm;width:100%;justify-content:center;margin-bottom:7mm}
.lato .torna-indice .ic{font-size:5mm}
.lato .voce{display:block;padding:1.8mm 2.4mm;border-radius:1.4mm;font-size:3.1mm;color:#cfe3ec}
.lato .voce.cap{font-weight:700;color:#fff;margin-top:3mm;font-size:3.3mm}
.lato .voce.sub{padding-left:6mm;color:#9fc0cf;font-size:2.9mm}
.lato .voce.on{background:rgba(79,201,155,.22);color:#fff}
.lato .pg{position:absolute;left:7mm;bottom:9mm;font-size:3mm;color:#9fc0cf}
.dx{position:absolute;left:60mm;right:0;top:0;bottom:0;padding:11mm 13mm 0 13mm}
.dx .kick{font-size:2.9mm;letter-spacing:.45mm;text-transform:uppercase;color:#1b6a86;font-weight:600}
.dx .tit{font-size:8mm;font-weight:700;color:#0f3d52;margin:1mm 0 4mm;line-height:1.1}
.dx .lead{font-size:3.3mm;margin-bottom:2mm}
.h2{margin:3.6mm 0 2.4mm;font-size:4.4mm}
.flusso{grid-template-columns:1fr auto 1fr auto 1fr auto 1fr auto 1fr auto 1fr;gap:0 1mm}
.flusso .freccia:nth-child(6){display:flex}
.freccia{width:4mm}
.passo{padding:4mm 2mm 2.8mm}
.passo-ico{font-size:7mm;margin-bottom:1mm}
.passo-txt{font-size:2.55mm}
.passo-tit{font-size:3mm}
.scheda{padding:3mm}
.scheda-txt{font-size:2.8mm}
.finestre{height:12mm}
.legenda{gap:1.5mm}
.legenda li{font-size:2.8mm;line-height:1.3}
.legenda li b{font-size:3mm}
.avviso{font-size:2.9mm}
.passi li{font-size:3mm}
.shot-in img{max-height:140mm;width:auto;max-width:100%}
.ind{display:grid;grid-template-columns:1fr 1fr;gap:0 12mm}
.dx.indice-page .toc{margin-top:1mm}
.indice-page .tit{font-size:11mm}
.cov .striscia{position:absolute;left:0;top:0;bottom:0;width:18mm;background:#0f3d52}
.cov .striscia:after{content:"";position:absolute;right:0;top:0;bottom:0;width:2mm;background:#4fc99b}
.cov .cov-centro{position:absolute;left:18mm;right:0;top:20mm}
.cov{--cov-logo-w:62mm;--cov-gap:5mm;--cov-t1:11mm;--cov-t2:7mm}
.cov-foot{left:18mm}
"""


def _lato(attiva):
    voci = []
    cap_per_pagina = {2: "p2", 3: "p3", 4: "p4"}
    for liv, num, t, pag, anc in VOCI_INDICE:
        cls = "cap" if liv == 1 else "sub"
        on = " on" if (liv == 1 and pag == attiva) else ""
        voci.append('<a class="voce %s%s" href="#%s">%s %s</a>' % (cls, on, anc, num, t))
    return "".join(voci)


def tema_c():
    out = []
    out.append(
        '<section class="pagina cov" id="p1"><div class="striscia"></div><div class="cov-centro">%s</div>%s</section>'
        % (copertina_blocco(), copertina_piede()))
    out.append(
        '<section class="pagina" id="p2"><div class="lato"><img src="assets/logo-yesmobility.png" alt="">'
        '<div style="color:#fff;font-weight:700;font-size:4mm;margin-bottom:1mm">SALES ASSISTANT</div>'
        '<div style="font-size:3mm;color:#9fc0cf">User Manual</div><div class="pg">2 / %d</div></div>'
        '<div class="dx indice-page"><div class="kick">%s</div><div class="tit">Indice</div>%s</div></section>'
        % (TOTALE_PAGINE, SOTTOTITOLO, indice_html()))
    for n, kick, tit, corpo in pagine():
        out.append(
            '<section class="pagina" id="p%d"><div class="lato"><img src="assets/logo-yesmobility.png" alt="">%s%s'
            '<div class="pg">%d / %d</div></div><div class="dx"><div class="kick">%s</div><div class="tit">%s</div>%s</div></section>'
            % (n, link_indice(), _lato(n), n, TOTALE_PAGINE, kick, tit, corpo))
    return documento(CSS_C, "".join(out), "landscape")


# ===========================================================================
# LAYOUT D — Schede (dashboard): sfondo grigio chiaro, riquadri bianchi arrotondati
# ===========================================================================
CSS_D = """
:root{--font:'Inter',sans-serif;--font-h:'Inter',sans-serif;--fw-h:700;--fs:3.45mm;
--ink:#2a3640;--ink-h:#12303f;--muted:#64737d;--accent:#1b6a86;--accent2:#4fc99b;--paper:#e9eff3;--card:#fff;
--line:#cfdae1;--card-border:none;--card-shadow:0 .6mm 2.4mm rgba(15,61,82,.12);--radius:4mm;--radius-chip:3mm;
--chip-bg:linear-gradient(135deg,#4fc99b,#1b6a86);--chip-fg:#fff;--shot-w:82mm;--gap-col:6mm;--barre-w:76mm;--badge-bg:#1b6a86;--badge-fg:#fff;--shot-shadow:0 .8mm 3mm rgba(15,61,82,.2)}
.barra{margin:10mm 12mm 0;background:#fff;border-radius:6mm;box-shadow:0 .6mm 2.4mm rgba(15,61,82,.12);padding:4mm 6mm;display:flex;align-items:center;justify-content:space-between}
.barra .sx{display:flex;align-items:center;gap:4mm}
.barra .chip{width:11mm;height:11mm;border-radius:3.2mm;background:linear-gradient(135deg,#4fc99b,#1b6a86);color:#fff;display:flex;align-items:center;justify-content:center;font-size:6mm}
.barra .k{font-size:2.8mm;color:#64737d;text-transform:uppercase;letter-spacing:.4mm;font-weight:600}
.barra .t{font-size:5.6mm;font-weight:700;color:#12303f}
.barra .dx{display:flex;align-items:center;gap:3mm}
.barra .torna-indice{background:#12303f;color:#fff;border-radius:4mm;padding:2mm 4mm;font-size:3.1mm;font-weight:600}
.barra .pgn{background:#e9eff3;border-radius:4mm;padding:2mm 3.4mm;font-size:3.1mm;font-weight:700;color:#12303f}
.tela{padding:5mm 12mm 0}
.riquadro{background:#fff;border-radius:4mm;box-shadow:0 .6mm 2.4mm rgba(15,61,82,.12);padding:5mm 6mm;margin-bottom:4.5mm}
.riquadro .h2{margin-top:0}
.riquadro .lead{margin-bottom:0}
.passo,.scheda{background:#f3f7f9;box-shadow:none}
.passo-ico{width:12mm;height:12mm;border-radius:3.4mm;background:linear-gradient(135deg,#4fc99b,#1b6a86);color:#fff;font-size:6.4mm;align-items:center;margin:1.6mm auto 2mm}
.passo-num{background:#12303f}
.h2 .hn{background:#dff6ec;color:#1b6a86;border-radius:2mm;padding:.6mm 2mm;min-width:0}
.cop{margin:10mm 12mm 0;background:linear-gradient(135deg,#12303f,#1b6a86);border-radius:7mm;color:#fff;padding:12mm 12mm 11mm;position:relative;box-shadow:0 1mm 4mm rgba(15,61,82,.25)}
.cop img{position:absolute;right:12mm;top:10mm;width:38mm;background:#fff;border-radius:5mm;padding:3mm}
.cop .k{font-size:3mm;letter-spacing:.5mm;text-transform:uppercase;color:#4fc99b;font-weight:600}
.cop h1{font-size:12mm;line-height:1.05;margin:3mm 0 3mm;max-width:105mm}
.cop p{font-size:4mm;color:#cfe3ec;max-width:100mm}
.griglia-ind{display:grid;grid-template-columns:1fr 1fr;gap:4.5mm;margin:5mm 12mm 0}
.cap-card{background:#fff;border-radius:4mm;box-shadow:0 .6mm 2.4mm rgba(15,61,82,.12);padding:5mm 5.5mm}
.cap-card.largo{grid-column:span 2}
.cap-card .cabeza{display:flex;align-items:center;gap:3mm;margin-bottom:1.5mm}
.cap-card .cabeza .chip{width:9mm;height:9mm;border-radius:2.8mm;background:linear-gradient(135deg,#4fc99b,#1b6a86);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:4mm}
.cap-card .cabeza .tt{font-weight:700;color:#12303f;font-size:4.2mm;flex:1}
.cap-card .cabeza .pp{font-size:3mm;color:#64737d;font-weight:700}
.cap-card .toc-riga{padding:1.2mm 0}
.cap-card .toc-riga.liv2{padding-left:2mm}
.piede{position:absolute;left:12mm;right:12mm;bottom:8mm;display:flex;justify-content:space-between;font-size:2.9mm;color:#64737d}
.cov-card{position:absolute;left:18mm;right:18mm;top:28mm;height:190mm;background:#fff;border-radius:8mm;box-shadow:0 1mm 5mm rgba(15,61,82,.18)}
.cov-card .cov-centro{padding-top:30mm}
.cov-title .t1{color:#12303f}
"""


def tema_d():
    out = []
    gruppi = []
    for v in VOCI_INDICE:
        if v[0] == 1:
            gruppi.append((v, []))
        else:
            gruppi[-1][1].append(v)
    schede = []
    for (liv, num, tit, pag, anc), figli in gruppi:
        righe = "".join(
            '<a class="toc-riga liv2" href="#%s"><span class="toc-num">%s</span><span class="toc-tit">%s</span>'
            '<span class="toc-fill"></span><span class="toc-pag">%d</span></a>' % (a, nn, tt, pg)
            for (_, nn, tt, pg, a) in figli)
        schede.append(
            '<div class="cap-card%s"><a class="cabeza" href="#%s"><span class="chip">%s</span><span class="tt">%s</span>'
            '<span class="pp">pag. %d</span></a>%s</div>' % (" largo" if num == "3" else "", anc, num, tit, pag, righe))
    out.append(
        '<section class="pagina cov" id="p1"><div class="cov-card"><div class="cov-centro">%s</div></div>%s</section>'
        % (copertina_blocco(), copertina_piede()))
    out.append(
        '<section class="pagina" id="p2"><div class="barra"><div class="sx"><div class="chip">%s</div><div><div class="k">%s</div>'
        '<div class="t">Indice</div></div></div><div class="dx"><span class="pgn">2 / %d</span></div></div>'
        '<div class="griglia-ind">%s</div><div class="piede"><span>%s · %s</span><span></span></div></section>'
        % (icona("indice"), NOME_SISTEMA, TOTALE_PAGINE, "".join(schede), NOME_SISTEMA, TITOLO_MANUALE))
    for n, kick, tit, corpo in pagine():
        out.append(
            '<section class="pagina" id="p%d"><div class="barra"><div class="sx"><div class="chip">%s</div><div><div class="k">%s</div>'
            '<div class="t">%s</div></div></div><div class="dx">%s<span class="pgn">%d / %d</span></div></div>'
            '<div class="tela"><div class="riquadro">%s</div></div><div class="piede"><span>%s · %s</span><span></span></div></section>'
            % (n, icona({3: "monitor", 4: "messaggio", 5: "slider"}[n]), kick, tit, link_indice(), n, TOTALE_PAGINE, corpo,
               NOME_SISTEMA, TITOLO_MANUALE))
    return documento(CSS_D, "".join(out))


# ===========================================================================
# LAYOUT E — Editoriale: carta calda, titoli con grazie, filetti sottili
# ===========================================================================
CSS_E = """
:root{--font:'Inter',sans-serif;--font-h:'Bitstream Charter','Liberation Serif',serif;--fw-h:700;--fs:3.45mm;
--ink:#3a332b;--ink-h:#1f2b30;--muted:#6e665b;--accent:#1b6a86;--accent2:#4fc99b;--paper:#fbf7ef;--card:#f4eee1;
--line:#cbbfa9;--card-border:.3mm solid #e0d6c2;--card-shadow:none;--radius:.8mm;--radius-chip:50%;
--chip-bg:#1b6a86;--chip-fg:#fbf7ef;--shot-w:82mm;--gap-col:9mm;--barre-w:76mm;--badge-bg:#1b6a86;--badge-fg:#fff;--shot-shadow:0 .8mm 2.6mm rgba(60,45,20,.22)}
.cornice{position:absolute;inset:11mm 14mm 13mm 14mm;border-top:.9mm solid #1f2b30;border-bottom:.3mm solid #1f2b30}
.cornice:before{content:"";position:absolute;left:0;right:0;top:1.4mm;border-top:.3mm solid #1f2b30}
.testa{position:absolute;left:18mm;right:18mm;top:17mm;display:flex;justify-content:space-between;align-items:baseline;font-size:2.9mm;letter-spacing:.5mm;text-transform:uppercase;color:#6e665b}
.cap-e{padding:24mm 22mm 0}
.finestre{height:12mm}
.cap-e .rom{font-family:'Bitstream Charter','Liberation Serif',serif;font-style:italic;font-size:13mm;color:#1b6a86;line-height:.9}
.cap-e .tit{font-family:'Bitstream Charter','Liberation Serif',serif;font-size:8.4mm;line-height:1.1;color:#1f2b30;margin:1mm 0 4mm;font-weight:700}
.cap-e .filetto{height:.3mm;background:#1f2b30;margin-bottom:3mm}
.piede{position:absolute;left:18mm;right:18mm;bottom:16.5mm;display:flex;justify-content:space-between;align-items:center;font-size:3mm;color:#6e665b}
.piede .num{font-family:'Bitstream Charter','Liberation Serif',serif;font-style:italic;font-size:4mm;color:#1f2b30}
.torna-indice{font-size:2.9mm;letter-spacing:.4mm;text-transform:uppercase;color:#1b6a86;font-weight:600}
.h2{font-size:5.4mm;border-bottom:.3mm solid #cbbfa9;padding-bottom:1.4mm}
.lead{font-family:'Bitstream Charter','Liberation Serif',serif;font-size:4.1mm;line-height:1.5;color:#3a332b}
.passo,.scheda{background:#f4eee1;border:.3mm solid #e0d6c2}
.passo-ico{color:#1b6a86}
.scheda-ico{background:#1b6a86;color:#fbf7ef}
.fin.f2{color:#1f2b30}
.cop-e{padding:30mm 22mm 0;position:relative}
.cop-e img{width:34mm;margin-bottom:9mm}
.cop-e .k{font-size:3.1mm;letter-spacing:.7mm;text-transform:uppercase;color:#1b6a86;font-weight:600}
.cop-e h1{font-family:'Bitstream Charter','Liberation Serif',serif;font-size:19mm;line-height:1.02;color:#1f2b30;margin:3mm 0 4mm;font-weight:700}
.cop-e h1 i{color:#1b6a86;font-weight:400}
.cop-e .sub{font-family:'Bitstream Charter','Liberation Serif',serif;font-style:italic;font-size:4.6mm;color:#6e665b;margin-bottom:10mm;max-width:130mm}
.toc-riga.liv1{font-family:'Bitstream Charter','Liberation Serif',serif;font-size:4.6mm}
.toc-riga.liv2{font-family:'Inter',sans-serif;font-size:3.3mm}
.toc-pag{font-family:'Bitstream Charter','Liberation Serif',serif;font-style:italic}
.cov .cov-centro{position:absolute;left:0;right:0;top:46mm}
.cov-title .t1{font-weight:700;font-size:14mm;letter-spacing:1.2mm}
.cov-title .t2{font-style:italic;font-weight:400;letter-spacing:.4mm;font-size:10mm}
.cov-foot{bottom:19mm}
"""


def tema_e():
    out = []
    out.append(
        '<section class="pagina cov" id="p1"><div class="cornice"></div><div class="cov-centro">%s</div>%s</section>'
        % (copertina_blocco(), copertina_piede()))
    out.append(
        '<section class="pagina" id="p2"><div class="cornice"></div>'
        '<div class="testa"><span>%s</span><span>Indice</span></div>'
        '<div class="cap-e"><div class="rom">&nbsp;</div><div class="tit">Indice</div><div class="filetto"></div>%s</div>'
        '<div class="piede"><span>%s</span><span class="num">2</span></div></section>'
        % (NOME_SISTEMA, indice_html(), TITOLO_MANUALE))
    romani = {3: "I", 4: "II", 5: "III"}
    for n, kick, tit, corpo in pagine():
        out.append(
            '<section class="pagina" id="p%d"><div class="cornice"></div>'
            '<div class="testa"><span>%s</span><span>%s</span></div>'
            '<div class="cap-e"><div class="rom">%s</div><div class="tit">%s</div><div class="filetto"></div>%s</div>'
            '<div class="piede">%s<span class="num">%d</span></div></section>'
            % (n, NOME_SISTEMA, kick, romani[n], tit, corpo, link_indice(), n))
    return documento(CSS_E, "".join(out))


TEMI = [
    ("A", "Classico aziendale", tema_a),
    ("B", "Minimal", tema_b),
    ("C", "Barra laterale (orizzontale)", tema_c),
    ("D", "Schede", tema_d),
    ("E", "Editoriale", tema_e),
]

# -*- coding: utf-8 -*-
"""Genera il MANUALE UTENTE in PDF (layout C = barra laterale orizzontale, layout E = editoriale).

Uso:  python3 manuale.py            (genera entrambi)
      python3 manuale.py C|E        (solo uno)
Il contenuto sta in man_n1.py, man_n2.py, man_n3.py; la grafica dei layout in temi.py + qui sotto.
Il PDF si ottiene misurando ogni blocco con Chromium, distribuendolo sulle pagine (nessun taglio) e stampando.
Vedi LINEE-GUIDA-GENERAZIONE-PDF.md.
"""
import json, os, subprocess, sys, html as _html
from temi import BASE_CSS, CSS_C, CSS_E, documento, NOME_SISTEMA
from contenuto import icona
from man_lib import h2 as _h2  # noqa
import man_n1, man_n2, man_n3

QUI = os.path.dirname(os.path.abspath(__file__))
USCITA = os.path.abspath(os.path.join(QUI, ".."))
PX_MM = 96 / 25.4

PARTI = [
    ("Parte 1", "Raccolta dati dal CRM"),
    ("Parte 2", "Strategia e script"),
    ("Parte 3", "La telefonata"),
    ("Parte 4", "WhatsApp ed email"),
    ("Parte 5", "Modalità stand-alone"),
    ("Parte 6", "Dopo il lavoro"),
    ("Appendici", "Riferimenti"),
]


def tutti_i_blocchi():
    b = []
    for m in (man_n1, man_n2, man_n3):
        b += m.blocchi()
    return b


# ---------------------------------------------------------------- CSS comune dei blocchi
CSS_BLOCCHI = """
.corpo{position:absolute;overflow:hidden}
.corpo.misura{position:absolute!important;left:0!important;top:0!important;right:auto!important;bottom:auto!important;height:auto!important;visibility:hidden;overflow:visible}
.b{padding-bottom:var(--gap-b,2.6mm);display:flow-root}
.par{line-height:1.5;color:var(--ink)}
.par b,.stp-t b,.legenda b,.bx b{color:var(--ink-h)}
.par code,.stp-t code,.tbl code,.legenda code{font-family:'DejaVu Sans Mono',monospace;font-size:.86em;background:rgba(27,106,134,.10);color:var(--ink-h);padding:.2mm 1.2mm;border-radius:.8mm;white-space:nowrap}
.elenco{padding-left:5mm;line-height:1.5}
.elenco li{margin:.6mm 0}
.lead{font-size:calc(var(--fs)*1.08);color:var(--muted);line-height:1.5;margin:0}
.h2{margin:2.4mm 0 .6mm}
.stp{display:flex;gap:3mm;align-items:flex-start}
.stp-n{flex:none;width:6.2mm;height:6.2mm;border-radius:50%;background:var(--accent);color:#fff;font-weight:700;font-size:3.2mm;display:flex;align-items:center;justify-content:center;margin-top:-.2mm}
.stp-t{line-height:1.5;flex:1}
.bx{display:flex;gap:3mm;align-items:flex-start;padding:3mm 3.4mm;border-radius:var(--radius);line-height:1.45;font-size:calc(var(--fs)*.94)}
.bx-ic{flex:none;font-size:5mm;margin-top:.2mm}
.bx-nota{background:#e6f1f6;color:#0f3d52}.bx-attenzione{background:#fdecea;color:#7f1d1d}.bx-consiglio{background:#e3f7ee;color:#0b5d3b}
.tbl{width:100%;border-collapse:collapse;font-size:calc(var(--fs)*.88);line-height:1.38}
.tbl th{text-align:left;background:var(--accent);color:#fff;padding:1.8mm 2.4mm;font-weight:600}
.tbl td{padding:1.8mm 2.4mm;border-bottom:.3mm solid var(--line);vertical-align:top;color:var(--ink)}
.tbl tr:nth-child(even) td{background:rgba(0,0,0,.025)}
.tbl td:first-child{font-weight:700;color:var(--ink-h)}
.fig{display:grid;grid-template-columns:var(--fw) 1fr;gap:6mm;align-items:start}
.fig.stack{display:block}.fig.stack .legenda{display:grid;grid-template-columns:1fr 1fr;gap:2mm 6mm;margin-top:3mm}
.fig.solo{display:block;text-align:center}
.fig-img{width:var(--fw);max-width:100%;text-align:center}
.fig.stack .fig-img{margin:0 auto}
.fig-in{position:relative;display:inline-block;line-height:0;border:.3mm solid var(--line);border-radius:1mm;background:#fff;box-shadow:var(--shot-shadow)}
.fig-in img{display:block;width:100%;height:auto;max-height:var(--figmax,140mm);object-fit:contain;border-radius:1mm}
.bd{position:absolute;transform:translate(-50%,-50%);width:5.4mm;height:5.4mm;border-radius:50%;background:var(--badge-bg);color:#fff;font-size:3mm;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 0 0 .6mm #fff;font-family:var(--font)}
.bd.up{transform:translate(-55%,-82%)}
.bd.fisso{position:static;transform:none;flex:none;box-shadow:none;margin-top:.2mm}
.legenda{list-style:none;display:flex;flex-direction:column;gap:2mm;font-size:calc(var(--fs)*.88);line-height:1.38;color:var(--muted)}
.legenda li{display:flex;gap:2.4mm;align-items:flex-start}
.didascalia{font-size:calc(var(--fs)*.76);color:var(--muted);margin-top:1.6mm;line-height:1.3}
/* infografiche */
.arch{display:flex;flex-direction:column;gap:1.6mm}
.arch-r1,.arch-r2{display:flex;align-items:stretch;gap:1.4mm}
.arch-r2{gap:2.4mm}
.arch-mid{display:flex;align-items:center;justify-content:center;gap:3mm;color:var(--muted);font-size:calc(var(--fs)*.8);font-style:italic}
.nodo{flex:1;background:var(--card);border:var(--card-border);border-radius:var(--radius);padding:3.2mm 2.4mm;text-align:center;box-shadow:var(--card-shadow)}
.nodo.crm{border-top:1.2mm solid #f59e0b}.nodo.est{border-top:1.2mm solid #4fc99b}.nodo.con{border-top:1.2mm solid var(--accent)}.nodo.usc{border-top:1.2mm solid var(--ink-h)}
.nodo-ic{font-size:8mm;color:var(--accent);display:flex;justify-content:center;margin-bottom:1.2mm}
.nodo-t{font-weight:700;color:var(--ink-h);font-size:calc(var(--fs)*.95);margin-bottom:.8mm}
.nodo-s{font-size:calc(var(--fs)*.76);color:var(--muted);line-height:1.32}
.fr{flex:none;width:5mm;display:flex;align-items:center;color:var(--accent2)}.fr svg{width:100%}
.frg{flex:none;width:5mm;color:var(--accent2)}.frg svg{width:100%;display:block}
.giornata{display:grid;grid-template-columns:1fr 1fr;gap:2.6mm 5mm}
.gs{display:flex;gap:2.6mm;align-items:flex-start;background:var(--card);border:var(--card-border);border-radius:var(--radius);padding:2.6mm 3mm;font-size:calc(var(--fs)*.86);line-height:1.38;color:var(--muted)}
.gs b{color:var(--ink-h)}
.gs-n{flex:none;width:5.6mm;height:5.6mm;border-radius:50%;background:var(--accent);color:#fff;font-weight:700;font-size:3mm;display:flex;align-items:center;justify-content:center}
.gs-i{flex:none;font-size:6mm;color:var(--accent)}
.flusso{margin-top:1mm}
.torna-indice{white-space:nowrap}
.toc{display:block;columns:2;column-gap:9mm;column-fill:auto;height:100%}
.toc-riga{break-inside:avoid;padding:.9mm 0!important;font-size:calc(var(--fs)*.9)}
.toc-riga.liv1{break-after:avoid;margin-top:2.4mm!important;font-size:calc(var(--fs)*1.0)}
.toc-riga.liv2{padding-left:5mm!important}
.toc-tit{flex:0 1 auto}
.misura .toc{columns:1!important;height:auto!important;display:flex!important}
.arch.cmp{gap:.6mm}.arch.cmp .nodo{padding:1.5mm 2mm}.arch.cmp .nodo-ic{font-size:5.2mm;margin-bottom:.3mm}.arch.cmp .nodo-t{margin-bottom:.2mm}.arch.cmp .arch-mid{font-size:calc(var(--fs)*.72)}.arch.cmp .frg{width:3.4mm}.arch.cmp .arch-mid{gap:2mm}
.arch-r1.solo{justify-content:center}.arch-r1.solo .nodo{flex:none;width:64%;border-top-width:1.6mm;background:#eaf6f0}
.crm{width:100%;border:.4mm solid #b9c4cc;border-radius:2mm;background:#fff;overflow:hidden;box-shadow:var(--shot-shadow)}
.crm-top{display:flex;align-items:center;gap:1.4mm;background:#e9edf0;padding:1.8mm 2.4mm}
.crm-d{width:2.2mm;height:2.2mm;border-radius:50%;background:#c4cbd1}
.crm-url{margin-left:3mm;font-size:2.8mm;color:#5b6770;background:#fff;border-radius:1mm;padding:.6mm 3mm;flex:1}
.crm-body{position:relative;padding:3.5mm 4mm 15mm;min-height:52mm}
.crm-h{font-weight:700;color:#1b3340;font-size:3.6mm;margin-bottom:2.4mm}
.crm-r{display:flex;align-items:center;gap:3mm;margin:1.6mm 0}
.crm-l{width:12mm;height:2.4mm;border-radius:1mm;background:#dfe5e9}
.crm-v{font-size:3mm;color:#6b7780}
.crm-btn{position:absolute;right:3mm;bottom:3mm;background:#2454e0;color:#fff;border-radius:2mm;padding:2.6mm 4mm;font-size:3.1mm;font-weight:600;box-shadow:0 1mm 3mm rgba(0,0,0,.28);font-family:'Inter',sans-serif;outline:.9mm solid rgba(36,84,224,.28);outline-offset:.5mm}
.crm-call{position:absolute;right:3mm;bottom:15.5mm;background:#e11d48;color:#fff;font-weight:700;font-size:2.7mm;letter-spacing:.2mm;padding:1mm 2.6mm;border-radius:5mm;font-family:'Inter',sans-serif}
.crm-call:after{content:'';position:absolute;right:9mm;bottom:-1.6mm;border:1.8mm solid transparent;border-top-color:#e11d48;border-bottom:0}
.crm-btn.ok{background:#1f9d6b;outline-color:rgba(31,157,107,.28)}
.phone{width:100%;background:#fafafa;border:.5mm solid #2b2b2b;border-radius:5mm;padding:4mm 3.4mm 5mm;text-align:left;line-height:1.3;font-family:Roboto,'Inter',sans-serif}
.ph-bar{width:14mm;height:1.2mm;border-radius:1mm;background:#c9c9c9;margin:0 auto 3mm}
.ph-r{position:relative;margin:1.4mm 0}
.ph-r.t{font-size:4.6mm;font-weight:500;color:#202020}
.ph-r.s{font-size:3mm;color:#555}
.ph-r.d{font-size:3.1mm;color:#333}
.ph-r.c{border-bottom:.4mm solid #1b6a86;padding:1mm 0;font-size:3.3mm;color:#333}
.ph-r.b{background:#e4e4e4;border-radius:1.2mm;padding:2.2mm 3mm;font-size:3.1mm;color:#222;text-align:center}
.ph-r.st{font-size:2.9mm;color:#444;line-height:1.45;margin-top:2.6mm}
.phb{left:auto;right:-2.6mm;top:50%}
"""

# ---------------------------------------------------------------- temi (pagine)
CSS_MAN_C = """
:root{--figw:78mm;--figmax:100mm;--gap-b:2.4mm}
.corpo{left:13mm;right:13mm;top:36mm;bottom:12mm}
.pagina.cont .corpo{top:27mm}
.dx .tit{font-size:7mm;margin-bottom:0}
.pagina.cont .dx .tit{font-size:5.2mm}
.rt{display:none}
.lato .voce.cap{font-size:3.1mm}
.lato .parte{display:block;padding:1.6mm 2.4mm;border-radius:1.4mm;font-size:2.9mm;color:#cfe3ec;margin-top:.6mm}
.lato .parte small{display:block;color:#7fa6b8;font-size:2.3mm;text-transform:uppercase;letter-spacing:.3mm}
.lato .parte.on{background:rgba(79,201,155,.22);color:#fff}
.lato .parte.on small{color:#4fc99b}
.lato .torna-indice{margin-bottom:5mm}
.toc-riga{padding:1.1mm 0}.toc-riga.liv1{margin-top:2mm}
.cop-c{position:absolute;left:18mm;right:0;top:0;bottom:0}
"""

CSS_MAN_E = """
:root{--figw:74mm;--figmax:118mm;--gap-b:2.8mm}
.corpo{left:22mm;right:22mm;top:63mm;bottom:27mm}
.pagina.cont .corpo{top:38mm}
.cap-e{padding-top:24mm}
.rt{position:absolute;left:22mm;right:22mm;top:25mm;font-family:'Bitstream Charter','Liberation Serif',serif;font-style:italic;font-size:4.2mm;color:#6e665b;border-bottom:.3mm solid #cbbfa9;padding-bottom:1.6mm}
.cap-e .rom{font-size:13mm}.cap-e .tit{font-size:8mm}
.piede .sx{display:flex;gap:6mm;align-items:center}
.toc-riga.liv1{font-family:'Bitstream Charter','Liberation Serif',serif}
"""


# ---------------------------------------------------------------- pagina
def _pg_E(n, cls, parte, cap_titolo, cap_num, cont, corpo, toc=False):
    num_rom = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
               "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX", "XXXI", "XXXII", "XXXIII", "XXXIV", "XXXV", "XXXVI", "XXXVII", "XXXVIII", "XXXIX", "XL"]
    head = ""
    if cls == "first":
        head = '<div class="cap-e"><div class="rom">%s</div><div class="tit">%s</div><div class="filetto"></div></div>' % (
            "&nbsp;" if toc else (num_rom[int(cap_num)] if str(cap_num).isdigit() and int(cap_num) < len(num_rom) else _html.escape(str(cap_num))), cap_titolo)
    else:
        head = '<div class="rt">%s <span style="font-style:normal;font-size:.7em">· continua</span></div>' % cap_titolo
    return ('<section class="pagina %s" id="p%d"><div class="cornice"></div><div class="testa"><span>%s</span><span>%s</span></div>%s'
            '<div class="corpo %s">%s</div><div class="piede"><span class="sx">%s</span><span class="num">%d</span></div></section>'
            % (cls, n, NOME_SISTEMA, parte, head, cls, corpo, ('<a class="torna-indice" href="#p2">%s<span>Indice</span></a>' % icona("indice")) if n != 2 else "", n))


def _pg_C(n, cls, parte_idx, parte, cap_titolo, cap_num, cont, corpo, toc=False, total=0):
    lato = ['<a class="torna-indice" href="#p2">%s<span>Indice</span></a>' % icona("indice")] if n != 2 else []
    for i, (sig, nome) in enumerate(PARTI):
        lato.append('<a class="parte %s" href="#%s"><small>%s</small>%s</a>' % ("on" if i == parte_idx else "", PARTE_ANCORE.get(i, "p2"), sig, nome))
    kick = parte if not toc else "Sales Assistant"
    tit = cap_titolo if cls == "first" else cap_titolo + " <span style='font-weight:400;opacity:.6;font-size:.7em'>· continua</span>"
    num = ("%s. " % cap_num) if (cap_num and not toc) else ""
    return ('<section class="pagina %s" id="p%d"><div class="lato"><img src="assets/logo-yesmobility.png" alt="">%s<div class="pg">%d / %d</div></div>'
            '<div class="dx"><div class="kick">%s</div><div class="tit">%s%s</div><div class="corpo %s">%s</div></div></section>'
            % (cls, n, "".join(lato), n, total, kick, num, tit, cls, corpo))


PARTE_ANCORE = {}


def cover_html(tema):
    pie = ('<div class="cov-foot"><img src="assets/momandis-logo.png" alt="Momandis"><div>© Designed and krafted by Momandis David Vannini</div></div>')
    blocco = ('<div class="cov-logo"><img src="assets/logo-yesmobility.png" alt="YesMobility"></div>'
              '<div class="cov-title"><span class="t1">SALES ASSISTANT</span><span class="t2">User Manual</span></div>')
    if tema == "C":
        return ('<section class="pagina cov" id="p1"><div class="striscia"></div><div class="cov-centro">%s</div>%s</section>' % (blocco, pie))
    return ('<section class="pagina cov" id="p1"><div class="cornice"></div><div class="cov-centro">%s</div>%s</section>' % (blocco, pie))


# ---------------------------------------------------------------- misura e impaginazione
def _wrap_blocchi(blocchi):
    return "".join('<div class="b" data-i="%d">%s</div>' % (i, b["html"]) for i, b in enumerate(blocchi))


def _toc_rows(capitoli, h2s, pagine_di):
    rows = []
    for c in capitoli:
        rows.append(('<a class="toc-riga liv1" href="#%s"><span class="toc-num">%s</span><span class="toc-tit">%s</span><span class="toc-fill"></span><span class="toc-pag">%s</span></a>'
                     % (c["id"], c["num"], c["titolo"], pagine_di.get(c["id"], "0"))))
        for h in h2s.get(c["id"], []):
            rows.append(('<a class="toc-riga liv2" href="#%s"><span class="toc-num">%s</span><span class="toc-tit">%s</span><span class="toc-fill"></span><span class="toc-pag">%s</span></a>'
                         % (h["id"], h["num"], h["titolo"], pagine_di.get(h["id"], "0"))))
    return rows


def _doc(tema, corpo_pagine):
    css_t, css_m, orient = (CSS_C, CSS_MAN_C, "landscape") if tema == "C" else (CSS_E, CSS_MAN_E, "portrait")
    d = documento(css_t + CSS_BLOCCHI + css_m, corpo_pagine, orient)
    return d


def misura(tema, blocchi, toc_demo):
    """Restituisce capacità pagina (px) e altezze dei blocchi (px)."""
    # pagine di calibrazione: una "first", una "cont", un contenitore di misura
    if tema == "C":
        pf = _pg_C(1, "first", 0, "Parte 1", "Calibrazione", "1", False, "", False, 1)
        pc = _pg_C(2, "cont", 0, "Parte 1", "Calibrazione", "1", True, "", False, 1)
    else:
        pf = _pg_E(1, "first", "Parte 1", "Calibrazione", "1", False, "")
        pc = _pg_E(2, "cont", "Parte 1", "Calibrazione", "1", True, "")
    mis = '<div class="pagina" style="position:absolute;left:0;top:0;visibility:hidden"><div class="corpo first misura" id="misura">%s</div></div>' % _wrap_blocchi(blocchi)
    mis_toc = '<div class="pagina" style="position:absolute;left:0;top:0;visibility:hidden"><div class="corpo first misura" id="misura_toc"><nav class="toc">%s</nav></div></div>' % "".join(toc_demo)
    html = _doc(tema, pf.replace('<section class="pagina first"', '<section class="pagina first" data-cal="first"') + pc + mis + mis_toc)
    f = os.path.join(QUI, "_misura_%s.html" % tema)
    open(f, "w", encoding="utf-8").write(html)
    out = os.path.join(QUI, "_misura_%s.json" % tema)
    subprocess.check_call(["node", os.path.join(QUI, "man_render.js"), "misura", f, out],
                          env=dict(os.environ, NODE_PATH=subprocess.check_output(["npm", "root", "-g"], text=True).strip()))
    return json.load(open(out))


def impagina(blocchi, altezze, cap_first, cap_cont):
    """Distribuisce i blocchi in pagine. 'cap' apre sempre una nuova pagina; 'h2' resta unito al blocco successivo."""
    pagine = []  # lista di dict(cap_idx, cls, blocchi[])
    cur = None
    used = 0
    avvisi = []

    def nuova(cls, ci):
        nonlocal cur, used
        cur = dict(cls=cls, ci=ci, blocchi=[])
        pagine.append(cur)
        used = 0

    ci = -1
    i = 0
    n = len(blocchi)
    while i < n:
        b = blocchi[i]
        h = altezze[i]
        if b["k"] == "cap":
            ci += 1
            nuova("first", ci)
            cur["blocchi"].append(i)
            used += h
            i += 1
            continue
        capa = (cap_first if cur["cls"] == "first" else cap_cont) * 0.985
        # blocchi da tenere uniti: h2 con il successivo (e un eventuale intro)
        need = h
        if b["k"] == "h2" and i + 1 < n and blocchi[i + 1]["k"] == "info":
            need += altezze[i + 1]
        elif b["k"] == "h2" and i + 1 < n:
            need += min(altezze[i + 1], capa * 0.45)
            if i + 2 < n and blocchi[i + 1]["k"] == "p" and blocchi[i + 2]["k"] == "fig":
                need += min(altezze[i + 2], capa * 0.5)
        elif b["k"] == "p" and i + 1 < n and blocchi[i + 1]["k"] == "fig":
            need += min(altezze[i + 1], capa * 0.5)
        if used + need > capa and cur["blocchi"]:
            nuova("cont", ci)
            capa = cap_cont * 0.985
        if h > capa:
            avvisi.append("blocco troppo alto (%d px > %d): %s" % (h, capa, b["html"][:60]))
        cur["blocchi"].append(i)
        used += h
        i += 1
    return pagine, avvisi


def costruisci(tema):
    blocchi = tutti_i_blocchi()
    capitoli = [b for b in blocchi if b["k"] == "cap"]
    h2s = {}
    ci = None
    for b in blocchi:
        if b["k"] == "cap":
            ci = b["id"]
        elif b["k"] == "h2":
            h2s.setdefault(ci, []).append(b)
    toc_demo = _toc_rows(capitoli, h2s, {})
    m = misura(tema, blocchi, toc_demo)
    altezze = m["altezze"]; cap_first = m["capFirst"]; cap_cont = m["capCont"]
    pagine, avvisi = impagina(blocchi, altezze, cap_first, cap_cont)
    # pagine dell'indice
    toc_alt = m["altezzeToc"]
    toc_pag = []
    used = 0
    cur = []
    capa = cap_first * 2 * 0.97
    for i, h in enumerate(toc_alt):
        if used + h > capa and cur:
            toc_pag.append(cur); cur = []; used = 0; capa = cap_cont * 2 * 0.97
        cur.append(i); used += h
    if cur:
        toc_pag.append(cur)
    n_toc = len(toc_pag)
    primo = 2 + n_toc  # numero pagina del primo capitolo
    # numeri di pagina per ancora
    pagina_di = {}
    for k, pg in enumerate(pagine):
        num = primo + k
        for bi in pg["blocchi"]:
            b = blocchi[bi]
            if b["k"] in ("cap", "h2"):
                pagina_di[b["id"]] = str(num)
    toc_rows = _toc_rows(capitoli, h2s, pagina_di)
    # ancore di parte (per la barra laterale del layout C)
    PARTE_ANCORE.clear()
    for c in capitoli:
        idx = int(c["parte"].split()[1]) - 1
        PARTE_ANCORE.setdefault(idx, "p%s" % pagina_di[c["id"]])
    total = primo + len(pagine) - 1
    out = [cover_html(tema)]
    # pagine indice
    for k, idxs in enumerate(toc_pag):
        corpo = '<nav class="toc">%s</nav>' % "".join(toc_rows[i] for i in idxs)
        cls = "first" if k == 0 else "cont"
        if tema == "C":
            out.append(_pg_C(2 + k, cls, 0, "Indice", "Indice", "", k > 0, corpo, True, total))
        else:
            out.append(_pg_E(2 + k, cls, "Indice", "Indice", "", k > 0, corpo, True))
    for k, pg in enumerate(pagine):
        n = primo + k
        c = capitoli[pg["ci"]]
        parte_idx = int(c["parte"].split()[1]) - 1
        corpo = _wrap_blocchi_sel(blocchi, pg["blocchi"], pg["cls"] == "first")
        if tema == "C":
            out.append(_pg_C(n, pg["cls"], parte_idx, PARTI[parte_idx][0] + " · " + PARTI[parte_idx][1], c["titolo"], c["num"], pg["cls"] == "cont", corpo, False, total))
        else:
            out.append(_pg_E(n, pg["cls"], PARTI[parte_idx][0] + " · " + PARTI[parte_idx][1], c["titolo"], c["num"], pg["cls"] == "cont", corpo))
    costruisci.pagina_di = pagina_di
    return "".join(out), avvisi, total, n_toc


def _wrap_blocchi_sel(blocchi, idxs, first):
    out = []
    for i in idxs:
        b = blocchi[i]
        if b["k"] == "cap":
            out.append('<div class="b" id="%s">%s</div>' % (b["id"], b["html"]) if b["html"] else '<div class="b" id="%s"></div>' % b["id"])
        else:
            out.append('<div class="b">%s</div>' % b["html"])
    return "".join(out)


def verifica_link(pdf, pagina_di):
    """Controlla che ogni voce dell'indice atterri sulla pagina indicata nel numero stampato."""
    from pypdf import PdfReader
    r = PdfReader(pdf)
    nd = r.named_destinations
    errori = 0
    for anc, num in pagina_di.items():
        d = nd.get("/" + anc)
        if d is None:
            print("  LINK MANCANTE:", anc); errori += 1; continue
        reale = r.get_destination_page_number(d) + 1
        if reale != int(num):
            print("  LINK ERRATO:", anc, "stampato", num, "reale", reale); errori += 1
    # icona "Indice": ogni pagina oltre l'indice deve avere un collegamento verso #p2
    senza = 0
    for i, pg in enumerate(r.pages, 1):
        if i == 1:
            continue
        ok = False
        for a in (pg.get("/Annots") or []):
            a = a.get_object()
            dd = a.get("/Dest")
            if dd is None and "/A" in a:
                dd = a["/A"].get_object().get("/D")
            if dd is not None and str(dd) == "/p2":
                ok = True
        if not ok and i != 2:
            senza += 1; print("  pagina senza icona Indice:", i)
    print("  verifica link: %d voci controllate, %d errori, %d pagine senza icona Indice" % (len(pagina_di), errori, senza))


def genera(tema):
    corpo, avvisi, total, n_toc = costruisci(tema)
    html = _doc(tema, corpo)
    nome = {"C": "Manuale-Utente-SALES-ASSISTANT-Layout-C.pdf", "E": "Manuale-Utente-SALES-ASSISTANT-Layout-E.pdf"}[tema]
    f = os.path.join(QUI, "_manuale_%s.html" % tema)
    open(f, "w", encoding="utf-8").write(html)
    pdf = os.path.join(USCITA, nome)
    subprocess.check_call(["node", os.path.join(QUI, "man_render.js"), "pdf", f, pdf],
                          env=dict(os.environ, NODE_PATH=subprocess.check_output(["npm", "root", "-g"], text=True).strip()))
    print("Layout %s: %d pagine (di cui %d di indice) -> %s" % (tema, total, n_toc, pdf))
    verifica_link(pdf, costruisci.pagina_di)
    for a in avvisi:
        print("  AVVISO:", a)


if __name__ == "__main__":
    temi = sys.argv[1:] or ["C", "E"]
    for t in temi:
        genera(t.upper())

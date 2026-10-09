# -*- coding: utf-8 -*-
"""Genera i PDF dei layout proposti: python3 genera.py
Richiede Python 3, Node.js con Playwright e Chromium (i font sono quelli di sistema: Inter, Bitstream Charter).
"""
import os, subprocess, sys
from temi import TEMI

QUI = os.path.dirname(os.path.abspath(__file__))
USCITA = os.path.abspath(os.path.join(QUI, "..", "layout-proposte"))
os.makedirs(USCITA, exist_ok=True)
lavori = []
for sigla, nome, fn in TEMI:
    html = os.path.join(QUI, "_layout_%s.html" % sigla)
    open(html, "w", encoding="utf-8").write(fn())
    pdf = os.path.join(USCITA, "Layout-%s-%s.pdf" % (sigla, nome.split(" (")[0].replace(" ", "-")))
    lavori.append((html, pdf))
js = os.path.join(QUI, "render_pdf.js")
subprocess.check_call(["node", js] + [x for l in lavori for x in l], env=dict(os.environ, NODE_PATH=subprocess.check_output(["npm", "root", "-g"], text=True).strip()))
for _, pdf in lavori:
    print(pdf)

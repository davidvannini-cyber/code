# Aggiunge piè di pagina (titolo e numero di pagina) a tutte le pagine tranne la copertina, e i metadati.
import sys, io
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
src, dst = sys.argv[1], sys.argv[2]
FONT = None
for path in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
    try: pdfmetrics.registerFont(TTFont('Foot', path)); FONT = 'Foot'
    except Exception: pass
r = PdfReader(src); w = PdfWriter()
n = len(r.pages)
for i, page in enumerate(r.pages):
    if i > 0:
        W = float(page.mediabox.width); H = float(page.mediabox.height)
        buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=(W, H))
        c.setStrokeColorRGB(0.89, 0.9, 0.94); c.setLineWidth(0.6); c.line(42.5, 36, W - 42.5, 36)
        c.setFillColorRGB(0.36, 0.38, 0.49); c.setFont(FONT or 'Helvetica', 7.5)
        c.drawString(42.5, 24, 'TV Vannini  ·  Guida completa')
        c.drawRightString(W - 42.5, 24, f'{i + 1}')
        c.save(); buf.seek(0)
        page.merge_page(PdfReader(buf).pages[0])
    w.add_page(page)
w.add_metadata({'/Title': 'TV Vannini — Guida completa', '/Author': 'Progetto M3U-PLAYER-WEB', '/Subject': 'Come funziona il lettore TV Vannini: sito, app Fire TV, modo auto, admin'})
with open(dst, 'wb') as f: w.write(f)

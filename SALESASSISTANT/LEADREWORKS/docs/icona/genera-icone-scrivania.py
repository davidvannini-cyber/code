# Genera le icone "liquid glass" per la scrivania (5 icone) in ../icone-scrivania/ (PNG 1024 + .icns).
# Uso: python3 genera-icone-scrivania.py   (richiede Pillow e numpy)
import io, os, struct
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "icone-scrivania")
os.makedirs(OUT, exist_ok=True)
S = 1024; BODY = 836; M = (S - BODY) // 2; R = int(BODY * 0.225)
FONT = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
if not os.path.exists(FONT): FONT = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"

def vgrad(top, bottom, h=S, w=S):
    t = np.linspace(0, 1, h)[:, None, None]
    a = np.array(top, float)[None, None, :]; b = np.array(bottom, float)[None, None, :]
    return np.repeat(a + (b - a) * t, w, axis=1)

def squircle(inset=0, blur=0):
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).rounded_rectangle([M+inset, M+inset, S-M-1-inset, S-M-1-inset], radius=max(R-inset, 1), fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur)) if blur else m

# ---------- tessera di vetro ----------
def glass_tile(top, bottom, g1, g2, g3):
    mask = squircle()
    canvas = Image.fromarray(vgrad(top + (255,), bottom + (255,)).astype("uint8"), "RGBA")
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    g.ellipse([M-60, M+BODY*0.35, M+BODY*0.75, M+BODY*1.15], fill=g1 + (170,))
    g.ellipse([M+BODY*0.35, M+BODY*0.55, M+BODY*1.15, M+BODY*1.2], fill=g2 + (150,))
    g.ellipse([M+BODY*0.1, M-BODY*0.25, M+BODY*0.9, M+BODY*0.45], fill=g3 + (200,))
    canvas = Image.alpha_composite(canvas, glow.filter(ImageFilter.GaussianBlur(90)))
    veil = Image.fromarray(vgrad((255, 255, 255, 120), (255, 255, 255, 0)).astype("uint8"), "RGBA")
    vm = Image.new("L", (S, S), 0); ImageDraw.Draw(vm).rectangle([0, 0, S, int(S*0.5)], fill=255)
    veil.putalpha(ImageChops.multiply(veil.getchannel("A"), vm.filter(ImageFilter.GaussianBlur(40))))
    canvas = Image.alpha_composite(canvas, veil)
    edge = ImageChops.subtract(mask, squircle(14, 10))
    ec = Image.fromarray(vgrad((255, 255, 255, 255), (190, 235, 245, 255)).astype("uint8"), "RGBA")
    ec.putalpha(edge.point(lambda v: int(v * 0.85)))
    canvas = Image.alpha_composite(canvas, ec)
    inner = ImageChops.subtract(mask, mask.transform((S, S), Image.AFFINE, (1, 0, 0, 0, 1, -26))).filter(ImageFilter.GaussianBlur(14))
    sh = Image.new("RGBA", (S, S), (10, 60, 110, 0)); sh.putalpha(inner.point(lambda v: int(v * 0.40)))
    canvas = Image.alpha_composite(canvas, sh)
    spec = Image.new("L", (S, S), 0)
    ImageDraw.Draw(spec).ellipse([M+BODY*0.06, M+8, M+BODY*0.94, M+BODY*0.50], fill=255)
    spec = ImageChops.multiply(spec, squircle(10))
    fade = Image.fromarray(np.repeat(np.linspace(110, 0, S)[:, None], S, axis=1).astype("uint8"), "L")
    spec = ImageChops.multiply(spec.filter(ImageFilter.GaussianBlur(26)), fade)
    sp = Image.new("RGBA", (S, S), (255, 255, 255, 0)); sp.putalpha(spec)
    return Image.alpha_composite(canvas, sp), mask

# ---------- forme 3D (rilievo lucido) ----------
def bevel(mask, top, bottom, depth=26, shin=70, bbox=None):
    """Colora una maschera con effetto rilievo: luce da in alto a sinistra + riflesso speculare."""
    m = np.array(mask, float) / 255.0
    h = np.array(mask.filter(ImageFilter.GaussianBlur(depth)), float) / 255.0
    gy, gx = np.gradient(h); k = depth * 2.2
    nx, ny, nz = -gx * k, -gy * k, np.ones_like(h)
    n = np.sqrt(nx**2 + ny**2 + nz**2); nx, ny, nz = nx/n, ny/n, nz/n
    L = np.array([-0.45, -0.65, 0.62]); L /= np.linalg.norm(L)
    diff = np.clip(nx*L[0] + ny*L[1] + nz*L[2], 0, 1)
    Hh = L + np.array([0, 0, 1.0]); Hh /= np.linalg.norm(Hh)
    spec = np.clip(nx*Hh[0] + ny*Hh[1] + nz*Hh[2], 0, 1) ** shin
    ys = np.where(m.max(axis=1) > 0.5)[0]
    y0, y1 = (ys.min(), ys.max()) if len(ys) else (0, S-1)
    t = np.clip((np.arange(S) - y0) / max(y1 - y0, 1), 0, 1)[:, None, None]
    base = np.array(top, float)[None, None, :] * (1 - t) + np.array(bottom, float)[None, None, :] * t
    base = np.repeat(base, S, axis=1)
    col = base * (0.50 + 0.70 * diff[:, :, None]) + (spec * 230)[:, :, None]
    # bordo interno leggermente più scuro/saturo per dare spessore
    rim = np.clip(1 - h / max(h.max(), 1e-6) * 1.0, 0, 1)[:, :, None]
    col = col * (1 - 0.18 * rim)
    out = np.dstack([np.clip(col, 0, 255), m * 255]).astype("uint8")
    return Image.fromarray(out, "RGBA")

def place(canvas, shape, shadow=(8, 70, 130), sh_alpha=0.45, off=(6, 24), blur=20):
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    a = shape.getchannel("A").point(lambda v: int(v * sh_alpha))
    sh.paste(Image.new("RGBA", (S, S), shadow + (255,)), (off[0], off[1]), a)
    canvas = Image.alpha_composite(canvas, sh.filter(ImageFilter.GaussianBlur(blur)))
    return Image.alpha_composite(canvas, shape)

def poly_mask(points):
    m = Image.new("L", (S, S), 0); ImageDraw.Draw(m).polygon(points, fill=255); return m

def finish(canvas, mask, name):
    canvas.putalpha(mask)
    final = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    drop = Image.new("RGBA", (S, S), (0, 0, 0, 0)); drop.putalpha(mask.point(lambda v: int(v * 0.45)))
    drop = drop.transform((S, S), Image.AFFINE, (1, 0, 0, 0, 1, -22)).filter(ImageFilter.GaussianBlur(26))
    final = Image.alpha_composite(Image.alpha_composite(final, drop), canvas)
    final.save(os.path.join(OUT, name + ".png"))
    chunks = b""
    for t, sz in (("icp6", 64), ("ic07", 128), ("ic08", 256), ("ic09", 512), ("ic10", 1024)):
        buf = io.BytesIO(); final.resize((sz, sz), Image.LANCZOS).save(buf, "PNG"); d = buf.getvalue()
        chunks += t.encode() + struct.pack(">I", len(d) + 8) + d
    open(os.path.join(OUT, name + ".icns"), "wb").write(b"icns" + struct.pack(">I", len(chunks) + 8) + chunks)
    print("ok", name)

BLUE = dict(top=(110, 178, 255), bottom=(22, 84, 206), g1=(60, 140, 255), g2=(20, 70, 190), g3=(215, 235, 255))
LIGHT = dict(top=(236, 246, 255), bottom=(120, 176, 236), g1=(150, 200, 255), g2=(90, 150, 230), g3=(255, 255, 255))
WHITE = ((255, 255, 255), (206, 222, 240)); ORANGE = ((255, 190, 60), (238, 104, 8))
DEEP = ((70, 160, 255), (8, 40, 170))

def rr(box, r):
    m = Image.new("L", (S, S), 0); ImageDraw.Draw(m).rounded_rectangle(box, radius=r, fill=255); return m

# 1) Suggerimenti Vendita: fumetto bianco + fulmine arancione su vetro blu (era nero)
def icona_suggerimenti():
    c, mask = glass_tile(**BLUE); k = BODY / 1024.0
    P = lambda x, y: (M + x * k, M + y * k)
    bubble = rr([M+215*k, M+285*k, M+808*k, M+717*k], int(125*k))
    bubble = ImageChops.lighter(bubble, poly_mask([P(345, 640), P(345, 808), P(470, 700)]))
    c = place(c, bevel(bubble, *WHITE, depth=22))
    bolt = poly_mask([P(473, 255), P(628, 255), P(527, 475), P(659, 475), P(423, 740), P(496, 513), P(363, 513)])
    return place(c, bevel(bolt, *ORANGE, depth=14, shin=50), shadow=(120, 50, 0), sh_alpha=0.5, off=(4, 16), blur=12), mask

# 2) Sync: due frecce circolari blu 3D
def stroke(points, w):
    """Tratto spesso a estremità tonde: cerchi lungo il percorso (liscio, senza scalini)."""
    m = Image.new("L", (S * 2, S * 2), 0); d = ImageDraw.Draw(m)
    for x, y in points:
        d.ellipse([(x - w/2) * 2, (y - w/2) * 2, (x + w/2) * 2, (y + w/2) * 2], fill=255)
    return m.resize((S, S), Image.LANCZOS)

def arc_arrow(a0, a1, cx=512, cy=512, r=190, w=100):
    import math
    pts = [(cx + r*math.cos(math.radians(a)), cy + r*math.sin(math.radians(a))) for a in np.linspace(a0, a1, 160)]
    m = stroke(pts, w); d = ImageDraw.Draw(m)
    th = math.radians(a1); ex, ey = cx + r*math.cos(th), cy + r*math.sin(th)
    tx, ty = -math.sin(th), math.cos(th); nx, ny = math.cos(th), math.sin(th)
    hw, hl = w * 1.05, w * 1.3
    d.polygon([(ex+nx*hw, ey+ny*hw), (ex-nx*hw, ey-ny*hw), (ex+tx*hl, ey+ty*hl)], fill=255)
    return m
def icona_sync():
    c, mask = glass_tile(**LIGHT)
    for a0, a1 in ((205, 335), (25, 155)):
        c = place(c, bevel(arc_arrow(a0, a1), *DEEP, depth=20))
    return c, mask

# 3) MODEL3D: scritta "3D" blu e "MODEL" argento in 3D
def icona_model3d():
    c, mask = glass_tile(**LIGHT)
    def text(t, size, cy):
        f = ImageFont.truetype(FONT, size); m = Image.new("L", (S, S), 0); d = ImageDraw.Draw(m)
        b = d.textbbox((0, 0), t, font=f); d.text(((S - (b[2]-b[0]))/2 - b[0], cy - (b[3]-b[1])/2 - b[1]), t, font=f, fill=255)
        return m
    c = place(c, bevel(text("3D", 430, 420), *DEEP, depth=24))
    c = place(c, bevel(text("MODEL", 205, 700), (250, 252, 255), (120, 132, 150), depth=14, shin=40), shadow=(30, 50, 80))
    return c, mask

# 4) Lead Collector: riquadro blu con tre barre bianche in rilievo
def icona_collector():
    c, mask = glass_tile(**BLUE); k = BODY / 450.0
    bars = Image.new("L", (S, S), 0); d = ImageDraw.Draw(bars)
    for (x0, y0, x1, y1) in ((123, 153, 390, 201), (123, 245, 390, 293), (123, 337, 288, 385)):
        d.rounded_rectangle([M+(x0-31)*k, M+(y0-31)*k, M+(x1-31)*k, M+(y1-31)*k], radius=int(24*k), fill=255)
    return place(c, bevel(bars, *WHITE, depth=16)), mask

# 5) Curva a S bianca su vetro blu
def icona_curva():
    c, mask = glass_tile(**BLUE)
    pts = []
    for i in range(0, 481):
        t = i / 480.0
        x = 250 + 524 * t
        s = t * t * (3 - 2 * t) if 0.25 < t < 0.75 else (0 if t <= 0.25 else 1)
        u = np.clip((t - 0.2) / 0.6, 0, 1); s = u * u * (3 - 2 * u)
        pts.append((x, 700 - 380 * s))
    m = stroke(pts, 92)
    return place(c, bevel(m, *WHITE, depth=18)), mask

for name, fn in (("1-suggerimenti-vendita", icona_suggerimenti), ("2-sync", icona_sync), ("3-model3d", icona_model3d),
                 ("4-lead-collector", icona_collector), ("5-curva", icona_curva)):
    canvas, mask = fn(); finish(canvas, mask, name)

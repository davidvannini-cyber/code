# Tre proposte "meno cartoon, più professionali" per ognuna delle 5 icone -> ../icone-proposte/ (PNG 1024 con trasparenza).
#  A = filo sottile: faccia quasi piatta, bordo smussato appena, riflesso netto
#  B = rilievo contenuto: spessore leggero, luce morbida ma misurata
#  C = vetro: simbolo in vetro semitrasparente con bordo luminoso (come la tessera)
import importlib.util, os, math
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("base", os.path.join(HERE, "genera-icone-scrivania.py"))
B = importlib.util.module_from_spec(spec); spec.loader.exec_module(B)
S = B.S
OUT = os.path.join(HERE, "..", "icone-proposte"); os.makedirs(OUT, exist_ok=True)

def shifted(m, dx, dy):
    return m.transform((S, S), Image.AFFINE, (1, 0, -dx, 0, 1, -dy))

def glass_shape(c, mask, top, bottom, alpha_top=0.80, alpha_bot=0.55, shadow=(6, 64, 84), sh_alpha=0.45):
    m = np.array(mask, float) / 255.0
    ys = np.where(m.max(axis=1) > 0.5)[0]; y0, y1 = ys.min(), ys.max()
    t = np.clip((np.arange(S) - y0) / max(y1 - y0, 1), 0, 1)[:, None, None]
    col = np.array(top, float)[None, None, :] * (1 - t) + np.array(bottom, float)[None, None, :] * t
    al = (alpha_top * (1 - t) + alpha_bot * t)[:, :, 0]
    fill = Image.fromarray(np.dstack([np.repeat(col, S, axis=1), np.repeat(al, S, axis=1) * m * 255]).astype("uint8"), "RGBA")
    # ombra morbida sotto
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sh.paste(Image.new("RGBA", (S, S), shadow + (255,)), (4, 18), mask.point(lambda v: int(v * sh_alpha)))
    c = Image.alpha_composite(c, sh.filter(ImageFilter.GaussianBlur(14)))
    c = Image.alpha_composite(c, fill)
    # riflesso interno in alto (velo) limitato alla forma
    veil = Image.fromarray(B.vgrad((255, 255, 255, 120), (255, 255, 255, 0), h=S).astype("uint8"), "RGBA")
    vm = Image.new("L", (S, S), 0); ImageDraw.Draw(vm).rectangle([0, y0, S, y0 + (y1 - y0) * 0.5], fill=255)
    veil.putalpha(ImageChops.multiply(ImageChops.multiply(veil.getchannel("A"), vm.filter(ImageFilter.GaussianBlur(20))), mask))
    c = Image.alpha_composite(c, veil)
    # bordo luminoso in alto a sinistra e sottile bordo scuro in basso a destra
    hi = ImageChops.subtract(mask, shifted(mask, 4, 5)).filter(ImageFilter.GaussianBlur(1.2))
    lo = ImageChops.subtract(mask, shifted(mask, -3, -4)).filter(ImageFilter.GaussianBlur(1.2))
    h = Image.new("RGBA", (S, S), (255, 255, 255, 0)); h.putalpha(hi.point(lambda v: min(255, int(v * 1.1))))
    l = Image.new("RGBA", (S, S), (bottom[0] // 2, bottom[1] // 2, bottom[2] // 2, 0)); l.putalpha(lo.point(lambda v: int(v * 0.55)))
    return Image.alpha_composite(Image.alpha_composite(c, l), h)

STY = {"A": dict(depth=5, shin=90, gain=210), "B": dict(depth=10, shin=50, gain=110)}
WSH = dict(shadow=(6, 64, 84), sh_alpha=0.65, off=(4, 16), blur=10)
CSH = dict(shadow=(8, 70, 130), sh_alpha=0.45, off=(4, 14), blur=10)

def shape(c, mask, cols, style, white=False, shadow=None):
    if style == "C":
        top, bot = cols
        if white: return glass_shape(c, mask, (255, 255, 255), (225, 240, 248), 0.88, 0.62)
        return glass_shape(c, mask, top, bot, 0.92, 0.78, shadow=shadow or (8, 50, 110))
    st = STY[style]
    return B.place(c, B.bevel(mask, *cols, **st), **(WSH if white else dict(CSH, shadow=shadow or CSH["shadow"])))

def ic_sugg(style):
    c, mask = B.glass_tile(**B.TEAL); k = B.BODY / 1024.0; M = B.M
    P = lambda x, y: (M + x * k, M + y * k)
    bubble = B.rr([M+215*k, M+285*k, M+808*k, M+717*k], int(125*k))
    bubble = ImageChops.lighter(bubble, B.poly_mask([P(345, 640), P(345, 808), P(470, 700)]))
    c = shape(c, bubble, B.WHITE, style, white=True)
    bolt = B.poly_mask([P(473, 255), P(628, 255), P(527, 475), P(659, 475), P(423, 740), P(496, 513), P(363, 513)])
    return shape(c, bolt, B.ORANGE, style, shadow=(120, 50, 0)), mask

def ic_sync(style):
    c, mask = B.glass_tile(**B.TEAL)
    for a0, a1 in ((205, 335), (25, 155)):
        c = shape(c, B.arc_arrow(a0, a1), B.DEEP, style)
    return c, mask

def ic_model(style):
    c, mask = B.glass_tile(**B.TEAL)
    def text(t, size, cy):
        f = ImageFont.truetype(B.FONT, size); m = Image.new("L", (S, S), 0); d = ImageDraw.Draw(m)
        b = d.textbbox((0, 0), t, font=f); d.text(((S - (b[2]-b[0]))/2 - b[0], cy - (b[3]-b[1])/2 - b[1]), t, font=f, fill=255)
        return m
    c = shape(c, text("3D", 430, 420), B.DEEP, style)
    c = shape(c, text("MODEL", 205, 700), ((250, 252, 255), (120, 132, 150)), style, shadow=(30, 50, 80))
    return c, mask

def ic_collector(style):
    c, mask = B.glass_tile(**B.TEAL); k = B.BODY / 450.0; M = B.M
    bars = Image.new("L", (S, S), 0); d = ImageDraw.Draw(bars)
    for (x0, y0, x1, y1) in ((123, 153, 390, 201), (123, 245, 390, 293), (123, 337, 288, 385)):
        d.rounded_rectangle([M+(x0-31)*k, M+(y0-31)*k, M+(x1-31)*k, M+(y1-31)*k], radius=int(24*k), fill=255)
    return shape(c, bars, B.WHITE, style, white=True), mask

def ic_curva(style):
    c, mask = B.glass_tile(**B.TEAL); pts = []
    for i in range(481):
        t = i / 480.0; u = np.clip((t - 0.2) / 0.6, 0, 1); pts.append((250 + 524 * t, 700 - 380 * u * u * (3 - 2 * u)))
    return shape(c, B.stroke(pts, 92), B.WHITE, style, white=True), mask

if __name__ == "__main__":
    sheet = Image.new("RGB", (3 * 330, 5 * 330), (236, 238, 242))
    for r, (name, fn) in enumerate((("1-suggerimenti-vendita", ic_sugg), ("2-sync", ic_sync), ("3-model3d", ic_model),
                                    ("4-lead-collector", ic_collector), ("5-curva", ic_curva))):
        for col, style in enumerate("ABC"):
            c, mask = fn(style)
            c.putalpha(mask)
            drop = Image.new("RGBA", (S, S), (0, 0, 0, 0)); drop.putalpha(mask.point(lambda v: int(v * 0.45)))
            drop = drop.transform((S, S), Image.AFFINE, (1, 0, 0, 0, 1, -22)).filter(ImageFilter.GaussianBlur(26))
            final = Image.alpha_composite(drop, c)
            final.save(os.path.join(OUT, f"{name}-{style}.png"))
            th = final.resize((320, 320), Image.LANCZOS); sheet.paste(th, (col * 330 + 5, r * 330 + 5), th)
            print("ok", name, style)
    sheet.save(os.path.join(OUT, "anteprima-proposte.png"))

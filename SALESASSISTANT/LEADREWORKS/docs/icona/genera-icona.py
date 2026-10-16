# Genera icon.icns (stile "liquid glass") con il logo YesMobility.
# Uso: python3 genera-icona.py   (richiede Pillow e numpy)
import io, os, struct
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "Lead Rework.app", "Contents", "Resources", "icon.icns")
S = 1024
BODY = 836                      # corpo dell'icona (margine per l'ombra, come da griglia macOS)
M = (S - BODY) // 2
R = int(BODY * 0.225)

def squircle_mask(size, inset=0, blur=0):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([M+inset, M+inset, S-M-1-inset, S-M-1-inset], radius=max(R-inset, 1), fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur)) if blur else m

def grad(top, bottom, size=S):
    t = np.linspace(0, 1, size)[:, None, None]
    a = np.array(top, float)[None, None, :]; b = np.array(bottom, float)[None, None, :]
    return np.repeat((a + (b - a) * t), size, axis=1)

mask = squircle_mask(S)

# 1) sfondo: vetro colorato (sfumatura + bagliori sfocati dietro, che il "vetro" rifrange)
base = grad((228, 248, 245, 255), (104, 182, 190, 255))
canvas = Image.fromarray(base.astype("uint8"), "RGBA")
glow = Image.new("RGBA", (S, S), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
g.ellipse([M-60, M+BODY*0.35, M+BODY*0.75, M+BODY*1.15], fill=(120, 205, 205, 170))    # basso-sx
g.ellipse([M+BODY*0.35, M+BODY*0.55, M+BODY*1.15, M+BODY*1.2], fill=(70, 150, 175, 150)) # basso-dx
g.ellipse([M+BODY*0.1, M-BODY*0.25, M+BODY*0.9, M+BODY*0.45], fill=(255, 255, 255, 200)) # alto chiaro
glow = glow.filter(ImageFilter.GaussianBlur(90))
canvas = Image.alpha_composite(canvas, glow)

# 2) velo "smerigliato" chiaro nella metà alta (profondità del vetro)
veil = Image.fromarray(grad((255, 255, 255, 120), (255, 255, 255, 0))[:, :, :].astype("uint8"), "RGBA")
veil_mask = Image.new("L", (S, S), 0); ImageDraw.Draw(veil_mask).rectangle([0, 0, S, int(S*0.5)], fill=255)
veil.putalpha(ImageChops.multiply(veil.getchannel("A"), veil_mask.filter(ImageFilter.GaussianBlur(40))))
canvas = Image.alpha_composite(canvas, veil)

# 3) bordo interno luminoso (rifrazione sul bordo) + ombra interna in basso
edge = ImageChops.subtract(mask, squircle_mask(S, inset=14, blur=10))
edge_col = Image.fromarray(grad((255, 255, 255, 255), (170, 235, 230, 255)).astype("uint8"), "RGBA")
edge_col.putalpha(edge.point(lambda v: int(v * 0.85)))
canvas = Image.alpha_composite(canvas, edge_col)
inner = ImageChops.subtract(squircle_mask(S, inset=0), squircle_mask(S, inset=0, blur=0).transform((S, S), Image.AFFINE, (1, 0, 0, 0, 1, -26)))
inner = inner.filter(ImageFilter.GaussianBlur(14))
shade = Image.new("RGBA", (S, S), (10, 80, 100, 0)); shade.putalpha(inner.point(lambda v: int(v * 0.40)))
canvas = Image.alpha_composite(canvas, shade)

# 4) riflesso speculare curvo in alto (ellisse sfumata ritagliata nel corpo)
spec = Image.new("L", (S, S), 0)
ImageDraw.Draw(spec).ellipse([M+BODY*0.06, M+8, M+BODY*0.94, M+BODY*0.50], fill=255)
spec = ImageChops.multiply(spec, squircle_mask(S, inset=10))
spec_fade = Image.fromarray((np.repeat(np.linspace(110, 0, S)[:, None], S, axis=1)).astype("uint8"), "L")
spec = ImageChops.multiply(spec.filter(ImageFilter.GaussianBlur(26)), spec_fade).point(lambda v: min(255, v))
sp = Image.new("RGBA", (S, S), (255, 255, 255, 0)); sp.putalpha(spec)
canvas = Image.alpha_composite(canvas, sp)

# 5) logo YesMobility con ombra morbida e lucidatura
logo = Image.open(os.path.join(HERE, "logo-yesmobility.png")).convert("RGBA")
lw = int(BODY * 0.60); lh = int(lw * logo.height / logo.width)
logo = logo.resize((lw, lh), Image.LANCZOS)
pos = ((S - lw) // 2, (S - lh) // 2 + 6)
sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
shadow_a = logo.getchannel("A").point(lambda v: int(v * 0.40))
sh.paste(Image.new("RGBA", logo.size, (6, 60, 80, 255)), (pos[0] + 6, pos[1] + 24), shadow_a)
canvas = Image.alpha_composite(canvas, sh.filter(ImageFilter.GaussianBlur(22)))
canvas.alpha_composite(logo, pos)
gloss = Image.new("RGBA", logo.size, (255, 255, 255, 0))
gl_a = Image.fromarray((np.repeat(np.linspace(90, 0, lh)[:, None], lw, axis=1)).astype("uint8"), "L")
gloss.putalpha(ImageChops.multiply(gl_a, logo.getchannel("A")))
canvas.alpha_composite(gloss, pos)

# 6) ritaglio nel corpo + ombra esterna
canvas.putalpha(mask)
final = Image.new("RGBA", (S, S), (0, 0, 0, 0))
drop = Image.new("RGBA", (S, S), (0, 0, 0, 0)); drop.putalpha(mask.point(lambda v: int(v * 0.45)))
drop = drop.transform((S, S), Image.AFFINE, (1, 0, 0, 0, 1, -22)).filter(ImageFilter.GaussianBlur(26))
final = Image.alpha_composite(final, drop)
final = Image.alpha_composite(final, canvas)

# 7) .icns
chunks = b""
for t, sz in (("icp6", 64), ("ic07", 128), ("ic08", 256), ("ic09", 512), ("ic10", 1024)):
    buf = io.BytesIO(); final.resize((sz, sz), Image.LANCZOS).save(buf, "PNG"); d = buf.getvalue()
    chunks += t.encode() + struct.pack(">I", len(d) + 8) + d
open(OUT, "wb").write(b"icns" + struct.pack(">I", len(chunks) + 8) + chunks)
final.save(os.path.join(HERE, "anteprima-icona.png"))
print("ok", len(chunks))

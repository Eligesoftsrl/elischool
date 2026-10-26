from PIL import Image, ImageDraw, ImageFont, ImageFilter

BG = (246, 245, 240)
W, H = 1200, 630

# Logo: key out the cream background with soft edges
logo = Image.open("crop.png").convert("RGB")
px = logo.load()
out = Image.new("RGBA", logo.size)
op = out.load()
for y in range(logo.height):
    for x in range(logo.width):
        r, g, b = px[x, y]
        d = max(abs(r - BG[0]), abs(g - BG[1]), abs(b - BG[2]))
        a = 0 if d < 12 else min(255, int((d - 12) * 255 / 60))
        if a == 0:
            op[x, y] = (0, 0, 0, 0)
        else:
            # un-premultiply against background to keep clean colours on edges
            k = a / 255
            op[x, y] = tuple(max(0, min(255, int((c - BG[i] * (1 - k)) / k))) for i, c in enumerate((r, g, b))) + (a,)
bbox = out.getbbox()
out = out.crop(bbox)
out.save("logo_transparent.png")

canvas = Image.new("RGB", (W, H), (247, 245, 240))

# Soft brand blobs (same feel as the home hero)
blobs = Image.new("RGBA", (W, H), (0, 0, 0, 0))
bd = ImageDraw.Draw(blobs)
bd.ellipse((-160, -200, 340, 260), fill=(242, 166, 90, 90))
bd.ellipse((880, 300, 1420, 820), fill=(47, 125, 109, 60))
bd.ellipse((420, 470, 820, 820), fill=(251, 235, 168, 120))
blobs = blobs.filter(ImageFilter.GaussianBlur(90))
canvas.paste(blobs, (0, 0), blobs)

def font(path, size, wght):
    f = ImageFont.truetype(path, size)
    try:
        f.set_variation_by_axes([wght])
    except Exception:
        pass
    return f

# Logo
lw = 520
lh = int(out.height * lw / out.width)
lg = out.resize((lw, lh), Image.LANCZOS)
x0 = 96
canvas.paste(lg, (x0 - 8, 92), lg)

d = ImageDraw.Draw(canvas)
title = font("Outfit.ttf", 70, 800)
sub = font("Manrope.ttf", 30, 600)
small = font("Manrope.ttf", 24, 700)

y = 92 + lh + 46
d.text((x0, y), "Un passo dopo l'altro,", font=title, fill=(43, 47, 51))
y += 82
d.text((x0, y), "cresciamo insieme.", font=title, fill=(47, 125, 109))
y += 104
d.text((x0, y), "App per asilo nido e scuola dell'infanzia", font=sub, fill=(87, 83, 78))

# URL pill
label = "www.tiptii.com"
tw = d.textlength(label, font=small)
px0, py0 = W - 96 - int(tw) - 44, 92 + lh // 2 - 26
d.rounded_rectangle((px0, py0, px0 + int(tw) + 44, py0 + 52), radius=26, fill=(47, 125, 109))
d.text((px0 + 22, py0 + 12), label, font=small, fill=(255, 255, 255))

canvas.save("/app/frontend/public/og-image.png", optimize=True)
print("ok", lg.size)

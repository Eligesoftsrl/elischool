import numpy as np
from collections import deque
from PIL import Image, ImageFilter

OUT = "/app/frontend/public/illustrations"
import os
os.makedirs(OUT, exist_ok=True)

for name, width in [("hero", 1200), ("school", 640), ("teacher", 640), ("family", 640)]:
    im = Image.open(f"{name}.jpg").convert("RGB")
    a = np.asarray(im).astype(int)
    h, w, _ = a.shape
    mx, mn = a.max(2), a.min(2)
    bg_like = ((mx - mn) <= 16) & (mn >= 188)
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bg_like[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bg_like[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and bg_like[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    # Enclosed checkerboard pockets: components mixing gray (~200-222) and white (>=245) pixels
    gray = bg_like & (mn <= 240)
    white = bg_like & (mn >= 249)
    lab = np.zeros((h, w), bool)
    for sy in range(h):
        for sx in range(w):
            if bg_like[sy, sx] and not seen[sy, sx] and not lab[sy, sx]:
                comp = [(sy, sx)]; lab[sy, sx] = True; i = 0
                while i < len(comp):
                    y, x = comp[i]; i += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and not lab[ny, nx] and bg_like[ny, nx] and not seen[ny, nx]:
                            lab[ny, nx] = True; comp.append((ny, nx))
                if len(comp) > 60:
                    ys, xs = zip(*comp)
                    g = gray[ys, xs].mean(); wt = white[ys, xs].mean()
                    if g > 0.15 and wt > 0.15:
                        seen[ys, xs] = True
    alpha = Image.fromarray(np.where(seen, 0, 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    rgba = im.copy(); rgba.putalpha(alpha)
    rgba = rgba.crop(rgba.getbbox())
    r = width / rgba.width
    rgba = rgba.resize((width, int(rgba.height * r)), Image.LANCZOS)
    rgba.save(f"{OUT}/{name}.webp", "WEBP", quality=82, method=6)
    print(name, rgba.size, os.path.getsize(f"{OUT}/{name}.webp") // 1024, "KB")

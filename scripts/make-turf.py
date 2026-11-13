"""Writes the pixel turf tiles used behind the studio stage (pure stdlib PNG)."""
import random, struct, sys, zlib

def png(path, w, h, rows):
    raw = b"".join(b"\x00" + bytes(c for px in row for c in px) for row in rows)
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)))
        f.write(chunk(b"IDAT", zlib.compress(raw, 9)))
        f.write(chunk(b"IEND", b""))

def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

def tile(path, a, b, blade_a, blade_b, seed):
    random.seed(seed)
    W = H = 32
    rows = []
    for y in range(H):
        row = []
        for x in range(W):
            stripe = (x // 16) % 2
            base = hexrgb(a if stripe == 0 else b)
            r = random.random()
            # Blades: a light tip over a darker root, so the turf reads as pixels.
            if r < 0.06 and y > 0:
                base = hexrgb(blade_a)
                rows[y - 1][x] = hexrgb(blade_a)
            elif r < 0.13:
                base = hexrgb(blade_b)
            row.append(base)
        rows.append(row)
    png(path, W, H, rows)

tile("public/lofi/turf.png", "#1c5434", "#226139", "#327d4c", "#154528", 4)
tile("public/lofi/turf-night.png", "#164429", "#1b4e30", "#286640", "#0f331e", 4)
# The studio stage: dark concrete, so any club's colours stand out against it.
tile("public/lofi/stage.png", "#151b22", "#151b22", "#1d2530", "#10151b", 9)
tile("public/lofi/stage-light.png", "#252e38", "#252e38", "#2e3843", "#1f272f", 9)
print("ok")

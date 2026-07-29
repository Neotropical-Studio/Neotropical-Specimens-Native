#!/usr/bin/env python3
"""
Knockout Morpho: parte del azul/marrón del sujeto y dilata para incluir
márgenes oscuros; el resto (negro de estudio) pasa a alfa 0.
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/specimens/morpho-godarty-source.png"
OUT_PNG = ROOT / "public/specimens/morpho-godarty-didius-tingomarensis.png"
OUT_WEBP = ROOT / "public/specimens/morpho-godarty-didius-tingomarensis.webp"


def dilate(mask: np.ndarray, iters: int = 1) -> np.ndarray:
    out = mask.copy()
    for _ in range(iters):
        p = np.pad(out, 1, constant_values=False)
        out = (
            p[0:-2, 0:-2] | p[0:-2, 1:-1] | p[0:-2, 2:]
            | p[1:-1, 0:-2] | p[1:-1, 1:-1] | p[1:-1, 2:]
            | p[2:, 0:-2] | p[2:, 1:-1] | p[2:, 2:]
        )
    return out


def erode(mask: np.ndarray, iters: int = 1) -> np.ndarray:
    out = mask.copy()
    for _ in range(iters):
        p = np.pad(out, 1, constant_values=True)
        out = (
            p[0:-2, 0:-2] & p[0:-2, 1:-1] & p[0:-2, 2:]
            & p[1:-1, 0:-2] & p[1:-1, 1:-1] & p[1:-1, 2:]
            & p[2:, 0:-2] & p[2:, 1:-1] & p[2:, 2:]
        )
    return out


def box_blur(m: np.ndarray, k: int) -> np.ndarray:
    h, w = m.shape
    pad = k // 2
    p = np.pad(m.astype(np.float32), pad, mode="edge")
    out = np.zeros_like(m, dtype=np.float32)
    for dy in range(k):
        for dx in range(k):
            out += p[dy : dy + h, dx : dx + w]
    return out / float(k * k)


def largest_component(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    visited = np.zeros((h, w), dtype=bool)
    best = np.zeros((h, w), dtype=bool)
    best_size = 0
    for y in range(h):
        for x in np.where(mask[y] & ~visited[y])[0]:
            if visited[y, int(x)]:
                continue
            q = deque([(int(x), y)])
            visited[y, int(x)] = True
            cells: list[tuple[int, int]] = []
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                for nx, ny in (
                    (cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1),
                    (cx - 1, cy - 1), (cx + 1, cy - 1), (cx - 1, cy + 1), (cx + 1, cy + 1),
                ):
                    if 0 <= nx < w and 0 <= ny < h and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        q.append((nx, ny))
            if len(cells) > best_size:
                best_size = len(cells)
                best = np.zeros((h, w), dtype=bool)
                for cx, cy in cells:
                    best[cy, cx] = True
    return best


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    arr = np.asarray(img).astype(np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    h, w = r.shape

    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn

    # Señal clara de ala Morpho (azul iridiscente)
    wing_blue = (b > 35) & (b > r + 8) & (b > g + 5)
    # Marrón cálido del cuerpo / base alar / margen
    warm_brown = (r > 28) & (r >= g - 2) & (lum < 140) & (chroma > 10) & (b < r + 15)
    # Venas / detalles dentro del azul
    mid_detail = (lum > 22) & (lum < 90) & (chroma > 6)

    seed = wing_blue | warm_brown | mid_detail
    studio = (lum <= 16) & (chroma <= 8) & (mx <= 20)

    # Crecimiento anillo a anillo: absorbe margen oscuro de ala, NO el negro de estudio
    subject = seed.copy()
    layer = seed.copy()
    for _ in range(7):
        ring = dilate(layer, 1) & ~layer
        # Incluir: no-studio, o margen oscuro con algo de croma / vecino de seed
        margin = ring & ~studio
        dark_margin = ring & (lum < 70) & (chroma > 4) & ~studio
        # Permitir píxeles muy oscuros SÓLO si tocan ya el sujeto (borde real del ala)
        edge_dark = ring & studio & dilate(subject, 1) & (chroma > 2)
        add = margin | dark_margin | edge_dark
        subject |= add
        layer = subject

    subject = largest_component(subject)
    subject = erode(dilate(subject, 1), 1)

    # Fondo = exterior conectado al borde entre negros de estudio
    bg_seed = studio & ~subject
    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bg_seed[y, x]:
                q.append((x, y))
                visited[y, x] = True
    for y in range(h):
        for x in (0, w - 1):
            if bg_seed[y, x] and not visited[y, x]:
                q.append((x, y))
                visited[y, x] = True
    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx] and bg_seed[ny, nx]:
                visited[ny, nx] = True
                q.append((nx, ny))
    bg = visited | (~subject & studio)
    subject = ~bg
    subject = largest_component(subject)

    hard = subject.astype(np.float32)
    soft = box_blur(hard, 3)
    final_a = np.clip(0.35 * soft + 0.65 * hard, 0.0, 1.0)
    core = erode(subject, 3)
    final_a[core] = 1.0
    final_a[~dilate(subject, 1)] = 0.0

    # Un-premultiply leve en fringe (sin abrir agujeros en marrón)
    eps = 1e-3
    a_safe = np.maximum(final_a, eps)
    r2 = np.clip(r / a_safe, 0, 255)
    g2 = np.clip(g / a_safe, 0, 255)
    b2 = np.clip(b / a_safe, 0, 255)

    fringe = (final_a > 0.04) & (final_a < 0.85) & ~core
    pure_black_fringe = fringe & (0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2 < 12) & (
        (np.maximum(np.maximum(r2, g2), b2) - np.minimum(np.minimum(r2, g2), b2)) < 8
    )
    final_a = np.where(pure_black_fringe, 0.0, final_a)

    r2 = np.where(final_a < 0.02, 0, r2)
    g2 = np.where(final_a < 0.02, 0, g2)
    b2 = np.where(final_a < 0.02, 0, b2)

    out = np.stack([r2, g2, b2, final_a * 255.0], axis=-1).astype(np.uint8)
    result = Image.fromarray(out, "RGBA")
    aa = result.getchannel("A").filter(ImageFilter.MedianFilter(3))
    result.putalpha(aa)

    bbox = result.getbbox()
    if bbox:
        pad = 12
        x0, y0, x1, y1 = bbox
        result = result.crop(
            (max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad))
        )

    result.save(OUT_PNG, "PNG", optimize=True)
    result.save(OUT_WEBP, "WEBP", quality=94, method=6)
    print(f"OK {result.size} png={OUT_PNG.stat().st_size} webp={OUT_WEBP.stat().st_size}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) >= 3:
        SRC = Path(sys.argv[1]).expanduser().resolve()
        OUT_PNG = Path(sys.argv[2]).expanduser().resolve()
        OUT_WEBP = OUT_PNG.with_suffix(".webp")
    main()

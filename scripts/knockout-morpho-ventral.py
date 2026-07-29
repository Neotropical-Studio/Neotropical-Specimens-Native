#!/usr/bin/env python3
"""
Knockout quirúrgico del REVERSO Morpho (ventral marrón + ocelos + bandas plateadas).
Elimina negro de estudio sin comer antenas ni márgenes festoneados.
Salida: PNG + WebP con alfa limpio (camaleónico sobre cualquier fondo).
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/specimens/morpho-godarty-ventral-source.png"
OUT_PNG = ROOT / "public/specimens/morpho-godarty-didius-tingomarensis-ventral.png"
OUT_WEBP = ROOT / "public/specimens/morpho-godarty-didius-tingomarensis-ventral.webp"


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


def flood_from_border(seed: np.ndarray) -> np.ndarray:
    h, w = seed.shape
    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if seed[y, x]:
                q.append((x, y))
                visited[y, x] = True
    for y in range(h):
        for x in (0, w - 1):
            if seed[y, x] and not visited[y, x]:
                q.append((x, y))
                visited[y, x] = True
    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx] and seed[ny, nx]:
                visited[ny, nx] = True
                q.append((nx, ny))
    return visited


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    arr = np.asarray(img).astype(np.float32)
    r, g, b, a0 = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    h, w = r.shape

    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn

    # Negro de estudio (fondo a eliminar)
    studio = (lum <= 18) & (chroma <= 10) & (mx <= 24)

    # Semillas del sujeto ventral: marrón cálido, ocelos, bandas plateadas, cuerpo
    warm_brown = (r > 24) & (r >= g - 6) & (r >= b - 4) & (lum < 175) & (chroma > 8)
    cream_silver = (lum > 90) & (chroma < 55) & (mx > 95) & ~studio
    eyespot_core = (lum < 55) & (chroma > 12) & (r > 18) & ~studio
    body_dark = (lum > 12) & (lum < 70) & (chroma > 5) & (r >= g - 4) & ~studio
    # Antenas / pelos: filamentos claros-oscuros sobre negro
    filament = (lum > 20) & (lum < 120) & (chroma < 40) & ~studio

    seed = warm_brown | cream_silver | eyespot_core | body_dark | filament
    seed = dilate(seed, 1)  # unir micro-gaps de escamas

    subject = seed.copy()
    layer = seed.copy()
    for _ in range(10):
        ring = dilate(layer, 1) & ~layer
        # Absorber margen festoneado (oscuro pero no puro estudio)
        scallop = ring & (lum < 90) & (chroma > 3) & ~studio
        # Escamas casi negras del borde que tocan el sujeto
        edge_ink = ring & dilate(subject, 2) & (lum < 35) & (chroma <= 12)
        # Plata / crema en el anillo
        pale = ring & cream_silver
        add = scallop | edge_ink | pale | (ring & seed)
        # No tragarse el fondo: edge_ink sólo si no está en flood de borde puro
        subject |= add
        layer = subject

    subject = largest_component(subject)
    subject = erode(dilate(subject, 2), 1)

    # Fondo = negro de estudio conectado al borde de la imagen
    bg_seed = studio & ~subject
    bg = flood_from_border(bg_seed) | (~subject & studio)

    # Agujeros internos de estudio (entre alas) también a fondo si llegan al borde flood
    # Lo que no es sujeto y es studio → transparente
    subject = ~bg
    subject = largest_component(subject)

    # Alpha quirúrgico: núcleo sólido + fringe suave 1px
    hard = subject.astype(np.float32)
    soft = box_blur(hard, 2)
    final_a = np.clip(0.25 * soft + 0.75 * hard, 0.0, 1.0)
    core = erode(subject, 2)
    final_a[core] = 1.0
    final_a[~dilate(subject, 1)] = 0.0

    # Descontaminar fringe: quitar negro residual (halo)
    eps = 1e-3
    a_safe = np.maximum(final_a, eps)
    r2 = np.clip(r / a_safe, 0, 255)
    g2 = np.clip(g / a_safe, 0, 255)
    b2 = np.clip(b / a_safe, 0, 255)

    fringe = (final_a > 0.03) & (final_a < 0.92) & ~core
    fringe_lum = 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2
    fringe_chroma = np.maximum(np.maximum(r2, g2), b2) - np.minimum(np.minimum(r2, g2), b2)
    # Halo negro / gris de estudio en el borde → alfa 0
    pure_black_fringe = fringe & (fringe_lum < 16) & (fringe_chroma < 10)
    # Halo grisáceo débil
    grey_halo = fringe & (fringe_lum < 28) & (fringe_chroma < 8)
    final_a = np.where(pure_black_fringe | grey_halo, 0.0, final_a)

    # Suavizar antenas: no cortar filamentos con mediana agresiva global
    r2 = np.where(final_a < 0.02, 0, r2)
    g2 = np.where(final_a < 0.02, 0, g2)
    b2 = np.where(final_a < 0.02, 0, b2)

    # Respetar alfa original si venía con transparencia útil
    if np.mean(a0) < 250:
        final_a = np.minimum(final_a, a0 / 255.0)

    out = np.stack([r2, g2, b2, final_a * 255.0], axis=-1).astype(np.uint8)
    result = Image.fromarray(out, "RGBA")

    # Mediana SOLO en canal A, kernel 3 (limpia moteado sin comer antenas)
    aa = result.getchannel("A").filter(ImageFilter.MedianFilter(3))
    # Un blur mínimo del alfa en fringe para anti-alias
    aa_arr = np.asarray(aa).astype(np.float32)
    aa_soft = box_blur(aa_arr / 255.0, 3) * 255.0
    core_mask = np.asarray(result.getchannel("A")) > 240
    aa_mix = np.where(core_mask, aa_arr, 0.55 * aa_arr + 0.45 * aa_soft)
    result.putalpha(Image.fromarray(np.clip(aa_mix, 0, 255).astype(np.uint8), mode="L"))

    bbox = result.getbbox()
    if bbox:
        pad = 10
        x0, y0, x1, y1 = bbox
        result = result.crop(
            (max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad))
        )

    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    result.save(OUT_PNG, "PNG", optimize=True)
    result.save(OUT_WEBP, "WEBP", quality=92, method=6)
    print(f"OK ventral surgical {result.size} png={OUT_PNG.stat().st_size} webp={OUT_WEBP.stat().st_size}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) >= 3:
        SRC = Path(sys.argv[1]).expanduser().resolve()
        OUT_PNG = Path(sys.argv[2]).expanduser().resolve()
        OUT_WEBP = OUT_PNG.with_suffix(".webp")
    main()

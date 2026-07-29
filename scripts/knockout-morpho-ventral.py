#!/usr/bin/env python3
"""
Knockout del REVERSO Morpho autentico (foto macro con antenas reales).

- Separa el sujeto del negro de estudio SIN dibujar antenas.
- Preserva filamentos reales via dark-boost + componentes delgados.
- Borde adaptativo suave (sin halo) para fondo oscuro de la web.
- Exporta PNG + WebP alta calidad.
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

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
            xi = int(x)
            if visited[y, xi]:
                continue
            q = deque([(xi, y)])
            visited[y, xi] = True
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


def detect_authentic_antennae(
    lum: np.ndarray,
    subject: np.ndarray,
    head: tuple[int, int],
) -> np.ndarray:
    """Filamentos reales: brillan al realzar oscuros; componentes muy delgados."""
    h, w = lum.shape
    bx, by = head
    boost = np.clip((lum - 0.2) * 32.0, 0, 255)
    roi = np.zeros((h, w), dtype=bool)
    roi[max(0, by - 250) : by + 5, max(0, bx - 140) : min(w, bx + 140)] = True
    cand = roi & (boost > 40) & (lum > 0.5) & (lum < 35)

    visited = np.zeros_like(cand)
    ant = np.zeros_like(cand)
    for y in range(h):
        for x in np.where(cand[y] & ~visited[y])[0]:
            xi = int(x)
            if visited[y, xi]:
                continue
            q = deque([(xi, y)])
            visited[y, xi] = True
            cells: list[tuple[int, int]] = []
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                for nx, ny in (
                    (cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1),
                    (cx - 1, cy - 1), (cx + 1, cy - 1), (cx - 1, cy + 1), (cx + 1, cy + 1),
                ):
                    if 0 <= nx < w and 0 <= ny < h and cand[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        q.append((nx, ny))
            xs_c = [c[0] for c in cells]
            ys_c = [c[1] for c in cells]
            height = max(ys_c) - min(ys_c) + 1
            width = max(xs_c) - min(xs_c) + 1
            # Antenas reales: muy delgadas y alargadas, ancladas cerca de la cabeza
            if (
                width <= 18
                and height >= 28
                and height >= width * 2.2
                and len(cells) >= 40
                and max(ys_c) >= by - 35
            ):
                for cx, cy in cells:
                    ant[cy, cx] = True
                print(
                    f"ANTENNA n={len(cells)} h={height} w={width} "
                    f"x={int(np.mean(xs_c))} ymin={min(ys_c)}"
                )
    return dilate(ant, 1)


def main() -> None:
    img = Image.open(SRC).convert("RGB")
    arr = np.asarray(img).astype(np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    h, w = r.shape

    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn

    studio = (lum <= 8) & (chroma <= 6) & (mx <= 10)
    warm = (r > 20) & (r >= g - 6) & (r >= b - 4) & (lum < 190) & (chroma > 5)
    cream = (lum > 80) & (chroma < 55) & (mx > 85) & ~studio
    eyes = (lum < 55) & (chroma > 8) & (r > 14) & ~studio
    body = (lum > 8) & (lum < 80) & (chroma > 3) & (r >= g - 4) & ~studio
    seed = dilate(warm | cream | eyes | body, 1)

    subject = seed.copy()
    layer = seed.copy()
    for _ in range(14):
        ring = dilate(layer, 1) & ~layer
        subject |= (
            (ring & (lum < 100) & (chroma > 2) & ~studio)
            | (ring & dilate(subject, 2) & (lum < 40) & (chroma <= 14))
            | (ring & cream)
            | (ring & seed)
        )
        layer = subject

    subject = largest_component(subject)
    subject = erode(dilate(subject, 2), 1)
    bg = flood_from_border(studio & ~subject) | (~subject & studio)
    subject = largest_component(~bg)

    # Cabeza = tope de columna corporal central
    body_m = ((r > 25) & (r < 130) & (lum > 18) & (lum < 95) & subject)
    cx0, cx1 = int(w * 0.44), int(w * 0.56)
    proj = body_m[:, cx0:cx1].sum(axis=1)
    ys = np.where(proj > 8)[0]
    by = int(ys.min()) if len(ys) else h // 3
    bx = cx0 + int(np.argmax(body_m[by : by + 40, cx0:cx1].sum(axis=0))) if len(ys) else w // 2
    print(f"thorax_head=({bx}, {by})")

    antenna_mask = detect_authentic_antennae(lum, subject, (bx, by))
    antenna_pixels = int(antenna_mask.sum())
    print(f"antenna_pixels_preserved={antenna_pixels}")
    if antenna_pixels < 80:
        raise SystemExit("ERROR: antenas autenticas no detectadas — abort (no synthesis)")

    subject = subject | antenna_mask

    hard = subject.astype(np.float32)
    soft = box_blur(hard, 2)
    final_a = np.clip(0.14 * soft + 0.86 * hard, 0.0, 1.0)
    core = erode(subject & ~antenna_mask, 2)
    final_a[core] = 1.0
    final_a[antenna_mask] = np.maximum(final_a[antenna_mask], 0.98)
    final_a[~dilate(subject, 1)] = 0.0

    eps = 1e-3
    a_safe = np.maximum(final_a, eps)
    r2 = np.clip(r / a_safe, 0, 255)
    g2 = np.clip(g / a_safe, 0, 255)
    b2 = np.clip(b / a_safe, 0, 255)

    fringe = (final_a > 0.03) & (final_a < 0.86) & ~core & ~antenna_mask
    fringe_lum = 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2
    fringe_chroma = np.maximum(np.maximum(r2, g2), b2) - np.minimum(np.minimum(r2, g2), b2)
    final_a = np.where(fringe & (fringe_lum < 11) & (fringe_chroma < 9), 0.0, final_a)
    final_a = np.where(fringe & (fringe_lum < 18) & (fringe_chroma < 7), 0.0, final_a)

    # Legibilidad sobre negro web: refuerza color SOLO en geometria real
    boost_m = antenna_mask & (final_a > 0.2)
    r2 = np.where(boost_m, np.clip(np.maximum(r2, 16) * 0.42 + 78, 0, 255), r2)
    g2 = np.where(boost_m, np.clip(np.maximum(g2, 12) * 0.42 + 62, 0, 255), g2)
    b2 = np.where(boost_m, np.clip(np.maximum(b2, 8) * 0.42 + 48, 0, 255), b2)

    r2 = np.where(final_a < 0.02, 0, r2)
    g2 = np.where(final_a < 0.02, 0, g2)
    b2 = np.where(final_a < 0.02, 0, b2)

    out = np.stack([r2, g2, b2, final_a * 255.0], axis=-1).astype(np.uint8)
    result = Image.fromarray(out, "RGBA")

    aa = np.asarray(result.getchannel("A")).astype(np.float32)
    aa_soft = box_blur(aa / 255.0, 3) * 255.0
    aa_mix = np.where(
        dilate(antenna_mask, 1),
        aa,
        np.where(aa > 240, aa, 0.7 * aa + 0.3 * aa_soft),
    )
    result.putalpha(Image.fromarray(np.clip(aa_mix, 0, 255).astype(np.uint8), mode="L"))

    bbox = result.getbbox()
    if bbox:
        pad = 22
        x0, y0, x1, y1 = bbox
        result = result.crop(
            (
                max(0, x0 - pad),
                max(0, y0 - pad),
                min(result.size[0], x1 + pad),
                min(result.size[1], y1 + pad),
            )
        )

    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    result.save(OUT_PNG, "PNG", optimize=True)
    result.save(OUT_WEBP, "WEBP", quality=96, method=6)
    print(f"OK authentic {result.size} png={OUT_PNG.stat().st_size} webp={OUT_WEBP.stat().st_size}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) >= 3:
        SRC = Path(sys.argv[1]).expanduser().resolve()
        OUT_PNG = Path(sys.argv[2]).expanduser().resolve()
        OUT_WEBP = OUT_PNG.with_suffix(".webp")
    main()

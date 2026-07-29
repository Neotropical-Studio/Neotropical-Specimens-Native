#!/usr/bin/env python3
"""
Knockout quirúrgico del REVERSO Morpho + recuperación de antenas.

1) Separa el sujeto del negro de estudio (borde adaptativo, sin halo).
2) Detecta / reconstruye antenas desde la cabeza (vitales en la ficha ventral).
3) Exporta PNG + WebP con alfa limpio.
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

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
        xs = np.where(mask[y] & ~visited[y])[0]
        for x in xs:
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


def find_head(subject: np.ndarray) -> tuple[int, int]:
    """Cabeza ≈ punto más alto (menor y) del cuerpo central del sujeto."""
    ys, xs = np.where(subject)
    if len(xs) == 0:
        h, w = subject.shape
        return w // 2, h // 3
    # Banda central horizontal
    x0, x1 = int(xs.min()), int(xs.max())
    mid_lo = x0 + (x1 - x0) // 3
    mid_hi = x0 + 2 * (x1 - x0) // 3
    central = subject.copy()
    central[:, :mid_lo] = False
    central[:, mid_hi:] = False
    cys, cxs = np.where(central)
    if len(cxs) == 0:
        cys, cxs = ys, xs
    top_y = int(cys.min())
    # x medio de la franja superior del cuerpo
    band = (cys >= top_y) & (cys <= top_y + max(8, (cys.max() - top_y) // 20))
    hx = int(np.median(cxs[band])) if band.any() else int(np.median(cxs))
    return hx, top_y


def detect_antenna_mask(
    r: np.ndarray,
    g: np.ndarray,
    b: np.ndarray,
    subject: np.ndarray,
    head: tuple[int, int],
) -> np.ndarray:
    """Filamentos tenues sobre negro cerca de la cabeza (hacia arriba)."""
    h, w = r.shape
    hx, hy = head
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)

    # ROI antenas: sobre la cabeza, ancho moderado
    y0 = max(0, hy - int(h * 0.28))
    y1 = min(h, hy + 8)
    x0 = max(0, hx - int(w * 0.18))
    x1 = min(w, hx + int(w * 0.18))

    roi = np.zeros((h, w), dtype=bool)
    roi[y0:y1, x0:x1] = True

    # Antenas: ligeramente más claras que el negro puro, baja croma, delgadas
    candidates = roi & ~subject & (lum > 8) & (lum < 95) & (chroma < 35)
    # También píxeles muy tenues (lum 4–12) si están alineados
    faint = roi & ~subject & (lum > 4) & (lum < 22) & (chroma < 18)
    ant = dilate(candidates | faint, 1)

    # Quedarse con componentes conectados que toquen cerca de la cabeza
    near_head = np.zeros((h, w), dtype=bool)
    near_head[max(0, hy - 6) : min(h, hy + 14), max(0, hx - 40) : min(w, hx + 40)] = True

    kept = np.zeros((h, w), dtype=bool)
    visited = np.zeros((h, w), dtype=bool)
    for y in range(y0, y1):
        for x in np.where(ant[y] & ~visited[y])[0]:
            xi = int(x)
            if visited[y, xi]:
                continue
            q = deque([(xi, y)])
            visited[y, xi] = True
            cells: list[tuple[int, int]] = []
            touches_head = False
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                if near_head[cy, cx] or subject[cy, cx]:
                    touches_head = True
                for nx, ny in (
                    (cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1),
                    (cx - 1, cy - 1), (cx + 1, cy - 1), (cx - 1, cy + 1), (cx + 1, cy + 1),
                ):
                    if 0 <= nx < w and 0 <= ny < h and ant[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        q.append((nx, ny))
            # Antenas: componentes alargados verticalmente, no manchas
            if not cells:
                continue
            xs_c = [c[0] for c in cells]
            ys_c = [c[1] for c in cells]
            height = max(ys_c) - min(ys_c) + 1
            width = max(xs_c) - min(xs_c) + 1
            if touches_head and height >= 12 and height >= width * 0.7 and len(cells) < 2500:
                for cx, cy in cells:
                    kept[cy, cx] = True

    return dilate(kept, 1)


def synthesize_antennae(
    canvas: Image.Image,
    head: tuple[int, int],
    body_color: tuple[int, int, int],
    length: int,
) -> Image.Image:
    """Dibuja antenas naturales (curvas + club) si la detección fue insuficiente."""
    hx, hy = head
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Grosor natural ~1.5–2.5 px según escala
    scale = max(canvas.size) / 1200.0
    stroke = max(1.6, 2.1 * scale)
    tip_r = max(1.8, 2.4 * scale)

    def antenna(sign: int) -> list[tuple[float, float]]:
        pts: list[tuple[float, float]] = []
        # Base junto a la cabeza
        x, y = float(hx + sign * 3 * scale), float(hy + 2 * scale)
        for i in range(length):
            t = i / max(1, length - 1)
            # Curva suave hacia afuera y arriba
            x += sign * (0.55 + 0.35 * t) * scale
            y -= (1.15 - 0.25 * t) * scale
            # Ligera ondulación
            x += sign * 0.15 * np.sin(t * np.pi * 1.2) * scale
            pts.append((x, y))
        return pts

    r0, g0, b0 = body_color
    # Un poco más claro que el cuerpo para leerse sobre negro web
    color = (
        min(255, int(r0 * 0.75 + 55)),
        min(255, int(g0 * 0.75 + 45)),
        min(255, int(b0 * 0.75 + 40)),
        245,
    )
    tip_color = (min(255, color[0] + 25), min(255, color[1] + 20), min(255, color[2] + 15), 255)

    for sign in (-1, 1):
        pts = antenna(sign)
        if len(pts) < 2:
            continue
        draw.line(pts, fill=color, width=max(1, int(round(stroke))), joint="curve")
        # Club apical
        tx, ty = pts[-1]
        draw.ellipse(
            (tx - tip_r, ty - tip_r, tx + tip_r, ty + tip_r),
            fill=tip_color,
        )

    # Suavizar un pelo las antenas sintetizadas
    blur = overlay.filter(ImageFilter.GaussianBlur(radius=0.45))
    return Image.alpha_composite(canvas, blur)


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    arr = np.asarray(img).astype(np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    h, w = r.shape

    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn

    studio = (lum <= 18) & (chroma <= 10) & (mx <= 24)

    warm_brown = (r > 24) & (r >= g - 6) & (r >= b - 4) & (lum < 175) & (chroma > 8)
    cream_silver = (lum > 90) & (chroma < 55) & (mx > 95) & ~studio
    eyespot_core = (lum < 55) & (chroma > 12) & (r > 18) & ~studio
    body_dark = (lum > 12) & (lum < 70) & (chroma > 5) & (r >= g - 4) & ~studio

    seed = warm_brown | cream_silver | eyespot_core | body_dark
    seed = dilate(seed, 1)

    subject = seed.copy()
    layer = seed.copy()
    for _ in range(10):
        ring = dilate(layer, 1) & ~layer
        scallop = ring & (lum < 90) & (chroma > 3) & ~studio
        edge_ink = ring & dilate(subject, 2) & (lum < 35) & (chroma <= 12)
        pale = ring & cream_silver
        subject |= scallop | edge_ink | pale | (ring & seed)
        layer = subject

    subject = largest_component(subject)
    subject = erode(dilate(subject, 2), 1)

    bg_seed = studio & ~subject
    bg = flood_from_border(bg_seed) | (~subject & studio)
    subject = largest_component(~bg)

    head = find_head(subject)
    antenna_mask = detect_antenna_mask(r, g, b, subject, head)
    antenna_pixels = int(antenna_mask.sum())
    print(f"head={head} antenna_pixels_detected={antenna_pixels}")

    # Incluir antenas detectadas en el sujeto ANTES del alpha
    subject = subject | antenna_mask

    hard = subject.astype(np.float32)
    soft = box_blur(hard, 2)
    final_a = np.clip(0.22 * soft + 0.78 * hard, 0.0, 1.0)
    core = erode(subject & ~antenna_mask, 2)
    final_a[core] = 1.0
    # Antenas: alfa alto pero fringe suave
    final_a[antenna_mask] = np.maximum(final_a[antenna_mask], 0.92)
    final_a[~dilate(subject, 1)] = 0.0

    eps = 1e-3
    a_safe = np.maximum(final_a, eps)
    r2 = np.clip(r / a_safe, 0, 255)
    g2 = np.clip(g / a_safe, 0, 255)
    b2 = np.clip(b / a_safe, 0, 255)

    fringe = (final_a > 0.03) & (final_a < 0.90) & ~core & ~antenna_mask
    fringe_lum = 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2
    fringe_chroma = np.maximum(np.maximum(r2, g2), b2) - np.minimum(np.minimum(r2, g2), b2)
    final_a = np.where(fringe & (fringe_lum < 16) & (fringe_chroma < 10), 0.0, final_a)
    final_a = np.where(fringe & (fringe_lum < 26) & (fringe_chroma < 8), 0.0, final_a)

    # Refuerzo de color en antenas detectadas (más legibles sobre negro web)
    if antenna_pixels > 0:
        boost = antenna_mask & (final_a > 0.2)
        r2 = np.where(boost, np.clip(r2 * 0.55 + 70, 0, 255), r2)
        g2 = np.where(boost, np.clip(g2 * 0.55 + 58, 0, 255), g2)
        b2 = np.where(boost, np.clip(b2 * 0.55 + 48, 0, 255), b2)

    r2 = np.where(final_a < 0.02, 0, r2)
    g2 = np.where(final_a < 0.02, 0, g2)
    b2 = np.where(final_a < 0.02, 0, b2)

    out = np.stack([r2, g2, b2, final_a * 255.0], axis=-1).astype(np.uint8)
    result = Image.fromarray(out, "RGBA")

    aa = np.asarray(result.getchannel("A")).astype(np.float32)
    aa_soft = box_blur(aa / 255.0, 3) * 255.0
    core_mask = aa > 240
    # No suavizar antenas con blur excesivo
    ant_a = dilate(antenna_mask, 1)
    aa_mix = np.where(ant_a, aa, np.where(core_mask, aa, 0.6 * aa + 0.4 * aa_soft))
    result.putalpha(Image.fromarray(np.clip(aa_mix, 0, 255).astype(np.uint8), mode="L"))

    # Si las antenas son demasiado escasas, sintetizar digitalmente
    if antenna_pixels < 80:
        body_ys, body_xs = np.where(subject & ~antenna_mask)
        if len(body_xs):
            # Color medio del cuerpo superior
            top_band = body_ys <= np.percentile(body_ys, 15)
            sample = (
                int(np.median(r[body_ys[top_band], body_xs[top_band]])),
                int(np.median(g[body_ys[top_band], body_xs[top_band]])),
                int(np.median(b[body_ys[top_band], body_xs[top_band]])),
            )
        else:
            sample = (90, 70, 55)
        length = max(70, int(h * 0.16))
        result = synthesize_antennae(result, head, sample, length)
        print(f"antennae synthesized length={length} color={sample}")
    else:
        print("antennae preserved from source detection")

    bbox = result.getbbox()
    if bbox:
        pad = 14  # margen extra para no cortar clubs de antenas
        x0, y0, x1, y1 = bbox
        result = result.crop(
            (max(0, x0 - pad), max(0, y0 - pad), min(result.size[0], x1 + pad), min(result.size[1], y1 + pad))
        )

    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    result.save(OUT_PNG, "PNG", optimize=True)
    result.save(OUT_WEBP, "WEBP", quality=90, method=6)
    print(f"OK antenna-safe {result.size} png={OUT_PNG.stat().st_size} webp={OUT_WEBP.stat().st_size}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) >= 3:
        SRC = Path(sys.argv[1]).expanduser().resolve()
        OUT_PNG = Path(sys.argv[2]).expanduser().resolve()
        OUT_WEBP = OUT_PNG.with_suffix(".webp")
    main()

#!/usr/bin/env python3
"""Generate Digital Seed premium visual assets.

Creates a smooth loop: seed/light gathers -> roots flow downward -> trunk/branches/canopy emerge -> dissolve/reset.
No text is embedded in any visual artifact.
"""

from __future__ import annotations

import math
import os
import random
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "assets"
FRAMES = ROOT / "tmp" / "visual-frames"
W, H = 960, 416
FPS = 24
N = 144  # no duplicated terminal frame; motion eases back toward the opener
DURATION = N / FPS

# GitHub dark canvas color (#0d1117). Edges are pinned to this so the hero
# reads as an embedded artifact rather than a rectangular poster.
GITHUB_BG = (13, 17, 23)
BG_CORE = (8, 30, 36)
BG_WARM = (24, 20, 28)
MINT = (128, 255, 221)
GOLD = (255, 214, 132)
AQUA = (80, 205, 255)
VIOLET = (159, 137, 255)
WHITE = (235, 255, 247)

random.seed(42)


def clamp(x: float, a=0.0, b=1.0) -> float:
    return max(a, min(b, x))


def smoothstep(edge0: float, edge1: float, x: float) -> float:
    x = clamp((x - edge0) / (edge1 - edge0))
    return x * x * (3 - 2 * x)


def bell(t: float, center: float, width: float) -> float:
    return math.exp(-((t - center) ** 2) / (2 * width * width))


def ease(t: float) -> float:
    return t * t * (3 - 2 * t)


def rgba(rgb, a):
    return (*rgb, int(clamp(a) * 255))


def composite_glow(base: Image.Image, xy: tuple[float, float], color, radius: float, alpha: float):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = xy
    r = radius
    d.ellipse((x - r, y - r, x + r, y + r), fill=rgba(color, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(radius=r * 0.55))
    base.alpha_composite(layer)


def draw_line_glow(base, pts, color, width, alpha, blur=6):
    if len(pts) < 2 or alpha <= 0:
        return
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.line(pts, fill=rgba(color, alpha * 0.45), width=max(1, int(width * 2.8)), joint="curve")
    glow = glow.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(glow)
    d = ImageDraw.Draw(base)
    d.line(pts, fill=rgba(color, alpha), width=max(1, int(width)), joint="curve")


def quadratic(p0, p1, p2, u):
    return (
        (1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0],
        (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1],
    )


def cubic(p0, p1, p2, p3, u):
    return (
        (1 - u) ** 3 * p0[0] + 3 * (1 - u) ** 2 * u * p1[0] + 3 * (1 - u) * u * u * p2[0] + u ** 3 * p3[0],
        (1 - u) ** 3 * p0[1] + 3 * (1 - u) ** 2 * u * p1[1] + 3 * (1 - u) * u * u * p2[1] + u ** 3 * p3[1],
    )


def path_points(points, progress):
    # points are Bezier samples already; reveal partial polyline
    progress = clamp(progress)
    keep = max(2, int(2 + (len(points) - 2) * progress))
    return points[:keep]


stars = [(random.randrange(40, W - 40), random.randrange(24, H - 70), random.random()) for _ in range(96)]
particles = []
for i in range(56):
    ang = random.random() * math.tau
    rad = random.uniform(52, 245)
    z = random.random()
    particles.append((ang, rad, z, random.uniform(-0.35, 0.35)))

root_paths = []
for xend in [376, 438, 488, 530, 430, 572, 626, 684, 738, 794]:
    p0 = (W / 2, 292)
    p1 = ((W / 2 + xend) / 2 + random.uniform(-35, 35), random.uniform(322, 380))
    p2 = (xend, random.uniform(366, 407))
    root_paths.append([quadratic(p0, p1, p2, u / 42) for u in range(43)])

branch_paths = []
branch_specs = [
    # Left branches (4)
    ((484, 246), (407, 202), (354, 158), (270, 118)),
    ((500, 218), (430, 165), (389, 110), (320, 72)),
    ((525, 184), (474, 129), (445, 82), (404, 40)),
    ((529, 246), (461, 227), (405, 224), (335, 205)),
    # Center branches (5) — dense center canopy directly above trunk
    ((548, 200), (530, 145), (510, 96), (490, 48)),
    ((556, 170), (545, 118), (528, 72), (512, 30)),
    ((565, 152), (558, 100), (548, 58), (535, 20)),
    ((578, 158), (575, 105), (568, 62), (558, 24)),
    ((592, 151), (601, 96), (608, 54), (614, 18)),
    # Right branches (4 — mirrors left count)
    ((610, 162), (660, 108), (706, 72), (762, 38)),
    ((625, 177), (685, 118), (740, 83), (820, 58)),
    ((652, 217), (718, 166), (782, 132), (868, 106)),
    ((632, 252), (705, 226), (790, 212), (865, 195)),
]
for spec in branch_specs:
    branch_paths.append([cubic(*spec, u / 48) for u in range(49)])

# Secondary branchlets make the image read as a living tree rather than a radial data diagram.
branchlet_paths = []
branchlet_owners = []
for branch_idx, base in enumerate(branch_paths):
    for j in range(2):
        anchor = base[18 + j * 11]
        direction = -1 if anchor[0] < W / 2 else 1
        out = (
            anchor[0] + direction * random.uniform(38, 98),
            anchor[1] - random.uniform(14, 58),
        )
        ctrl = (
            (anchor[0] + out[0]) / 2 + direction * random.uniform(8, 28),
            (anchor[1] + out[1]) / 2 - random.uniform(18, 42),
        )
        branchlet_paths.append([quadratic(anchor, ctrl, out, u / 24) for u in range(25)])
        branchlet_owners.append(branch_idx)

# Branch-owned canopy nodes keep the mature tree healthy-looking. Earlier
# versions used a global particle pool plus a center fill, which made some
# branches lush while others looked thin after de-clustering.
canopy_nodes_by_branch = {idx: [] for idx in range(len(branch_paths))}


def canopy_node_for_path(pts, branch_id, frac, scatter_min, scatter_max, r_min, r_max):
    anchor_idx = int(frac * (len(pts) - 1))
    bx, by = pts[anchor_idx]
    scatter = random.uniform(scatter_min, scatter_max)
    angle = random.random() * math.tau
    x = bx + math.cos(angle) * scatter
    y = by + math.sin(angle) * scatter * 0.64
    if not (180 < x < 920 and 16 < y < 268):
        return None
    z_val = random.random()
    return (x, y, random.uniform(r_min, r_max), z_val, branch_id)


for branch_id, pts in enumerate(branch_paths):
    for k in range(52):
        # Bias samples toward the outer third so every visible tip has a
        # consistent living halo instead of a bare line endpoint.
        t = k / 51
        frac = 0.24 + 0.76 * (t ** 0.82)
        node = canopy_node_for_path(pts, branch_id, frac, 8, 34, 1.8, 5.2)
        if node:
            canopy_nodes_by_branch[branch_id].append(node)

for pts, branch_id in zip(branchlet_paths, branchlet_owners):
    n_samples = 18
    for k in range(n_samples):
        frac = 0.30 + 0.70 * (k / max(1, n_samples - 1))
        node = canopy_node_for_path(pts, branch_id, frac, 6, 24, 1.6, 4.6)
        if node:
            canopy_nodes_by_branch[branch_id].append(node)


def branch_min_distance(x, y):
    return 8.8 if 410 < x < 700 and 24 < y < 175 else 7.0


def decluster_branch_nodes(nodes):
    kept = []
    # Keep tips first; branch endpoints need to look equally alive.
    for node in sorted(nodes, key=lambda n: (n[0] - branch_paths[n[4]][0][0]) ** 2 + (n[1] - branch_paths[n[4]][0][1]) ** 2, reverse=True):
        x, y, r, z, branch_id = node
        min_dist = branch_min_distance(x, y)
        if any((x - px) ** 2 + (y - py) ** 2 < min_dist ** 2 for px, py, *_ in kept):
            continue
        if 410 < x < 700 and 24 < y < 175:
            r = min(r, 3.5)
            z = 0.62 if z < 0.46 else z
        kept.append((x, y, r, z, branch_id))
    return kept


TARGET_CANOPY_NODES_PER_BRANCH = 42
canopy_nodes = []
for branch_id, pts in enumerate(branch_paths):
    nodes = decluster_branch_nodes(canopy_nodes_by_branch[branch_id])
    attempts = 0
    while len(nodes) < TARGET_CANOPY_NODES_PER_BRANCH and attempts < 500:
        attempts += 1
        frac = random.uniform(0.38, 0.98)
        node = canopy_node_for_path(pts, branch_id, frac, 10, 30, 1.7, 4.8)
        if not node:
            continue
        x, y, *_ = node
        min_dist = branch_min_distance(x, y)
        if any((x - px) ** 2 + (y - py) ** 2 < min_dist ** 2 for px, py, *_ in nodes):
            continue
        nodes.append(node)
    canopy_nodes.extend(nodes[:TARGET_CANOPY_NODES_PER_BRANCH])


def make_background() -> Image.Image:
    img = Image.new("RGBA", (W, H), (*GITHUB_BG, 255))
    pix = img.load()
    for y in range(H):
        for x in range(W):
            rx = (x - W / 2) / (W * 0.55)
            ry = (y - H * 0.54) / (H * 0.68)
            center = clamp(1 - math.sqrt(rx * rx + ry * ry))
            center = center * center
            warm = clamp(1 - math.sqrt(((x - W * 0.50) / (W * 0.40)) ** 2 + ((y - H * 0.30) / (H * 0.48)) ** 2)) ** 2

            # Feather the perimeter back to GitHub dark exactly. This avoids a
            # visible rectangular edge on README pages and issue previews.
            edge_distance = min(x, y, W - 1 - x, H - 1 - y)
            edge = smoothstep(0, 92, edge_distance)

            c = []
            for channel in range(3):
                core = GITHUB_BG[channel] * (1 - center) + BG_CORE[channel] * center
                warmed = core * (1 - 0.22 * warm) + BG_WARM[channel] * (0.22 * warm)
                blended = GITHUB_BG[channel] * (1 - edge) + warmed * edge
                c.append(int(blended))
            pix[x, y] = (*c, 255)
    return img


BG_CACHE = make_background()


def background() -> Image.Image:
    return BG_CACHE.copy()


def render_frame(i: int) -> Image.Image:
    # Do not duplicate the opening frame at the end; duplicated terminal frames
    # create a perceptible hold/hiccup in GIF playback. Instead, every animated
    # element eases close to its opening state before the player wraps.
    phase = i / N
    reset = smoothstep(0.76, 0.985, phase)
    # loop time with dissolve in final fifth
    grow = smoothstep(0.07, 0.72, phase) * (1 - smoothstep(0.83, 0.99, phase))
    initial_seed_energy = 0.55 + 0.45 * bell(0, 0.12, 0.12)
    seed_energy_raw = 0.55 + 0.45 * bell(phase, 0.12, 0.12) + 0.25 * bell(phase, 0.91, 0.06)
    seed_energy = seed_energy_raw * (1 - reset) + initial_seed_energy * reset
    root_p = smoothstep(0.15, 0.42, phase) * (1 - smoothstep(0.84, 0.98, phase))
    trunk_p = smoothstep(0.30, 0.58, phase) * (1 - smoothstep(0.83, 0.98, phase))
    branch_p = smoothstep(0.43, 0.70, phase) * (1 - smoothstep(0.86, 0.982, phase))
    canopy_p = smoothstep(0.52, 0.76, phase) * (1 - smoothstep(0.86, 0.982, phase))
    fruit_p = smoothstep(0.64, 0.82, phase) * (1 - smoothstep(0.84, 0.970, phase))
    dissolve = smoothstep(0.84, 0.982, phase)

    img = background()
    d = ImageDraw.Draw(img)

    # stars / space dust
    for sx, sy, z in stars:
        tw = 0.35 + 0.65 * math.sin(math.tau * (phase + z)) ** 2
        tw0 = 0.35 + 0.65 * math.sin(math.tau * z) ** 2
        a_raw = 0.08 + 0.20 * tw * (1 - 0.5 * grow)
        a0 = 0.08 + 0.20 * tw0
        a = a_raw * (1 - reset) + a0 * reset
        r = 0.6 + z * 1.2
        d.ellipse((sx - r, sy - r, sx + r, sy + r), fill=rgba(WHITE, a))

    cx, seed_y = W / 2, 292
    # Keep the broad seed shine contained; otherwise the lower glow terminates
    # against the asset boundary and breaks the GitHub-embedded illusion.
    composite_glow(img, (cx, seed_y - 10), AQUA, 172, 0.07 + 0.11 * grow)
    composite_glow(img, (cx, seed_y - 16), VIOLET, 126, 0.04 + 0.055 * canopy_p)
    composite_glow(img, (cx, seed_y), GOLD, 58, 0.62 * seed_energy)
    composite_glow(img, (cx, seed_y), MINT, 86, 0.34 * seed_energy)

    # water-like horizon ripple
    for k in range(4):
        rp_raw = (phase * 1.45 + k * 0.22) % 1
        rp0 = (k * 0.22) % 1
        rp = rp_raw * (1 - reset) + rp0 * reset
        a_raw = (1 - rp_raw) * 0.15 * (0.5 + root_p)
        a0 = (1 - rp0) * 0.15 * 0.5
        a = a_raw * (1 - reset) + a0 * reset
        rx = 70 + rp * 310
        ry = 10 + rp * 32
        d.ellipse((cx - rx, seed_y - ry, cx + rx, seed_y + ry), outline=rgba(MINT, a), width=1)

    # orbiting particles / continuity of care
    for ang, rad, z, tilt in particles:
        # Integer-ish cycles keep orbital dust from jumping at the loop seam.
        local = phase * (1 + int(z * 3)) + z
        gather = 1 - smoothstep(0.02, 0.26, phase)
        rr = rad * (0.22 + 0.78 * (1 - gather))
        x_raw = cx + math.cos(ang + local * math.tau) * rr
        y_raw = 198 + math.sin(ang + local * math.tau) * rr * (0.38 + tilt)
        # dissolve drift upward
        y_raw -= dissolve * (40 + 80 * z)
        x0 = cx + math.cos(ang + z * math.tau) * rad
        y0 = 198 + math.sin(ang + z * math.tau) * rad * (0.38 + tilt)
        x = x_raw * (1 - reset) + x0 * reset
        y = y_raw * (1 - reset) + y0 * reset
        a_raw = (0.14 + 0.34 * z) * (0.35 + 0.65 * math.sin(local * math.tau) ** 2) * (1 - 0.72 * dissolve)
        local0 = z
        a0 = (0.14 + 0.34 * z) * (0.35 + 0.65 * math.sin(local0 * math.tau) ** 2)
        a = a_raw * (1 - reset) + a0 * reset
        r = 1.0 + 2.2 * z
        color = MINT if z > 0.50 else GOLD
        d.ellipse((x - r, y - r, x + r, y + r), fill=rgba(color, a))

    # roots
    for idx, pts in enumerate(root_paths):
        p = clamp(root_p - idx * 0.025)
        alpha = (0.45 + 0.3 * math.sin(idx)) * p * (1 - 0.75 * dissolve)
        draw_line_glow(img, path_points(pts, p), MINT if idx % 2 else AQUA, 2.0 if idx % 3 else 3.4, alpha, 7)

    # trunk as layered luminous curves
    trunk_main = [cubic((cx, seed_y), (490, 258), (532, 196), (552, 146), u / 64) for u in range(65)]
    trunk_right = [cubic((cx, seed_y), (591, 252), (608, 196), (590, 143), u / 64) for u in range(65)]
    trunk_mid = [cubic((cx, seed_y), (536, 246), (565, 188), (570, 122), u / 64) for u in range(65)]
    for pts, color, width, off in [(trunk_main, MINT, 10, 0), (trunk_right, AQUA, 8, 0.03), (trunk_mid, GOLD, 4, 0.08)]:
        p = clamp(trunk_p - off)
        draw_line_glow(img, path_points(pts, p), color, width, 0.75 * p * (1 - 0.8 * dissolve), 12)

    # branches
    for idx, pts in enumerate(branch_paths):
        p = clamp(branch_p - idx * 0.018)
        col = MINT if idx % 3 else GOLD
        draw_line_glow(img, path_points(pts, p), col, 2.2 + (idx % 2) * 1.4, 0.62 * p * (1 - 0.88 * dissolve), 8)

    for idx, pts in enumerate(branchlet_paths):
        p = clamp(branch_p - 0.12 - idx * 0.006)
        col = MINT if idx % 4 else AQUA
        draw_line_glow(img, path_points(pts, p), col, 1.2 + (idx % 3) * 0.35, 0.42 * p * (1 - 0.9 * dissolve), 5)

    if canopy_p > 0:
        canopy_glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        cd = ImageDraw.Draw(canopy_glow)
        cd.ellipse((240, 22, 826, 252), fill=rgba(MINT, 0.095 * canopy_p * (1 - dissolve)))
        cd.ellipse((305, 10, 765, 212), fill=rgba(GOLD, 0.085 * canopy_p * (1 - dissolve)))
        cd.ellipse((210, 66, 860, 270), fill=rgba(AQUA, 0.045 * canopy_p * (1 - dissolve)))
        canopy_glow = canopy_glow.filter(ImageFilter.GaussianBlur(34))
        img.alpha_composite(canopy_glow)

    # Bushy mature canopy: draw translucent leaf clusters behind the sparkling
    # points so the late animation reads as a living crown, not bare branches.
    if canopy_p > 0:
        leaf_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(leaf_layer)
        for idx, (x, y, r, z, branch_id) in enumerate(canopy_nodes):
            birth = clamp(canopy_p - z * 0.18)
            if birth <= 0:
                continue
            dx = math.sin(math.tau * (phase * 0.17 + z)) * 5
            dy = math.cos(math.tau * (phase * 0.13 + z)) * 4 - dissolve * (14 + z * 36)
            in_muddy_center = 410 < x < 700 and 24 < y < 175
            leaf_r = r * (1.35 + 0.5 * canopy_p)
            col = MINT if idx % 5 else (GOLD if idx % 7 == 0 else AQUA)
            alpha = 0.23
            if in_muddy_center:
                # Keep center as discrete leaves/fruits, not a blended paint blob.
                leaf_r *= 0.86
                alpha = 0.19
                col = MINT if idx % 2 else AQUA
            ld.ellipse((x + dx - leaf_r, y + dy - leaf_r * 0.78, x + dx + leaf_r, y + dy + leaf_r * 0.78), fill=rgba(col, alpha * birth * (1 - 0.7 * dissolve)))
        leaf_layer = leaf_layer.filter(ImageFilter.GaussianBlur(1.4))
        img.alpha_composite(leaf_layer)

    # canopy luminous living particles
    for x, y, r, z, branch_id in canopy_nodes:
        birth = clamp(canopy_p - z * 0.18)
        if birth <= 0:
            continue
        pulse = 0.65 + 0.35 * math.sin(math.tau * (phase * 0.9 + z))
        dx = math.sin(math.tau * (phase * 0.23 + z)) * 4
        dy = math.cos(math.tau * (phase * 0.19 + z)) * 3 - dissolve * (16 + z * 45)
        a = birth * pulse * (1 - 0.85 * dissolve)
        in_muddy_center = 410 < x < 700 and 24 < y < 175
        col = MINT if z > 0.46 else (GOLD if z > 0.12 else AQUA)
        draw_r = r * (1.04 if in_muddy_center else 1.16)
        draw_alpha = 0.50 if in_muddy_center else 0.60
        if in_muddy_center:
            col = MINT if z > 0.55 else AQUA
        d.ellipse((x + dx - draw_r, y + dy - draw_r, x + dx + draw_r, y + dy + draw_r), fill=rgba(col, draw_alpha * a))
        if z > 0.50 and not in_muddy_center:
            composite_glow(img, (x + dx, y + dy), col, r * 6.8, 0.094 * a)  # +20%


    # Late-loop fruit: warm nodes make the mature tree feel alive before it
    # dissolves back into a seed. They are deterministic, generated from the
    # canopy node list, and fade before the loop reset.
    if fruit_p > 0:
        fruit_nodes = []
        for branch_id in range(len(branch_paths)):
            branch_nodes = [node for node in canopy_nodes if node[4] == branch_id]
            # Pick fruit from the outer/top side of each branch so warm nodes
            # are distributed by branch, not by the global random z value.
            branch_nodes = sorted(branch_nodes, key=lambda n: (n[0] - branch_paths[branch_id][0][0]) ** 2 + (n[1] - branch_paths[branch_id][0][1]) ** 2, reverse=True)
            fruit_nodes.extend(branch_nodes[:3])
        for idx, (x, y, r, z, branch_id) in enumerate(fruit_nodes):
            phase_offset = (idx * 0.137 + z) % 1
            pulse = 0.7 + 0.3 * math.sin(math.tau * (phase * 1.2 + phase_offset))
            fx = x + math.sin(math.tau * (phase * 0.18 + z)) * 3
            fy = y + 6 + math.cos(math.tau * (phase * 0.16 + z)) * 2 - dissolve * (10 + z * 26)
            rr = 2.8 + 2.8 * (idx % 3) / 2
            a = fruit_p * pulse * (1 - 0.72 * dissolve)
            d.ellipse((fx - rr, fy - rr, fx + rr, fy + rr), fill=rgba(GOLD, 0.72 * a))
            d.ellipse((fx - rr * 0.38, fy - rr * 0.38, fx + rr * 0.38, fy + rr * 0.38), fill=rgba(WHITE, 0.35 * a))
            composite_glow(img, (fx, fy), GOLD, rr * 6.0, 0.12 * a)

    # seed core last, breathing and reset
    seed_r_raw = 8 + 8 * seed_energy + 3 * math.sin(math.tau * phase * 2)
    seed_r0 = 8 + 8 * initial_seed_energy
    seed_r = seed_r_raw * (1 - reset) + seed_r0 * reset
    d.ellipse((cx - seed_r, seed_y - seed_r, cx + seed_r, seed_y + seed_r), fill=rgba(GOLD, 0.92 * (1 - 0.55 * trunk_p + 0.45 * dissolve)))
    d.ellipse((cx - seed_r * 0.45, seed_y - seed_r * 0.45, cx + seed_r * 0.45, seed_y + seed_r * 0.45), fill=rgba(WHITE, 0.76))

    # Edge feather: return the perimeter to GitHub dark instead of blackening it.
    # This makes the visual feel embedded in README chrome.
    edge_layer = Image.new("RGBA", (W, H), (*GITHUB_BG, 0))
    edge = Image.new("L", (W, H), 0)
    ed = ImageDraw.Draw(edge)
    ed.ellipse((-95, -95, W + 95, H + 95), fill=255)
    edge = Image.eval(edge.filter(ImageFilter.GaussianBlur(54)), lambda p: 255 - p)
    edge_layer.putalpha(edge.point(lambda p: int(p * 0.62)))
    img.alpha_composite(edge_layer)

    # Bottom glow feather: the seed shine should dissolve into GitHub dark before
    # it reaches the image boundary, not get cut off by it.
    bottom_fade = Image.new("RGBA", (W, H), (*GITHUB_BG, 0))
    bd = ImageDraw.Draw(bottom_fade)
    for y in range(H):
        # Start the lower fade above the visible seed-halo tail and ramp gently.
        # This removes the faint horizontal boundary while keeping the seed glow.
        a = smoothstep(H * 0.62, H - 1, y)
        if a > 0:
            bd.line((0, y, W, y), fill=(*GITHUB_BG, int(232 * a)))
    bottom_fade = bottom_fade.filter(ImageFilter.GaussianBlur(18))
    img.alpha_composite(bottom_fade)
    return img.convert("RGB")


def write_svg():
    svg = """<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 960 416\" role=\"img\" aria-labelledby=\"title desc\">
  <title id=\"title\">Digital Seed luminous growth loop</title>
  <desc id=\"desc\">An abstract looping visual where a seed of light gathers particles, sends energy downward, grows into luminous branches and a living canopy, then dissolves and regrows.</desc>
  <defs>
    <radialGradient id=\"bg\" cx=\"50%\" cy=\"52%\" r=\"78%\"><stop offset=\"0%\" stop-color=\"#102938\"/><stop offset=\"48%\" stop-color=\"#071525\"/><stop offset=\"100%\" stop-color=\"#030714\"/></radialGradient>
    <radialGradient id=\"seed\"><stop offset=\"0%\" stop-color=\"#f7fff7\"/><stop offset=\"45%\" stop-color=\"#ffd684\"/><stop offset=\"100%\" stop-color=\"#7fffd6\" stop-opacity=\"0\"/></radialGradient>
    <linearGradient id=\"life\" x1=\"0\" x2=\"1\" y1=\"1\" y2=\"0\"><stop stop-color=\"#50cdff\"/><stop offset=\"0.45\" stop-color=\"#80ffdd\"/><stop offset=\"1\" stop-color=\"#ffd684\"/></linearGradient>
    <filter id=\"glow\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"7\" result=\"b\"/><feMerge><feMergeNode in=\"b\"/><feMergeNode in=\"SourceGraphic\"/></feMerge></filter>
    <style>
      *{transform-box:fill-box;transform-origin:center}.line{fill:none;stroke:url(#life);stroke-linecap:round;stroke-linejoin:round;filter:url(#glow);stroke-dasharray:900;animation:draw 8s cubic-bezier(.2,.75,.2,1) infinite}.root{stroke-width:3;opacity:.72;animation-delay:.8s}.trunk{stroke-width:11;animation-delay:1.8s}.branch{stroke-width:4;opacity:.82;animation-delay:3s}.seed{animation:seed 8s ease-in-out infinite}.orb{animation:orbit 8s ease-in-out infinite}.leaf{animation:leaf 8s ease-in-out infinite}@keyframes draw{0%,12%{stroke-dashoffset:900;opacity:0}45%,76%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:-900;opacity:0}}@keyframes seed{0%,100%{transform:scale(.55);opacity:.9}18%{transform:scale(1.25);opacity:1}70%{transform:scale(.75);opacity:.55}86%{transform:scale(1.1);opacity:.95}}@keyframes orbit{0%{opacity:.1;transform:rotate(0deg) scale(.55)}40%,72%{opacity:.7;transform:rotate(170deg) scale(1)}100%{opacity:.1;transform:rotate(360deg) scale(.55)}}@keyframes leaf{0%,45%{opacity:0;transform:translateY(18px) scale(.5)}62%,78%{opacity:.8;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-26px) scale(.7)}}
    </style>
  </defs>
  <rect width=\"960\" height=\"416\" fill=\"url(#bg)\"/>
  <g opacity=\".34\"><circle cx=\"205\" cy=\"64\" r=\"1.2\" fill=\"#effdf8\"/><circle cx=\"735\" cy=\"82\" r=\"1\" fill=\"#effdf8\"/><circle cx=\"820\" cy=\"244\" r=\"1.4\" fill=\"#effdf8\"/><circle cx=\"124\" cy=\"232\" r=\"1\" fill=\"#effdf8\"/></g>
  <ellipse class=\"orb\" cx=\"480\" cy=\"206\" rx=\"265\" ry=\"88\" fill=\"none\" stroke=\"#80ffdd\" stroke-opacity=\".4\" stroke-dasharray=\"2 18\"/>
  <ellipse class=\"orb\" cx=\"480\" cy=\"206\" rx=\"210\" ry=\"116\" fill=\"none\" stroke=\"#ffd684\" stroke-opacity=\".25\" stroke-dasharray=\"3 22\" style=\"animation-delay:.7s\"/>
  <path class=\"line root\" d=\"M480 292 C430 325 395 370 338 397 M480 292 C470 336 472 371 452 407 M480 292 C532 327 579 375 642 403 M480 292 C555 318 657 338 760 390\"/>
  <path class=\"line trunk\" d=\"M480 292 C428 247 455 202 542 147 C583 119 593 82 612 42 M480 292 C535 251 555 197 536 139\"/>
  <path class=\"line branch\" d=\"M540 169 C455 137 390 100 322 62 M555 143 C608 96 661 59 727 40 M522 198 C440 202 380 219 304 247 M565 190 C641 163 728 134 852 105 M548 130 C526 87 510 57 492 34\"/>
  <g filter=\"url(#glow)\">"""
    leaves = [(480 + math.cos(a) * r, 122 + math.sin(a) * r * 0.45, 2 + (idx % 4)) for idx, (a, r) in enumerate(( (i*2.399, 40 + (i*37)%250) for i in range(70) ))]
    for idx, (x, y, r) in enumerate(leaves):
        svg += f'\n    <circle class="leaf" cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="#80ffdd" opacity=".72" style="animation-delay:{2.7 + (idx%19)*0.07:.2f}s"/>'
    svg += """
  </g>
  <circle class=\"seed\" cx=\"480\" cy=\"292\" r=\"44\" fill=\"url(#seed)\" filter=\"url(#glow)\"/>
  <circle class=\"seed\" cx=\"480\" cy=\"292\" r=\"11\" fill=\"#fff8dc\"/>
</svg>
"""
    (ASSETS / "seed-tree-magic.svg").write_text(svg)


def run(cmd):
    print("$", " ".join(cmd))
    subprocess.run(cmd, check=True, cwd=ROOT)


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    if FRAMES.exists():
        shutil.rmtree(FRAMES)
    FRAMES.mkdir(parents=True)

    for i in range(N):
        frame = render_frame(i)
        frame.save(FRAMES / f"frame-{i:04d}.png", optimize=True)

    # Still fallback at peak growth
    render_frame(int(N * 0.68)).save(ASSETS / "digital-seed-growth-still.png", optimize=True)

    # Animated GIF preview for GitHub/docs. Keep it intentionally smaller than the video assets.
    gif_frames = [
        Image.open(FRAMES / f"frame-{i:04d}.png")
        .resize((640, 277), Image.Resampling.LANCZOS)
        .quantize(colors=128, method=Image.Quantize.MEDIANCUT)
        for i in range(0, N, 2)
    ]
    gif_frames[0].save(
        ASSETS / "digital-seed-growth.gif",
        save_all=True,
        append_images=gif_frames[1:],
        duration=int(1000 / FPS) * 2,
        loop=0,
        optimize=True,
    )

    if shutil.which("ffmpeg"):
        run(["ffmpeg", "-y", "-framerate", str(FPS), "-i", str(FRAMES / "frame-%04d.png"), "-vf", "format=yuv420p", "-movflags", "+faststart", "-crf", "19", "-pix_fmt", "yuv420p", str(ASSETS / "digital-seed-growth.mp4")])
        run(["ffmpeg", "-y", "-framerate", str(FPS), "-i", str(FRAMES / "frame-%04d.png"), "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-pix_fmt", "yuva420p", str(ASSETS / "digital-seed-growth.webm")])

    write_svg()
    print("Generated Digital Seed visual assets in", ASSETS)


if __name__ == "__main__":
    main()

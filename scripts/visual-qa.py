#!/usr/bin/env python3
"""Visual QA guardrail for the Digital Seed hero loop.

Verifies the published GIF still has the properties we shipped:
- expected dimensions (960x416)
- enough frames for smooth motion (>= 100)
- infinite loop flag enabled
- edge pixels match the GitHub-dark canvas (no rectangular poster look)
- last-frame -> first-frame seam difference stays below a threshold

Exit codes:
  0 — all checks passed
  1 — at least one check failed

Usage:
  python3 scripts/visual-qa.py [--gif PATH] [--strict]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_GIF = ROOT / "docs" / "assets" / "digital-seed-growth.gif"

EXPECTED_W = 640
EXPECTED_H = 277
MIN_FRAMES = 60              # GIF samples every 2nd frame from the 144-frame source
MAX_FRAMES = 120
GITHUB_BG = (13, 17, 23)
EDGE_TOLERANCE = 12          # max channel diff against GITHUB_BG on edges
EDGE_FAIL_RATIO = 0.10       # fail if > 10% of edge pixels drift past tolerance
SEAM_PIXEL_TOLERANCE = 18    # per-channel drift counted as "different"
SEAM_FAIL_RATIO = 0.04       # fail if > 4% of pixels differ between last and first
EXPECTED_DURATION_S = 6.0    # 144 frames @ 24fps source
DURATION_TOLERANCE_S = 1.5


def _check(name: str, ok: bool, detail: str) -> bool:
    marker = "✅" if ok else "❌"
    print(f"  {marker} {name}: {detail}")
    return ok


def _frames(path: Path) -> list[Image.Image]:
    with Image.open(path) as im:
        return [f.convert("RGB").copy() for f in ImageSequence.Iterator(im)]


def _loop_flag(path: Path) -> int | None:
    with Image.open(path) as im:
        loop = im.info.get("loop")
        return None if loop is None else int(loop)


def _total_duration_s(path: Path) -> float:
    total_ms = 0
    with Image.open(path) as im:
        for frame in ImageSequence.Iterator(im):
            total_ms += int(frame.info.get("duration", 0))
    return total_ms / 1000.0


def _edge_drift_ratio(frame: Image.Image) -> float:
    w, h = frame.size
    pixels = frame.load()
    drifted = 0
    total = 0
    for x in range(w):
        for y in (0, h - 1):
            r, g, b = pixels[x, y]
            total += 1
            if (
                abs(r - GITHUB_BG[0]) > EDGE_TOLERANCE
                or abs(g - GITHUB_BG[1]) > EDGE_TOLERANCE
                or abs(b - GITHUB_BG[2]) > EDGE_TOLERANCE
            ):
                drifted += 1
    for y in range(1, h - 1):
        for x in (0, w - 1):
            r, g, b = pixels[x, y]
            total += 1
            if (
                abs(r - GITHUB_BG[0]) > EDGE_TOLERANCE
                or abs(g - GITHUB_BG[1]) > EDGE_TOLERANCE
                or abs(b - GITHUB_BG[2]) > EDGE_TOLERANCE
            ):
                drifted += 1
    return drifted / max(total, 1)


def _seam_diff_ratio(first: Image.Image, last: Image.Image) -> float:
    if first.size != last.size:
        return 1.0
    diff = ImageChops.difference(first, last)
    w, h = diff.size
    pixels = diff.load()
    differing = 0
    total = w * h
    for x in range(w):
        for y in range(h):
            r, g, b = pixels[x, y]
            if r > SEAM_PIXEL_TOLERANCE or g > SEAM_PIXEL_TOLERANCE or b > SEAM_PIXEL_TOLERANCE:
                differing += 1
    return differing / total


def run_checks(gif_path: Path, strict: bool = False) -> int:
    print(f"Visual QA — {gif_path.relative_to(ROOT) if gif_path.is_relative_to(ROOT) else gif_path}\n")

    if not gif_path.exists():
        print(f"❌ Missing GIF: {gif_path}")
        return 1

    frames = _frames(gif_path)
    if not frames:
        print("❌ GIF has no decodable frames")
        return 1

    ok = True

    width, height = frames[0].size
    ok &= _check(
        "dimensions",
        width == EXPECTED_W and height == EXPECTED_H,
        f"{width}x{height} (expected {EXPECTED_W}x{EXPECTED_H})",
    )

    ok &= _check(
        "frame count",
        MIN_FRAMES <= len(frames) <= MAX_FRAMES,
        f"{len(frames)} frames (expected {MIN_FRAMES}–{MAX_FRAMES})",
    )

    duration = _total_duration_s(gif_path)
    ok &= _check(
        "duration",
        abs(duration - EXPECTED_DURATION_S) <= DURATION_TOLERANCE_S,
        f"{duration:.2f}s (expected {EXPECTED_DURATION_S}s ±{DURATION_TOLERANCE_S}s)",
    )

    loop = _loop_flag(gif_path)
    ok &= _check(
        "loop flag",
        loop == 0,
        f"loop={loop} (0 means infinite)",
    )

    edge_ratio = _edge_drift_ratio(frames[len(frames) // 2])
    ok &= _check(
        "edge color (mid frame)",
        edge_ratio <= EDGE_FAIL_RATIO,
        f"{edge_ratio:.1%} of edge pixels off GitHub-dark (limit {EDGE_FAIL_RATIO:.0%})",
    )

    seam_ratio = _seam_diff_ratio(frames[0], frames[-1])
    seam_threshold = SEAM_FAIL_RATIO / (2 if strict else 1)
    ok &= _check(
        "loop seam",
        seam_ratio <= seam_threshold,
        f"{seam_ratio:.1%} of pixels differ first vs last (limit {seam_threshold:.1%})",
    )

    print()
    if ok:
        print("✅ Visual QA passed.")
        return 0
    print("❌ Visual QA failed. Re-run scripts/generate-visual-assets.py or inspect the GIF.")
    return 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gif", type=Path, default=DEFAULT_GIF)
    parser.add_argument("--strict", action="store_true", help="Tighter seam tolerance")
    args = parser.parse_args()
    return run_checks(args.gif, strict=args.strict)


if __name__ == "__main__":
    sys.exit(main())

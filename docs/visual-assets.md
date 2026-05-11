# Visual Assets

Digital Seed uses a small generated hero loop to communicate the product idea without embedding text in the image itself: a light seed gathers context, grows a living personal AI tree, then dissolves back into a calm reusable seed state.

## Files

- `docs/assets/digital-seed-growth.gif` — primary README/docs preview. Optimized for broad GitHub rendering support.
- `docs/assets/digital-seed-growth.mp4` — higher-quality video fallback.
- `docs/assets/digital-seed-growth.webm` — compact video fallback.
- `docs/assets/digital-seed-growth-still.png` — static fallback at peak growth.
- `docs/assets/seed-tree-magic.svg` — lightweight vector fallback.

## Generation

Regenerate all raster/video assets with:

```bash
python3 scripts/generate-visual-assets.py
```

The generator requires Pillow. If `ffmpeg` is available, it also exports MP4 and WebM.

## Design constraints

- No embedded text. The README/docs provide the words; the asset stays reusable.
- Edges are pinned and feathered to GitHub dark `#0d1117`, so the visual reads as an embedded artifact rather than a pasted rectangle.
- The GIF avoids a duplicated terminal frame. Duplicating the opening frame at the end produced a perceptible end-loop hold; the current loop eases close to the opener and lets playback wrap naturally.
- Particle density is intentionally restrained so the middle of the loop feels like controlled growth, not a chaotic sci-fi explosion.
- Warm gold is reserved for the seed/bloom moments; mint/aqua carry the data-growth language.

## Current audit notes

Latest hostile visual audit result: production-ready.

Measured loop checks after regeneration:

- GIF: 72 frames, ~5.76s at 80ms/frame, infinite loop flag enabled.
- GIF wrap seam: last→first mean difference ~1.34, lower than/roughly comparable to normal first→second motion (~1.72), so the wrap should not read as a hiccup.
- Source wrap seam: last→first mean difference ~0.98, comparable to source first→second motion (~1.05).
- Edge samples at the corners match GitHub dark `(13, 17, 23)`.

If the loop starts to look jumpy again, check for either:

1. a duplicated terminal frame, which creates a visible hold; or
2. non-periodic particle/orbital motion near the reset window.

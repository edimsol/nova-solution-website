# NOVA symbol restoration — 2026-10-08

The three SVG files are new vector restorations of `assets/nova-symbol-source.png`.
The pre-existing `assets/nova-symbol.svg` was not reused or changed. The source
PNG is unchanged, SHA-256 `3a0f613a1b8b22ae7be22f54007104b4a887d64efac34e773f313a16b66584d1`.

## Method

The alpha mask at 128/255 contains two main components. Their complete outer
boundaries were extracted, smoothed with a periodic Gaussian (sigma 1.1 source
pixels), corrected outward by half a pixel from contour pixel centers to pixel
edges, and fitted with adaptive cubic Bézier curves (sampled-fit tolerance
0.65px). This produced 132 curve segments in two closed subpaths.
All three assets contain exactly the same path data and original 1254-square
framing. No bitmap, external references, background rectangle, or font is used.

The color asset uses a two-stop linear gradient derived from a trimmed affine
fit to original interior RGB samples. The source median is (70,195,230); the
variation is less than one RGB unit per fitted channel across most of the mark.
This intentionally preserves a very subtle gradient, not a newly invented
high-contrast highlight. Light is #FEFEFE and dark is #242424.

## Geometric and color checks

resvg rendered all SVGs at 1254×1254. Clean-source silhouette IoU:
0.99688635. Symmetric edge distance max:
1.000px; 95th percentile:
1.000px.
Interior mean absolute RGB difference from PNG:
[0.682346119589453, 0.7093831632683559, 0.5129865083777176] (0–255 scale, before compositing).
All variants have identical rendered alpha. Opaque interior colors of the two
monochrome variants were checked exactly. XML structure/path equality and lack
of embedded or external images were asserted.

`logo-render-comparison.png` is a raster proof made by resvg, in column order
source/color/light/dark, on dark and light backgrounds. `logo-outline-error.png`
shows overlap in muted cyan, source-only pixels in orange, and vector-only
pixels in purple. `logo-preview.html` embeds the source and all three SVGs and
shows 24/48/96px plus 280px samples on both backgrounds. The actual download
links resolve to the new SVG assets. Visual inspection is recorded separately
after opening the proof and comparison page.

## Known differences

This is not the unavailable original vector master. Low-alpha stray marks,
edge halos, near-opaque alpha variation and random raster color noise are
intentionally omitted. The main shapes have opaque interiors with smooth
antialiased boundaries. Original transparent margins are retained. Measured
distances refer to the cleaned 50%-alpha outline, not every low-alpha pixel.

## Reproduction

Run `python docs/preservation/2026-10-08/logo-build.py`. Authoring-only packages
are numpy, Pillow, opencv-python-headless and resvg-py (versions in JSON).
These packages are not used by the website and no runtime dependency was added.
The script writes only the three new `assets/brand/nova-symbol-*.svg` files and
the logo documents/proofs in this preservation directory.

"""Reproduce vector logo assets from the preserved PNG; no website files are edited.

One-time authoring dependencies: Python, numpy, Pillow, opencv-python-headless,
resvg-py. These are not website/runtime dependencies. Run from any directory.
"""
from __future__ import annotations

import base64
from collections import Counter
import hashlib
import io
import json
from pathlib import Path
import xml.etree.ElementTree as ET

import cv2
import numpy as np
from PIL import Image, ImageDraw
import resvg_py

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SOURCE = ROOT / "assets/nova-symbol-source.png"
OUT = ROOT / "assets/brand"
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 1254
FIT_ERROR = 0.65


def unit(v):
    return v / max(float(np.linalg.norm(v)), 1e-12)


def point(curve, t):
    return ((1-t)**3 * curve[0] + 3*t*(1-t)**2 * curve[1]
            + 3*t*t*(1-t) * curve[2] + t**3 * curve[3])


def fit(points, left, right):
    """Adaptive least-squares cubic fitting with chord-length parameters.

    right is the tangent pointing back into the segment from its final point.
    Recursion joins cubic segments with a shared tangent.
    """
    if len(points) == 2:
        d = float(np.linalg.norm(points[1]-points[0])) / 3
        return [np.array([points[0], points[0]+left*d, points[-1]+right*d, points[-1]])]
    distances = np.r_[0, np.cumsum(np.linalg.norm(np.diff(points, axis=0), axis=1))]
    u = distances / distances[-1]
    b0 = (1-u)**3
    b1 = 3*u*(1-u)**2
    b2 = 3*u*u*(1-u)
    b3 = u**3
    a0 = b1[:, None] * left
    a1 = b2[:, None] * right
    delta = points - (b0+b1)[:, None]*points[0] - (b2+b3)[:, None]*points[-1]
    matrix = np.array([[np.sum(a0*a0), np.sum(a0*a1)],
                       [np.sum(a0*a1), np.sum(a1*a1)]])
    rhs = np.array([np.sum(a0*delta), np.sum(a1*delta)])
    lengths = np.linalg.lstsq(matrix, rhs, rcond=None)[0]
    chord = float(np.linalg.norm(points[-1]-points[0]))
    if min(lengths) < 1e-6*chord or max(lengths) > distances[-1]*2:
        lengths[:] = chord/3
    curve = np.array([points[0], points[0]+left*lengths[0],
                      points[-1]+right*lengths[1], points[-1]])
    interpolated = (b0[:, None]*curve[0]+b1[:, None]*curve[1]
                    +b2[:, None]*curve[2]+b3[:, None]*curve[3])
    error = np.linalg.norm(interpolated-points, axis=1)
    split = int(np.argmax(error))
    if float(error[split]) <= FIT_ERROR:
        return [curve]
    split = min(max(split, 1), len(points)-2)
    tangent = unit(points[split-1]-points[split+1])
    return fit(points[:split+1], left, tangent) + fit(points[split:], -tangent, right)


source_bytes = SOURCE.read_bytes()
original = np.array(Image.open(io.BytesIO(source_bytes)).convert("RGBA"))
assert original.shape == (SIZE, SIZE, 4)
binary = (original[:, :, 3] >= 128).astype(np.uint8)
count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
main_labels = [i for i in range(1, count) if stats[i, cv2.CC_STAT_AREA] > 10000]
assert len(main_labels) == 2
clean = np.isin(labels, main_labels).astype(np.uint8)
contours, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
contours = sorted(contours, key=lambda contour: int(contour[:, :, 0].min()))
path_parts, all_curves = [], []
for contour in contours:
    polygon = contour[:, 0, :].astype(float)
    # Center coordinates of the thresholded pixels, then smooth one-pixel raster
    # staircase noise.  This does not approximate the logo with a stock N glyph.
    polygon += .5
    weights = np.exp(-np.arange(-4, 5, dtype=float)**2/(2*1.1**2))
    weights /= weights.sum()
    smooth = sum(np.roll(polygon, shift, axis=0)*weight
                 for shift, weight in zip(range(-4, 5), weights))
    # findContours follows pixel centers. Move half a pixel to the exterior
    # so that its vector boundary represents the edge of the covered pixels.
    tangent = np.roll(smooth, -1, axis=0)-np.roll(smooth, 1, axis=0)
    tangent /= np.maximum(np.linalg.norm(tangent, axis=1, keepdims=True), 1e-12)
    winding = np.sign(cv2.contourArea(contour, oriented=True))
    smooth += .5*winding*np.column_stack((tangent[:, 1], -tangent[:, 0]))
    mid = len(smooth)//2
    first = unit(smooth[1]-smooth[-1])
    middle = unit(smooth[mid+1]-smooth[mid-1])
    curves = (fit(smooth[:mid+1], first, -middle)
              + fit(np.vstack([smooth[mid:], smooth[0]]), middle, -first))
    d = f"M {curves[0][0,0]:.3f} {curves[0][0,1]:.3f}"
    for curve in curves:
        d += " C " + " ".join(f"{v:.3f}" for v in curve[1:].reshape(-1))
    path_parts.append(d + " Z")
    all_curves.extend(curves)
path = " ".join(path_parts)

# Fit the source's very slight color drift only from stable interior pixels.
# Per-channel trimming removes bright edge contamination and isolated noise.
interior = cv2.erode(clean, np.ones((13, 13), np.uint8)).astype(bool)
yy, xx = np.nonzero(interior)
rgb = original[:, :, :3][interior].astype(float)
lower, upper = np.quantile(rgb, [.01, .99], axis=0)
stable = np.all((rgb > lower) & (rgb < upper), axis=1)
coordinates = np.column_stack((np.ones(len(xx)), (xx-SIZE/2)/(SIZE/2),
                               (yy-SIZE/2)/(SIZE/2)))
coefficients = np.linalg.lstsq(coordinates[stable], rgb[stable], rcond=None)[0]
axes, strengths, colors = np.linalg.svd(coefficients[1:], full_matrices=False)
direction = axes[:, 0]
extent = float(np.abs(direction).sum())
ends = np.array([-extent, extent])
gradient_points = (np.outer(ends, direction)+1)*SIZE/2
gradient_colors = coefficients[0] + ends[:, None]*strengths[0]*colors[0]
percent_colors = ["rgb("+", ".join(f"{v/255*100:.5f}%" for v in c)+")"
                  for c in gradient_colors]
gradient = (f'<defs><linearGradient id="nova-source-color" gradientUnits="userSpaceOnUse" '
            f'x1="{gradient_points[0,0]:.3f}" y1="{gradient_points[0,1]:.3f}" '
            f'x2="{gradient_points[1,0]:.3f}" y2="{gradient_points[1,1]:.3f}">'
            f'<stop offset="0" stop-color="{percent_colors[0]}"/>'
            f'<stop offset="1" stop-color="{percent_colors[1]}"/>'
            '</linearGradient></defs>')

svgs, renders = {}, {}
for variant, fill in [("color", "url(#nova-source-color)"), ("light", "#FEFEFE"),
                      ("dark", "#242424")]:
    title = f"NOVA symbol — {variant}"
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" '
           f'width="{SIZE}" height="{SIZE}" role="img" aria-label="{title}">\n'
           f'  <title>{title}</title>\n'
           '  <desc>Vector outline restored from the preserved NOVA source PNG. '
           'Original square framing retained; transparent background.</desc>\n'
           + (f'  {gradient}\n' if variant == "color" else "")
           + f'  <path fill="{fill}" d="{path}"/>\n</svg>\n')
    target = OUT / f"nova-symbol-{variant}.svg"
    target.write_text(svg, encoding="utf-8", newline="\n")
    svgs[variant] = svg
    png = resvg_py.svg_to_bytes(svg_string=svg, width=SIZE, height=SIZE,
                                skip_system_fonts=True)
    renders[variant] = np.array(Image.open(io.BytesIO(png)).convert("RGBA"))

rendered = renders["color"]
render_mask = rendered[:, :, 3] >= 128
source_mask = clean.astype(bool)
intersection = int(np.sum(render_mask & source_mask))
union = int(np.sum(render_mask | source_mask))
source_edge = source_mask ^ cv2.erode(clean, np.ones((3, 3), np.uint8)).astype(bool)
render_edge = render_mask ^ cv2.erode(render_mask.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
to_source = cv2.distanceTransform((~source_edge).astype(np.uint8), cv2.DIST_L2, cv2.DIST_MASK_PRECISE)
to_render = cv2.distanceTransform((~render_edge).astype(np.uint8), cv2.DIST_L2, cv2.DIST_MASK_PRECISE)
edge_distances = np.r_[to_source[render_edge], to_render[source_edge]]
both_interior = interior & (rendered[:, :, 3] == 255)
color_delta = rendered[:, :, :3][both_interior].astype(float)-original[:, :, :3][both_interior]

ns = {"s": "http://www.w3.org/2000/svg"}
xml = {key: ET.fromstring(svg) for key, svg in svgs.items()}
assert len({root.find("s:path", ns).attrib["d"] for root in xml.values()}) == 1
assert len({root.attrib["viewBox"] for root in xml.values()}) == 1
assert np.array_equal(renders["color"][:, :, 3], renders["light"][:, :, 3])
assert np.array_equal(renders["light"][:, :, 3], renders["dark"][:, :, 3])
for variant, expected in [("light", [254, 254, 254]), ("dark", [36, 36, 36])]:
    colors_interior = np.unique(renders[variant][:, :, :3][renders[variant][:, :, 3] == 255], axis=0)
    assert colors_interior.tolist() == [expected]
for svg in svgs.values():
    assert "<image" not in svg and "base64" not in svg and "href=" not in svg
assert intersection/union > .98
assert float(edge_distances.max()) < 4

metadata = {
    "source": "assets/nova-symbol-source.png",
    "source_sha256": hashlib.sha256(source_bytes).hexdigest(),
    "source_bytes": len(source_bytes), "source_dimensions": [SIZE, SIZE],
    "source_mode": "RGBA", "viewBox": f"0 0 {SIZE} {SIZE}",
    "method": "Two alpha>=128 components; periodic Gaussian boundary denoising sigma=1.1px; half-pixel outward pixel-center correction; adaptive least-squares cubic Bezier fitting, 0.65px sampled-fit tolerance. Color: trimmed interior affine RGB fit projected onto its strongest gradient axis.",
    "source_component_areas_px": [int(stats[i, cv2.CC_STAT_AREA]) for i in main_labels],
    "cubic_segments": len(all_curves), "subpaths": len(path_parts),
    "source_interior_rgb_median": np.median(rgb, axis=0).tolist(),
    "gradient_endpoint_rgb": gradient_colors.tolist(),
    "gradient_endpoints_xy": gradient_points.tolist(),
    "validation_at_1254px": {
        "silhouette_iou": intersection/union,
        "symmetric_edge_distance_max_px": float(edge_distances.max()),
        "symmetric_edge_distance_p95_px": float(np.quantile(edge_distances, .95)),
        "interior_rgb_mae": np.mean(np.abs(color_delta), axis=0).tolist(),
        "all_three_path_data_identical": True,
        "all_three_rendered_alpha_identical": True,
        "light_opaque_rgb": [254, 254, 254], "dark_opaque_rgb": [36, 36, 36],
        "no_bitmap_embedding_external_references_or_background_rectangles": True,
    },
    "error_characteristics": [
        "This is a measured vector restoration, not the unavailable original vector master.",
        "The square PNG canvas and visible mark placement are retained; transparent margins are intentional.",
        "Low-alpha stray pixels, edge halos and raster texture are omitted; main shapes are opaque with antialiased boundaries.",
        "The very small original color drift is retained as a smooth two-stop gradient; random per-pixel color noise is not reproduced.",
        "Boundary error is measured after resvg rasterization at source resolution against the cleaned 50% alpha silhouette, not against stray transparent pixels.",
    ],
    "authoring_versions": {"numpy": np.__version__, "opencv": cv2.__version__,
                           "Pillow": Image.__version__, "resvg_py": "0.5.0"},
    "outputs": {key: {"path": f"assets/brand/nova-symbol-{key}.svg",
                       "sha256": hashlib.sha256(svg.encode()).hexdigest(),
                       "bytes": len(svg.encode())} for key, svg in svgs.items()},
}
(HERE / "logo-metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")

def data_url(mime, data):
    return f"data:{mime};base64,"+base64.b64encode(data).decode()

images = {"source": data_url("image/png", source_bytes)}
images.update({key: data_url("image/svg+xml", svg.encode()) for key, svg in svgs.items()})
labels_text = {"source": "원본 PNG", "color": "컬러 SVG", "light": "라이트 SVG · #FEFEFE", "dark": "다크 SVG · #242424"}
cards = []
for theme, theme_name in [("night", "어두운 배경"), ("day", "밝은 배경")]:
    panels = []
    for key, label in labels_text.items():
        samples = ''.join(f'<div class="sample"><img src="{images[key]}" width="{size}" height="{size}" alt="{label}, {size}px"><span>{size}px</span></div>' for size in [24, 48, 96])
        download = (f'<a class="download" download href="../../../assets/brand/nova-symbol-{key}.svg">SVG 다운로드</a>' if key != "source" else '<span class="download muted">보존된 원본 · 1254 × 1254</span>')
        panels.append(f'<article class="card"><h3>{label}</h3><div class="sizes">{samples}</div><div class="large"><img src="{images[key]}" width="280" height="280" alt="{label} 확대"></div><p class="caption">확대 · 280px</p>{download}</article>')
    cards.append(f'<section class="theme {theme}"><div class="theme-heading"><h2>{theme_name}</h2><span>{"#111B28" if theme == "night" else "#F4F3EE"}</span></div><div class="cards">'+''.join(panels)+'</div></section>')
validation = metadata["validation_at_1254px"]
html = '''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NOVA 로고 · 원본과 벡터 비교</title><style>
*{box-sizing:border-box}body{margin:0;background:#e7e9ed;color:#162537;font:15px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:1440px;margin:auto;padding:48px 24px 64px}h1{font-size:clamp(28px,4vw,44px);letter-spacing:-.045em;margin:0 0 12px}header p{max-width:840px;color:#516072;margin:0 0 12px}.eyebrow{font-size:12px;letter-spacing:.16em;font-weight:700;color:#317c96}.legend{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0 34px}.legend span{border:1px solid #c5cbd3;border-radius:30px;padding:5px 13px;background:#f4f5f6;font-size:12px}.theme{padding:24px;border-radius:20px;margin:24px 0}.night{background:#111b28;color:#fefefe}.day{background:#f4f3ee;color:#242424;border:1px solid #d3d3cf}.theme-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}.theme-heading h2{font-size:20px;margin:0}.theme-heading span{opacity:.55;font-size:12px}.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.card{min-width:0;border:1px solid rgba(127,141,153,.25);border-radius:12px;padding:18px 12px;text-align:center}.card h3{font-size:13px;font-weight:600;margin:0 0 18px}.sizes{display:flex;align-items:flex-end;justify-content:space-evenly;gap:4px;height:135px;border-bottom:1px solid rgba(127,141,153,.18);padding-bottom:15px}.sample{display:flex;align-items:center;flex-direction:column;gap:7px}.sample span,.caption{font-size:11px;opacity:.55}.large{margin:12px auto 0;display:flex;align-items:center;justify-content:center;max-width:280px;aspect-ratio:1}.large img{display:block;max-width:100%;height:auto}.caption{margin:0 0 14px}.download{font-size:12px;color:inherit;text-underline-offset:4px}.muted{opacity:.55}.report{background:#fff;border-radius:20px;padding:28px;margin-top:28px}.report h2{font-size:21px;margin:0 0 15px}.report ul{padding-left:22px;color:#516072}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.metric{padding:18px;background:#f1f4f6;border-radius:12px}.metric strong{display:block;font-size:25px;line-height:1.3;letter-spacing:-.03em}.metric span{font-size:12px;color:#667587}.sourcehash{font-size:11px;overflow-wrap:anywhere;color:#677483;margin-top:20px}details{margin-top:18px}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;background:#f4f6f7;padding:18px;border-radius:10px}.note{font-size:12px;color:#677483;margin:18px 0 0}@media(max-width:1000px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){main{padding:28px 12px}.theme{padding:16px 10px}.cards{grid-template-columns:1fr}.metrics{grid-template-columns:1fr}.report{padding:22px 18px}}
</style></head><body><main><header><p class="eyebrow">NOVA / LOGO RESTORATION / 2026.10.08</p><h1>원본을 기준으로 복원한 세 가지 로고</h1><p>PNG의 두 연결 윤곽을 추출해 Bézier 곡선으로 복원했습니다. 원본의 정사각형 캔버스와 로고 위치를 유지하고, 주변의 미세한 잔여 픽셀만 정리했습니다.</p><p>컬러형에는 원본 내부 색상을 측정한 미세 그라데이션을 적용했습니다. 라이트형과 다크형은 동일한 윤곽을 각각 #FEFEFE와 #242424로 채웠습니다.</p><div class="legend"><span>투명 배경</span><span>동일 경로 / 동일 viewBox</span><span>실제 SVG 벡터</span><span>외부 이미지 · 폰트 요청 없음</span></div></header>'''+''.join(cards)+f'''
<section class="report"><h2>복원 및 검증 기록</h2><div class="metrics"><div class="metric"><strong>{validation['silhouette_iou']*100:.3f}%</strong><span>원본 50% 알파 윤곽과 겹침 · IoU</span></div><div class="metric"><strong>{validation['symmetric_edge_distance_max_px']:.2f}px</strong><span>1254px 기준 최대 윤곽 거리</span></div><div class="metric"><strong>{len(all_curves)}개</strong><span>Bézier 구간 · 두 개의 닫힌 경로</span></div></div><ul><li>원본: 1254 × 1254 RGBA PNG. 세 SVG 모두 viewBox="0 0 1254 1254".</li><li>반투명 가장자리의 색 번짐과 픽셀 노이즈는 벡터의 깨끗한 경계로 정리했습니다. 원본 벡터 마스터를 보유한 것은 아닙니다.</li><li>동일 경로와 렌더링 알파를 자동 비교했습니다. 단색형의 불투명 내부 픽셀은 각각 (254,254,254), (36,36,36)입니다.</li><li>표본 크기는 원본의 투명 여백을 포함한 이미지 캔버스 기준입니다. 흰 심벌은 밝은 배경에서, 검은 심벌은 어두운 배경에서 대비가 낮습니다.</li><li>비교 화면의 모든 이미지가 HTML에 포함되어 있어 네트워크 없이 표시됩니다. 다운로드는 저장소의 실제 SVG 파일을 가리킵니다.</li></ul><div class="sourcehash">원본 SHA-256 · {metadata['source_sha256']}</div><details><summary>측정값과 제작 메타데이터</summary><pre>{json.dumps(metadata, ensure_ascii=False, indent=2)}</pre></details><p class="note">복원 도구: logo-build.py · 검증 데이터: logo-metadata.json · 실제 사이트 로고 적용 전 검토용</p></section></main></body></html>'''
(HERE / "logo-preview.html").write_text(html, encoding="utf-8", newline="\n")

# Independent raster proof sheet, produced by resvg from the saved vector files.
proof = Image.new("RGB", (1280, 730), "#e7e9ed")
draw = ImageDraw.Draw(proof)
for row, background in enumerate(["#111b28", "#f4f3ee"]):
    for col, key in enumerate(images):
        x, y = col*320, row*365
        draw.rectangle((x,y,x+319,y+364), fill=background)
        pixels = original if key == "source" else renders[key]
        tile = Image.fromarray(pixels).resize((296,296), Image.Resampling.LANCZOS)
        proof.paste(tile, (x+12,y+38), tile)
        draw.text((x+15,y+12), key.upper()+" / 296px", fill="#8398ab")
proof.save(HERE / "logo-render-comparison.png")
small_proof = Image.new("RGB", (960, 860), "#e7e9ed")
small_draw = ImageDraw.Draw(small_proof)
for row, background in enumerate(["#111b28", "#f4f3ee"]):
    for col, key in enumerate(images):
        x, y = col*240, row*430
        small_draw.rectangle((x,y,x+239,y+429), fill=background)
        small_draw.text((x+15,y+12), key.upper()+" / actual pixel sizes", fill="#8398ab")
        for size, offset in [(24,50),(48,130),(96,245)]:
            if key == "source":
                tile = Image.fromarray(original).resize((size,size), Image.Resampling.LANCZOS)
            else:
                tile = Image.open(io.BytesIO(resvg_py.svg_to_bytes(svg_string=svgs[key], width=size, height=size, skip_system_fonts=True))).convert("RGBA")
            small_proof.paste(tile, (x+(240-size)//2,y+offset), tile)
            small_draw.text((x+15,y+offset+size+10), f"{size}px", fill="#8398ab")
small_proof.save(HERE / "logo-small-size-proof.png")
edge_proof = np.zeros((SIZE, SIZE, 3), dtype=np.uint8)+245
edge_proof[source_mask & render_mask] = [83, 151, 159]
edge_proof[source_mask & ~render_mask] = [232, 82, 59]
edge_proof[render_mask & ~source_mask] = [134, 60, 215]
Image.fromarray(edge_proof).save(HERE / "logo-outline-error.png")

notes = f'''# NOVA symbol restoration — 2026-10-08

The three SVG files are new vector restorations of `assets/nova-symbol-source.png`.
The pre-existing `assets/nova-symbol.svg` was not reused or changed. The source
PNG is unchanged, SHA-256 `{metadata['source_sha256']}`.

## Method

The alpha mask at 128/255 contains two main components. Their complete outer
boundaries were extracted, smoothed with a periodic Gaussian (sigma 1.1 source
pixels), corrected outward by half a pixel from contour pixel centers to pixel
edges, and fitted with adaptive cubic Bézier curves (sampled-fit tolerance
0.65px). This produced {len(all_curves)} curve segments in two closed subpaths.
All three assets contain exactly the same path data and original 1254-square
framing. No bitmap, external references, background rectangle, or font is used.

The color asset uses a two-stop linear gradient derived from a trimmed affine
fit to original interior RGB samples. The source median is (70,195,230); the
variation is less than one RGB unit per fitted channel across most of the mark.
This intentionally preserves a very subtle gradient, not a newly invented
high-contrast highlight. Light is #FEFEFE and dark is #242424.

## Geometric and color checks

resvg rendered all SVGs at 1254×1254. Clean-source silhouette IoU:
{validation['silhouette_iou']:.8f}. Symmetric edge distance max:
{validation['symmetric_edge_distance_max_px']:.3f}px; 95th percentile:
{validation['symmetric_edge_distance_p95_px']:.3f}px.
Interior mean absolute RGB difference from PNG:
{validation['interior_rgb_mae']} (0–255 scale, before compositing).
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
'''
(HERE / "logo-restoration.md").write_text(notes, encoding="utf-8", newline="\n")
print(json.dumps(metadata, ensure_ascii=False, indent=2))

"""Read-only Prism phase 1 source checks; writes this directory's JSON report only.

Run from any directory: python docs/renewal/prism-phase-1/static-verify.py
This verifies source structure and preserved content, not rendered behavior.
"""

from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[3]
ARCHIVE = ROOT / "docs/preservation/2026-10-08"
SNAPSHOT = ARCHIVE / "snapshot"
OUTPUT = Path(__file__).with_name("static-verification.json")
EXPECTED = {
    "index.html", "company.html", "solutions.html", "hvac.html",
    "ventilation.html", "air-system.html", "parts-control.html", "edim.html",
    "technology.html", "resources.html", "contact.html",
}
UNCHANGED_MAIN = EXPECTED - {"index.html", "solutions.html", "hvac.html"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class Source(HTMLParser):
    def __init__(self, value):
        super().__init__(convert_charrefs=True)
        self.elements = []
        self.text = []
        self.stack = []
        self.feed(value)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        element = {"tag": tag, "attrs": attrs, "line": self.getpos()[0],
                   "hidden": "hidden" in attrs or any("hidden" in a for _, a in self.stack)}
        self.elements.append(element)
        if tag not in VOID:
            self.stack.append((tag, attrs))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, value):
        normalized = " ".join(value.split())
        if normalized and not any(tag in {"script", "style"} for tag, _ in self.stack):
            self.text.append(normalized)

    def refs(self, attr):
        return [element["attrs"][attr] for element in self.elements if attr in element["attrs"]]


def read(path):
    return path.read_text(encoding="utf-8-sig")


def main(value):
    match = re.search(r"<main\b[^>]*>[\s\S]*?</main\s*>", value, re.I)
    return match.group() if match else ""


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def relative(path):
    return path.relative_to(ROOT).as_posix()


failures = []
pages = {path.name: Source(read(path)) for path in sorted(ROOT.glob("*.html"))}
ids = {name: Counter(source.refs("id")) for name, source in pages.items()}
if set(pages) != EXPECTED:
    failures.append({"check": "page_inventory", "actual": sorted(pages), "expected": sorted(EXPECTED)})


def inspect_ref(file, value, origin, anchor=True):
    """Resolve local web URLs as served from the project root; no network access."""
    if not value or value.startswith(("data:", "//")):
        return "inline-or-external"
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        return "external"
    decoded = unquote(parsed.path)
    target = ((ROOT / decoded.lstrip("/")) if decoded.startswith("/") else (file.parent / decoded)) if decoded else file
    target = target.resolve()
    if not target.is_relative_to(ROOT):
        failures.append({"check": "local_reference", "file": relative(file), "origin": origin, "value": value, "reason": "outside project"})
        return "broken"
    if target.is_dir():
        target = target / "index.html"
    if not target.is_file():
        failures.append({"check": "local_reference", "file": relative(file), "origin": origin, "value": value, "reason": "missing file"})
        return "broken"
    if anchor and parsed.fragment and target.suffix.lower() == ".html":
        target_ids = ids.get(target.name) if target.parent == ROOT else None
        if target_ids is None:
            target_ids = Counter(Source(read(target)).refs("id"))
        if unquote(parsed.fragment) not in target_ids:
            failures.append({"check": "local_anchor", "file": relative(file), "origin": origin, "value": value, "reason": "missing target id"})
            return "broken"
    return "local-valid"


link_checks = []
for name, source in pages.items():
    counts = Counter()
    for element in source.elements:
        attrs = element["attrs"]
        for attr in ("href", "src", "poster", "action", "data-src", "data-model-src"):
            if attr in attrs:
                counts[inspect_ref(ROOT / name, attrs[attr], f"{element['tag']}[{attr}] line {element['line']}")] += 1
        for attr in ("aria-controls", "aria-labelledby", "aria-describedby"):
            if attr in attrs:
                for target in attrs[attr].split():
                    if target not in ids[name]:
                        failures.append({"check": "aria_reference", "file": name, "attribute": attr, "target": target, "line": element["line"]})
        if element["tag"] == "img" and "alt" not in attrs:
            failures.append({"check": "image_alt", "file": name, "line": element["line"]})
    duplicate_ids = [key for key, count in ids[name].items() if count > 1]
    if duplicate_ids:
        failures.append({"check": "duplicate_ids", "file": name, "ids": duplicate_ids})
    stylesheets = [e["attrs"].get("href") for e in source.elements if e["tag"] == "link" and e["attrs"].get("rel") == "stylesheet"]
    scripts = [e["attrs"].get("src") for e in source.elements if e["tag"] == "script" and e["attrs"].get("src")]
    repeated_resources = [key for key, count in Counter(stylesheets + scripts).items() if count > 1]
    if repeated_resources:
        failures.append({"check": "duplicate_styles_scripts", "file": name, "values": repeated_resources})
    link_checks.append({"page": name, "reference_counts": dict(counts), "id_count": len(ids[name]),
                        "duplicate_ids": duplicate_ids, "duplicate_styles_scripts": repeated_resources})


asset_checks = []
for file in sorted([*ROOT.glob("*.css"), *ROOT.glob("*.js")]):
    value = read(file)
    refs = set(re.findall(r"(?:\./)?assets/[A-Za-z0-9_./%+\-]+\.(?:png|jpe?g|webp|gif|svg|glb|woff2?|ttf|otf|mp4|webm|json|txt)(?:\?[^\s\"'<>`]*)?", value))
    refs.update(re.findall(r"\./[a-zA-Z0-9_-]+\.html(?:#[a-zA-Z0-9_-]+)?", value))
    if file.suffix == ".css":
        refs.update(match[1] for match in re.findall(r"url\(\s*(['\"]?)([^)\s]+?)\1\s*\)", value))
    for reference in sorted(refs):
        result = inspect_ref(file, reference, "static CSS/JS URL literal")
        asset_checks.append({"file": file.name, "reference": reference, "status": result})


content_checks = []
for name in sorted(EXPECTED & set(pages)):
    before_main, after_main = main(read(SNAPSHOT / name)), main(read(ROOT / name))
    before, after = Source(before_main), Source(after_main)
    removed = list((Counter(before.text) - Counter(after.text)).elements())
    entry = {"page": name, "main_exact_after_line_ending_normalization": before_main == after_main,
             "original_text_nodes_missing": removed}
    if name in UNCHANGED_MAIN and before_main != after_main:
        failures.append({"check": "unchanged_detail_main", "file": name})
    if name in {"solutions.html", "hvac.html"}:
        missing_links = list((Counter(before.refs("href")) - Counter(after.refs("href"))).elements())
        before_images = Counter((e["attrs"].get("src"), e["attrs"].get("alt")) for e in before.elements if e["tag"] == "img")
        after_images = Counter((e["attrs"].get("src"), e["attrs"].get("alt")) for e in after.elements if e["tag"] == "img")
        missing_images = list((before_images - after_images).elements())
        entry.update({"original_links_missing": missing_links, "original_image_and_alt_pairs_missing": missing_images})
        allowed = Counter({"카드를 좌우로 넘겨 제품군을 확인하세요.": 1, "←": 2, "→": 2}) if name == "solutions.html" else Counter()
        unexpected = list((Counter(removed) - allowed).elements())
        if missing_links or missing_images or unexpected:
            failures.append({"check": "catalog_preservation", "file": name, "missing_links": missing_links,
                             "missing_images": missing_images, "unexpected_missing_text": unexpected})
        entry["approved_change"] = "슬라이더 조작을 필터로 교체하여 안내 문구와 화살표를 변경하고 개발 중 배지를 추가함." if name == "solutions.html" else "필터 버튼을 추가함. 기존 본문 문구·제품 이미지·링크는 모두 유지함."
    if name == "index.html":
        # This is a redesign audit: check preserved copy as text, while explicitly documenting UI/decorative changes.
        expected_changed = Counter({"Engineering Manufacturing,": 1, "From Product to Data.": 1,
                                    "Contact Us": 1, "Scroll Down": 1, "CLEAN AIR": 1, "STABLE OPERATION": 1,
                                    "02 / EDIM": 1, "FROM DATA": 1, "TO SMARTER MANUFACTURING": 1})
        unexpected = list((Counter(removed) - expected_changed).elements())
        korean_missing = [text for text in removed if re.search(r"[가-힣]", text)]
        original_tagline_in_page = "Engineering Manufacturing, From Product to Data." in " ".join(pages[name].text)
        entry.update({"korean_original_copy_missing": korean_missing, "original_full_tagline_retained_in_footer": original_tagline_in_page,
                      "unexpected_missing_text": unexpected,
                      "intentional_changes": "영문 히어로 문구 재구성, 반복 Contact Us 1개와 스크롤 안내/장식 레이블 제거. 원래 영문 태그라인은 footer에 유지함. 제품 탐색·개발 중 고지를 추가함."})
        if unexpected or korean_missing or not original_tagline_in_page:
            failures.append({"check": "home_copy_preservation", "unexpected_missing_text": unexpected,
                             "korean_missing": korean_missing, "original_tagline_in_page": original_tagline_in_page})
    content_checks.append(entry)


catalog_checks = []
expected_hvac_links = {
    "./ventilation.html#eurus", "./ventilation.html#partial", "./ventilation.html#pullout", "./ventilation.html#fan-model",
    "./air-system.html#ahu", "./air-system.html#bio-hvac", "./air-system.html#ief", "./air-system.html#iaqs",
    "./parts-control.html#clt", "./parts-control.html#fcm", "./parts-control.html#ecm",
}
for name in ("solutions.html", "hvac.html"):
    source = Source(main(read(ROOT / name)))
    cards = [element for element in source.elements if "data-prism-card" in element["attrs"]]
    filters = [element for element in source.elements if "data-prism-filter" in element["attrs"]]
    controls = [element for element in source.elements if "data-prism-filter-controls" in element["attrs"]]
    targets = [element for element in source.elements if "data-prism-category" in element["attrs"]]
    hrefs = {element["attrs"].get("href") for element in cards}
    entry = {"page": name, "card_count": len(cards), "hvac_destinations_present": len(expected_hvac_links & hrefs),
             "edim_entry_card_count": sum((href or "").startswith("./edim.html") for href in hrefs),
             "filter_values": [element["attrs"]["data-prism-filter"] for element in filters],
             "filter_target_counts": dict(Counter(element["attrs"]["data-prism-category"] for element in targets)),
             "all_cards_visible_without_javascript": all(not card["hidden"] for card in cards),
             "controls_hidden_until_javascript": len(controls) == 1 and controls[0]["hidden"],
             "native_anchors_and_buttons": all(card["tag"] == "a" for card in cards) and all(button["tag"] == "button" and button["attrs"].get("type") == "button" for button in filters)}
    if not expected_hvac_links <= hrefs or not entry["all_cards_visible_without_javascript"] or not entry["controls_hidden_until_javascript"] or not entry["native_anchors_and_buttons"] or len(cards) != (15 if name == "solutions.html" else 11):
        failures.append({"check": "catalog_structure", "file": name, "result": entry})
    catalog_checks.append(entry)


manifest = json.loads(read(ARCHIVE / "baseline-manifest.json"))
snapshot_checks = []
for expected in manifest["files"]:
    file = SNAPSHOT / expected["path"]
    actual_hash = digest(file) if file.is_file() else None
    actual_bytes = file.stat().st_size if file.is_file() else None
    passed = actual_hash == expected["sha256"] and actual_bytes == expected["bytes"]
    snapshot_checks.append({"path": expected["path"], "status": "pass" if passed else "fail"})
    if not passed:
        failures.append({"check": "snapshot_integrity", "path": expected["path"], "actual_sha256": actual_hash, "actual_bytes": actual_bytes})
snapshot_actual_files = {path.relative_to(SNAPSHOT).as_posix() for path in SNAPSHOT.rglob("*") if path.is_file()}
snapshot_expected_files = {entry["path"] for entry in manifest["files"]}
if snapshot_actual_files != snapshot_expected_files:
    failures.append({"check": "snapshot_inventory", "unexpected": sorted(snapshot_actual_files - snapshot_expected_files), "missing": sorted(snapshot_expected_files - snapshot_actual_files)})


catalog_css = read(ROOT / "prism-catalog.css")
prism_js = read(ROOT / "prism.js")
css_contract = {
    "spotlight_css_accepts_percentage_variables": "var(--pr-x, 65%) var(--pr-y, 18%)" in catalog_css,
    "javascript_writes_spotlight_percentages": "`${x*100}%`" in prism_js and "`${y*100}%`" in prism_js,
    "catalog_explicit_hidden_override": ".prism-catalog .prism-catalog-main [hidden] { display: none !important; }" in catalog_css,
    "catalog_reduced_motion_rule": "prefers-reduced-motion: reduce" in catalog_css,
    "mobile_480_rule": "@media (max-width: 480px)" in catalog_css,
}
for check, passed in css_contract.items():
    if not passed:
        failures.append({"check": "css_js_contract", "contract": check})


report = {
    "schema_version": 1,
    "generated_at_utc": datetime.now(timezone.utc).isoformat(),
    "status": "pass" if not failures else "fail",
    "scope": "현재 11개 HTML, 정적 CSS/JS 경로, 개편한 3페이지 본문 대조, 상세 8페이지 main 무변경, 62개 동결 원본 해시 검증",
    "baseline_commit": manifest["baseline_commit"],
    "limitations": ["읽기 전용 정적 검증 결과이며 실제 브라우저 렌더링·키보드 동작·모바일 넘침 검증은 별도입니다.",
                    "외부 URL/서비스의 응답 여부는 이 검사에서 확인하지 않습니다.",
                    "JavaScript로 계산되는 동적 URL 전체를 평가하지 않으며 정적 URL 리터럴을 검사합니다.",
                    "페이지별 텍스트 검사는 script/style을 제외한 원문 노드와 hidden 패널을 포함합니다."],
    "summary": {"html_pages": len(pages), "unchanged_detail_mains": sum(entry["page"] in UNCHANGED_MAIN and entry["main_exact_after_line_ending_normalization"] for entry in content_checks),
                "snapshot_files_checked": len(snapshot_checks), "snapshot_files_passed": sum(entry["status"] == "pass" for entry in snapshot_checks),
                "static_css_js_references_checked": len(asset_checks), "failures": len(failures)},
    "page_references": link_checks,
    "static_css_js_references": asset_checks,
    "content_preservation": content_checks,
    "catalog_structure": catalog_checks,
    "css_javascript_contract": css_contract,
    "snapshot_integrity": snapshot_checks,
    "failures": failures,
}
OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
sys.stdout.reconfigure(encoding="utf-8")
print(json.dumps({"status": report["status"], **report["summary"], "output": relative(OUTPUT), "findings": failures}, ensure_ascii=False, indent=2))
sys.exit(bool(failures))

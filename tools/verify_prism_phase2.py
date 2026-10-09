#!/usr/bin/env python3
"""Verify Prism phase 2 content against the immutable 2026-10-08 snapshot.

This script only reads production HTML and the preservation archive. It writes
renewal/prism-phase-2/content-verification.json beneath the external DOCS_ROOT
(NOVA_DOCS_DIR or the sibling docs directory) and exits nonzero on failure.
It does not run JavaScript, contact external services, or submit inquiry forms.
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
from reference_paths import ROOT, DOCS_ROOT


ARCHIVE = DOCS_ROOT / "preservation/2026-10-08"
SNAPSHOT = ARCHIVE / "snapshot"
OUTPUT = DOCS_ROOT / "renewal/prism-phase-2/content-verification.json"
PAGES = (
    "company", "ventilation", "air-system", "parts-control",
    "edim", "technology", "resources", "contact",
)
FIELD_ATTRIBUTES = (
    "name", "type", "value", "required", "autocomplete", "rows", "placeholder",
)
FORM_ATTRIBUTES = ("action", "method", "accept-charset", "name")
COMPANY_STORIES = ("about", "mission", "history", "foundation", "location")
COMPANY_OLD_INSTRUCTION = "카드를 선택하면 각 이야기가 화면 위로 확장됩니다."
COMPANY_NEW_INSTRUCTION = "항목을 선택하면 자세한 내용이 아래로 펼쳐집니다."
VOID_ELEMENTS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class Source(HTMLParser):
    def __init__(self, value):
        super().__init__(convert_charrefs=True)
        self.nodes = []
        self.text = []
        self.text_records = []
        self.stack = []
        self.script_style_depth = 0
        self.feed(value)

    def handle_starttag(self, tag, attrs):
        self.nodes.append({"tag": tag, "attrs": dict(attrs), "line": self.getpos()[0], "ancestors": tuple(self.stack)})
        if tag not in VOID_ELEMENTS:
            self.stack.append(len(self.nodes) - 1)
        if tag in {"script", "style"}:
            self.script_style_depth += 1

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for position in range(len(self.stack) - 1, -1, -1):
            if self.nodes[self.stack[position]]["tag"] == tag:
                del self.stack[position:]
                break
        if tag in {"script", "style"}:
            self.script_style_depth -= 1

    def handle_data(self, value):
        value = " ".join(value.split())
        if value and not self.script_style_depth:
            self.text.append(value)
            self.text_records.append({"text": value, "ancestors": tuple(self.stack)})

    def refs(self, attribute):
        return Counter(node["attrs"][attribute] for node in self.nodes if attribute in node["attrs"])


def read(path):
    return path.read_text(encoding="utf-8-sig")


def main(value):
    match = re.search(r"<main\b[\s\S]*?</main\s*>", value, re.I)
    if not match:
        raise ValueError("HTML main element is missing")
    return match.group()


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def signatures(source, tags, attributes):
    return Counter(
        (node["tag"], tuple((name, name in node["attrs"], node["attrs"].get(name)) for name in attributes))
        for node in source.nodes if node["tag"] in tags
    )


def missing(before, after):
    return list((before - after).elements())


def company_ui_migration(before, after):
    """Permit only the five reviewed modal triggers' native-accordion migration.

    Original story sections are checked independently, so an allowed CTA arrow
    or label cannot conceal a missing copy of the same text inside the content.
    No original link, media, ID, form transport or snapshot hash is exempted.
    """
    issues = []
    migrated_buttons = set()
    allowed_text = Counter()
    controls = []
    details = [index for index, node in enumerate(after.nodes) if node["tag"] == "details" and "data-company-accordion" in node["attrs"]]
    if len(details) != 5:
        issues.append({"reason": "expected exactly five native story accordions", "count": len(details)})
    for story in COMPANY_STORIES:
        old = [(index, node) for index, node in enumerate(before.nodes) if node["attrs"].get("data-company-open") == story]
        new = [(index, node) for index, node in enumerate(after.nodes) if node["attrs"].get("data-company-open") == story]
        valid = len(old) == len(new) == 1
        if valid:
            old_index, old_node = old[0]
            new_index, new_node = new[0]
            parent = new_node["ancestors"][-1] if new_node["ancestors"] else None
            valid = old_node["tag"] == "button" and old_node["attrs"].get("type") == "button" and new_node["tag"] == "summary" and parent in details
            valid = valid and new_node["attrs"].get("id") == f"company-trigger-{story}"
            valid = valid and new_node["attrs"].get("aria-controls", story) == story
            if valid:
                children = [node for node in after.nodes if node["ancestors"] and node["ancestors"][-1] == parent]
                valid = children[0] is new_node and sum(node["tag"] == "summary" for node in children) == 1
        panels = [(index, node) for index, node in enumerate(after.nodes) if node["attrs"].get("id") == story]
        if valid:
            valid = len(panels) == 1 and panels[0][1]["tag"] == "section" and "data-company-panel" in panels[0][1]["attrs"] and parent in panels[0][1]["ancestors"]
        if not valid:
            issues.append({"story": story, "reason": "original button must map to one native summary and its original nested section"})
            continue
        migrated_buttons.add(old_index)
        controls.append({"target": story, "from": "button[type=button][data-company-open]", "to": "details > summary[data-company-open]", "summary_id": new_node["attrs"]["id"]})
        expected_cta = Counter({"Open Map" if story == "location" else "Open": 1, "↗": 1})
        actual_cta = Counter(record["text"] for record in before.text_records if old_index in record["ancestors"] and any(before.nodes[index]["tag"] == "b" for index in record["ancestors"]))
        if actual_cta == expected_cta:
            allowed_text.update(actual_cta)
        else:
            issues.append({"story": story, "reason": "baseline CTA differs from the reviewed exact labels"})
        original_panels = [index for index, node in enumerate(before.nodes) if node["attrs"].get("id") == story]
        original_copy = Counter(record["text"] for record in before.text_records if any(index in record["ancestors"] for index in original_panels))
        current_copy = Counter(record["text"] for record in after.text_records if panels[0][0] in record["ancestors"])
        lost_copy = missing(original_copy, current_copy)
        if lost_copy:
            issues.append({"story": story, "reason": "original story content changed", "missing_text": lost_copy})
    old_instruction = [record for record in before.text_records if record["text"] == COMPANY_OLD_INSTRUCTION and any("company-card-heading" in before.nodes[index]["attrs"].get("class", "").split() for index in record["ancestors"])]
    new_instruction = [record for record in after.text_records if record["text"] == COMPANY_NEW_INSTRUCTION and any("company-card-heading" in after.nodes[index]["attrs"].get("class", "").split() for index in record["ancestors"])]
    if len(old_instruction) == len(new_instruction) == 1:
        allowed_text[COMPANY_OLD_INSTRUCTION] += 1
    else:
        issues.append({"reason": "exact accordion instruction replacement is missing or duplicated"})
    return {
        "migrated_button_indices": migrated_buttons,
        "allowed_text": allowed_text,
        "controls": controls,
        "issues": issues,
    }


def verify():
    failures = []
    reports = []
    current_documents = {path.name: Source(read(path)) for path in ROOT.glob("*.html")}
    current_ids = {name: source.refs("id") for name, source in current_documents.items()}

    def check_reference(file, value, origin):
        if not value or value.startswith(("data:", "//")):
            return "inline-or-external"
        parsed = urlsplit(value)
        if parsed.scheme or parsed.netloc:
            return "external-not-requested"
        path = unquote(parsed.path)
        target = (ROOT / path.lstrip("/")) if path.startswith("/") else (file.parent / path if path else file)
        target = target.resolve()
        if not target.is_relative_to(ROOT):
            failures.append({"check": "local_reference", "page": file.name, "origin": origin, "url": value, "reason": "outside repository"})
            return "broken"
        if target.is_dir():
            target /= "index.html"
        if not target.is_file():
            failures.append({"check": "local_reference", "page": file.name, "origin": origin, "url": value, "reason": "missing file"})
            return "broken"
        if parsed.fragment and target.suffix == ".html":
            ids = current_ids.get(target.name) if target.parent == ROOT else None
            if ids is None:
                ids = Source(read(target)).refs("id")
            if unquote(parsed.fragment) not in ids:
                failures.append({"check": "local_anchor", "page": file.name, "origin": origin, "url": value, "reason": "missing id"})
                return "broken"
        return "local-valid"

    for page in PAGES:
        file = ROOT / f"{page}.html"
        before_html = main(read(SNAPSHOT / file.name))
        after_document = read(file)
        after_html = main(after_document)
        before, after = Source(before_html), Source(after_html)
        migration = company_ui_migration(before, after) if page == "company" else {"migrated_button_indices": set(), "allowed_text": Counter(), "controls": [], "issues": []}
        raw_removed_text = Counter(before.text) - Counter(after.text)
        migrated_text = raw_removed_text & migration["allowed_text"]
        removed_text = list((raw_removed_text - migrated_text).elements())
        removed_links = missing(before.refs("href"), after.refs("href"))
        removed_ids = missing(before.refs("id"), after.refs("id"))
        image_attributes = ("src", "poster", "alt")
        removed_media = missing(signatures(before, {"img", "model-viewer"}, image_attributes), signatures(after, {"img", "model-viewer"}, image_attributes))
        original_fields = Counter(
            (node["tag"], tuple((name, name in node["attrs"], node["attrs"].get(name)) for name in FIELD_ATTRIBUTES))
            for index, node in enumerate(before.nodes)
            if node["tag"] in {"input", "select", "textarea", "button"} and index not in migration["migrated_button_indices"]
        )
        removed_fields = missing(original_fields, signatures(after, {"input", "select", "textarea", "button"}, FIELD_ATTRIBUTES))
        changed_forms = missing(signatures(before, {"form"}, FORM_ATTRIBUTES), signatures(after, {"form"}, FORM_ATTRIBUTES))
        svg_before = Counter(re.findall(r"<svg\b[\s\S]*?</svg\s*>", before_html, re.I))
        svg_after = Counter(re.findall(r"<svg\b[\s\S]*?</svg\s*>", after_html, re.I))
        removed_svg = missing(svg_before, svg_after)
        retained_hooks = Counter((node["tag"], name, value) for node in before.nodes for name, value in node["attrs"].items() if name.startswith("data-"))
        expected_hooks = retained_hooks.copy()
        for index in migration["migrated_button_indices"]:
            story = before.nodes[index]["attrs"]["data-company-open"]
            expected_hooks[("button", "data-company-open", story)] -= 1
            expected_hooks[("summary", "data-company-open", story)] += 1
        current_hooks = Counter((node["tag"], name, value) for node in after.nodes for name, value in node["attrs"].items() if name.startswith("data-"))
        removed_hooks = missing(expected_hooks, current_hooks)
        findings = {
            "missing_original_text_nodes": removed_text,
            "missing_original_links": removed_links,
            "missing_original_ids": removed_ids,
            "missing_original_image_model_signatures": removed_media,
            "changed_original_field_signatures": removed_fields,
            "changed_original_form_transport": changed_forms,
            "missing_original_data_hooks": removed_hooks,
            "changed_original_inline_svg_count": len(removed_svg),
            "invalid_authorized_ui_migrations": migration["issues"],
        }
        if any(findings.values()):
            failures.append({"check": "semantic_preservation", "page": file.name, **findings})

        reference_counts = Counter()
        full_source = current_documents[file.name]
        for node in full_source.nodes:
            for attribute in ("href", "src", "poster", "action"):
                if attribute in node["attrs"]:
                    reference_counts[check_reference(file, node["attrs"][attribute], f"{node['tag']}[{attribute}] line {node['line']}")] += 1
        duplicates = [value for value, count in full_source.refs("id").items() if count > 1]
        if duplicates:
            failures.append({"check": "duplicate_ids", "page": file.name, "ids": duplicates})
        detail_stylesheets = sum(
            node["tag"] == "link" and urlsplit(node["attrs"].get("href", "")).path == "./prism-detail.css"
            for node in full_source.nodes
        )
        if detail_stylesheets != 1:
            failures.append({"check": "detail_stylesheet", "page": file.name, "count": detail_stylesheets})

        reports.append({
            "page": file.name,
            "status": "pass" if not any(findings.values()) and not duplicates and detail_stylesheets == 1 and not reference_counts["broken"] else "fail",
            "source_text_node_count": len(before.text),
            "preserved_source_text_node_count": len(before.text) - sum(raw_removed_text.values()),
            "authorized_ui_text_migration_count": sum(migrated_text.values()),
            "authorized_ui_control_migration_count": len(migration["controls"]),
            "authorized_ui_migrations": {
                "instruction_replacement": {"from": COMPANY_OLD_INSTRUCTION, "to": COMPANY_NEW_INSTRUCTION} if page == "company" else None,
                "replaced_original_text_nodes": [{"text": text, "count": count} for text, count in migrated_text.items()],
                "native_control_replacements": migration["controls"],
            },
            "added_text_node_count": len(missing(Counter(after.text), Counter(before.text))),
            "original_link_count": sum(before.refs("href").values()),
            "original_id_count": sum(before.refs("id").values()),
            "original_image_model_count": sum(signatures(before, {"img", "model-viewer"}, image_attributes).values()),
            "original_inline_svg_count": sum(svg_before.values()),
            "original_data_hook_count": sum(retained_hooks.values()),
            "reference_checks": dict(reference_counts),
            "duplicate_ids": duplicates,
            "detail_stylesheet_count": detail_stylesheets,
            **findings,
        })

    # Verify that the deliberate structural changes also keep their source IDs.
    air = main(read(ROOT / "air-system.html"))
    air_order = re.findall(r'<section\b[^>]*\bid="([^"]+)"', air)
    expected_air_order = ["ahu", "capabilities", "control", "bio-hvac", "ief", "iaqs"]
    if air_order != expected_air_order:
        failures.append({"check": "ahu_grouping", "actual": air_order, "expected": expected_air_order})
    contact = Source(main(read(ROOT / "contact.html")))
    product_fields = [node for node in contact.nodes if node["tag"] == "select" and node["attrs"].get("name") == "product"]
    no_js_product_select = len(product_fields) == 1 and "disabled" not in product_fields[0]["attrs"] and "required" in product_fields[0]["attrs"]
    product_option_count = sum(node["tag"] == "option" and bool(node["attrs"].get("value")) for node in contact.nodes)
    if not no_js_product_select or product_option_count != 20:
        failures.append({"check": "contact_static_options", "usable_without_javascript": no_js_product_select, "nonempty_options": product_option_count})
    operating_examples = {
        page: sum("pd-example-note" in node["attrs"].get("class", "").split() for node in current_documents[f"{page}.html"].nodes)
        for page in ("air-system", "parts-control")
    }
    if operating_examples != {"air-system": 1, "parts-control": 3}:
        failures.append({"check": "operating_example_notices", "actual": operating_examples})

    manifest = json.loads(read(ARCHIVE / "baseline-manifest.json"))
    snapshot_checks = []
    for entry in manifest["files"]:
        file = SNAPSHOT / entry["path"]
        actual_hash = digest(file) if file.is_file() else None
        actual_bytes = file.stat().st_size if file.is_file() else None
        passed = actual_hash == entry["sha256"] and actual_bytes == entry["bytes"]
        snapshot_checks.append({"path": entry["path"], "sha256": actual_hash, "bytes": actual_bytes, "status": "pass" if passed else "fail"})
        if not passed:
            failures.append({"check": "snapshot_integrity", "path": entry["path"]})
    actual_inventory = {path.relative_to(SNAPSHOT).as_posix() for path in SNAPSHOT.rglob("*") if path.is_file()}
    expected_inventory = {entry["path"] for entry in manifest["files"]}
    if actual_inventory != expected_inventory:
        failures.append({"check": "snapshot_inventory", "missing": sorted(expected_inventory - actual_inventory), "unexpected": sorted(actual_inventory - expected_inventory)})

    return {
        "schema_version": 2,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "status": "pass" if not failures else "fail",
        "baseline_commit": manifest["baseline_commit"],
        "baseline_manifest": "docs/preservation/2026-10-08/baseline-manifest.json",
        "command": "python tools/verify_prism_phase2.py",
        "scope": "상세 8페이지의 원문·수치·단위·각주가 포함된 text 노드, 링크·id·미디어·폼·기능 hook·SVG 보존 및 동결 원본 무변경 검증",
        "method": "script/style을 제외한 main의 정규화된 text 노드와 속성 signature를 개수까지 대조합니다. 숨겨진 패널을 포함하며, 원문 순서는 AHU 재배치 때문에 비교하지 않습니다. Company의 승인된 모달→아코디언 UI 문구/컨트롤 전환만 정확한 값과 개수로 별도 집계하며, 5개 상세 섹션 본문은 각각 추가로 엄격 대조합니다.",
        "limitations": [
            "정적 소스 검증이며 시각 품질·실행 중 DOM·포커스 이동·3D 동작·반응형 넘침은 별도 브라우저 QA에서 검증합니다.",
            "외부 서비스에 요청하거나 실제 문의 폼을 제출하지 않습니다.",
            "추가 문구는 허용하며 원문 text 노드/속성 누락을 검사합니다. HTML 의미가 같아도 원문 노드를 합치거나 나누면 재검토가 필요한 차이로 보고될 수 있습니다.",
        ],
        "intentional_changes": [
            "원래 주소와 문구를 유지한 채 AHU capabilities/control 영역을 AHU 소개 뒤로 이동함.",
            "제품·기술 목차와 운영 예시 고지를 추가함.",
            "Contact 제품 select의 disabled를 제거하고 기존 JS와 같은 20개 정적 옵션을 제공함.",
            "JavaScript가 없는 환경에서 팬 사양과 CLT 포스터/모델 설명을 읽을 수 있도록 보완함.",
            "Company의 5개 모달 버튼을 원래 섹션과 연결한 native details/summary로 변경하고 안내 문장 1개와 Open/Open Map/화살표 CTA 10개 text 노드를 교체함. 교체 노드는 원문 그대로 보존한 노드 수에 포함하지 않음.",
        ],
        "summary": {
            "pages_checked": len(reports),
            "pages_passed": sum(report["status"] == "pass" for report in reports),
            "source_text_nodes": sum(report["source_text_node_count"] for report in reports),
            "preserved_source_text_nodes": sum(report["preserved_source_text_node_count"] for report in reports),
            "authorized_ui_text_migrations": sum(report["authorized_ui_text_migration_count"] for report in reports),
            "authorized_ui_control_migrations": sum(report["authorized_ui_control_migration_count"] for report in reports),
            "original_inline_svgs_checked": sum(report["original_inline_svg_count"] for report in reports),
            "snapshot_files_checked": len(snapshot_checks),
            "snapshot_files_passed": sum(entry["status"] == "pass" for entry in snapshot_checks),
            "failures": len(failures),
        },
        "pages": reports,
        "structural_checks": {"air_system_product_section_order": air_order, "contact_static_product_options": product_option_count, "contact_select_usable_without_javascript": no_js_product_select, "operating_example_notices": operating_examples},
        "snapshot_integrity": snapshot_checks,
        "failures": failures,
    }


if __name__ == "__main__":
    try:
        report = verify()
    except Exception as error:
        report = {"schema_version": 1, "generated_at_utc": datetime.now(timezone.utc).isoformat(), "status": "fail", "failures": [{"check": "verification_setup", "reason": str(error)}]}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps({"status": report["status"], **report.get("summary", {}), "report": str(OUTPUT), "findings": report["failures"]}, ensure_ascii=False, indent=2))
    sys.exit(report["status"] != "pass")

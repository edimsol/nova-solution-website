#!/usr/bin/env python3
"""Build the 2026-10-08 preservation library using only the Python standard library.

Inputs are the immutable snapshot and optional browser-checks.json. This command
never reads or changes the live website's HTML, CSS, JavaScript, or assets.
"""
from __future__ import annotations

import base64
import hashlib
import html
import json
import mimetypes
import re
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "docs" / "preservation" / "2026-10-08"
SNAPSHOT = BASE / "snapshot"
PAGES = BASE / "pages"
COMMIT = "17940aeff93b3ea17179a9a9048886e3b8ee6ed8"
VOID = set("area base br col embed hr img input link meta param source track wbr".split())
ORDER = ["index", "company", "solutions", "hvac", "ventilation", "air-system", "parts-control", "edim", "technology", "resources", "contact"]

META = {
    "index": {
        "label": "홈", "purpose": "제조 엔지니어링과 제조 데이터 사업을 연결하는 브랜드 메시지 및 주요 솔루션 안내.",
        "sections": "Home · Company · Solutions · Technology · Industries · Contact의 여섯 화면과 최초 진입 로고 연출.",
        "features": [
            ["최초 진입", "원본 body의 home-entry가 로고·링·상태 문구를 표시합니다. 일반 환경은 1,750ms 애니메이션 후 종료하고, reduced-motion에서는 신속히 종료합니다.", "script.js:5–31"],
            ["전체 화면 이동", "여섯 슬라이드, 페이지 표시점, 현재/전체 카운터, 안내 문구를 JS로 생성합니다. 휠·포인터 스와이프·방향키·표시점으로 이동하며, 내부 스크롤 가능 여부와 전환 잠금을 검사합니다.", "script.js:206–311"],
            ["솔루션 카드", "HVAC와 EDIM 카드는 해당 상세 페이지로 이동하며 정밀 포인터 환경에서 기울기·이미지 위치가 반응합니다.", "script.js:777–797"],
            ["문의 CTA", "마지막 화면의 Contact Us는 홈페이지 문의 폼이 아니라 ys.lee@edimsol.com으로 향하는 mailto 링크입니다.", "index.html / #contact"],
        ],
        "limits": ["본문 바로가기 원문은 ‘본문으로 바로가기!!’입니다.", "슬라이드의 정지 화면 한 장만으로는 여섯 화면의 콘텐츠를 모두 보존할 수 없습니다."],
        "extra_images": ["assets/home-hero-data-wave.png"],
    },
    "company": {
        "label": "회사 소개", "purpose": "회사 정체성·방향·제조 기반·위치 소개.",
        "sections": "소개, Mission & Vision, History, Manufacturing Foundation, Location의 다섯 카드와 상세 패널.",
        "features": [
            ["회사 상세 패널", "JS가 다섯 원문 section을 dialog로 전환합니다. 카드 선택과 company.html#패널 링크로 열며 주소 hash를 갱신합니다. 닫기 버튼·배경·Escape로 닫고 열었던 카드로 포커스를 돌립니다.", "script.js:630–715"],
            ["지도", "Leaflet 지도를 [37.2140373,127.1019493]에 생성하고 OpenStreetMap 타일을 사용합니다. 위치 패널을 열면 크기를 재계산하고 zoom 17로 이동합니다. 외부 Kakao Maps 검색 링크도 있습니다.", "script.js:573–628, 675–680"],
        ],
        "limits": ["History의 FOUNDATION / BUILD / NEXT에는 연도나 구체적인 날짜가 없습니다.", "지도 타일 및 Leaflet CDN은 외부 네트워크가 필요합니다. 이 문서는 원문 주소와 링크, 검증 증거를 보존하며 지도를 실행하지 않습니다."],
        "extra_images": ["assets/menu-company-building.png", "assets/menu-technology-blueprint.png"],
    },
    "solutions": {
        "label": "솔루션 전체", "purpose": "HVAC 제품군과 EDIM 기능군을 한 화면에서 탐색하도록 안내.",
        "sections": "HVAC 11개 제품 카드, EDIM 4개 기능 카드와 각각의 overview 링크.",
        "features": [["무한 카드 슬라이더", "원본 카드의 복제본을 생성하여 무한 순환합니다. 이전/다음, 자동 이동, 포인터 드래그, 키보드 포커스와 상호작용 일시정지 처리가 있습니다. 본문 원문에는 복제본을 중복 보존하지 않습니다.", "script.js:313–408"]],
        "limits": ["EDIM 카드는 ‘개발 단계의 기능과 핵심 아키텍처’ 안내입니다. 실행 가능한 제품 기능으로 해석하지 않습니다."],
    },
    "hvac": {
        "label": "HVAC 제품군", "purpose": "11개 HVAC 제품을 3개 카테고리로 분류한 제품 탐색 안내.",
        "sections": "Ventilation 4개, Air System 4개, Parts & Control 3개. 카테고리 링크와 제품별 상세 앵커.",
        "features": [["제품 연결", "카테고리 링크는 각 제품군 페이지로, 제품 카드는 해당 페이지의 상세 앵커로 이동합니다.", "hvac.html / .family-content"]],
        "limits": ["이 페이지는 제품 목록이며 선정·견적 계산 도구는 구현되어 있지 않습니다."],
    },
    "ventilation": {
        "label": "Ventilation", "purpose": "Eurus·Partial·Pull-Out 임펠러와 KAD/KAP/KAS 팬 제품의 설계 개념 및 공개 성능 안내.",
        "sections": "제품별 소개·성능·설계/유지관리, 팬 모델 선택기 및 세 모델 사양표.",
        "features": [
            ["팬 모델 선택", "KAD → KAP → KAS 순서이며 초기 선택은 KAP입니다. 모델 버튼과 이전/다음으로 선택하고 aria-pressed, 상세 패널 hidden, 현재 번호를 함께 갱신합니다.", "script.js:535–566"],
            ["운전 사례 숫자", "Partial의 5,000+를 원문에서 읽어 카운터로 구성하고 화면 진입 때 1,400ms 동안 증가시킵니다. reduced-motion이면 최종값을 즉시 표시합니다.", "script.js:427–479"],
        ],
        "limits": ["KAD/KAS 상세 패널은 원본에서 hidden이며 이 문서에서는 모두 펼쳤습니다.", "세 팬의 크기 범위 315–1,600에는 단위가 명시되지 않았습니다.", "효율·소음·정압·절감 범위와 조건 주석을 함께 보존합니다. ‘국내 최초/세계 최초’는 자사 제공 자료 기반의 원문 주장입니다."],
    },
    "air-system": {
        "label": "Air System", "purpose": "Eco AHU/RTU, Bio HVAC, IEF, IAQS의 구성·기능·성능과 적용 분야 안내.",
        "sections": "AHU 구성과 제어, Bio 공기 정화, IEF 성능시험, IAQS 센싱·내부 구조·관제 화면.",
        "features": [["IAQS 관제 화면", "PM2.5, PM10, CO₂, TVOC, 온·습도와 댐퍼·팬·IEF 상태를 원문 HTML의 고정값으로 보여 줍니다. 실제 센서 또는 제어 API 연결은 없습니다.", "air-system.html:143 / .iaqs-telemetry 및 script.js 전체"]],
        "limits": ["IEF 시험번호 1000010029, 1000009489, WTS2025-0194-1이 표시되지만 시험성적서 원본은 저장소에 없습니다.", "IAQS의 ‘LIVE’ 화면, 기준치, 연동 임계값 및 20~30% 절감은 제품 설명과 예시 화면으로 보존합니다. 검증된 실시간 웹 기능으로 간주하지 않습니다.", "AHU 기능·제어 섹션은 HTML 순서상 IEF 뒤에 위치하지만 eco-ahu-owned로 AHU 소속을 명시합니다."],
    },
    "parts-control": {
        "label": "Parts & Control", "purpose": "CLT 배수 트랩, FCM 팬 제어, ECM 공조기 제어 제품의 상세 소개.",
        "sections": "CLT 50A/100A와 3D 뷰어, FCM 계측·예지보전·대시보드, ECM 5대 모듈·습공기선도·AHU 디지털 트윈.",
        "features": [
            ["CLT 모델 및 시점", "50A 초기 선택, 100A 전환 시 모델·설명·연결치수·시점 이미지와 aria-selected를 갱신합니다. 3D/Front/Side 시점, 드래그 회전, 휠 확대를 model-viewer가 제공합니다. 모델 변경 시 기본 시점으로 복귀합니다.", "script.js:717–778; parts-control.html:27–48"],
            ["CLT 자동 회전", "원본 HTML은 두 모델 모두 초당 12도, 1,200ms 지연의 auto-rotate 속성을 포함합니다. 모델 선택을 변경할 때 활성 모델 여부와 reduced-motion 설정을 검사하여 속성을 갱신하고, reduced-motion이면 제거합니다. 초기 로드에는 이 선택 갱신 함수가 호출되지 않아 자동 회전 속성이 그대로 남는 한계가 있습니다.", "parts-control.html:37–38; script.js:726–733"],
            ["성능·습공기선도", "원문 인라인 SVG 그래프와 고정 목표 숫자에 화면 진입 애니메이션을 적용합니다. 숫자는 1,250ms 동안 목표값으로 증가하며 원격 계측 API에 연결되지 않습니다.", "script.js:481–533"],
        ],
        "limits": ["원본의 GLB 2개는 snapshot에 보존됩니다. 독립 문서에서는 포스터 이미지와 원본 모델 링크로 제공하고 3D 실행 코드를 포함하지 않습니다.", "FCM 성능 영역에 ‘NOVA SOLUTION CLT SERIES’라는 문구가 섞여 있습니다(parts-control.html:86). 원문을 고치지 않고 기록합니다.", "ECM 특허 제10-2259135호 및 최대 25% 절감 문구는 원문 주장입니다. 저장소에 특허 원문이나 절감 검증자료는 없습니다.", "FCM/ECM의 LIVE·Online·Synced 화면은 고정 예시 및 시각 애니메이션입니다."],
    },
    "edim": {
        "label": "EDIM", "purpose": "개발 중인 제조 데이터 플랫폼의 문제 정의·모듈·업무 효과·도입 절차 설명.",
        "sections": "반복 입력·버전 불일치·느린 대응, CPQ/PLM/RCCS™/System Integration, 업무 진단→Demo/PoC→단계적 확장.",
        "features": [["도입 문의 및 내부 이동", "EDIM 살펴보기는 #edim-overview로, Demo/PoC 및 도입 문의는 Contact로 이동합니다. 모듈 앵커는 cpq/plm/rccs/erp입니다.", "edim.html / main"]],
        "limits": ["IN DEVELOPMENT와 고객 환경·PoC 결과에 따라 제공 범위를 협의한다는 문구를 그대로 보존합니다. 이 사이트에 EDIM 로그인·데모 실행·제품 구성 기능은 없습니다."],
    },
    "technology": {
        "label": "기술", "purpose": "확보된 제조·공조 역량과 개발 중인 데이터 아키텍처의 상태를 구분해 소개.",
        "sections": "제조 엔지니어링·설계 자동화·제품 데이터 아키텍처·RCCS™·시스템 연계의 5개 기술과 성숙도 흐름.",
        "features": [["기술 앵커", "manufacturing, automation, architecture, rccs, integration 앵커가 공통 메뉴와 연결됩니다.", "technology.html / .technology-stack"]],
        "limits": ["Core Technology / Architecture / In Development 상태를 구분해야 합니다.", "원문은 현재 제품 기능이 아닌 기술 기반과 개발 방향을 설명한다고 명시합니다."],
    },
    "resources": {
        "label": "자료실", "purpose": "제품·기술·회사 자료와 소식의 준비 상태 및 요청 경로 안내.",
        "sections": "Product Catalogues, Technical Documents, EDIM Brochure, Company Profile, News & Updates.",
        "features": [["자료 요청", "앞의 네 항목 Request와 하단 Request a Document는 모두 Contact로 이동합니다. News의 View는 링크가 아닌 비활성 span입니다.", "resources.html / .resource-list"]],
        "limits": ["카탈로그·기술문서·회사소개서는 Preparing, EDIM은 In Development, News는 Coming Soon입니다.", "실제 다운로드 파일·자료 검색·뉴스 상세 조회는 구현되어 있지 않습니다."],
    },
    "contact": {
        "label": "문의", "purpose": "HVAC·EDIM·파트너십 문의 분류와 회사/담당자/프로젝트 정보 수집.",
        "sections": "문의 유형, 연락처 정보, 제품/솔루션 및 문의 내용의 세 단계와 직접 이메일.",
        "features": [
            ["문의 유형과 제품", "HVAC / EDIM / Partnership 라디오 선택에 따라 disabled 상태의 제품 select를 활성화하고 옵션을 교체합니다. 다른 유형 선택 시 제품 선택값은 초기화됩니다.", "script.js:799–815"],
            ["폼 검증", "문의 유형·회사명·이름·이메일·제품·내용은 required입니다. 이메일은 type=email, 전화는 type=tel이며 전화 형식 정규식은 없습니다. 직위·전화는 선택사항입니다.", "contact.html / form"],
            ["전송", "action=https://formspree.io/f/xwlkqlvo, method=POST, UTF-8이며 숨김 _subject=NOVA Solution Website Inquiry를 함께 전송합니다. 별도 fetch/AJAX 성공·오류 화면 구현은 없습니다.", "contact.html / form; script.js 전체"],
        ],
        "limits": ["실제 문의 제출은 외부 서비스에 정보를 전송하므로 보존 조사에서 실행하지 않습니다.", "보존 문서의 폼 요소는 모두 비활성화했고 form action/method 및 원본 JavaScript를 실행하지 않습니다.", "개인정보 안내는 문의 확인과 답변을 위해 전송된다는 문구입니다. 별도의 동의 체크박스·정책 링크는 현재 폼에 없습니다."],
        "options": {
            "HVAC": ["Eurus Impeller", "Partial Impeller", "Pull-Out Impeller", "Fan Model 라인업", "AHU / RTU", "Bio HVAC", "IEF 전기집진필터", "IAQS 실내공기질", "CLT 배수 트랩", "FCM 팬 제어", "ECM 공조기 제어"],
            "EDIM": ["CPQ", "PLM", "RCCS™", "ERP 연계", "Demo / PoC", "시스템 연계"],
            "Partnership": ["기술 협력", "제조 협력", "사업 제휴"],
        },
    },
}


@dataclass
class Node:
    tag: str
    attrs: dict[str, str | None] = field(default_factory=dict)
    children: list["Node | str"] = field(default_factory=list)
    line: int = 0
    parent: "Node | None" = None

    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Node):
                yield from child.walk()

    def text(self):
        return "".join(child.text() if isinstance(child, Node) else child for child in self.children)


class Tree(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.stack = [self.root]
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs), line=self.getpos()[0], parent=self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def esc(value):
    return html.escape(str(value), quote=True)


def compact(value):
    return re.sub(r"\s+", " ", value).strip()


def uri(path):
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def asset_path(src):
    parsed = urlsplit(src)
    if parsed.scheme or parsed.netloc:
        return None
    result = (SNAPSHOT / unquote(parsed.path)).resolve()
    if not result.is_relative_to(SNAPSHOT.resolve()):
        raise ValueError(f"Asset escaped snapshot: {src}")
    return result


def doc_href(href):
    if href.startswith("#"):
        return "#original-" + href[1:]
    parsed = urlsplit(href)
    if parsed.scheme or parsed.netloc:
        return href if parsed.scheme in ("http", "https", "mailto", "tel") else "#"
    name = Path(parsed.path).name
    if name.endswith(".html") and name[:-5] in META:
        return name + ("#original-" + parsed.fragment if parsed.fragment else "")
    return "../snapshot/" + parsed.path.removeprefix("./") + ("#" + parsed.fragment if parsed.fragment else "")


def render_node(node, embedded):
    if isinstance(node, str):
        return esc(node)
    if node.tag in ("script", "style", "noscript", "iframe", "object", "embed"):
        return ""
    if node.tag == "model-viewer":
        src, poster = node.attrs.get("src", ""), node.attrs.get("poster", "")
        path = asset_path(poster)
        image = f'<img src="{uri(path)}" alt="{esc(node.attrs.get("alt", ""))}">' if path and path.is_file() else ""
        if path:
            embedded.add(path.relative_to(SNAPSHOT).as_posix())
        return f'<a class="model-poster" href="{esc(doc_href(src))}" aria-label="원본 3D 모델 파일 열기">{image}</a>'
    tag = node.tag
    if tag == "main":
        tag = "div"
    elif tag == "form":
        tag = "div"
    elif tag == "button":
        tag = "span"
    elif re.fullmatch(r"h[1-6]", tag):
        tag = f"h{min(6, int(tag[1]) + 1)}"
    attrs = {}
    if node.attrs.get("id"):
        attrs["id"] = "original-" + node.attrs["id"]
    if tag == "img":
        src = node.attrs.get("src", "")
        path = asset_path(src)
        if not path or not path.is_file():
            raise ValueError(f"Missing source image: {src}")
        attrs.update(src=uri(path), alt=node.attrs.get("alt", ""), loading="lazy")
        embedded.add(path.relative_to(SNAPSHOT).as_posix())
    elif tag == "a":
        attrs["href"] = doc_href(node.attrs.get("href", "#"))
        attrs["rel"] = "noopener noreferrer"
    elif tag in ("input", "select", "textarea"):
        for key in ("type", "value", "placeholder", "checked", "rows"):
            if key in node.attrs:
                attrs[key] = node.attrs[key]
        attrs["disabled"] = None
        if tag == "input" and attrs.get("type") == "hidden":
            return ""
    elif tag == "option":
        if "selected" in node.attrs:
            attrs["selected"] = None
    elif tag in ("th", "td"):
        for key in ("colspan", "rowspan", "scope"):
            if key in node.attrs:
                attrs[key] = node.attrs[key]
    in_svg = any(n.tag == "svg" for n in ancestors(node))
    if in_svg:
        allowed = set("viewbox xmlns d x y x1 y1 x2 y2 cx cy r rx ry width height points fill stroke stroke-width stroke-dasharray stroke-linecap stroke-linejoin stroke-opacity fill-opacity opacity offset stop-color stop-opacity font-size text-anchor font-weight transform gradientunits gradienttransform preserveaspectratio".split())
        for key, value in node.attrs.items():
            if key in allowed:
                proper = {"viewbox": "viewBox", "gradientunits": "gradientUnits", "gradienttransform": "gradientTransform", "preserveaspectratio": "preserveAspectRatio"}.get(key, key)
                attrs[proper] = re.sub(r"url\(#([^)]+)\)", r"url(#original-\1)", value or "")
        if node.tag == "svg":
            attrs["role"] = "img"
            attrs["aria-label"] = node.attrs.get("aria-label", "원문 그래프 또는 도형")
    if node.tag == "button":
        attrs["class"] = "frozen-button"
    if node.tag == "form":
        attrs["class"] = "frozen-form"
    attr_html = "".join(" " + key + (f'="{esc(value)}"' if value is not None else "") for key, value in attrs.items())
    inner = "".join(render_node(child, embedded) for child in node.children)
    if tag in VOID:
        return f"<{tag}{attr_html}>"
    if tag == "root":
        return inner
    # SVG uses case-sensitive camelCase element names in standalone XML export.
    tag = {"lineargradient": "linearGradient", "radialgradient": "radialGradient", "clippath": "clipPath"}.get(tag, tag)
    return f"<{tag}{attr_html}>{inner}</{tag}>"


def ancestors(node):
    while node:
        yield node
        node = node.parent


CSS = """
@charset "UTF-8";
:root{color-scheme:light;--ink:#203444;--muted:#667780;--accent:#176b76;--line:#dce6e6;--paper:#f4f7f5;--card:#fff;--soft:#e9f2ef}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:'Malgun Gothic','Apple SD Gothic Neo',system-ui,sans-serif;font-size:15px;line-height:1.85;word-break:keep-all;overflow-wrap:anywhere}a{color:var(--accent);text-underline-offset:4px}a:hover{color:#123f49}h1,h2,h3,h4{line-height:1.4;letter-spacing:-.035em}h1{font-size:clamp(30px,4vw,49px);margin:12px 0 18px}h2{font-size:25px;margin:0 0 22px}h3{font-size:19px;margin:27px 0 12px}h4{font-size:17px}.shell{max-width:1440px;margin:auto;padding:42px 48px 70px}.eyebrow{font-size:11px;letter-spacing:.17em;font-weight:700;text-transform:uppercase;color:var(--accent)}.topline{display:flex;justify-content:space-between;gap:20px;align-items:center;border-bottom:1px solid var(--line);padding-bottom:18px;font-size:12px}.hero{padding:40px 0 28px;max-width:1050px}.hero p{font-size:17px;color:var(--muted)}.badge{display:inline-flex;padding:4px 10px;border:1px solid #c9ddda;border-radius:100px;background:var(--soft);font-size:11px;font-weight:700}.layout{display:grid;grid-template-columns:216px minmax(0,1fr);gap:36px}.toc{position:sticky;top:24px;align-self:start;font-size:12px}.toc a{display:block;color:var(--muted);text-decoration:none;padding:8px 0;border-bottom:1px solid var(--line)}.toc a:hover{color:var(--accent)}.stack>section{margin:0 0 25px;padding:34px 38px;border:1px solid var(--line);border-radius:12px;background:var(--card);min-width:0}.lede{font-size:17px}.muted,small{color:var(--muted)}.note{padding:15px 20px;background:#eef4f2;border-left:3px solid #75a6a3;font-size:13px}.table-wrap{overflow-x:auto;max-width:100%;border:1px solid var(--line);border-radius:7px}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px}th,td{text-align:left;vertical-align:top;padding:12px 14px;border-bottom:1px solid var(--line);overflow-wrap:anywhere;word-break:break-word}th{background:#eff5f3;color:#34515b;font-size:11px;letter-spacing:.015em}tr:last-child td{border-bottom:0}code{font-family:ui-monospace,Consolas,monospace;font-size:.88em;overflow-wrap:anywhere}ul,ol{padding-left:24px}li{margin:7px 0}.feature{padding:0 0 20px;margin-bottom:20px;border-bottom:1px solid var(--line)}.feature:last-child{border:0;margin:0;padding:0}.feature h3{margin:0 0 7px}.feature p{margin:0 0 9px}.status{font-weight:700;font-size:11px}.verified{color:#17634e}.limited{color:#93631c}.not-tested{color:#6b7582}.source-content{font-size:14px;line-height:1.9}.source-content>div>section{padding:25px 0;border-top:1px solid var(--line)}.source-content>div>section:first-child{border-top:0;padding-top:0}.source-content h2{font-size:26px;margin:12px 0 22px}.source-content h3{font-size:22px;margin:24px 0 15px}.source-content h4{font-size:18px}.source-content p{margin:9px 0 16px}.source-content article{padding:20px 22px;margin:15px 0;border:1px solid var(--line);border-radius:8px;background:#f9fbfa}.source-content figure{margin:25px 0;padding:16px;background:#f4f7f6;border:1px solid var(--line);border-radius:8px}.source-content img{display:block;max-width:100%;width:auto;height:auto;max-height:500px;object-fit:contain;margin:18px auto}.source-content svg{display:block;max-width:100%;height:auto;max-height:460px;margin:20px auto;padding:16px;background:#142c3d;border-radius:8px;color:#bde4e8}.source-content svg:not([viewBox]){width:48px;height:48px}.source-content figcaption{font-size:12px;color:var(--muted)}.source-content dl{display:grid;gap:8px}.source-content dl>div{display:grid;grid-template-columns:minmax(100px,30%) 1fr;gap:15px;border-bottom:1px solid var(--line);padding:8px 0}.source-content dt{color:var(--muted)}.source-content dd{margin:0}.source-content section>div>div>i{display:block;color:var(--muted)}.source-content label{display:block;padding:12px 0}.source-content fieldset{border:1px solid var(--line);border-radius:8px;margin:18px 0;padding:18px}.source-content input:not([type=radio]):not([type=checkbox]),.source-content select,.source-content textarea{display:block;max-width:100%;width:100%;padding:10px;color:#53636b;background:#f2f4f3;border:1px solid #dbe4e1}.source-content input[type=radio]{margin-right:8px}.frozen-button{display:inline-block;border:1px solid #c4d4d1;border-radius:5px;padding:6px 12px;margin:5px;background:#f2f6f4;color:#50666c}.source-content a{display:inline-block;margin:4px 0}.source-content .model-poster{display:block}.capture{margin:20px 0}.capture img{display:block;width:100%;height:auto;border:1px solid var(--line);border-radius:8px}.capture figcaption{font-size:12px;padding:10px 0;color:var(--muted)}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.doc-card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:25px;text-decoration:none;display:block;color:var(--ink)}.doc-card h2{font-size:22px;margin:9px 0}.doc-card p{font-size:13px;margin:0;color:var(--muted)}.footer{margin-top:42px;padding-top:18px;border-top:1px solid var(--line);font-size:11px;color:var(--muted)}.source-index a{display:block;padding:6px 0;font-size:13px}section[id]{scroll-margin-top:20px}.count-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0}.count-grid div{padding:15px;background:var(--soft);border-radius:7px;font-size:11px}.count-grid strong{display:block;font-size:26px;color:var(--accent)}
@media(max-width:900px){.shell{padding:24px}.layout{grid-template-columns:1fr;gap:20px}.toc{position:static;display:flex;gap:12px;overflow:auto;white-space:nowrap}.toc a{border:0}.stack>section{padding:25px}.cards{grid-template-columns:1fr}}
@media(max-width:520px){.shell{padding:17px}.topline{align-items:start}.stack>section{padding:20px 17px}.source-content article{padding:16px}.source-content dl>div{grid-template-columns:1fr;gap:0}.count-grid{grid-template-columns:repeat(2,1fr)}th,td{padding:9px}.source-content h2{font-size:23px}h2{font-size:22px}}
@media print{body{background:#fff;color:#111;font-size:10pt}.shell{max-width:none;padding:0}.layout{display:block}.toc,.topline{display:none}.hero{padding:10px 0}.stack>section{border:0;border-radius:0;padding:15px 0;break-before:auto}.source-content article,.source-content figure,.capture{break-inside:avoid}.source-content img{max-height:100mm}.source-content svg{max-height:90mm;print-color-adjust:exact}.table-wrap{overflow:visible}table{font-size:8pt}.cards{display:block}.doc-card{margin:12px 0;break-inside:avoid}.footer{margin-top:15px}a{color:inherit}h1,h2,h3{break-after:avoid}.badge,.note,th{print-color-adjust:exact}}
"""


def table(headers, rows):
    if not rows:
        return '<p class="muted">해당 항목 없음.</p>'
    return '<div class="table-wrap"><table><thead><tr>' + "".join(f"<th>{esc(h)}</th>" for h in headers) + '</tr></thead><tbody>' + "".join("<tr>" + "".join(f"<td>{c}</td>" for c in row) + "</tr>" for row in rows) + "</tbody></table></div>"


def frame(title, body):
    return '<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>' + esc(title) + '</title><style>' + CSS + '</style></head><body>' + body + '</body></html>'


def checks_for(evidence, page):
    records = [x for x in evidence.get("checks", []) if x.get("page") in (page, page + ".html")]
    if not records:
        return '<p class="note">이 페이지의 브라우저 검증 기록이 아직 제공되지 않았습니다. 아래 기능 설명은 원본 소스 분석이며 실제 실행 성공을 의미하지 않습니다.</p>'
    labels = {"verified": "브라우저 확인", "limited": "제한적으로 확인", "not-tested": "실행 미확인"}
    return table(["기능", "검증 상태", "관찰 결과"], [[esc(r.get("feature", "")), f'<span class="status {esc(r.get("status", "not-tested"))}">{labels.get(r.get("status"), "실행 미확인")}</span>', esc(r.get("details", ""))] for r in records])


def build_page(page, evidence):
    info = META[page]
    source_path = SNAPSHOT / f"{page}.html"
    source = source_path.read_text(encoding="utf-8-sig")
    tree = Tree(source)
    all_nodes = list(tree.root.walk())
    main = next(n for n in all_nodes if n.tag == "main")
    nodes = list(main.walk())
    title = next(n.text() for n in all_nodes if n.tag == "title")
    description = next((n.attrs.get("content", "") for n in all_nodes if n.tag == "meta" and n.attrs.get("name") == "description"), "")
    embedded = set()
    original = render_node(main, embedded)
    original_text = compact(main.text())
    reconstructed_text = compact(Tree(original).root.text())
    if original_text != reconstructed_text:
        raise ValueError(f"Source text preservation mismatch: {page}")
    source_sha = hashlib.sha256(source_path.read_bytes()).hexdigest()
    source_rows = [["페이지", f'<code>{page}.html</code>'], ["원래 주소", f'<a href="https://novasol.co.kr/{page + ".html" if page != "index" else ""}">novasol.co.kr/{page + ".html" if page != "index" else ""}</a>'], ["Title", esc(title)], ["Meta description", esc(description)], ["문서 언어", "ko"], ["기준 커밋", f"<code>{COMMIT}</code>"], ["원본 SHA-256", f"<code>{source_sha}</code>"], ["원본 파일", f'<a href="../snapshot/{page}.html">동결된 원본 HTML 보기</a>']]
    headings = [n for n in nodes if re.fullmatch(r"h[1-6]", n.tag)]
    source_toc = []
    for n in nodes:
        if n.tag == "section":
            heading = next((x for x in n.walk() if re.fullmatch(r"h[1-6]", x.tag)), None)
            if heading:
                label = compact(heading.text())
                section_id = n.attrs.get("id")
                source_toc.append(f'<li>{f"<a href=\"#original-{esc(section_id)}\">{esc(label)}</a>" if section_id else esc(label)} <small>원본 {page}.html:{n.line}</small></li>')
    link_rows = []
    for n in nodes:
        if n.tag == "a":
            name = compact(n.text()) or n.attrs.get("aria-label") or "이미지/무문자 링크"
            href = n.attrs.get("href", "")
            behavior = "외부" if urlsplit(href).scheme else "내부/앵커"
            if n.attrs.get("target") == "_blank":
                behavior += " · 원본은 새 탭"
            if href.startswith("mailto:"):
                behavior += " · 메일 앱"
            link_rows.append([esc(name), f'<code>{esc(href)}</code>', esc(behavior), str(n.line)])
    button_rows = [[esc(compact(n.text()) or n.attrs.get("aria-label", "")), f'<code>{esc(json.dumps({k:v for k,v in n.attrs.items() if k.startswith("data-") or k.startswith("aria-") or k in ("type", "role")}, ensure_ascii=False))}</code>', str(n.line)] for n in nodes if n.tag == "button"]
    anchor_rows = [[f'<a href="#original-{esc(n.attrs["id"])}"><code>#{esc(n.attrs["id"])}</code></a>', esc(n.tag), str(n.line)] for n in nodes if n.attrs.get("id")]
    image_rows = [[f'<code>{esc(n.attrs.get("src", ""))}</code>', esc(n.attrs.get("alt", "")) or '<span class="muted">빈 alt(장식용)</span>', str(n.line)] for n in nodes if n.tag == "img"]
    form_rows = []
    for n in nodes:
        if n.tag in ("input", "select", "textarea"):
            label = next((compact(a.text()) for a in ancestors(n) if a.tag == "label"), "숨김 필드" if n.attrs.get("type") == "hidden" else "")
            form_rows.append([esc(label), f'<code>{esc(n.attrs.get("name", ""))}</code>', esc(n.attrs.get("type", n.tag)), "필수" if "required" in n.attrs else "선택/시스템", esc(json.dumps({k:v for k,v in n.attrs.items() if k in ("value", "placeholder", "disabled", "autocomplete", "rows", "checked")}, ensure_ascii=False))])
    dependency_rows = []
    for n in all_nodes:
        if n.tag in ("script", "link"):
            attr = "src" if n.tag == "script" else "href"
            ref = n.attrs.get(attr, "")
            dependency_rows.append([esc(n.tag + (" / " + n.attrs.get("rel", "") if n.tag == "link" else "")), f'<code>{esc(ref)}</code>', esc("외부 네트워크" if urlsplit(ref).scheme else "원본 로컬 자산"), str(n.line)])
    if page == "company":
        dependency_rows += [["지도 타일", "<code>https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png</code>", "외부 네트워크", "script.js:577"]]
    if page == "contact":
        dependency_rows += [["문의 전송", "<code>https://formspree.io/f/xwlkqlvo</code>", "외부 서비스 / POST", "contact.html / form"]]
    models = [n for n in nodes if n.tag == "model-viewer"]
    model_html = ""
    if models:
        model_html = '<h3>3D 모델 원본</h3>' + table(["원본 파일", "포스터/대체 설명", "초기 설정"], [[f'<a href="{esc(doc_href(n.attrs.get("src", "")))}">{esc(n.attrs.get("src", ""))}</a>', esc(n.attrs.get("alt", "")), '<code>' + esc(json.dumps({k:v for k,v in n.attrs.items() if k not in ("src", "poster", "alt")}, ensure_ascii=False)) + '</code>'] for n in models])
    extra_html = ""
    for ref in info.get("extra_images", []):
        path = SNAPSHOT / ref
        if path.is_file():
            extra_html += f'<figure class="capture"><img src="{uri(path)}" alt="{esc(ref)}" loading="lazy"><figcaption>CSS 배경 또는 화면 보조 자산 · {esc(ref)}</figcaption></figure>'
            embedded.add(ref)
    features = "".join(f'<article class="feature"><h3>{esc(name)}</h3><p>{esc(detail)}</p><small>소스 근거: {esc(ref)} · 실행 여부는 아래 브라우저 검증표 참조</small></article>' for name, detail, ref in info["features"])
    options = ""
    if info.get("options"):
        options = '<h3>JS에서 생성하는 제품/솔루션 선택지</h3>' + table(["문의 유형", "선택지(표시 순서)"], [[esc(k), "<ol>" + "".join(f"<li>{esc(v)}</li>" for v in vals) + "</ol>"] for k, vals in info["options"].items()])
    captures = ""
    capture_files = []
    for cap in evidence.get("captures", []):
        if cap.get("page") not in (page, page + ".html"):
            continue
        path = (BASE / cap["file"]).resolve()
        if not path.is_relative_to(BASE.resolve()) or not path.is_file():
            continue
        captures += f'<figure class="capture"><img src="{uri(path)}" alt="{esc(cap.get("label", "브라우저 확인 화면"))}" loading="lazy"><figcaption>{esc(cap.get("label", ""))} · {esc(cap.get("viewport", ""))} · 상태: {esc(cap.get("state", "default"))}</figcaption></figure>'
        capture_files.append(cap["file"])
    if not captures:
        captures = '<p class="muted">저장된 브라우저 캡처가 아직 없습니다. 원문 이미지 임베딩은 위 원문 섹션에 포함되어 있습니다.</p>'
    hidden = [n for n in nodes if "hidden" in n.attrs or n.attrs.get("data-company-panel") is not None or "data-company-panel" in n.attrs or ("data-clt-panel" in n.attrs and "is-active" not in n.attrs.get("class", ""))]
    hidden_html = table(["원본 요소", "숨김/상태 근거", "소스 줄"], [[esc(n.tag + ("#" + n.attrs["id"] if n.attrs.get("id") else "")), '<code>' + esc(json.dumps({k:v for k,v in n.attrs.items() if k in ("hidden", "data-fan-panel", "data-company-panel", "data-clt-panel", "class")}, ensure_ascii=False)) + '</code>', str(n.line)] for n in hidden])
    sections = [
        ("overview", "문서 개요", f'<p class="lede">{esc(info["purpose"])}</p><p>{esc(info["sections"])}</p><div class="count-grid"><div><strong>{len(headings)}</strong>원문 제목</div><div><strong>{sum(n.tag == "section" for n in nodes)}</strong>원문 섹션</div><div><strong>{len(image_rows)}</strong>본문 이미지</div><div><strong>{len(link_rows)}</strong>본문 링크</div></div>' + table(["항목", "보존 값"], source_rows)),
        ("source-map", "원문 구성과 상태", '<ul class="source-index">' + "".join(source_toc) + '</ul><h3>초기 숨김 또는 대체 상태</h3>' + hidden_html),
        ("content", "페이지 원문 전체", '<p class="note">원본 main의 문구·제목·주석·수치·SVG 그래프·숨김 상세 패널을 읽기용으로 펼쳤습니다. 사이트의 CSS/JavaScript는 실행하지 않습니다. 링크는 보존 문서/동결 원본을 가리키고 폼은 비활성화되어 있습니다. 원문 텍스트 정합성: 자동 비교 통과.</p><div class="source-content">' + original + '</div>' + extra_html),
        ("behavior", "기능과 인터랙션 명세", features + options + '<h3>실제 브라우저 검증</h3>' + checks_for(evidence, page)),
        ("inventory", "요소·링크·자산 목록", '<h3>본문 링크</h3>' + table(["표시 문구", "원래 목적지", "구분", "줄"], link_rows) + '<h3>버튼과 상태 속성</h3>' + table(["표시/접근성 이름", "상태·이벤트 연결 속성", "줄"], button_rows) + '<h3>본문 앵커</h3>' + table(["앵커", "요소", "줄"], anchor_rows) + '<h3>본문 이미지와 alt</h3>' + table(["원본 경로", "대체 설명", "줄"], image_rows) + model_html + '<h3>폼 필드</h3>' + table(["필드 문구", "name", "종류", "필수 여부", "초기값·설정"], form_rows)),
        ("dependencies", "의존성과 알려진 한계", table(["종류", "경로/주소", "의존 범위", "소스 줄"], dependency_rows) + '<ul>' + "".join(f"<li>{esc(x)}</li>" for x in info["limits"]) + '<li>공통 헤더·메가메뉴·푸터·애니메이션·폰트·스크롤은 <a href="../common.html">공통 기능 문서</a>에서 별도로 확인합니다.</li><li>사용자의 새 요구사항은 <a href="../renewal-spec.html">리뉴얼 명세</a>에 분리했으며 현재 원문에 소급 적용하지 않았습니다.</li></ul>'),
        ("evidence", "브라우저 화면 증거", captures),
    ]
    body = '<div class="shell"><div class="topline"><a href="../index.html">NOVA · 보존 라이브러리</a><span>기준일 2026.10.08 · 원본 상태 기록</span></div><header class="hero"><span class="eyebrow">PAGE ' + str(ORDER.index(page) + 1).zfill(2) + ' / ' + page.upper() + '</span><h1>' + esc(info["label"]) + '</h1><p>' + esc(info["purpose"]) + '</p><span class="badge">독립 HTML · 원문/기능/검증 증거</span></header><div class="layout"><nav class="toc" aria-label="문서 목차">' + "".join(f'<a href="#{sid}">{esc(label)}</a>' for sid,label,_ in sections) + '</nav><main class="stack">' + "".join(f'<section id="{sid}"><h2>{esc(label)}</h2>{content}</section>' for sid,label,content in sections) + '</main></div><footer class="footer">NOVA SOLUTION · Preservation Library · 2026-10-08<br>기준 커밋 ' + COMMIT + ' · 원본과 현재 구현을 기록한 문서이며 제품 성능을 독립적으로 인증하지 않습니다.</footer></div>'
    output = frame(info["label"] + " | NOVA 사이트 보존 문서", body)
    dest = PAGES / (page + ".html")
    dest.write_text(output, encoding="utf-8")
    return {"page": page, "document": str(dest.relative_to(BASE)).replace("\\", "/"), "source_sha256": source_sha, "source_text_preserved": True, "source_text_characters": len(original_text), "headings": len(headings), "sections": sum(n.tag == "section" for n in nodes), "images": len(image_rows), "links": len(link_rows), "embedded_assets": sorted(embedded), "capture_files": capture_files, "output_bytes": dest.stat().st_size}


def build_index(results, evidence):
    cards = "".join(f'<a class="doc-card" href="pages/{page}.html"><span class="eyebrow">{i:02d} / {page}</span><h2>{esc(META[page]["label"])}</h2><p>{esc(META[page]["purpose"])}</p></a>' for i,page in enumerate(ORDER, 1))
    supporting = [("common.html", "공통 UI와 기능", "메뉴·모달·스크롤·애니메이션·외부 서비스와 공통 동작."), ("renewal-spec.html", "리뉴얼 요구 명세", "로고 SVG 3종, novascroll, Pretendard와 향후 구현 기준."), ("logo-preview.html", "로고 SVG 미리보기", "현재 컬러, light #fefefe, dark #242424 비교."), ("baseline-manifest.json", "원본 보존 매니페스트", "동결 원본 파일의 경로·해시·기준 정보."), ("archive-manifest.json", "전체 보존 매니페스트", "최종 문서·화면 증거·로고 파일의 경로와 해시. 매니페스트 자체는 제외합니다."), ("validation.json", "보존 검증 결과", "원본과 문서의 정합성 및 전체 검증 결과."), ("live-comparison.json", "공개 사이트 비교", "공개 사이트와 로컬 기준 소스 비교 기록."), ("evidence/browser-checks.json", "브라우저 확인 기록", "기능별 verified / limited / not-tested와 화면 증거."), ("documents-validation.json", "문서 생성 검증", "11개 독립 문서의 원문 텍스트 정합성, 자산·증거 포함 내역.")]
    support_cards = "".join(f'<a class="doc-card" href="{href}"><h2>{label}</h2><p>{detail}</p></a>' for href,label,detail in supporting)
    body = '<div class="shell"><div class="topline"><span>NOVA SOLUTION / PRESERVATION</span><span>2026.10.08 · 기준 커밋 17940ae</span></div><header class="hero"><span class="eyebrow">CONTENT & FUNCTION ARCHIVE</span><h1>현재를 정확하게 기록하고,<br>다음 웹사이트의 기준으로.</h1><p>11개 페이지의 원문, 제품 사양, 이미지, 숨김 패널과 실제 구현 동작을 보존했습니다. 각 문서는 이미지와 화면 증거를 내장하여 단독으로 읽고 인쇄할 수 있습니다.</p><span class="badge">기존 사이트 보존 · 리뉴얼 근거 자료</span></header><div class="count-grid"><div><strong>11</strong>독립 페이지 문서</div><div><strong>' + str(sum(x["sections"] for x in results)) + '</strong>원문 섹션</div><div><strong>' + str(sum(x["headings"] for x in results)) + '</strong>원문 제목</div><div><strong>' + str(len(evidence.get("captures", []))) + '</strong>화면 증거</div></div><p class="note">원문, 소스에서 확인한 구현, 브라우저에서 확인한 동작, 향후 변경 요구를 구분했습니다. 실제 외부 문의 전송은 실행하지 않습니다. 동적 지도·3D 모델은 원본과 설정을 보존하고 이 문서 안에서 사이트 코드를 실행하지 않습니다.</p><section style="margin:40px 0"><h2>페이지별 보존 문서</h2><div class="cards">' + cards + '</div></section><section style="margin:40px 0"><h2>공통 자료와 검증</h2><div class="cards">' + support_cards + '</div></section><section class="note"><h3 style="margin-top:0">보존 범위와 다시 생성하기</h3><p>원본 사이트는 <a href="snapshot/index.html">snapshot/index.html</a>에서 확인할 수 있습니다. 실행하면 원본의 외부 지도·폰트 의존성이 사용됩니다. 이 라이브러리의 원문 이미지는 원본 PNG를 내장하며 GLB 3D 모델은 snapshot의 원본 파일을 참조합니다.</p><p><code>python tools/build_documents.py</code>를 저장소 루트에서 실행하면 동결된 snapshot과 <code>evidence/browser-checks.json</code>을 읽어 문서와 내장 증거를 다시 생성합니다. 운영 소스는 수정하지 않습니다.</p></section><footer class="footer">NOVA SOLUTION · Preservation Library · 2026-10-08<br>기준 커밋 ' + COMMIT + ' · 전체 원문은 각 페이지 안에 보존됩니다.</footer></div>'
    (BASE / "index.html").write_text(frame("NOVA 사이트 보존 라이브러리 | 2026-10-08", body), encoding="utf-8")


def main():
    missing = [str(SNAPSHOT / (page + ".html")) for page in ORDER if not (SNAPSHOT / (page + ".html")).is_file()]
    if missing:
        raise SystemExit("Snapshot is not ready. Missing: " + ", ".join(missing))
    PAGES.mkdir(parents=True, exist_ok=True)
    evidence_path = BASE / "evidence" / "browser-checks.json"
    evidence = json.loads(evidence_path.read_text(encoding="utf-8-sig")) if evidence_path.is_file() else {"captures": [], "checks": []}
    results = [build_page(page, evidence) for page in ORDER]
    build_index(results, evidence)
    report = {"baseline_commit": COMMIT, "date": "2026-10-08", "all_source_text_preserved": all(r["source_text_preserved"] for r in results), "documents": results, "note": "Source main text is compared after whitespace normalization. Images are embedded without modification. Source scripts and form submission are excluded."}
    (BASE / "documents-validation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(results)} standalone documents + index; original main text preserved for every page.")
    print(f"Total page bytes: {sum(r['output_bytes'] for r in results):,}")
    print(f"Browser capture records available: {len(evidence.get('captures', []))}")


if __name__ == "__main__":
    main()

# NOVA Solution Website

Figma Make 레퍼런스를 바탕으로 시작한 반응형 회사 소개 웹사이트입니다.

## 로컬 실행

의존성 없이 실행할 수 있습니다.

```bash
node build-site.mjs
python3 tools/serve_preview.py --port 4173
```

브라우저에서 `http://localhost:4173`을 엽니다.

VS Code에서는 `novaweb.code-workspace`를 연 다음 **터미널 → 작업 실행 → NOVA: 로컬 서버 실행**을 선택해도 됩니다.

`build-site.mjs`는 `partials/header.html`과 `partials/footer.html`을 모든 HTML 페이지에 생성합니다. 공통 헤더나 푸터를 변경한 뒤에는 먼저 빌드 명령을 실행하세요.

## 보존 문서 및 리뉴얼 참고 자료

문서 전체는 저장소 밖의 `../docs`에 보관합니다. 현재 PC 경로는
`D:\Company\docs`이며, 이 저장소를 내려받을 때 문서가 자동으로 복사되지는 않습니다.
이 폴더는 별도로 보관·백업하고, 새 PC에서 사용할 때는 같은 형제로 배치하거나
`NOVA_DOCS_DIR` 환경 변수로 실제 문서 폴더를 지정하세요.

- 전체 목차: `../docs/preservation/2026-10-08/index.html`
- 페이지별 단독 HTML: `../docs/preservation/2026-10-08/pages/`
- 원본 스냅샷: `../docs/preservation/2026-10-08/snapshot/`
- 리뉴얼·영상 제작 기록: `../docs/renewal/`
- 보존본 생성 당시 도구 원본: `../docs/reference-tools/build_documents.py`

기존 `archive-manifest.json`의 경로는 생성 당시 저장소 기준입니다.
그중 `tools/build_documents.py`의 원본 해시는 위 `reference-tools` 사본으로 확인하고,
현재 저장소의 같은 이름 도구는 외부 문서 경로에 대응하는 유지보수 버전으로 사용합니다.

위 로컬 서버는 `/docs/` 주소를 외부 문서 폴더에 연결합니다.
`http://localhost:4173/docs/preservation/2026-10-08/`에서 열면 문서의 기존
상대 링크와 사이트 자산 참조가 유지됩니다. 페이지별 보존 HTML은 파일로도 열 수 있습니다.
`tools/reference_paths.py`가 문서 생성·검증 도구의 경로를 공통으로 관리합니다.
일반 `python -m http.server`는 외부 문서 연결을 지원하지 않습니다.

문서는 Git 최신 트리와 배포 대상에서 제외합니다. 저장소 안에 `docs/`를 다시 만들지 마세요.
기존 커밋에 저장된 보존본은 Git 이력에 남아 있습니다.

## 배포

`main` 브랜치에 push하면 GitHub Actions가 배포 전용 `dist`를 새로 생성합니다. 배포본 HTML의 로컬 `styles.css`와 `script.js` 참조에 short commit SHA를 추가하고 검증한 뒤, `dist`만 GitHub Pages에 배포합니다. 소스 HTML과 로컬 실행 경로는 변경하지 않습니다.

## 현재 구현 범위

- 고정형 반응형 내비게이션
- 히어로 및 Product → Design → BOM → Production → ERP 흐름
- HVAC / EDIM 솔루션 패널
- NOVA Solution 강점 카드
- 산업 분야 태그, 문의 CTA, 푸터
- 스크롤 진입 애니메이션과 reduced-motion 접근성 대응

회사명, 실제 연락처, 로고 원본, 이미지 자산이 확정되면 콘텐츠와 브랜드 자산을 교체하면 됩니다.

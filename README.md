# NOVA Solution Website

Figma Make 레퍼런스를 바탕으로 시작한 반응형 회사 소개 웹사이트입니다.

## 로컬 실행

의존성 없이 실행할 수 있습니다.

```bash
node build-site.mjs
python3 -m http.server 4173
```

브라우저에서 `http://localhost:4173`을 엽니다.

VS Code에서는 `novaweb.code-workspace`를 연 다음 **터미널 → 작업 실행 → NOVA: 로컬 서버 실행**을 선택해도 됩니다.

`build-site.mjs`는 `partials/header.html`과 `partials/footer.html`을 모든 HTML 페이지에 생성합니다. 공통 헤더나 푸터를 변경한 뒤에는 먼저 빌드 명령을 실행하세요.

## 현재 구현 범위

- 고정형 반응형 내비게이션
- 히어로 및 Product → Design → BOM → Production → ERP 흐름
- HVAC / EDIM 솔루션 패널
- NOVA Solution 강점 카드
- 산업 분야 태그, 문의 CTA, 푸터
- 스크롤 진입 애니메이션과 reduced-motion 접근성 대응

회사명, 실제 연락처, 로고 원본, 이미지 자산이 확정되면 콘텐츠와 브랜드 자산을 교체하면 됩니다.

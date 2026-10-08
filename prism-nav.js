/* Shared Prism navigation. Keep this deferred script before script.js so the
   existing Company deep-link handlers can bind to the enhanced anchors. */
(() => {
  const header = document.querySelector('[data-header]');
  const nav = header?.querySelector('[data-nav]');
  const toggle = header?.querySelector('[data-menu-toggle]');
  if (!header || !nav || !toggle || header.classList.contains('prism-nav-ready')) return;

  const mobileQuery = window.matchMedia('(max-width: 960px)');
  const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  // The white symbol stays still and readable. Only the small, decorative SVG
  // around it runs a brief airflow/data sequence, followed by a long idle gap.
  // No animation frame loop or continuously running CSS animation is needed.
  function installBrandTimeline() {
    const mark = header.querySelector('.brand-mark');
    if (!mark) return;
    const symbol = document.createElement('span');
    symbol.className = 'prism-brand-symbol';
    mark.before(symbol);
    symbol.append(mark);
    symbol.insertAdjacentHTML('beforeend', '<svg class="prism-brand-flow" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path pathLength="100" d="M7 42C3 34 6 21 15 14C21 9 27 7 33 8"/><path pathLength="100" d="M31 56C41 57 53 50 57 39C60 31 57 23 53 20"/><path pathLength="100" d="M9 49C19 57 27 59 37 55"/><circle cx="33" cy="8" r="1.1"/><circle cx="53" cy="20" r="1.1"/></svg>');
    const connection = window.navigator?.connection;
    let policyEnabled = document.documentElement.dataset.prismMotion !== 'paused';
    let pageActive = true;
    let startTimer = 0;
    let endTimer = 0;
    const canAnimate = () => pageActive && !document.hidden && !reducedMotionQuery.matches && !connection?.saveData && policyEnabled;
    const stop = () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(endTimer);
      startTimer = 0;
      endTimer = 0;
      symbol.classList.remove('is-flowing');
    };
    const schedule = (delay = 4000) => {
      stop();
      if (!canAnimate()) return;
      startTimer = window.setTimeout(() => {
        startTimer = 0;
        if (!canAnimate()) return;
        symbol.classList.add('is-flowing');
        endTimer = window.setTimeout(() => schedule(14000), 2400);
      }, delay);
    };
    document.addEventListener('visibilitychange', () => schedule());
    document.addEventListener('prism:motion-policy', (event) => {
      const enabled = event.detail?.enabled !== false;
      if (enabled === policyEnabled) return;
      policyEnabled = enabled;
      schedule();
    });
    reducedMotionQuery.addEventListener('change', () => schedule());
    connection?.addEventListener?.('change', () => schedule());
    window.addEventListener('pagehide', () => { pageActive = false; stop(); });
    window.addEventListener('pageshow', () => { pageActive = true; schedule(); });
    schedule();
  }
  installBrandTimeline();
  const menuLabel = toggle.querySelector('.sr-only');
  const solutionPages = ['solutions.html', 'hvac.html', 'ventilation.html', 'air-system.html', 'parts-control.html', 'edim.html'];
  const solutionTiles = [
    {
      title: 'Ventilation', description: '송풍·환기 제품군', href: './ventilation.html',
      image: './assets/products/eurus-impeller-cutout.png', alt: 'Eurus Impeller 제품 이미지', label: 'HVAC / 01',
      links: [['Eurus Impeller', './ventilation.html#eurus'], ['Partial Impeller', './ventilation.html#partial'], ['Pull-Out Impeller', './ventilation.html#pullout'], ['Fan Model Line-Up', './ventilation.html#fan-model']],
    },
    {
      title: 'Air Systems', description: '공조·공기 처리 시스템', href: './air-system.html',
      image: './assets/products/eco-ahu-compact-cutout.png', alt: 'Eco AHU 공조 장비 구성 예시', label: 'HVAC / 02',
      links: [['Eco AHU / RTU', './air-system.html#ahu'], ['Bio HVAC', './air-system.html#bio-hvac'], ['IEF Filter', './air-system.html#ief'], ['IAQS', './air-system.html#iaqs']],
    },
    {
      title: 'Parts &amp; Control', description: '부품·제어 시스템', href: './parts-control.html',
      image: './assets/products/clt-50a-cutout.png', alt: 'CLT 50A 배수 트랩 제품 이미지', label: 'HVAC / 03',
      links: [['CLT', './parts-control.html#clt'], ['FCM', './parts-control.html#fcm'], ['ECM', './parts-control.html#ecm']],
    },
    {
      title: 'EDIM', description: '제조 데이터 플랫폼', href: './edim.html',
      image: './assets/field-to-data-panels-clean.png', alt: '제조 정보 연결을 설명하는 개념 이미지', label: 'PRODUCT DATA', development: true,
      links: [['CPQ · 제품 구성', './edim.html#cpq'], ['PLM · 설계 연결', './edim.html#plm'], ['RCCS™ · 제품 데이터', './edim.html#rccs'], ['ERP 연계 · System Integration', './edim.html#erp']],
    },
  ];
  const sections = [
    {
      key: 'company', label: 'Company', heading: 'Who We Are', overview: 'Company Overview', href: './company.html',
      image: './assets/menu-company-building.png', alt: '현대적인 산업 기술 기업 건축 이미지',
      caption: 'Engineering Manufacturing,<br>From Product to Data.',
      links: [['About Us', '노바솔루션 소개', './company.html#about'], ['Mission &amp; Vision', '미션과 비전', './company.html#mission'], ['History', '연혁', './company.html#history'], ['Manufacturing Foundation', '제조 기반', './company.html#foundation'], ['Location', '오시는 길', './company.html#location']],
    },
    {
      key: 'technology', label: 'Technology', heading: 'How We Build', overview: 'Explore Technology', href: './technology.html',
      image: './assets/menu-technology-blueprint.png', alt: '공조 설비 엔지니어링 도면 이미지',
      caption: '제조의 경험을,<br>연결의 기술로.',
      links: [['Manufacturing Engineering', '제조 엔지니어링', './technology.html#manufacturing'], ['Engineering Automation', '엔지니어링 자동화', './technology.html#automation'], ['Product Data Architecture', '제품 데이터 아키텍처', './technology.html#architecture'], ['RCCS™', '관계형 제품 구성 기술', './technology.html#rccs'], ['System Integration', '시스템 통합', './technology.html#integration']],
    },
    {
      key: 'resources', label: 'Resources', heading: 'NOVA Library', overview: 'View All Resources', href: './resources.html',
      image: './assets/menu-resources-catalogues.png', alt: '기술 카탈로그와 엔지니어링 문서 이미지',
      caption: '제품과 기술을 위한<br>자료와 소식.',
      links: [['Product Catalogues', '제품 카탈로그 · 준비 중', './resources.html#product-catalogues'], ['Technical Documents', '기술 문서 · 준비 중', './resources.html#technical-documents'], ['Company Profile', '회사 소개서 · 준비 중', './resources.html#company-profile'], ['EDIM Brochure', 'EDIM 브로슈어 · 개발 중', './resources.html#edim-brochure'], ['News &amp; Updates', '뉴스 및 업데이트 · 준비 중', './resources.html#news-updates']],
    },
  ];
  const trigger = (key, label) => `<button class="prism-nav-trigger" id="prism-nav-trigger-${key}" type="button" data-prism-nav-trigger="${key}" aria-expanded="false" aria-controls="prism-nav-panel-${key}"><span>${label}</span><span class="prism-nav-chevron" aria-hidden="true"></span></button>`;
  const editorial = (section) => `<div class="prism-nav-group" data-prism-nav-group="${section.key}">
    ${trigger(section.key, section.label)}
    <section class="prism-nav-panel prism-nav-editorial" id="prism-nav-panel-${section.key}" aria-labelledby="prism-nav-trigger-${section.key}" data-novascroll data-novascroll-label="${section.label} 메뉴" hidden>
      <div class="prism-nav-panel-heading"><div><span class="prism-nav-eyebrow">${section.label}</span><h2>${section.heading}</h2></div><a class="prism-nav-overview" href="${section.href}">${section.overview}<span aria-hidden="true">↗</span></a></div>
      <div class="prism-nav-editorial-grid"><div class="prism-nav-link-grid">${section.links.map(([label, description, href]) => `<a class="prism-nav-editorial-link" href="${href}"><span>${label}</span><small>${description}</small><b aria-hidden="true">↗</b></a>`).join('')}</div>
      <figure class="prism-nav-editorial-image"><img src="${section.image}" alt="${section.alt}" decoding="async"><figcaption>${section.caption}</figcaption></figure></div>
    </section>
  </div>`;
  const solutions = `<div class="prism-nav-group" data-prism-nav-group="solutions">
    ${trigger('solutions', 'Solutions')}
    <section class="prism-nav-panel prism-nav-solutions" id="prism-nav-panel-solutions" aria-labelledby="prism-nav-trigger-solutions" data-novascroll data-novascroll-label="솔루션 메뉴" hidden>
      <div class="prism-nav-panel-heading"><div><span class="prism-nav-eyebrow">PRODUCT × DATA</span><h2>What We Deliver</h2></div><div class="prism-nav-overview-links"><a class="prism-nav-overview" href="./hvac.html">HVAC 전체<span aria-hidden="true">↗</span></a><a class="prism-nav-overview" href="./solutions.html">모든 솔루션<span aria-hidden="true">↗</span></a></div></div>
      <div class="prism-nav-tile-grid">${solutionTiles.map((tile) => `<article class="prism-nav-tile${tile.development ? ' prism-nav-tile-edim' : ''}"><a class="prism-nav-tile-heading" href="${tile.href}"><span class="prism-nav-tile-kicker">${tile.label}${tile.development ? '<em>개발 중</em>' : ''}</span><strong>${tile.title}</strong><span class="prism-nav-tile-description">${tile.description}</span>${tile.development ? '<span class="prism-nav-data-art" aria-hidden="true"><i></i><i></i><i></i><b>EDIM</b></span>' : `<img src="${tile.image}" alt="${tile.alt}" decoding="async">`}<span class="prism-nav-tile-arrow" aria-hidden="true">↗</span></a><ul class="prism-nav-product-links">${tile.links.map(([label, href]) => `<li><a href="${href}">${label}<span aria-hidden="true">↗</span></a></li>`).join('')}</ul></article>`).join('')}</div>
      <p class="prism-nav-development-note">EDIM은 개발 중인 플랫폼입니다. 실제 적용 범위와 제공 기능은 고객 환경 및 PoC 결과에 따라 협의합니다.</p>
    </section>
  </div>`;

  const dockOrder = [
    { key: 'company', label: '회사' },
    { key: 'technology', label: '기술' },
    { key: 'solutions', label: '솔루션' },
    { key: 'resources', label: '자료' },
  ];
  // One optical grid and stroke style for all utility icons; the brand remains
  // the central launcher. Avoid font glyphs whose bounds vary by platform.
  const dockIconPaths = {
    company: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h1m4 0h1M9 11h1m4 0h1M10 21v-5h4v5"/>',
    technology: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M10 10h4v4h-4zM9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3"/>',
    resources: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 12h6m-6 4h6"/>',
    contact: '<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 3V7.5A3.5 3.5 0 0 1 7.5 4h9A3.5 3.5 0 0 1 20 7.5zM8 9h8m-8 4h5"/>',
  };
  const dockIcon = (key) => key === 'solutions'
    ? '<img src="./assets/brand/nova-symbol-navigation.svg" alt="" width="39" height="39">'
    : `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="0.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${dockIconPaths[key]}</svg>`;
  const dockButton = ({ key, label }) => `<button class="prism-dock-item${key === 'solutions' ? ' prism-dock-primary' : ''}" id="prism-dock-trigger-${key}" type="button" data-prism-dock-trigger="${key}" aria-expanded="false" aria-controls="prism-nav-panel-${key}"><span class="prism-dock-icon" aria-hidden="true">${dockIcon(key)}</span><span class="prism-dock-label">${label}</span></button>`;
  // There is one instance of each panel. A breakpoint change moves those same
  // nodes, preserving Company links and any listeners bound by later scripts.
  const markup = `<div class="prism-nav-drawer"><div class="prism-nav-items">${solutions}${sections.map(editorial).join('')}<a class="prism-nav-contact" href="./contact.html">Contact Us<span aria-hidden="true">↗</span></a></div></div><div class="prism-nav-mobile-shell"><div class="prism-nav-sheet" hidden><div class="prism-nav-mobile-heading"><span id="prism-nav-sheet-title">Explore NOVA</span><button class="prism-nav-close" type="button" data-prism-nav-close aria-label="메뉴 닫기"><span aria-hidden="true">×</span></button></div><div class="prism-nav-sheet-content" id="prism-nav-sheet-content" data-novascroll data-novascroll-label="하단 메뉴"></div></div><div class="prism-nav-dock" aria-label="주요 메뉴">${dockOrder.map(dockButton).join('')}<a class="prism-dock-item" href="./contact.html"><span class="prism-dock-icon" aria-hidden="true">${dockIcon('contact')}</span><span class="prism-dock-label">문의</span></a></div></div>`;
  nav.innerHTML = markup;
  nav.classList.add('prism-nav');
  const drawer = nav.querySelector('.prism-nav-drawer');
  const mobileShell = nav.querySelector('.prism-nav-mobile-shell');
  const sheet = nav.querySelector('.prism-nav-sheet');
  const sheetContent = nav.querySelector('.prism-nav-sheet-content');
  const sheetTitle = nav.querySelector('#prism-nav-sheet-title');
  const closeButton = nav.querySelector('[data-prism-nav-close]');
  const groups = [...nav.querySelectorAll('[data-prism-nav-group]')];
  const triggers = [...nav.querySelectorAll('[data-prism-nav-trigger]')];
  const dockTriggers = [...nav.querySelectorAll('[data-prism-dock-trigger]')];
  const dockControls = [...nav.querySelectorAll('.prism-nav-dock > button, .prism-nav-dock > a')];
  const allTriggers = [...triggers, ...dockTriggers];
  const panels = [...nav.querySelectorAll('.prism-nav-panel')];
  const panelHomes = new Map(panels.map((panel) => [panel, panel.parentElement]));
  const backdrop = document.createElement('div');
  backdrop.className = 'prism-nav-backdrop';
  backdrop.hidden = true;
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.append(backdrop);

  let activeMenu = null;
  let openingSource = null;
  let drawerOpen = false;
  let drawerClosing = false;
  let hoverTimer = 0;
  let restoreTarget = null;
  let keyboardBaseline = Math.max(window.innerHeight, window.visualViewport?.height || 0);
  let baselineWidth = window.innerWidth;
  let headerCompact = window.scrollY > 24;
  const inertRecords = new Map();
  const menuMotions = new Map();
  const focusableSelector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const menuScrollbars = () => [...document.querySelectorAll('.novascroll-thumb[aria-controls]')].filter((thumb) => {
    const surface = document.getElementById(thumb.getAttribute('aria-controls'));
    return surface === nav || (surface && nav.contains(surface));
  });
  const isMenuInteraction = (target) => target instanceof Node && (nav.contains(target) || menuScrollbars().some((thumb) => thumb.parentElement.contains(target)));
  const visibleFocusables = () => [...nav.querySelectorAll(focusableSelector), ...menuScrollbars()].filter((element) => !element.closest('[hidden],[inert]') && element.getClientRects().length > 0);
  const notifyLayout = () => {
    const scrollElement = mobileQuery.matches ? sheetContent : panels.find((panel) => !panel.hidden) || nav;
    document.dispatchEvent(new CustomEvent('prism:navigation-layout', { detail: { mobile: mobileQuery.matches, open: drawerOpen, panel: activeMenu, scrollElement } }));
    requestAnimationFrame(() => {
      if (!drawerOpen) { mobileShell.removeAttribute('aria-owns'); return; }
      const ids = menuScrollbars().map((thumb, index) => {
        if (!thumb.id) thumb.id = `prism-nav-scrollbar-${index}`;
        return thumb.id;
      });
      if (ids.length) mobileShell.setAttribute('aria-owns', ids.join(' '));
    });
  };

  function cancelMenuMotion(channel) {
    const animation = menuMotions.get(channel);
    if (!animation) return;
    // Remove the identity first: cancellation must never complete an old close
    // after the user has already reopened or switched to another category.
    menuMotions.delete(channel);
    animation.cancel();
  }

  function animateMenu(channel, element, keyframes, duration, complete = () => {}) {
    cancelMenuMotion(channel);
    if (!mobileQuery.matches || reducedMotionQuery.matches || typeof element.animate !== 'function') {
      complete();
      return;
    }
    const animation = element.animate(keyframes, { duration, easing: 'ease-in-out', fill: 'both' });
    menuMotions.set(channel, animation);
    animation.finished.then(() => {
      if (menuMotions.get(channel) !== animation) return;
      menuMotions.delete(channel);
      animation.cancel();
      complete();
    }, () => {});
  }

  function sheetFrame() {
    const style = window.getComputedStyle(sheet);
    return { transform: style.transform, opacity: style.opacity };
  }

  function setBackgroundInert(enabled) {
    if (!enabled) {
      inertRecords.forEach((wasInert, element) => { element.inert = wasInert; });
      inertRecords.clear();
      return;
    }
    let branch = mobileShell;
    while (branch && branch !== document.body) {
      const parent = branch.parentElement;
      if (!parent) break;
      [...parent.children].forEach((sibling) => {
        if (sibling === branch || sibling === backdrop || sibling.classList.contains('novascroll-layer') || /^(SCRIPT|STYLE|LINK)$/.test(sibling.tagName)) return;
        if (!inertRecords.has(sibling)) inertRecords.set(sibling, sibling.inert);
        sibling.inert = true;
      });
      branch = parent;
    }
  }

  function syncBackdrop() {
    backdrop.hidden = mobileQuery.matches ? !drawerOpen : !activeMenu;
    backdrop.classList.toggle('prism-nav-backdrop-mobile', mobileQuery.matches);
    header.classList.toggle('prism-nav-panel-open', !!activeMenu || drawerOpen);
  }

  function closePanel(restoreFocus = false) {
    window.clearTimeout(hoverTimer);
    cancelMenuMotion('panel');
    const previous = activeMenu && nav.querySelector(`[data-prism-${mobileQuery.matches ? 'dock' : 'nav'}-trigger="${activeMenu}"]`);
    activeMenu = null;
    openingSource = null;
    allTriggers.forEach((button) => button.setAttribute('aria-expanded', 'false'));
    panels.forEach((panel) => { panel.hidden = true; });
    groups.forEach((group) => group.classList.remove('prism-nav-group-open'));
    syncBackdrop();
    if (restoreFocus) previous?.focus({ preventScroll: true });
    notifyLayout();
  }

  function openPanel(key, source = 'click', moveFocus = false, animateSwitch = true) {
    const button = nav.querySelector(`[data-prism-nav-trigger="${key}"]`);
    const panel = button && document.getElementById(button.getAttribute('aria-controls'));
    if (!button || !panel) return;
    window.clearTimeout(hoverTimer);
    const previousMenu = activeMenu;
    const changed = previousMenu !== key;
    cancelMenuMotion('panel');
    activeMenu = key;
    openingSource = source;
    allTriggers.forEach((item) => item.setAttribute('aria-expanded', String((item.dataset.prismNavTrigger || item.dataset.prismDockTrigger) === key)));
    panels.forEach((item) => { item.hidden = item !== panel; });
    groups.forEach((group) => group.classList.toggle('prism-nav-group-open', group.dataset.prismNavGroup === key));
    if (mobileQuery.matches) {
      sheetTitle.textContent = `${dockOrder.find((item) => item.key === key)?.label || key} 메뉴`;
      if (changed) sheetContent.scrollTop = 0;
      if (changed && previousMenu && animateSwitch) {
        const previousIndex = dockOrder.findIndex((item) => item.key === previousMenu);
        const nextIndex = dockOrder.findIndex((item) => item.key === key);
        const direction = nextIndex > previousIndex ? 1 : -1;
        // Slide the existing incoming panel in the direction of dock travel.
        // Hidden outgoing panels remain outside the focus and accessibility tree.
        animateMenu('panel', panel, [
          { transform: `translate3d(${direction * 36}px, 0, 0)`, opacity: 0 },
          { transform: 'translate3d(0, 0, 0)', opacity: 1 },
        ], 280);
      }
    }
    syncBackdrop();
    if (moveFocus) panel.querySelector('a[href]')?.focus({ preventScroll: true });
    notifyLayout();
  }

  function openDrawer(key = 'solutions', initiator = null) {
    if (!mobileQuery.matches) return;
    const button = dockTriggers.find((item) => item.dataset.prismDockTrigger === key);
    if (!button) return;
    const wasOpen = drawerOpen;
    const wasClosing = drawerClosing;
    const interruptedFrame = wasClosing ? sheetFrame() : null;
    if (wasClosing) cancelMenuMotion('sheet');
    drawerClosing = false;
    const oldPanelHasFocus = panels.some((panel) => panel.contains(document.activeElement));
    restoreTarget = initiator instanceof HTMLElement ? initiator : button;
    drawerOpen = true;
    // Programmatic opening can follow an editable field while its keyboard is
    // still visible; reveal the shell before trying to move focus into it.
    updateKeyboardVisibility();
    nav.classList.add('prism-nav-is-open');
    mobileShell.inert = false;
    sheet.hidden = false;
    mobileShell.setAttribute('role', 'dialog');
    mobileShell.setAttribute('aria-modal', 'true');
    mobileShell.setAttribute('aria-labelledby', sheetTitle.id);
    toggle.setAttribute('aria-expanded', 'true');
    if (menuLabel) menuLabel.textContent = '메뉴 닫기';
    document.body.classList.add('prism-nav-open');
    setBackgroundInert(true);
    openPanel(key, 'click', false, wasOpen && !wasClosing);
    syncBackdrop();
    if (!wasOpen || wasClosing) {
      animateMenu('sheet', sheet, [
        interruptedFrame || { transform: 'translate3d(0, 28px, 0)', opacity: 0 },
        { transform: 'translate3d(0, 0, 0)', opacity: 1 },
      ], 320);
    }
    if (!wasOpen || oldPanelHasFocus) closeButton.focus({ preventScroll: true });
    notifyLayout();
  }

  function finishClose(restoreFocus = false) {
    cancelMenuMotion('sheet');
    cancelMenuMotion('panel');
    drawerClosing = false;
    const wasDrawerOpen = drawerOpen;
    const focusWasInside = isMenuInteraction(document.activeElement);
    const oldTrigger = activeMenu && nav.querySelector(`[data-prism-${mobileQuery.matches ? 'dock' : 'nav'}-trigger="${activeMenu}"]`);
    drawerOpen = false;
    closePanel(false);
    nav.classList.remove('prism-nav-is-open');
    sheet.hidden = true;
    mobileShell.removeAttribute('role');
    mobileShell.removeAttribute('aria-modal');
    mobileShell.removeAttribute('aria-labelledby');
    mobileShell.removeAttribute('aria-owns');
    toggle.setAttribute('aria-expanded', 'false');
    if (menuLabel) menuLabel.textContent = '메뉴 열기';
    document.body.classList.remove('prism-nav-open');
    setBackgroundInert(false);
    syncBackdrop();
    if (restoreFocus && (wasDrawerOpen || focusWasInside)) {
      const target = wasDrawerOpen ? restoreTarget || dockTriggers[2] : oldTrigger;
      if (target?.isConnected && !target.closest('[inert]') && target.getClientRects().length) target.focus({ preventScroll: true });
    }
    restoreTarget = null;
    notifyLayout();
  }

  function close(restoreFocus = false) {
    // close(false) is intentionally synchronous. Existing Company detail links
    // must receive the released background immediately, without a late callback
    // overriding the destination's focus state.
    if (!restoreFocus || !mobileQuery.matches || !drawerOpen || reducedMotionQuery.matches) {
      finishClose(restoreFocus);
      return;
    }
    if (drawerClosing) return;
    const from = sheetFrame();
    drawerClosing = true;
    cancelMenuMotion('panel');
    // Keep the dialog, backdrop, focus trap and background lock in place until
    // the closing sheet has left. Dock controls remain usable to reopen it.
    animateMenu('sheet', sheet, [
      from,
      { transform: 'translate3d(0, 28px, 0)', opacity: 0 },
    ], 320, () => finishClose(true));
  }

  function updateCurrentLinks() {
    const filename = location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('a[href]').forEach((link) => {
      link.removeAttribute('aria-current');
      const target = new URL(link.getAttribute('href'), location.href);
      if ((target.pathname.split('/').pop() || 'index.html') !== filename) return;
      if (!target.hash) link.setAttribute('aria-current', 'page');
      else if (target.hash === location.hash) link.setAttribute('aria-current', 'location');
    });
    allTriggers.forEach((button) => {
      const key = button.dataset.prismNavTrigger || button.dataset.prismDockTrigger;
      const current = key === 'solutions' ? solutionPages.includes(filename) : filename === `${key}.html`;
      button.classList.toggle('prism-nav-current', current);
      if (current) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  }

  triggers.forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.prismNavTrigger;
      if (activeMenu === key && openingSource !== 'hover') closePanel(false);
      else openPanel(key, 'click');
    });
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      openPanel(button.dataset.prismNavTrigger, 'keyboard', true);
    });
  });
  dockTriggers.forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.prismDockTrigger;
      if (drawerOpen && !drawerClosing && activeMenu === key) close(true);
      else openDrawer(key, button);
    });
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowUp') return;
      event.preventDefault();
      openDrawer(button.dataset.prismDockTrigger, button);
      panels.find((panel) => !panel.hidden)?.querySelector('a[href]')?.focus({ preventScroll: true });
    });
  });
  dockControls.forEach((control, index) => control.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + dockControls.length) % dockControls.length;
    dockControls[next].focus({ preventScroll: true });
  }));

  function queueHoverClose(key) {
    window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => {
      const group = groups.find((item) => item.dataset.prismNavGroup === key);
      const scrollbarActive = menuScrollbars().some((thumb) => thumb.matches(':hover, :focus') || thumb.classList.contains('is-dragging'));
      if (activeMenu === key && openingSource === 'hover' && !group?.matches(':hover') && !isMenuInteraction(document.activeElement) && !scrollbarActive) closePanel();
    }, 180);
  }

  groups.forEach((group) => {
    group.addEventListener('pointerenter', (event) => {
      if (mobileQuery.matches || !hoverQuery.matches || event.pointerType === 'touch') return;
      window.clearTimeout(hoverTimer);
      if (activeMenu !== group.dataset.prismNavGroup) openPanel(group.dataset.prismNavGroup, 'hover');
    });
    group.addEventListener('pointerleave', () => {
      if (mobileQuery.matches || openingSource !== 'hover') return;
      queueHoverClose(group.dataset.prismNavGroup);
    });
  });
  document.addEventListener('pointerover', (event) => {
    if (event.target instanceof Element && event.target.closest('.novascroll-rail') && isMenuInteraction(event.target)) window.clearTimeout(hoverTimer);
  });
  document.addEventListener('pointerout', (event) => {
    if (mobileQuery.matches || openingSource !== 'hover' || !(event.target instanceof Element)) return;
    if (event.target.closest('.novascroll-rail') && isMenuInteraction(event.target) && !isMenuInteraction(event.relatedTarget)) queueHoverClose(activeMenu);
  });

  toggle.addEventListener('click', () => drawerOpen ? close(true) : openDrawer());
  closeButton.addEventListener('click', () => close(true));
  backdrop.addEventListener('click', () => close(true));
  nav.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('a[href]')) return;
    // Never prevent anchor navigation: Company links have their own accordion handler.
    close(false);
    updateCurrentLinks();
  });
  nav.addEventListener('focusout', () => {
    queueMicrotask(() => {
      if (!mobileQuery.matches && !isMenuInteraction(document.activeElement) && openingSource !== 'hover') closePanel();
    });
  });
  document.addEventListener('pointerdown', (event) => {
    if (mobileQuery.matches || !activeMenu || !(event.target instanceof Node)) return;
    if (!isMenuInteraction(event.target) && !toggle.contains(event.target)) close(isMenuInteraction(document.activeElement));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && (drawerOpen || activeMenu)) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (!drawerOpen || event.key !== 'Tab') return;
    const focusables = visibleFocusables();
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (!first) return;
    if (event.shiftKey && (document.activeElement === first || !isMenuInteraction(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !isMenuInteraction(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  }, true);
  document.addEventListener('focusin', (event) => {
    if (drawerOpen && event.target instanceof Node && !isMenuInteraction(event.target)) closeButton.focus({ preventScroll: true });
    else if (!mobileQuery.matches && activeMenu && openingSource !== 'hover' && !isMenuInteraction(event.target)) closePanel();
    updateKeyboardVisibility();
  });
  document.addEventListener('focusout', () => requestAnimationFrame(updateKeyboardVisibility));

  function applyLayout() {
    const mobile = mobileQuery.matches;
    panels.forEach((panel) => {
      const destination = mobile ? sheetContent : panelHomes.get(panel);
      if (panel.parentElement !== destination) destination.append(panel);
      const key = panel.id.replace('prism-nav-panel-', '');
      panel.setAttribute('aria-labelledby', `prism-${mobile ? 'dock' : 'nav'}-trigger-${key}`);
    });
    drawer.hidden = mobile;
    mobileShell.hidden = !mobile;
    nav.hidden = false;
  }

  mobileQuery.addEventListener('change', () => {
    const hadFocus = isMenuInteraction(document.activeElement);
    const focusedControl = document.activeElement?.closest?.('[data-prism-nav-trigger], [data-prism-dock-trigger]');
    const key = focusedControl?.dataset.prismNavTrigger || focusedControl?.dataset.prismDockTrigger || activeMenu || 'solutions';
    const wasContact = document.activeElement?.closest?.('a[href="./contact.html"]');
    close(false);
    applyLayout();
    updateHeader(true);
    updateKeyboardVisibility();
    if (hadFocus) {
      const controls = mobileQuery.matches ? dockTriggers : triggers;
      const target = wasContact ? nav.querySelector(mobileQuery.matches ? '.prism-nav-dock > a' : '.prism-nav-contact') : controls.find((button) => (button.dataset.prismNavTrigger || button.dataset.prismDockTrigger) === key);
      target?.focus({ preventScroll: true });
    }
    notifyLayout();
  });
  window.addEventListener('hashchange', updateCurrentLinks);
  reducedMotionQuery.addEventListener('change', () => {
    if (!reducedMotionQuery.matches) return;
    cancelMenuMotion('sheet');
    cancelMenuMotion('panel');
    if (drawerClosing) finishClose(true);
    else notifyLayout();
  });

  function updateHeader(force = false) {
    const next = window.scrollY > 24 ? true : window.scrollY <= 8 ? false : headerCompact;
    if (!force && next === headerCompact) return;
    headerCompact = next;
    header.classList.toggle('scrolled', headerCompact);
    const mobile = mobileQuery.matches;
    const top = mobile ? 10 : 14;
    const height = mobile ? (headerCompact ? 51.2 : 64) : (headerCompact ? 60.8 : 76);
    document.documentElement.style.setProperty('--prism-header-top', `${top}px`);
    document.documentElement.style.setProperty('--prism-header-height', `${height}px`);
    document.documentElement.style.setProperty('--prism-header-offset', `${top + height + 12}px`);
    notifyLayout();
  }
  window.addEventListener('scroll', () => updateHeader(), { passive: true });
  header.addEventListener('transitionend', (event) => {
    if (event.target === header && event.propertyName === 'height') notifyLayout();
  });

  function updateKeyboardVisibility() {
    const viewport = window.visualViewport;
    const height = viewport?.height || window.innerHeight;
    const editable = document.activeElement instanceof Element && document.activeElement.closest('textarea, select, input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="hidden"]), [contenteditable]:not([contenteditable="false"])');
    const editing = !!editable && !editable.readOnly && !editable.disabled;
    if (!mobileQuery.matches || Math.abs(window.innerWidth - baselineWidth) > 80) {
      keyboardBaseline = Math.max(window.innerHeight, height);
      baselineWidth = window.innerWidth;
    } else if (!editing) keyboardBaseline = Math.max(keyboardBaseline, window.innerHeight, height);
    const shortened = keyboardBaseline - height > Math.max(100, keyboardBaseline * .18);
    const keyboardOpen = mobileQuery.matches && editing && (!viewport || (viewport.scale < 1.1 && shortened));
    const hidden = keyboardOpen && !drawerOpen;
    document.body.classList.toggle('prism-nav-keyboard-open', hidden);
    mobileShell.inert = hidden;
  }
  window.visualViewport?.addEventListener('resize', updateKeyboardVisibility, { passive: true });
  window.addEventListener('resize', updateKeyboardVisibility, { passive: true });

  window.PrismNavigation = Object.freeze({ close, open: openDrawer, refresh: notifyLayout });
  toggle.setAttribute('aria-controls', nav.id);
  toggle.setAttribute('aria-expanded', 'false');
  applyLayout();
  header.classList.add('prism-nav-ready');
  document.body.classList.add('prism-nav-enhanced');
  updateHeader(true);
  updateCurrentLinks();
  updateKeyboardVisibility();
  notifyLayout();
})();

const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
nav?.querySelectorAll('[data-nav-page]').forEach((link) => {
  if (link.getAttribute('href') === `./${currentPage}`) {
    link.setAttribute('aria-current', 'page');
  }
});

const menuLabel = menuButton?.querySelector('.sr-only');
const setDropdownState = (dropdown, isOpen, moveFocus = false) => {
  const trigger = dropdown.querySelector('.dropdown-trigger');
  const submenu = dropdown.querySelector('.submenu');
  dropdown.classList.toggle('menu-open', isOpen);
  trigger?.setAttribute('aria-expanded', String(isOpen));
  if (moveFocus) submenu?.querySelector('a')?.focus();
};
const closeDropdowns = (restoreFocus = false) => {
  nav?.querySelectorAll('.nav-dropdown.menu-open').forEach((dropdown) => {
    const trigger = dropdown.querySelector('.dropdown-trigger');
    setDropdownState(dropdown, false);
    if (restoreFocus) trigger?.focus();
  });
};
const closeMobileMenu = (restoreFocus = false) => {
  closeDropdowns();
  nav?.classList.remove('open');
  document.body.classList.remove('nav-open');
  menuButton?.setAttribute('aria-expanded', 'false');
  if (menuLabel) menuLabel.textContent = '메뉴 열기';
  if (restoreFocus) menuButton?.focus();
};

// Build the shared dropdowns so their content stays in one navigation source.
const createDropdown = (selector, id, label, markup, className = 'submenu company-menu') => {
  const trigger = nav?.querySelector(selector);
  if (!trigger) return;
  const dropdown = document.createElement('div');
  dropdown.className = 'nav-dropdown';
  const submenu = document.createElement('div');
  submenu.className = className;
  submenu.id = id;
  submenu.setAttribute('aria-label', label);
  submenu.innerHTML = markup;
  trigger.classList.add('dropdown-trigger');
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', id);
  trigger.parentNode.insertBefore(dropdown, trigger);
  dropdown.append(trigger, submenu);
};

nav?.querySelector('a[href="./contact.html"]:not(.nav-cta)')?.remove();
createDropdown('a[href="./company.html"]', 'submenu-company', 'Company 하위 메뉴', `
  <a class="company-overview" href="./company.html"><span><small>COMPANY</small>Who We Are</span><b>Company Overview →</b></a>
  <div class="editorial-menu-body"><div class="editorial-links"><a href="./company.html#about"><b>About Us</b><small>노바솔루션 소개</small></a><a href="./company.html#mission"><b>Mission &amp; Vision</b><small>미션과 비전</small></a><a href="./company.html#history"><b>History</b><small>연혁</small></a><a href="./company.html#foundation"><b>Manufacturing Foundation</b><small>제조 기반</small></a><a href="./company.html#location"><b>Location</b><small>오시는 길</small></a></div><aside class="menu-image"><img src="./assets/menu-company-building.png" alt="현대적인 산업 기술 기업 건축 이미지"><p>Engineering Manufacturing,<br>From Product to Data.</p></aside></div>
`, 'submenu company-menu editorial-menu');
createDropdown('a[href="./technology.html"]', 'submenu-technology', 'Technology 하위 메뉴', `
  <a class="company-overview" href="./technology.html"><span><small>TECHNOLOGY</small>How We Build</span><b>Explore Technology →</b></a>
  <div class="editorial-menu-body"><div class="editorial-links"><a href="./technology.html#manufacturing"><b>Manufacturing Engineering</b><small>제조 엔지니어링</small></a><a href="./technology.html#automation"><b>Engineering Automation</b><small>엔지니어링 자동화</small></a><a href="./technology.html#architecture"><b>Product Data Architecture</b><small>제품 데이터 아키텍처</small></a><a href="./technology.html#rccs"><b>RCCS™</b><small>관계형 제품 구성 기술</small></a><a href="./technology.html#integration"><b>System Integration</b><small>시스템 통합</small></a></div><aside class="menu-image"><img src="./assets/menu-technology-blueprint.png" alt="공조 설비 엔지니어링 도면 이미지"></aside></div>
`, 'submenu company-menu editorial-menu');
createDropdown('a[href="./resources.html"]', 'submenu-resources', 'Resources 하위 메뉴', `
  <a class="company-overview" href="./resources.html"><span><small>RESOURCES</small>NOVA Library</span><b>View All Resources →</b></a>
  <div class="resource-menu-layout"><div class="resource-menu-groups"><div><small>PRODUCT</small><a href="./resources.html#product-catalogues"><b>Product Catalogues</b><span>제품 카탈로그</span></a><a href="./resources.html#technical-documents"><b>Technical Documents</b><span>기술 문서</span></a></div><div><small>COMPANY</small><a href="./resources.html#company-profile"><b>Company Profile</b><span>회사 소개서</span></a><a href="./resources.html#edim-brochure"><b>EDIM Brochure</b><span>EDIM 브로슈어</span></a></div><div><small>UPDATE</small><a href="./resources.html#news-updates"><b>News &amp; Updates</b><span>뉴스 및 업데이트</span></a></div></div><figure class="menu-image"><img src="./assets/menu-resources-catalogues.png" alt="기술 카탈로그와 엔지니어링 문서 이미지"></figure></div>
`, 'submenu company-menu editorial-menu resources-menu');
createDropdown('a[href="./solutions.html"]', 'submenu-solutions', 'Solutions 하위 메뉴', `
  <div class="mega-menu-head"><span><small>SOLUTIONS</small>What We Deliver</span><a href="./solutions.html">View All Solutions →</a></div>
  <div class="solutions-overview">
    <section class="solutions-column solutions-hvac"><a class="solutions-column-title" href="./hvac.html"><b>HVAC</b><small>Air &amp; Climate Engineering</small></a><div class="solutions-groups">
      <div><a class="solutions-group-title" href="./ventilation.html"><b>Ventilation</b><small>송풍·환기 제품군</small></a><a href="./ventilation.html#eurus">Eurus Impeller</a><a href="./ventilation.html#partial">Partial Impeller</a><a href="./ventilation.html#pullout">Pull-Out Impeller</a><a href="./ventilation.html#fan-model">Fan Model Line-Up</a></div>
      <div><a class="solutions-group-title" href="./air-system.html"><b>Air Systems</b><small>공조·공기 처리 시스템</small></a><a href="./air-system.html#ahu">Eco AHU / RTU</a><a href="./air-system.html#bio-hvac">Bio HVAC</a><a href="./air-system.html#ief">IEF Filter</a><a href="./air-system.html#iaqs">IAQS</a></div>
      <div><a class="solutions-group-title" href="./parts-control.html"><b>Parts &amp; Control</b><small>부품·제어 시스템</small></a><a href="./parts-control.html#clt">CLT</a><a href="./parts-control.html#fcm">FCM</a><a href="./parts-control.html#ecm">ECM</a></div>
    </div></section>
    <section class="solutions-column solutions-edim"><a class="solutions-column-title" href="./edim.html"><b>EDIM</b><small>제조 데이터 플랫폼</small></a><div class="solutions-groups solutions-groups-edim"><div><a class="solutions-group-title" href="./edim.html"><b>EDIM Overview</b><small>제조 데이터 연결</small></a><a href="./edim.html#cpq">Engineering Design</a><a href="./edim.html#plm">BOM &amp; Product Data</a><a href="./edim.html#erp">Production Integration</a></div></div><figure class="solutions-menu-visual"><img src="./assets/products/eurus-impeller-cutout.png" alt="NOVA Solution HVAC 임펠러 제품 이미지"></figure></section>
  </div>
`, 'submenu mega-panel solutions-menu');

nav?.querySelector('.solutions-menu')?.querySelectorAll('a').forEach((link) => {
  if (link.getAttribute('href') === `./${currentPage}`) {
    link.setAttribute('aria-current', 'page');
    nav.querySelector('a[href="./solutions.html"]')?.setAttribute('aria-current', 'page');
  }
});

const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 24);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  if (isOpen) {
    closeMobileMenu(true);
    return;
  }
  menuButton.setAttribute('aria-expanded', 'true');
  if (menuLabel) menuLabel.textContent = '메뉴 닫기';
  nav?.classList.add('open');
  document.body.classList.add('nav-open');
  nav?.querySelector('a')?.focus();
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (link.classList.contains('dropdown-trigger')) {
      event.preventDefault();
      const dropdown = link.closest('.nav-dropdown');
      const willOpen = !dropdown.classList.contains('menu-open');
      closeDropdowns();
      setDropdownState(dropdown, willOpen);
      return;
    }
    closeMobileMenu();
  });

  link.addEventListener('keydown', (event) => {
    if (!link.classList.contains('dropdown-trigger')) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const dropdown = link.closest('.nav-dropdown');
      closeDropdowns();
      setDropdownState(dropdown, true, true);
    }
  });
});

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest('.nav-dropdown')) {
    if (!event.target.closest('[data-header]')) {
      const menuWasOpen = nav?.classList.contains('open');
      closeMobileMenu(menuWasOpen);
    } else {
      closeDropdowns();
    }
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (nav?.classList.contains('open')) {
      closeMobileMenu(true);
    } else {
      closeDropdowns(true);
    }
  }
});

const homeSlider = document.querySelector('[data-home-slider]');
if (homeSlider) {
  const slides = [...homeSlider.querySelectorAll(':scope > [data-home-slide]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const navDots = document.createElement('nav');
  const counter = document.createElement('div');
  const hint = document.createElement('div');
  navDots.className = 'home-swipe-nav';
  navDots.setAttribute('aria-label', '홈 화면 슬라이드');
  counter.className = 'home-swipe-counter';
  hint.className = 'home-swipe-hint';
  hint.textContent = 'SWIPE · SCROLL · ARROW KEYS';
  let activeIndex = Math.max(0, slides.findIndex((slide) => `#${slide.id}` === location.hash));
  let transitioning = false;
  let pointerY = 0;
  let pointerX = 0;
  let pointerMoved = false;

  slides.forEach((slide, index) => {
    slide.classList.add(index < activeIndex ? 'is-home-before' : index > activeIndex ? 'is-home-after' : 'is-home-active');
    slide.setAttribute('aria-hidden', String(index !== activeIndex));
    const dot = document.createElement('button');
    dot.className = `home-swipe-dot${index === activeIndex ? ' is-active' : ''}`;
    dot.type = 'button';
    dot.setAttribute('aria-label', slide.dataset.slideLabel || `Slide ${index + 1}`);
    dot.addEventListener('click', () => goToSlide(index));
    navDots.append(dot);
  });
  document.body.append(navDots, counter, hint);
  document.body.classList.add('home-slider-ready');

  const syncControls = () => {
    [...navDots.children].forEach((dot, index) => dot.classList.toggle('is-active', index === activeIndex));
    counter.innerHTML = `<b>${String(activeIndex + 1).padStart(2, '0')}</b> / ${String(slides.length).padStart(2, '0')}`;
  };
  const goToSlide = async (nextIndex) => {
    nextIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    if (transitioning || nextIndex === activeIndex) return;
    transitioning = true;
    const current = slides[activeIndex];
    const next = slides[nextIndex];
    const direction = nextIndex > activeIndex ? 1 : -1;
    next.style.visibility = 'visible';
    next.style.opacity = '1';
    next.scrollTop = direction > 0 ? 0 : Math.max(0, next.scrollHeight - next.clientHeight);
    if (!reducedMotion) {
      const options = { duration: 760, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'both' };
      await Promise.all([
        current.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${-direction * 100}%)`, opacity: .35 }], options).finished.catch(() => {}),
        next.animate([{ transform: `translateY(${direction * 100}%)`, opacity: .35 }, { transform: 'translateY(0)', opacity: 1 }], options).finished.catch(() => {}),
      ]);
    }
    slides.forEach((slide, index) => {
      slide.getAnimations().forEach((animation) => animation.cancel());
      slide.style.visibility = '';
      slide.style.opacity = '';
      slide.classList.toggle('is-home-active', index === nextIndex);
      slide.classList.toggle('is-home-before', index < nextIndex);
      slide.classList.toggle('is-home-after', index > nextIndex);
      slide.setAttribute('aria-hidden', String(index !== nextIndex));
    });
    activeIndex = nextIndex;
    history.replaceState(null, '', `#${next.id}`);
    syncControls();
    transitioning = false;
  };
  const slideCanScroll = (slide, delta) => delta > 0
    ? slide.scrollTop + slide.clientHeight < slide.scrollHeight - 3
    : slide.scrollTop > 3;
  window.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaY) < 12 || transitioning) return;
    const active = slides[activeIndex];
    if (slideCanScroll(active, event.deltaY)) return;
    event.preventDefault();
    goToSlide(activeIndex + (event.deltaY > 0 ? 1 : -1));
  }, { passive: false });
  homeSlider.addEventListener('pointerdown', (event) => {
    pointerY = event.clientY;
    pointerX = event.clientX;
    pointerMoved = false;
  });
  homeSlider.addEventListener('pointerup', (event) => {
    const dy = event.clientY - pointerY;
    const dx = event.clientX - pointerX;
    if (Math.abs(dy) > 58 && Math.abs(dy) > Math.abs(dx)) {
      pointerMoved = true;
      goToSlide(activeIndex + (dy < 0 ? 1 : -1));
    }
  });
  homeSlider.addEventListener('click', (event) => { if (pointerMoved) { event.preventDefault(); pointerMoved = false; } }, true);
  window.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'PageDown'].includes(event.key)) { event.preventDefault(); goToSlide(activeIndex + 1); }
    if (['ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); goToSlide(activeIndex - 1); }
    if (event.key === 'Home') goToSlide(0);
    if (event.key === 'End') goToSlide(slides.length - 1);
  });
  syncControls();
}

document.querySelectorAll('[data-infinite-slider]').forEach((slider) => {
  const track = slider.querySelector('[data-slider-track]');
  const cards = [...track.querySelectorAll('.solution-product-card')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  cards.forEach((card, index) => {
    card.dataset.slideIndex = index;
    const clone = card.cloneNode(true);
    clone.dataset.slideIndex = index;
    clone.dataset.sliderClone = 'true';
    clone.setAttribute('aria-hidden', 'true');
    clone.tabIndex = -1;
    track.append(clone);
  });
  const allCards = [...track.querySelectorAll('.solution-product-card')];
  let activeIndex = 0;
  let frame = 0;
  let autoFrame = 0;
  let lastTime = 0;
  let pausedUntil = 0;
  let pointerStart = 0;
  let scrollStart = 0;
  let dragged = false;

  const loopWidth = () => allCards[cards.length].offsetLeft - allCards[0].offsetLeft;
  const pauseAuto = (duration = 2600) => { pausedUntil = performance.now() + duration; };

  const updateActive = () => {
    frame = 0;
    const trackLeft = track.getBoundingClientRect().left;
    const closest = allCards.reduce((nearest, card, index) => {
      const current = Math.abs(card.getBoundingClientRect().left - trackLeft);
      const previous = Math.abs(allCards[nearest].getBoundingClientRect().left - trackLeft);
      return current < previous ? index : nearest;
    }, 0);
    activeIndex = Number(allCards[closest].dataset.slideIndex);
    allCards.forEach((card) => card.classList.toggle('is-active', Number(card.dataset.slideIndex) === activeIndex));
  };
  const goTo = (index) => {
    activeIndex = (index + cards.length) % cards.length;
    track.scrollTo({ left: cards[activeIndex].offsetLeft - track.offsetLeft, behavior: reducedMotion ? 'auto' : 'smooth' });
    window.setTimeout(updateActive, reducedMotion ? 0 : 260);
  };

  const autoplay = (time) => {
    if (!lastTime) lastTime = time;
    const elapsed = Math.min(time - lastTime, 40);
    lastTime = time;
    if (!reducedMotion && time >= pausedUntil && !track.classList.contains('is-dragging')) {
      track.classList.add('is-auto-playing');
      track.scrollLeft += elapsed * 0.018;
      const width = loopWidth();
      if (width && track.scrollLeft >= width) track.scrollLeft -= width;
    } else {
      track.classList.remove('is-auto-playing');
    }
    autoFrame = requestAnimationFrame(autoplay);
  };

  slider.querySelector('[data-slider-prev]')?.addEventListener('click', () => { pauseAuto(); goTo(activeIndex - 1); });
  slider.querySelector('[data-slider-next]')?.addEventListener('click', () => { pauseAuto(); goTo(activeIndex + 1); });
  track.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(updateActive);
  }, { passive: true });
  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); pauseAuto(); goTo(activeIndex + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); pauseAuto(); goTo(activeIndex - 1); }
  });
  track.addEventListener('pointerdown', (event) => {
    pauseAuto();
    pointerStart = event.clientX;
    scrollStart = track.scrollLeft;
    dragged = false;
    track.classList.add('is-dragging');
    track.setPointerCapture(event.pointerId);
  });
  track.addEventListener('pointermove', (event) => {
    if (!track.hasPointerCapture(event.pointerId)) return;
    const distance = event.clientX - pointerStart;
    if (Math.abs(distance) > 6) dragged = true;
    track.scrollLeft = scrollStart - distance;
  });
  const finishDrag = (event) => {
    if (!track.hasPointerCapture(event.pointerId)) return;
    track.releasePointerCapture(event.pointerId);
    track.classList.remove('is-dragging');
    updateActive();
    goTo(activeIndex);
  };
  track.addEventListener('pointerup', finishDrag);
  track.addEventListener('pointercancel', finishDrag);
  track.addEventListener('click', (event) => { if (dragged) event.preventDefault(); }, true);
  track.addEventListener('mouseenter', () => pauseAuto(900));
  track.addEventListener('focusin', () => pauseAuto());
  updateActive();
  autoFrame = requestAnimationFrame(autoplay);
});

const observer = new IntersectionObserver(
  (entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      const counter = entry.target.querySelector('[data-counter]');
      if (counter && !counter.dataset.started) {
        counter.dataset.started = 'true';
        animateCounter(counter);
      }
      observer.unobserve(entry.target);
    }
  }),
  { threshold: 0.14 }
);

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const operatingCasesMetric = document.querySelector('.partial-metrics article:nth-child(2) strong');
if (operatingCasesMetric) {
  const suffix = operatingCasesMetric.querySelector('sup');
  const counter = document.createElement('span');
  counter.dataset.counter = '5000';
  counter.textContent = '0';
  operatingCasesMetric.insertBefore(counter, suffix);
  operatingCasesMetric.firstChild.textContent = '';
}

const counters = document.querySelectorAll('[data-counter]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const formatCounter = (value) => new Intl.NumberFormat('en-US').format(value);

// Re-align deep links after product imagery and web fonts finish loading.
if (window.location.hash) {
  window.addEventListener('load', async () => {
    const target = document.querySelector(window.location.hash);
    if (document.fonts?.ready) await document.fonts.ready;
    window.setTimeout(() => target?.scrollIntoView({ block: 'start' }), 120);
  }, { once: true });
}

function animateCounter(element) {
  const target = Number(element.dataset.counter);
  if (reducedMotion) {
    element.textContent = formatCounter(target);
    return;
  }

  const startTime = performance.now();
  const duration = 1400;
  const update = (currentTime) => {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const easedProgress = 1 - (1 - progress) ** 3;
    element.textContent = formatCounter(Math.round(target * easedProgress));
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
const checkCounterVisibility = () => {
  counters.forEach((counter) => {
    if (counter.dataset.started) return;
    const card = counter.closest('.partial-metrics article');
    const rect = card?.getBoundingClientRect();
    if (rect && rect.top < window.innerHeight * 0.85 && rect.bottom > 0) {
      counter.dataset.started = 'true';
      animateCounter(counter);
    }
  });
};
window.addEventListener('scroll', checkCounterVisibility, { passive: true });
requestAnimationFrame(checkCounterVisibility);

const fanCarousel = document.querySelector('[data-fan-carousel]');
if (fanCarousel) {
  const modelOrder = ['kad', 'kap', 'kas'];
  const cards = [...fanCarousel.querySelectorAll('[data-fan-model]')];
  const panels = [...document.querySelectorAll('[data-fan-panel]')];
  const currentLabel = fanCarousel.querySelector('[data-fan-current]');
  let activeIndex = modelOrder.indexOf(cards.find((card) => card.classList.contains('is-active'))?.dataset.fanModel);
  if (activeIndex < 0) activeIndex = 1;

  const selectFanModel = (index, shouldScroll = true) => {
    activeIndex = (index + modelOrder.length) % modelOrder.length;
    const activeModel = modelOrder[activeIndex];
    cards.forEach((card) => {
      const selected = card.dataset.fanModel === activeModel;
      card.classList.toggle('is-active', selected);
      card.setAttribute('aria-pressed', String(selected));
      if (selected && shouldScroll && window.matchMedia('(max-width: 900px)').matches) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
    panels.forEach((panel) => {
      const selected = panel.dataset.fanPanel === activeModel;
      panel.hidden = !selected;
      panel.classList.toggle('is-active', selected);
    });
    if (currentLabel) currentLabel.textContent = String(activeIndex + 1).padStart(2, '0');
  };

  cards.forEach((card, index) => card.addEventListener('click', () => selectFanModel(index)));
  fanCarousel.querySelector('[data-fan-prev]')?.addEventListener('click', () => selectFanModel(activeIndex - 1));
  fanCarousel.querySelector('[data-fan-next]')?.addEventListener('click', () => selectFanModel(activeIndex + 1));
  selectFanModel(activeIndex, false);
}

document.querySelectorAll('[data-year]').forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const locationMapWrap = document.querySelector('[data-location-map]');
if (locationMapWrap && window.L) {
  const office = [37.2140373, 127.1019493];
  const map = L.map('nova-location-map', { zoomControl: false, scrollWheelZoom: false, attributionControl: true }).setView(office, 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  L.control.zoom({ position: 'topright' }).addTo(map);
  const marker = L.marker(office, { icon: L.divIcon({ className: 'nova-map-pin', html: '<span class="nova-map-pin-core"></span>', iconSize: [54, 54], iconAnchor: [27, 52] }) }).addTo(map);
  locationMapWrap._novaLeafletMap = map;
  marker.bindTooltip('NOVA Solution · 8F 807', { direction: 'top', offset: [0, -48], opacity: .92 });

  const grid = locationMapWrap.querySelector('[data-map-grid]');
  const dots = [];
  for (let y = 10; y <= 90; y += 10) for (let x = 8; x <= 92; x += 7) {
    const dot = document.createElement('i');
    dot.className = 'map-proximity-dot';
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
    grid.append(dot);
    dots.push(dot);
  }
  locationMapWrap.addEventListener('pointermove', (event) => {
    const rect = locationMapWrap.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    dots.forEach((dot) => {
      const distance = Math.hypot(px - dot.offsetLeft, py - dot.offsetTop);
      const strength = Math.max(0, 1 - distance / 150);
      dot.style.setProperty('--dot-scale', String(1 + strength * 4));
      dot.style.opacity = String(.2 + strength * .8);
    });
    const pin = locationMapWrap.querySelector('.nova-map-pin-core');
    if (pin) {
      const pinRect = pin.getBoundingClientRect();
      const distance = Math.hypot(event.clientX - (pinRect.left + pinRect.width / 2), event.clientY - (pinRect.top + pinRect.height / 2));
      const strength = Math.max(0, 1 - distance / 180);
      pin.style.setProperty('--pin-scale', String(1 + strength * .48));
      pin.style.boxShadow = `0 12px 34px rgba(4,24,42,.38), 0 0 0 ${9 + strength * 22}px rgba(87,203,227,${.17 + strength * .16})`;
    }
  });
  locationMapWrap.addEventListener('pointerleave', () => {
    dots.forEach((dot) => { dot.style.setProperty('--dot-scale', '1'); dot.style.opacity = ''; });
    const pin = locationMapWrap.querySelector('.nova-map-pin-core');
    if (pin) { pin.style.setProperty('--pin-scale', '1'); pin.style.boxShadow = ''; }
  });

  let zoomed = false;
  new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting || zoomed) return;
    zoomed = true;
    window.setTimeout(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) map.setView(office, 17, { animate: false });
      else map.flyTo(office, 17, { animate: true, duration: 2.5 });
    }, 180);
    observer.disconnect();
  }, { threshold: .38 }).observe(locationMapWrap);
}

const companyPanels = [...document.querySelectorAll('[data-company-panel]')];
if (companyPanels.length) {
  document.body.classList.add('company-modal-ready');
  const backdrop = document.createElement('button');
  backdrop.className = 'company-modal-backdrop';
  backdrop.type = 'button';
  backdrop.setAttribute('aria-label', '회사 정보 닫기');
  document.body.append(backdrop);
  let activePanel = null;
  let activeTrigger = null;

  companyPanels.forEach((panel) => {
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-hidden', 'true');
    const close = document.createElement('button');
    close.className = 'company-panel-close';
    close.type = 'button';
    close.setAttribute('aria-label', `${panel.id} 정보 닫기`);
    close.innerHTML = '<span aria-hidden="true">×</span>';
    panel.prepend(close);
  });

  const animatePanel = (panel, trigger, opening) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
    const panelRect = panel.getBoundingClientRect();
    const cardRect = trigger?.getBoundingClientRect() || panelRect;
    const dx = cardRect.left + cardRect.width / 2 - (panelRect.left + panelRect.width / 2);
    const dy = cardRect.top + cardRect.height / 2 - (panelRect.top + panelRect.height / 2);
    const sx = Math.max(.08, cardRect.width / panelRect.width);
    const sy = Math.max(.08, cardRect.height / panelRect.height);
    const frames = [
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, borderRadius: '18px', opacity: .45 },
      { transform: 'translate(0,0) scale(1)', borderRadius: '20px', opacity: 1 },
    ];
    return panel.animate(opening ? frames : frames.reverse(), { duration: opening ? 560 : 380, easing: opening ? 'cubic-bezier(.2,.8,.2,1)' : 'cubic-bezier(.4,0,.8,.2)', fill: 'both' }).finished.catch(() => {});
  };
  const openCompanyPanel = async (id, trigger, updateHash = true) => {
    const panel = document.getElementById(id);
    if (!panel || !panel.matches('[data-company-panel]')) return;
    if (activePanel) activePanel.classList.remove('is-company-open');
    activePanel = panel;
    activeTrigger = trigger || document.querySelector(`[data-company-open="${id}"]`);
    panel.classList.add('is-company-open');
    panel.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('is-visible');
    document.body.classList.add('company-panel-open');
    if (updateHash) history.replaceState(null, '', `#${id}`);
    await animatePanel(panel, activeTrigger, true);
    if (id === 'location') {
      window.setTimeout(() => {
        locationMapWrap?._novaLeafletMap?.invalidateSize();
        locationMapWrap?._novaLeafletMap?.flyTo([37.2140373, 127.1019493], 17, { animate: true, duration: 2.2 });
      }, 80);
    }
    panel.querySelector('.company-panel-close')?.focus({ preventScroll: true });
  };
  const closeCompanyPanel = async () => {
    if (!activePanel) return;
    const panel = activePanel;
    await animatePanel(panel, activeTrigger, false);
    panel.classList.remove('is-company-open');
    panel.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('is-visible');
    document.body.classList.remove('company-panel-open');
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    activePanel = null;
    activeTrigger?.focus({ preventScroll: true });
    activeTrigger = null;
  };

  document.querySelectorAll('[data-company-open]').forEach((trigger) => trigger.addEventListener('click', () => openCompanyPanel(trigger.dataset.companyOpen, trigger)));
  document.querySelectorAll('a[href*="company.html#"]').forEach((link) => link.addEventListener('click', (event) => {
    const id = link.hash.slice(1);
    if (!companyPanels.some((panel) => panel.id === id)) return;
    event.preventDefault();
    closeMobileMenu();
    openCompanyPanel(id, document.querySelector(`[data-company-open="${id}"]`));
  }));
  companyPanels.forEach((panel) => panel.querySelector('.company-panel-close')?.addEventListener('click', closeCompanyPanel));
  backdrop.addEventListener('click', closeCompanyPanel);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && activePanel) closeCompanyPanel(); });
  const initialPanel = location.hash.slice(1);
  if (companyPanels.some((panel) => panel.id === initialPanel)) requestAnimationFrame(() => openCompanyPanel(initialPanel, null, false));
}

const inquiryForm = document.querySelector('[data-inquiry-form]');
const productField = document.querySelector('[data-product-field]');
if (inquiryForm) {
  inquiryForm.querySelectorAll('input[name="inquiryType"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!productField) return;
      const labels = {
        hvac: ['HVAC 제품을 선택해 주세요', 'Eurus Impeller', 'Partial Impeller', 'Pull-Out Impeller', 'Fan Model 라인업', 'AHU / RTU', 'Bio HVAC', 'IEF 전기집진필터', 'IAQS 실내공기질', 'CLT 배수 트랩', 'FCM 팬 제어', 'ECM 공조기 제어'],
        edim: ['EDIM 영역을 선택해 주세요', 'CPQ', 'PLM', 'RCCS™', 'ERP 연계', 'Demo / PoC', '시스템 연계'],
        partnership: ['협력 분야를 선택해 주세요', '기술 협력', '제조 협력', '사업 제휴'],
      };
      productField.innerHTML = labels[radio.value].map((label, index) => `<option value="${index ? label : ''}">${label}</option>`).join('');
      productField.disabled = false;
    });
  });
}

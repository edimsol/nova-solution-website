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
  <div class="company-menu-grid">
    <a href="./company.html#about"><small>01</small><span>About NOVA Solution</span></a>
    <a href="./company.html#mission"><small>02</small><span>Mission & Vision</span></a>
    <a href="./company.html#history"><small>03</small><span>History</span></a>
    <a href="./company.html#foundation"><small>04</small><span>Manufacturing Foundation</span></a>
    <a href="./company.html#location"><small>05</small><span>Location</span></a>
  </div>
`);
createDropdown('a[href="./technology.html"]', 'submenu-technology', 'Technology 하위 메뉴', `
  <a class="company-overview" href="./technology.html"><span><small>TECHNOLOGY</small>How We Build</span><b>Explore Technology →</b></a>
  <div class="company-menu-grid">
    <a href="./technology.html#manufacturing"><small>01</small><span>Manufacturing Engineering</span></a>
    <a href="./technology.html#automation"><small>02</small><span>Engineering Automation</span></a>
    <a href="./technology.html#architecture"><small>03</small><span>Product Data Architecture</span></a>
    <a href="./technology.html#rccs"><small>04</small><span>RCCS™</span></a>
    <a href="./technology.html#integration"><small>05</small><span>System Integration</span></a>
  </div>
`);
createDropdown('a[href="./resources.html"]', 'submenu-resources', 'Resources 하위 메뉴', `
  <a class="company-overview" href="./resources.html"><span><small>RESOURCES</small>NOVA Library</span><b>자료실 전체보기 →</b></a>
  <div class="company-menu-grid">
    <a href="./resources.html#product-catalogues"><small>01</small><span>Product Catalogues</span></a>
    <a href="./resources.html#technical-documents"><small>02</small><span>Technical Documents</span></a>
    <a href="./resources.html#edim-brochure"><small>03</small><span>EDIM Brochure</span></a>
    <a href="./resources.html#company-profile"><small>04</small><span>Company Profile</span></a>
    <a href="./resources.html#news-updates"><small>05</small><span>News & Updates</span></a>
  </div>
`);
createDropdown('a[href="./solutions.html"]', 'submenu-solutions', 'Solutions 하위 메뉴', `
  <div class="mega-menu-head"><span><small>SOLUTIONS</small>What We Deliver</span><a href="./solutions.html">View All Solutions →</a></div>
  <div class="solutions-overview">
    <section class="solutions-column solutions-hvac"><a class="solutions-column-title" href="./hvac.html"><b>HVAC</b><small>Air &amp; Climate Engineering</small></a><div class="solutions-groups">
      <div><a class="solutions-group-title" href="./ventilation.html">Ventilation</a><a href="./ventilation.html#eurus">Eurus Impeller</a><a href="./ventilation.html#partial">Partial Impeller</a><a href="./ventilation.html#pullout">Pull-Out Impeller</a><a href="./ventilation.html#fan-model">Fan Model Line-Up</a></div>
      <div><a class="solutions-group-title" href="./air-system.html">Air Systems</a><a href="./air-system.html#ahu">Eco AHU / RTU</a><a href="./air-system.html#bio-hvac">Bio HVAC</a><a href="./air-system.html#ief">IEF Filter</a><a href="./air-system.html#iaqs">IAQS</a></div>
      <div><a class="solutions-group-title" href="./parts-control.html">Parts &amp; Control</a><a href="./parts-control.html#clt">CLT</a><a href="./parts-control.html#fcm">FCM</a><a href="./parts-control.html#ecm">ECM</a></div>
    </div></section>
    <section class="solutions-column solutions-edim"><a class="solutions-column-title" href="./edim.html"><b>EDIM</b><small>Manufacturing Data Platform</small></a><div class="solutions-groups solutions-groups-edim"><div><a class="solutions-group-title" href="./edim.html">EDIM Overview</a><a href="./edim.html#cpq">CPQ</a><a href="./edim.html#plm">PLM</a><a href="./edim.html#rccs">RCCS™</a><a href="./edim.html#erp">ERP Integration</a></div></div></section>
  </div>
`, 'submenu mega-panel solutions-menu');

const searchButton = document.createElement('button');
searchButton.className = 'nav-search';
searchButton.type = 'button';
searchButton.setAttribute('aria-label', '사이트 검색 열기');
searchButton.setAttribute('aria-expanded', 'false');
searchButton.innerHTML = '<span></span>';
nav?.querySelector('.nav-cta')?.before(searchButton);
const searchPanel = document.createElement('form');
searchPanel.className = 'site-search-panel';
searchPanel.setAttribute('role', 'search');
searchPanel.innerHTML = '<label for="site-search-input">Search NOVA Solution</label><div><input id="site-search-input" type="search" placeholder="제품, 기술 또는 자료 검색" autocomplete="off"><button type="submit">Search →</button></div><p>예: Eurus, Eco AHU, CLT, EDIM</p>';
header?.append(searchPanel);
searchButton.addEventListener('click', () => {
  const open = header.classList.toggle('search-open');
  searchButton.setAttribute('aria-expanded', String(open));
  searchButton.setAttribute('aria-label', open ? '사이트 검색 닫기' : '사이트 검색 열기');
  if (open) searchPanel.querySelector('input')?.focus();
});
searchPanel.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = searchPanel.querySelector('input')?.value.trim();
  if (query) window.location.href = `./resources.html?search=${encodeURIComponent(query)}`;
});

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

  inquiryForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!inquiryForm.reportValidity()) return;
    const message = document.querySelector('[data-form-message]');
    message.hidden = false;
    message.focus();
  });
}

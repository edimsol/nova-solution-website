const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');

// The outlined Contact Us button is the single contact entry in the header.
nav?.querySelector('a[href="./contact.html"]:not(.nav-cta)')?.remove();

// Keep the same solid-color brand mark and wordmark on every page.
document.querySelectorAll('.brand').forEach((brand) => {
  brand.innerHTML = '<img class="brand-mark" src="./assets/nova-symbol.svg" alt=""><span><strong>NOVA</strong> SOLUTION</span>';
});

// Add the shared Company submenu. The in-page Company index remains available
// as a second navigation layer after entering the page.
const companyLink = nav?.querySelector('a[href="./company.html"]');
if (companyLink) {
  const dropdown = document.createElement('div');
  dropdown.className = 'nav-dropdown';
  const submenu = document.createElement('div');
  submenu.className = 'submenu company-menu';
  submenu.setAttribute('aria-label', 'Company 하위 메뉴');
  submenu.innerHTML = `
    <a class="company-overview" href="./company.html"><span><small>COMPANY</small>Who We Are</span><b>회사소개 전체보기 →</b></a>
    <div class="company-menu-grid">
      <a href="./company.html#about"><small>01</small><span>About NOVA Solution</span></a>
      <a href="./company.html#mission"><small>02</small><span>Mission & Vision</span></a>
      <a href="./company.html#history"><small>03</small><span>History</span></a>
      <a href="./company.html#foundation"><small>04</small><span>Manufacturing Foundation</span></a>
      <a href="./company.html#location"><small>05</small><span>Location</span></a>
    </div>
  `;
  companyLink.classList.add('dropdown-trigger');
  companyLink.setAttribute('aria-haspopup', 'true');
  companyLink.setAttribute('aria-expanded', 'false');
  companyLink.parentNode.insertBefore(dropdown, companyLink);
  dropdown.append(companyLink, submenu);
}

const technologyLink = nav?.querySelector('a[href="./technology.html"]');
if (technologyLink) {
  const dropdown = document.createElement('div');
  dropdown.className = 'nav-dropdown';
  const submenu = document.createElement('div');
  submenu.className = 'submenu company-menu section-menu';
  submenu.setAttribute('aria-label', 'Technology 하위 메뉴');
  submenu.innerHTML = `
    <a class="company-overview" href="./technology.html"><span><small>TECHNOLOGY</small>How It Becomes Possible</span><b>기술 전체보기 →</b></a>
    <div class="company-menu-grid">
      <a href="./technology.html#manufacturing"><small>01</small><span>Manufacturing Engineering</span></a>
      <a href="./technology.html#automation"><small>02</small><span>Engineering Automation</span></a>
      <a href="./technology.html#architecture"><small>03</small><span>Product Data Architecture</span></a>
      <a href="./technology.html#rccs"><small>04</small><span>RCCS™</span></a>
      <a href="./technology.html#integration"><small>05</small><span>System Integration</span></a>
    </div>
  `;
  technologyLink.classList.add('dropdown-trigger');
  technologyLink.setAttribute('aria-haspopup', 'true');
  technologyLink.setAttribute('aria-expanded', 'false');
  technologyLink.parentNode.insertBefore(dropdown, technologyLink);
  dropdown.append(technologyLink, submenu);
}

const resourcesLink = nav?.querySelector('a[href="./resources.html"]');
if (resourcesLink) {
  const dropdown = document.createElement('div');
  dropdown.className = 'nav-dropdown';
  const submenu = document.createElement('div');
  submenu.className = 'submenu company-menu section-menu resources-menu';
  submenu.setAttribute('aria-label', 'Resources 하위 메뉴');
  submenu.innerHTML = `
    <a class="company-overview" href="./resources.html"><span><small>RESOURCES</small>NOVA Library</span><b>자료실 전체보기 →</b></a>
    <div class="company-menu-grid">
      <a href="./resources.html#product-catalogues"><small>01</small><span>Product Catalogues</span></a>
      <a href="./resources.html#technical-documents"><small>02</small><span>Technical Documents</span></a>
      <a href="./resources.html#edim-brochure"><small>03</small><span>EDIM Brochure</span></a>
      <a href="./resources.html#company-profile"><small>04</small><span>Company Profile</span></a>
      <a href="./resources.html#news-updates"><small>05</small><span>News & Updates</span></a>
    </div>
  `;
  resourcesLink.classList.add('dropdown-trigger');
  resourcesLink.setAttribute('aria-haspopup', 'true');
  resourcesLink.setAttribute('aria-expanded', 'false');
  resourcesLink.parentNode.insertBefore(dropdown, resourcesLink);
  dropdown.append(resourcesLink, submenu);
}

// Add the shared Solutions submenu without duplicating its markup on every page.
const solutionsLink = nav?.querySelector('a[href="./solutions.html"]');
if (solutionsLink) {
  const dropdown = document.createElement('div');
  dropdown.className = 'nav-dropdown';
  const submenu = document.createElement('div');
  submenu.className = 'submenu company-menu section-menu solutions-menu';
  submenu.setAttribute('aria-label', 'Solutions 하위 메뉴');
  submenu.innerHTML = `
    <a class="company-overview" href="./solutions.html"><span><small>SOLUTIONS</small>What We Deliver</span><b>솔루션 전체보기 →</b></a>
    <div class="solution-menu-grid">
      <section class="solution-menu-group" aria-labelledby="solution-hvac-title">
        <a class="solution-menu-title" id="solution-hvac-title" href="./hvac.html"><small>01</small><span>HVAC<b>공조 하드웨어</b></span></a>
        <a href="./ventilation.html"><small>01–04</small><span>Ventilation</span></a>
        <a href="./air-system.html"><small>05–08</small><span>Air System</span></a>
        <a href="./parts-control.html"><small>09–11</small><span>Parts & Control</span></a>
      </section>
      <section class="solution-menu-group" aria-labelledby="solution-edim-title">
        <a class="solution-menu-title" id="solution-edim-title" href="./edim.html"><small>02</small><span>EDIM<b>제조 데이터 플랫폼</b></span></a>
        <a href="./edim.html#cpq"><small>01</small><span>CPQ</span></a>
        <a href="./edim.html#plm"><small>02</small><span>PLM</span></a>
        <a href="./edim.html#rccs"><small>03</small><span>RCCS™</span></a>
        <a href="./edim.html#erp"><small>04</small><span>ERP 연계</span></a>
      </section>
    </div>
  `;

  solutionsLink.classList.add('dropdown-trigger');
  solutionsLink.setAttribute('aria-haspopup', 'true');
  solutionsLink.setAttribute('aria-expanded', 'false');
  solutionsLink.parentNode.insertBefore(dropdown, solutionsLink);
  dropdown.append(solutionsLink, submenu);

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  submenu.querySelectorAll('a').forEach((link) => {
    if (link.getAttribute('href') === `./${currentPage}`) {
      link.setAttribute('aria-current', 'page');
      solutionsLink.setAttribute('aria-current', 'page');
    }
  });
}

const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 24);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  nav?.classList.toggle('open', !isOpen);
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (link.classList.contains('dropdown-trigger')) {
      event.preventDefault();
      const dropdown = link.closest('.nav-dropdown');
      const willOpen = !dropdown.classList.contains('menu-open');
      nav.querySelectorAll('.nav-dropdown.menu-open').forEach((item) => {
        item.classList.remove('menu-open');
        item.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
      });
      dropdown.classList.toggle('menu-open', willOpen);
      link.setAttribute('aria-expanded', String(willOpen));
      return;
    }
    menuButton?.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
  });
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.nav-dropdown')) {
    nav?.querySelectorAll('.nav-dropdown.menu-open').forEach((dropdown) => {
      dropdown.classList.remove('menu-open');
      dropdown.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
    });
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    nav?.querySelectorAll('.nav-dropdown.menu-open').forEach((dropdown) => {
      dropdown.classList.remove('menu-open');
      dropdown.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
      dropdown.querySelector('.dropdown-trigger')?.focus();
    });
  }
});

const observer = new IntersectionObserver(
  (entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  }),
  { threshold: 0.14 }
);

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
document.querySelector('[data-year]').textContent = new Date().getFullYear();

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

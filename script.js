const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');

// Keep the same solid-color brand mark and wordmark on every page.
document.querySelectorAll('.brand').forEach((brand) => {
  brand.innerHTML = '<img class="brand-mark" src="./assets/nova-symbol.svg" alt=""><span><strong>NOVA</strong> SOLUTION</span>';
});

// Add the shared Solutions submenu without duplicating its markup on every page.
const solutionsLink = nav?.querySelector('a[href="./solutions.html"]');
if (solutionsLink) {
  const dropdown = document.createElement('div');
  dropdown.className = 'nav-dropdown';
  const submenu = document.createElement('div');
  submenu.className = 'submenu solutions-mega';
  submenu.setAttribute('aria-label', 'Solutions 하위 메뉴');
  submenu.innerHTML = `
    <section class="mega-area mega-hvac" aria-labelledby="mega-hvac-title">
      <a class="mega-title" id="mega-hvac-title" href="./hvac.html"><span><small>01 / SOLUTION</small>HVAC</span><b>공조 하드웨어 전체보기 →</b></a>
      <div class="mega-groups">
        <div class="mega-group"><strong>Ventilation</strong><a href="./hvac.html#eurus">Eurus Impeller</a><a href="./hvac.html#partial">Partial Impeller</a><a href="./hvac.html#pullout">Pull-Out Impeller</a><a href="./hvac.html#fan-model">Fan Model 라인업</a></div>
        <div class="mega-group"><strong>Air System</strong><a href="./hvac.html#ahu-rtu">AHU / RTU</a><a href="./hvac.html#bio-hvac">Bio HVAC</a><a href="./hvac.html#ief">IEF 전기집진필터</a><a href="./hvac.html#iaqs">IAQS 실내공기질</a></div>
        <div class="mega-group"><strong>Parts & Control</strong><a href="./hvac.html#clt">CLT 배수 트랩</a><a href="./hvac.html#fcm">FCM 팬 제어</a><a href="./hvac.html#ecm">ECM 공조기 제어</a></div>
      </div>
    </section>
    <section class="mega-area mega-edim" aria-labelledby="mega-edim-title">
      <a class="mega-title" id="mega-edim-title" href="./edim.html"><span><small>02 / SOLUTION</small>EDIM</span><b>제조 데이터 플랫폼 →</b></a>
      <div class="mega-group"><strong>Manufacturing Data</strong><a href="./edim.html#cpq">CPQ <small>제품 선정</small></a><a href="./edim.html#plm">PLM <small>도면 자동화</small></a><a href="./edim.html#rccs">RCCS™ <small>관계형 BOM</small></a><a href="./edim.html#erp">ERP 연계 <small>생산·원가</small></a></div>
    </section>
  `;

  solutionsLink.classList.add('dropdown-trigger');
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
  link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
  });
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

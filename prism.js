/* Progressive solution discovery. Every destination is also available without JavaScript. */
(() => {
  'use strict';
  const groups = {
    ventilation: { title:'Ventilation', caption:'환기·송풍 / 4개 제품', accent:'#77d8e9', href:'./ventilation.html', items:[
      {id:'eurus', chip:'Eurus', title:'Eurus Impeller', image:'./assets/products/eurus-impeller-cutout.png', href:'./ventilation.html#eurus', kind:'VENTILATION / IMPELLER', description:'토출 기류를 정돈하는 새로운 접근으로 팬 시스템의 효율과 운전 품질을 함께 개선합니다.', tags:['디퓨저 링 설계','성능 정보','적용 검토']},
      {id:'partial', chip:'Partial', title:'Partial Impeller', image:'./assets/products/partial-impeller-cutout.png', href:'./ventilation.html#partial', kind:'VENTILATION / DIRECT DRIVE', description:'팬이 모터의 가장 효율적인 회전 영역에서 운전하도록, 임펠러의 유효 폭을 새롭게 설계한 Direct Drive 솔루션입니다.', tags:['유효 폭 조정','Direct Drive','운전 사례']},
      {id:'pullout', chip:'Pull-Out', title:'Pull-Out Impeller', image:'./assets/products/pull-out-impeller-cutout.png', href:'./ventilation.html#pullout', kind:'VENTILATION / MAINTENANCE', description:'정비 접근성을 고려한 Pull-Out 임펠러. 제품 구조와 유지관리 관점을 함께 살펴보는 환기·송풍 솔루션입니다.', tags:['제품 구조','유지관리','환기·송풍']},
      {id:'fan', chip:'Fan', title:'Fan Model Line-Up', image:'./assets/products/fan-kap-cutout.png', alt:'KAP 팬 모델 예시', href:'./ventilation.html#fan-model', kind:'VENTILATION / FAN', description:'KAD, KAP, KAS의 세 가지 팬 모델. 모델별 사양과 구조를 비교해 요구 조건에 맞는 제품을 검토합니다. 이미지는 KAP 모델 예시입니다.', tags:['KAD','KAP','KAS']}
    ]},
    air: { title:'Air Systems', caption:'공조·공기질 / 4개 제품', accent:'#77d8e9', href:'./air-system.html', items:[
      {id:'ahu', chip:'Eco AHU / RTU', title:'Eco AHU / RTU', image:'./assets/products/eco-ahu-main-cutout.png', href:'./air-system.html#ahu', kind:'AIR SYSTEM / AIR HANDLING', description:'공간과 공정에 필요한 공기를 만들고, 실제 운전 조건에 맞춰 유연하게 구성하는 공조 플랫폼입니다.', tags:['장비 구성','공조 제어','시스템 적용']},
      {id:'bio', chip:'Bio HVAC', title:'Bio HVAC', image:'./assets/products/bio-hvac-system-cutout.png', href:'./air-system.html#bio-hvac', kind:'AIR SYSTEM / AIR QUALITY', description:'공기 정화와 공기질을 위한 Bio HVAC 제품군. 시스템의 구성과 기능, 적용 분야를 살펴봅니다.', tags:['공기 정화','공기질','제품 구성']},
      {id:'ief', chip:'IEF', title:'IEF 전기집진필터', image:'./assets/products/ief-filter-cutout.png', href:'./air-system.html#ief', kind:'AIR SYSTEM / FILTRATION', description:'공기 정화를 위한 전기집진필터. 제품 구조와 공개된 시험 정보를 바탕으로 적용 조건을 검토합니다.', tags:['전기집진','제품 구조','시험 정보']},
      {id:'iaqs', chip:'IAQS', title:'IAQS', image:'./assets/products/iaqs-sensor-main-cutout.png', href:'./air-system.html#iaqs', kind:'AIR SYSTEM / INDOOR AIR QUALITY', description:'실내 공기질 센싱과 장비 상태를 연결하는 IAQS. 제품의 내부 구조와 관제 구성을 함께 살펴봅니다.', tags:['공기질 센싱','장비 연계','관제 구성']}
    ]},
    control: { title:'Parts & Control', caption:'부품·제어 / 3개 제품', accent:'#d0e886', href:'./parts-control.html', items:[
      {id:'clt', chip:'CLT', title:'CLT 배수 트랩', image:'./assets/products/clt-50a-cutout.png', alt:'CLT 50A 배수 트랩', href:'./parts-control.html#clt', kind:'PARTS & CONTROL / DRAIN TRAP', description:'CLT 50A와 100A 배수 트랩. 모델별 구조와 연결 치수를 확인하고, 3D 모델을 다양한 시점에서 살펴봅니다.', tags:['50A / 100A','연결 치수','3D 모델']},
      {id:'fcm', chip:'FCM', title:'FCM 팬 제어', image:'./assets/products/fcm-controller-main-cutout.png', href:'./parts-control.html#fcm', kind:'PARTS & CONTROL / FAN CONTROL', description:'팬 계측과 제어 정보를 연결하는 FCM. 시스템 구성과 운전 정보, 유지관리 기능을 살펴봅니다.', tags:['팬 제어','계측','유지관리']},
      {id:'ecm', chip:'ECM', title:'ECM 공조기 제어', image:'./assets/products/ecm-system-cutout.png', href:'./parts-control.html#ecm', kind:'PARTS & CONTROL / AHU CONTROL', description:'공조기 제어를 위한 ECM. 공조 운전 모듈과 시스템 구성, 상태 정보의 연결을 살펴봅니다.', tags:['공조기 제어','운전 모듈','시스템 구성']}
    ]},
    edim: { title:'EDIM', caption:'제조 데이터 / 4개 기능 방향 · 개발 중', accent:'#b9a2ef', href:'./edim.html', items:[
      {id:'cpq', chip:'CPQ', title:'제품 구성을 빠르게', symbol:'CPQ', href:'./edim.html#cpq', kind:'EDIM / CONFIGURATION', description:'고객 요구에 맞는 제품 사양과 구성을 선택하고 후속 업무에서 활용할 기준 정보를 만드는 방향으로 개발하고 있습니다.', tags:['사양 선택','제품 구성','기준 정보']},
      {id:'plm', chip:'PLM', title:'설계 정보를 일관되게', symbol:'PLM', href:'./edim.html#plm', kind:'EDIM / ENGINEERING DESIGN', description:'선택된 구성을 설계 업무와 연결해 반복 작업과 정보 누락을 줄이는 방향으로 개발하고 있습니다.', tags:['설계 연계','정보 일관성','개발 중']},
      {id:'rccs', chip:'RCCS™', title:'제품 관계를 구조적으로', symbol:'RCCS™', href:'./edim.html#rccs', kind:'EDIM / PRODUCT DATA', description:'부품, 사양, BOM의 관계를 제품 중심으로 정리해 변경되는 정보의 맥락을 유지하는 구조를 개발하고 있습니다.', tags:['부품','사양','BOM']},
      {id:'erp', chip:'System Integration', title:'생산 시스템까지 연결', symbol:'ERP ↗', href:'./edim.html#erp', kind:'EDIM / SYSTEM INTEGRATION', description:'검토된 제품 데이터를 ERP와 제조 시스템에서 활용할 수 있도록 연계 범위를 설계합니다. 고객 환경과 PoC 결과에 따라 제공 범위를 협의합니다.', tags:['ERP 연계','제조 시스템','Demo / PoC']}
    ]}
  };

  const launcher = document.querySelector('[data-prism-launcher]');
  if (launcher) {
    let activeCategory = 'ventilation';
    const selected = Object.fromEntries(Object.entries(groups).map(([key, group]) => [key, group.items[0].id]));
    const image = launcher.querySelector('[data-pr-image]');
    const symbol = launcher.querySelector('[data-pr-symbol]');
    const chips = launcher.querySelector('[data-pr-chips]');
    const status = launcher.querySelector('[data-pr-status]');
    const tileButtons = [...launcher.querySelectorAll('[data-pr-category]')].map((link) => {
      const button = document.createElement('button');
      button.type = 'button';
      [...link.attributes].filter(({name}) => name !== 'href').forEach(({name,value}) => button.setAttribute(name,value));
      button.append(...link.childNodes);
      button.setAttribute('aria-controls','prism-selection');
      button.setAttribute('aria-pressed',String(button.dataset.prCategory === activeCategory));
      button.setAttribute('aria-label',`${groups[button.dataset.prCategory].title} · ${groups[button.dataset.prCategory].caption} 선택`);
      link.replaceWith(button);
      button.addEventListener('click', () => renderCategory(button.dataset.prCategory, true));
      return button;
    });
    function renderProduct(id, announce = false) {
      const group = groups[activeCategory];
      const item = group.items.find((product) => product.id === id) || group.items[0];
      selected[activeCategory] = item.id;
      chips.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed',String(button.dataset.product === item.id)));
      image.hidden = !item.image;
      if (item.image) { image.src = item.image; image.alt = item.alt || item.title; }
      symbol.hidden = !!item.image;
      symbol.querySelector('strong').textContent = item.symbol || '';
      launcher.querySelector('[data-pr-art-caption]').textContent = `${String(group.items.indexOf(item)+1).padStart(2,'0')} / ${item.alt || item.symbol || item.title.toUpperCase()}`;
      launcher.querySelector('[data-pr-title]').textContent = item.title;
      launcher.querySelector('[data-pr-kind]').textContent = item.kind;
      launcher.querySelector('[data-pr-description]').textContent = item.description;
      launcher.querySelector('[data-pr-development]').hidden = activeCategory !== 'edim';
      launcher.querySelector('[data-pr-tags]').replaceChildren(...item.tags.map((tag) => { const span=document.createElement('span'); span.textContent=tag; return span; }));
      const detailLink = launcher.querySelector('[data-pr-detail-link]');
      detailLink.href = item.href;
      detailLink.firstChild.textContent = activeCategory === 'edim' ? '기능 방향 살펴보기 ' : '제품 상세 보기 ';
      if (announce && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        launcher.querySelectorAll('.pr-detail-art,.pr-detail-copy').forEach(element => {
          element.getAnimations().forEach(animation => animation.cancel());
          element.animate([{opacity:.45,translate:'0 6px'},{opacity:1,translate:'0 0'}],{duration:240,easing:'ease-in-out'});
        });
      }
      if (announce) status.textContent = `${group.title}, ${item.chip} 선택됨. ${item.description}`;
    }
    function renderCategory(key, announce = false) {
      const group = groups[key];
      activeCategory = key;
      launcher.style.setProperty('--pr-accent',group.accent);
      tileButtons.forEach((button) => button.setAttribute('aria-pressed',String(button.dataset.prCategory === key)));
      launcher.querySelector('#pr-category-title').textContent = group.title;
      launcher.querySelector('[data-pr-caption]').textContent = group.caption;
      launcher.querySelector('[data-pr-category-link]').href = group.href;
      chips.replaceChildren(...group.items.map((item) => {
        const button = document.createElement('button');
        button.type = 'button'; button.dataset.product = item.id; button.textContent = item.chip;
        button.setAttribute('aria-controls','prism-product-detail');
        button.addEventListener('click',() => renderProduct(item.id,true));
        return button;
      }));
      renderProduct(selected[key],announce);
    }
    renderCategory(activeCategory);
  }

  // Filters expose the complete static catalogue when scripting is unavailable.
  document.querySelectorAll('[data-prism-catalog]').forEach((catalog) => {
    const controls = catalog.querySelector('[data-prism-filter-controls]');
    if (!controls) return;
    const buttons = [...controls.querySelectorAll('[data-prism-filter]')];
    const categories = [...catalog.querySelectorAll('[data-prism-category]')];
    const applyFilter = (button, announce = true) => {
      const filter = button.dataset.prismFilter;
      buttons.forEach((entry) => entry.setAttribute('aria-pressed',String(entry === button)));
      categories.forEach((entry) => { entry.hidden = filter !== 'all' && entry.dataset.prismCategory !== filter; });
      const status = catalog.querySelector('[data-prism-filter-status]');
      if (status && announce) status.textContent = `${button.textContent.trim()} 제품을 표시합니다.`;
      window.NovaScroll?.refresh();
    };
    buttons.forEach((button) => button.addEventListener('click',() => applyFilter(button)));
    window.addEventListener('hashchange', () => {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!target || !catalog.contains(target) || !target.closest('[data-prism-category][hidden]')) return;
      const all = buttons.find(button => button.dataset.prismFilter === 'all');
      if (all) {
        applyFilter(all, false);
        requestAnimationFrame(() => target.scrollIntoView({block:'start',behavior:'instant'}));
      }
    });
    controls.hidden = false;
  });

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)');
  document.querySelectorAll('[data-prism-card]').forEach((card) => {
    let frame = 0;
    let pointer;
    const reset = () => {
      cancelAnimationFrame(frame); frame=0;
      ['--pr-rx','--pr-ry','--pr-x','--pr-y'].forEach((key) => card.style.removeProperty(key));
    };
    card.addEventListener('pointermove',(event) => {
      if (motion.matches || !finePointer.matches) return;
      pointer = {x:event.clientX,y:event.clientY};
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = Math.max(0,Math.min(1,(pointer.x-rect.left)/rect.width));
        const y = Math.max(0,Math.min(1,(pointer.y-rect.top)/rect.height));
        card.style.setProperty('--pr-x',`${x*100}%`); card.style.setProperty('--pr-y',`${y*100}%`);
        card.style.setProperty('--pr-rx',`${(.5-y)*2.6}deg`); card.style.setProperty('--pr-ry',`${(x-.5)*2.6}deg`);
        frame=0;
      });
    },{passive:true});
    card.addEventListener('pointerleave',reset); card.addEventListener('blur',reset);
    motion.addEventListener('change',reset);
  });
})();

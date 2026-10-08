// Shared navigation is initialized by prism-nav.js before this file.
// Company deep-link handlers below retain this compatibility helper.
const closeMobileMenu = (restoreFocus = false) => {
  window.PrismNavigation?.close(restoreFocus);
};

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const NOVA_EASING = 'cubic-bezier(.42,0,.58,1)';
// Solve the CSS ease-in-out curve's x coordinate before evaluating its y.
const easeInOut = (progress) => {
  if (progress <= 0 || progress >= 1) return Math.max(0, Math.min(1, progress));
  let low = 0, high = 1, t = progress;
  for (let step = 0; step < 14; step += 1) {
    t = (low + high) / 2;
    const x = 3 * (1 - t) ** 2 * t * .42 + 3 * (1 - t) * t ** 2 * .58 + t ** 3;
    if (x < progress) low = t; else high = t;
  }
  return 3 * (1 - t) * t ** 2 + t ** 3;
};
const numberAnimations = new Map();
function animateNumber(element, target, duration, write) {
  numberAnimations.get(element)?.finish();
  if (motionPreference.matches) { write(target); return; }
  const start = performance.now();
  const animation = { frame: 0, finish() { cancelAnimationFrame(animation.frame); write(target); numberAnimations.delete(element); } };
  const tick = (time) => {
    const progress = Math.min((time - start) / duration, 1);
    write(target * easeInOut(progress));
    if (progress < 1 && !motionPreference.matches) animation.frame = requestAnimationFrame(tick);
    else animation.finish();
  };
  numberAnimations.set(element, animation);
  animation.frame = requestAnimationFrame(tick);
}
motionPreference.addEventListener('change', () => {
  if (motionPreference.matches) [...numberAnimations.values()].forEach((animation) => animation.finish());
});

document.querySelectorAll('[data-infinite-slider]').forEach((slider) => {
  const track = slider.querySelector('[data-slider-track]');
  const cards = [...track.querySelectorAll('.solution-product-card')];
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
    track.scrollTo({ left: cards[activeIndex].offsetLeft - track.offsetLeft, behavior: motionPreference.matches ? 'auto' : 'smooth' });
    window.setTimeout(updateActive, motionPreference.matches ? 0 : 260);
  };

  const autoplay = (time) => {
    if (!lastTime) lastTime = time;
    const elapsed = Math.min(time - lastTime, 40);
    lastTime = time;
    if (!motionPreference.matches && time >= pausedUntil && !track.classList.contains('is-dragging')) {
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
const formatCounter = (value) => new Intl.NumberFormat('en-US').format(value);

const hashTarget = () => {
  try { return document.getElementById(decodeURIComponent(location.hash.slice(1))); }
  catch { return null; }
};

// Re-align deep links after product imagery and web fonts finish loading.
if (window.location.hash) {
  window.addEventListener('load', async () => {
    const originalHash = location.hash;
    const target = hashTarget();
    if (target?.matches('[data-company-panel]')) return;
    if (document.fonts?.ready) await document.fonts.ready;
    window.setTimeout(() => { if (location.hash === originalHash) target?.scrollIntoView({ block: 'start' }); }, 120);
  }, { once: true });
}

function animateCounter(element) {
  const target = Number(element.dataset.counter);
  animateNumber(element, target, 1400, (value) => { element.textContent = formatCounter(Math.round(value)); });
}
const finishReducedCounters = () => {
  if (!motionPreference.matches) return;
  counters.forEach((counter) => { counter.dataset.started = 'true'; animateCounter(counter); });
};
motionPreference.addEventListener('change', finishReducedCounters);
finishReducedCounters();
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

const chartConsoles = [...document.querySelectorAll('[data-chart-console]')];
if (chartConsoles.length) {
  const setChartValue = (element, value) => {
    const decimals = Number(element.dataset.chartDecimals || 0);
    const formatted = Number(value).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    const textNode = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.nodeValue = `${formatted}${element.children.length ? ' ' : ''}`;
    else element.textContent = formatted;
  };
  const animateChartValues = (consoleElement) => {
    consoleElement.querySelectorAll('[data-chart-value]').forEach((element) => {
      if (element.dataset.chartStarted) return;
      element.dataset.chartStarted = 'true';
      const target = Number(element.dataset.chartValue);
      if (!motionPreference.matches) setChartValue(element, 0);
      animateNumber(element, target, 1250, (value) => setChartValue(element, value));
    });
  };

  chartConsoles.forEach((consoleElement) => consoleElement.classList.add('chart-enhanced'));
  const finishReducedCharts = () => {
    if (!motionPreference.matches) return;
    chartConsoles.forEach((consoleElement) => {
      consoleElement.classList.add('is-chart-active');
      animateChartValues(consoleElement);
    });
  };
  motionPreference.addEventListener('change', finishReducedCharts);
  if (motionPreference.matches) finishReducedCharts();
  else {
    const chartObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-chart-active');
        animateChartValues(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: .22 });
    chartConsoles.forEach((consoleElement) => chartObserver.observe(consoleElement));
  }
}

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
        card.scrollIntoView({ behavior: motionPreference.matches ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
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
const focusLocationMap = (map, duration = 2.2) => {
  if (!map) return;
  map.stop();
  const office = [37.2140373, 127.1019493];
  if (motionPreference.matches) map.setView(office, 17, { animate: false });
  else map.flyTo(office, 17, { animate: true, duration });
};
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
    if (motionPreference.matches) return;
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
  const resetMapMotion = () => {
    dots.forEach((dot) => { dot.style.setProperty('--dot-scale', '1'); dot.style.opacity = ''; });
    const pin = locationMapWrap.querySelector('.nova-map-pin-core');
    if (pin) { pin.style.setProperty('--pin-scale', '1'); pin.style.boxShadow = ''; }
  };
  locationMapWrap.addEventListener('pointerleave', resetMapMotion);
  motionPreference.addEventListener('change', () => { if (motionPreference.matches) { map.stop(); resetMapMotion(); } });

  // Accordion expansion owns its map sizing and first focus. The standalone
  // observer remains available to maps outside collapsible content.
  if (!locationMapWrap.closest('[data-company-accordion]')) {
    let zoomed = false;
    new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting || zoomed) return;
      zoomed = true;
      window.setTimeout(() => {
        if (locationMapWrap.closest('[hidden], [inert], [aria-hidden="true"]')) return;
        focusLocationMap(map, 2.5);
      }, 180);
      observer.disconnect();
    }, { threshold: .38 }).observe(locationMapWrap);
  }
}

// Company stories stay in the document flow. Native details remain usable if
// enhancement fails; only the content height is animated, never page scrolling.
const companyPanels = [...document.querySelectorAll('[data-company-panel]')];
if (companyPanels.length) {
  const stories = companyPanels.map((panel) => {
    const details = panel.closest('[data-company-accordion]');
    if (!details) return null;
    return { panel, details, trigger: details.querySelector('summary'), content: details.querySelector('.company-accordion-content'), expanded: details.open, animation: null, version: 0 };
  }).filter((story) => story?.trigger && story.content);
  const historyKey = '__novaCompanyAccordion';
  let navigationVersion = 0;
  let syncFrame = 0;
  let lastLocationState = '';
  let mapFocused = false;
  const refresh = () => window.NovaScroll?.refresh();
  const findStory = (id) => stories.find((story) => story.panel.id === id);
  const currentHashId = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; } };

  function updateMap(story) {
    if (story.panel.id !== 'location' || !story.expanded || !story.details.open) return;
    requestAnimationFrame(() => {
      if (!story.expanded || story.animation || !story.details.open) return;
      const map = locationMapWrap?._novaLeafletMap;
      map?.invalidateSize({ pan: false });
      if (map && !mapFocused) { mapFocused = true; focusLocationMap(map); }
    });
  }

  function finishStory(story) {
    story.animation?.cancel();
    story.animation = null;
    story.details.open = story.expanded;
    story.content.style.removeProperty('overflow');
    story.content.inert = !story.expanded;
    story.content.setAttribute('aria-hidden', String(!story.expanded));
    story.trigger.setAttribute('aria-expanded', String(story.expanded));
    story.details.classList.toggle('is-expanded', story.expanded);
    refresh();
    updateMap(story);
  }

  function setExpanded(story, expanded, animate = true) {
    if (story.expanded === expanded && story.details.open === expanded && !story.animation) return Promise.resolve();
    const from = story.details.open ? story.content.getBoundingClientRect().height : 0;
    const version = ++story.version;
    story.animation?.cancel();
    story.animation = null;
    story.expanded = expanded;
    story.trigger.setAttribute('aria-expanded', String(expanded));
    story.details.classList.toggle('is-expanded', expanded);
    if (!expanded && story.content.contains(document.activeElement)) story.trigger.focus({ preventScroll: true });
    story.content.inert = !expanded;
    story.content.setAttribute('aria-hidden', String(!expanded));
    if (!expanded && story.panel.id === 'location') locationMapWrap?._novaLeafletMap?.stop();
    // Retain the native open state during the closing animation, then remove it.
    story.details.open = true;
    const to = expanded ? story.content.getBoundingClientRect().height : 0;
    if (!animate || motionPreference.matches || typeof story.content.animate !== 'function' || Math.abs(to - from) < 1) {
      finishStory(story);
      return Promise.resolve();
    }
    story.content.style.overflow = 'clip';
    const animation = story.content.animate([
      { height: `${from}px`, opacity: expanded ? .35 : 1 },
      { height: `${to}px`, opacity: expanded ? 1 : .35 },
    ], { duration: 320, easing: 'ease-in-out', fill: 'both' });
    story.animation = animation;
    refresh();
    return animation.finished.then(() => {
      if (story.version === version && story.animation === animation) finishStory(story);
    }, () => {});
  }

  function alignStory(story, smooth = true) {
    const offset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--prism-header-offset')) || 100;
    const top = Math.max(0, window.scrollY + story.trigger.getBoundingClientRect().top - offset - 12);
    window.scrollTo({ top, behavior: smooth && !motionPreference.matches ? 'smooth' : 'instant' });
  }

  function recordLocation(preferredId = '') {
    const openIds = stories.filter((story) => story.expanded).map((story) => story.panel.id);
    const id = openIds.includes(preferredId) ? preferredId : openIds.includes(currentHashId()) ? currentHashId() : openIds[openIds.length - 1] || '';
    const hash = id ? `#${id}` : '';
    const state = { ...history.state, [historyKey]: { openIds, hash } };
    history.pushState(state, '', `${location.pathname}${location.search}${hash}`);
    lastLocationState = JSON.stringify([hash, openIds]);
    window.PrismNavigation?.refresh();
  }

  stories.forEach((story, index) => {
    story.trigger.setAttribute('aria-controls', story.panel.id);
    story.trigger.setAttribute('aria-expanded', String(story.expanded));
    story.panel.setAttribute('role', 'region');
    story.panel.setAttribute('aria-labelledby', story.trigger.id);
    story.content.inert = !story.expanded;
    story.content.setAttribute('aria-hidden', String(!story.expanded));
    story.trigger.addEventListener('click', (event) => {
      event.preventDefault();
      ++navigationVersion;
      const expanded = !story.expanded;
      setExpanded(story, expanded);
      recordLocation(expanded ? story.panel.id : '');
    });
    story.trigger.addEventListener('keydown', (event) => {
      const directions = { ArrowDown: (index + 1) % stories.length, ArrowUp: (index - 1 + stories.length) % stories.length, Home: 0, End: stories.length - 1 };
      if (!(event.key in directions)) return;
      event.preventDefault();
      stories[directions[event.key]].trigger.focus();
    });
    // Respect native find-in-page / fragment revelation and assistive actions.
    story.details.addEventListener('toggle', () => {
      if (story.animation || story.details.open === story.expanded) return;
      story.expanded = story.details.open;
      finishStory(story);
    });
  });

  document.querySelectorAll('a[href*="company.html#"], a[href^="#"]').forEach((link) => link.addEventListener('click', async (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
    const target = new URL(link.href, location.href);
    if (target.origin !== location.origin || target.pathname !== location.pathname) return;
    let id;
    try { id = decodeURIComponent(target.hash.slice(1)); } catch { return; }
    const story = findStory(id);
    if (!story) return;
    event.preventDefault();
    const version = ++navigationVersion;
    closeMobileMenu(false);
    story.trigger.focus({ preventScroll: true });
    const opening = setExpanded(story, true);
    if (location.hash !== `#${id}`) recordLocation(id);
    await opening;
    if (version === navigationVersion && story.expanded) alignStory(story);
  }));

  function syncLocation(align = true) {
    const saved = history.state?.[historyKey];
    const id = currentHashId();
    const validSaved = saved && saved.hash === location.hash && Array.isArray(saved.openIds);
    const openIds = validSaved ? saved.openIds.filter((value) => findStory(value)) : findStory(id) ? [id] : [];
    const signature = JSON.stringify([location.hash, openIds]);
    if (signature === lastLocationState) return;
    lastLocationState = signature;
    ++navigationVersion;
    stories.forEach((story) => setExpanded(story, openIds.includes(story.panel.id), false));
    const target = findStory(id);
    if (align && target) alignStory(target, false);
  }
  const scheduleLocation = () => {
    cancelAnimationFrame(syncFrame);
    syncFrame = requestAnimationFrame(() => syncLocation());
  };
  window.addEventListener('hashchange', scheduleLocation);
  window.addEventListener('popstate', scheduleLocation);
  window.addEventListener('pageshow', scheduleLocation);
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) stories.forEach((story) => { if (story.animation) { ++story.version; finishStory(story); } });
  });
  window.addEventListener('resize', () => {
    stories.forEach((story) => { if (story.animation) { ++story.version; finishStory(story); } });
    const locationStory = findStory('location');
    if (locationStory) updateMap(locationStory);
  }, { passive: true });
  syncLocation(false);
  const initialVersion = navigationVersion;
  const initialHash = location.hash;
  const pageLoaded = document.readyState === 'complete' ? Promise.resolve() : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
  Promise.all([pageLoaded, document.fonts?.ready || Promise.resolve()]).then(() => {
    const story = findStory(currentHashId());
    if (story && initialHash === location.hash && initialVersion === navigationVersion) alignStory(story, false);
  });
}

const cltViewer = document.querySelector('[data-clt-viewer]');
if (cltViewer) {
  const stage = cltViewer.querySelector('[data-clt-stage]');
  const selectors = [...cltViewer.querySelectorAll('[data-clt-select]')];
  const models = [...cltViewer.querySelectorAll('[data-clt-model]')];
  const panels = [...cltViewer.querySelectorAll('[data-clt-panel]')];
  const viewButtons = [...cltViewer.querySelectorAll('[data-clt-view]')];
  const dimension = cltViewer.querySelector('[data-clt-dimension]');
  const backdropLabel = cltViewer.querySelector('[data-clt-backdrop]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const syncCltMotion = () => models.forEach((model) => {
    model.querySelector('model-viewer')?.toggleAttribute('auto-rotate', model.classList.contains('is-active') && !reducedMotion.matches);
  });

  const selectCltModel = (size) => {
    cltViewer.dataset.activeModel = size;
    selectors.forEach((button) => button.setAttribute('aria-selected', String(button.dataset.cltSelect === size)));
    models.forEach((model) => model.classList.toggle('is-active', model.dataset.cltModel === size));
    syncCltMotion();
    panels.forEach((panel) => panel.classList.toggle('is-active', panel.dataset.cltPanel === size));
    if (dimension) dimension.textContent = `${size}A CONNECTION`;
    if (backdropLabel) backdropLabel.textContent = `${size}A`;
    cltViewer.querySelectorAll('.clt-view-controls img').forEach((image) => { image.src = `./assets/products/clt-${size}a-cutout.png`; });
    const activeViewer = models.find((model) => model.dataset.cltModel === size)?.querySelector('model-viewer');
    if (activeViewer) activeViewer.setAttribute('camera-orbit', '35deg 68deg auto');
    viewButtons.forEach((button) => {
      const selected = button.dataset.cltView === 'iso';
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  };
  selectors.forEach((button) => button.addEventListener('click', () => selectCltModel(button.dataset.cltSelect)));
  const cameraViews = { iso: '35deg 68deg auto', front: '0deg 75deg auto', side: '90deg 75deg auto' };
  const selectCltView = (view) => {
    const activeModel = models.find((model) => model.classList.contains('is-active'));
    const viewer = activeModel?.querySelector('model-viewer');
    if (!viewer || !cameraViews[view]) return;
    viewer.setAttribute('camera-orbit', cameraViews[view]);
    if (typeof viewer.jumpCameraToGoal === 'function') viewer.jumpCameraToGoal();
    viewButtons.forEach((button) => {
      const selected = button.dataset.cltView === view;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  };
  viewButtons.forEach((button) => button.addEventListener('click', () => selectCltView(button.dataset.cltView)));
  viewButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.classList.contains('is-active'))));
  reducedMotion.addEventListener('change', syncCltMotion);
  syncCltMotion();

  if (stage && !stage.querySelector('model-viewer')) {
    const resetModel = () => {
      stage.style.setProperty('--model-rx', '0deg');
      stage.style.setProperty('--model-ry', '0deg');
      stage.style.setProperty('--model-x', '0px');
      stage.style.setProperty('--model-y', '0px');
    };
    stage.addEventListener('pointermove', (event) => {
      if (reducedMotion.matches || event.pointerType === 'touch') return;
      const rect = stage.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - .5;
      const ny = (event.clientY - rect.top) / rect.height - .5;
      stage.style.setProperty('--model-rx', `${(-ny * 12).toFixed(2)}deg`);
      stage.style.setProperty('--model-ry', `${(nx * 14).toFixed(2)}deg`);
      stage.style.setProperty('--model-x', `${(nx * 24).toFixed(1)}px`);
      stage.style.setProperty('--model-y', `${(ny * 18).toFixed(1)}px`);
    });
    stage.addEventListener('pointerleave', resetModel);
    reducedMotion.addEventListener('change', resetModel);
  }
}

document.querySelectorAll('[data-solution-card]').forEach((card) => {
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const resetCard = () => {
    card.style.setProperty('--card-rx', '0deg');
    card.style.setProperty('--card-ry', '0deg');
    card.style.setProperty('--visual-x', '0px');
    card.style.setProperty('--visual-y', '0px');
  };
  card.addEventListener('pointermove', (event) => {
    if (!canHover.matches || motionPreference.matches) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    card.style.setProperty('--card-rx', `${(-y * 4.5).toFixed(2)}deg`);
    card.style.setProperty('--card-ry', `${(x * 5.5).toFixed(2)}deg`);
    card.style.setProperty('--visual-x', `${(x * 15).toFixed(1)}px`);
    card.style.setProperty('--visual-y', `${(y * 11).toFixed(1)}px`);
  });
  card.addEventListener('pointerleave', resetCard);
  card.addEventListener('blur', resetCard);
  motionPreference.addEventListener('change', resetCard);
});

const inquiryForm = document.querySelector('[data-inquiry-form]');
const productField = document.querySelector('[data-product-field]');
if (inquiryForm) {
  const labels = {
    hvac: ['HVAC 제품을 선택해 주세요', 'Eurus Impeller', 'Partial Impeller', 'Pull-Out Impeller', 'Fan Model 라인업', 'AHU / RTU', 'Bio HVAC', 'IEF 전기집진필터', 'IAQS 실내공기질', 'CLT 배수 트랩', 'FCM 팬 제어', 'ECM 공조기 제어'],
    edim: ['EDIM 영역을 선택해 주세요', 'CPQ', 'PLM', 'RCCS™', 'ERP 연계', 'Demo / PoC', '시스템 연계'],
    partnership: ['협력 분야를 선택해 주세요', '기술 협력', '제조 협력', '사업 제휴'],
  };
  const updateProducts = (type) => {
    if (!productField || !labels[type]) return;
    const previous = productField.value;
    productField.replaceChildren(...labels[type].map((label, index) => new Option(label, index ? label : '')));
    if (labels[type].includes(previous)) productField.value = previous;
    productField.disabled = false;
  };
  inquiryForm.querySelectorAll('input[name="inquiryType"]').forEach((radio) => radio.addEventListener('change', () => updateProducts(radio.value)));
  updateProducts(inquiryForm.querySelector('input[name="inquiryType"]:checked')?.value);
}

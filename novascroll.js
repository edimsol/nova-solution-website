/* Overlay indicators for native scroll surfaces. No wheel/touch scrolling hooks. */
(() => {
  'use strict';
  if (window.NovaScroll || !window.ResizeObserver || !document.body) return;
  const IDLE_MS = 1600;
  const SELECTOR = '[data-novascroll], [data-company-panel], .company-panel, .solution-product-track, .solution-card-track, [data-slider-track]';
  const managers = new Map();
  const layer = document.createElement('div');
  layer.className = 'novascroll-layer';
  document.body.append(layer);
  // A missing stylesheet must leave the native scrollbar intact.
  if (getComputedStyle(layer).getPropertyValue('--novascroll-css-ready').trim() !== '1') { layer.remove(); return; }
  let serial = 0;
  let frame = 0;
  let discoveryNeeded = true;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const root = document.scrollingElement || document.documentElement;
  const isDocumentLocked = () => [document.documentElement, document.body].some(element => { const style = getComputedStyle(element); return /hidden|clip/.test(style.overflowY) || style.position === 'fixed'; });

  function schedule(discover = false) {
    discoveryNeeded ||= discover;
    if (!frame) frame = requestAnimationFrame(update);
  }
  function update() {
    frame = 0;
    if (discoveryNeeded) { discoveryNeeded = false; discover(); }
    for (const [surface, manager] of managers) {
      if (surface !== root && !surface.isConnected) { manager.destroy(); managers.delete(surface); continue; }
      try { manager.update(); } catch (error) { manager.destroy(); managers.delete(surface); console.warn('NovaScroll restored native scrolling.', error); }
    }
  }
  function discover() {
    for (const surface of [root, ...document.querySelectorAll(SELECTOR)]) {
      if (surface.getAttribute('data-novascroll') === 'off') { managers.get(surface)?.destroy(); managers.delete(surface); continue; }
      if (managers.has(surface) || surface.closest('model-viewer, .leaflet-container, .novascroll-layer')) continue;
      try { managers.set(surface, createManager(surface)); }
      catch (error) { surface.classList.remove('novascroll-ready'); console.warn('NovaScroll kept native scrolling.', error); }
    }
  }
  function visibleRect(surface, documentSurface) {
    if (documentSurface) return { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    const rect = surface.getBoundingClientRect();
    const box = { left: Math.max(0, rect.left + surface.clientLeft), top: Math.max(0, rect.top + surface.clientTop), right: Math.min(innerWidth, rect.left + surface.clientLeft + surface.clientWidth), bottom: Math.min(innerHeight, rect.top + surface.clientTop + surface.clientHeight) };
    for (let ancestor = surface.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      const bounds = ancestor.getBoundingClientRect();
      if (/auto|scroll|hidden|clip/.test(style.overflowX)) { box.left = Math.max(box.left, bounds.left + ancestor.clientLeft); box.right = Math.min(box.right, bounds.left + ancestor.clientLeft + ancestor.clientWidth); }
      if (/auto|scroll|hidden|clip/.test(style.overflowY)) { box.top = Math.max(box.top, bounds.top + ancestor.clientTop); box.bottom = Math.min(box.bottom, bounds.top + ancestor.clientTop + ancestor.clientHeight); }
    }
    return box;
  }
  function documentRailBottom(bottom) {
    const dock = document.querySelector('.prism-nav-mobile-shell .prism-nav-dock');
    const shell = dock?.closest('.prism-nav-mobile-shell');
    if (!shell || document.body.classList.contains('prism-nav-keyboard-open') || dock.closest('[hidden], [inert], [aria-hidden="true"]') || !dock.getClientRects().length) return bottom;
    const shellStyle = getComputedStyle(shell);
    if (shellStyle.display === 'none' || shellStyle.visibility === 'hidden' || Number(shellStyle.opacity) === 0) return bottom;
    const bounds = dock.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0 || bounds.top >= bottom || bounds.bottom <= 0) return bottom;
    const primary = dock.querySelector('.prism-dock-primary .prism-dock-icon');
    const primaryBounds = primary?.getClientRects().length ? primary.getBoundingClientRect() : null;
    // The usual 6px rail inset supplies the gap above the dock's raised button.
    // Only its painted track is shortened; native viewport/extent stay intact.
    return clamp(Math.min(bounds.top, primaryBounds?.top ?? bounds.top), 0, bottom);
  }
  function createManager(surface) {
    const documentSurface = surface === root;
    const controller = new AbortController();
    const signal = controller.signal;
    const generatedId = !surface.id;
    if (generatedId) surface.id = `novascroll-surface-${++serial}`;
    const axes = [];
    let idle = 0;
    let showing = false;
    let ownsCarouselPause = false;
    const carousel = surface.matches('.solution-product-track, .solution-card-track, [data-slider-track]');
    const held = () => axes.some(axis => axis.hover || axis.drag || axis.thumb === document.activeElement);
    function syncCarouselPause() {
      const shouldPause = axes.some(axis => axis.drag || axis.hover || axis.thumb === document.activeElement);
      if (carousel && shouldPause && !surface.classList.contains('is-dragging')) { surface.classList.add('is-dragging'); ownsCarouselPause = true; }
      else if (ownsCarouselPause && !shouldPause) { surface.classList.remove('is-dragging'); ownsCarouselPause = false; }
    }
    function hideLater() {
      clearTimeout(idle);
      if (held()) return;
      idle = setTimeout(() => { if (!held()) { showing = false; axes.forEach(axis => axis.rail.classList.remove('is-visible')); } }, IDLE_MS);
    }
    function show() {
      showing = true;
      axes.forEach(axis => axis.rail.classList.add('is-visible'));
      hideLater();
    }
    for (const axis of ['y', 'x']) {
      const rail = document.createElement('div');
      rail.className = 'novascroll-rail'; rail.dataset.axis = axis; rail.hidden = true;
      const thumb = document.createElement('button');
      thumb.type = 'button'; thumb.className = 'novascroll-thumb'; thumb.setAttribute('role', 'scrollbar');
      thumb.setAttribute('aria-controls', surface.id); thumb.setAttribute('aria-orientation', axis === 'y' ? 'vertical' : 'horizontal');
      thumb.setAttribute('aria-valuemin', '0'); thumb.setAttribute('aria-valuemax', '100'); thumb.setAttribute('aria-valuenow', '0');
      const label = surface.dataset.novascrollLabel || surface.getAttribute('aria-label') || (documentSurface ? '페이지' : surface.matches('[data-company-panel], .company-panel') ? '회사 정보 상세' : carousel ? '솔루션 제품 목록' : '콘텐츠');
      thumb.setAttribute('aria-label', `${label} ${axis === 'y' ? '세로' : '가로'} 스크롤`);
      rail.append(thumb); layer.append(rail);
      const state = { axis, rail, thumb, hover: false, drag: null, max: 0, travel: 0, viewport: 0 };
      axes.push(state);
      const position = () => axis === 'y' ? surface.scrollTop : Math.abs(surface.scrollLeft);
      const setPosition = value => {
        const target = clamp(value, 0, state.max);
        if (axis === 'y') surface.scrollTop = target;
        else surface.scrollLeft = getComputedStyle(surface).direction === 'rtl' ? -target : target;
        show(); schedule();
      };
      const release = event => {
        if (!state.drag || (event.pointerId !== undefined && event.pointerId !== state.drag.id)) return;
        const pointerId = state.drag.id;
        state.drag = null;
        if (thumb.hasPointerCapture(pointerId)) thumb.releasePointerCapture(pointerId);
        thumb.classList.remove('is-dragging');
        if (!axes.some(item => item.drag || item.thumb === document.activeElement)) surface.classList.remove('novascroll-dragging');
        syncCarouselPause(); hideLater();
      };
      thumb.addEventListener('pointerenter', () => { state.hover = true; syncCarouselPause(); show(); }, { signal });
      thumb.addEventListener('pointerleave', () => { state.hover = false; syncCarouselPause(); hideLater(); }, { signal });
      thumb.addEventListener('focus', () => { surface.classList.add('novascroll-dragging'); syncCarouselPause(); show(); }, { signal });
      thumb.addEventListener('blur', () => { if (!axes.some(item => item.drag || item.thumb === document.activeElement)) surface.classList.remove('novascroll-dragging'); syncCarouselPause(); hideLater(); }, { signal });
      thumb.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !state.max || !state.travel) return;
        event.preventDefault();
        state.drag = { id: event.pointerId, start: axis === 'y' ? event.clientY : event.clientX, offset: position() };
        thumb.setPointerCapture(event.pointerId); thumb.classList.add('is-dragging'); surface.classList.add('novascroll-dragging');
        syncCarouselPause(); show();
      }, { signal });
      thumb.addEventListener('pointermove', event => {
        if (!state.drag || state.drag.id !== event.pointerId) return;
        const delta = (axis === 'y' ? event.clientY : event.clientX) - state.drag.start;
        const direction = axis === 'x' && getComputedStyle(surface).direction === 'rtl' ? -1 : 1;
        setPosition(state.drag.offset + delta * direction / Math.max(1, state.travel) * state.max);
      }, { signal });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => thumb.addEventListener(name, release, { signal }));
      thumb.addEventListener('keydown', event => {
        const step = Math.max(32, state.viewport * .08);
        let target;
        if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = state.max;
        else if (event.key === 'PageUp') target = position() - state.viewport * .9;
        else if (event.key === 'PageDown') target = position() + state.viewport * .9;
        else if (event.key === ' ') target = position() + state.viewport * .9 * (event.shiftKey ? -1 : 1);
        else if (event.key === (axis === 'y' ? 'ArrowUp' : 'ArrowLeft')) target = position() - step;
        else if (event.key === (axis === 'y' ? 'ArrowDown' : 'ArrowRight')) target = position() + step;
        else return;
        event.preventDefault(); setPosition(target);
      }, { signal });
    }
    const onScroll = () => { schedule(); if (!carousel || !surface.classList.contains('is-auto-playing')) show(); };
    (documentSurface ? document : surface).addEventListener('scroll', onScroll, { passive: true, signal });
    const resize = new ResizeObserver(() => schedule());
    resize.observe(documentSurface ? document.body : surface);
    if (documentSurface) resize.observe(document.documentElement);
    const manager = {
      show,
      update() {
        const style = getComputedStyle(surface);
        const box = visibleRect(surface, documentSurface);
        const verticalBottom = documentSurface ? documentRailBottom(box.bottom) : box.bottom;
        const visible = surface.getClientRects().length && box.right - box.left > 20 && box.bottom - box.top > 20 && style.visibility !== 'hidden' && style.display !== 'none' && !surface.closest('[hidden], [inert], [aria-hidden="true"]') && !(documentSurface && isDocumentLocked());
        for (const state of axes) {
          const y = state.axis === 'y';
          const viewport = documentSurface ? (y ? innerHeight : innerWidth) : (y ? surface.clientHeight : surface.clientWidth);
          const extent = y ? surface.scrollHeight : surface.scrollWidth;
          const overflow = y ? style.overflowY : style.overflowX;
          state.max = Math.max(0, extent - viewport); state.viewport = viewport;
          const available = y ? verticalBottom - box.top : box.right - box.left;
          const active = visible && available > 20 && state.max > 1 && (documentSurface ? !/hidden|clip/.test(overflow) : /auto|scroll/.test(overflow));
          state.rail.hidden = !active;
          if (!active) continue;
          const length = Math.max(0, available - 12);
          const thumbLength = Math.min(length, Math.max(32, length * viewport / extent));
          state.travel = length - thumbLength;
          const ratio = clamp((y ? surface.scrollTop : Math.abs(surface.scrollLeft)) / state.max, 0, 1);
          const offset = (y || style.direction !== 'rtl' ? ratio : 1 - ratio) * state.travel;
          state.rail.style.left = `${y ? box.right - 18 : box.left + 6}px`;
          state.rail.style.top = `${y ? box.top + 6 : box.bottom - 18}px`;
          state.rail.style[y ? 'height' : 'width'] = `${length}px`;
          state.thumb.style[y ? 'height' : 'width'] = `${thumbLength}px`;
          state.thumb.style.transform = y ? `translateY(${offset}px)` : `translateX(${offset}px)`;
          state.thumb.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
          state.thumb.setAttribute('aria-valuetext', `${Math.round(ratio * 100)}%`);
          state.rail.classList.toggle('is-visible', showing);
        }
        if (surface.getAnimations?.().some(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity)) schedule();
      },
      destroy() {
        clearTimeout(idle); controller.abort(); resize.disconnect();
        axes.forEach(axis => axis.rail.remove());
        surface.classList.remove('novascroll-ready', 'novascroll-dragging');
        if (ownsCarouselPause) surface.classList.remove('is-dragging');
        if (generatedId) surface.removeAttribute('id');
      },
    };
    manager.update();
    surface.classList.add('novascroll-ready');
    return manager;
  }
  function activity(event) {
    if (event.type === 'keydown' && !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' ','Tab'].includes(event.key)) return;
    if (event.type === 'keydown' && event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    const target = event.target instanceof Element ? event.target : document.documentElement;
    if (target.closest('.novascroll-layer')) return;
    for (const [surface, manager] of managers) if (surface === root || surface.contains(target)) manager.show();
    schedule();
  }
  const lifetime = new AbortController();
  ['pointermove','pointerdown','touchstart','touchmove','keydown'].forEach(name => document.addEventListener(name, activity, { passive: true, capture: true, signal: lifetime.signal }));
  window.addEventListener('resize', () => schedule(), { passive: true, signal: lifetime.signal });
  window.visualViewport?.addEventListener('resize', () => schedule(), { passive: true, signal: lifetime.signal });
  document.addEventListener('load', () => schedule(), { capture: true, signal: lifetime.signal });
  document.addEventListener('prism:navigation-layout', () => schedule(true), { signal: lifetime.signal });
  const mutation = new MutationObserver(records => {
    const relevant = records.filter(record => !record.target.closest?.('.novascroll-layer'));
    if (!relevant.length) return;
    schedule(relevant.some(record => record.type === 'childList' || record.attributeName === 'data-novascroll'));
  });
  mutation.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class','style','hidden','aria-hidden','inert','open','data-novascroll'] });
  window.NovaScroll = {
    refresh: () => schedule(true),
    destroy() { lifetime.abort(); mutation.disconnect(); cancelAnimationFrame(frame); managers.forEach(manager => manager.destroy()); managers.clear(); layer.remove(); delete window.NovaScroll; },
  };
  schedule(true);
})();

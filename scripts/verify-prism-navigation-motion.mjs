// Exercise the real navigation controller's animation lifecycle with a minimal
// DOM and manually settled WAAPI promises. Browser layout remains a separate QA.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../prism-nav.js', import.meta.url), 'utf8');

function harness() {
  const animations = [], frames = [], events = new Map();
  let document;
  const media = new Map();
  function matches(element, selector) {
    if (selector.includes(',')) return selector.split(',').some(part => matches(element, part.trim()));
    if (selector.includes(' > ')) {
      const [parent, child] = selector.split(' > ');
      return matches(element, child) && !!element.parentElement && matches(element.parentElement, parent);
    }
    if (selector === '[hidden]') return element.hidden;
    if (selector === '[inert]') return element.inert;
    if (selector === ':hover' || selector === ':focus') return false;
    const tag = selector.match(/^[a-z][\w-]*/i)?.[0];
    if (tag && element.tagName !== tag.toUpperCase()) return false;
    for (const [, name] of selector.matchAll(/\.([\w-]+)/g)) if (!element.classList.contains(name)) return false;
    const id = selector.match(/#([\w-]+)/)?.[1];
    if (id && element.id !== id) return false;
    for (const [, name, value] of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
      if (!element.attributes.has(name) || (value !== undefined && element.getAttribute(name) !== value)) return false;
    }
    return true;
  }
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase(); this.children = []; this.attributes = new Map(); this.dataset = {};
      this.hidden = false; this.inert = false; this.scrollTop = 0; this.listeners = new Map(); this.style = { setProperty() {} };
      const classes = new Set();
      this.classList = { add: (...values) => values.forEach(value => classes.add(value)), remove: (...values) => values.forEach(value => classes.delete(value)), contains: value => classes.has(value), toggle: (value, force) => { const enabled = force ?? !classes.has(value); enabled ? classes.add(value) : classes.delete(value); return enabled; } };
    }
    setAttribute(key, value) {
      this.attributes.set(key, String(value));
      if (key === 'class') this.classList.add(...String(value).split(/\s+/));
      if (key === 'id') this.id = value;
      if (key === 'hidden') this.hidden = true;
      if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    }
    getAttribute(key) { return this.attributes.get(key) ?? null; }
    removeAttribute(key) { this.attributes.delete(key); }
    get parentElement() { return this.parent || null; }
    append(child) { if (child.parent) child.parent.children = child.parent.children.filter(item => item !== child); child.parent = this; this.children.push(child); }
    set innerHTML(html) {
      this.children = [];
      const stack = [this], voids = new Set(['img', 'br', 'input', 'link', 'meta']);
      for (const token of html.matchAll(/<(\/)?([a-z][\w-]*)([^>]*)>/gi)) {
        const [, closing, tag, attrs] = token;
        if (closing) { if (stack.length > 1) stack.pop(); continue; }
        const element = new Element(tag);
        for (const [, key, quoted, single, bare] of attrs.matchAll(/([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) element.setAttribute(key, quoted ?? single ?? bare ?? '');
        stack.at(-1).append(element);
        if (!voids.has(tag.toLowerCase()) && !attrs.trimEnd().endsWith('/')) stack.push(element);
      }
    }
    querySelectorAll(selector) { return this.children.flatMap(child => [...(matches(child, selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { return matches(this, selector) ? this : this.parentElement?.closest(selector) || null; }
    matches(selector) { return matches(this, selector); }
    contains(element) { return element === this || this.children.some(child => child.contains(element)); }
    get isConnected() { return document.body.contains(this); }
    getClientRects() { return this.closest('[hidden]') ? [] : [{}]; }
    focus() { document.activeElement = this; }
    addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(callback); }
    animate(keyframes, options) {
      let resolve, reject, settled = false;
      const animation = { element: this, keyframes, options, cancelled: false,
        finished: new Promise((done, fail) => { resolve = done; reject = fail; }),
        finish() { if (settled) return; settled = true; resolve(); },
        cancel() { this.cancelled = true; if (settled) return; settled = true; reject(new Error('cancelled')); },
      };
      animations.push(animation);
      return animation;
    }
  }
  const body = new Element('body'), root = new Element('html'); root.append(body);
  body.innerHTML = '<header data-header><div><a href="./index.html">Home</a><button data-menu-toggle><span class="sr-only"></span></button><nav id="site-nav" data-nav></nav></div></header><main></main>';
  document = { body, documentElement: root, activeElement: body,
    querySelector: selector => body.querySelector(selector), querySelectorAll: selector => body.querySelectorAll(selector),
    createElement: tag => new Element(tag), getElementById: id => body.querySelector(`#${id}`),
    addEventListener(type, callback) { if (!events.has(type)) events.set(type, []); events.get(type).push(callback); },
    dispatchEvent(event) { events.get(event.type)?.forEach(callback => callback(event)); },
  };
  const context = { document, Element, HTMLElement: Element, Node: Element, URL, Promise, queueMicrotask,
    location: { href: 'http://localhost:8000/', pathname: '/', hash: '' }, innerWidth: 390, innerHeight: 844, scrollY: 0,
    requestAnimationFrame: callback => frames.push(callback), setTimeout, clearTimeout,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    addEventListener() {},
    matchMedia(query) {
      if (!media.has(query)) media.set(query, { matches: query.includes('max-width'), callbacks: [], addEventListener(type, callback) { this.callbacks.push(callback); }, emit(value) { this.matches = value; this.callbacks.forEach(callback => callback({ matches: value })); } });
      return media.get(query);
    },
    getComputedStyle(element) { const animation = animations.findLast(item => item.element === element && !item.cancelled); return animation?.keyframes[0] || { transform: 'none', opacity: '1' }; },
  };
  context.window = context;
  vm.runInNewContext(source, context, { filename: 'prism-nav.js' });
  const settle = async () => { for (let i = 0; i < 8; i++) { await Promise.resolve(); frames.splice(0).forEach(callback => callback()); } };
  const query = selector => document.querySelector(selector);
  return { ...context, media, animations, settle, query, api: context.PrismNavigation,
    sheet: query('.prism-nav-sheet'), main: query('main'), nav: query('[data-nav]'), shell: query('.prism-nav-mobile-shell'),
    panel: key => query(`#prism-nav-panel-${key}`), button: key => query(`[data-prism-dock-trigger="${key}"]`),
    latest: element => animations.findLast(animation => animation.element === element && !animation.cancelled),
  };
}

{
  const app = harness(); app.api.open('company');
  assert.equal(app.latest(app.sheet).options.duration, 320);
  assert.equal(app.latest(app.sheet).options.easing, 'ease-in-out');
  assert.match(app.latest(app.sheet).keyframes[0].transform, /28px/);
  assert.equal(app.main.inert, true);
  app.latest(app.sheet).finish(); await app.settle();
  app.api.open('solutions');
  assert.match(app.latest(app.panel('solutions')).keyframes[0].transform, /36px/);
  assert.equal(app.latest(app.panel('solutions')).options.duration, 280);
  app.api.open('technology');
  assert.match(app.latest(app.panel('technology')).keyframes[0].transform, /-36px/);
  assert.equal(app.nav.querySelectorAll('.prism-nav-panel').filter(panel => !panel.hidden).length, 1);
  app.api.close(true);
  assert.equal(app.sheet.hidden, false, 'closing sheet remains visible until its animation completes');
  assert.equal(app.main.inert, true, 'background remains inert during close');
  app.latest(app.sheet).finish(); await app.settle();
  assert.equal(app.sheet.hidden, true);
  assert.equal(app.main.inert, false);
  assert.equal(app.document.activeElement, app.button('technology'));
  console.log('PASS open lift, directional category slides, close lifecycle and focus restoration');
}
{
  const app = harness(); app.api.open('company'); app.api.close(true);
  const staleClose = app.latest(app.sheet);
  app.api.open('resources');
  assert.equal(staleClose.cancelled, true);
  staleClose.finish(); await app.settle();
  assert.equal(app.sheet.hidden, false);
  assert.equal(app.panel('resources').hidden, false);
  assert.equal(app.main.inert, true);
  app.latest(app.sheet).finish(); await app.settle();
  assert.equal(app.shell.getAttribute('aria-modal'), 'true');
  console.log('PASS interrupted close/reopen cannot hide or unlock the new menu');
}
{
  const app = harness(); app.api.open('company'); app.api.close(true);
  const staleClose = app.latest(app.sheet);
  app.api.close(false);
  assert.equal(app.sheet.hidden, true, 'Company handoff closes synchronously');
  assert.equal(app.main.inert, false);
  app.main.inert = true; // The Company modal now owns this background lock.
  staleClose.finish(); await app.settle();
  assert.equal(app.main.inert, true, 'cancelled navigation cannot release a subsequent modal lock');
  console.log('PASS synchronous close(false) preserves subsequent Company modal ownership');
}
{
  const app = harness(); app.api.open('solutions'); app.api.close(true);
  app.media.get('(prefers-reduced-motion: reduce)').emit(true);
  await app.settle();
  assert.equal(app.sheet.hidden, true); assert.equal(app.main.inert, false);
  const count = app.animations.length;
  app.api.open('technology'); app.api.open('resources'); app.api.close(true);
  assert.equal(app.animations.length, count); assert.equal(app.sheet.hidden, true);
  console.log('PASS dynamic reduced motion finishes close and bypasses later animation');
}
{
  const app = harness(); app.api.open('solutions'); app.api.close(true);
  const staleClose = app.latest(app.sheet);
  app.media.get('(max-width: 960px)').emit(false);
  staleClose.finish(); await app.settle();
  assert.equal(app.sheet.hidden, true); assert.equal(app.main.inert, false);
  assert.equal(app.panel('solutions').parentElement.dataset.prismNavGroup, 'solutions');
  assert.equal(app.shell.hidden, true);
  app.media.get('(max-width: 960px)').emit(true);
  app.api.open('company');
  assert.equal(app.panel('company').hidden, false); assert.equal(app.main.inert, true);
  console.log('PASS breakpoint changes cancel motion and preserve reusable panel nodes');
}

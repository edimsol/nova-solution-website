// Behavioral checks against the real controller; no browser, network, or site mutations.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../prism-background.js', import.meta.url), 'utf8');
const sceneNames = ['hero', 'solutions', 'company', 'technology', 'industries', 'contact'];

function harness({ reduced = false, manualImages = false, failed = [], page = 'index.html', connection = {}, userPaused = false, unsupported = false, manualPlay = false, autoplayReject = false, battery = null } = {}) {
  const listeners = new Map(), frames = new Map(), timers = new Map(), images = new Map();
  const videos = [], requestedClips = [], playCalls = [], storage = new Map();
  if (userPaused) storage.set('nova-background-motion', 'paused');
  let serial = 0, now = 0;
  class Element {
    constructor(tag) {
      this.tag = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.listeners = new Map();
      this.paused = true; this.readyState = 2;
      if (tag === 'video') videos.push(this);
      const classes = new Set();
      this.classList = { add: (...items) => items.forEach(item => classes.add(item)), remove: (...items) => items.forEach(item => classes.delete(item)), contains: item => classes.has(item), toggle(item, force) { const value = force ?? !classes.has(item); value ? classes.add(item) : classes.delete(item); return value; } };
    }
    set className(value) { this.classList.add(...value.split(' ')); }
    append(...children) { children.forEach(child => { child.parent = this; this.children.push(child); }); }
    prepend(child) { child.parent = this; this.children.unshift(child); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; if (name === 'src') this.url = ''; }
    matches(selector) { return selector === this.tag; }
    getBoundingClientRect() { return { top: this.top - context.scrollY }; }
    addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(callback); }
    emit(type) { this.listeners.get(type)?.forEach(callback => callback({ type })); }
    canPlayType() { return unsupported ? '' : 'probably'; }
    set src(value) { this.url = value; if (this.tag === 'video') requestedClips.push(value); }
    get src() { return this.url || ''; }
    load() {}
    pause() { this.paused = true; }
    play() {
      const call = { node: this };
      playCalls.push(call);
      if (autoplayReject) return Promise.reject(Object.assign(new Error('autoplay'), { name: 'NotAllowedError' }));
      const resolvePlayback = () => { this.paused = false; this.emit('playing'); };
      if (!manualPlay) { resolvePlayback(); return Promise.resolve(); }
      return new Promise((resolve, reject) => { call.resolve = () => { resolvePlayback(); resolve(); }; call.reject = reject; });
    }
  }
  const body = new Element('body'); body.classList.add('prism-site');
  const main = new Element('main');
  sceneNames.forEach((name, index) => { const section = new Element('section'); section.top = index * 1000; main.append(section); });
  const media = { matches: reduced, addEventListener(type, callback) { this.callback = callback; } };
  const addEventListener = (type, callback, options) => {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push({ callback, options });
  };
  connection.addEventListener = (type, callback) => { connection.callback = callback; };
  if (battery) battery.addEventListener = (type, callback) => { battery.callback = callback; };
  class FakeImage {
    decode() { return failed.some(part => this.src.includes(part)) ? Promise.reject(new Error('decode failure')) : Promise.resolve(); }
    set src(value) {
      this.url = value;
      if (!images.has(value)) images.set(value, []);
      images.get(value).push(this);
      if (!manualImages) queueMicrotask(() => this.onload());
    }
    get src() { return this.url; }
  }
  const context = {
    document: { body, hidden: false, documentElement: { scrollHeight: 6000, dataset: {} }, fonts: { ready: Promise.resolve() }, createElement: tag => new Element(tag), querySelector: selector => selector === 'main' || (selector === '.prism-home' && page === 'index.html') ? main : null, addEventListener, dispatchEvent: event => listeners.get(event.type)?.forEach(({ callback }) => callback(event)) },
    navigator: { connection, ...(battery ? { getBattery: () => Promise.resolve(battery) } : {}) },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    location: { pathname: `/${page}` }, innerWidth: 1200, innerHeight: 1000, devicePixelRatio: 1, scrollY: 0,
    Image: FakeImage, matchMedia: () => media, addEventListener,
    ResizeObserver: class { constructor(callback) { this.callback = callback; } observe(element) { assert.ok(element, 'ResizeObserver must receive a real main element'); } },
    requestAnimationFrame: callback => { const id = ++serial; frames.set(id, callback); return id; },
    setTimeout: (callback, delay) => { const id = ++serial; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
  };
  context.window = context;
  vm.runInNewContext(source, context, { filename: 'prism-background.js' });
  const background = body.children[0];
  const emit = (type, payload = {}) => listeners.get(type)?.forEach(({ callback }) => callback({ type, ...payload, preventDefault() { throw new Error(`${type} was intercepted`); } }));
  const settle = async () => {
    for (let pass = 0; pass < 12; pass += 1) {
      await Promise.resolve();
      const batch = [...frames.values()]; frames.clear(); batch.forEach(callback => callback(now));
    }
  };
  const advance = async milliseconds => {
    const end = now + milliseconds;
    while (true) {
      const next = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].callback(); await settle();
    }
    now = end; await settle();
  };
  const expectScene = name => {
    assert.equal(background.dataset.scene, name);
    assert.equal(background.dataset.state, 'ready');
    const active = background.children.filter(layer => layer.classList.contains('is-active'));
    assert.equal(active.length, 1, 'exactly one image layer is the current scene');
    assert.match(active[0].src, new RegExp(`/${name}-`));
  };
  return { context, background, listeners, timers, images, settle, advance, expectScene, videos, requestedClips, playCalls, storage, emit,
    get control() { return main.children.find(child => child.classList.contains('prism-motion-control')); },
    allowPlayback() { autoplayReject = false; },
    async scroll(top) { context.scrollY = top; emit('scroll'); await settle(); },
    async resize(width, height) { context.innerWidth = width; context.innerHeight = height; emit('resize'); await settle(); },
    async reduce(value) { media.matches = value; media.callback?.({ matches: value }); await settle(); },
    async load(scene) { const entry = [...images.entries()].find(([url]) => url.includes(`/${scene}-`)); assert.ok(entry, `${scene} was requested`); entry[1].forEach(image => image.onload()); await settle(); },
  };
}

{
  const app = harness(); await app.settle(); app.expectScene('hero'); await app.advance(710);
  await app.scroll(549); app.expectScene('hero');
  await app.scroll(550); app.expectScene('solutions');
  await app.advance(710); await app.scroll(549); app.expectScene('hero');
  await app.scroll(5000); assert.equal(app.background.dataset.requestedScene, 'contact');
  app.expectScene('hero'); // Finish the ongoing fade before applying the latest jump.
  await app.advance(710); app.expectScene('contact');
  await app.scroll(1550); await app.scroll(3550); await app.scroll(2550);
  await app.advance(710); app.expectScene('technology');
  console.log('PASS 45% forward/reverse boundary and rapid-jump latest scene');
}
{
  const app = harness({ manualImages: true });
  await app.scroll(5000);
  await app.load('hero'); assert.notEqual(app.background.dataset.scene, 'hero', 'stale initial decode cannot win');
  await app.load('contact'); app.expectScene('contact'); await app.advance(710);
  await app.scroll(550); await app.scroll(2550);
  await app.load('technology'); app.expectScene('technology');
  await app.load('solutions'); app.expectScene('technology');
  console.log('PASS out-of-order image resolution cannot replace the desired scene');
}
{
  const app = harness({ failed: ['/hero-'] }); await app.settle();
  assert.equal(app.background.dataset.state, 'fallback');
  assert.equal(app.background.dataset.scene, 'hero');
  assert.ok(app.background.children.every(layer => !layer.classList.contains('is-active')), 'decode failure leaves the charcoal base unobscured');
  await app.scroll(1550); app.expectScene('company');
  console.log('PASS failed decode removes image layers; later valid scene recovers');
}
{
  const app = harness({ reduced: true }); await app.settle();
  await app.scroll(550); app.expectScene('solutions');
  await app.scroll(1550); app.expectScene('company');
  assert.equal(app.timers.size, 0, 'reduced motion never waits for a fade timer');
  await app.scroll(2000);
  await app.resize(390, 844);
  assert.match(app.background.children.find(layer => layer.classList.contains('is-active')).src, /company-640\.jpg$/);
  await app.resize(700, 900);
  assert.match(app.background.children.find(layer => layer.classList.contains('is-active')).src, /company-1280\.jpg$/);
  await app.resize(1400, 800);
  assert.match(app.background.children.find(layer => layer.classList.contains('is-active')).src, /company-1672\.jpg$/);
  console.log('PASS reduced-motion immediate scenes and full-frame posters at 390x844, 700x900 and landscape');
}
{
  const app = harness(); await app.settle(); await app.scroll(2550);
  await app.reduce(true); app.expectScene('technology');
  assert.equal(app.timers.size, 0, 'enabling reduced motion drains an in-progress transition');
  assert.ok(!app.listeners.has('wheel') && !app.listeners.has('touchmove') && !app.listeners.has('touchstart'));
  assert.ok(app.listeners.get('scroll').every(listener => listener.options?.passive === true));
  assert.ok(app.listeners.get('resize').every(listener => listener.options?.passive === true));
  console.log('PASS dynamic reduced-motion preference and no wheel/touch interception');
}
{
  const app = harness({ page: 'parts-control.html', reduced: true }); await app.settle(); app.expectScene('industries');
  assert.equal(app.background.attributes['aria-hidden'], 'true');
  console.log('PASS detail-page scene and decorative accessibility state');
}
{
  const app = harness(); await app.settle();
  assert.equal(app.requestedClips.length, 0, 'no clip request before the decoded poster finishes fading');
  await app.advance(710);
  assert.deepEqual(app.requestedClips, ['./assets/backgrounds/prism/video/hero-1280.mp4?v=20261009-loop10']);
  const node = app.playCalls[0].node;
  assert.ok(node.muted && node.defaultMuted && node.loop && node.playsInline);
  assert.equal(node.preload, 'none');
  assert.equal(node.controls, false);
  assert.equal(node.attributes['aria-hidden'], 'true');
  assert.equal(app.background.dataset.video, 'playing');
  assert.equal(app.timers.size, 0, 'steady native video has no JS animation/polling timer');
  await app.scroll(550);
  assert.equal(node.paused, true); assert.equal(node.src, '');
  assert.equal(app.requestedClips.length, 1);
  await app.advance(710);
  assert.equal(app.requestedClips.length, 2);
  assert.match(app.requestedClips[1], /solutions-1280\.mp4\?v=20261009-loop10$/);
  assert.equal(app.background.children.filter(child => child.tag === 'video').length, 1);
  console.log('PASS one muted decoder, deferred current-scene-only clip loading and no continuous JS work');
}
{
  const app = harness({ manualPlay: true }); await app.settle(); await app.advance(710);
  const old = app.playCalls[0];
  await app.scroll(550); await app.scroll(1550); await app.scroll(2550);
  await app.advance(1420);
  assert.equal(app.playCalls.length, 2, 'intermediate scenes do not start videos during rapid scroll');
  assert.match(app.playCalls[1].node.src, /technology-1280\.mp4\?v=20261009-loop10$/);
  old.resolve(); await app.settle();
  assert.ok(old.node.paused, 'a late old playing event cannot restart a discarded decoder');
  app.playCalls[1].resolve(); await app.settle();
  assert.equal(app.background.dataset.video, 'playing');
  assert.equal(app.videos.filter(node => !node.paused).length, 1);
  console.log('PASS rapid-scroll and stale-play-promise/event cancellation');
}
{
  const app = harness(); await app.settle(); await app.advance(710);
  const node = app.playCalls[0].node;
  app.context.document.hidden = true; app.emit('visibilitychange'); await app.settle();
  assert.ok(node.paused); assert.equal(app.context.document.documentElement.dataset.prismMotion, 'paused');
  app.context.document.hidden = false; app.emit('visibilitychange'); await app.settle();
  assert.equal(app.requestedClips.length, 1, 'visibility resumes the same loaded source');
  assert.equal(node.paused, false);
  app.emit('prism:navigation-layout', { detail: { panel: 'company', open: false } }); await app.settle();
  assert.ok(node.paused); assert.equal(app.control.hidden, true);
  app.emit('prism:navigation-layout', { detail: { panel: null, open: false } }); await app.settle();
  assert.equal(node.paused, false);
  app.emit('pagehide'); await app.settle(); assert.ok(node.paused);
  app.emit('pageshow'); await app.settle(); assert.equal(node.paused, false);
  console.log('PASS hidden tab, menu and page lifecycle suspension with source reuse');
}
{
  for (const options of [
    { reduced: true }, { connection: { saveData: true } }, { connection: { effectiveType: '3g' } },
    { connection: { downlink: 1 } }, { battery: { charging: false, level: .2 } }, { userPaused: true }, { unsupported: true }
  ]) {
    const app = harness(options); await app.settle(); await app.advance(710);
    app.expectScene('hero');
    assert.equal(app.requestedClips.length, 0, `no video transfer under ${JSON.stringify(options)}`);
    assert.equal(app.context.document.documentElement.dataset.prismMotion, 'paused');
  }
  const connection = { saveData: false };
  const app = harness({ connection }); await app.settle(); await app.advance(710);
  connection.saveData = true; connection.callback(); await app.settle();
  assert.equal(app.background.children.filter(child => child.tag === 'video').length, 0);
  assert.ok(app.control.disabled);
  connection.saveData = false; connection.callback(); await app.settle();
  assert.equal(app.background.dataset.video, 'playing');
  await app.reduce(true);
  assert.equal(app.background.children.filter(child => child.tag === 'video').length, 0);
  console.log('PASS static fallback and download cancellation for reduction/data/network/battery preferences');
}
{
  const app = harness({ connection: { effectiveType: '3g' } }); await app.settle(); await app.advance(710);
  assert.equal(app.requestedClips.length, 0);
  assert.equal(app.control.disabled, false, 'slow estimates allow an explicit choice');
  app.control.emit('click'); await app.settle();
  assert.equal(app.background.dataset.video, 'playing');
  assert.equal(app.storage.get('nova-background-motion'), 'enabled');
  app.control.emit('click'); await app.settle();
  assert.equal(app.background.dataset.video, 'paused');
  assert.equal(app.context.document.documentElement.dataset.prismMotionReason, 'slow-connection');
  const nextPage = harness({ connection: { effectiveType: '3g' } }); await nextPage.settle(); await nextPage.advance(710);
  assert.equal(nextPage.requestedClips.length, 0, 'a manual network override does not carry to another page');
  console.log('PASS slow-network manual playback is page-local and never automatic');
}
{
  const app = harness({ autoplayReject: true }); await app.settle(); await app.advance(710);
  assert.equal(app.background.dataset.video, 'autoplay-blocked');
  assert.equal(app.background.children.filter(child => child.tag === 'video').length, 0);
  await app.scroll(20); await app.resize(1100, 1000);
  assert.equal(app.playCalls.length, 1, 'blocked autoplay is not retried on scroll/resize');
  app.allowPlayback(); app.control.emit('click'); await app.settle();
  assert.equal(app.background.dataset.video, 'playing');
  app.playCalls.at(-1).node.emit('error'); await app.settle();
  assert.equal(app.background.dataset.video, 'unavailable');
  await app.scroll(40); assert.equal(app.playCalls.length, 2);
  app.control.emit('click'); await app.settle();
  assert.equal(app.background.dataset.video, 'playing');
  console.log('PASS blocked autoplay and media error preserve posters, with explicit retry only');
}
{
  const app = harness(); await app.settle(); await app.advance(710);
  app.control.emit('click'); await app.settle();
  assert.equal(app.storage.get('nova-background-motion'), 'paused');
  assert.equal(app.context.document.documentElement.dataset.prismMotionReason, 'user-paused');
  assert.equal(app.control.attributes['aria-pressed'], 'false');
  assert.equal(app.background.children.filter(child => child.tag === 'video').length, 0);
  app.control.emit('click'); await app.settle();
  assert.equal(app.storage.get('nova-background-motion'), 'enabled');
  assert.equal(app.background.dataset.video, 'playing');
  app.emit('storage', { key: 'nova-background-motion', newValue: 'paused' }); await app.settle();
  assert.equal(app.background.dataset.video, 'paused');
  console.log('PASS accessible pause toggle, persisted preference and cross-tab synchronization');
}
{
  const app = harness(); await app.settle(); await app.advance(710);
  await app.resize(390, 844); await app.advance(710);
  assert.match(app.playCalls.at(-1).node.src, /hero-720\.mp4\?v=20261009-loop10$/);
  assert.match(app.background.children.find(layer => layer.classList.contains('is-active')).src, /hero-640\.jpg$/);
  await app.resize(700, 900); await app.advance(710);
  assert.match(app.playCalls.at(-1).node.src, /hero-720\.mp4\?v=20261009-loop10$/);
  assert.match(app.background.children.find(layer => layer.classList.contains('is-active')).src, /hero-1280\.jpg$/);
  await app.resize(1400, 800); await app.advance(710);
  assert.match(app.playCalls.at(-1).node.src, /hero-1280\.mp4\?v=20261009-loop10$/);
  assert.equal(app.videos.filter(node => !node.paused).length, 1);
  console.log('PASS portrait/landscape size changes keep one appropriately sized active video');
}
{
  const app = harness({ manualPlay: true }); await app.settle(); await app.advance(710);
  const pending = app.playCalls[0];
  await app.advance(15000);
  assert.equal(app.background.dataset.video, 'unavailable');
  assert.equal(app.background.children.filter(child => child.tag === 'video').length, 0);
  pending.resolve(); await app.settle();
  assert.ok(pending.node.paused);
  app.expectScene('hero');
  assert.equal(app.timers.size, 0);
  console.log('PASS an unresponsive clip times out to its poster and late playback stays stopped');
}

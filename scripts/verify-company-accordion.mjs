// Exercise the shipped Company controller with native-details state, browser
// history and manually settled WAAPI promises. Layout is verified in a browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const start = source.indexOf('// Company stories stay in the document flow.');
const end = source.indexOf('const cltViewer', start);
assert.ok(start >= 0 && end > start, 'the real Company controller must be found');
const controller = source.slice(start, end);
const storyIds = ['about', 'mission', 'history', 'foundation', 'location'];

function harness({ hash = '', reduced = false, animationsSupported = true } = {}) {
  const frames = new Map(), toggles = new Set(), animations = [], windowEvents = new Map();
  const calls = [], histories = [{ state: null, url: `http://localhost:8000/company.html${hash}` }];
  let historyIndex = 0, frameId = 0, document, context;
  class Element {
    constructor(kind, id = '') {
      this.kind = kind; this.id = id; this.children = []; this.attributes = new Map();
      this.listeners = new Map(); this.inert = false; this._open = false;
      this.style = { removeProperty(key) { delete this[key]; } };
      const classes = new Set();
      this.classList = { contains: value => classes.has(value), toggle: (value, force) => {
        const enabled = force ?? !classes.has(value);
        enabled ? classes.add(value) : classes.delete(value); return enabled;
      } };
    }
    append(child) { child.parent = this; this.children.push(child); }
    get open() { return this._open; }
    set open(value) { if (this._open === !!value) return; this._open = !!value; toggles.add(this); }
    setAttribute(key, value) { this.attributes.set(key, String(value)); }
    getAttribute(key) { return this.attributes.get(key) ?? null; }
    closest(selector) { return selector === '[data-company-accordion]' ? (this.kind === 'details' ? this : this.parent?.closest(selector)) : null; }
    querySelector(selector) { return this.children.find(child => selector === 'summary' ? child.kind === 'summary' : child.kind === 'content') || null; }
    contains(target) { return this === target || this.children.some(child => child.contains(target)); }
    focus() { document.activeElement = this; calls.push(['focus', this.id]); }
    getBoundingClientRect() {
      const active = animations.findLast(animation => animation.element === this && !animation.cancelled);
      const height = active ? Number.parseFloat(active.keyframes[0].height) + (Number.parseFloat(active.keyframes[1].height) - Number.parseFloat(active.keyframes[0].height)) * .5 : this.naturalHeight || 0;
      return { height, top: (this.pageTop || 0) - context.scrollY };
    }
    addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(callback); }
    emit(type, extra = {}) {
      const event = { type, button: 0, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra };
      this.listeners.get(type)?.forEach(callback => callback(event)); return event;
    }
    animate(keyframes, options) {
      let resolve, reject, settled = false;
      const animation = { element: this, keyframes, options, cancelled: false,
        finished: new Promise((done, fail) => { resolve = done; reject = fail; }),
        finish() { if (settled) return; settled = true; resolve(); },
        cancel() { this.cancelled = true; if (settled) return; settled = true; reject(new Error('cancelled')); },
      };
      animations.push(animation); calls.push(['animate', this.id]); return animation;
    }
  }
  const main = new Element('main'), body = new Element('body'); body.append(main);
  const stories = storyIds.map((id, index) => {
    const details = new Element('details'), trigger = new Element('summary', `company-trigger-${id}`);
    const content = new Element('content', `${id}-content`), panel = new Element('section', id);
    const insideLink = new Element('a', `${id}-inside`);
    content.naturalHeight = 400 + index * 100; trigger.pageTop = 600 + index * 160;
    if (!animationsSupported) content.animate = undefined;
    panel.append(insideLink); content.append(panel); details.append(trigger); details.append(content); main.append(details);
    return { details, trigger, content, panel, insideLink };
  });
  const links = storyIds.map(id => {
    const link = new Element('a', `${id}-navigation`); link.href = `http://localhost:8000/company.html#${id}`; return link;
  });
  const external = new Element('a', 'external'); external.href = 'https://example.com/company.html#about'; links.push(external);
  const blank = new Element('a', 'blank'); blank.href = links[0].href; blank.target = '_blank'; links.push(blank);
  document = { body, documentElement: new Element('html'), activeElement: body, readyState: 'complete', fonts: { ready: Promise.resolve() },
    querySelectorAll: selector => selector === '[data-company-panel]' ? stories.map(story => story.panel) : links,
  };
  const location = {};
  const setLocation = url => { const parsed = new URL(url, location.href || histories[0].url); Object.assign(location, { href: parsed.href, origin: parsed.origin, pathname: parsed.pathname, search: parsed.search, hash: parsed.hash }); };
  setLocation(histories[0].url);
  const mediaListeners = [];
  const media = { matches: reduced, addEventListener: (type, callback) => mediaListeners.push(callback) };
  const emit = type => windowEvents.get(type)?.forEach(callback => callback({ type }));
  const history = { get state() { return histories[historyIndex].state; },
    pushState(state, unused, url) { histories.splice(historyIndex + 1); histories.push({ state, url: new URL(url, location.href).href }); historyIndex++; setLocation(histories[historyIndex].url); },
    go(delta) { historyIndex += delta; assert.ok(historyIndex >= 0 && historyIndex < histories.length); setLocation(histories[historyIndex].url); emit('popstate'); emit('hashchange'); },
  };
  const map = { invalidateSize() { calls.push(['map-size']); }, stop() { calls.push(['map-stop']); } };
  context = { document, history, location, motionPreference: media, URL, Promise,
    locationMapWrap: { _novaLeafletMap: map }, focusLocationMap() { calls.push(['map-focus']); },
    closeMobileMenu(restoreFocus) { calls.push(['nav-close', restoreFocus]); main.inert = false; },
    getComputedStyle() { return { getPropertyValue: () => '86.8px' }; },
    requestAnimationFrame(callback) { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); }, scrollY: 0,
    addEventListener(type, callback) { if (!windowEvents.has(type)) windowEvents.set(type, []); windowEvents.get(type).push(callback); },
    scrollTo(options) { calls.push(['scroll', options]); context.scrollY = options.top; },
    NovaScroll: { refresh() { calls.push(['refresh']); } }, PrismNavigation: { refresh() { calls.push(['nav-refresh']); } },
  };
  context.window = context;
  vm.runInNewContext(controller, context, { filename: 'script.js (Company controller)' });
  const settle = async () => {
    for (let pass = 0; pass < 10; pass++) {
      await Promise.resolve();
      const pendingToggles = [...toggles]; toggles.clear(); pendingToggles.forEach(element => element.emit('toggle'));
      const pendingFrames = [...frames.values()]; frames.clear(); pendingFrames.forEach(callback => callback());
    }
  };
  const latest = story => animations.findLast(animation => animation.element === story.content && !animation.cancelled);
  return { stories, links, main, document, media, history, histories, calls, animations, location, context, emit, settle, latest,
    async finish(story) { latest(story)?.finish(); await settle(); },
    async reduce(value) { media.matches = value; mediaListeners.forEach(callback => callback({ matches: value })); await settle(); },
  };
}

function expectExpanded(story, expanded) {
  assert.equal(story.details.open, expanded);
  assert.equal(story.content.inert, !expanded);
  assert.equal(story.content.getAttribute('aria-hidden'), String(!expanded));
  assert.equal(story.trigger.getAttribute('aria-expanded'), String(expanded));
}

{
  const app = harness(); await app.settle(); const [about, mission] = app.stories;
  app.stories.forEach(story => expectExpanded(story, false));
  assert.equal(about.panel.getAttribute('role'), 'region');
  assert.equal(about.panel.getAttribute('aria-labelledby'), about.trigger.id);
  assert.equal(about.trigger.getAttribute('aria-controls'), 'about');
  assert.equal(about.trigger.emit('click').defaultPrevented, true);
  assert.equal(app.latest(about).options.duration, 320);
  assert.equal(app.latest(about).options.easing, 'ease-in-out');
  await app.finish(about); mission.trigger.emit('click'); await app.finish(mission);
  expectExpanded(about, true); expectExpanded(mission, true);
  about.insideLink.focus(); about.trigger.emit('click');
  assert.equal(app.document.activeElement, about.trigger, 'closing content returns focus to its own summary');
  assert.equal(about.details.open, true, 'native open stays set during the closing animation');
  await app.finish(about); expectExpanded(about, false); expectExpanded(mission, true);
  assert.equal(app.main.inert, false, 'inline content never locks the rest of the page');
  console.log('PASS independent stories, accessible regions, 320ms motion and inline focus behavior');
}
{
  const app = harness(); await app.settle(); const [story] = app.stories;
  story.trigger.emit('click'); const first = app.latest(story);
  story.trigger.emit('click'); const closing = app.latest(story);
  story.trigger.emit('click'); const reopened = app.latest(story);
  assert.ok(first.cancelled && closing.cancelled);
  first.finish(); closing.finish(); await app.settle();
  assert.equal(app.latest(story), reopened, 'stale completions cannot replace the newest animation');
  await app.finish(story); expectExpanded(story, true);
  story.trigger.emit('click'); await app.finish(story); expectExpanded(story, false);
  console.log('PASS rapid open/close/reopen cancels stale animation completions');
}
{
  const app = harness({ reduced: true }); await app.settle(); const [about, mission] = app.stories;
  about.trigger.emit('click'); mission.trigger.emit('click'); about.trigger.emit('click'); await app.settle();
  expectExpanded(about, false); expectExpanded(mission, true);
  app.history.go(-1); await app.settle(); expectExpanded(about, true); expectExpanded(mission, true);
  app.history.go(-1); await app.settle(); expectExpanded(about, true); expectExpanded(mission, false);
  app.history.go(-1); await app.settle(); app.stories.forEach(story => expectExpanded(story, false));
  app.history.go(2); await app.settle(); expectExpanded(about, true); expectExpanded(mission, true);
  assert.equal(app.location.hash, '#mission');
  console.log('PASS Back/Forward restores the complete independent open set');
}
{
  const app = harness({ hash: '#location', reduced: true }); await app.settle();
  expectExpanded(app.stories[4], true);
  assert.equal(app.animations.length, 0);
  assert.ok(app.calls.some(call => call[0] === 'scroll' && call[1].behavior === 'instant'));
  assert.equal(app.calls.filter(call => call[0] === 'map-focus').length, 1);
  app.stories[4].trigger.emit('click'); await app.settle(); expectExpanded(app.stories[4], false);
  assert.ok(app.calls.some(call => call[0] === 'map-stop'));
  app.stories[4].trigger.emit('click'); await app.settle();
  assert.equal(app.calls.filter(call => call[0] === 'map-focus').length, 1, 'reopening a map preserves its chosen view');
  console.log('PASS direct hash, immediate reduced motion and stable map reopening');
}
{
  const app = harness(); await app.settle(); const [story] = app.stories;
  story.trigger.emit('click'); const stale = app.latest(story); await app.reduce(true);
  expectExpanded(story, true); assert.equal(stale.cancelled, true);
  story.trigger.emit('click'); await app.settle(); expectExpanded(story, false);
  assert.equal(app.animations.length, 1);
  const fallback = harness({ animationsSupported: false }); await fallback.settle();
  fallback.stories[0].trigger.emit('click'); await fallback.settle(); expectExpanded(fallback.stories[0], true);
  console.log('PASS dynamic reduced motion finishes current motion; missing WAAPI stays functional');
}
{
  const app = harness(); await app.settle(); const [story] = app.stories;
  app.main.inert = true; app.calls.length = 0;
  assert.equal(app.links[0].emit('click').defaultPrevented, true);
  assert.equal(app.calls[0][0], 'nav-close');
  assert.equal(app.calls[1][0], 'focus');
  assert.equal(app.main.inert, false);
  assert.equal(app.calls.some(call => call[0] === 'scroll'), false, 'alignment waits for the content expansion');
  await app.finish(story);
  assert.equal(app.calls.findLast(call => call[0] === 'scroll')[1].top, story.trigger.pageTop - 86.8 - 12);
  assert.equal(app.document.activeElement, story.trigger);
  assert.equal(app.links[5].emit('click').defaultPrevented, false, 'external URLs keep normal navigation');
  assert.equal(app.links[6].emit('click').defaultPrevented, false, 'new-tab URLs keep normal navigation');
  assert.equal(app.links[1].emit('click', { ctrlKey: true }).defaultPrevented, false);
  assert.equal(app.links[1].emit('click', { button: 1 }).defaultPrevented, false);
  console.log('PASS same-page navigation unlocks then opens, focuses and aligns; modified/external clicks remain native');
}
{
  const app = harness(); await app.settle(); const [about, mission] = app.stories;
  app.links[0].emit('click'); app.links[1].emit('click');
  await app.finish(about);
  assert.equal(app.calls.some(call => call[0] === 'scroll'), false, 'a superseded link cannot scroll after a later selection');
  await app.finish(mission);
  assert.equal(app.calls.findLast(call => call[0] === 'scroll')[1].top, mission.trigger.pageTop - 86.8 - 12);
  about.details.open = false; await app.settle(); expectExpanded(about, false);
  about.details.open = true; await app.settle(); expectExpanded(about, true);
  about.trigger.emit('keydown', { key: 'End' }); assert.equal(app.document.activeElement, app.stories[4].trigger);
  app.stories[4].trigger.emit('keydown', { key: 'ArrowDown' }); assert.equal(app.document.activeElement, about.trigger);
  mission.trigger.emit('click'); app.emit('resize'); await app.settle(); expectExpanded(mission, false);
  console.log('PASS superseded navigation, native toggle synchronization, arrow navigation and resize during motion');
}

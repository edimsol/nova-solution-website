/* Decorative scenes: two decoded posters, at most one active video decoder.
   Native scrolling is never intercepted and no animation frame loop is kept. */
(() => {
  'use strict';
  if (!document.body.classList.contains('prism-site')) return;
  const assets = {
  "hero": {
    "small": "./assets/backgrounds/prism/hero-640.jpg",
    "medium": "./assets/backgrounds/prism/hero-1280.jpg",
    "large": "./assets/backgrounds/prism/hero-1672.jpg",
    "portrait": "./assets/backgrounds/prism/hero-portrait-640.jpg"
  },
  "solutions": {
    "small": "./assets/backgrounds/prism/solutions-640.jpg",
    "medium": "./assets/backgrounds/prism/solutions-1280.jpg",
    "large": "./assets/backgrounds/prism/solutions-1672.jpg",
    "portrait": "./assets/backgrounds/prism/solutions-portrait-640.jpg"
  },
  "company": {
    "small": "./assets/backgrounds/prism/company-640.jpg",
    "medium": "./assets/backgrounds/prism/company-1280.jpg",
    "large": "./assets/backgrounds/prism/company-1672.jpg",
    "portrait": "./assets/backgrounds/prism/company-portrait-640.jpg"
  },
  "technology": {
    "small": "./assets/backgrounds/prism/technology-640.jpg",
    "medium": "./assets/backgrounds/prism/technology-1280.jpg",
    "large": "./assets/backgrounds/prism/technology-1672.jpg",
    "portrait": "./assets/backgrounds/prism/technology-portrait-640.jpg"
  },
  "industries": {
    "small": "./assets/backgrounds/prism/industries-640.jpg",
    "medium": "./assets/backgrounds/prism/industries-1280.jpg",
    "large": "./assets/backgrounds/prism/industries-1672.jpg",
    "portrait": "./assets/backgrounds/prism/industries-portrait-640.jpg"
  },
  "contact": {
    "small": "./assets/backgrounds/prism/contact-640.jpg",
    "medium": "./assets/backgrounds/prism/contact-1280.jpg",
    "large": "./assets/backgrounds/prism/contact-1672.jpg",
    "portrait": "./assets/backgrounds/prism/contact-portrait-640.jpg"
  }
};
  // Literal paths are intentional: the static build collects referenced assets.
  const clips = {
    hero: { small: './assets/backgrounds/prism/video/hero-720.mp4?v=20261009-loop10', large: './assets/backgrounds/prism/video/hero-1280.mp4?v=20261009-loop10' },
    solutions: { small: './assets/backgrounds/prism/video/solutions-720.mp4?v=20261009-loop10', large: './assets/backgrounds/prism/video/solutions-1280.mp4?v=20261009-loop10' },
    company: { small: './assets/backgrounds/prism/video/company-720.mp4?v=20261009-loop10', large: './assets/backgrounds/prism/video/company-1280.mp4?v=20261009-loop10' },
    technology: { small: './assets/backgrounds/prism/video/technology-720.mp4?v=20261009-loop10', large: './assets/backgrounds/prism/video/technology-1280.mp4?v=20261009-loop10' },
    industries: { small: './assets/backgrounds/prism/video/industries-720.mp4?v=20261009-loop10', large: './assets/backgrounds/prism/video/industries-1280.mp4?v=20261009-loop10' },
    contact: { small: './assets/backgrounds/prism/video/contact-720.mp4?v=20261009-loop10', large: './assets/backgrounds/prism/video/contact-1280.mp4?v=20261009-loop10' }
  };
  const page = location.pathname.split('/').pop() || 'index.html';
  const pageScene = {'company.html':'company','solutions.html':'solutions','hvac.html':'solutions','ventilation.html':'solutions','air-system.html':'solutions','parts-control.html':'industries','edim.html':'technology','technology.html':'technology','resources.html':'industries','contact.html':'contact'};
  const home = document.querySelector('.prism-home');
  const sceneKeys = ['hero','solutions','company','technology','industries','contact'];
  const sections = home ? [...home.children].filter(node => node.matches('section')).map((element,index) => ({element,key:sceneKeys[index]})).filter(entry=>entry.key) : [];
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const background = document.createElement('div');
  background.className = 'prism-background';
  background.setAttribute('aria-hidden','true');
  const layers = [0,1].map(() => { const img = document.createElement('img'); img.alt=''; img.decoding='async'; background.append(img); return img; });
  document.body.prepend(background);
  const control = document.createElement('button');
  control.type = 'button';
  control.className = 'prism-motion-control';
  control.setAttribute('aria-label', '배경 움직임');
  const icon = document.createElement('span');
  icon.className = 'prism-motion-icon';
  icon.setAttribute('aria-hidden', 'true');
  const controlText = document.createElement('span');
  control.append(icon, controlText);
  (document.querySelector('main') || document.body).append(control);
  const cache = new Map();
  let desired = null, active = 0, displayed = '', frame = 0, transitionTimer = 0, busy = false;
  let media = null, battery = null, suspended = false, menuObscured = false, policyStamp = '', controlStamp = '';
  let autoplayBlocked = false;
  let userRequestedPlayback = false; // A slow-network override lasts only for this page.
  const failedClips = new Set();
  const preferenceKey = 'nova-background-motion';
  let userPaused = false;
  try { userPaused = localStorage.getItem(preferenceKey) === 'paused'; } catch { /* Storage can be disabled. */ }
  const videoSupported = !!document.createElement('video').canPlayType?.('video/mp4');

  function videoSource() { return desired ? clips[desired.key][innerWidth <= 960 ? 'small' : 'large'] : ''; }
  function constraint() {
    if (reduced.matches) return 'reduced-motion';
    if (connection?.saveData) return 'save-data';
    if (battery && !battery.charging && battery.level <= .2) return 'battery-saving';
    if (!videoSupported) return 'unsupported';
    if (!userRequestedPlayback && (/^(slow-2g|2g|3g)$/.test(connection?.effectiveType || '') || (connection?.downlink > 0 && connection.downlink < 1.5))) return 'slow-connection';
    return '';
  }
  function policy() {
    const reason = constraint() || (userPaused ? 'user-paused' : '') || (document.hidden || suspended ? 'hidden' : '') || (menuObscured ? 'navigation' : '');
    return { enabled: !reason, reason, userPaused };
  }
  function publishPolicy() {
    const current = policy();
    const stamp = `${current.enabled}:${current.reason}:${userPaused}`;
    document.documentElement.dataset.prismMotion = current.enabled ? 'enabled' : 'paused';
    document.documentElement.dataset.prismMotionReason = current.reason;
    if (stamp !== policyStamp) {
      policyStamp = stamp;
      // The header's intermittent SVG timeline shares this conservation policy.
      document.dispatchEvent(new CustomEvent('prism:motion-policy', { detail: current }));
    }
    const retry = autoplayBlocked || failedClips.has(videoSource());
    const reasonLabels = { 'reduced-motion': '동작 줄이기 설정', 'save-data': '데이터 절약 설정', 'slow-connection': '느린 네트워크', 'battery-saving': '배터리 절약', unsupported: '동영상 미지원' };
    const forced = constraint();
    const nextControlStamp = `${forced}:${userPaused}:${retry}:${menuObscured}`;
    if (controlStamp !== nextControlStamp) {
      controlStamp = nextControlStamp;
      const slow = forced === 'slow-connection';
      control.disabled = !!forced && !slow;
      control.hidden = menuObscured;
      control.classList.toggle('is-paused', !!forced || userPaused || retry);
      control.setAttribute('aria-pressed', String(!forced && !userPaused && !retry));
      controlText.textContent = forced && !slow ? '정지 배경' : slow || userPaused || retry ? '배경 재생' : '배경 정지';
      control.title = slow ? '느린 네트워크로 정지 이미지를 사용 중입니다. 선택하면 이 페이지에서 배경을 재생합니다.' : forced ? `정지 이미지 사용: ${reasonLabels[forced]}` : userPaused || retry ? '배경 움직임 재생' : '배경 움직임 일시 정지';
    }
    return current;
  }
  function disposeVideo() {
    if (!media) return;
    const previous = media;
    media = null; // Ignore late play promises and events before unloading the node.
    clearTimeout(previous.timeout);
    previous.node.pause();
    previous.node.removeAttribute('src');
    previous.node.load();
    previous.node.remove();
    delete background.dataset.videoSource;
  }
  function canPlay(state) {
    return media === state && policy().enabled && !busy && desired?.url === displayed && state.url === videoSource() && background.dataset.state === 'ready';
  }
  function failVideo(state, reason) {
    if (media !== state) return;
    if (reason === 'autoplay-blocked') autoplayBlocked = true;
    else failedClips.add(state.url);
    disposeVideo();
    background.dataset.video = reason;
    publishPolicy();
  }
  function playVideo(state) {
    if (!canPlay(state) || state.requested) return;
    state.requested = true;
    const attempt = ++state.attempt;
    background.dataset.video = 'loading';
    clearTimeout(state.timeout);
    state.timeout = setTimeout(() => { if (canPlay(state) && state.attempt === attempt) failVideo(state, 'unavailable'); }, 15000);
    let result;
    try { result = state.node.play(); }
    catch { failVideo(state, 'unavailable'); return; }
    Promise.resolve(result).then(() => {
      if (media !== state || state.attempt !== attempt) return;
      if (!canPlay(state)) { state.node.pause(); return; }
      if (state.node.readyState >= 2) {
        clearTimeout(state.timeout);
        state.node.classList.add('is-playing');
        background.dataset.video = 'playing';
      }
    }).catch(error => {
      if (media !== state || state.attempt !== attempt || !canPlay(state)) return;
      failVideo(state, error?.name === 'NotAllowedError' ? 'autoplay-blocked' : 'unavailable');
    });
  }
  function reconcileVideo() {
    const current = publishPolicy();
    const url = videoSource();
    if (!current.enabled) {
      if (media) {
        media.requested = false;
        media.attempt++;
        clearTimeout(media.timeout);
        media.node.pause();
        media.node.classList.remove('is-playing');
      }
      // Keep a paused source only for short visibility/menu interruptions.
      // A user/system saving preference also stops outstanding downloads.
      if (!['hidden', 'navigation'].includes(current.reason)) disposeVideo();
      background.dataset.video = 'paused';
      return;
    }
    if (!desired || busy || desired.url !== displayed || background.dataset.state !== 'ready') return;
    if (autoplayBlocked || failedClips.has(url)) return;
    if (media && media.url !== url) disposeVideo();
    if (!media) {
      const node = document.createElement('video');
      node.className = 'prism-background-video';
      node.muted = true;
      node.defaultMuted = true;
      node.loop = true;
      node.playsInline = true;
      node.preload = 'none';
      node.controls = false;
      node.disablePictureInPicture = true;
      node.disableRemotePlayback = true;
      node.tabIndex = -1;
      node.setAttribute('aria-hidden', 'true');
      node.setAttribute('muted', '');
      node.setAttribute('playsinline', '');
      node.setAttribute('webkit-playsinline', '');
      const state = { node, url, requested: false, attempt: 0, timeout: 0 };
      media = state;
      node.addEventListener('playing', () => {
        if (!canPlay(state) || !state.requested) { node.pause(); return; }
        clearTimeout(state.timeout);
        node.classList.add('is-playing');
        background.dataset.video = 'playing';
      });
      node.addEventListener('waiting', () => {
        if (!canPlay(state) || !state.requested) return;
        node.classList.remove('is-playing');
        background.dataset.video = 'loading';
        clearTimeout(state.timeout);
        if (canPlay(state)) state.timeout = setTimeout(() => { if (canPlay(state)) failVideo(state, 'unavailable'); }, 15000);
      });
      node.addEventListener('pause', () => {
        // A browser/power policy can pause an already accepted autoplay request.
        // Never fight that policy with a retry loop; expose explicit replay.
        if (canPlay(state) && state.requested && node.paused && !node.ended) failVideo(state, 'autoplay-blocked');
      });
      node.addEventListener('error', () => { if (media === state) failVideo(state, 'unavailable'); });
      node.src = url;
      background.append(node);
      background.dataset.videoSource = url;
    }
    playVideo(media);
  }
  function sourceFor(key) {
    const set = assets[key];
    // Posters and clips use the same full-frame crop at every viewport size.
    // A pre-cropped portrait poster would visibly zoom/shift as video starts.
    const width = innerWidth * Math.min(devicePixelRatio || 1, 1.5);
    return width <= 640 ? set.small : width <= 1280 ? set.medium : set.large;
  }
  function preload(url, priority='low') {
    if (!cache.has(url)) {
      const task = new Promise(resolve => {
        const img = new Image(); img.decoding='async'; img.fetchPriority=priority;
        img.onload=async()=>{ try { await img.decode(); resolve(true); } catch { resolve(false); } };
        img.onerror=()=>resolve(false); img.src=url;
      });
      cache.set(url,task);
    }
    return cache.get(url);
  }
  function finish() {
    clearTimeout(transitionTimer); busy=false;
    if (desired && desired.url !== displayed) renderDesired();
    else reconcileVideo();
  }
  async function renderDesired() {
    const request=desired;
    if (!request || busy || request.url===displayed) return;
    const loaded=await preload(request.url, displayed ? 'low' : 'high');
    if (desired!==request || busy) return;
    if (!loaded) {
      layers.forEach(layer=>layer.classList.remove('is-active'));
      displayed=''; background.dataset.state='fallback'; background.dataset.scene=request.key;
      disposeVideo();
      background.dataset.video='poster-unavailable';
      return;
    }
    const next=1-active;
    layers[next].src=request.url;
    // The source is decoded before this frame; keep the old layer through the fade.
    layers[next].classList.add('is-active');
    layers[active].classList.remove('is-active');
    active=next; displayed=request.url;
    background.dataset.scene=request.key;
    background.dataset.state='ready';
    busy=!reduced.matches;
    if (busy) transitionTimer=setTimeout(finish,710);
    else reconcileVideo();
  }
  function update() {
    frame=0;
    let index=0;
    for (let i=0;i<sections.length;i++) if (sections[i].element.getBoundingClientRect().top <= innerHeight*.45) index=i;
    if (sections.length && scrollY+innerHeight >= document.documentElement.scrollHeight-3) index=sections.length-1;
    const key=sections.length ? sections[index].key : pageScene[page] || 'hero';
    const url=sourceFor(key);
    if (!desired || desired.url!==url) {
      disposeVideo();
      background.dataset.video='poster-loading';
      desired={key,url}; background.dataset.requestedScene=key; renderDesired();
    } else reconcileVideo();
    const next=sections[index+1];
    if (next && next.element.getBoundingClientRect().top < innerHeight*1.6) preload(sourceFor(next.key));
  }
  function schedule() { if (!frame) frame=requestAnimationFrame(update); }
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  addEventListener('hashchange',schedule);
  addEventListener('pageshow',()=>{ suspended=false; reconcileVideo(); schedule(); });
  addEventListener('pagehide',()=>{ suspended=true; reconcileVideo(); });
  document.addEventListener('visibilitychange',reconcileVideo);
  document.addEventListener('prism:navigation-layout',event=>{
    menuObscured=!!(event.detail?.open || event.detail?.panel);
    reconcileVideo();
  });
  function preferenceChanged() { reconcileVideo(); if(reduced.matches) finish(); schedule(); }
  if (reduced.addEventListener) reduced.addEventListener('change',preferenceChanged);
  else reduced.addListener?.(preferenceChanged);
  connection?.addEventListener?.('change',reconcileVideo);
  addEventListener('storage',event=>{
    if (event.key!==preferenceKey) return;
    userPaused=event.newValue==='paused';
    if (userPaused) userRequestedPlayback=false;
    reconcileVideo();
  });
  control.addEventListener('click',()=>{
    const reason=constraint();
    if (reason && reason!=='slow-connection') return;
    userPaused=reason==='slow-connection' ? false : !userPaused && !autoplayBlocked && !failedClips.has(videoSource());
    userRequestedPlayback=!userPaused;
    if (!userPaused) { autoplayBlocked=false; failedClips.delete(videoSource()); }
    try { localStorage.setItem(preferenceKey,userPaused ? 'paused' : 'enabled'); } catch { /* Remains effective for this page. */ }
    reconcileVideo();
  });
  if (navigator.getBattery) {
    Promise.resolve().then(()=>navigator.getBattery()).then(value=>{
      battery=value;
      battery.addEventListener('levelchange',reconcileVideo);
      battery.addEventListener('chargingchange',reconcileVideo);
      reconcileVideo();
    }).catch(()=>{});
  }
  if (window.ResizeObserver) { const observer=new ResizeObserver(schedule); observer.observe(document.querySelector('main')); }
  document.fonts?.ready.then(schedule);
  publishPolicy();
  update();
})();

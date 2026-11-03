// Progressive Web App glue: service worker registration and the install button.
(() => {
  'use strict';
  // ---- Update job: checks for a new release in the background and applies it when no race is running.
  const UPDATE_EVERY = 5 * 60 * 1000;
  const busy = () => typeof window.morbidBusy === 'function' && window.morbidBusy();
  let pendingWorker = null, reloading = false;
  function updateBanner(show, text) {
    let el = document.getElementById('update-banner');
    if (!el && show) {
      el = document.createElement('button'); el.id = 'update-banner'; el.className = 'update-banner'; el.type = 'button';
      el.addEventListener('click', applyUpdate); document.body.append(el);
    }
    if (el) { el.textContent = text || ''; el.classList.toggle('visible', !!show); }
  }
  function applyUpdate() {
    if (!pendingWorker) return;
    updateBanner(true, '⟳ UPDATING…'); pendingWorker.postMessage('SKIP_WAITING');
  }
  function offerUpdate(worker) {
    pendingWorker = worker;
    fetch('version.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null).then(info => {
      const label = info && info.version ? `V${info.version}` : 'NEW VERSION';
      if (!busy()) { updateBanner(true, `⟳ INSTALLING ${label}…`); setTimeout(applyUpdate, 900); }
      else updateBanner(true, `⟳ ${label} READY — INSTALLS AFTER THIS RACE (TAP TO INSTALL NOW)`);
    });
  }
  // Apply a waiting update as soon as the player is back in the garage or on the results screen.
  setInterval(() => { if (pendingWorker && !busy() && !reloading) applyUpdate(); }, 2000);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', async () => {
      let registration;
      try { registration = await navigator.serviceWorker.register('sw.js'); } catch { return; /* Offline support is optional. */ }
      if (!registration) return;
      const hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloading) { reloading = true; location.reload(); } });
      const watch = worker => worker && worker.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker); });
      if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);
      registration.addEventListener('updatefound', () => watch(registration.installing));
      const check = () => { if (navigator.onLine !== false) registration.update().catch(() => {}); };
      setInterval(check, UPDATE_EVERY);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      window.addEventListener('online', check);
    });
  }
  const button = document.getElementById('install');
  if (!button) return;
  const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let deferred = null;
  function toast(text) {
    let el = document.getElementById('pwa-toast');
    if (!el) { el = document.createElement('div'); el.id = 'pwa-toast'; el.className = 'pwa-toast'; el.setAttribute('role', 'status'); document.body.append(el); }
    el.textContent = text; el.classList.add('visible');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('visible'), 5000);
  }
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferred = event; button.classList.remove('hidden'); });
  window.addEventListener('appinstalled', () => { deferred = null; button.classList.add('hidden'); toast('INSTALLED — LAUNCH MORBID RACERS FROM YOUR HOME SCREEN'); });
  if (ios && !standalone) button.classList.remove('hidden');
  button.addEventListener('click', async () => {
    if (deferred) { deferred.prompt(); await deferred.userChoice.catch(() => null); deferred = null; button.classList.add('hidden'); }
    else if (ios) toast('TAP SHARE ⎋ THEN “ADD TO HOME SCREEN”');
  });
})();

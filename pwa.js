// Progressive Web App glue: service worker registration and the install button.
(() => {
  'use strict';
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* Offline support is optional. */ }));
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

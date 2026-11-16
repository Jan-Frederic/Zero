  // ==== Start-up.
  // Lets the update job wait until no race is in progress.
  window.morbidBusy = () => ['countdown', 'racing', 'respawning', 'paused', 'wrecked', 'invasion', 'final'].includes(mode) || (mode === 'disco' && !(finale && finale.resultsShown));
  window.addEventListener('resize', resize);
  // iOS reports the new size a moment after rotating (and when the toolbar collapses): measure again.
  window.addEventListener('orientationchange', () => { setTimeout(resize, 120); setTimeout(resize, 500); });
  if (window.visualViewport) visualViewport.addEventListener('resize', () => { if (Math.abs(innerHeight - H) > 1 || Math.abs(innerWidth - W) > 1) resize(); });
  // Music and voices download after the page has loaded, so they do not compete with the first paint.
  function startDownloads() { preloadSoundtrack(); prefetchVoices(); }
  if (document.readyState === 'loading' || document.readyState === 'interactive') window.addEventListener('load', startDownloads, { once: true }); else startDownloads();
  // Safari clears a website's saved data after 7 days without a visit unless the site is on the home screen or the
  // storage is marked persistent: ask for that, so credits and progress survive. (Only on Apple: Firefox would show a prompt.)
  try { if (appleWebKit && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch { /* not supported */ }
  applyPerf(); applyLanguage(); resize(); buildTrack(); requestAnimationFrame(frame);
})();

  // ==== Start-up.
  // Lets the update job wait until no race is in progress.
  window.morbidBusy = () => ['countdown', 'racing', 'respawning', 'paused', 'wrecked', 'invasion', 'final'].includes(mode) || (mode === 'disco' && !(finale && finale.resultsShown));
  window.addEventListener('resize', resize);
  // Music and voices download after the page has loaded, so they do not compete with the first paint.
  function startDownloads() { preloadSoundtrack(); prefetchVoices(); }
  if (document.readyState === 'loading' || document.readyState === 'interactive') window.addEventListener('load', startDownloads, { once: true }); else startDownloads();
  applyPerf(); applyLanguage(); resize(); buildTrack(); requestAnimationFrame(frame);
})();

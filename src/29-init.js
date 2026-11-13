  // ==== Start-up.
  // Lets the update job wait until no race is in progress.
  window.morbidBusy = () => ['countdown', 'racing', 'respawning', 'paused', 'wrecked', 'invasion', 'final'].includes(mode) || (mode === 'disco' && !(finale && finale.resultsShown));
  window.addEventListener('resize', resize);
  preloadSoundtrack(); prefetchVoices();
  applyPerf(); applyLanguage(); resize(); buildTrack(); requestAnimationFrame(frame);
})();

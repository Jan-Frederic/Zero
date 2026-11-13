  // ==== Circuit unlocks, game modes, lifetime race stats.
  // ---- Campaign: circuit n+1 unlocks with a podium (top 3) on circuit n.
  const trackLocked = i => i >= (profile.unlocked || 1);
  function renderLock() {
    const locked = trackLocked(trackIndex), el = $('track-lock');
    document.body.classList.toggle('track-locked', locked);
    if (el) el.textContent = locked ? `🔒 LOCKED — FINISH TOP 3 ON ${tracks[trackIndex - 1].name} TO UNLOCK` : `CIRCUITS UNLOCKED: ${Math.min(profile.unlocked || 1, tracks.length)}/${tracks.length}`;
    const start = $('start'); if (start.firstElementChild) start.firstElementChild.textContent = locked ? 'LOCKED CIRCUIT' : 'ENTER THE RACE';
  }
  function showLockedHint() { const el = $('track-lock'); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); } }
  // ---- Game modes: RACE (grand prix), TIME TRIAL (alone against the clock) and ENDLESS (boss after boss).
  let trialRun = false;
  // ---- Lifetime statistics.
  function recordRaceStats(finished) {
    const st = profile.stats;
    st.races = (st.races || 0) + 1; st.km = (st.km || 0) + distance / LENGTH * 7.2;
    st.perTrack = st.perTrack || {}; st.perTrack[trackIndex] = (st.perTrack[trackIndex] || 0) + 1;
    if (finished && !trialRun) { if (rank === 1) st.wins = (st.wins || 0) + 1; if (rank <= 3) st.podiums = (st.podiums || 0) + 1; }
    saveProfile();
  }
  const GAME_MODES = { race: 'GRAND PRIX', trial: 'TIME TRIAL', endless: 'ENDLESS BOSSES' };
  const gameMode = () => GAME_MODES[settings.gameMode] ? settings.gameMode : 'race';
  function renderGameMode() {
    document.body.classList.toggle('mode-trial', gameMode() === 'trial'); document.body.classList.toggle('mode-endless', gameMode() === 'endless');
    const best = profile.stats.trial && profile.stats.trial[trackIndex];
    if ($('mode-info')) $('mode-info').textContent = gameMode() === 'trial' ? `NO RIVALS, NO UFOS · BEST ${best ? formatTime(best) : '— —:—'}` : gameMode() === 'endless' ? `BOSS AFTER BOSS UNTIL YOU FALL · RECORD ${profile.stats.endlessBest || 0} WAVES` : `${PILOT_COUNT} PILOTS · ${LAP_COUNT} LAPS · WIN TO FACE THE INVASION`;
    renderLock();
  }

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
  const GAME_MODES = { race: 'GRAND PRIX', cup: 'CHAMPIONSHIP', trial: 'TIME TRIAL', survival: 'SURVIVAL', endless: 'ENDLESS BOSSES' };
  const gameMode = () => GAME_MODES[settings.gameMode] ? settings.gameMode : 'race';
  function renderGameMode() {
    document.body.classList.toggle('mode-cup', gameMode() === 'cup'); document.body.classList.toggle('mode-trial', gameMode() === 'trial'); document.body.classList.toggle('mode-endless', gameMode() === 'endless');
    const best = profile.stats.trial && profile.stats.trial[trackIndex];
    if ($('mode-info')) $('mode-info').textContent = gameMode() === 'trial' ? `NO RIVALS, NO UFOS · BEST ${best ? formatTime(best) : '— —:—'}` : gameMode() === 'endless' ? `BOSS AFTER BOSS UNTIL YOU FALL · RECORD ${profile.stats.endlessBest || 0} WAVES` : gameMode() === 'survival' ? `ENDLESS TRACK, FASTER EVERY 30 S · RECORD ${(profile.stats.survivalBest || 0).toFixed(1)} KM` : gameMode() === 'cup' ? `4 RACES · F1 POINTS · ${cupTracks().map(i => tracks[i].name).join(' → ')}` : `${PILOT_COUNT} PILOTS · ${LAP_COUNT} LAPS · WIN TO FACE THE INVASION`;
    renderLock();
  }
  // ---- Championship: four circuits in a row, F1 points for every pilot, standings after each race, a ceremony at the end.
  const CUP_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], CUP_RACES = 4;
  const CALLSIGNS = ['ACE', 'NOVA', 'RIOT', 'ZED', 'KAI', 'LUX', 'ONYX', 'JINX', 'ROOK', 'VOLT', 'HEX', 'ZORA', 'DASH', 'PIKE', 'ECHO', 'MAKO', 'RUNE', 'SKYE', 'FURY', 'IVO', 'NEXA', 'BOLT', 'KIRA', 'TANK', 'WREN', 'ORYX'];
  let cup = null;
  function cupTracks() {
    const pool = tracks.map((_, i) => i).filter(i => !trackLocked(i)), start = Math.max(0, pool.indexOf(trackIndex));
    return Array.from({ length: CUP_RACES }, (_, k) => pool[(start + k) % pool.length]);
  }
  const rivalName = (r, i) => r.nemesis ? r.nemesis.name : CALLSIGNS[i % CALLSIGNS.length];
  // Called by startRace: begins a new cup or moves on to the next round's circuit.
  function prepareCupRace() {
    if (!cup || cup.done) cup = { round: 0, tracks: cupTracks(), player: 0, rivals: [], names: [] };
    const next = cup.tracks[cup.round];
    if (next !== trackIndex) { trackIndex = next; buildTrack(); selectTrack(0); }
  }
  function scoreCupRace() {
    // Finishing order: the player at their rank, rivals still running by distance, knocked-out rivals at the back.
    /** @type {any[]} */
    const order = rivals.map((r, i) => ({ i, r })).sort((a, b) => (b.r.alive - a.r.alive) || (b.r.distance - a.r.distance));
    order.splice(rank - 1, 0, { player: true });
    order.forEach((e, pos) => {
      const pts = CUP_POINTS[pos] || 0;
      if (e.player) cup.player += pts; else { cup.rivals[e.i] = (cup.rivals[e.i] || 0) + pts; cup.names[e.i] = rivalName(e.r, e.i); }
    });
    cup.round++; cup.done = cup.round >= CUP_RACES;
    const table = [{ name: 'YOU', pts: cup.player, you: true }, ...cup.rivals.map((pts, i) => ({ name: cup.names[i], pts: pts || 0 })).filter(e => e.name)]
      .sort((a, b) => b.pts - a.pts || (b.you ? 1 : 0) - (a.you ? 1 : 0));
    const place = table.findIndex(e => e.you) + 1;
    return { table, place };
  }
  function showCupResults() {
    const { table, place } = scoreCupRace();
    $('result-eyebrow').textContent = `CHAMPIONSHIP · RACE ${cup.round}/${CUP_RACES}`;
    const rows = table.slice(0, 5); if (place > 5) rows.push(table[place - 1]);
    $('cup-standings').innerHTML = `<b>${cup.done ? 'FINAL STANDINGS' : 'CUP STANDINGS'}</b>` + rows.map(e => `<div class="${e.you ? 'you' : ''}"><span>${table.indexOf(e) + 1}. ${e.name}</span><em>${e.pts} PTS</em></div>`).join('');
    $('cup-standings').classList.remove('hidden');
    const again = $('again').firstElementChild; if (again) again.textContent = cup.done ? 'NEW CHAMPIONSHIP' : `NEXT: ${tracks[cup.tracks[cup.round]].name}`;
    invasionArmed = false;
    if (cup.done) {
      const bonus = [600, 300, 150][place - 1] || 0;
      $('result-title').textContent = place === 1 ? 'CHAMPION!' : `CUP P${place}.`;
      if (bonus) addCredits(bonus, `CUP P${place}`);
      $('result-credits').textContent = `+${raceEarned} CR EARNED  ·  ${profile.credits} CR TOTAL`;
      if (place === 1) { unlockAchievement('cup'); showCallout('🏆 CHAMPION!', '#ffd35a'); launchConfetti(); playFanfare(); robotSay('Congratulations', 'congratulations'); }
      profile.stats.cups = (profile.stats.cups || 0) + (place === 1 ? 1 : 0); saveProfile();
    }
  }
  // ---- Survival: no finish line, a new level every 30 s (faster rivals, more UFOs, higher top speed) until the ship is gone.
  let survival = null;
  const SURVIVAL_LEVEL_TIME = 30, KM_PER_LAP = 7.2;
  function updateSurvival(track) {
    if (!survival || mode !== 'racing') return;
    if (elapsed >= survival.level * SURVIVAL_LEVEL_TIME) {
      survival.level++;
      for (const r of rivals) r.speed *= 1.05;
      if (ufos.length < 6) ufos.push(makeUfo(ufos.length, ufos.length, time));
      showCallout(`LEVEL ${survival.level}`, '#ff9b2e'); showMessage('FASTER RIVALS  ·  MORE UFOS', 1.6); playToneSweep(300, 1500, .5, 'sawtooth', .05);
    }
    // Rivals left far behind come back ahead, so the track never empties.
    for (const r of rivals) if (r.alive && r.distance < distance - 9000) { r.distance = distance + 14000 + random(r.seed + Math.floor(time)) * 12000; r.hull = r.nemesis ? 6 : 3; }
    for (const r of rivals) if (!r.alive && !r.dying && random(Math.floor(time * 2) + r.seed) < .002) { Object.assign(r, { alive: true, distance: distance + 20000, hull: 3 }); }
  }
  function finishSurvival() {
    const km = distance / LENGTH * KM_PER_LAP, best = profile.stats.survivalBest || 0, record = km > best;
    if (record) profile.stats.survivalBest = km;
    saveProfile(); addCredits(survival.level * 25, `SURVIVAL LEVEL ${survival.level}`);
    mode = 'finished'; invasionArmed = false;
    $('result-eyebrow').textContent = `SURVIVAL / ${tracks[trackIndex].name}`; $('result-title').textContent = record ? 'NEW RECORD!' : 'GAME OVER.';
    $('result-position').textContent = String(survival.level).padStart(2, '0'); $('result-time').textContent = formatTime(elapsed);
    $('result-lap').textContent = `${km.toFixed(1)} KM`;
    $('result-record').textContent = record ? `✦ ${km.toFixed(1)} KM · LEVEL ${survival.level} — NEW RECORD` : `${km.toFixed(1)} KM · LEVEL ${survival.level}  ·  RECORD ${best.toFixed(1)} KM`;
    $('result-credits').textContent = `+${raceEarned} CR EARNED  ·  ${profile.credits} CR TOTAL`;
    $('results').classList.remove('hidden');
  }

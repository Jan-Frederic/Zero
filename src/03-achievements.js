  // ==== Trophy cabinet and unlock pop-ups.
  // ---- Achievements (trophy cabinet).
  const ACHIEVEMENTS = [
    { id: 'first-race', icon: '🏁', name: 'LIGHTS OUT', info: 'Finish your first race.' },
    { id: 'podium', icon: '🥉', name: 'PODIUM PILOT', info: 'Finish in the top 3.' },
    { id: 'win', icon: '🏆', name: 'PURE OVERDRIVE', info: 'Win a race.' },
    { id: 'flawless', icon: '💎', name: 'NOT A SCRATCH', info: 'Win a race without losing a life.' },
    { id: 'cats10', icon: '🐱', name: 'CRAZY CAT PILOT', info: 'Pixel-poof 10 cats.' },
    { id: 'ufo25', icon: '🛸', name: 'ALIEN KILLER', info: 'Shoot down 25 UFOs.' },
    { id: 'rivals50', icon: '💥', name: 'DEMOLITION DERBY', info: 'Destroy 50 rivals.' },
    { id: 'mothership', icon: '🌌', name: 'MOTHERSHIP DOWN', info: 'Destroy a mothership.' },
    { id: 'hyper', icon: '✦', name: 'LIGHT SPEED', info: 'Fly through a star gate.' },
    { id: 'collector', icon: '🧲', name: 'GADGETEER', info: 'Collect all four power-up types.' },
    { id: 'galaxy', icon: '🪩', name: 'DISCO SAVIOUR', info: 'Defeat the final boss and reach the disco.' },
    { id: 'galaxy6', icon: '👑', name: 'SINGULARITY SLAYER', info: 'Beat all six bosses of Singularity Run.' },
    { id: 'upgrade', icon: '🛠', name: 'GREASE MONKEY', info: 'Buy your first upgrade.' },
    { id: 'maxed', icon: '⚙', name: 'FULLY LOADED', info: 'Max out every upgrade.' },
    { id: 'unlock-all', icon: '🗺', name: 'GRAND TOURER', info: 'Unlock every circuit.' },
    { id: 'egg', icon: '🥚', name: 'EGG HUNTER', info: 'Find the secret on the title screen.' },
    { id: 'share', icon: '📣', name: 'BRAGGING RIGHTS', info: 'Share a race result.' },
    { id: 'cup', icon: '🏆', name: 'CHAMPION OF THE GALAXY', info: 'Win a championship.' },
    { id: 'nemesis', icon: '☠', name: 'NEMESIS HUNTER', info: 'Destroy all three nemeses in one race.' },
  ];
  profile.achievements = profile.achievements || {}; profile.stats = Object.assign({ cats: 0, ufos: 0, rivals: 0, powerTypes: [] }, profile.stats);
  const achQueue = []; let achShownAt = -9;
  function unlockAchievement(id) {
    if (profile.achievements[id]) return;
    const a = ACHIEVEMENTS.find(x => x.id === id); if (!a) return;
    profile.achievements[id] = Date.now(); saveProfile(); achQueue.push(a); showNextAchievement(); renderTrophyButton(); renderShips();
  }
  function showNextAchievement() {
    const el = $('achievement'); if (!el || el.classList.contains('visible') || !achQueue.length) return;
    const a = achQueue.shift();
    el.innerHTML = `<i>${a.icon}</i><span><small>ACHIEVEMENT UNLOCKED</small><b>${a.name}</b><em>${a.info}</em></span>`;
    el.classList.add('visible'); achShownAt = realTime(); playToneSweep(660, 1980, .45, 'triangle', .06);
  }
  // Driven by the frame loop (wall clock, so it also runs in menus and pauses).
  function tickAchievement() {
    const el = $('achievement'); if (!el) return;
    if (el.classList.contains('visible') && realTime() - achShownAt > 3.2) { el.classList.remove('visible'); achShownAt = realTime(); }
    else if (!el.classList.contains('visible') && achQueue.length && realTime() - achShownAt > .45) showNextAchievement();
  }
  function renderTrophyButton() { const b = $('open-trophies'); if (b) b.textContent = `🏆 TROPHIES ${Object.keys(profile.achievements).length}/${ACHIEVEMENTS.length}`; }
  function renderTrophies() {
    $('trophy-count').textContent = `${Object.keys(profile.achievements).length} / ${ACHIEVEMENTS.length}`;
    $('trophy-list').innerHTML = ACHIEVEMENTS.map(a => {
      const got = profile.achievements[a.id];
      return `<div class="trophy ${got ? 'got' : ''}"><i>${got ? a.icon : '🔒'}</i><span><b>${a.name}</b><em>${a.info}</em>${got ? `<small>${new Date(got).toLocaleDateString()}</small>` : ''}</span></div>`;
    }).join('');
  }

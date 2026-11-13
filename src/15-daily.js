  // ==== Daily challenge and streak.
  // ---- Daily challenge: one goal per calendar day (same for everyone), bonus credits and a day streak.
  let raceStats = { ufos: 0, rivals: 0, cats: 0, boost: 0, lives: 0 };
  const DAILY_GOALS = [
    { id: 'win', text: t => `WIN ${t}`, check: () => rank === 1 },
    { id: 'noboost', text: t => `TOP 3 ON ${t} WITHOUT BOOSTING`, check: () => rank <= 3 && raceStats.boost === 0 },
    { id: 'ufos', n: [6, 12], text: (t, n) => `SHOOT DOWN ${n} UFOs ON ${t}`, check: n => raceStats.ufos >= n },
    { id: 'rivals', n: [8, 16], text: (t, n) => `DESTROY ${n} RIVALS ON ${t}`, check: n => raceStats.rivals >= n },
    { id: 'flawless', text: t => `FINISH ${t} WITHOUT LOSING A LIFE`, check: () => raceStats.lives === 0 },
    { id: 'cats', n: [3, 6], text: (t, n) => `POP ${n} CATS ON ${t}`, check: n => raceStats.cats >= n },
    { id: 'podium', text: t => `PODIUM ON ${t} ON HARD`, check: () => rank <= 3 && settings.difficulty === 'hard' },
  ];
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function dailyChallenge(key = dayKey()) {
    let h = 2166136261; for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    // The circuit is fixed the first time the day's challenge is shown, so unlocking a circuit mid-day cannot move it.
    if (!profile.daily.pick || profile.daily.pick.key !== key) { profile.daily.pick = { key, track: (h >>> 8) % Math.max(1, Math.min(profile.unlocked || 1, tracks.length)) }; saveProfile(); }
    const goal = DAILY_GOALS[h % DAILY_GOALS.length], track = profile.daily.pick.track;
    const n = goal.n ? goal.n[0] + (h >>> 16) % (goal.n[1] - goal.n[0] + 1) : 0;
    return { key, goal, track, n, text: goal.text(tracks[track].name, n) };
  }
  profile.daily = Object.assign({ done: '', last: '', streak: 0 }, profile.daily);
  const dailyReward = () => 300 + 50 * Math.min(10, profile.daily.streak);
  function renderDaily() {
    const d = dailyChallenge(), done = profile.daily.done === d.key, el = $('daily'); if (!el) return;
    el.classList.toggle('done', done);
    $('daily-text').textContent = done ? `✓ DONE — ${d.text}` : d.text;
    $('daily-meta').textContent = `${done ? 'COME BACK TOMORROW' : `REWARD ${dailyReward()} CR`}  ·  🔥 STREAK ${profile.daily.streak}`;
  }
  function checkDaily() {
    const d = dailyChallenge();
    if (gameMode() !== 'race' || trackIndex !== d.track || profile.daily.done === d.key || !d.goal.check(d.n)) return;
    const yesterday = dayKey(new Date(Date.now() - 864e5));
    profile.daily.streak = profile.daily.last === yesterday ? profile.daily.streak + 1 : 1;
    profile.daily.last = d.key; profile.daily.done = d.key; saveProfile();
    addCredits(dailyReward() - 50, 'DAILY CHALLENGE');
    $('result-record').textContent = `📅 DAILY CHALLENGE COMPLETE!  🔥 ${profile.daily.streak}-DAY STREAK`;
    renderDaily();
  }
  // ---- Weekly missions: three per calendar week (same for everyone), progress counts across all races and modes.
  const MISSIONS = [
    { id: 'missile', n: [2, 4], reward: 500, text: n => `DESTROY ${n} RIVALS WITH MISSILES` },
    { id: 'drift', n: [20, 40], reward: 400, text: n => `DRIFT FOR ${n} SECONDS IN TOTAL` },
    { id: 'shortcut', n: [2, 4], reward: 450, text: n => `TAKE ${n} SHORTCUTS` },
    { id: 'ufos', n: [15, 30], reward: 400, text: n => `SHOOT DOWN ${n} UFOs` },
    { id: 'podium', n: [3, 5], reward: 500, text: n => `FINISH ON THE PODIUM ${n} TIMES` },
    { id: 'slip', n: [5, 10], reward: 350, text: n => `CATCH ${n} SLIPSTREAMS` },
    { id: 'nemesis', n: [2, 4], reward: 600, text: n => `TAKE DOWN ${n} NEMESES` },
    { id: 'km', n: [60, 120], reward: 400, text: n => `RACE ${n} KM` },
    { id: 'survival', n: [3, 5], reward: 600, max: true, text: n => `REACH LEVEL ${n} IN SURVIVAL` },
    { id: 'cup', n: [1, 1], reward: 800, text: () => 'WIN A CHAMPIONSHIP' },
  ];
  const MISSION_BONUS = 500;
  // ISO week, e.g. 2026-W46.
  function weekKey(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
    const year = t.getUTCFullYear(), week = Math.ceil(((t.getTime() - Date.UTC(year, 0, 1)) / 864e5 + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }
  function weeklyMissions(key = weekKey()) {
    let h = 2166136261; for (const c of key + 'missions') h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    const pool = [...MISSIONS], picked = [];
    for (let i = 0; i < 3; i++) { const m = pool.splice((h >>> (i * 5)) % pool.length, 1)[0]; picked.push({ ...m, target: m.n[0] + (h >>> (i * 3 + 16)) % (m.n[1] - m.n[0] + 1) }); }
    return picked;
  }
  function weeklyState() {
    const key = weekKey();
    if (!profile.weekly || profile.weekly.key !== key) { profile.weekly = { key, progress: {}, done: {}, bonus: false }; saveProfile(); }
    return profile.weekly;
  }
  function mission(id, amount = 1) {
    const st = weeklyState(), m = weeklyMissions(st.key).find(x => x.id === id);
    if (!m || st.done[id]) return;
    st.progress[id] = m.max ? Math.max(st.progress[id] || 0, amount) : (st.progress[id] || 0) + amount;
    if (st.progress[id] >= m.target) {
      st.done[id] = Date.now(); addCredits(m.reward, 'MISSION'); showCallout('🎯 MISSION COMPLETE', '#ffd35a'); showMessage(m.text(m.target), 1.6);
      if (!st.bonus && weeklyMissions(st.key).every(x => st.done[x.id])) { st.bonus = true; addCredits(MISSION_BONUS, 'ALL MISSIONS'); }
    }
    saveProfile(); renderMissionsButton();
  }
  function renderMissionsButton() {
    const st = weeklyState(), list = weeklyMissions(st.key), done = list.filter(m => st.done[m.id]).length;
    if ($('open-missions')) $('open-missions').textContent = `🎯 WEEKLY MISSIONS ${done}/3 ›`;
  }
  function renderMissions() {
    const st = weeklyState(), list = weeklyMissions(st.key);
    const now = new Date(), daysLeft = (7 - ((now.getDay() + 6) % 7)) || 7;
    $('missions-week').textContent = `WEEK ${st.key.split('-W')[1]}  ·  RESETS IN ${daysLeft} ${daysLeft === 1 ? 'DAY' : 'DAYS'}`;
    $('missions-list').innerHTML = list.map(m => {
      const p = Math.min(m.target, Math.floor(st.progress[m.id] || 0)), ok = !!st.done[m.id];
      return `<div class="mission ${ok ? 'done' : ''}"><b>${ok ? '✓ ' : ''}${m.text(m.target)}</b><span class="mission-bar"><i style="width:${p / m.target * 100}%"></i></span><small>${p} / ${m.target}  ·  ${m.reward} CR</small></div>`;
    }).join('') + `<p class="mission-bonus ${st.bonus ? 'done' : ''}">ALL THREE: +${MISSION_BONUS} CR BONUS</p>`;
  }

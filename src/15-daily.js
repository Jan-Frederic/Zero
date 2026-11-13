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

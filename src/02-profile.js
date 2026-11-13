  // ==== Saved pilot profile: credits, upgrades, paint jobs, lifetime stats.
  // ---- Pilot profile (saved on the device): credits, ship upgrades, unlocked circuits, achievements, stats.
  const PROFILE_KEY = 'morbid-profile-v1';
  const profile = { credits: 0, upgrades: {}, unlocked: 1, achievements: {}, stats: {} };
  try { Object.assign(profile, JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')); } catch { /* fresh pilot */ }
  profile.upgrades = Object.assign({ armor: 0, laser: 0, boost: 0 }, profile.upgrades);
  if (profile.tutorialDone === undefined && (profile.credits > 0 || Object.keys(profile.achievements || {}).length)) profile.tutorialDone = true;
  // Existing pilots keep every circuit they already raced (from saved lap records).
  try { for (let i = 7; i > 0; i--) if (Number(localStorage.getItem(`chroma-best-${i}`)) > 0) { profile.unlocked = Math.max(profile.unlocked || 1, i + 1); break; } } catch { /* ignore */ }
  function saveProfile() { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* storage unavailable */ } }
  const UPGRADES = {
    armor: { name: 'HULL ARMOR', icon: '🛡', info: lvl => `takes ${Math.round(100 - 100 / (1 + lvl * .25))}% less damage` },
    laser: { name: 'LASER BANK', icon: '◎', info: lvl => `${BASE_LASER_CAPACITY + lvl * 2} cells, recharge ${Math.round(lvl * 15)}% faster` },
    boost: { name: 'BOOST CORE', icon: 'ϟ', info: lvl => `${Math.round(lvl * 20)}% less drain, +${lvl * 3}% top speed` },
  };
  const UPGRADE_COST = [150, 350, 700], UPGRADE_MAX = 3;
  // Paint jobs for the player's ship: bought with credits or unlocked by a trophy.
  const PAINTS = [
    { id: 'factory', name: 'FACTORY', cost: 0 },
    { id: 'stealth', name: 'STEALTH', cost: 250, color: '#5b5f70', dark: '#14141c', accent: '#ff2a4a' },
    { id: 'chrome', name: 'CHROME', cost: 400, color: '#e8eef6', dark: '#5d6b80', accent: '#9fe8ff' },
    { id: 'flames', name: 'HOT RODS', cost: 600, color: '#ff4a1c', dark: '#3a0a04', accent: '#ffd35a', pattern: 'flames' },
    { id: 'stripes', name: 'RACING STRIPES', cost: 500, color: '#2f6bff', dark: '#0c1a4a', accent: '#ffffff', pattern: 'stripes' },
    { id: 'gold', name: '24K GOLD', trophy: 'win', color: '#ffd35a', dark: '#6a4a08', accent: '#fff6c8' },
    { id: 'kitty', name: 'NEON KITTY', trophy: 'cats10', color: '#ff9bf2', dark: '#4a1a46', accent: '#80faff', pattern: 'spots' },
    { id: 'rainbow', name: 'HYPER RAINBOW', trophy: 'galaxy', pattern: 'rainbow', accent: '#ffffff' },
    { id: 'pumpkin', name: 'PUMPKIN PATCH', season: 'halloween', color: '#ff7a1a', dark: '#2a0e00', accent: '#7dff3a', pattern: 'spots' },
    { id: 'frost', name: 'FROSTBITE', season: 'xmas', color: '#e8f6ff', dark: '#1b4a7a', accent: '#ff3b55', pattern: 'stripes' },
  ];
  // ---- Seasonal events by date: Halloween (15 Oct – 7 Nov) and winter (1 Dec – 6 Jan). ?season=… forces one for testing.
  const SEASONS = { halloween: { name: '🎃 HALLOWEEN EVENT', info: 'PUMPKIN UFOS · GHOST FOG · FREE PAINT: PUMPKIN PATCH' }, xmas: { name: '🎄 WINTER EVENT', info: 'SNOWFALL · SLIPPERY TRACKS · FREE PAINT: FROSTBITE' } };
  let seasonOverride = null;
  try { seasonOverride = new URLSearchParams(location.search).get('season'); } catch { /* no URL */ }
  function season(date = new Date()) {
    if (seasonOverride !== null) return SEASONS[seasonOverride] ? seasonOverride : null;
    const m = date.getMonth() + 1, d = date.getDate();
    if ((m === 10 && d >= 15) || (m === 11 && d <= 7)) return 'halloween';
    if (m === 12 || (m === 1 && d <= 6)) return 'xmas';
    return null;
  }
  profile.paints = profile.paints || ['factory'];
  const paintOwned = p => p.cost === 0 || (p.season && p.season === season()) || profile.paints.includes(p.id) || (p.trophy && profile.achievements && profile.achievements[p.trophy]);
  // drawShip appends alpha digits to colours ('#rrggbb' + '60'), so paints must be 6-digit hex.
  function hslHex(h, sat, l) {
    const k = n => (n + h / 30) % 12, a = sat * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return '#' + [f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  }
  function playerPaint(machine) {
    const p = PAINTS.find(x => x.id === profile.paint) || PAINTS[0];
    if (!paintOwned(p) || p.id === 'factory') return { color: machine.color, dark: machine.dark };
    if (p.pattern === 'rainbow') { const h = (time * 90) % 360; return { color: hslHex(h, 1, .62), dark: hslHex((h + 180) % 360, .8, .22), accent: p.accent, pattern: p.pattern }; }
    return { color: p.color, dark: p.dark, accent: p.accent, pattern: p.pattern };
  }
  const hullStrength = () => BASE_HULL_STRENGTH * (1 + profile.upgrades.armor * .25);
  const laserCap = () => BASE_LASER_CAPACITY + profile.upgrades.laser * 2;
  const laserRecharge = () => BASE_LASER_RECHARGE * (1 - profile.upgrades.laser * .15);
  const boostDrain = () => 1 - profile.upgrades.boost * .2;
  const topSpeed = () => (1 + profile.upgrades.boost * .03) * (survival ? 1 + (survival.level - 1) * .04 : 1);
  let raceEarned = 0, creditPopAt = -9;
  function stat(key, add = 1) { profile.stats[key] = (profile.stats[key] || 0) + add; saveProfile(); return profile.stats[key]; }
  function addCredits(amount, why) {
    const base = Math.round(amount * diff().credits * mutatorBonus());
    amount = Math.round(base * levelBonus()); if (!amount) return;
    profile.credits += amount; raceEarned += amount; saveProfile(); gainXp(base);
    $('credit-pop').textContent = `+${amount} CR  ${why}`; creditPopAt = time; $('credit-pop').classList.add('visible');
  }
  // ---- Pilot level: every credit earned is also XP. Each level adds 1 % to future credits (up to +40 %),
  // and every 5 levels a new rank pays a one-off bonus.
  const RANKS = ['ROOKIE', 'STREET RACER', 'PRO PILOT', 'ACE', 'STAR PILOT', 'HYPERDRIVER', 'GALAXY HERO', 'SINGULARITY LEGEND'];
  const RANK_BONUS = 500;
  const xpForLevel = level => Math.round(400 * Math.pow(level, 1.5)); // XP from this level to the next
  const rankOf = level => RANKS[Math.min(RANKS.length - 1, Math.floor(level / 5))];
  const levelBonus = () => 1 + Math.min(.4, ((profile.level || 1) - 1) * .01);
  let raceXp = 0;
  function gainXp(xp) {
    if (!xp) return;
    profile.level = profile.level || 1; profile.xp = (profile.xp || 0) + xp; raceXp += xp;
    while (profile.xp >= xpForLevel(profile.level)) {
      profile.xp -= xpForLevel(profile.level); const before = rankOf(profile.level); profile.level++;
      const rank = rankOf(profile.level);
      if (rank !== before) { profile.credits += RANK_BONUS; showCallout(`★ ${rank}`, '#ffd35a'); showMessage(`NEW RANK  /  +${RANK_BONUS} CR`, 2); }
      else showCallout(`★ LEVEL ${profile.level}`, '#ffd35a');
      playToneSweep(500, 1600, .35, 'triangle', .05); buzz([20, 40, 20]);
    }
    saveProfile(); renderPilot();
  }
  function renderPilot() {
    const level = profile.level || 1, pct = Math.floor((profile.xp || 0) / xpForLevel(level) * 100);
    if ($('pilot-chip')) $('pilot-chip').innerHTML = `<b>★ LV ${level}</b><span>${rankOf(level)}</span><i style="--p:${pct}%"></i>`;
  }
  function renderResultXp() {
    const level = profile.level || 1;
    if ($('result-xp')) $('result-xp').textContent = `+${raceXp} XP  ·  LEVEL ${level} ${rankOf(level)}  ·  ${Math.floor((profile.xp || 0) / xpForLevel(level) * 100)} %`;
  }

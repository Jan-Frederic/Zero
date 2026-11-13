  // ==== Upgrade and paint shop.
  // ---- Upgrade shop in the garage.
  function renderShop() {
    $('shop-credits').textContent = `${profile.credits} CR`;
    $('open-shop').textContent = `🛠 UPGRADES · ${profile.credits} CR`;
    $('shop-list').innerHTML = Object.entries(UPGRADES).map(([key, u]) => {
      const lvl = profile.upgrades[key], cost = UPGRADE_COST[lvl], maxed = lvl >= UPGRADE_MAX;
      const pips = Array.from({ length: UPGRADE_MAX }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
      return `<div class="shop-row"><div class="shop-info"><b>${u.icon} ${u.name}</b><span class="pips">${pips}</span><small>${maxed ? 'MAXED OUT — ' : 'NOW: '}${u.info(lvl)}${maxed ? '' : `<br>NEXT: ${u.info(lvl + 1)}`}</small></div>`
        + `<button class="setup-option shop-buy" data-buy="${key}" ${maxed || profile.credits < cost ? 'disabled' : ''}>${maxed ? 'MAX' : `UPGRADE · ${cost} CR`}</button></div>`;
    }).join('');
    $('paint-list').innerHTML = PAINTS.map(p => {
      const owned = paintOwned(p), active = (profile.paint || 'factory') === p.id;
      const swatch = p.pattern === 'rainbow' ? 'linear-gradient(90deg,#ff4eb8,#ddff46,#4df8ff,#a88aff)' : p.id === 'factory' ? machines[shipIndex].color : `linear-gradient(135deg,${p.color} 55%,${p.accent} 55%)`;
      const label = active ? 'EQUIPPED' : owned ? 'EQUIP' : p.trophy ? `🏆 ${ACHIEVEMENTS.find(a => a.id === p.trophy).name}` : `BUY · ${p.cost} CR`;
      return `<button class="paint ${active ? 'active' : ''} ${owned ? 'owned' : ''}" data-paint="${p.id}" ${!owned && (p.trophy || profile.credits < p.cost) ? 'disabled' : ''}><i style="background:${swatch}"></i><b>${p.name}</b><small>${label}</small></button>`;
    }).join('');
  }
  function choosePaint(id) {
    const p = PAINTS.find(x => x.id === id); if (!p) return false;
    if (!paintOwned(p)) { if (p.trophy || profile.credits < p.cost) return false; profile.credits -= p.cost; profile.paints.push(p.id); playToneSweep(500, 1500, .3, 'square', .05); }
    profile.paint = p.id; saveProfile(); renderShop(); return true;
  }
  if ($('paint-list').addEventListener) $('paint-list').addEventListener('click', event => { const b = event.target && event.target.closest && event.target.closest('[data-paint]'); if (b) choosePaint(b.dataset.paint); });
  function buyUpgrade(key) {
    const lvl = profile.upgrades[key], cost = UPGRADE_COST[lvl];
    if (lvl >= UPGRADE_MAX || profile.credits < cost) return false;
    profile.credits -= cost; profile.upgrades[key] = lvl + 1; saveProfile(); renderShop();
    unlockAchievement('upgrade'); if (Object.values(profile.upgrades).every(v => v >= UPGRADE_MAX)) unlockAchievement('maxed');
    playToneSweep(500, 1500, .3, 'square', .05); return true;
  }
  if ($('shop-list').addEventListener) $('shop-list').addEventListener('click', event => { const b = event.target && event.target.closest && event.target.closest('[data-buy]'); if (b) buyUpgrade(b.dataset.buy); });
  $('open-shop').addEventListener('click', () => { renderShop(); openDialog('shop-screen'); });
  renderShop(); renderTrophyButton();
  $('open-trophies').addEventListener('click', () => { renderTrophies(); openDialog('trophy-screen'); });
  window.morbidShop = { buy: buyUpgrade, paint: choosePaint, profile };

  // ==== Share card.
  // ---- Share card: a 1200×630 image of the result, shared via the system share sheet (or downloaded).
  function shareCard() {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 630; const g = c.getContext('2d');
    const t = tracks[trackIndex], won = finale && finale.phase === 'disco';
    const sky = g.createLinearGradient(0, 0, 0, 630); sky.addColorStop(0, t.sky[0]); sky.addColorStop(.6, t.sky[1]); sky.addColorStop(1, '#09091a');
    g.fillStyle = sky; g.fillRect(0, 0, 1200, 630);
    const sun = g.createLinearGradient(0, 120, 0, 420); sun.addColorStop(0, '#ffeb8f'); sun.addColorStop(1, '#ff4098');
    g.fillStyle = sun; g.beginPath(); g.arc(920, 280, 160, 0, TAU); g.fill();
    g.fillStyle = t.sky[1]; for (let i = 0; i < 8; i++) g.fillRect(760, 300 + i * 18, 320, 3 + i * 1.5);
    g.strokeStyle = t.edge + '88'; g.lineWidth = 2; for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(600 + i * 40, 430); g.lineTo(600 + i * 160, 630); g.stroke(); }
    for (let i = 0; i < 6; i++) { const y = 430 + Math.pow(i / 6, 2) * 200; g.beginPath(); g.moveTo(0, y); g.lineTo(1200, y); g.stroke(); }
    g.font = 'italic 900 110px "Barlow Condensed", Impact, sans-serif'; g.fillStyle = '#ffffff'; g.fillText('MORBID', 60, 150); g.fillStyle = '#ddff46'; g.fillText('RACERS', 60, 250);
    g.font = '22px "Share Tech Mono", monospace'; g.fillStyle = '#ff4eb8'; g.fillText(won ? 'GALAXY SAVED · INVASION REPELLED' : `${t.name} · ${t.class}`, 64, 305);
    g.font = 'italic 900 150px "Barlow Condensed", Impact, sans-serif'; g.fillStyle = '#ddff46'; g.fillText($('result-position').textContent || '--', 60, 470);
    g.font = 'italic 700 46px "Barlow Condensed", Impact, sans-serif'; g.fillStyle = '#c9c2dc'; g.fillText(`/ ${PILOT_COUNT}`, 250, 470);
    g.font = '26px "Share Tech Mono", monospace'; g.fillStyle = '#ffffff';
    g.fillText(`TIME ${$('result-time').textContent}   BEST LAP ${$('result-lap').textContent}`, 64, 535);
    g.fillStyle = '#4df8ff'; g.fillText(won ? `${finale.waves} BOSS${finale.waves > 1 ? 'ES' : ''} SPLATTERED · ${ufoKills} UFOs` : `${ufoKills} UFOs SHOT DOWN · ${Object.keys(profile.achievements).length} TROPHIES`, 64, 580);
    g.font = '20px "Share Tech Mono", monospace'; g.fillStyle = '#c9c2dc'; g.fillText('jan-frederic.github.io/Zero', 900, 600);
    return c;
  }
  $('share').addEventListener('click', async () => {
    const c = shareCard(), text = `I just finished P${$('result-position').textContent} in Morbid Racers! Can you beat me? 🏁`, url = 'https://jan-frederic.github.io/Zero/';
    const blob = await new Promise(done => c.toBlob(done, 'image/png'));
    const file = blob && typeof File === 'function' ? new File([blob], 'morbid-racers.png', { type: 'image/png' }) : null;
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text, url, title: 'Morbid Racers' });
      else if (navigator.share) await navigator.share({ text, url, title: 'Morbid Racers' });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'morbid-racers.png'; a.click(); }
      unlockAchievement('share');
    } catch { /* share sheet dismissed */ }
  });

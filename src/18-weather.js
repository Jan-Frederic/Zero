  // ==== Weather and track events.
  // ---- Weather and track events: a random event every 20-35 s of racing, lasting about 9 s.
  const WEATHER = {
    meteors: { name: '☄ METEOR SHOWER', info: 'WATCH THE IMPACT MARKERS!', color: '#ff8a2e' },
    sandstorm: { name: '🌪 SANDSTORM', info: 'VISIBILITY DROPPING', color: '#e0b070' },
    gravity: { name: '〰 GRAVITY WAVES', info: 'THE TRACK PULLS YOU SIDEWAYS', color: '#a88aff' },
    snow: { name: '❄ SNOWFALL', info: 'SLIPPERY TRACK — STEER GENTLY', color: '#dff4ff', season: 'xmas' },
    ghosts: { name: '👻 GHOST FOG', info: 'SOMETHING IS WATCHING…', color: '#9dff6a', season: 'halloween' },
  };
  let weather = null, nextWeatherAt = 25;
  function updateWeather(dt, track) {
    if (!weather && time >= nextWeatherAt) {
      const types = Object.keys(WEATHER).filter(t => !WEATHER[t].season || WEATHER[t].season === season()), type = types[Math.floor(random(Math.floor(time * 3) + trackIndex) * types.length) % types.length];
      weather = { type, started: time, until: time + 9, nextMeteor: time + .6 };
      showCallout(WEATHER[type].name, WEATHER[type].color); showMessage(WEATHER[type].info, 2); playToneSweep(200, 600, .6, 'sawtooth', .04);
    }
    if (!weather) return;
    if (weather.type === 'meteors' && time >= weather.nextMeteor) {
      weather.nextMeteor = time + .55 + Math.random() * .5;
      const lane = clamp(playerX / track.width + (Math.random() - .5) * .9, -.75, .75);
      bombs.push({ distance: distance + Math.max(4800, speed * .7 + 1200), lane, droppedAt: time, fallTime: .7, landed: false, exploded: false, seed: Math.floor(time * 10), color: '#ff8a2e', meteor: true });
    }
    if (time >= weather.until) { weather = null; nextWeatherAt = time + 20 + Math.random() * 15; showMessage('THE SKY CLEARS', 1); }
  }
  function drawWeather() {
    if (!weather || mode === 'menu') return;
    const k = clamp(Math.min((time - weather.started) * 1.5, (weather.until - time) * 1.5), 0, 1);
    ctx.save();
    if (weather.type === 'sandstorm') {
      const g = ctx.createLinearGradient(0, H * .2, 0, H * .75); g.addColorStop(0, `rgba(180,130,70,${.75 * k})`); g.addColorStop(.7, `rgba(150,100,50,${.45 * k})`); g.addColorStop(1, 'rgba(150,100,50,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(240,200,140,${.55 * k})`;
      for (let i = 0; i < 160; i++) { const x = mod(random(i + 900) * W - time * (300 + random(i) * 500), W), y = random(i + 910) * H * .85; ctx.fillRect(x, y, 2 + random(i) * 10, 1.5); }
    } else if (weather.type === 'gravity') {
      ctx.strokeStyle = '#b89cff'; ctx.lineWidth = 5; ctx.shadowColor = '#a88aff'; ctx.shadowBlur = 14;
      for (let i = 0; i < 4; i++) { const ph = mod(time * .8 + i / 4, 1); ctx.globalAlpha = (1 - ph) * k; ctx.beginPath(); ctx.ellipse(W / 2 + Math.sin((time - weather.started) * 1.4) * W * .2, H * .6, W * (.1 + ph * .7), H * (.03 + ph * .2), 0, 0, TAU); ctx.stroke(); }
    } else if (weather.type === 'snow') {
      ctx.fillStyle = `rgba(230,244,255,${.12 * k})`; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 140; i++) { const sp = 60 + random(i) * 120, x = mod(random(i + 400) * W + Math.sin(time + i) * 30 - time * 40, W), y = mod(random(i + 410) * H + time * sp, H); ctx.globalAlpha = k * (.5 + random(i + 3) * .5); ctx.beginPath(); ctx.arc(x, y, 1 + random(i + 7) * 2.5, 0, TAU); ctx.fill(); }
    } else if (weather.type === 'ghosts') {
      const g = ctx.createLinearGradient(0, H * .3, 0, H); g.addColorStop(0, `rgba(60,20,90,${.55 * k})`); g.addColorStop(1, `rgba(40,90,40,${.35 * k})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.font = `${Math.round(H * .06)}px system-ui, sans-serif`; ctx.textAlign = 'center';
      for (let i = 0; i < 5; i++) { const ph = mod(time * .15 + i / 5, 1); ctx.globalAlpha = k * Math.sin(ph * Math.PI) * .7; ctx.fillText(i % 2 ? '👻' : '🦇', W * (.1 + random(i + 30) * .8) + Math.sin(time * 2 + i) * 30, H * (.15 + ph * .5)); }
    } else if (weather.type === 'meteors') {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 10; i++) { const ph = mod(time * .7 + random(i + 70), 1), x = W * (.1 + random(i + 80) * .8) - ph * W * .25, y = -40 + ph * H * .6; ctx.globalAlpha = k * (1 - ph); line(x, y, x + 60, y - 90, '#ffb347', 3); ctx.fillStyle = '#fff1c2'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }

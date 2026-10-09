/* =========================================================
   LOOP
   ========================================================= */
let UT = 0, rotT = 0, abilT = 0; // UI clock keeps running while the world is paused
function update(dt) {
  UT += dt;
  if (NETM.on) netTick(dt); // co-op: send and receive, whatever state the game is in
  if ((rotT -= dt) <= 0) { rotT = .5; checkRotation(); updateRotClocks(); }
  Sfx.musicUpdate(!!MAPS[mapIdx].music && ['play', 'ready', 'intro', 'held'].includes(state));
  if (state === 'menu' || state === 'paused' || state === 'held' || state === 'loading') return; // time stops: no AI, movement, blood or sounds
  if (state === 'dead') { // the world is frozen; only the camera settles and the death screen arrives
    airEars(dt); // a blast's muffle still clears while you're dead
    if (airBusy()) { T += dt; airTick(dt); updateBlood(dt); updateGiblets(dt); updateSplashes(dt); updateMist(dt); updateSmoke(dt); } // ...except an explosion still playing out (blown up: you go off like a fuse)
    shake *= Math.exp(-dt * 8); if (shake < .2) shake = 0;
    killV *= Math.exp(-dt * 1.4); killFlash *= Math.exp(-dt * 7);
    if (deadT > 0) { deadT -= dt; if (deadT <= 0 || performance.now() - deadAt > deathDelay() * 1000) { deadT = 0; showDead(); } } // real time, not frame time: a slow frame can't hold the crash screen back
    return;
  }
  if (hitStop > 0) { hitStop -= dt; return; } // hit-stop: the world holds its breath for a few frames
  T += dt;
  if (!snake || !snake.started) for (const k in abilCD) abilCD[k] += dt; // frozen opening: cooldowns don't tick until you first move
  updateCrowd(); // the neighbor grid, once per tick, before anything moves or asks who's near
  if (state === 'play') { updateSnake(dt); if (AUTH()) snakeNoise(dt); run.time += dt; if (snake && snake.alive && snake.started) snake.lifeT = (snake.lifeT || 0) + dt; /* how long this body has lived: kills pay more XP the longer it lasts */ crTick(dt); progressTick(dt); }
  if (AUTH()) { updateSounds(); updateConvos(dt); } // the crowd's ears and chatter live on the deciding browser
  if (NETM.run) { if (NETM.host) netUpdateCreatures(dt); else netClientCreatures(dt); } // co-op: the host's AI reacts to every player; guests show what the host says
  else for (const c of creatures) if (c.alive) updateCreature(c, dt);
  updateChunks(dt); // broken pieces of things (38b-destruction)
  if (typeof adminTick === 'function') adminTick(); // the admin panel's overrides (40f-admin)
  airTick(dt); // air strikes, and snakes going up (before the blood moves, so a blast's spray flies this frame)
  updateBlood(dt); updateGiblets(dt); updateSplashes(dt); updateMist(dt); updateSmoke(dt); updateFlies(dt); updateVomit(dt);
  if ((fadeT -= dt) <= 0) { fadeT = 2; fadeBlood(); }
  updateTrail(dt); updateHoovFx(dt);
  if (snake) { const dk = snake.ramT > 0 ? Math.pow(snake.ramT / (snake.ramMax || 1), .6) * (snake.stunFx || 1) : 0; airEars(dt, dk, snake.wallStun > 0); } // muffled by a smash, a wall or a blast
  updateScent(dt);
  updateGround(dt); updateSnow(dt); updateWeather(dt);
  if (AUTH()) for (let i = respawnQ.length - 1; i >= 0; i--) { if ((respawnQ[i].t -= dt) <= 0) { spawn(respawnQ[i].type, respawnQ[i].zone); respawnQ.splice(i, 1); } }
  shake *= Math.exp(-dt * 8); if (shake < .2) shake = 0;
  killV *= Math.exp(-dt * 1.4);
  if (desatHold > 0) desatHold -= dt; else killFlash *= Math.exp(-dt * 7);
  const fk = Math.exp(-dt / 10); for (let i = 0; i < fresh.length; i++) fresh[i] *= fk;
  updateTime(dt);
  if (cam && !cam.hold) { cam.t += dt; if (state === 'intro' && cam.t > cam.dur * .8) state = 'ready'; if (cam.t >= cam.dur) cam = null; }
  updateCamFollow(dt); updateCombo(dt); updateEvents(dt);
  if ((abilT -= dt) <= 0) { abilT = .1; abilityHud(); hudNear(); }
  abilityTick();
  if (state === 'play' && (chT -= dt) <= 0) {
    chT = .5;
    const pan = creatures.filter(c => c.alive && c.def.human && c.state === 'panic').length;
    run.maxPanic = Math.max(run.maxPanic, pan); cr.maxPanic = Math.max(cr.maxPanic, pan);
    if (T - cr.lastEat > 10) cr.quiet = Math.max(cr.quiet, pan); // panic spread without a kill in the last 10 seconds
    const bloody = snake.stains.filter(l => l.length >= 3).length; cr.maxGore = Math.max(cr.maxGore, Math.round(bloody / snake.stains.length * 100));
    checkChallenges();
  }
}
function rrect(x, X, Y, w, h, r) {
  x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r);
  x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath();
}
function heart(x, cx, cy, s) {
  x.beginPath(); x.moveTo(cx, cy + s * .9);
  x.bezierCurveTo(cx - s * 1.6, cy - s * .2, cx - s * .6, cy - s * 1.4, cx, cy - s * .4);
  x.bezierCurveTo(cx + s * .6, cy - s * 1.4, cx + s * 1.6, cy - s * .2, cx, cy + s * .9); x.fill();
}
function star(x, cx, cy, r, rot = 0) {
  x.beginPath();
  for (let k = 0; k < 10; k++) { const a = rot + k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? r * .45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.closePath(); x.fill();
}
let trail = [];
function updateTrail(dt) {
  const s = snake, type = SETTINGS.snake.trail;
  if (type !== 'None' && state === 'play' && s.started && s.alive && (s.trailT = (s.trailT || 0) - dt) <= 0) {
    s.trailT = .045;
    const g = s.segs[s.segs.length - 1], up = type === 'Embers' || type === 'Bubbles' || type === 'Hearts' ? -16 : type === 'Blood Drip' ? 14 : 0;
    trail.push({ x: g.x + rand(-4, 4), y: g.y + rand(-4, 4), vx: rand(-12, 12), vy: rand(-12, 12) + up, t: 0, life: rand(.7, 1.3), rot: rand(0, TAU),
                 c: pick(['#ff4f8b', '#ffd23f', '#3fd4ff', '#7dff6a', '#b07bff']), type });
  }
  for (let i = trail.length - 1; i >= 0; i--) {
    const p = trail[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 3;
    if (p.t > p.life) { trail[i] = trail[trail.length - 1]; trail.pop(); }
  }
  if (trail.length > 200) trail.splice(0, trail.length - 200);
}
function drawTrail(x) {
  for (const p of trail) {
    const k = 1 - p.t / p.life; x.globalAlpha = k;
    switch (p.type) {
      case 'Sparkles': x.fillStyle = '#fff6c2'; star(x, p.x, p.y, 2.6 * k + 1, p.rot); break;
      case 'Hearts': x.fillStyle = '#ff4f8b'; heart(x, p.x, p.y, 3.2); break;
      case 'Bubbles': x.strokeStyle = 'rgba(190,235,255,.9)'; x.lineWidth = 1; x.beginPath(); x.arc(p.x, p.y, 2 + (1 - k) * 3, 0, TAU); x.stroke(); break;
      case 'Embers': x.fillStyle = k > .5 ? '#ffd23f' : '#ff5a1f'; circ(x, p.x, p.y, 1.6 * k + .6); break;
      case 'Petals': x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.fillStyle = '#ffb3d1'; ell(x, 0, 0, 3, 1.6); x.restore(); break;
      case 'Smoke': x.globalAlpha = k * .45; x.fillStyle = '#8a8a8a'; circ(x, p.x, p.y, 3 + (1 - k) * 6); break;
      case 'Confetti': x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.fillStyle = p.c; x.fillRect(-2, -1, 4, 2); x.restore(); break;
      case 'Cheese Crumbs': x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.fillStyle = '#f2c94c'; x.fillRect(-1.6, -1.2, 3.2, 2.4); x.fillStyle = '#d9a92a'; x.fillRect(-.4, -.4, .9, .9); x.restore(); break;
      case 'Gold Dust': x.fillStyle = k > .5 ? '#fff1b0' : '#d4af37'; star(x, p.x, p.y, 1.8 * k + .8, p.rot); break;
      case 'Blood Drip': x.fillStyle = '#7a0909'; ell(x, p.x, p.y, 1.3, 1.3 + (1 - k) * 1.6); break;
      case 'Alarm': x.fillStyle = Math.floor(p.t * 8) % 2 ? '#ff2b2b' : '#ffffff'; circ(x, p.x, p.y, 1.8 * k + .6); break;
      case 'Afterglow': x.globalAlpha = k * .5; x.fillStyle = SETTINGS.snake.color || '#4e7cf6'; circ(x, p.x, p.y, 2.5 + (1 - k) * 4); break;
      case 'Nuggets': x.save(); x.translate(p.x, p.y); x.rotate(p.rot * .3); x.fillStyle = '#b8860b'; x.fillRect(-2, -1.6, 4, 3.2); x.fillStyle = '#ffe27a'; x.fillRect(-1.6, -1.4, 2, 1.2); x.restore(); break;
      case 'Shrapnel': x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.fillStyle = k > .6 ? '#c9c2b6' : '#7d776e'; x.beginPath(); x.moveTo(-2, -1); x.lineTo(2.2, 0); x.lineTo(-1, 1.6); x.fill(); x.restore(); break;
      case 'Stardust': x.fillStyle = p.c === '#3fd4ff' ? '#9fe6ff' : '#ffffff'; star(x, p.x, p.y, 1.4 * k + .6, p.rot); break;
    }
  }
  x.globalAlpha = 1;
}
const fogR = a => 1 + .11 * Math.sin(3 * a + T * .23) + .07 * Math.sin(5 * a - T * .37 + 1.3) + .04 * Math.sin(9 * a + T * .61 + 4); // the fog's edge billows: lobes that slowly drift and change shape
function fogBlob(x, cx, cy, r, ph) { x.beginPath(); for (let k = 0; k <= 48; k++) { const a = k / 48 * TAU, rr = r * fogR(a + ph); k ? x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); }
/* ---- heavy fog: a volumetric-looking layer ----
   Thick haze with drifting density (two noise layers at different heights and speeds, world-anchored so moving shows
   parallax), a clearing round the snake with a soft falloff and torn, wispy edges, and light from lamps and flashlights
   scattering into it as a glow. Drawn at half resolution: it's all soft. */
function fogNoise(seed, size = 256, oct = 5) { // seamless fractal value noise, 0..1
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), img = x.createImageData(size, size), r = seeded(seed), acc = new Float32Array(size * size);
  let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) { const g = 4 << o, v = new Float32Array(g * g); for (let i = 0; i < v.length; i++) v[i] = r();
    for (let py = 0; py < size; py++) { const fy = py / size * g, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
      for (let px = 0; px < size; px++) { const fx = px / size * g, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % g, y1 = (y0 + 1) % g;
        const a = v[y0 * g + x0] + (v[y0 * g + x1] - v[y0 * g + x0]) * sx, b = v[y1 * g + x0] + (v[y1 * g + x1] - v[y1 * g + x0]) * sx; acc[py * size + px] += (a + (b - a) * sy) * amp; } }
    tot += amp; amp *= .5; }
  for (let i = 0; i < acc.length; i++) { const n = acc[i] / tot, k = clamp((n - .32) / .45, 0, 1); img.data[i * 4 + 3] = Math.round(k * k * (3 - 2 * k) * 255); } // contrast: puffs and gaps
  x.putImageData(img, 0, 0); return c;
}
const FOG = { };
function fogLayer(col, day) {
  const x = vctx; if (!FOG.n1) { FOG.n1 = fogNoise(71); FOG.n2 = fogNoise(133, 256, 4); FOG.tmp = document.createElement('canvas'); FOG.tmp.width = visC.width; FOG.tmp.height = visC.height; FOG.tx = FOG.tmp.getContext('2d'); }
  const fc = FOG.c || (FOG.c = { x: snake.x, y: snake.y, t: T }), dt = clamp(T - fc.t, 0, .1); fc.t = T; // the clearing lags a touch behind the snake
  if (Math.hypot(snake.x - fc.x, snake.y - fc.y) > 300) { fc.x = snake.x; fc.y = snake.y; } const k = 1 - Math.exp(-dt * 4); fc.x += (snake.x - fc.x) * k; fc.y += (snake.y - fc.y) * k;
  const cx = fc.x, cy = fc.y, R = 175, wind = [T * 9, T * 3.5], fq = SETTINGS.simpleFx ? 'Low' : SETTINGS.fogQ || 'High', hi = fq === 'High', mid = fq !== 'Low';
  const layer = (g, img, scale, ox, oy, alpha, op) => { g.save(); g.globalCompositeOperation = op; g.globalAlpha = alpha; const pat = g.createPattern(img, 'repeat'); g.translate(-(ox % (256 * scale)), -(oy % (256 * scale))); g.scale(scale, scale); g.fillStyle = pat; g.fillRect(-256, -256, (W + 1024) / scale, (H + 1024) / scale); g.restore(); };
  // 1. thick fog with uneven density: thin patches drift through it
  x.globalAlpha = 1; x.fillStyle = col; x.fillRect(-60, -60, W + 120, H + 120);

  // 2. the clearing: a smooth, deep falloff (no hard rim)
  x.globalCompositeOperation = 'destination-out';
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4);
  for (const [t, a] of [[0, 1], [.25, .98], [.42, .9], [.56, .72], [.68, .48], [.8, .25], [.9, .1], [1, 0]]) g.addColorStop(t, `rgba(0,0,0,${a})`);
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R * 1.4, 0, TAU); x.fill();
  // 3. torn edge: noise cut into a ring round the clearing, so wisps reach in and gaps reach out
  if (hi) { const t = FOG.tx; t.setTransform(.5, 0, 0, .5, 0, 0); t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, W, H);
    const rg = t.createRadialGradient(cx, cy, R * .55, cx, cy, R * 1.65); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(.3, 'rgba(0,0,0,.8)'); rg.addColorStop(.6, 'rgba(0,0,0,.3)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    t.fillStyle = rg; t.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4); layer(t, FOG.n1, 1.1, wind[0] * 1.6, wind[1] * 1.6, 1, 'destination-in');
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = .6; x.drawImage(FOG.tmp, 0, 0); x.restore();
    x.globalCompositeOperation = 'source-over'; x.fillStyle = col; // and a few fog tendrils drifting over the clear patch
    t.clearRect(0, 0, W, H); const ig = t.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1); ig.addColorStop(0, 'rgba(0,0,0,.0)'); ig.addColorStop(.45, 'rgba(0,0,0,.35)'); ig.addColorStop(1, 'rgba(0,0,0,0)');
    t.globalCompositeOperation = 'source-over'; t.fillStyle = ig; t.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4); layer(t, FOG.n2, .9, -wind[0] * 1.3, wind[1] * .8, 1, 'source-in');
    t.globalCompositeOperation = 'source-in'; t.fillStyle = col; t.fillRect(0, 0, W, H);
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = .55; x.drawImage(FOG.tmp, 0, 0); x.restore(); }
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  // 4. you can always make out your own body
  x.globalCompositeOperation = 'destination-out'; const sg = x.createRadialGradient(snake.x, snake.y, 0, snake.x, snake.y, 60); sg.addColorStop(0, 'rgba(0,0,0,1)'); sg.addColorStop(.6, 'rgba(0,0,0,.7)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = sg; x.fillRect(snake.x - 60, snake.y - 60, 120, 120);
  // 5. light scattering in the fog: lamps and flashlights glow through it (stronger in the dark)
  x.globalCompositeOperation = 'source-atop'; const night = clamp(1 - day * 1.3, .15, 1);
  if (hi) for (const l of lights || []) { const kk = typeof lightK === 'function' ? lightK(l) : 0; if (kk < .05 || l.kind === 'window') continue; const rr = l.r * 1.1, gg = x.createRadialGradient(l.x, l.y, 0, l.x, l.y, rr);
    gg.addColorStop(0, `rgba(${l.c},${(.45 * kk * night).toFixed(3)})`); gg.addColorStop(.35, `rgba(${l.c},${(.16 * kk * night).toFixed(3)})`); gg.addColorStop(1, `rgba(${l.c},0)`); x.fillStyle = gg; x.fillRect(l.x - rr, l.y - rr, rr * 2, rr * 2); }
  if (hi) for (const f of (typeof beams !== 'undefined' ? beams : [])) { const rr = (f.range || 200) * .7, bx = f.x + Math.cos(f.a || 0) * rr * .5, by = f.y + Math.sin(f.a || 0) * rr * .5, gg = x.createRadialGradient(bx, by, 0, bx, by, rr); gg.addColorStop(0, `rgba(255,240,210,${(.3 * (f.k || 1) * night).toFixed(3)})`); gg.addColorStop(1, 'rgba(255,240,210,0)'); x.fillStyle = gg; x.fillRect(bx - rr, by - rr, rr * 2, rr * 2); }
  // 6. a little shading so the fog has body: denser puffs a touch darker
  if (mid) { // body: billows lit from above (lighter) and their undersides (darker), drifting at two heights
    const lite = `rgba(255,255,255,${(.12 + .1 * day).toFixed(3)})`, dark = `rgba(0,0,10,${(.14 + .12 * (1 - day)).toFixed(3)})`, tint = (img, sc, ox, oy, c) => { const t = FOG.tx; t.setTransform(.5, 0, 0, .5, 0, 0); t.globalCompositeOperation = 'source-over'; t.clearRect(-10, -10, W + 20, H + 20); layer(t, img, sc, ox, oy, 1, 'source-over'); t.globalCompositeOperation = 'source-in'; t.fillStyle = c; t.fillRect(-10, -10, W + 20, H + 20); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.drawImage(FOG.tmp, 0, 0); x.restore(); };
    tint(FOG.n2, 2.4, wind[0] * .5, -wind[1] * .5 + 200, dark); tint(FOG.n1, 3.2, wind[0] * 1.2 + 90, wind[1] * 1.2, lite); }
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
}
function playerSees(x, y) { // 0..1 how visible a point is through heavy fog / tunnel vision
  if (!snake || (!MOD.fog && !MOD.fow)) return 1;
  const dx = x - snake.x, dy = y - snake.y, d = Math.hypot(dx, dy);
  if (MOD.fog) { const c = FOG.c || snake, dd = Math.hypot(x - c.x, y - c.y); return clamp(1 - (dd - 150) / 110, 0, 1); }
  const near = clamp(1 - (d - 52) / 22, 0, 1), ang = Math.abs(angDiff(snake.angle, Math.atan2(dy, dx)));
  const cone = clamp((.85 - ang) / .18, 0, 1) * clamp((285 - d) / 60, 0, 1);
  return Math.max(near, cone);
}
const [visC, vctx] = (() => { const c = document.createElement('canvas'); c.width = W / 2; c.height = H / 2; const x = c.getContext('2d'); x.setTransform(.5, 0, 0, .5, 0, 0); return [c, x]; })();
function drawVisionMask(x) { // opaque haze everywhere you can't see
  if (!snake || (!MOD.fog && !MOD.fow)) return;
  const day = light.day, col = MOD.fog ? `rgb(${Math.round(70 + 120 * day)},${Math.round(74 + 120 * day)},${Math.round(80 + 120 * day)})` : '#07070a';
  vctx.globalCompositeOperation = 'source-over'; vctx.clearRect(-60, -60, W + 120, H + 120);
  vctx.fillStyle = col; vctx.fillRect(-60, -60, W + 120, H + 120);
  vctx.globalCompositeOperation = 'destination-out';
  if ('filter' in vctx && !MOD.fog) vctx.filter = 'blur(10px)'; // fog fades with gradients instead
  vctx.fillStyle = '#000';
  if (MOD.fog) { vctx.globalCompositeOperation = 'source-over'; vctx.filter = 'none'; fogLayer(col, day); vctx.globalCompositeOperation = 'source-over'; x.drawImage(visC, 0, 0, W, H); fillOutside(x, col); return; }
  else {
    circ(vctx, snake.x, snake.y, 60);
    const g = vctx.createRadialGradient(snake.x, snake.y, 200, snake.x, snake.y, 290); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    vctx.fillStyle = g; vctx.beginPath(); vctx.moveTo(snake.x, snake.y); vctx.arc(snake.x, snake.y, 290, snake.angle - .85, snake.angle + .85); vctx.closePath(); vctx.fill();
  }
  if ('filter' in vctx) vctx.filter = 'none';
  vctx.globalCompositeOperation = 'source-over';
  x.drawImage(visC, 0, 0, W, H);
  if (MOD.fog && !SETTINGS.simpleFx) { // thin wisps drifting through the clear patch, so it never reads as a clean hole
    x.fillStyle = col;
    for (let k = 0; k < 5; k++) { const a = T * (.05 + k * .013) + k * 1.9, d = 60 + 40 * Math.sin(T * .09 + k * 2.3); x.globalAlpha = .06 + .03 * Math.sin(T * .3 + k); fogBlob(x, snake.x + Math.cos(a) * d, snake.y + Math.sin(a) * d, 34 + k * 6, k * 1.7); }
    x.globalAlpha = 1;
  }
  if (MOD.fow) { // walls you aren't looking at stay nearly black, but a faint trace nearby keeps you from driving blind into them
    x.save(); x.beginPath(); x.arc(snake.x, snake.y, 150, 0, TAU); x.clip();
    x.globalAlpha = .16; x.drawImage(outlineC, 0, 0, W, H); x.restore();
  }
  fillOutside(x, col); // the camera can lean past the map edge: keep that hidden too
}
function fillOutside(x, style) { // paints everything around the 0..W x 0..H world
  const m = 400; x.fillStyle = style;
  x.fillRect(-m, -m, W + 2 * m, m); x.fillRect(-m, H, W + 2 * m, m); x.fillRect(-m, 0, m, H); x.fillRect(W, 0, m, H);
}
const [snOC, snx] = makeLayer();
function drawSnakeNightRim(x) { // white rim at night, readable over dark ground and blood, with or without night vision
  if (!snake || !snake._pts || light.dark <= .3 || (SETTINGS.snakeOutline || 'Subtle') === 'Off' || snake.netHidden || !snake.alive) { if (snake && snake._rimBox) { const b = snake._rimBox; snx.clearRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); snake._rimBox = null; } return; } // dead (or burst, in multiplayer): no rim left hanging in the air
  const strong = SETTINGS.snakeOutline === 'Strong', pts = snake._pts, n = pts.length;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const g of pts) { if (g.x < x0) x0 = g.x; if (g.x > x1) x1 = g.x; if (g.y < y0) y0 = g.y; if (g.y > y1) y1 = g.y; }
  // (a lunge's after-images aren't rimmed: each carries its own dark outline, painted into it once, and re-rimming every one of them every frame was a big part of what a lunge cost)
  const pad = snakeRadius() + 6, prev = snake._rimBox; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  if (prev) snx.clearRect(prev[0], prev[1], prev[2] - prev[0], prev[3] - prev[1]); else snx.clearRect(-60, -60, W + 120, H + 120);
  snake._rimBox = [x0, y0, x1, y1];
  // one ring per segment, then every disc cut back out, leaving only the outer edge. Each circle is its own draw (the graphics
  // chip draws circles directly; all of them as one path would be rasterized over the whole body's box), solid white here and
  // made see-through when the layer goes on, so the overlapping rings don't add up
  snx.strokeStyle = '#fff'; snx.lineWidth = strong ? 3.6 : 2.4;
  for (let i = 0; i < n; i++) { const g = pts[i]; snx.beginPath(); snx.arc(g.x, g.y, segR(i, n) + .4, 0, TAU); snx.stroke(); }
  snx.globalCompositeOperation = 'destination-out'; snx.fillStyle = '#000'; // cut every disc back out, so one rim runs round the outside
  for (let i = 0; i < n; i++) { const g = pts[i]; snx.beginPath(); snx.arc(g.x, g.y, segR(i, n) + .4, 0, TAU); snx.fill(); }
  snx.globalCompositeOperation = 'source-over';
  if (MOD.fog || MOD.fow) { snx.globalCompositeOperation = 'destination-out'; snx.drawImage(visC, 0, 0, W, H); snx.globalCompositeOperation = 'source-over'; } // only the part of the body you can see
  const bx = Math.max(0, x0), by = Math.max(0, y0), bw = Math.min(W, x1) - bx, bh = Math.min(H, y1) - by;
  if (bw > 0 && bh > 0) { const ga = x.globalAlpha; x.globalAlpha = ga * (strong ? .95 : .8); x.drawImage(snOC, bx * DPR, by * DPR, bw * DPR, bh * DPR, bx, by, bw, bh); x.globalAlpha = ga; }
}
function drawGoldenFX(x) { // soft glow, orbiting glints and a ring that counts down the golden time
  for (const c of creatures) {
    if (!c.alive || !c.golden) continue;
    const a = playerSees(c.x, c.y); if (a <= .02) continue;
    const p = .5 + .5 * Math.sin(T * 5), r = 15 + p * 4, k = clamp(c.goldT / (c.goldMax || 30), 0, 1), low = k < .25;
    const g = x.createRadialGradient(c.x, c.y, 4, c.x, c.y, r + 8);
    g.addColorStop(0, `rgba(255,214,90,${.34 * a})`); g.addColorStop(1, 'rgba(255,214,90,0)');
    x.fillStyle = g; circ(x, c.x, c.y, r + 8);
    x.fillStyle = `rgba(255,248,210,${.95 * a})`;
    for (let n = 0; n < 3; n++) { const an = T * 2.2 + n * TAU / 3; star(x, c.x + Math.cos(an) * 14, c.y + Math.sin(an) * 14, 1.8 + p * 1.2, T * 3 + n); }
    const R = c.def.r + 11; // timer ring: a dim track plus the time that's left
    x.lineCap = 'round'; x.lineWidth = 2.2; x.strokeStyle = `rgba(60,40,0,${.45 * a})`; x.beginPath(); x.arc(c.x, c.y, R, 0, TAU); x.stroke();
    x.strokeStyle = low && Math.sin(T * 14) > 0 ? `rgba(255,120,60,${a})` : `rgba(255,214,70,${a})`; x.lineWidth = 2;
    x.beginPath(); x.arc(c.x, c.y, R, -Math.PI / 2, -Math.PI / 2 + TAU * k); x.stroke(); x.lineCap = 'butt';
  }
  for (let i = ringPops.length - 1; i >= 0; i--) { // ran out: the ring swells, pops and fades outward
    const q = ringPops[i]; q.t += 1 / 60; const e = q.t / .5; if (e >= 1) { ringPops.splice(i, 1); continue; }
    const px = q.c && q.c.alive ? q.c.x : q.x, py = q.c && q.c.alive ? q.c.y : q.y, R = 20 + 26 * (1 - Math.pow(1 - e, 3)), vis = playerSees(px, py);
    if (vis < .05) continue; x.globalAlpha = vis * (render.olk ?? 1); // only where you can actually see it
    x.strokeStyle = `rgba(255,214,70,${(1 - e) * .9})`; x.lineWidth = 3 * (1 - e) + .5; x.beginPath(); x.arc(px, py, R, 0, TAU); x.stroke();
    x.fillStyle = `rgba(255,240,190,${(1 - e) * .8})`; for (let n = 0; n < 8; n++) { const an = n * TAU / 8; circ(x, px + Math.cos(an) * (R + 4), py + Math.sin(an) * (R + 4), 1.6 * (1 - e) + .3); }
    x.globalAlpha = 1;
  }
}
let goldTimer = null;
function goldenBanner(animal, c) { // each golden target gets its own note; several stack instead of replacing each other
  if (animal) { notify({ kind: 'goldA', title: `Golden ${animal}!`, sub: 'Worth a fortune. Quick.', dur: 4, bar: true }); Sfx.golden(true); return; }
  const who = c && c.def.alien ? 'ALIEN' : c && c.type === 'astronaut' ? 'ASTRONAUT' : 'HUMAN';
  notify({ kind: 'goldH', title: 'GOLDEN ' + who, sub: 'Find them before the gold wears off.', dur: 5.5, bar: true }); Sfx.golden();
}
const [rimC, rimX] = makeLayer(), OUTLINE_FULL = 60; // how many of the nearest get the full outline
function drawTargetOutlines(x) { // clean silhouette rim around everything edible: black by day, white at night
  // every rim goes into one layer (stroke the outline, then cut the body out of it: only the outer rim stays, no lines
  // across heads or arms) and the layer is drawn once. A scratch canvas per creature meant a round trip to the graphics
  // chip for each of them, every frame.
  const night = light.dark > .3, col = night ? 'rgba(255,255,255,.78)' : 'rgba(0,0,0,.6)', prev = drawTargetOutlines.box;
  if (prev) rimX.clearRect(prev[0], prev[1], prev[2] - prev[0], prev[3] - prev[1]);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  rimX.lineCap = rimX.lineJoin = 'round';
  const near = new Set(); // the full outline (arms, legs, tails) for the ones close to you; further out, just body and head, which is far cheaper
  if (snake) { const d2 = []; for (const c of creatures) if (c.alive && !c.def.fly) d2.push([dist2(c.x, c.y, snake.x, snake.y), c]); if (d2.length > OUTLINE_FULL) d2.sort((a, b) => a[0] - b[0]); for (let i = 0; i < Math.min(OUTLINE_FULL, d2.length); i++) if (d2[i][0] < 900 * 900) near.add(d2[i][1]); }
  for (const c of creatures) { // one small shape per creature (one big merged path is what chokes a graphics chip)
    if (!c.alive || c.def.fly) continue;
    const a = playerSees(c.x, c.y); if (a <= .02) continue;
    const hz = c.hz || 0, k = 1 + hz * .045, cy = c.y - hz * .7; // the rim rides up with a hop
    rimX.save(); rimX.translate(c.x, cy); rimX.scale(k, k); rimX.rotate(c.a); creaturePose(rimX, c); if (c.def.human) humanBob(rimX, c); // sways and bobs with the body
    const f = creatureSil(c, !near.has(c)).f; // the whole silhouette: body, head, arms, legs, tails and ears, as one shape
    rimX.globalAlpha = a; rimX.strokeStyle = c.golden ? '#ffcf33' : col; rimX.lineWidth = c.golden ? 3.2 : 2; rimX.stroke(f); // a rim round it...
    rimX.globalAlpha = 1; rimX.globalCompositeOperation = 'destination-out'; rimX.fill(f); rimX.globalCompositeOperation = 'source-over'; // ...then the body cut out, so only the outer edge stays
    rimX.restore();
    if (c.x - 22 < x0) x0 = c.x - 22; if (cy - 22 < y0) y0 = cy - 22; if (c.x + 22 > x1) x1 = c.x + 22; if (cy + 22 > y1) y1 = cy + 22;
  }
  if (x1 < x0) { drawTargetOutlines.box = null; return; }
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1)); drawTargetOutlines.box = [x0, y0, x1, y1];
  x.globalAlpha = render.olk ?? 1;
  x.drawImage(rimC, x0 * DPR, y0 * DPR, (x1 - x0) * DPR, (y1 - y0) * DPR, x0, y0, x1 - x0, y1 - y0); x.globalAlpha = 1; // only the part that has rims in it
}
function drawBubbles(x) {
  const fs = { Small: 8.5, Normal: 10, Large: 12.5 }[SETTINGS.bubbleSize] || 10, bh = fs + 5;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const segC = []; if (snake) for (let i = 0; i < Math.min(snake.segs.length, 24); i += 2) segC.push(worldToCanvas(snake.segs[i].x, snake.segs[i].y)); // drawn in screen space: the same size at any zoom
  for (const c of creatures) { // stacked bubbles: newest next to the head, older ones pushed up
    if (!c.alive || !c.bubbles || !c.bubbles.length) continue;
    let seeA = playerSees(c.x, c.y); // hidden in fog, and fading out with distance so far-off chatter doesn't clutter the screen
    if (snake && !pregame()) { const d = Math.hypot(c.x - snake.x, c.y - snake.y), k = clamp(1 - (d - 130) / 220, 0, 1); seeA *= k * k * (3 - 2 * k); } // before the run starts, you can hear the whole map
    if (seeA <= .02) continue;
    const vis = c.bubbles.filter(b => b.delay <= 0).slice(-3), P = worldToCanvas(c.x, c.y - 12);
    if (P.x < -60 || P.x > W + 60 || P.y < -20 || P.y > H + 60) continue; // zoomed in: off screen
    let cy = P.y - 2 - bh / 2;
    const Pc = worldToCanvas(c.x, c.y), under = segC.some(g => Math.abs(g.x - Pc.x) < 48 && Math.abs(g.y - Pc.y) < 48); // the snake right on (or under) the speaker: all their bubbles fade too
    for (let k = vis.length - 1; k >= 0; k--) {
      const b = vis[k];
      const txt = b.act ? `*${b.text}*` : b.cps ? b.text.slice(0, Math.max(1, shownLen(b))) : b.text;
      x.font = b.act ? `italic 600 ${fs * .92}px "Segoe UI", sans-serif` : `${b.yell ? 800 : 600} ${fs}px "Segoe UI", sans-serif`;
      const w = x.measureText(txt).width + 9, pop = Math.min(1, b.t / .14), sc = .6 + .4 * (1 - Math.pow(1 - pop, 3));
      const bx = clamp(P.x + (vis.length - 1 - k) * 5, w / 2 + 2, W - w / 2 - 2), by = Math.max(bh, cy);
      let near = under; // fade bubbles the snake is under, so they never hide the action
      for (let i = 0; i < segC.length && !near; i++) { const g = segC[i]; near = Math.abs(g.x - bx) < w / 2 + 22 && Math.abs(g.y - by) < bh / 2 + 22; }
      b.fa = (b.fa ?? 1) + ((near ? .18 : 1) - (b.fa ?? 1)) * .25;
      x.save(); x.globalAlpha = Math.min(1, (b.life - b.t) * 3) * b.fa * seeA; x.translate(bx + (b.yell ? Math.sin(T * 47 + k * 3 + c.x) * .7 : 0), by + (b.yell ? Math.cos(T * 53 + c.y) * .6 : 0)); x.scale(sc, sc); // shouting shakes
      x.fillStyle = b.act ? 'rgba(30,24,28,.82)' : b.yell ? '#fff' : 'rgba(244,244,244,.95)'; rrect(x, -w / 2, -bh / 2, w, bh, 5); x.fill();
      if (k === vis.length - 1 && !b.act) { x.beginPath(); x.moveTo(P.x - bx - 4, bh / 2 - 1); x.lineTo(P.x - bx + 1, bh / 2 + 5); x.lineTo(P.x - bx + 4, bh / 2 - 1); x.fill(); }
      x.fillStyle = b.act ? '#e8dcd2' : b.yell ? '#a10000' : '#3a3236'; x.fillText(txt, 0, .5);
      x.restore();
      cy -= bh + 2;
    }
  }
  x.globalAlpha = 1; x.textBaseline = 'alphabetic';
}
function applyView(x) { // shake, spawn zoom and look-ahead, shared by the scene and every overlay pass
  x.translate(V.sx, V.sy);
  if (V.z) { x.translate(W / 2, H / 2); x.scale(V.z, V.z); x.translate(-V.fx, -V.fy); }
  x.translate(-V.ox, -V.oy);
}
const NEAR_IDS = ['hudbar', 'chhud', 'modhud', 'combo', 'rewards', 'modbar', 'abil', 'notes', 'lvlup', 'evt', 'mpHud']; // mpHud: the multiplayer score panel, only there during a run
let nearRects = null, nearRectT = 0;
function hudNear() { // corner UI turns half see-through while the snake is close to it
  if (!snake) return;
  const cr = cv.getBoundingClientRect(); if (!cr.width) return;
  if (!nearRects || UT - nearRectT > .25) { // measure the HUD boxes in board units (twice a second is plenty)
    nearRectT = UT; nearRects = NEAR_IDS.map(id => document.getElementById(id)).filter(Boolean).map(el => { const r = el.getBoundingClientRect();
      return { el, x0: (r.left - cr.left) / cr.width * W, y0: (r.top - cr.top) / cr.height * H, x1: (r.right - cr.left) / cr.width * W, y1: (r.bottom - cr.top) / cr.height * H, empty: !r.width }; });
  }
  document.getElementById('chhud').classList.toggle('dim', state === 'play' && run.time > 4); // the checklist steps back once you're playing
  const pts = snake.segs.filter((g, i) => i % 3 === 0), pad = 30, ah = Math.cos(snake.angle), av = Math.sin(snake.angle); // the whole body, not just the head
  pts.push({ x: snake.x + ah * 90, y: snake.y + av * 90 }); // where the head is about to be: fade before it gets there
  for (const b of nearRects) {
    const near = !b.empty && state !== 'menu' && pts.some(g => { const q = worldToCanvas(g.x, g.y); return q.x > b.x0 - pad && q.x < b.x1 + pad && q.y > b.y0 - pad && q.y < b.y1 + pad; });
    if (near) b.el.nearT = UT; const on = near || UT - (b.el.nearT ?? -9) < .7; // stays faded a moment after the body clears
    if (b.el.classList.contains('near') !== on) b.el.classList.toggle('near', on);
  }
}

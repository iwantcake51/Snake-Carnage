/* =========================================================
   LOOP
   ========================================================= */
let UT = 0, rotT = 0; // UI clock keeps running while the world is paused
function update(dt) {
  UT += dt;
  if ((rotT -= dt) <= 0) { rotT = .5; checkRotation(); updateRotClocks(); }
  if (state === 'menu' || state === 'paused' || state === 'held') return; // time stops: no AI, movement, blood or sounds
  if (state === 'dead') { // the world is frozen; only the camera settles and the death screen arrives
    shake *= Math.exp(-dt * 8); if (shake < .2) shake = 0;
    killV *= Math.exp(-dt * 1.4); killFlash *= Math.exp(-dt * 7);
    if (deadT > 0) { deadT -= dt; if (deadT <= 0) showDead(); }
    return;
  }
  T += dt;
  if (state === 'play') { updateSnake(dt); run.time += dt; crTick(dt); }
  updateCrowd();
  for (const c of creatures) if (c.alive) updateCreature(c, dt);
  updateBlood(dt); updateGiblets(dt); updateSplashes(dt);
  if ((fadeT -= dt) <= 0) { fadeT = 2; fadeBlood(); }
  updateTrail(dt);
  updateGround(dt);
  for (let i = respawnQ.length - 1; i >= 0; i--) { if ((respawnQ[i].t -= dt) <= 0) { spawn(respawnQ[i].type, respawnQ[i].zone); respawnQ.splice(i, 1); } }
  shake *= Math.exp(-dt * 8); if (shake < .2) shake = 0;
  killV *= Math.exp(-dt * 1.4);
  if (desatHold > 0) desatHold -= dt; else killFlash *= Math.exp(-dt * 7);
  const fk = Math.exp(-dt / 10); for (let i = 0; i < fresh.length; i++) fresh[i] *= fk;
  updateTime(dt);
  if (cam && !cam.hold) { cam.t += dt; if (state === 'intro' && cam.t > cam.dur * .8) state = 'ready'; if (cam.t >= cam.dur) cam = null; }
  updateCamFollow(dt); updateCombo(dt); updateEvents(dt);
  if (state === 'play' && (chT -= dt) <= 0) {
    chT = .5;
    const pan = creatures.filter(c => c.alive && c.def.human && c.state === 'panic').length;
    run.maxPanic = Math.max(run.maxPanic, pan); cr.maxPanic = Math.max(cr.maxPanic, pan);
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
      case 'Stardust': x.fillStyle = p.c === '#3fd4ff' ? '#9fe6ff' : '#ffffff'; star(x, p.x, p.y, 1.4 * k + .6, p.rot); break;
    }
  }
  x.globalAlpha = 1;
}
const OLC = document.createElement('canvas'), OLX = OLC.getContext('2d');
OLC.width = OLC.height = 80;
function playerSees(x, y) { // 0..1 how visible a point is through heavy fog / tunnel vision
  if (!snake || (!MOD.fog && !MOD.fow)) return 1;
  const dx = x - snake.x, dy = y - snake.y, d = Math.hypot(dx, dy);
  if (MOD.fog) return clamp(1 - (d - 105) / 70, 0, 1);
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
  if ('filter' in vctx) vctx.filter = 'blur(10px)';
  vctx.fillStyle = '#000';
  if (MOD.fog) { const g = vctx.createRadialGradient(snake.x, snake.y, 80, snake.x, snake.y, 180); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); vctx.fillStyle = g; circ(vctx, snake.x, snake.y, 180); }
  else {
    circ(vctx, snake.x, snake.y, 60);
    const g = vctx.createRadialGradient(snake.x, snake.y, 200, snake.x, snake.y, 290); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    vctx.fillStyle = g; vctx.beginPath(); vctx.moveTo(snake.x, snake.y); vctx.arc(snake.x, snake.y, 290, snake.angle - .85, snake.angle + .85); vctx.closePath(); vctx.fill();
  }
  if ('filter' in vctx) vctx.filter = 'none';
  vctx.globalCompositeOperation = 'source-over';
  x.drawImage(visC, 0, 0, W, H);
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
  if (!snake || !snake._pts || light.dark <= .3 || (SETTINGS.snakeOutline || 'Subtle') === 'Off') return;
  const strong = SETTINGS.snakeOutline === 'Strong', pts = snake._pts, n = pts.length;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const g of pts) { if (g.x < x0) x0 = g.x; if (g.x > x1) x1 = g.x; if (g.y < y0) y0 = g.y; if (g.y > y1) y1 = g.y; }
  const pad = CONFIG.snakeR + 6, prev = snake._rimBox; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  if (prev) snx.clearRect(prev[0], prev[1], prev[2] - prev[0], prev[3] - prev[1]); else snx.clearRect(-60, -60, W + 120, H + 120);
  snake._rimBox = [x0, y0, x1, y1]; snx.beginPath();
  for (let i = 0; i < n; i++) { const g = pts[i], r = segR(i, n) + .4; snx.moveTo(g.x + r, g.y); snx.arc(g.x, g.y, r, 0, TAU); }
  snx.strokeStyle = `rgba(255,255,255,${strong ? .95 : .8})`; snx.lineWidth = strong ? 3.6 : 2.4; snx.stroke();
  snx.globalCompositeOperation = 'destination-out'; snx.fill(); snx.globalCompositeOperation = 'source-over';
  if (MOD.fog || MOD.fow) { snx.globalCompositeOperation = 'destination-out'; snx.drawImage(visC, 0, 0, W, H); snx.globalCompositeOperation = 'source-over'; } // only the part of the body you can see
  const bx = Math.max(0, x0), by = Math.max(0, y0), bw = Math.min(W, x1) - bx, bh = Math.min(H, y1) - by;
  if (bw > 0 && bh > 0) x.drawImage(snOC, bx * DPR, by * DPR, bw * DPR, bh * DPR, bx, by, bw, bh);
}
function drawGoldenFX(x) { // soft pulsing glow + orbiting glints so golden humans stand out
  for (const c of creatures) {
    if (!c.alive || !c.golden) continue;
    const a = playerSees(c.x, c.y); if (a <= .02) continue;
    const p = .5 + .5 * Math.sin(T * 5), r = 15 + p * 4;
    const g = x.createRadialGradient(c.x, c.y, 4, c.x, c.y, r + 8);
    g.addColorStop(0, `rgba(255,214,90,${.38 * a})`); g.addColorStop(1, 'rgba(255,214,90,0)');
    x.fillStyle = g; circ(x, c.x, c.y, r + 8);
    x.fillStyle = `rgba(255,248,210,${.95 * a})`;
    for (let k = 0; k < 3; k++) { const an = T * 2.2 + k * TAU / 3; star(x, c.x + Math.cos(an) * 14, c.y + Math.sin(an) * 14, 1.8 + p * 1.2, T * 3 + k); }
    if (c.goldT < 8) { x.strokeStyle = `rgba(255,207,51,${.7 * a})`; x.lineWidth = 1.5; x.beginPath(); x.arc(c.x, c.y, 19, -Math.PI / 2, -Math.PI / 2 + TAU * c.goldT / 8); x.stroke(); } // running out
  }
}
let goldTimer = null;
function goldenBanner(animal) { // golden human: big gold note; golden animal: smaller and shorter
  if (animal) { notify({ kind: 'goldA', title: `Golden ${animal}!`, sub: 'Worth a fortune. Quick.', dur: 4, bar: true, key: 'gold' }); Sfx.golden(true); return; }
  notify({ kind: 'goldH', title: 'GOLDEN HUMAN', sub: 'Find them before they get away.', dur: 5.5, bar: true, key: 'gold' }); Sfx.golden();
}
function drawTargetOutlines(x) { // clean silhouette rim around everything edible: black by day, white at night
  const night = light.dark > .3, col = night ? 'rgba(255,255,255,.78)' : 'rgba(0,0,0,.6)';
  for (const c of creatures) {
    if (!c.alive) continue;
    let a = 1;
    a = playerSees(c.x, c.y); if (a <= .02) continue;
    // stroke the outline, then cut the body out of it: leaves only the outer rim, no lines across the head or arms
    OLX.setTransform(1, 0, 0, 1, 0, 0); OLX.clearRect(0, 0, 80, 80); OLX.setTransform(2, 0, 0, 2, 40, 40); OLX.rotate(c.a);
    shapePath(OLX, c);
    OLX.strokeStyle = c.golden ? '#ffcf33' : col; OLX.lineWidth = c.golden ? 3.2 : 2; OLX.stroke();
    OLX.globalCompositeOperation = 'destination-out'; OLX.fill(); OLX.globalCompositeOperation = 'source-over';
    x.globalAlpha = a; x.drawImage(OLC, c.x - 20, c.y - 20, 40, 40); x.globalAlpha = 1;
  }
}
function drawBubbles(x) {
  const fs = { Small: 8.5, Normal: 10, Large: 12.5 }[SETTINGS.bubbleSize] || 10, bh = fs + 5;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const c of creatures) { // stacked bubbles: newest next to the head, older ones pushed up
    if (!c.alive || !c.bubbles || !c.bubbles.length) continue;
    let seeA = playerSees(c.x, c.y); // hidden in fog, and fading out with distance so far-off chatter doesn't clutter the screen
    if (snake) { const d = Math.hypot(c.x - snake.x, c.y - snake.y), k = clamp(1 - (d - 130) / 220, 0, 1); seeA *= k * k * (3 - 2 * k); }
    if (seeA <= .02) continue;
    const vis = c.bubbles.filter(b => b.delay <= 0).slice(-3);
    let cy = c.y - 14 - bh / 2;
    for (let k = vis.length - 1; k >= 0; k--) {
      const b = vis[k];
      x.font = `${b.yell ? 800 : 600} ${fs}px "Segoe UI", sans-serif`;
      const w = x.measureText(b.text).width + 9, pop = Math.min(1, b.t / .14), sc = .6 + .4 * (1 - Math.pow(1 - pop, 3));
      const bx = clamp(c.x + (vis.length - 1 - k) * 5, w / 2 + 2, W - w / 2 - 2), by = Math.max(bh, cy);
      let near = false; // fade bubbles the snake is under, so they never hide the action
      if (snake) for (let i = 0; i < Math.min(snake.segs.length, 24) && !near; i += 2) {
        const g = snake.segs[i]; near = Math.abs(g.x - bx) < w / 2 + 22 && Math.abs(g.y - by) < bh / 2 + 22;
      }
      b.fa = (b.fa ?? 1) + ((near ? .18 : 1) - (b.fa ?? 1)) * .25;
      x.save(); x.globalAlpha = Math.min(1, (b.life - b.t) * 3) * b.fa * seeA; x.translate(bx, by); x.scale(sc, sc);
      x.fillStyle = b.yell ? '#fff' : 'rgba(244,244,244,.95)'; rrect(x, -w / 2, -bh / 2, w, bh, 5); x.fill();
      if (k === vis.length - 1) { x.beginPath(); x.moveTo(c.x - bx - 4, bh / 2 - 1); x.lineTo(c.x - bx + 1, bh / 2 + 5); x.lineTo(c.x - bx + 4, bh / 2 - 1); x.fill(); }
      x.fillStyle = b.yell ? '#a10000' : '#3a3236'; x.fillText(b.text, 0, .5);
      x.restore();
      cy -= bh + 2;
    }
  }
  x.globalAlpha = 1; x.textBaseline = 'alphabetic';
}
const V = { sx: 0, sy: 0, z: 0, fx: 0, fy: 0, ox: 0, oy: 0 };
function applyView(x) { // shake, spawn zoom and look-ahead, shared by the scene and every overlay pass
  x.translate(V.sx, V.sy);
  if (V.z) { x.translate(W / 2, H / 2); x.scale(V.z, V.z); x.translate(-V.fx, -V.fy); }
  x.translate(-V.ox, -V.oy);
}

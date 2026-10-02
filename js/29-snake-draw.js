function drawSnake(x, s = snake, cfg = SETTINGS.snake) {
  const n = s.segs.length;
  // gentle side-to-side slither while moving (visual only; collisions use the real path)
  const moving = s === snake && s.started && s.alive && state === 'play';
  s.wv = (s.wv || 0) + ((moving ? 1 : 0) - (s.wv || 0)) * .08;
  const pts = s.segs.map((g, i) => {
    const amp = s.wv * 1.7 * Math.min(1, i / 4) * Math.max(0, 1 - i / (n + 6)), o = Math.sin(i * .55 - T * 9) * amp;
    return { x: g.x - Math.sin(g.a) * o, y: g.y + Math.cos(g.a) * o, a: g.a };
  });
  if (s === snake) s._pts = pts;
  const me = s === snake, lv = me ? upg('dash') : 0, lk = me ? lungeK(s) : 0, cam = me ? camoField(s, n) : null;
  if (lk > .01) drawLungeFx(x, s, pts, n, lk, lv);
  if (cam) refractBody(x, s, pts, n, cam);
  const camAvg = cam ? cam.avg : 0;
  const ol = SETTINGS.snakeOutline || 'Subtle';
  if (ol !== 'Off') { // visibility rim: faint light halo plus a dark edge, readable on any ground
    const strong = ol === 'Strong';
    x.globalAlpha = 1 - .65 * camAvg;
    for (const [grow, col] of [[strong ? 3.8 : 2.8, `rgba(255,255,255,${strong ? .24 : .11})`], [strong ? 1.9 : 1.3, `rgba(8,5,5,${strong ? .85 : .5})`]]) {
      x.fillStyle = col; x.beginPath();
      for (let i = 0; i < n; i++) { const g = pts[i], r = segR(i, n) + grow; x.moveTo(g.x + r, g.y); x.arc(g.x, g.y, r, 0, TAU); }
      x.fill();
    }
    x.globalAlpha = 1;
  }
  for (let i = n - 1; i >= 0; i--) {
    const g = pts[i], r = segR(i, n), a = cam ? cam.a[i] : 0;
    const sts = s.stains[i] || [], soak = Math.min(.55, sts.length / 50);
    let base = segColor(i, n, cfg);
    if (soak) base = mixColor(base, soakCol(sts), soak);
    if (a > .01) { base = mixColor(base, groundColAt(g.x, g.y), (.42 + .14 * cam.lv) * a); x.globalAlpha = 1 - (.56 + .06 * cam.lv) * a; } // takes on the colors around it
    x.fillStyle = base;
    circ(x, g.x, g.y, r);
    patternOverlay(x, g, r, i, cfg);
    if (sts.length) { x.save(); x.translate(g.x, g.y); x.rotate(g.a); x.drawImage(stainSprite(sts), -r, -r, r * 2, r * 2); x.restore(); }
    x.globalAlpha = 1;
  }
  x.save(); x.translate(s.x, s.y); x.rotate(s.angle);
  if (cam) x.globalAlpha = 1 - .55 * cam.a[0];
  drawEyes(x, cfg, segColor(0, n, cfg));
  drawHat(x, cfg.hat);
  x.restore();
  if (cam) camoSheen(x, pts, n, cam);
}
/* ---- LUNGE: motion ghosts, a wake that bends the air behind, speed streaks. Strongest at peak speed ---- */
let streaks = [];
function lungeK(s) { // 0..1 lunge momentum: snaps in, peaks early, eases out after it ends
  const dur = ABIL.dash.dur, on = s.dashT > 0, t = on ? dur - s.dashT : 0;
  const target = on ? sstep(0, .07, t) * (.4 + .6 * sstep(0, dur * .75, s.dashT)) : 0, cur = s.lk || 0;
  s.lk = cur + (target - cur) * (target > cur ? .45 : .1);
  const h = s.wake || (s.wake = []); // where the head has been lately (not s.hist: that's the body's path): the wake trails behind it
  if (!h.length || h[h.length - 1].t !== T) h.push({ x: s.x, y: s.y, t: T, a: s.angle });
  while (h.length && T - h[0].t > .45) h.shift();
  return s.lk < .01 ? 0 : s.lk;
}
function histAt(s, back) { const h = s.wake || [], t = T - back; for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= t) return h[i]; return h[0]; }
function drawLungeFx(x, s, pts, n, k, lv) {
  const m = x.getTransform(), sc = Math.hypot(m.a, m.b);
  // the wake: the ground behind the head is magnified and pushed out, like air shoved aside by something very fast
  for (let j = 1; j <= (lv > 1 ? 5 : 4); j++) {
    const hp = histAt(s, j * .05); if (!hp) break;
    const w = k * (1 - j / 6), R = (11 + j * 3.5) * (lv > 1 ? 1.15 : 1), P = m.transformPoint({ x: hp.x, y: hp.y }), mag = 1 + .16 * w;
    x.save(); x.beginPath(); x.arc(hp.x, hp.y, R, 0, TAU); x.clip();
    x.globalAlpha = .75 * w; x.setTransform(1, 0, 0, 1, 0, 0);
    const sr = R * sc, dr = sr * mag;
    x.drawImage(sceneC, P.x - sr, P.y - sr, sr * 2, sr * 2, P.x - dr, P.y - dr, dr * 2, dr * 2);
    x.restore();
    x.strokeStyle = `rgba(255,255,255,${(.13 * w).toFixed(3)})`; x.lineWidth = 1; x.beginPath(); x.arc(hp.x, hp.y, R * .92, hp.a + 1.2, hp.a + 5.1); x.stroke(); // the edge of the pressure wave
  }
  // motion ghosts: the body smeared backward along its own path
  const N = lv > 1 ? 4 : 3, col = segColor(0, n, SETTINGS.snake);
  for (let c = N; c >= 1; c--) {
    x.globalAlpha = .3 * k * (1 - c / (N + 1.5)); x.fillStyle = col; x.beginPath();
    for (let i = 0; i < n; i += 1) { const g = pts[i], d = c * k * (lv > 1 ? 6 : 5) * (1 - i / (n + 4)), r = segR(i, n) * (1 - .06 * c); const gx = g.x - Math.cos(g.a) * d, gy = g.y - Math.sin(g.a) * d; x.moveTo(gx + r, gy); x.arc(gx, gy, r, 0, TAU); }
    x.fill();
  }
  x.globalAlpha = 1;
  // speed streaks peeling off the sides
  if (k > .25 && Math.random() < k * (lv > 1 ? 1.4 : 1)) for (let q = 0; q < (lv > 1 ? 2 : 1); q++) {
    const i = Math.floor(Math.random() * Math.min(n, 14)), g = pts[i], side = Math.random() < .5 ? -1 : 1, off = segR(i, n) + rand(3, 9);
    streaks.push({ x: g.x - Math.sin(g.a) * off * side, y: g.y + Math.cos(g.a) * off * side, a: g.a, len: rand(16, 34) * k * (lv > 1 ? 1.3 : 1), t: 0, life: rand(.18, .3) });
  }
}
function drawStreaks(x) {
  const dt = Math.max(0, Math.min(.05, T - (drawStreaks.t ?? T))); drawStreaks.t = T;
  if (!streaks.length) return;
  x.lineCap = 'round';
  for (let i = streaks.length - 1; i >= 0; i--) {
    const p = streaks[i]; p.t += dt; if (p.t > p.life) { streaks.splice(i, 1); continue; }
    const f = 1 - p.t / p.life, ca = Math.cos(p.a), sa = Math.sin(p.a);
    x.strokeStyle = `rgba(255,255,255,${(.5 * f).toFixed(3)})`; x.lineWidth = 1.2 * f + .3;
    x.beginPath(); x.moveTo(p.x - ca * p.len * (.3 + p.t / p.life), p.y - sa * p.len * (.3 + p.t / p.life)); x.lineTo(p.x - ca * p.len * (1.3 + p.t / p.life), p.y - sa * p.len * (1.3 + p.t / p.life)); x.stroke();
  }
}
/* ---- CAMOUFLAGE: a refractive skin that dissolves in and out along the body by noise ---- */
function camoField(s, n) {
  const want = s.camoT > 0 ? 1 : 0, cur = s.cv || 0, dt = Math.max(0, Math.min(.05, T - (s.cvT ?? T))); s.cvT = T;
  s.cv = cur + Math.sign(want - cur) * Math.min(Math.abs(want - cur), dt * 1.7); // ~0.6s to fully take hold or fully drop
  if (s.cv < .005) return null;
  const lv = upg('camo'), a = new Float32Array(n); let sum = 0;
  for (let i = 0; i < n; i++) { // each patch of the body crosses over at its own moment, and the boundary crawls
    const th = .5 + .42 * perlin(i * .23 + 3.1, T * .45 + 7.7), v = s.cv * 1.36 - .18;
    a[i] = sstep(th - .14, th + .14, v); sum += a[i];
  }
  return { a, avg: sum / n, lv };
}
function refractBody(x, s, pts, n, cam) { // the background seen through the body, swirled and split slightly
  const m = x.getTransform(), sc = Math.hypot(m.a, m.b), G = 5;
  for (let g0 = 0; g0 < n; g0 += G) {
    let w = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; x.save(); x.beginPath();
    for (let i = g0; i < Math.min(n, g0 + G); i++) { const g = pts[i], r = segR(i, n) + .5; if (cam.a[i] < .02) continue; w += cam.a[i]; x.moveTo(g.x + r, g.y); x.arc(g.x, g.y, r, 0, TAU); x0 = Math.min(x0, g.x - r); y0 = Math.min(y0, g.y - r); x1 = Math.max(x1, g.x + r); y1 = Math.max(y1, g.y + r); }
    if (!w) { x.restore(); continue; }
    w /= G; x.clip();
    const A = m.transformPoint({ x: x0 - 4, y: y0 - 4 }), B = m.transformPoint({ x: x1 + 4, y: y1 + 4 }), sw = B.x - A.x, sh = B.y - A.y;
    const ang = T * 2.1 + g0 * .19, mag = (1.6 + .7 * cam.lv) * w * sc, ox = Math.cos(ang) * mag, oy = Math.sin(ang * 1.3) * mag;
    x.setTransform(1, 0, 0, 1, 0, 0);
    if (sw > 0 && sh > 0) {
      x.globalAlpha = .9 * w; x.drawImage(sceneC, A.x, A.y, sw, sh, A.x + ox, A.y + oy, sw, sh);
      x.globalAlpha = .35 * w; x.drawImage(sceneC, A.x, A.y, sw, sh, A.x - ox * .8, A.y - oy * .8, sw, sh); // a faint second image: the edge of the lens
    }
    x.restore();
  }
}
function camoSheen(x, pts, n, cam) { // flowing highlights across the skin and a thin bright rim, so you can still find yourself
  x.lineWidth = 1;
  for (let i = 0; i < n; i += 2) {
    const a = cam.a[i]; if (a < .05) continue;
    const g = pts[i], r = segR(i, n), st = T * 3.2 - i * .35;
    x.strokeStyle = `rgba(210,255,240,${(.42 * a).toFixed(3)})`; x.beginPath(); x.arc(g.x, g.y, r * .62, st, st + 1.1); x.stroke();
    x.strokeStyle = `rgba(160,220,255,${(.32 * a).toFixed(3)})`; x.beginPath(); x.arc(g.x + .6, g.y - .4, r + .6, st * .7 + 2, st * .7 + 3.3); x.stroke();
  }
}

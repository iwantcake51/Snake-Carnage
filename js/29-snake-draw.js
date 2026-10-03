function tubePath(x, pts, n, grow) { // the body as one smooth tapered tube: a rounded head, flanks following the spine, a pointed tail
  x.beginPath(); if (!n) return;
  const L = [], R = [];
  const HEAD = [1.14, 1.02, .93, .96]; // a slightly broad head over a narrower neck
  for (let i = 0; i < n; i++) { const g = pts[i], r = Math.max(.5, segR(i, n) * (n > 6 ? HEAD[i] || 1 : 1) + grow), nx = -Math.sin(g.a), ny = Math.cos(g.a); L.push([g.x - nx * r, g.y - ny * r]); R.push([g.x + nx * r, g.y + ny * r]); }
  const t = pts[n - 1], tr = segR(n - 1, n) + grow, tip = [t.x - Math.cos(t.a) * (tr * 1.6 + 3), t.y - Math.sin(t.a) * (tr * 1.6 + 3)];
  const side = P => { for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i]; x.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } };
  x.moveTo(L[0][0], L[0][1]); side(L); x.quadraticCurveTo(L[n - 1][0], L[n - 1][1], tip[0], tip[1]);
  const Rr = R.slice().reverse(); x.quadraticCurveTo(Rr[0][0], Rr[0][1], (Rr[0][0] + (Rr[1] || Rr[0])[0]) / 2, (Rr[0][1] + (Rr[1] || Rr[0])[1]) / 2); side(Rr.slice(1));
  const h = pts[0], hr = segR(0, n) * (n > 6 ? HEAD[0] : 1) + grow; x.lineTo(R[0][0], R[0][1]); x.arc(h.x, h.y, hr, h.a + Math.PI / 2, h.a - Math.PI / 2, true); x.closePath();
}
function drawSnake(x, s = snake, cfg = SETTINGS.snake) {
  const n = s.segs.length;
  // gentle side-to-side slither while moving (visual only; collisions use the real path)
  const moving = s === snake && s.started && s.alive && state === 'play';
  s.wv = (s.wv || 0) + ((moving ? 1 : 0) - (s.wv || 0)) * .08;
  const pts = s.segs.map((g, i) => {
    const amp = s.wv * 1.7 * Math.min(1, i / 4) * Math.max(0, 1 - i / (n + 6)), o = Math.sin(i * .55 - T * 9) * amp;
    return { x: g.x - Math.sin(g.a) * o, y: g.y + Math.cos(g.a) * o, a: g.a };
  });
  for (let i = 0; i < pts.length; i++) { // direction from the neighbours, not the raw heading: hard turns bend the tube smoothly instead of kinking it
    const pa = pts[Math.max(0, i - 2)], pb = pts[Math.min(pts.length - 1, i + 2)]; if (dist2(pa.x, pa.y, pb.x, pb.y) > 4) pts[i].a = Math.atan2(pa.y - pb.y, pa.x - pb.x); // (bunched-up segments right after growing keep their own heading)
  }
  if (s === snake) s._pts = pts;
  const me = s === snake, lv = me ? upg('dash') : 0, lk = me ? lungeK(s) : 0, cam = me ? camoField(s, n) : null;
  if (lk > .01 && !SETTINGS.simpleFx) drawLungeFx(x, s, pts, n, lk, lv);
  if (cam && !SETTINGS.simpleFx) refractBody(x, s, pts, n, cam);
  const camAvg = cam ? cam.avg : 0;
  const ol = SETTINGS.snakeOutline || 'Subtle';
  if (ol !== 'Off') { // visibility rim: faint light halo plus a dark edge, readable on any ground
    const strong = ol === 'Strong';
    x.globalAlpha = (1 - .65 * camAvg) * (me ? render.olk ?? 1 : 1);
    for (const [grow, col] of [[strong ? 3.8 : 2.8, `rgba(255,255,255,${strong ? .24 : .11})`], [strong ? 1.9 : 1.3, `rgba(8,5,5,${strong ? .85 : .5})`]]) {
      x.fillStyle = col; tubePath(x, pts, n, grow); x.fill();
    }
    x.globalAlpha = 1;
  }
  x.save(); tubePath(x, pts, n, 0); x.clip(); // one continuous body: every band and pattern lives inside the tube's outline
  const mid = k => { const p = pts[Math.max(0, Math.min(n - 1, k))], q = pts[Math.max(0, Math.min(n - 1, k + 1))]; return k < 0 ? { x: p.x + Math.cos(p.a) * 12, y: p.y + Math.sin(p.a) * 12, a: p.a } : k >= n - 1 ? { x: p.x - Math.cos(p.a) * 14, y: p.y - Math.sin(p.a) * 14, a: p.a } : { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, a: Math.atan2(p.y - q.y, p.x - q.x) }; };
  for (let i = n - 1; i >= 0; i--) {
    const g = pts[i], r = segR(i, n), a = cam ? cam.a[i] : 0;
    const sts = s.stains[i] || [], soak = Math.min(.55, sts.length / 50);
    let base = segColor(i, n, cfg);
    if (soak) base = mixColor(base, soakCol(sts), soak);
    if (a > .01) { base = mixColor(base, groundColAt(g.x, g.y), (.42 + .14 * cam.lv) * a); x.globalAlpha = 1 - (.56 + .06 * cam.lv + .2 * (cam.still || 0)) * a; } // takes on the colors around it
    const A = mid(i - 1), B = mid(i), W2 = r * 1.8, na = (o) => [-Math.sin(o.a) * W2, Math.cos(o.a) * W2], [ax, ay] = na(A), [bx, by] = na(B);
    x.fillStyle = base; x.beginPath(); x.moveTo(A.x + ax + Math.cos(A.a) * .4, A.y + ay + Math.sin(A.a) * .4); x.lineTo(B.x + bx, B.y + by); x.lineTo(B.x - bx, B.y - by); x.lineTo(A.x - ax + Math.cos(A.a) * .4, A.y - ay + Math.sin(A.a) * .4); x.closePath(); x.fill(); // a band of skin, overlapping the next a hair so no seam shows
    patternOverlay(x, g, r, i, cfg);
    if (sts.length) { x.save(); x.translate(g.x, g.y); x.rotate(g.a); x.drawImage(stainSprite(sts), -r, -r, r * 2, r * 2); x.restore(); }
    x.globalAlpha = 1;
  }
  patternStripes(x, pts, n, cfg);
  if (!SETTINGS.simpleFx) { // round it off: a lit ridge along the spine, darker flanks, a few scale rows
    x.lineJoin = 'round'; x.lineCap = 'round';
    const line = (ox, oy) => { x.beginPath(); for (let i = 0; i < n; i++) { const g = pts[i]; i ? x.lineTo(g.x + ox, g.y + oy) : x.moveTo(g.x + ox, g.y + oy); } };
    const R0 = CONFIG.snakeR;
    for (let k = 0; k < 5; k++) { x.strokeStyle = `rgba(0,0,0,${.07})`; x.lineWidth = 1 + k * 1.3; tubePath(x, pts, n, -.4); x.stroke(); } // flanks darken smoothly toward the edges
    for (let k = 0; k < 7; k++) { const t = k / 6; x.strokeStyle = `rgba(255,255,255,${.035 + t * .03})`; x.lineWidth = R0 * (1.5 - t * 1.25); line(-R0 * (.12 + t * .16), -R0 * (.14 + t * .18)); x.stroke(); } // a soft sheen: layered, widest and faintest outside, brightest on the ridge
    if (NATURAL.has(cfg.pattern) || cfg.pattern === 'Solid') { x.strokeStyle = 'rgba(0,0,0,.09)'; x.lineWidth = .7; // overlapping scale rows
      for (let i = 1; i < n - 2; i++) { const g = pts[i], r = segR(i, n), c = Math.cos(g.a), sn = Math.sin(g.a); for (const off of [-.5, 0, .5]) { const px = g.x - sn * r * off * 1.3, py = g.y + c * r * off * 1.3; x.beginPath(); x.arc(px, py, r * .34, g.a + 2.2, g.a + 4.1); x.stroke(); } } }
  }
  x.restore();
  x.save(); x.translate(s.x, s.y); x.rotate(s.angle);
  if (cam) x.globalAlpha = 1 - .55 * cam.a[0];
  drawEyes(x, cfg, segColor(0, n, cfg));
  drawHat(x, cfg.hat);
  x.restore();
  if (cam) camoSheen(x, pts, n, cam);
}
/* ---- LUNGE: blurred motion ghosts and a wake that bends the air behind. Strongest at peak speed ---- */
let streaks = [];
function lungeK(s) { // 0..1 lunge momentum: snaps in, peaks early, eases out after it ends
  const dur = ABIL.dash.dur, on = s.dashT > 0, t = on ? dur - s.dashT : 0;
  const sp = clamp(((s.dashV || 1) - 1) / ((s.dashK || 1.8) - 1), 0, 1), target = on ? sstep(0, .07, t) * (.4 + .6 * sp) : sp, cur = s.lk || 0; // follows the real speed: fades as the lunge loses momentum
  s.lk = cur + (target - cur) * (target > cur ? .45 : .1);
  const h = s.wake || (s.wake = []); // where the head has been lately (not s.hist: that's the body's path): the wake trails behind it
  if (!h.length || h[h.length - 1].t !== T) h.push({ x: s.x, y: s.y, t: T, a: s.angle });
  while (h.length && T - h[0].t > .45) h.shift();
  return s.lk < .01 ? 0 : s.lk;
}
function histAt(s, back) { const h = s.wake || [], t = T - back; for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= t) return h[i]; return h[0]; }
function drawLungeFx(x, s, pts, n, k, lv) {
  const m = x.getTransform(), sc = Math.hypot(m.a, m.b);
  const W0 = histAt(s, .3) || s, gr = grabScene(m.transformPoint({ x: Math.min(s.x, W0.x) - 40, y: Math.min(s.y, W0.y) - 40 }), m.transformPoint({ x: Math.max(s.x, W0.x) + 40, y: Math.max(s.y, W0.y) + 40 }));
  // the wake: the ground behind the head is magnified and pushed out, like air shoved aside by something very fast
  for (let j = 1; j <= (lv > 1 ? 5 : 4); j++) {
    const hp = histAt(s, j * .05); if (!hp) break;
    const w = k * (1 - j / 6), R = (11 + j * 3.5) * (lv > 1 ? 1.15 : 1), P = m.transformPoint({ x: hp.x, y: hp.y }), mag = 1 + .16 * w;
    x.save(); x.beginPath(); x.arc(hp.x, hp.y, R, 0, TAU); x.clip();
    x.globalAlpha = .75 * w; x.setTransform(1, 0, 0, 1, 0, 0);
    const sr = R * sc, dr = sr * mag;
    if (gr) x.drawImage(grabC, P.x - sr - gr.sx, P.y - sr - gr.sy, sr * 2, sr * 2, P.x - dr, P.y - dr, dr * 2, dr * 2);
    x.restore();
    x.strokeStyle = `rgba(255,255,255,${(.13 * w).toFixed(3)})`; x.lineWidth = 1; x.beginPath(); x.arc(hp.x, hp.y, R * .92, hp.a + 1.2, hp.a + 5.1); x.stroke(); // the edge of the pressure wave
  }
  // motion ghosts: the body smeared backward along its own path
  const N = lv > 1 ? 4 : 3, col = segColor(0, n, SETTINGS.snake);
  if ('filter' in x) x.filter = `blur(${(1 + 4 * k).toFixed(1)}px)`; // a soft blur smeared out behind the body, fading as the speed bleeds off
  for (let c = N; c >= 1; c--) {
    x.globalAlpha = .5 * k * (1 - c / (N + 1.5)); x.fillStyle = col; x.beginPath();
    for (let i = 0; i < n; i += 1) { const g = pts[i], d = c * k * (lv > 1 ? 6 : 5) * (1 - i / (n + 4)), r = segR(i, n) * (1 - .06 * c); const gx = g.x - Math.cos(g.a) * d, gy = g.y - Math.sin(g.a) * d; x.moveTo(gx + r, gy); x.arc(gx, gy, r, 0, TAU); }
    x.fill();
  }
  if ('filter' in x) x.filter = 'none';
  x.globalAlpha = 1;
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
  const still = lv > 2 ? (s.still || 0) : 0; if (still) for (let i = 0; i < n; i++) a[i] = Math.min(1, a[i] * (1 + .25 * still)); // Stillness: fades further
  return { a, avg: sum / n, lv, still };
}
const grabC = document.createElement('canvas'), grx = grabC.getContext('2d');
function grabScene(A, B) { // copy just this patch of the frame once (drawing the scene onto itself forces a full copy every call)
  const sx = Math.max(0, Math.floor(A.x)), sy = Math.max(0, Math.floor(A.y)), sw = Math.min(sceneC.width, Math.ceil(B.x)) - sx, sh = Math.min(sceneC.height, Math.ceil(B.y)) - sy;
  if (sw <= 0 || sh <= 0) return null;
  if (grabC.width < sw || grabC.height < sh) { grabC.width = Math.max(grabC.width, sw); grabC.height = Math.max(grabC.height, sh); }
  grx.clearRect(0, 0, sw, sh); grx.drawImage(sceneC, sx, sy, sw, sh, 0, 0, sw, sh);
  return { sx, sy, sw, sh };
}
function refractBody(x, s, pts, n, cam) { // the background seen through the body, swirled and split slightly
  const m = x.getTransform(), sc = Math.hypot(m.a, m.b), G = 8;
  let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9; for (let i = 0; i < n; i++) { const g = pts[i]; bx0 = Math.min(bx0, g.x); by0 = Math.min(by0, g.y); bx1 = Math.max(bx1, g.x); by1 = Math.max(by1, g.y); }
  const gr = grabScene(m.transformPoint({ x: bx0 - 20, y: by0 - 20 }), m.transformPoint({ x: bx1 + 20, y: by1 + 20 })); if (!gr) return;
  for (let g0 = 0; g0 < n; g0 += G) {
    let w = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; x.save(); x.beginPath();
    for (let i = g0; i < Math.min(n, g0 + G); i++) { const g = pts[i], r = segR(i, n) + .5; if (cam.a[i] < .02) continue; w += cam.a[i]; x.moveTo(g.x + r, g.y); x.arc(g.x, g.y, r, 0, TAU); x0 = Math.min(x0, g.x - r); y0 = Math.min(y0, g.y - r); x1 = Math.max(x1, g.x + r); y1 = Math.max(y1, g.y + r); }
    if (!w) { x.restore(); continue; }
    w /= G; x.clip();
    const A = m.transformPoint({ x: x0 - 4, y: y0 - 4 }), B = m.transformPoint({ x: x1 + 4, y: y1 + 4 }), sw = B.x - A.x, sh = B.y - A.y;
    const ang = T * 2.1 + g0 * .19, mag = (1.6 + .7 * cam.lv) * w * sc, ox = Math.cos(ang) * mag, oy = Math.sin(ang * 1.3) * mag;
    x.setTransform(1, 0, 0, 1, 0, 0);
    if (sw > 0 && sh > 0) { const lx = A.x - gr.sx, ly = A.y - gr.sy;
      x.globalAlpha = .9 * w; x.drawImage(grabC, lx, ly, sw, sh, A.x + ox, A.y + oy, sw, sh);
      if (cam.lv > 1) { x.globalAlpha = .35 * w; x.drawImage(grabC, lx, ly, sw, sh, A.x - ox * .8, A.y - oy * .8, sw, sh); } // a faint second image: the edge of the lens
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

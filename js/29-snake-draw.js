/* ---- the body is one smooth tapered tube: a rounded head, flanks following the spine, a pointed tail. A long snake is
   drawn in short pieces cut across the body: the graphics chip rasterizes every outline, clip and stroke over its whole
   bounding box, and for a long snake as one shape that box is most of the screen (twice over with two players), while
   short pieces only cover the body itself. The pieces share their cut lines exactly, so together they make the same tube. ---- */
const TUBE_HEAD = [1.14, 1.02, .93, .96]; // a slightly broad head over a narrower neck
const TUBE_PIECE = 16; // segments per piece
function tubeBase(pts, n, cut) { // per segment, once a frame: the normal and the radius (every flank below is this plus or minus a little). cut: what's left of a body going up in a chain of explosions (no head)
  const N = new Float64Array(2 * n), rad = new Float64Array(n), hd = n > 6 && !cut;
  for (let i = 0; i < n; i++) { const a = pts[i].a; N[2 * i] = -Math.sin(a); N[2 * i + 1] = Math.cos(a); rad[i] = segR(i, n) * (hd ? TUBE_HEAD[i] || 1 : 1); }
  return { pts, n, N, rad, tr: segR(n - 1, n), hr: segR(0, n) * (hd ? TUBE_HEAD[0] : 1) };
}
function tubeEdges(B, grow) { // the flanks at this outset (inset if negative): control points L, R, and the cut points BL, BR between segments (cut 0 = the nose, cut n = the tail tip)
  const { pts, n, N, rad } = B, L = new Float64Array(2 * n), R = new Float64Array(2 * n), BL = new Float64Array(2 * n + 2), BR = new Float64Array(2 * n + 2);
  for (let i = 0; i < n; i++) { const g = pts[i], r = Math.max(.5, rad[i] + grow), nx = N[2 * i] * r, ny = N[2 * i + 1] * r; L[2 * i] = g.x - nx; L[2 * i + 1] = g.y - ny; R[2 * i] = g.x + nx; R[2 * i + 1] = g.y + ny; }
  for (let k = 1; k < n; k++) { BL[2 * k] = (L[2 * k - 2] + L[2 * k]) / 2; BL[2 * k + 1] = (L[2 * k - 1] + L[2 * k + 1]) / 2; BR[2 * k] = (R[2 * k - 2] + R[2 * k]) / 2; BR[2 * k + 1] = (R[2 * k - 1] + R[2 * k + 1]) / 2; }
  const t = pts[n - 1], tl = SEG_SNAKE && SEG_SNAKE.stump && SEG_SNAKE.alive ? (B.tr + grow) * .3 : (B.tr + grow) * 1.6 + 3, h = pts[0]; // a shot-off tail ends blunt
  BL[0] = L[0]; BL[1] = L[1]; BR[0] = R[0]; BR[1] = R[1];
  BL[2 * n] = BR[2 * n] = t.x - Math.cos(t.a) * tl; BL[2 * n + 1] = BR[2 * n + 1] = t.y - Math.sin(t.a) * tl;
  return { pts, n, L, R, BL, BR, hx: h.x, hy: h.y, ha: h.a, hr: B.hr + grow };
}
function tubeRun(x, E, a, b, ext = 0) { // adds the closed outline of the body from cut a to cut b; ext pushes cut a forward a little (a band tucks under the one in front, so no seam shows)
  const { L, R, BL, BR, n } = E; let ex = 0, ey = 0;
  if (ext && a > 0) { const p = E.pts[a - 1], q = E.pts[a], d = Math.hypot(p.x - q.x, p.y - q.y); if (d > 1e-6) { ex = (p.x - q.x) / d * ext; ey = (p.y - q.y) / d * ext; } }
  x.moveTo(BL[2 * a] + ex, BL[2 * a + 1] + ey); if (ex || ey) x.lineTo(BL[2 * a], BL[2 * a + 1]);
  for (let k = a + 1; k <= b; k++) x.quadraticCurveTo(L[2 * k - 2], L[2 * k - 1], BL[2 * k], BL[2 * k + 1]);
  if (b < n) x.lineTo(BR[2 * b], BR[2 * b + 1]);
  for (let k = b; k > a; k--) x.quadraticCurveTo(R[2 * k - 2], R[2 * k - 1], BR[2 * k - 2], BR[2 * k - 1]);
  if (a === 0) x.arc(E.hx, E.hy, E.hr, E.ha + Math.PI / 2, E.ha - Math.PI / 2, true);
  else if (ex || ey) x.lineTo(BR[2 * a] + ex, BR[2 * a + 1] + ey);
  x.closePath();
}
function tubeSides(x, E, a, b) { // adds just the flanks from cut a to cut b, as open lines (round the nose or the tail tip when the range reaches them)
  const { L, R, BL, BR, n } = E;
  const left = () => { for (let k = a + 1; k <= b; k++) x.quadraticCurveTo(L[2 * k - 2], L[2 * k - 1], BL[2 * k], BL[2 * k + 1]); };
  const right = () => { for (let k = b; k > a; k--) x.quadraticCurveTo(R[2 * k - 2], R[2 * k - 1], BR[2 * k - 2], BR[2 * k - 1]); };
  const nose = () => x.arc(E.hx, E.hy, E.hr, E.ha + Math.PI / 2, E.ha - Math.PI / 2, true);
  if (b === n) { x.moveTo(BL[2 * a], BL[2 * a + 1]); left(); right(); if (a === 0) { nose(); x.closePath(); } }
  else if (a === 0) { x.moveTo(BR[2 * b], BR[2 * b + 1]); right(); nose(); left(); }
  else { x.moveTo(BL[2 * a], BL[2 * a + 1]); left(); x.moveTo(BR[2 * b], BR[2 * b + 1]); right(); }
}
function tubePath(x, pts, n, grow) { x.beginPath(); if (n) tubeRun(x, tubeEdges(tubeBase(pts, n), grow), 0, n); } // the whole tube as one path (small snakes in the shop)
function drawSnake(x, s = snake, cfg = SETTINGS.snake) { const prev = SEG_SNAKE; SEG_SNAKE = s; try { return drawSnakeBody(x, s, cfg); } finally { SEG_SNAKE = prev; } }
function drawSnakeBody(x, s, cfg) {
  const n = s.segs.length;
  // gentle side-to-side slither while moving (visual only; collisions use the real path)
  const moving = s === snake ? s.started && s.alive && state === 'play' : !!s.netMoving; // a teammate: moving if their head is
  s.wv = (s.wv || 0) + ((moving ? 1 : 0) - (s.wv || 0)) * .08;
  const pts = s.segs.map((g, i) => {
    const amp = s.wv * 1.7 * AN.slither.amp * Math.min(1, i / 4) * Math.max(0, 1 - i / (n + 6)), o = Math.sin(i * .55 - animT('slither') * 9) * amp;
    return { x: g.x - Math.sin(g.a) * o, y: g.y + Math.cos(g.a) * o, a: g.a };
  });
  for (let i = 0; i < pts.length; i++) { // direction from the neighbours, not the raw heading: hard turns bend the tube smoothly instead of kinking it
    const pa = pts[Math.max(0, i - 2)], pb = pts[Math.min(pts.length - 1, i + 2)]; if (dist2(pa.x, pa.y, pb.x, pb.y) > 4) pts[i].a = Math.atan2(pa.y - pb.y, pa.x - pb.x); // (bunched-up segments right after growing keep their own heading)
  }
  if (s === snake) s._pts = pts;
  if (!n) return;
  const me = s === snake, lv = me ? upg('dash') : 0, lk = me ? lungeK(s) : 0, cam = me ? camoField(s, n) : null;
  if (lk > .01 && !SETTINGS.simpleFx) drawLungeFx(x, s, pts, n, lk, lv);
  dashGhosts(x, s, pts, n, cfg); // after-images left behind a lunge: any snake, yours or another player's
  if (cam && !SETTINGS.simpleFx) refractBody(x, s, pts, n, cam);
  const camAvg = cam ? cam.avg : 0, TB = tubeBase(pts, n, s.cut), E0 = tubeEdges(TB, 0), pieces = [];
  for (let a = 0; a < n; a += TUBE_PIECE) pieces.push([a, Math.min(n, a + TUBE_PIECE)]);
  const inPieces = (margin, fn, clipIf) => { // fn(a, b) once per piece, tail first, clipped to that piece of the body (unless clipIf(a, b) says it needn't be). margin > 0 lets each piece's clip overlap its neighbours (for opaque marks that may cross a cut); 0 = the exact piece (for see-through ones, so nothing is painted twice)
    for (let p = pieces.length - 1; p >= 0; p--) { const [a, b] = pieces[p]; if (clipIf && !clipIf(a, b)) { fn(a, b); continue; } x.save(); x.beginPath(); tubeRun(x, E0, Math.max(0, a - margin), Math.min(n, b + margin)); x.clip(); fn(a, b); x.restore(); }
  };
  const ol = SETTINGS.snakeOutline || 'Subtle';
  if (ol !== 'Off') { // visibility rim: faint light halo plus a dark edge, readable on any ground
    const strong = ol === 'Strong';
    x.globalAlpha = 1 - .65 * camAvg; // your own outline stays when everything else's drops out (dazed by a smash or a blast)
    for (const [grow, col] of [[strong ? 3.8 : 2.8, `rgba(255,255,255,${strong ? .24 : .11})`], [strong ? 1.9 : 1.3, `rgba(8,5,5,${strong ? .85 : .5})`]]) {
      const E = tubeEdges(TB, grow); x.fillStyle = col;
      for (const [a, b] of pieces) { x.beginPath(); tubeRun(x, E, a, b); x.fill(); }
    }
    x.globalAlpha = 1;
  }
  const skin = skinOf(cfg), F = skinFrame(pts, n, TB); // body-space coordinates for the skin's markings (29b-skins)
  // the skin's ground: one band per segment, each exactly its slice of the tube. The colour is worked out at every segment (skin, blood
  // soaking in, camouflage), then each band fades from the colour at its front cut to the one at its back cut, so a skin that changes
  // along the body flows from one segment into the next instead of stepping. Where neighbours match it's a plain fill
  const sc = new Array(n), sa = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const g = pts[i], a = cam ? cam.a[i] : 0, sts = s.stains[i], soak = sts ? Math.min(.28, sts.length / 100) : 0; // (half strength: blood on the body reads as half see-through)
    let base = skin.base(F.uSeg(i), cfg, F.uEnd);
    if (soak) base = mixColor(base, soakCol(sts), soak);
    if (a > .01) { base = mixColor(base, groundColAt(g.x, g.y), (.42 + .14 * cam.lv) * a); sa[i] = 1 - (.56 + .06 * cam.lv + .2 * (cam.still || 0)) * a; } // takes on the colors around it
    else sa[i] = 1;
    sc[i] = base;
  }
  const { BL, BR } = E0, paintOf = (c, al) => al < .999 ? rgbaOf(c, al.toFixed(3)) : c;
  const cutC = k => k <= 0 ? sc[0] : k >= n ? sc[n - 1] : sc[k - 1] === sc[k] ? sc[k] : mixColor(sc[k - 1], sc[k], .5), cutA = k => k <= 0 ? sa[0] : k >= n ? sa[n - 1] : (sa[k - 1] + sa[k]) / 2;
  // a noise skin fills the bands with its texture instead (blood stains and camouflage don't tint it; camouflage fades it). Each band is
  // two triangles cut along its diagonal, each mapped exactly onto its corners: neighbours share corners, so the texture never steps
  const pat = skin.tex ? skinPattern(x, cfg) : null, R = E0.R, fo = pat ? ((skin.tex.flow || 0) * T) % TEX.L : 0;
  const uc = k => (k <= 0 ? 0 : k >= n ? F.uEnd : (F.uSeg(k - 1) + F.uSeg(k)) / 2) - fo; // where each cut sits in the texture
  let cB = pat ? '' : cutC(n), aB = pat ? 1 : cutA(n); // the back cut of the band being drawn (tail first)
  for (let i = n - 1; i >= 0; i--) {
    const j = 2 * i;
    if (pat) {
      const tip = i === n - 1, ua = uc(i), ub = uc(i + 1), half = !tip && sa[i] > .999; x.globalAlpha = sa[i]; x.fillStyle = pat;
      if (!texTri(pat, ua, -1, ub, tip ? 0 : -1, ua, 1, BL[j], BL[j + 1], BL[j + 2], BL[j + 3], BR[j], BR[j + 1])) texBand(pat, F, pts, TB, i, fo); // the whole band (its left half shows)
      x.beginPath(); tubeRun(x, E0, i, i + 1, .4); x.fill();
      if (half && texTri(pat, ua, 1, ub, 1, ub, -1, BR[j], BR[j + 1], BR[j + 2], BR[j + 3], BL[j + 2], BL[j + 3])) { // its right half, over it
        x.beginPath(); x.moveTo(BR[j], BR[j + 1]); x.quadraticCurveTo(R[j], R[j + 1], BR[j + 2], BR[j + 3]); x.lineTo(BL[j + 2], BL[j + 3]); x.closePath(); x.fill(); }
    } else {
      const cF = cutC(i), aF = cutA(i), fx = (BL[j] + BR[j]) / 2, fy = (BL[j + 1] + BR[j + 1]) / 2, bx = (BL[j + 2] + BR[j + 2]) / 2, by = (BL[j + 3] + BR[j + 3]) / 2;
      if ((cF === cB && Math.abs(aF - aB) < .004) || Math.abs(fx - bx) + Math.abs(fy - by) < .05) x.fillStyle = paintOf(sc[i], sa[i]);
      else { const gr = x.createLinearGradient(fx, fy, bx, by); gr.addColorStop(0, paintOf(cF, aF)); gr.addColorStop(1, paintOf(cB, aB)); x.fillStyle = gr; }
      x.beginPath(); tubeRun(x, E0, i, i + 1, .4); x.fill(); // overlapping the band in front a hair, under it, so no seam shows
      cB = cF; aB = aF;
    }
  }
  x.globalAlpha = 1;
  // the skin's markings, then blood stains, on top of the ground. Each piece paints the markings anchored in its own stretch of body,
  // clipped to that stretch plus two segments either side, so a marking can run across a cut but is never painted twice
  const stained = (a, b) => { for (let i = a; i < b; i++) if (s.stains[i] && s.stains[i].length) return true; return false; };
  const markPiece = (a, b) => {
    if (skin.paint) { if (camAvg > .01) x.globalAlpha = 1 - .8 * camAvg; skin.paint(x, F, a ? F.uSeg(a) : -Infinity, b < n ? F.uSeg(b) : Infinity, cfg); x.globalAlpha = 1; }
    for (let i = b - 1; i >= a; i--) {
      const g = pts[i], r = segR(i, n), al = cam ? cam.a[i] : 0, sts = s.stains[i];
      if (!sts || !sts.length) continue;
      x.globalAlpha = SNAKE_BLOOD_A * (al > .01 ? 1 - (.56 + .06 * cam.lv + .2 * (cam.still || 0)) * al : 1); // blood on the body is half see-through: the skin shows through it
      x.save(); x.translate(g.x, g.y); x.rotate(g.a); x.drawImage(stainSprite(sts), -r * 2, -r * 2, r * 4, r * 4); x.restore(); // (twice the segment: the body's outline is the clip)
      x.globalAlpha = 1;
    }
  };
  if (skin.paint || stained(0, n)) inPieces(2, markPiece, (a, b) => !!skin.paint || stained(a, b)); // blood is clipped to the body wherever there is any (its sprites reach past their own segment)
  if (!SETTINGS.simpleFx) { // round it off: a lit ridge along the spine, darker flanks, a few scale rows
    const R0 = CONFIG.snakeR * (s.scale || 1), Ein = tubeEdges(TB, -.4), gl = skin.gloss ?? 1;
    const rows = skin.scales && n < 70;
    inPieces(0, (a, b) => {
      const a1 = Math.max(0, a - 1), b1 = Math.min(n, b + 1); // a little past both cuts: the clip trims it back to this piece
      x.lineJoin = 'round'; x.lineCap = 'round';
      x.beginPath(); tubeSides(x, Ein, a1, b1); for (const [w, al] of [[5.5, .1], [2, .14]]) { x.strokeStyle = `rgba(0,0,0,${al})`; x.lineWidth = w; x.stroke(); } // flanks darken toward the edges (one path, two soft strokes)
      const i0 = Math.max(0, a - 2), i1 = Math.min(n - 1, b + 1);
      const line = (ox, oy) => { x.beginPath(); for (let i = i0; i <= i1; i++) { const g = pts[i]; i > i0 ? x.lineTo(g.x + ox, g.y + oy) : x.moveTo(g.x + ox, g.y + oy); } };
      for (const [w, al, o] of [[1.35, .05, .14], [.85, .06, .2], [.4, .08, .27]]) { x.strokeStyle = `rgba(255,255,255,${(al * gl).toFixed(3)})`; x.lineWidth = R0 * w; line(-R0 * o, -R0 * (o + .03)); x.stroke(); } // a soft sheen: three layers, widest and faintest outside, brightest on the ridge
      if (rows) { x.strokeStyle = 'rgba(0,0,0,.08)'; x.lineWidth = .7; // overlapping scale rows
        for (let i = Math.max(1, a - 1); i < Math.min(n - 2, b + 1); i++) { const g = pts[i], r = segR(i, n), c = Math.cos(g.a), sn = Math.sin(g.a); for (const off of [-.5, 0, .5]) { const px = g.x - sn * r * off * 1.3, py = g.y + c * r * off * 1.3; x.beginPath(); x.arc(px, py, r * .34, g.a + 2.2, g.a + 4.1); x.stroke(); } } }
    }, () => true);
  }
  if (!s.cut) {
    x.save(); x.translate(s.x, s.y); x.rotate(s.angle); if (s.scale && s.scale !== 1) x.scale(s.scale, s.scale); // eyes and hat grow with the head
    if (cam) x.globalAlpha = 1 - .55 * cam.a[0];
    drawEyes(x, cfg, skin.base(0, cfg, F.uEnd));
    drawHat(x, cfg.hat);
    x.restore();
  }
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
  if (SETTINGS.fxLevel === 'Low') return;
  const W0 = histAt(s, .16) || s, gr = grabScene(m.transformPoint({ x: Math.min(s.x, W0.x) - 40, y: Math.min(s.y, W0.y) - 40 }), m.transformPoint({ x: Math.max(s.x, W0.x) + 40, y: Math.max(s.y, W0.y) + 40 }));
  // the wake: the ground behind the head is magnified and pushed out, like air shoved aside by something very fast
  for (let j = 1; j <= (SETTINGS.fxLevel === 'Low' ? 0 : lv > 1 ? 3 : 2); j++) { // (two or three ripples: each is a clip and a copy of that bit of the screen)
    const hp = histAt(s, j * .05); if (!hp) break;
    const w = k * (1 - j / 4), R = (11 + j * 5) * (lv > 1 ? 1.15 : 1), P = m.transformPoint({ x: hp.x, y: hp.y }), mag = 1 + .16 * w;
    x.save(); x.beginPath(); x.arc(hp.x, hp.y, R, 0, TAU); x.clip();
    x.globalAlpha = .75 * w; x.setTransform(1, 0, 0, 1, 0, 0);
    const sr = R * sc, dr = sr * mag;
    if (gr) x.drawImage(grabC, P.x - sr - gr.sx, P.y - sr - gr.sy, sr * 2, sr * 2, P.x - dr, P.y - dr, dr * 2, dr * 2);
    x.restore();
    x.strokeStyle = `rgba(255,255,255,${(.13 * w).toFixed(3)})`; x.lineWidth = 1; x.beginPath(); x.arc(hp.x, hp.y, R * .92, hp.a + 1.2, hp.a + 5.1); x.stroke(); // the edge of the pressure wave
  }
  x.globalAlpha = 1;
}
/* ---- dash after-images: while a snake lunges it drops a snapshot of its front half every few hundredths of a second; each one hangs in
   the air where it was, fading, so a lunge leaves a smeared trail of itself. Remote snakes too (their lunge flag).
   Each snapshot is painted once, when it's taken, into its own small canvas at a fraction of the resolution (outline, body
   and glowing core together); stretched back up, that low resolution is the blur. Every frame after that it is one
   drawImage. (It used to redraw every after-image, outline and core included, through a canvas blur filter, every frame:
   up to three dozen filtered fills a frame, most of what a lunge cost.) ---- */
const GHOST_LIFE = .45, GHOST_RES = .4; // how long one hangs in the air; the resolution it's painted at (lower = softer)
const ghostAt = (q, u) => { const back = 34 * u; return { a: .6 * Math.pow(1 - u, 1.4), shrink: 1 - .2 * u, ox: -Math.cos(q.a) * back, oy: -Math.sin(q.a) * back }; }; // each one drifts back the way you came as it fades
function ghostSprite(P, m, c1, c2) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < m; i++) { const r = P[3 * i + 2] + 2; x0 = Math.min(x0, P[3 * i] - r); y0 = Math.min(y0, P[3 * i + 1] - r); x1 = Math.max(x1, P[3 * i] + r); y1 = Math.max(y1, P[3 * i + 1] + r); }
  const pad = 4, k = GHOST_RES, w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2, c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * k)); c.height = Math.max(1, Math.ceil(h * k));
  const g = c.getContext('2d'); g.scale(k, k); g.translate(pad - x0, pad - y0);
  const ol = SETTINGS.snakeOutline || 'Subtle', strong = ol === 'Strong';
  const disc = (grow, step, sk) => { g.beginPath(); for (let i = 0; i < m; i += step) { const r = P[3 * i + 2] * sk * (1 - .35 * i / m) + grow, px = P[3 * i], py = P[3 * i + 1]; g.moveTo(px + r, py); g.arc(px, py, r, 0, TAU); } g.fill(); };
  if (ol !== 'Off') { g.globalAlpha = .7; g.fillStyle = `rgba(8,5,5,${strong ? .85 : .5})`; disc(strong ? 1.9 : 1.3, 1, 1); } // the trail wears the snake's outline too
  g.globalAlpha = .7; g.fillStyle = c1; disc(0, 1, 1);
  g.globalAlpha = .55; g.fillStyle = shade(c2, .25); disc(0, 2, .55); // a bright core, so it reads as a flash of the snake, not a smudge
  return { c, x0: x0 - pad, y0: y0 - pad, w, h };
}
function dashGhosts(x, s, pts, n, cfg) {
  const dashing = s.alive !== false && (s.dashT > 0 || (s === snake && (s.dashV || 1) > 1.2)), g = s.ghosts || (s.ghosts = []);
  if (dashing && !SETTINGS.simpleFx && T - (s.ghT ?? -9) > .05 && n) { s.ghT = T; // a fresh snapshot of the front of the body
    const m = Math.min(n, 60), P = new Float32Array(m * 3); for (let i = 0; i < m; i++) { P[3 * i] = pts[i].x; P[3 * i + 1] = pts[i].y; P[3 * i + 2] = segR(i, n); }
    g.push({ t: T, hx: P[0], hy: P[1], a: pts[0].a, spr: ghostSprite(P, m, segColor(0, n, cfg), segColor(Math.min(n - 1, 8), n, cfg)) }); if (g.length > 9) g.shift(); }
  while (g.length && T - g[0].t > GHOST_LIFE) g.shift();
  if (!g.length || SETTINGS.simpleFx) return;
  for (let j = 0; j < g.length; j++) { const q = g[j], u = (T - q.t) / GHOST_LIFE; if (u <= 0.02) continue; // the newest sits under the body anyway
    const { a, shrink, ox, oy } = ghostAt(q, u), S = q.spr;
    x.globalAlpha = a; x.drawImage(S.c, q.hx + (S.x0 - q.hx) * shrink + ox, q.hy + (S.y0 - q.hy) * shrink + oy, S.w * shrink, S.h * shrink); // (shrinking toward where the head was)
  }
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
const SNAKE_BLOOD_A = .82; // how solid the blood on a snake's body is (its edges and highlight carry the wet look, so it can sit a little thicker; the skin still shows through)
function grabScene(A, B, src = render.src) { // copy just this patch of the frame once (drawing the scene onto itself forces a full copy every call)
  const sx = Math.max(0, Math.floor(A.x)), sy = Math.max(0, Math.floor(A.y)), sw = Math.min(src.width, Math.ceil(B.x)) - sx, sh = Math.min(src.height, Math.ceil(B.y)) - sy;
  if (sw <= 0 || sh <= 0) return null;
  if (grabC.width < sw || grabC.height < sh) { grabC.width = Math.max(grabC.width, sw); grabC.height = Math.max(grabC.height, sh); }
  grx.clearRect(0, 0, sw, sh); grx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
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

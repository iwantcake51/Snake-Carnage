/* =========================================================
   OBSTACLE DRAWING: every prop seen from above, lit from the world's top-left like the snake's skins and hats
   (propKit below), each with its own material: wood grain, puffed fabric, brushed metal, glass, foliage, tin and shingles
   ========================================================= */
function drawChess(x, o, c) { // a giant turned-wood piece seen from above: stepped base rings, a lacquered body lit from the top-left, and the head that names it // a giant turned-wood piece seen from above: stepped base rings, a lacquered body lit from the top-left, and the head that names it
      const cx = o.x, cy = o.y, R0 = o.r, dark = c === '#2c2c33';
      const hi = dark ? '#6a6a78' : '#ffffff', mid = dark ? '#33333b' : '#ece5d6', lo = dark ? '#0b0b0e' : '#8f846f', line = dark ? 'rgba(0,0,0,.55)' : 'rgba(90,75,55,.4)';
      const disc = (r, k = 0) => { const g = x.createRadialGradient(cx - r * .45, cy - r * .5, r * .05, cx, cy, r); g.addColorStop(0, hi); g.addColorStop(.55 + k, mid); g.addColorStop(1, lo); x.fillStyle = g; circ(x, cx, cy, r); x.strokeStyle = line; x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, r - .5, 0, TAU); x.stroke(); };
      const shine = (px, py, r, a = .55) => { const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(255,255,255,${dark ? a * .45 : a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; circ(x, px, py, r); };
      x.fillStyle = 'rgba(0,0,0,.28)'; circ(x, cx + 1.5, cy + 2, R0); // felt pad under the base
      disc(R0, -.1); disc(R0 * .84); // the base: a wide foot and a step up
      x.strokeStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.6)'; x.lineWidth = 1.2; x.beginPath(); x.arc(cx, cy, R0 * .76, Math.PI * 1.05, Math.PI * 1.65); x.stroke(); // turned groove catching the light
      disc(R0 * .66, .05); // the body
      if (o.piece === 'rook') { // flat tower top with four square notches cut into the battlement ring
        disc(R0 * .54); x.fillStyle = dark ? '#000' : '#6f6552'; for (let a = 0; a < 4; a++) { x.save(); x.translate(cx, cy); x.rotate(a * TAU / 4 + TAU / 8); x.fillRect(R0 * .3, -R0 * .1, R0 * .26, R0 * .2); x.restore(); }
        const g = x.createRadialGradient(cx + 2, cy + 2, 0, cx, cy, R0 * .34); g.addColorStop(0, lo); g.addColorStop(1, mid); x.fillStyle = g; circ(x, cx, cy, R0 * .32); // hollow top
        shine(cx - R0 * .3, cy - R0 * .32, R0 * .18);
      } else if (o.piece === 'knight') { // the horse's head from above: long tapering muzzle, a tufted mane down the neck, two pointed ears
        x.save(); x.translate(cx, cy); x.rotate(-.55);
        const L = R0, g = x.createLinearGradient(0, -L * .4, 0, L * .4); g.addColorStop(0, dark ? '#70707e' : '#ffffff'); g.addColorStop(.45, mid); g.addColorStop(1, lo); x.fillStyle = g;
        x.beginPath(); x.moveTo(-L * .55, -L * .24); x.bezierCurveTo(-L * .1, -L * .36, L * .3, -L * .26, L * .68, -L * .11); x.quadraticCurveTo(L * .8, 0, L * .68, L * .11);
        x.bezierCurveTo(L * .3, L * .26, -L * .1, L * .36, -L * .55, L * .24); x.quadraticCurveTo(-L * .66, 0, -L * .55, -L * .24); x.fill(); x.strokeStyle = dark ? '#000' : '#7d7260'; x.lineWidth = 1.2; x.stroke();
        x.fillStyle = dark ? '#000' : '#6f6552'; for (let k = 0; k < 6; k++) { const t = k / 5, px = -L * .52 + t * L * .62; x.beginPath(); x.ellipse(px, (k % 2 ? 1 : -1) * L * .02, L * .07, L * .045, .4, 0, TAU); x.fill(); } // mane tufts along the crest
        for (const sy of [-1, 1]) { x.fillStyle = mid; x.beginPath(); x.moveTo(L * .02, sy * L * .1); x.lineTo(L * .24, sy * L * .22); x.lineTo(L * .2, sy * L * .06); x.closePath(); x.fill(); x.strokeStyle = lo; x.lineWidth = .8; x.stroke(); } // ears
        x.fillStyle = dark ? '#000' : '#5f5646'; x.beginPath(); x.ellipse(L * .3, -L * .17, L * .045, L * .03, 0, 0, TAU); x.ellipse(L * .3, L * .17, L * .045, L * .03, 0, 0, TAU); x.fill(); // eyes
        circ(x, L * .7, -L * .05, 1.3); circ(x, L * .7, L * .05, 1.3); // nostrils
        x.restore(); shine(cx - R0 * .2, cy - R0 * .25, R0 * .18, .45);
      } else if (o.piece === 'bishop') { // the mitre: a smooth dome with its diagonal slit and a small ball on top
        disc(R0 * .48, .1);
        x.save(); x.beginPath(); x.arc(cx, cy, R0 * .48, 0, TAU); x.clip(); x.strokeStyle = lo; x.lineWidth = R0 * .09; x.beginPath(); x.moveTo(cx - R0 * .1, cy - R0 * .5); x.lineTo(cx + R0 * .5, cy + R0 * .1); x.stroke(); x.restore();
        disc(R0 * .14); shine(cx - R0 * .22, cy - R0 * .24, R0 * .2);
      } else { // queen: a coronet of eight balls round a raised crown, the finial in the middle
        disc(R0 * .54);
        for (let a = 0; a < 8; a++) { const px = cx + Math.cos(a * TAU / 8) * R0 * .42, py = cy + Math.sin(a * TAU / 8) * R0 * .42, r = R0 * .1, g = x.createRadialGradient(px - r * .4, py - r * .4, 0, px, py, r); g.addColorStop(0, hi); g.addColorStop(1, lo); x.fillStyle = g; circ(x, px, py, r); }
        disc(R0 * .26, .1); disc(R0 * .11); shine(cx - R0 * .1, cy - R0 * .12, R0 * .14);
      }
      }
/* ---- the prop kit: every prop below is built from these few pieces, lit like the snake's skins and hats: from the world's
   top-left (it reads a turned prop's angle off the canvas, so the light never turns with the prop), a wash from light to shade
   across each surface, edges that catch the light on the near side and drop into shade on the far side, a darker rim, a glint
   on anything glossy, and real material (wood grain, puffed fabric, brushed metal, glass, leaves). Soft shadows only where one
   part sits on another: the shadows on the ground are the sun's (bakeShadows in 18-time-of-day) ---- */
let PK_ROT = 0, PK_FOR = null; // while a prop is drawn into its own cached canvas: the turn of the layer it will be stamped on, and that layer
function propKit(x) {
  const m = x.getTransform(), a = Math.atan2(m.b, m.a) + PK_ROT, ca = Math.cos(a), sa = Math.sin(a), w = -Math.SQRT1_2;
  const lx = ca * w + sa * w, ly = -sa * w + ca * w; // toward the light, turned into this frame
  const K = { x, lx, ly,
    lit(X, Y, W, H, col, hi = .14, lo = -.2) { // a straight wash from the lit corner to the far one
      const cx = X + W / 2, cy = Y + H / 2, d = Math.max(.5, (Math.abs(lx) * W + Math.abs(ly) * H) / 2), g = x.createLinearGradient(cx + lx * d, cy + ly * d, cx - lx * d, cy - ly * d);
      g.addColorStop(0, shade(col, hi)); g.addColorStop(.5, col); g.addColorStop(1, shade(col, lo)); return g; },
    rad(cx, cy, r, col, hi = .28, lo = -.34) { // a rounded surface: brightest toward the light, falling off into shade
      const g = x.createRadialGradient(cx + lx * r * .42, cy + ly * r * .42, r * .06, cx, cy, r * 1.06);
      g.addColorStop(0, shade(col, hi)); g.addColorStop(.55, col); g.addColorStop(1, shade(col, lo)); return g; },
    lin(x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([t, c]) => g.addColorStop(t, c)); return g; },
    rr(X, Y, W, H, r = 0) { r = Math.max(0, Math.min(r, W / 2, H / 2)); x.beginPath(); if (r < .3) { x.rect(X, Y, W, H); return; }
      x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); },
    round(cx, cy, r) { x.beginPath(); x.arc(cx, cy, Math.max(.1, r), 0, TAU); },
    oval(cx, cy, rx, ry, rot = 0) { x.beginPath(); x.ellipse(cx, cy, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); },
    poly(pts) { x.beginPath(); pts.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); },
    edge(col, wd = 1) { x.strokeStyle = col; x.lineWidth = wd; x.stroke(); },
    face(l) { return l[0] * lx + l[1] * ly; }, // how squarely a surface tipped toward (nx, ny) faces the light: -1..1
    bevel(f, d = 1.2, ha = .26, la = .24) { // the edges facing the light catch it, the far ones fall into shade (inside the shape only)
      x.save(); f(); x.clip(); x.lineWidth = d * 2;
      x.translate(-lx * d, -ly * d); f(); x.strokeStyle = `rgba(255,255,255,${ha})`; x.stroke();
      x.translate(2 * lx * d, 2 * ly * d); f(); x.strokeStyle = `rgba(0,0,0,${la})`; x.stroke(); x.restore(); },
    drop(f, d = 1.6, al = .28) { x.save(); x.translate(-lx * d, -ly * d); f(); x.fillStyle = `rgba(0,0,0,${al})`; x.fill(); x.restore(); }, // a part's shadow on whatever it sits on
    box(X, Y, W, H, col, o = {}) { const f = () => K.rr(X, Y, W, H, o.r ?? 1.5);
      if (o.sh) K.drop(f, o.sh, o.sa ?? .28);
      f(); x.fillStyle = o.fill || K.lit(X, Y, W, H, col, o.hi, o.lo); x.fill();
      if (o.bev !== 0) K.bevel(f, o.bev || clamp(Math.min(W, H) * .16, .5, 1.6), o.ha, o.la);
      if (o.ec !== 0) { f(); K.edge(o.ec || shade(col, -.5), o.ew ?? .8); } return f; },
    disc(cx, cy, r, col, o = {}) { const f = () => K.round(cx, cy, r);
      if (o.sh) K.drop(f, o.sh, o.sa ?? .28);
      f(); x.fillStyle = o.fill || (o.flat ? K.lit(cx - r, cy - r, 2 * r, 2 * r, col, o.hi, o.lo) : K.rad(cx, cy, r, col, o.hi, o.lo)); x.fill();
      if (o.bev) K.bevel(f, o.bev, o.ha, o.la);
      if (o.ec !== 0) { f(); K.edge(o.ec || shade(col, -.5), o.ew ?? .8); }
      if (o.gl) K.glint(cx, cy, r, o.gl); return f; },
    glint(cx, cy, r, al = .35) { x.save(); x.translate(cx + lx * r * .48, cy + ly * r * .48); x.rotate(Math.atan2(ly, lx) + Math.PI / 2); x.beginPath(); x.ellipse(0, 0, r * .38, r * .14, 0, 0, TAU); x.fillStyle = `rgba(255,255,255,${al})`; x.fill(); x.restore(); },
    grain(X, Y, W, H, col, horiz, seed, al = .3) { // wood: long, slightly wandering lines a shade darker than the board, now and then a knot
      const r = pseed(seed), L = horiz ? W : H, D = horiz ? H : W, n = Math.max(2, Math.round(D / 2.1)), st = Math.max(2, L / 24);
      x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip(); x.strokeStyle = shade(col, -.38); x.lineWidth = .55;
      for (let k = 0; k < n; k++) { const v = (k + .15 + r() * .7) / n * D, amp = .25 + r() * .6, ph = r() * TAU, fr = (.6 + r() * 1.6) / L * TAU;
        x.globalAlpha = al * (.35 + r() * .65); x.beginPath();
        for (let u = 0; u <= L + .01; u += st) { const vv = v + Math.sin(u * fr + ph) * amp; horiz ? (u ? x.lineTo(X + u, Y + vv) : x.moveTo(X + u, Y + vv)) : (u ? x.lineTo(X + vv, Y + u) : x.moveTo(X + vv, Y + u)); }
        x.stroke(); }
      if (L > 30 && r() < .6) { const u = L * (.2 + r() * .6), v = D * (.25 + r() * .5); x.globalAlpha = al; x.beginPath(); horiz ? x.ellipse(X + u, Y + v, 2.2, .9, 0, 0, TAU) : x.ellipse(X + v, Y + u, .9, 2.2, 0, 0, TAU); x.stroke(); }
      x.restore(); },
    plank(X, Y, W, H, col, horiz, seed, o = {}) { const f = K.box(X, Y, W, H, col, { r: o.r ?? .8, hi: .1, lo: -.14, ...o }); x.save(); f(); x.clip(); K.grain(X, Y, W, H, col, horiz, seed, o.ga ?? .32); x.restore(); return f; },
    cushion(X, Y, W, H, col, o = {}) { // puffed fabric: lit, sinking into shade toward its seams, a soft sheen on top
      const r = o.r ?? Math.min(W, H) * .3, f = () => K.rr(X, Y, W, H, r);
      if (o.sh) K.drop(f, o.sh, o.sa ?? .3);
      f(); x.fillStyle = K.rad(X + W / 2, Y + H / 2, Math.max(W, H) * .6, col, o.hi ?? .18, o.lo ?? -.2); x.fill();
      x.save(); f(); x.clip(); x.lineWidth = Math.min(W, H) * .32; f(); x.strokeStyle = 'rgba(0,0,0,.13)'; x.stroke(); x.restore();
      f(); K.edge(o.ec || shade(col, -.42), o.ew ?? .7); return f; },
    metal(X, Y, W, H, col, horiz, o = {}) { // brushed sheet: fine streaks along it and a broad band of sheen
      const f = () => K.rr(X, Y, W, H, o.r ?? 1.2);
      f(); x.fillStyle = K.lit(X, Y, W, H, col, o.hi ?? .18, o.lo ?? -.22); x.fill();
      x.save(); f(); x.clip(); const r = pseed(X * 3 + Y * 7 + 5);
      x.lineWidth = .5; for (let k = 0, n = Math.round((horiz ? H : W) / 1.6); k < n; k++) { const v = (k + r()) / n; x.strokeStyle = r() < .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)'; x.beginPath(); horiz ? (x.moveTo(X, Y + v * H), x.lineTo(X + W, Y + v * H)) : (x.moveTo(X + v * W, Y), x.lineTo(X + v * W, Y + H)); x.stroke(); }
      x.restore(); if (o.bev !== 0) K.bevel(f, o.bev || 1, .3, .26); if (o.ec !== 0) { f(); K.edge(o.ec || shade(col, -.45), o.ew ?? .7); } return f; },
    glass(X, Y, W, H, tint = '#a9d4e6', o = {}) { // a pane: tinted, lighter toward the light, two pale reflections slanting across
      const f = () => K.rr(X, Y, W, H, o.r ?? .8); f(); x.fillStyle = K.lit(X, Y, W, H, tint, o.hi ?? .22, o.lo ?? -.18); const ga = x.globalAlpha; x.globalAlpha = ga * (o.a ?? 1); x.fill(); x.globalAlpha = ga;
      x.save(); f(); x.clip(); x.fillStyle = 'rgba(255,255,255,.28)'; const s = Math.min(W, H), L = Math.max(W, H);
      for (const [t, wd] of [[.3, .5], [.42, .22]]) { x.beginPath(); const c = W >= H ? X + W * t : X + W / 2, d = W >= H ? Y + H / 2 : Y + H * t; x.save(); x.translate(c, d); x.rotate(W >= H ? -.9 : -.65); x.rect(-s * wd / 2, -L, s * wd, 2 * L); x.restore(); x.fill(); }
      x.restore(); if (o.ec !== 0) { f(); K.edge(o.ec || 'rgba(40,60,70,.55)', o.ew ?? .7); } return f; },
    leaves(cx, cy, r, col, seed, n = 9) { // a clump of foliage: overlapping leaf blobs, the outer ones first, each lit on its own
      const R = pseed(seed), L = [];
      for (let k = 0; k < n; k++) { const an = R() * TAU, d = Math.sqrt(R()) * r * .6; L.push([cx + Math.cos(an) * d, cy + Math.sin(an) * d, r * (.3 + R() * .22), shade(col, (R() - .5) * .18), d]); }
      L.sort((p, q) => q[4] - p[4]);
      x.fillStyle = shade(col, -.32); K.round(cx, cy, r * .82); x.fill();
      for (const [px, py, rr, c] of L) { x.fillStyle = K.rad(px, py, rr, c, .24, -.28); K.round(px, py, rr); x.fill(); } },
    leaf(px, py, len, wd, an, col) { // one long leaf from its stem out, lit across, a pale midrib
      x.save(); x.translate(px, py); x.rotate(an); const f = () => { x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * .45, -wd, len, 0); x.quadraticCurveTo(len * .45, wd, 0, 0); x.closePath(); };
      f(); x.fillStyle = K.lin(0, -wd, 0, wd, [[0, shade(col, .2)], [1, shade(col, -.22)]]); x.fill(); f(); K.edge(shade(col, -.45), .4);
      x.strokeStyle = shade(col, .35); x.lineWidth = .35; x.beginPath(); x.moveTo(len * .08, 0); x.lineTo(len * .88, 0); x.stroke(); x.restore(); },
    hole(cx, cy, r, col = '#141414') { const g = x.createRadialGradient(cx - lx * r * .45, cy - ly * r * .45, r * .05, cx, cy, r); g.addColorStop(0, shade(col, .8)); g.addColorStop(.6, col); g.addColorStop(1, shade(col, -.5)); K.round(cx, cy, r); x.fillStyle = g; x.fill(); }, // a hollow: the far side lit, the near side in shadow
    blob(pts) { x.beginPath(); const n = pts.length, mid = i => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2], m0 = mid(n - 1); x.moveTo(m0[0], m0[1]); for (let i = 0; i < n; i++) { const md = mid(i); x.quadraticCurveTo(pts[i][0], pts[i][1], md[0], md[1]); } x.closePath(); }, // a closed shape through these points, its corners rounded
    bolt(px, py, r = .8) { x.fillStyle = 'rgba(0,0,0,.35)'; K.round(px - lx * .4, py - ly * .4, r); x.fill(); x.fillStyle = 'rgba(255,255,255,.4)'; K.round(px + lx * .2, py + ly * .2, r * .7); x.fill(); },
  };
  return K;
}
const propSeed = (o, k = 0) => Math.abs(Math.round(o.x * 7.3 + o.y * 13.1 + (o.w || o.r || 0) * 3 + k * 101)) % 2147483646 + 1; // the same look for the same prop every time it's drawn
const pseed = s => seeded(Math.abs(Math.round(s)) % 2147483646 + 1);
function inFrame(x, cx, cy, ang, f) { x.save(); x.translate(cx, cy); x.rotate(ang); try { f(propKit(x)); } finally { x.restore(); } } // draw a part in its own turned frame, the light still from the world's top-left

const isWood = c => { const n = parseInt(c.slice(1), 16), r = n >> 16, b = n & 255; return r > b + 18; }; // warm browns are wood; the cool greys are metal
const BOOKS = ['#7a2e2a', '#2f3e56', '#3d5a3a', '#8a6a2a', '#d8cdb5', '#5a3a52', '#33353a', '#9c4a2a', '#4a6670', '#b89b62'];
function roofCourses(K, poly, n, X0, Y0, X1, Y1, metal, R) { // one slope: courses of shingles (or a barn's metal ribs) running along its eave, clipped to it
  const x = K.x, hzE = n[1] !== 0; // the eave runs across (a north or south slope) or down (east or west)
  x.save(); K.poly(poly); x.clip();
  if (metal) { // standing seams from the eave up to the ridge
    for (let p = hzE ? X0 : Y0, i = 0; p < (hzE ? X1 : Y1); p += 4.2, i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.09)'; hzE ? x.fillRect(p, Y0, 2.1, Y1 - Y0) : x.fillRect(X0, p, X1 - X0, 2.1); }
    x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = .5; x.beginPath(); for (let p = hzE ? X0 : Y0; p < (hzE ? X1 : Y1); p += 8.4) hzE ? (x.moveTo(p, Y0), x.lineTo(p, Y1)) : (x.moveTo(X0, p), x.lineTo(X1, p)); x.stroke();
  } else {
    const sp = 5, tab = 7, e0 = n[1] < 0 ? Y0 : n[1] > 0 ? Y1 : n[0] < 0 ? X0 : X1, dir = n[1] < 0 || n[0] < 0 ? 1 : -1, span = hzE ? Y1 - Y0 : X1 - X0;
    for (let k = 0; k * sp < span; k++) { // each course: a row of tabs, every other one a hair lighter or darker, the joints staggered
      const a = e0 + dir * k * sp, b = a + dir * sp, lo = Math.min(a, b), off = (k % 2) * tab / 2;
      for (let q = (hzE ? X0 : Y0) - off; q < (hzE ? X1 : Y1); q += tab) { const v = R(); if (v < .4) { x.fillStyle = v < .2 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.05)'; hzE ? x.fillRect(q, lo, tab, sp) : x.fillRect(lo, q, sp, tab); } }
      x.strokeStyle = 'rgba(0,0,0,.24)'; x.lineWidth = .7; x.beginPath(); hzE ? (x.moveTo(X0, a), x.lineTo(X1, a)) : (x.moveTo(a, Y0), x.lineTo(a, Y1)); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = .6; x.beginPath(); hzE ? (x.moveTo(X0, a + dir * .9), x.lineTo(X1, a + dir * .9)) : (x.moveTo(a + dir * .9, Y0), x.lineTo(a + dir * .9, Y1)); x.stroke();
      x.strokeStyle = 'rgba(0,0,0,.16)'; x.lineWidth = .5; x.beginPath(); for (let q = (hzE ? X0 : Y0) - off; q < (hzE ? X1 : Y1); q += tab) hzE ? (x.moveTo(q, a), x.lineTo(q, b)) : (x.moveTo(a, q), x.lineTo(b, q)); x.stroke();
    }
  }
  const g = K.lin(...(hzE ? [X0, n[1] < 0 ? Y0 : Y1, X0, n[1] < 0 ? Y1 : Y0] : [n[0] < 0 ? X0 : X1, Y0, n[0] < 0 ? X1 : X0, Y0]), [[0, 'rgba(0,0,0,.12)'], [.3, 'rgba(0,0,0,0)'], [1, 'rgba(255,255,255,.05)']]); // a touch darker down at the eave, lighter up at the ridge
  x.fillStyle = g; x.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  x.restore();
}
function chimney(K, cx, cy) { const x = K.x;
  K.box(cx - 6, cy - 6, 12, 12, '#7a5242', { r: .8, sh: 2.6, sa: .32 });
  x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = .5; x.beginPath(); for (let q = cy - 3; q < cy + 6; q += 3) { x.moveTo(cx - 6, q); x.lineTo(cx + 6, q); } x.stroke(); // brick courses
  K.box(cx - 5, cy - 5, 10, 10, '#8f857c', { r: .5, bev: .7 }); K.box(cx - 3, cy - 3, 6, 6, '#141110', { r: .5, bev: 0, fill: '#191514' }); K.hole(cx, cy, 2.6, '#16120f');
}
function roof(x, o) { // pitched roofs: courses of shingles on slopes shaded by the way they face, a capped ridge, a brick chimney; flat roofs: a weathered membrane in a parapet, AC units and vents
  const c = o.rc || o.color, hz = o.w >= o.h, type = o.roof || 'gable', K = propKit(x), X = o.x, Y = o.y, w = o.w, h = o.h, R = seeded(propSeed(o)), metal = !!o.metal;
  const tone = n => shade(c, .17 * K.face(n));
  if (type === 'flat') {
    K.rr(X, Y, w, h); x.fillStyle = K.lit(X, Y, w, h, shade(c, -.04), .06, -.08); x.fill();
    x.save(); K.rr(X + 3, Y + 3, w - 6, h - 6); x.clip(); // the membrane: broad, soft, weathered patches and the seams between its sheets
    for (let k = 0, n = Math.max(3, Math.round(w * h / 700)); k < n; k++) { const px = X + R() * w, py = Y + R() * h, rr = 8 + R() * Math.min(26, Math.max(w, h) * .3), g = x.createRadialGradient(px, py, 0, px, py, rr), dk = R() < .55; g.addColorStop(0, dk ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - rr, py - rr, 2 * rr, 2 * rr); }
    x.strokeStyle = 'rgba(0,0,0,.09)'; x.lineWidth = .7; x.beginPath(); for (let p = (hz ? X : Y) + 24; p < (hz ? X + w : Y + h) - 6; p += 24) hz ? (x.moveTo(p, Y + 3), x.lineTo(p, Y + h - 3)) : (x.moveTo(X + 3, p), x.lineTo(X + w - 3, p)); x.stroke();
    x.translate(-K.lx * 2.2, -K.ly * 2.2); K.rr(X + 3, Y + 3, w - 6, h - 6); x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.2)'; x.stroke(); // the parapet's shadow along its near walls
    x.restore();
    const pf = () => { x.beginPath(); x.rect(X, Y, w, h); x.rect(X + 3, Y + 3, w - 6, h - 6); }; // the parapet: a raised lip all round, lit on its near edges
    pf(); x.fillStyle = K.lit(X, Y, w, h, shade(c, .14), .1, -.14); x.fill('evenodd');
    x.save(); x.beginPath(); x.rect(X, Y, w, h); x.rect(X + 3, Y + 3, w - 6, h - 6); x.clip('evenodd'); K.bevel(() => K.rr(X, Y, w, h), 1, .3, .28); x.restore();
    x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = .6; x.strokeRect(X + 3.3, Y + 3.3, w - 6.6, h - 6.6);
    // AC units: one mounted row along the roof's long side, evenly spaced and inset from the parapet (never scattered or stacked), at the back, away from a shop front
    const L = hz ? w : h, D = hz ? h : w, uw = hz ? 22 : 16, uh = hz ? 16 : 22, step = 34, n = D >= 34 ? clamp(Math.floor((L - 40) / step), 0, 4) : 0;
    const span = (n - 1) * step, a0 = (hz ? X : Y) + (L - span) / 2, b0 = hz ? (o.front === 'n' ? Y + h - 12 - uh : Y + 12) : (o.front === 'w' ? X + w - 12 - uw : X + 12);
    for (let k = 0; k < n; k++) { const ax = hz ? a0 + k * step - uw / 2 : b0, ay = hz ? b0 : a0 + k * step - uh / 2, fx = ax + uw / 2, fy = ay + uh / 2;
      K.metal(ax, ay, uw, uh, '#a7adb3', hz, { r: 1.2 });
      K.disc(fx, fy, 6, '#8d9399', { flat: 1, ec: '#5f656b' }); K.hole(fx, fy, 5, '#22262a');
      x.save(); x.translate(fx, fy); x.rotate(R() * TAU); x.fillStyle = '#4e545a'; for (let q = 0; q < 4; q++) { x.rotate(TAU / 4); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(3.8, -1.4, 4.3, .8); x.lineTo(.6, .6); x.closePath(); x.fill(); } x.restore(); // the fan blades
      x.strokeStyle = 'rgba(200,205,210,.55)'; x.lineWidth = .35; for (const rr of [2.2, 3.6]) { K.round(fx, fy, rr); x.stroke(); } x.beginPath(); x.moveTo(fx - 5, fy); x.lineTo(fx + 5, fy); x.moveTo(fx, fy - 5); x.lineTo(fx, fy + 5); x.stroke(); // its guard
      K.disc(fx, fy, 1.2, '#9aa0a6', { ec: 0 }); }
    const vx = X + w - 16, vy = Y + h - 14; K.disc(vx, vy, 4.2, '#7d838a', { sh: 1.8, gl: .3, ec: '#4a4f55' }); K.hole(vx, vy, 2.4, '#1e2124'); // a vent stack
    if (w > 60 && h > 40) { const hx = X + (o.front === 'e' ? 10 : w - 22), hy = Y + h / 2 - 6; K.box(hx, hy, 12, 12, '#8a8f95', { r: .8, sh: 1.6 }); K.box(hx + 2, hy + 2, 8, 8, '#9aa0a6', { r: .5, bev: .6 }); } // the roof hatch
    return;
  }
  const tl = [X, Y], tr = [X + w, Y], bl = [X, Y + h], br = [X + w, Y + h];
  if (type === 'hip') { // four slopes meeting at a short ridge
    const cx = X + w / 2, cy = Y + h / 2, rl = Math.abs(w - h) / 2, r0 = hz ? [cx - rl, cy] : [cx, cy - rl], r1 = hz ? [cx + rl, cy] : [cx, cy + rl];
    const faces = hz ? [[[tl, tr, r1, r0], [0, -1]], [[bl, br, r1, r0], [0, 1]], [[tl, bl, r0], [-1, 0]], [[tr, br, r1], [1, 0]]] : [[[tl, bl, r1, r0], [-1, 0]], [[tr, br, r1, r0], [1, 0]], [[tl, tr, r0], [0, -1]], [[bl, br, r1], [0, 1]]];
    for (const [pts, n] of faces) { K.poly(pts); x.fillStyle = tone(n); x.fill(); roofCourses(K, pts, n, X, Y, X + w, Y + h, metal, R); }
    const hips = [[tl, r0], [bl, hz ? r0 : r1], [tr, hz ? r1 : r0], [br, r1], [r0, r1]]; // hip and ridge caps: a lit side and a shaded one
    for (const [p, q] of hips) { x.lineCap = 'round'; x.strokeStyle = shade(c, -.25); x.lineWidth = 2.6; x.beginPath(); x.moveTo(...p); x.lineTo(...q); x.stroke(); x.strokeStyle = shade(c, .28); x.lineWidth = 1.2; x.beginPath(); x.moveTo(p[0] + K.lx * .5, p[1] + K.ly * .5); x.lineTo(q[0] + K.lx * .5, q[1] + K.ly * .5); x.stroke(); }
  } else { // gable: the ridge along the long side
    const faces = hz ? [[[tl, tr, [X + w, Y + h / 2], [X, Y + h / 2]], [0, -1]], [[bl, br, [X + w, Y + h / 2], [X, Y + h / 2]], [0, 1]]] : [[[tl, bl, [X + w / 2, Y + h], [X + w / 2, Y]], [-1, 0]], [[tr, br, [X + w / 2, Y + h], [X + w / 2, Y]], [1, 0]]];
    for (const [pts, n] of faces) { K.poly(pts); x.fillStyle = tone(n); x.fill(); roofCourses(K, pts, n, X, Y, X + w, Y + h, metal, R); }
    const rf = () => hz ? K.rr(X - .5, Y + h / 2 - 2, w + 1, 4, 1) : K.rr(X + w / 2 - 2, Y - .5, 4, h + 1, 1); // the ridge cap
    K.drop(rf, 1.2, .25); rf(); x.fillStyle = K.lit(X, Y, w, h, shade(c, .04), .2, -.15); x.fill(); K.bevel(rf, .7, .35, .3); rf(); K.edge(shade(c, -.45), .5);
    if (!o.noChimney) chimney(K, X + w * (hz ? .72 : .3), Y + h * (hz ? .28 : .7));
  }
  K.rr(X, Y, w, h); K.edge(shade(c, -.5), .9); K.bevel(() => K.rr(X, Y, w, h), .9, .22, .3); // the eaves: a lit lip on the near side, a shadowed one on the far
}
function awning(x, o) { // the striped canvas over a shop's door, sloping down off the wall: lighter where it leaves the wall, a scalloped valance along its lip
  const f = o.front || 's', across = f === 's' || f === 'n', L = across ? o.w : o.h, ang = { s: 0, n: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 }[f];
  const mx = across ? o.x + o.w / 2 : f === 'e' ? o.x + o.w : o.x, my = across ? (f === 's' ? o.y + o.h : o.y) : o.y + o.h / 2;
  inFrame(x, mx, my, ang, K => { const x = K.x, u0 = -L / 2 + 10, u1 = L / 2 - 10, v0 = -6, v1 = 3;
    if (u1 - u0 < 8) return;
    K.drop(() => K.rr(u0, v0, u1 - u0, v1 - v0 + 1.5), 2.2, .3);
    for (let k = 10; k < L - 10; k += 10) { const u = -L / 2 + k, ww = Math.min(10, u1 - u), col = (k / 10) % 2 ? '#f4efe6' : o.shop;
      x.fillStyle = K.lin(0, v0, 0, v1, [[0, shade(col, .1)], [.7, col], [1, shade(col, -.18)]]); x.fillRect(u, v0, ww, v1 - v0);
      x.fillStyle = shade(col, -.12); x.beginPath(); for (let s = 0; s < 2; s++) { const sx = u + s * ww / 2; x.moveTo(sx, v1); x.quadraticCurveTo(sx + ww / 4, v1 + 3.2, sx + ww / 2, v1); } x.fill(); } // the valance's scallops
    x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = .5; x.beginPath(); for (let k = 20; k < L - 10; k += 10) { x.moveTo(-L / 2 + k, v0); x.lineTo(-L / 2 + k, v1); } x.stroke(); // the folds where the stripes meet
    x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = .7; x.beginPath(); x.moveTo(u0, v1); x.lineTo(u1, v1); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = .6; x.beginPath(); x.moveTo(u0, v0 + .4); x.lineTo(u1, v0 + .4); x.stroke(); });
}
function chair(x, px, py, ang, col, o = {}) { // a chair seen from above, its seat toward ang, its back away from it
  inFrame(x, px, py, ang, K => { const s = o.s || 8, x = K.x;
    if (o.office) { x.strokeStyle = '#1b1c20'; x.lineWidth = 1.1; x.lineCap = 'round'; x.beginPath(); for (let q = 0; q < 5; q++) { const a = q * TAU / 5 + .3; x.moveTo(0, 0); x.lineTo(Math.cos(a) * s * .62, Math.sin(a) * s * .62); } x.stroke(); // the star base peeking out
      K.cushion(-s / 2, -s / 2, s, s, col, { r: s * .4, sh: 1.2 }); K.box(-s / 2 - 1.6, -s * .46, 3, s * .92, shade(col, -.15), { r: 1.4, sh: 1 }); return; }
    K.cushion(-s / 2, -s / 2, s, s, col, { r: s * .22, sh: 1.2 }); K.box(-s / 2 - 1.8, -s / 2, 2.6, s, shade(col, -.2), { r: .9, sh: 1 }); });
}
function drawCar(x, o) { // seen from above, nose to the right when it lies across the road, to the top when it stands upright
  const hz = o.w >= o.h, L = hz ? o.w : o.h, D = hz ? o.h : o.w, c = o.color;
  inFrame(x, o.x + o.w / 2, o.y + o.h / 2, hz ? 0 : -Math.PI / 2, K => { const x = K.x, R = seeded(propSeed(o));
    const glass = (pts) => { K.poly(pts); x.fillStyle = K.lit(-L / 2, -D / 2, L, D, '#2a3843', .45, -.25); x.fill(); x.save(); K.poly(pts); x.clip(); x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.moveTo(-L, -D * .1); x.lineTo(L, -D * .5); x.lineTo(L, -D * .3); x.lineTo(-L, D * .1); x.fill(); x.restore(); K.poly(pts); K.edge('rgba(0,0,0,.45)', .5); };
    const tyre = (cx, cy, tl, tw) => K.box(cx - tl / 2, cy - tw / 2, tl, tw, '#1c1d20', { r: tw * .4, bev: 0, ec: '#0b0b0c', ew: .5 });
    if (o.tractor) { // a big-wheeled tractor: rear tyres with treads, a narrow hood forward, the cab behind it
      for (const sg of [-1, 1]) { tyre(-L * .22, sg * (D / 2 - 1.5), L * .3, 7); x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = .6; x.beginPath(); for (let q = -L * .36; q < -L * .08; q += 2.4) { x.moveTo(q, sg * (D / 2 - 4.5)); x.lineTo(q + 1.2, sg * (D / 2 + 1.5)); } x.stroke(); tyre(L * .32, sg * (D / 2 - 2), L * .19, 4.6); }
      K.box(-L * .02, -D * .22, L * .5, D * .44, c, { r: 3, hi: .22, lo: -.25 }); // the hood
      x.fillStyle = 'rgba(0,0,0,.4)'; for (let q = 0; q < 4; q++) x.fillRect(L * .1 + q * 2.6, -D * .14, 1.2, D * .28); // its louvres
      K.box(L * .46, -D * .16, 2.2, D * .32, '#2a2a2e', { r: .6 }); // the grille
      K.box(-L * .42, -D * .36, L * .4, D * .72, shade(c, -.1), { r: 2.5 }); K.glass(-L * .38, -D * .3, L * .32, D * .6, '#9ccbe0', { a: .85 }); K.box(-L * .4, -D * .33, L * .36, D * .66, shade(c, -.25), { r: 2, sh: 1.6, bev: 1 }); // the cab and its roof
      K.disc(L * .14, -D * .3, 2.1, '#2b2c2f', { sh: 1.4, gl: .3 }); K.hole(L * .14, -D * .3, 1.2); return; } // the exhaust stack
    if (o.rover) { // a moon rover: an open frame on six mesh wheels, two seats, a dish on a mast
      for (const fx of [-.32, 0, .32]) for (const sg of [-1, 1]) { K.box(L * fx - 4.5, sg * (D / 2 - 1) - 2.6, 9, 5.2, '#4a4e55', { r: 2.2, bev: .6 }); x.strokeStyle = 'rgba(200,205,210,.35)'; x.lineWidth = .4; x.beginPath(); for (let q = -3.5; q < 4; q += 1.4) { x.moveTo(L * fx + q, sg * (D / 2 - 1) - 2.4); x.lineTo(L * fx + q, sg * (D / 2 - 1) + 2.4); } x.stroke(); }
      K.metal(-L / 2 + 2, -D / 2 + 3.5, L - 4, D - 7, c, true, { r: 2 });
      for (const sx of [-.12, .12]) K.cushion(L * sx - 4, -5, 8, 10, '#3a4458', { r: 2, sh: 1 }); // the seats
      K.box(L * .22, -D * .28, L * .18, D * .56, '#2c3e66', { r: 1, sh: 1.2 }); x.strokeStyle = 'rgba(160,190,255,.35)'; x.lineWidth = .4; x.beginPath(); for (let q = L * .22 + 2; q < L * .4; q += 2.6) { x.moveTo(q, -D * .28); x.lineTo(q, D * .28); } x.stroke(); // the battery's solar lid
      K.disc(-L * .36, 0, 4.2, '#e6e9ec', { sh: 2.2, fill: null, ec: '#8a9098' }); K.hole(-L * .36, 0, 3.2, '#c9ced4'); K.disc(-L * .36, 0, .9, '#6a7078', { ec: 0 }); return; } // the dish
    const van = o.van, rr = D * (van ? .18 : .34);
    for (const fx of [-.3, .3]) for (const sg of [-1, 1]) tyre(L * fx, sg * (D / 2 - .4), L * .17, 2.6); // tyres peeking out from under the arches
    const body = () => K.rr(-L / 2, -D / 2, L, D, rr);
    body(); x.fillStyle = K.rad(0, 0, L * .55, c, .32, -.3); x.fill(); K.bevel(body, 1.1, .4, .3); body(); K.edge(shade(c, -.55), .7);
    const lamp = (px, py, col, s) => { x.fillStyle = col; K.oval(px, py, s * .7, s); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; K.oval(px + K.lx * .3, py + K.ly * .3, s * .3, s * .45); x.fill(); };
    for (const sg of [-1, 1]) { lamp(L / 2 - 1.4, sg * D * .3, '#fff4cf', 1.5); x.fillStyle = '#b8282a'; x.fillRect(-L / 2 + .5, sg * D * .32 - 1.2, 1.3, 2.4); K.box(L * (van ? .3 : .08) - .8, sg * (D / 2 + .5) - .7, 1.8, 1.4, c, { r: .5, bev: 0 }); } // headlights, taillights, mirrors
    if (van) { // a delivery van: a short nose, then the long box, its roof ribbed
      glass([[L * .4, -D * .42], [L * .4, D * .42], [L * .3, D * .38], [L * .3, -D * .38]]);
      K.box(-L / 2 + 1.5, -D / 2 + 1.5, L * .8 - 1, D - 3, shade(c, .03), { r: 1.6, bev: 1, ha: .35 });
      x.strokeStyle = 'rgba(0,0,0,.14)'; x.lineWidth = .7; x.beginPath(); for (let q = 1; q < 6; q++) { const u = -L / 2 + 1.5 + q * (L * .8 - 1) / 6; x.moveTo(u, -D / 2 + 2.5); x.lineTo(u, D / 2 - 2.5); } x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.25)'; x.beginPath(); for (let q = 1; q < 6; q++) { const u = -L / 2 + 2.3 + q * (L * .8 - 1) / 6; x.moveTo(u, -D / 2 + 2.5); x.lineTo(u, D / 2 - 2.5); } x.stroke();
      x.fillStyle = '#d63c3c'; x.fillRect(-L / 2 + 3, D / 2 - 3.2, L * .74, 1.6); return; } // the company stripe along its side
    glass([[L * .2, -D * .42], [L * .2, D * .42], [L * .05, D * .36], [L * .05, -D * .36]]); // windscreen
    glass([[-L * .22, -D * .36], [-L * .22, D * .36], [-L * .33, D * .4], [-L * .33, -D * .4]]); // rear window
    for (const sg of [-1, 1]) glass([[-L * .22, sg * D * .37], [L * .05, sg * D * .37], [L * .05, sg * D * .44], [-L * .22, sg * D * .44]]); // side windows
    const roofF = () => K.rr(-L * .23, -D * .36, L * .29, D * .72, D * .14); roofF(); x.fillStyle = K.lit(-L * .23, -D * .36, L * .29, D * .72, c, .22, -.18); x.fill(); K.bevel(roofF, .8, .35, .25); roofF(); K.edge(shade(c, -.45), .5);
    x.strokeStyle = shade(c, -.25); x.lineWidth = .45; x.beginPath(); for (const sg of [-1, 1]) { x.moveTo(L * .22, sg * D * .2); x.quadraticCurveTo(L * .36, sg * D * .23, L / 2 - 1, sg * D * .2); } x.stroke(); // the creases down the bonnet
    if (o.taxi) { K.box(-L * .12, -D * .2, 4.2, D * .4, '#2b2b30', { r: .8, sh: 1.2 }); K.box(-L * .12 + .8, -D * .2 + .8, 2.6, D * .4 - 1.6, '#ffe9a0', { r: .4, bev: 0, ec: 0 }); }
    x.save(); body(); x.clip(); x.fillStyle = 'rgba(255,255,255,.14)'; x.beginPath(); x.ellipse(-L * .05 + K.lx * D * .2, K.ly * D * .3, L * .4, D * .12, 0, 0, TAU); x.fill(); x.restore(); // the paint's long shine
  });
}
function benchSlats(K, L, D, col, seed) { // a park bench's boards with the ground showing between them, cast-iron ends
  const x = K.x, n = D >= 10 ? 3 : 2, gap = .9, sw = (D - 2 - gap * (n - 1)) / n;
  x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(-L / 2 + 2, -D / 2 + 1, L - 4, D - 2);
  for (let k = 0; k < n; k++) K.plank(-L / 2 + .5, -D / 2 + 1 + k * (sw + gap), L - 1, sw, col, true, seed + k, { r: .5, ga: .35 });
  for (const ex of [-L / 2 + 1, L / 2 - 3.6]) K.box(ex - .4, -D / 2 - .5, 3, D + 1, '#2b2c30', { r: 1, ha: .3 });
  if (L > 60) K.box(-1.3, -D / 2 - .3, 2.6, D + .6, '#2b2c30', { r: .8 });
}
/* ---- each prop is drawn once into its own small canvas, at the layer's own pixel size, and stamped after that: a smash redraws the
   whole obstacle layer and the editor redraws every frame, so neither pays for the gradients and grain again. The key is everything the
   prop is drawn from (its kind, size, colour, flags and place, which seeds its variation), the scale, the turn and the season ---- */
const PK_CACHE = new Map(); let PK_PX = 0, PK_BUILD = null;
const PK_MARGIN = { table: 14, desk: 14, lander: 17, tent: 12, slide: 10, building: 7, hay: 6, gazebo: 6 }; // how far a prop's parts reach past its box (chairs, legs, guy lines, awnings)
function propKey(o) { let k = ''; for (const n in o) { const v = o[n]; if (v == null || typeof v === 'function' || n[0] === '_' || n === 'cracked') continue; k += n + ':' + (typeof v === 'object' ? JSON.stringify(v) : v) + ';'; } return k; }
function propCached(x, o, draw) {
  const ed = typeof ED === 'object' && ED.x === x; if (x !== octx && !ed) return draw(x); // (a map's picture is drawn once: no point keeping it)
  if (x === octx && PK_BUILD !== curBuild) { for (const e of PK_CACHE.values()) freeCanvas(e.c); PK_CACHE.clear(); PK_PX = 0; PK_BUILD = curBuild; } // a new map: the old one's props go
  const m = x.getTransform(), s0 = Math.hypot(m.a, m.b), rot = Math.atan2(m.b, m.a), s = ed ? Math.pow(2, Math.ceil(Math.log2(s0) * 2) / 2) : s0; // (the editor zooms freely: it keeps a few sizes, not one per frame of a zoom)
  if (!(s > 0) || s > 12) return draw(x);
  const M = PK_MARGIN[o.kind] || 4, [x0, y0, x1, y1] = o.t === 'r' ? [o.x - M, o.y - M, o.x + o.w + M, o.y + o.h + M] : [o.x - o.r - M, o.y - o.r - M, o.x + o.r + M, o.y + o.r + M];
  const bx = Math.floor(x0 * s) / s, by = Math.floor(y0 * s) / s, cw = Math.ceil((x1 - bx) * s), ch = Math.ceil((y1 - by) * s); // lined up with the layer's own pixels, so a stamp is as sharp as drawing it there
  const key = propKey(o) + '|' + s.toFixed(3) + '|' + rot.toFixed(3) + '|' + (season && x === octx ? season.id : '');
  let e = PK_CACHE.get(key);
  if (!e) { const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d'); g.setTransform(s, 0, 0, s, -bx * s, -by * s);
    const pr = PK_ROT, pf = PK_FOR; PK_ROT = rot; PK_FOR = x; try { draw(g); } finally { PK_ROT = pr; PK_FOR = pf; }
    e = { c, bx, by, w: cw / s, h: ch / s, px: cw * ch }; PK_PX += e.px;
    while (PK_CACHE.size > 900 || PK_PX > 9e6) { const [k0, e0] = PK_CACHE.entries().next().value; PK_CACHE.delete(k0); PK_PX -= e0.px; freeCanvas(e0.c); } // the oldest go first
  } else PK_CACHE.delete(key);
  PK_CACHE.set(key, e); // (the most recently used last)
  x.drawImage(e.c, e.bx, e.by, e.w, e.h);
}
function drawObstacle(x, o) {
  drawObstacleBase(x, o);
  if (o.cracked) { const r = seeded(Math.round(o.x * 5 + o.y * 3)), cx = o.t === 'r' ? o.x + o.w / 2 : o.x, cy = o.t === 'r' ? o.y + o.h / 2 : o.y, R = o.t === 'r' ? Math.min(o.w, o.h) * .5 + 6 : o.r; // cracks from a neighbour's hit
    x.save(); x.strokeStyle = 'rgba(20,12,10,.65)'; x.lineWidth = 1; for (let k = 0; k < 4; k++) { let px = cx, py = cy, a = r() * TAU; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 4; j++) { a += (r() - .5) * 1.2; px += Math.cos(a) * R * .3; py += Math.sin(a) * R * .3; x.lineTo(px, py); } x.stroke(); } x.restore(); }
}
function drawObstacleBase(x, o) {
  const c = o.color, k = o.kind;
  if (k === 'water') return drawWater(x, o, 0); // static version (thumbnails); the animated copy is drawn every frame
  if (o.t === 'c') {
    if (k === 'chess') return propCached(x, o, g => drawChess(g, o, c));
    if (k === 'campfire') { x.save(); x.translate(o.x, o.y); const s = o.r / 14; x.scale(s, s); firePit(x, 0, 0); x.restore(); return; }
    if ((k === 'tree' || k === 'bush') && x === octx) return drawTrunk(x, o); // in game the leaves are separate swaying sprites (09-seasons)
    if ((k === 'tree' || k === 'bush') && typeof treeStill === 'function' && treeStill(x, o)) return; // menu pictures and the editor: the same full trees, standing still
    return propCached(x, o, g => { g.save(); try { drawRound(g, o, c, k); } finally { g.restore(); } });
  }
  if (k === 'border') { x.fillStyle = c; x.fillRect(o.x, o.y, o.w, o.h); return; }
  if (k === 'bwall') return drawBreakWall(x, o);
  if (k === 'detail') return drawDetail(x, o);
  propCached(x, o, g => { g.save(); try { drawBox(g, o, c, k); } finally { g.restore(); } });
}
function drawRound(x, o, c, k) { // the round props
  const K = propKit(x), r = o.r, cx = o.x, cy = o.y, R = seeded(propSeed(o));
  switch (k) {
    case 'tree': case 'bush': K.leaves(cx, cy, r, c, propSeed(o), k === 'tree' ? 12 : 8); return; // (only before the tree sprites exist)
    case 'bin':
      if (r <= 6) { K.disc(cx, cy, r, c, { hi: .45, lo: -.3, ec: shade(c, -.6), ew: .6 }); K.hole(cx, cy, r * .7, '#17191b'); x.strokeStyle = 'rgba(70,78,66,.7)'; x.lineWidth = .5; K.round(cx, cy, r * .62); x.stroke(); K.glint(cx, cy, r, .3); return; } // a street bin: a metal hoop round a dark opening, the liner's lip inside
      K.disc(cx, cy, r, c, { hi: .25, lo: -.32, ec: shade(c, -.62) }); // a drum: rolled rim, a pressed hoop, two bungs, rust where the paint's gone
      for (let q = 0; q < 4; q++) { const a = R() * TAU, d = R() * r * .7, rr = 2 + R() * r * .35, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d, g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, 'rgba(90,45,20,.35)'); g.addColorStop(1, 'rgba(90,45,20,0)'); x.fillStyle = g; K.round(cx, cy, r - 1); x.save(); x.clip(); x.fillRect(px - rr, py - rr, 2 * rr, 2 * rr); x.restore(); }
      x.strokeStyle = shade(c, -.4); x.lineWidth = 1; K.round(cx, cy, r - 1.4); x.stroke(); x.strokeStyle = shade(c, .25); x.lineWidth = .5; K.round(cx + K.lx * .5, cy + K.ly * .5, r * .66); x.stroke(); x.strokeStyle = shade(c, -.35); K.round(cx - K.lx * .4, cy - K.ly * .4, r * .66); x.stroke();
      K.disc(cx + r * .42, cy - r * .22, r * .17, shade(c, -.1), { sh: .8, ec: shade(c, -.55), ew: .5 }); K.disc(cx - r * .38, cy + r * .32, r * .11, shade(c, -.1), { ec: shade(c, -.55), ew: .4 }); K.glint(cx, cy, r, .22); return;
    case 'rock': { const n = 9, pts = []; for (let q = 0; q < n; q++) { const a = q / n * TAU + (R() - .5) * .4, d = r * (.82 + R() * .2); pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]); }
      K.blob(pts); x.fillStyle = K.rad(cx, cy, r, c, .22, -.38); x.fill();
      x.save(); K.blob(pts); x.clip(); const top = pts.map(([px, py]) => [cx + K.lx * r * .18 + (px - cx) * .6, cy + K.ly * r * .18 + (py - cy) * .6]); K.blob(top); x.fillStyle = 'rgba(255,255,255,.1)'; x.fill(); // the flat top facing the sun
      x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = .7; for (let q = 0; q < 2; q++) { let a = R() * TAU, px = cx + Math.cos(a) * r * .2, py = cy + Math.sin(a) * r * .2; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 3; j++) { a += (R() - .5) * 1.1; px += Math.cos(a) * r * .28; py += Math.sin(a) * r * .28; x.lineTo(px, py); } x.stroke(); } // cracks
      for (let q = 0; q < 5; q++) { x.fillStyle = R() < .5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.1)'; K.round(cx + (R() - .5) * r * 1.3, cy + (R() - .5) * r * 1.3, .6 + R() * 1.4); x.fill(); } x.restore(); // pits and flecks
      K.blob(pts); K.edge(shade(c, -.55), .8);
      if (o.antenna) { K.disc(cx, cy, r * .9, '#e3e7eb', { sh: 2, ec: '#7d848c' }); K.hole(cx, cy, r * .78, '#d2d7dc'); x.strokeStyle = '#8a9098'; x.lineWidth = .7; x.beginPath(); for (let q = 0; q < 3; q++) { const a = q * TAU / 3 + .4; x.moveTo(cx + Math.cos(a) * r * .8, cy + Math.sin(a) * r * .8); x.lineTo(cx, cy); } x.stroke(); K.disc(cx, cy, 2, '#5a6068', { gl: .4 }); } // a dish on the rock
      return; }
    case 'lamp':
      if (o.mast) { K.disc(cx, cy, r, '#4a5058', { gl: .3 }); K.box(cx - 7.5, cy - 3.2, 15, 6.4, '#bfc5cc', { r: 1.4, sh: 1.6 }); for (let q = 0; q < 3; q++) { const lx = cx - 6 + q * 4.2; K.box(lx, cy - 2, 3.6, 4, '#fff3cc', { r: .6, bev: .5, ec: '#8a7a4a', ew: .4, hi: .3 }); } return; } // a floodlight mast: a bank of three lamps on its head
      if (o.lantern) { K.box(cx - 4.8, cy - 4.8, 9.6, 9.6, '#ffd98a', { r: 1, ec: '#5a4a2a', hi: .3 }); const s = 3.9, tri = [[[cx - s, cy - s], [cx + s, cy - s], [cx, cy]], [[cx + s, cy - s], [cx + s, cy + s], [cx, cy]], [[cx + s, cy + s], [cx - s, cy + s], [cx, cy]], [[cx - s, cy + s], [cx - s, cy - s], [cx, cy]]], nrm = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // a lantern: warm glass round its iron cap
        tri.forEach((t, q) => { K.poly(t); x.fillStyle = shade('#2f2925', .5 * K.face(nrm[q])); x.fill(); }); x.strokeStyle = '#14110f'; x.lineWidth = .5; K.poly(tri[0].slice(0, 2).concat([[cx + s, cy + s], [cx - s, cy + s]])); x.stroke(); K.disc(cx, cy, 1.1, '#6a5f55', { ec: 0, gl: .4 }); return; }
      K.disc(cx, cy, r, c, { hi: .6, lo: -.3, ec: '#151515' }); K.disc(cx, cy, r * .58, '#fff1bf', { hi: .2, lo: -.18, ec: '#8a7a4a', ew: .5 }); K.glint(cx, cy, r * .58, .7); return; // a street lamp's head: its metal hood round a warm lens
    case 'hay': { // a round bale end-on: the straw rolled into a spiral, loose ends standing out round its edge
      x.strokeStyle = shade(c, -.12); x.lineWidth = .6; x.beginPath(); for (let q = 0; q < r * 3; q++) { const a = R() * TAU, d0 = r * (.86 + R() * .1), d1 = r * (1.02 + R() * .12), b = a + (R() - .5) * .25; x.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0); x.lineTo(cx + Math.cos(b) * d1, cy + Math.sin(b) * d1); } x.stroke();
      K.disc(cx, cy, r, c, { hi: .2, lo: -.3, ec: shade(c, -.4), ew: .7 });
      x.save(); K.round(cx, cy, r); x.clip(); const turns = r / 3.1;
      for (let pass = 0; pass < 2; pass++) { x.strokeStyle = pass ? 'rgba(255,244,200,.4)' : shade(c, -.32); x.lineWidth = pass ? .5 : 1; x.beginPath(); for (let t = 0; t <= 1.0001; t += 1 / (turns * 36)) { const a = t * turns * TAU, d = t * r * .97 - (pass ? .9 : 0), px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d; t ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); }
      x.lineWidth = .45; for (let q = 0; q < r * 5; q++) { const a = R() * TAU, d = Math.sqrt(R()) * r, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d, t = a + Math.PI / 2, l = 1 + R() * 2; x.strokeStyle = R() < .5 ? 'rgba(255,240,190,.3)' : 'rgba(110,80,20,.25)'; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(t) * l, py + Math.sin(t) * l); x.stroke(); } // stray fibres
      x.restore(); return; }
    case 'silo': { const n = 16; // its domed cap: sixteen tin panels, each as bright as it faces the sun, an eave ring, a vent, a catwalk
      K.disc(cx, cy, r, shade(c, -.12), { hi: .1, lo: -.3, ec: shade(c, -.5) });
      for (let q = 0; q < n; q++) { const a0 = q * TAU / n, a1 = a0 + TAU / n, am = a0 + TAU / n / 2, t = .22 * K.face([Math.cos(am), Math.sin(am)]); x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, r - 2.6, a0, a1); x.closePath(); x.fillStyle = K.lin(cx, cy, cx + Math.cos(am) * r, cy + Math.sin(am) * r, [[0, shade(c, t + .1)], [1, shade(c, t - .1)]]); x.fill(); }
      x.lineWidth = .7; for (let q = 0; q < n; q++) { const a = q * TAU / n; x.strokeStyle = 'rgba(0,0,0,.28)'; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * (r - 2.6), cy + Math.sin(a) * (r - 2.6)); x.stroke(); }
      x.strokeStyle = shade(c, -.22); x.lineWidth = 2.6; K.round(cx, cy, r - 1.3); x.stroke(); K.bevel(() => K.round(cx, cy, r), 1, .3, .3);
      x.save(); x.translate(cx, cy); x.rotate(.6); x.strokeStyle = '#5d6168'; x.lineWidth = .8; x.beginPath(); x.moveTo(r * .2, -2.4); x.lineTo(r - 1, -2.4); x.moveTo(r * .2, 2.4); x.lineTo(r - 1, 2.4); for (let q = r * .24; q < r - 1; q += 3) { x.moveTo(q, -2.4); x.lineTo(q, 2.4); } x.stroke(); x.restore(); // the ladder up to the vent
      K.disc(cx, cy, r * .17, shade(c, .12), { sh: 1.6, gl: .35 }); K.hole(cx, cy, r * .08, '#2a2c30'); return; }
    case 'table':
      if (o.umbrella) { const rr = r + 9, n = 8, cream = '#f3eee4'; // a parasol: eight panels sagging between their ribs, each lit by the way it slopes
        const panel = q => { const a0 = q * TAU / n, a1 = a0 + TAU / n, am = a0 + TAU / n / 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr); x.quadraticCurveTo(cx + Math.cos(am) * rr * .9, cy + Math.sin(am) * rr * .9, cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr); x.closePath(); return am; };
        for (let q = 0; q < n; q++) { const am = panel(q), col = q % 2 ? c : cream, t = .2 * K.face([Math.cos(am), Math.sin(am)]); x.fillStyle = K.lin(cx, cy, cx + Math.cos(am) * rr, cy + Math.sin(am) * rr, [[0, shade(col, t + .1)], [1, shade(col, t - .1)]]); x.fill(); }
        x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = .6; x.beginPath(); for (let q = 0; q < n; q++) { const a = q * TAU / n; x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.stroke();
        for (let q = 0; q < n; q++) { panel(q); x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = .5; x.stroke(); } K.disc(cx, cy, 2.2, '#ece6da', { gl: .5, sh: 1 }); return; }
      for (let q = 0; q < 4; q++) { const a = q * TAU / 4 + .8; chair(x, cx + Math.cos(a) * (r + 4.5), cy + Math.sin(a) * (r + 4.5), a + Math.PI, isWood(c) ? shade(c, -.2) : '#3c4250', { s: Math.min(9, 6 + r * .12) }); } // chairs tucked in round it
      if (isWood(c)) { const f = () => K.round(cx, cy, r); K.drop(f, 1.4, .25); f(); x.fillStyle = K.lit(cx - r, cy - r, 2 * r, 2 * r, c, .12, -.18); x.fill(); x.save(); f(); x.clip(); K.grain(cx - r, cy - r, 2 * r, 2 * r, c, true, propSeed(o), .34); x.restore(); K.bevel(f, 1.2, .3, .3); f(); K.edge(shade(c, -.52), .8); }
      else K.disc(cx, cy, r, c, { flat: 1, bev: 1.2, hi: .2, lo: -.2 });
      if (r >= 15) { K.disc(cx + r * .32, cy - r * .2, 2.2, '#f2efe8', { sh: 1, ec: '#9a948a', ew: .4 }); K.hole(cx + r * .32, cy - r * .2, 1.6, '#4a2c1a'); x.save(); x.translate(cx - r * .25, cy + r * .2); x.rotate(.35); K.box(-3.4, -4.4, 6.8, 8.8, '#f6f4ef', { r: .3, sh: 1, bev: 0, ec: 'rgba(0,0,0,.2)', ew: .4 }); x.fillStyle = 'rgba(60,70,90,.4)'; for (let q = -2.6; q < 3.4; q += 1.4) x.fillRect(-2.4, q, 4.8 - (q > 2 ? 2 : 0), .45); x.restore(); } // a mug and a sheet of notes
      return;
    case 'plant': { // a terracotta pot, dark soil, long leaves arching out from the middle
      K.disc(cx, cy, r, '#a35f3d', { hi: .26, lo: -.3, ec: '#4f2b19' }); K.hole(cx, cy, r * .78, '#3a2618');
      const n = 8 + (r > 13 ? 3 : 0); for (let q = 0; q < n; q++) { const a = q / n * TAU + R() * .5, len = r * (.85 + R() * .4); K.leaf(cx + Math.cos(a) * r * .08, cy + Math.sin(a) * r * .08, len, r * (.17 + R() * .07), a, shade(c, (R() - .5) * .3)); }
      for (let q = 0; q < 5; q++) { const a = q / 5 * TAU + R(); K.leaf(cx, cy, r * (.45 + R() * .2), r * .13, a, shade(c, .12)); } return; }
    case 'pod': // a stasis pod: a bolted ring round a glass dome of green fluid, something curled up inside
      K.disc(cx, cy, r, '#4b5a60', { hi: .3, lo: -.38, ec: '#1d2427' }); for (let q = 0; q < 8; q++) { const a = q * TAU / 8 + .2; K.bolt(cx + Math.cos(a) * (r - 1.8), cy + Math.sin(a) * (r - 1.8), .7); }
      K.disc(cx, cy, r - 4, '#58c99d', { hi: .35, lo: -.4, ec: '#2c5a48' }); x.fillStyle = 'rgba(25,55,40,.62)'; K.oval(cx, cy + 1.5, 5, 8.5); x.fill(); K.round(cx, cy - 7, 4); x.fill();
      x.fillStyle = 'rgba(220,255,240,.5)'; for (let q = 0; q < 5; q++) { K.round(cx + (R() - .5) * r, cy + (R() - .5) * r, .6 + R()); x.fill(); } K.glint(cx, cy, r - 4, .55); return;
    case 'holo': // a holotable: its emitter rings, and the hologram over it, a wireframe globe
      K.disc(cx, cy, r, c, { hi: .3, lo: -.35, ec: '#11181b' }); K.disc(cx, cy, r - 4, shade(c, -.2), { flat: 1, ec: 0 });
      x.strokeStyle = 'rgba(95,255,208,.55)'; x.lineWidth = .8; for (let rr = 6; rr < r - 4; rr += 5) { K.round(cx, cy, rr); x.stroke(); }
      x.save(); x.globalAlpha = .7; x.strokeStyle = '#7dffe0'; x.lineWidth = .6; const gr = r * .5; K.round(cx, cy, gr); x.stroke(); for (const f of [.35, .7]) { K.oval(cx, cy, gr, gr * f); x.stroke(); K.oval(cx, cy, gr * f, gr); x.stroke(); }
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, gr); g.addColorStop(0, 'rgba(95,255,208,.4)'); g.addColorStop(1, 'rgba(95,255,208,0)'); x.fillStyle = g; K.round(cx, cy, gr); x.fill(); x.restore(); return;
    case 'saucer': { // a flying saucer: a lit hull with rings and panel seams, lights round the rim, a glowing canopy
      K.disc(cx, cy, r, shade(c, -.18), { hi: .25, lo: -.4, ec: shade(c, -.6) }); K.disc(cx, cy, r - 5, c, { hi: .35, lo: -.3, ec: shade(c, -.4), ew: .6 });
      x.strokeStyle = 'rgba(0,0,0,.2)'; x.lineWidth = .7; for (let q = 0; q < 12; q++) { const a = q * TAU / 12; x.beginPath(); x.moveTo(cx + Math.cos(a) * r * .56, cy + Math.sin(a) * r * .56); x.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6)); x.stroke(); }
      for (const f of [.56, .8]) { x.strokeStyle = 'rgba(0,0,0,.22)'; K.round(cx, cy, r * f); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.18)'; K.round(cx + K.lx * .6, cy + K.ly * .6, r * f); x.stroke(); }
      for (let q = 0; q < 12; q++) { const a = q * TAU / 12 + TAU / 24; K.disc(cx + Math.cos(a) * (r - 2.5), cy + Math.sin(a) * (r - 2.5), 1.9, '#ffe36a', { hi: .5, lo: -.2, ec: '#8a6a10', ew: .4 }); }
      K.disc(cx, cy, r * .42, shade(c, .1), { sh: 1.6, ec: shade(c, -.45) }); K.disc(cx, cy, r * .3, '#79e3c2', { hi: .45, lo: -.35, ec: '#2f6d5a', gl: .6 }); return; }
    case 'reactor': // a reactor: a heavy bolted housing, three struts, and the core burning white-green in the middle
      K.disc(cx, cy, r, '#28343a', { hi: .25, lo: -.4, ec: '#0c1114' }); K.disc(cx, cy, r - 6, '#4a5a60', { flat: 1, ec: '#1a2428' }); for (let q = 0; q < 12; q++) { const a = q * TAU / 12; K.bolt(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3), .8); }
      for (let q = 0; q < 3; q++) inFrame(x, cx, cy, q * TAU / 3 + .3, K2 => K2.box(r * .38, -2.4, r * .58 - 6, 4.8, '#1a2428', { r: .8 }));
      x.strokeStyle = 'rgba(157,255,216,.35)'; x.lineWidth = 1.4; K.round(cx, cy, r * .56); x.stroke();
      { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r * .46); g.addColorStop(0, '#ffffff'); g.addColorStop(.35, '#c8ffe9'); g.addColorStop(.8, '#62e0b0'); g.addColorStop(1, '#2f8f72'); x.fillStyle = g; K.round(cx, cy, r * .46); x.fill(); K.edge('#1f5a48', .8); }
      return;
    case 'dome': { // a habitat dome: triangulated panels in rings, each as bright as it faces the sun, struts between; a greenhouse shows its plants through the glass
      const rr = r - 3, rings = [1, .7, .42, .16], seg = [12, 12, 6];
      K.disc(cx, cy, r, shade(c, -.18), { ec: shade(c, -.55) });
      if (o.green) for (let q = 0; q < 14; q++) { const a = q * 2.4, d = rr * (.25 + (q % 4) * .17); K.leaves(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 5 + (q % 3), '#4f8f3a', propSeed(o, q), 5); }
      for (let i = 0; i < 3; i++) for (let q = 0; q < seg[i]; q++) { const a0 = q * TAU / seg[i] + (i % 2) * TAU / seg[i] / 2, a1 = a0 + TAU / seg[i], am = (a0 + a1) / 2, t = .26 * K.face([Math.cos(am), Math.sin(am)]) * (1 - i * .3);
        x.beginPath(); x.moveTo(cx + Math.cos(a0) * rr * rings[i], cy + Math.sin(a0) * rr * rings[i]); x.lineTo(cx + Math.cos(a1) * rr * rings[i], cy + Math.sin(a1) * rr * rings[i]); x.lineTo(cx + Math.cos(a1) * rr * rings[i + 1], cy + Math.sin(a1) * rr * rings[i + 1]); x.lineTo(cx + Math.cos(a0) * rr * rings[i + 1], cy + Math.sin(a0) * rr * rings[i + 1]); x.closePath();
        x.fillStyle = o.green ? `rgba(200,235,190,${(.42 + t).toFixed(2)})` : shade(c, t); x.fill(); x.strokeStyle = o.green ? 'rgba(90,120,80,.75)' : shade(c, -.3); x.lineWidth = .7; x.stroke(); }
      K.disc(cx, cy, rr * rings[3], shade(c, .05), { ec: shade(c, -.35), ew: .6 }); K.glint(cx, cy, rr, .4); return; }
    case 'lander': { // a lunar lander: four splayed legs on round pads, a crinkled gold descent stage, the ascent stage's hatch on top (a rocket: white, a red nose)
      for (let q = 0; q < 4; q++) { const a = q * TAU / 4 + .78, ex = cx + Math.cos(a) * (r + 10), ey = cy + Math.sin(a) * (r + 10); x.strokeStyle = '#7d848c'; x.lineWidth = 2.6; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx + Math.cos(a) * r * .7, cy + Math.sin(a) * r * .7); x.lineTo(ex, ey); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = .8; x.stroke(); K.disc(ex, ey, 3.8, '#9aa1aa', { flat: 1, ec: '#4a5058' }); }
      if (o.rocket) { K.disc(cx, cy, r, '#ece7df', { hi: .2, lo: -.32 }); K.disc(cx, cy, r * .62, '#c0392b', { hi: .3, lo: -.35 }); K.disc(cx, cy, r * .24, '#e9e4dc', { gl: .5 }); return; }
      const pts = []; for (let q = 0; q < 8; q++) { const a = q * TAU / 8 + TAU / 16; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
      K.poly(pts); x.fillStyle = K.rad(cx, cy, r, '#d4af37', .35, -.35); x.fill(); x.save(); K.poly(pts); x.clip(); for (let q = 0; q < 26; q++) { const px = cx + (R() - .5) * 2 * r, py = cy + (R() - .5) * 2 * r, s = 2 + R() * 5; x.fillStyle = R() < .5 ? 'rgba(255,240,180,.25)' : 'rgba(90,60,10,.22)'; x.beginPath(); x.moveTo(px, py); x.lineTo(px + s, py + (R() - .5) * s); x.lineTo(px + (R() - .5) * s, py + s); x.fill(); } x.restore(); K.poly(pts); K.edge('#6a5212', .8); // gold foil, crumpled
      K.disc(cx, cy, r * .62, '#c8ccd2', { sh: 2, hi: .3 }); K.box(cx - 3.2, cy - 3.2, 6.4, 6.4, '#2a2e34', { r: 1.2, bev: .6 }); K.glint(cx, cy, r * .62, .35); return; }
    case 'gazebo': { const n = 8, rr = r + 2, roofC = '#8c3a2e'; // a gazebo: eight posts under an eight-sided shingled roof, a finial at its peak
      x.fillStyle = '#b8b0a0'; for (let q = 0; q < n; q++) K.disc(cx + Math.cos(q * TAU / n) * r, cy + Math.sin(q * TAU / n) * r, 2.6, '#cfc7b6', { ec: '#7d7566', ew: .5 });
      for (let q = 0; q < n; q++) { const a0 = q * TAU / n, a1 = a0 + TAU / n, am = (a0 + a1) / 2, pts = [[cx, cy], [cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr], [cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr]];
        K.poly(pts); x.fillStyle = shade(roofC, .2 * K.face([Math.cos(am), Math.sin(am)])); x.fill();
        x.save(); K.poly(pts); x.clip(); x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = .6; for (let d = rr; d > 4; d -= 4) { x.beginPath(); x.moveTo(cx + Math.cos(a0) * d, cy + Math.sin(a0) * d); x.lineTo(cx + Math.cos(a1) * d, cy + Math.sin(a1) * d); x.stroke(); } x.restore(); }
      x.lineCap = 'round'; for (let q = 0; q < n; q++) { const a = q * TAU / n; x.strokeStyle = shade(roofC, -.3); x.lineWidth = 1.8; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); x.stroke(); x.strokeStyle = shade(roofC, .35); x.lineWidth = .6; x.stroke(); }
      x.beginPath(); for (let q = 0; q < n; q++) x.lineTo(cx + Math.cos(q * TAU / n) * rr, cy + Math.sin(q * TAU / n) * rr); x.closePath(); K.edge(shade(roofC, -.5), .8);
      K.disc(cx, cy, 3, '#e9e2d0', { sh: 1.4, gl: .5 }); return; }
    case 'pillar': K.disc(cx, cy, r, c, { hi: .3, lo: -.35, ec: '#0b0a0d' }); x.strokeStyle = 'rgba(255,60,200,.55)'; x.lineWidth = 1.2; K.round(cx, cy, r - 2); x.stroke(); x.strokeStyle = 'rgba(255,170,230,.5)'; x.lineWidth = .4; x.stroke(); K.disc(cx, cy, r * .55, shade(c, .12), { flat: 1, ec: shade(c, -.4), ew: .5 }); K.glint(cx, cy, r, .25); return; // a club pillar wrapped in a pink neon ring
    default: K.disc(cx, cy, r, c, { gl: .2, bev: 1 });
  }
}
function drawBox(x, o, c, k) { // the props in a box
  const K = propKit(x), hz = o.w >= o.h, X = o.x, Y = o.y, w = o.w, h = o.h, cx = X + w / 2, cy = Y + h / 2, L = hz ? w : h, D = hz ? h : w, R = seeded(propSeed(o)), along = hz ? 0 : -Math.PI / 2;
  switch (k) {
    case 'building': roof(x, o); if (o.shop) awning(x, o); return;
    case 'barn': { // a barn: a red tin roof, white trim down its gable ends, a cupola on the ridge and the loft door over the eave
      roof(x, { ...o, rc: '#8c2f24', roof: 'gable', metal: true, noChimney: true });
      x.strokeStyle = '#efeae0'; x.lineWidth = 2.2; x.beginPath(); if (hz) { x.moveTo(X + 1.2, Y); x.lineTo(X + 1.2, Y + h); x.moveTo(X + w - 1.2, Y); x.lineTo(X + w - 1.2, Y + h); } else { x.moveTo(X, Y + 1.2); x.lineTo(X + w, Y + 1.2); x.moveTo(X, Y + h - 1.2); x.lineTo(X + w, Y + h - 1.2); } x.stroke();
      const s = 9, tri = [[[cx - s, cy - s], [cx + s, cy - s], [cx, cy]], [[cx + s, cy - s], [cx + s, cy + s], [cx, cy]], [[cx + s, cy + s], [cx - s, cy + s], [cx, cy]], [[cx - s, cy + s], [cx - s, cy - s], [cx, cy]]], nrm = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      K.drop(() => K.rr(cx - s, cy - s, 2 * s, 2 * s), 3, .32); tri.forEach((t, q) => { K.poly(t); x.fillStyle = shade('#8c2f24', .2 * K.face(nrm[q])); x.fill(); }); K.rr(cx - s, cy - s, 2 * s, 2 * s); K.edge('#efeae0', 1.2); x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = .6; x.beginPath(); x.moveTo(cx - s, cy - s); x.lineTo(cx + s, cy + s); x.moveTo(cx + s, cy - s); x.lineTo(cx - s, cy + s); x.stroke(); // the cupola
      x.strokeStyle = '#2b2b2e'; x.lineWidth = .8; x.beginPath(); x.moveTo(cx - 5, cy); x.lineTo(cx + 5, cy); x.moveTo(cx + 5, cy); x.lineTo(cx + 3, cy - 1.6); x.moveTo(cx + 5, cy); x.lineTo(cx + 3, cy + 1.6); x.stroke(); // its weathervane
      const dx = cx - 13, dy = hz ? Y + h - 5 : cy; if (hz) { K.box(dx, dy, 26, 7, '#7a2a20', { r: .6, sh: 1.8 }); x.strokeStyle = '#efeae0'; x.lineWidth = 1.2; x.strokeRect(dx + .6, dy + .6, 24.8, 5.8); x.beginPath(); x.moveTo(dx + 1, dy + 1); x.lineTo(dx + 25, dy + 6); x.moveTo(dx + 25, dy + 1); x.lineTo(dx + 1, dy + 6); x.stroke(); } return; } // the hay loft's door
    case 'hedge': { // a clipped hedge: a dark, dense core, uneven clumps along it lit from the top-left, and hundreds of small leaves over them, each lit on its light side
      const hc = season && (x === octx || PK_FOR === octx) ? gradeHex(c, season.id === 'autumn' ? .3 : .8) : c, rad = D * .56, at = (t, j) => hz ? [X + t * w, cy + j] : [cx + j, Y + t * h];
      K.rr(X - .5, Y - .5, w + 1, h + 1, D * .45); x.fillStyle = shade(hc, -.38); x.fill();
      for (let t = 0; t < L; t += 3.5 + R() * 5) { const [px, py] = at(Math.min(1, (t + 2) / L), (R() - .5) * 1.8), rr = rad * (.72 + R() * .34); x.fillStyle = K.rad(px, py, rr, shade(hc, (R() - .5) * .1 - .06), .16, -.3); K.round(px, py, rr); x.fill(); } // the clumps the shears left, not evenly spaced
      const n = Math.round(L * D / 4.2), lxn = K.lx / (Math.hypot(K.lx, K.ly) || 1), lyn = K.ly / (Math.hypot(K.lx, K.ly) || 1);
      for (let q = 0; q < n; q++) { const j = (R() - .5) * D * .86, [px, py] = at(R(), j), a = R() * TAU, len = 1.2 + R() * .8, wd = .55 + R() * .3, edge = Math.abs(j) / D * 2, toL = ((hz ? 0 : j) * lxn + (hz ? j : 0) * lyn) / D * 2;
        const col = shade(hc, (R() - .5) * .16 - edge * .16 + toL * .1), up = Math.cos(a + Math.PI / 2) * lxn + Math.sin(a + Math.PI / 2) * lyn > 0;
        x.fillStyle = col; x.beginPath(); x.ellipse(px, py, len, wd, a, 0, TAU); x.fill(); x.fillStyle = shade(col, .14); x.beginPath(); x.ellipse(px, py, len, wd, a, up ? 0 : Math.PI, up ? Math.PI : TAU); x.fill(); } // (the half that faces the light, brighter)
      x.fillStyle = shade(hc, .3); for (let q = 0; q < L / 6; q++) { const [px, py] = at(R(), (R() - .5) * D * .6); K.oval(px + K.lx * 1.2, py + K.ly * 1.2, .9, .5, R() * TAU); x.fill(); } // a few new leaves catching the sun
      return; }
    case 'glass': // a glass wall: pale panes in an aluminium frame, mullions every so often, reflections slanting across
      K.glass(X, Y, w, h, '#a9d4e6', { a: .62, ec: 0, r: 0 });
      x.strokeStyle = '#7d98a3'; x.lineWidth = 1.6; x.strokeRect(X + .8, Y + .8, w - 1.6, h - 1.6); x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = .5; x.strokeRect(X + .4, Y + .4, w - 1.6, h - 1.6);
      for (let p = (hz ? X : Y) + 60; p < (hz ? X + w : Y + h) - 10; p += 60) K.box(hz ? p - 1.2 : X, hz ? Y : p - 1.2, hz ? 2.4 : w, hz ? h : 2.4, '#8aa3ad', { r: 0, bev: .5, ec: 0 });
      return;
    case 'desk': {
      if (o.reception) { // a reception counter: its raised ledge along the front, a monitor and a bell behind it
        K.plank(X, Y, w, h, c, true, propSeed(o), { r: 2 }); K.box(X - .5, Y - .5, w + 1, 7, shade(c, .14), { r: 2, sh: 1.6 }); K.grain(X, Y, w, 6, shade(c, .14), true, propSeed(o, 1), .25);
        K.box(cx - 10, Y + 10, 20, 10, '#24252b', { r: 1, sh: 1.4 }); K.box(cx - 8.5, Y + 11.2, 17, 7.4, '#5a8ad0', { r: .5, bev: 0, ec: 0, fill: K.lin(0, Y + 11, 0, Y + 19, [[0, '#7aa6e6'], [1, '#3b6aac']]) });
        K.disc(X + w * .78, Y + h * .62, 3, '#d9b13b', { gl: .5, sh: 1.2 }); K.disc(X + w * .2, Y + h * .6, 4, '#f2efe8', { sh: 1, ec: '#9a948a' }); return; }
      const my = o.flip ? Y + 6 : Y + h - 12, chy = o.flip ? Y + h + 5 : Y - 5;
      for (const f of [.27, .73]) chair(x, X + w * f, chy, o.flip ? -Math.PI / 2 : Math.PI / 2, '#2d2e35', { office: true, s: 10 }); // office chairs pulled up to it
      K.plank(X, Y, w, h, c, true, propSeed(o), { r: 1.6 });
      for (const f of [.27, .73]) { const mx = X + w * f, ky = o.flip ? my + 8 : my - 8, sy = o.flip ? my - 3.4 : my + 5;
        K.box(mx - 3, sy, 6, 3.4, '#2a2b30', { r: 1.2, sh: 1 }); // the monitor's stand behind it
        K.box(mx - 10, my, 20, 5, '#1d1e23', { r: 1.2, sh: 1.6 }); K.box(mx - 8, my + 1, 16, 3, '#5a8ad0', { r: .4, bev: 0, ec: 0, fill: K.lin(mx - 8, 0, mx + 8, 0, [[0, '#86b0ec'], [.5, '#5a8ad0'], [1, '#3d6cb0']]) }); // the screen, facing the chair
        K.box(mx - 7, ky, 14, 4, '#e2e3e7', { r: .8, sh: 1 }); x.fillStyle = 'rgba(0,0,0,.18)'; for (let q = 0; q < 3; q++) x.fillRect(mx - 6, ky + .8 + q * 1.1, 12, .45); // the keyboard
        K.disc(mx + 10.5, ky + 2, 1.5, '#e8e9ec', { ec: '#8a8c92', ew: .4 }); }
      { const v = R(); if (v < .5) { K.disc(X + w * .5 + (R() - .5) * w * .2, Y + h * .45, 2.2, '#f2efe8', { sh: 1, ec: '#9a948a', ew: .4 }); K.hole(X + w * .5, Y + h * .45, 1.5, '#3e2414'); } // a mug of coffee, or a few papers
        else { x.save(); x.translate(X + w * .5, Y + h * .5); x.rotate((R() - .5) * .6); K.box(-3.5, -4.5, 7, 9, '#f7f5f0', { r: .3, sh: 1, bev: 0, ec: 'rgba(0,0,0,.2)', ew: .4 }); x.fillStyle = 'rgba(60,70,90,.35)'; for (let q = -3; q < 3.5; q += 1.3) x.fillRect(-2.6, q, 5.2, .4); x.restore(); } }
      return; }
    case 'couch': case 'booth': inFrame(x, cx, cy, along, K => { const x = K.x, x0 = -L / 2, y0 = -D / 2, booth = k === 'booth'; // a sofa (or a diner booth): a padded back along one side, arms at the ends, plump seat cushions
      K.box(x0, y0, L, D, shade(c, -.25), { r: 3 });
      K.cushion(x0 + 1, y0 + 1, L - 2, D * .34, shade(c, -.06), { r: 3 });
      if (booth) { x.fillStyle = 'rgba(0,0,0,.35)'; for (let u = x0 + 7; u < x0 + L - 4; u += 8) for (const v of [y0 + D * .1, y0 + D * .26]) { K.round(u + (v > y0 + D * .2 ? 4 : 0), v, .8); x.fill(); } } // tufted buttons
      for (const ex of [x0 + 1, x0 + L - 6]) K.cushion(ex, y0 + 1, 5, D - 2, shade(c, -.12), { r: 2.4 });
      const n = booth ? 1 : Math.max(2, Math.round((L - 12) / 30)), sw = (L - 12) / n;
      for (let q = 0; q < n; q++) K.cushion(x0 + 6 + q * sw + .4, y0 + D * .36, sw - .8, D * .6, c, { r: 3, sh: 1.2 });
      if (!booth) K.cushion(x0 + 7, y0 + D * .3, 9, 8, shade(c, .2), { r: 3, sh: 1.2 }); }); // a throw cushion
      return;
    case 'bench': inFrame(x, cx, cy, along, K => benchSlats(K, L, D, c, propSeed(o))); return;
    case 'fence': inFrame(x, cx, cy, along, K => { const x = K.x; // a wooden fence: the rail along the top, posts every few feet with their caps
      K.plank(-L / 2, -D * .24, L, D * .48, c, true, propSeed(o), { r: .6, bev: .5 });
      for (let p = -L / 2 + 2.5; p < L / 2; p += 16) { K.box(p - 2.6, -D / 2 - .6, 5.2, D + 1.2, shade(c, -.08), { r: .7, bev: .7 }); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = .4; K.round(p, 0, 1.2); x.stroke(); } }); return; // (the rings on each post's sawn top)
    case 'car': return drawCar(x, o);
    case 'crate':
      if (o.printer) return inFrame(x, cx, cy, along, K => { const x = K.x; // an office printer: grey plastic, the scanner lid, a little screen, paper in the out tray
        K.box(-L / 2, -D / 2, L, D, c, { r: 3, hi: .16 }); K.box(-L / 2 + 3, -D / 2 + 3, L * .62, D - 6, shade(c, .05), { r: 2, sh: 1.2 }); x.strokeStyle = 'rgba(0,0,0,.2)'; x.lineWidth = .6; x.beginPath(); x.moveTo(-L / 2 + 5, -D / 2 + 5); x.lineTo(-L / 2 + 3 + L * .62 - 2, -D / 2 + 5); x.stroke();
        K.box(L * .2, -D / 2 + 4, L * .22, D * .32, '#33363c', { r: 1 }); K.box(L * .22, -D / 2 + 5, L * .1, D * .2, '#7fd0a0', { r: .4, bev: 0, ec: 0 }); for (let q = 0; q < 3; q++) K.disc(L * .36 + q * 0, -D / 2 + 6 + q * 3, .9, '#9aa0a6', { ec: 0 });
        K.box(L * .1, D * .02, L * .36, D * .4, '#f6f6f2', { r: .5, sh: 1.2, ec: 'rgba(0,0,0,.2)', ew: .4 }); });
      if (o.dumpster) return inFrame(x, cx, cy, hz ? 0 : -Math.PI / 2, K => { const x = K.x; // a dumpster: a ribbed green steel box, two plastic lids on a hinge bar
        K.metal(-L / 2, -D / 2, L, D, c, true, { r: 1.5 }); for (const sg of [-1, 1]) K.box(sg > 0 ? .6 : -L / 2 + 1.8, -D / 2 + 1.8, L / 2 - 2.4, D - 3.6, shade(c, -.28), { r: 1.2, sh: 1.2 });
        x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = .5; x.beginPath(); for (let q = -L / 2 + 4; q < L / 2 - 2; q += 3.2) { x.moveTo(q, -D / 2 + 3); x.lineTo(q, D / 2 - 3); } x.stroke(); K.box(-L / 2 + 1, -1, L - 2, 2, '#c9cdd2', { r: .5, bev: .4 }); });
      if (o.pump) return inFrame(x, cx, cy, hz ? 0 : -Math.PI / 2, K => { const x = K.x; // a pump island: a raised kerb, two pumps with their screens and hoses, bollards at the ends
        K.box(-L / 2 - 2, -D / 2 - 2, L + 4, D + 4, '#8a867d', { r: 2 }); K.box(-L / 2, -D / 2, L, D, '#a29d93', { r: 1.5 });
        for (const fx of [-.22, .22]) { K.box(L * fx - 6, -D / 2 + 1, 12, D - 2, '#e6e6e2', { r: 1.4, sh: 2 }); K.box(L * fx - 6, -D / 2 + 1, 2.6, D - 2, '#c0392b', { r: .8, bev: .5 }); K.box(L * fx - 2, -D / 2 + 2.2, 5.6, D - 4.4, '#1d1d22', { r: .6, fill: K.lin(0, -D / 2, 0, D / 2, [[0, '#2a3b46'], [1, '#14181c']]) });
          x.strokeStyle = '#1a1a1d'; x.lineWidth = 1; x.beginPath(); x.moveTo(L * fx + 6, D * .2); x.quadraticCurveTo(L * fx + 9, D * .5, L * fx + 4, D / 2 + .6); x.stroke(); }
        for (const ex of [-L / 2 + 2, L / 2 - 2]) K.disc(ex, 0, 2, '#e8b326', { gl: .4, ec: '#7a5a10', ew: .5 }); });
      if (o.trough) return inFrame(x, cx, cy, along, K => { K.metal(-L / 2, -D / 2, L, D, c, true, { r: 2.4 }); K.box(-L / 2 + 2.4, -D / 2 + 2.4, L - 4.8, D - 4.8, '#4f8db0', { r: 1.6, bev: 0, fill: K.lin(0, -D / 2, 0, D / 2, [[0, '#3c7092'], [1, '#78b9d8']]) }); K.glint(-L * .1, 0, D * .8, .35); }); // a galvanised trough of water
      if (isWood(c)) return inFrame(x, cx, cy, along, K => { const x = K.x, fw = Math.max(2.5, D * .14); // a wooden crate: boards inside a frame, a diagonal brace, nails at the corners
        K.box(-L / 2, -D / 2, L, D, shade(c, -.25), { r: .8 });
        const n = Math.max(2, Math.round((D - 2 * fw) / 6)), bw = (D - 2 * fw) / n; for (let q = 0; q < n; q++) K.plank(-L / 2 + fw, -D / 2 + fw + q * bw + .3, L - 2 * fw, bw - .6, shade(c, (R() - .5) * .1), true, propSeed(o, q), { r: .3, bev: .4 });
        const brace = Math.atan2(D - 2 * fw, L - 2 * fw); x.save(); x.rotate(brace); K.plank(-Math.hypot(L, D) / 2 + fw, -fw / 2, Math.hypot(L - 2 * fw, D - 2 * fw) + fw * .4, fw, shade(c, .06), true, propSeed(o, 9), { r: .3, sh: 1 }); x.restore();
        for (const [ex, ey, ew, eh] of [[-L / 2, -D / 2, L, fw], [-L / 2, D / 2 - fw, L, fw], [-L / 2, -D / 2, fw, D], [L / 2 - fw, -D / 2, fw, D]]) K.plank(ex, ey, ew, eh, shade(c, .04), ew > eh, propSeed(o, ex + ey), { r: .3, bev: .6 });
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) K.bolt(sx * (L / 2 - fw / 2), sy * (D / 2 - fw / 2), .55); });
      return inFrame(x, cx, cy, along, K => { const x = K.x; // a steel cargo crate: ribbed sides, corner castings, a stencilled plate
        K.metal(-L / 2, -D / 2, L, D, c, true, { r: 1.4 }); for (let q = -L / 2 + 5; q < L / 2 - 3; q += 5) { x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(q, -D / 2 + 2.5, 1.2, D - 5); x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(q - .8, -D / 2 + 2.5, .8, D - 5); }
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) K.box(sx * (L / 2 - 2.2) - 2.2, sy * (D / 2 - 2.2) - 2.2, 4.4, 4.4, shade(c, -.3), { r: .6, bev: .5 });
        K.box(-L * .18, -D * .14, L * .36, D * .28, '#d8d4c4', { r: .4, sh: .8 }); hazard(x, -L * .16, -D * .1, L * .32, D * .07); x.fillStyle = 'rgba(30,30,30,.5)'; x.fillRect(-L * .14, D * .02, L * .2, D * .05); });
    case 'shelf':
      if (o.fridge) return inFrame(x, cx, cy, along, K => { const x = K.x; K.box(-L / 2, -D / 2, L, D, '#eef0f3', { r: 2.6, hi: .06, lo: -.14 }); x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = .6; x.beginPath(); x.moveTo(-L * .08, -D / 2 + 2); x.lineTo(-L * .08, D / 2 - 2); x.stroke(); K.box(-L * .08 - 5, D / 2 - 4, 3, 2, '#b8bcc4', { r: .8, sh: .8 }); K.box(L * .2, -D * .2, 6, 7, '#ffd23f', { r: .4, sh: .8, bev: 0 }); K.glint(0, 0, L * .4, .18); }); // a fridge: the freezer door's seam, a handle, a note under a magnet
      if (o.plants) return inFrame(x, cx, cy, along, K => { K.metal(-L / 2, -D / 2, L, D, c, true, { r: 1.5 }); for (let u = -L / 2 + 8; u < L / 2 - 4; u += 12) { K.box(u - 5.5, -D / 2 + 2.5, 11, D - 5, '#2b3b2a', { r: 1, bev: .5 }); for (let v = -D / 2 + 6; v < D / 2 - 4; v += 7) K.leaves(u, v, 3.6, '#5fbf48', propSeed(o, u * 3 + v), 4); } }); // a hydroponic rack: trays of seedlings
      if (o.suits) return inFrame(x, cx, cy, along, K => { const x = K.x; K.metal(-L / 2, -D / 2, L, D, c, true, { r: 1.5 }); x.fillStyle = '#596274'; x.fillRect(-L / 2 + 2, -D * .36, L - 4, 1.4); for (let u = -L / 2 + 16; u < L / 2; u += 30) { K.box(u - 7, -D * .1, 14, D * .44, '#dfe3e8', { r: 2.5, sh: 1.6 }); K.disc(u, -D * .12, 9.5, '#eef1f4', { sh: 1.8, gl: .4 }); K.oval(u, -D * .12 - 2.6, 6, 4); x.fillStyle = K.lin(u - 6, 0, u + 6, 0, [[0, '#e3b24a'], [1, '#8a5a12']]); x.fill(); K.glint(u, -D * .12 - 2.6, 5, .6); } }); // spacesuits on a rack: helmets with gold visors, packs behind
      if (!isWood(c)) return inFrame(x, cx, cy, along, K => { const x = K.x; K.metal(-L / 2, -D / 2, L, D, c, true, { r: 1 }); // steel shelving: cardboard boxes and tins
        for (let u = -L / 2 + 2; u < L / 2 - 6;) { const bw = 7 + R() * 8, kind = R(); if (kind < .65) { K.box(u, -D / 2 + 2, Math.min(bw, L / 2 - 2 - u), D - 4, shade('#b08a5a', (R() - .5) * .2), { r: .5, sh: 1 }); x.fillStyle = 'rgba(200,180,140,.6)'; x.fillRect(u + Math.min(bw, L / 2 - 2 - u) / 2 - .6, -D / 2 + 2, 1.2, D - 4); } else for (let v = -D / 2 + 4; v < D / 2 - 2; v += 5) K.disc(u + 3, v, 2.2, '#9aa1aa', { gl: .4, ec: '#5a6068', ew: .4 }); u += bw + 1.2; } });
      return inFrame(x, cx, cy, along, K => { const x = K.x; K.box(-L / 2, -D / 2, L, D, shade(c, -.1), { r: 1 }); K.box(-L / 2 + 1.5, -D / 2 + 1.5, L - 3, D - 3, shade(c, -.45), { r: .5, bev: 0 }); // a bookcase from above: the tops of the books, all heights and colors, a few lying flat
        for (let u = -L / 2 + 2; u < L / 2 - 2;) { const t = 2 + R() * 3, col = BOOKS[Math.floor(R() * BOOKS.length)], dep = (D - 4) * (.72 + R() * .26); if (R() < .07 && u < L / 2 - 12) { for (let q = 0; q < 3; q++) K.box(u + q * .5, -D / 2 + 2 + q * .6, 9 - q, D - 5 - q * 1.2, BOOKS[Math.floor(R() * BOOKS.length)], { r: .4, sh: .8 }); u += 10; continue; } if (R() < .06) { u += 3; continue; }
          K.box(u, D / 2 - 2 - dep, Math.min(t, L / 2 - 2 - u), dep, col, { r: .4, bev: .4, ec: shade(col, -.55), ew: .4 }); u += t + .3; }
        K.plank(-L / 2, -D / 2, L, 1.6, shade(c, .05), true, propSeed(o), { r: .3, bev: 0 }); });
    case 'bed': inFrame(x, cx, cy, hz ? 0 : Math.PI / 2, K => { const x = K.x, x0 = -L / 2, y0 = -D / 2; // a bed: its frame, the sheet, a plump pillow at the head, a blanket turned back
      if (o.med) { K.metal(x0, y0, L, D, '#8a929c', true, { r: 2 }); for (const sg of [-1, 1]) K.box(x0 + L * .2, sg * (D / 2 - 1.2) - .9, L * .6, 1.8, '#c6ccd2', { r: .9, sh: 1 }); } // (a hospital bed: steel, with side rails)
      else K.box(x0, y0, L, D, '#3a3a40', { r: 1.6 });
      K.box(x0 + 1.6, y0 + 1.6, L - 3.2, D - 3.2, '#ece9e1', { r: 2.2, bev: .8 });
      K.cushion(x0 + 3, y0 + 3, Math.min(16, L * .18), D - 6, '#f6f4ee', { r: 3, sh: 1.2 });
      const bx = x0 + L * (o.med ? .3 : .42), bw = L / 2 - 1.6 - bx, col = o.med ? '#7fb3d0' : c, bf = () => K.rr(bx, y0 + 1.2, bw, D - 2.4, 2);
      K.drop(bf, 1.4, .25); bf(); x.fillStyle = K.lit(bx, y0, bw, D, col, .14, -.22); x.fill(); x.save(); bf(); x.clip(); x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = .8; for (let q = 0; q < 4; q++) { const u = bx + bw * (.2 + q * .2) + (R() - .5) * 4; x.beginPath(); x.moveTo(u, y0); x.quadraticCurveTo(u + 4, 0, u - 2, -y0); x.stroke(); } x.restore(); // folds
      K.box(bx - 3, y0 + 1.2, 4, D - 2.4, shade(col, .25), { r: 1.4, sh: 1.2 }); bf(); K.edge(shade(col, -.45), .6); }); return; // the turned-back edge
    case 'console': // a console: a steel desk of screens (each its own color) and rows of little lit buttons
      K.metal(X, Y, w, h, c, true, { r: 1.6 });
      for (let p = X + 6; p < X + w - 14; p += 22) { const col = CONSOLE_LIGHTS[Math.floor(p / 22) % 4];
        K.box(p, Y + 4, 18, h - 8, '#0f1a1e', { r: 1.2, bev: .7 }); K.box(p + 2, Y + 6, 14, h - 14, col, { r: .5, bev: 0, ec: 0, fill: K.lin(0, Y + 6, 0, Y + h - 8, [[0, shade(col, .25)], [1, shade(col, -.35)]]) });
        x.fillStyle = 'rgba(0,0,0,.28)'; for (let q = Y + 8; q < Y + h - 9; q += 2.2) x.fillRect(p + 3, q, 6 + R() * 6, .6);
        for (let q = 0; q < 3; q++) K.disc(p + 4 + q * 5, Y + h - 6.2 + (h > 22 ? 0 : 1), .9, CONSOLE_LIGHTS[(q + Math.floor(p / 22)) % 4], { ec: 'rgba(0,0,0,.5)', ew: .3 }); }
      return;
    case 'cryo': // a cryo tube: a steel frame round a frosted glass capsule, a shape asleep inside, pipes in at the top
      K.metal(X, Y, w, h, '#5b6b72', false, { r: 3 });
      K.glass(X + 4, Y + 4, w - 8, h - 8, '#aee6fb', { a: .85, r: 8, ec: '#3f5a64' });
      x.save(); K.rr(X + 4, Y + 4, w - 8, h - 8, 8); x.clip(); x.fillStyle = 'rgba(40,70,60,.5)'; K.round(cx, Y + 14, 5); x.fill(); K.oval(cx, cy + 6, 6, 16); x.fill();
      for (let q = 0; q < 10; q++) { const px = X + 4 + (R() < .5 ? R() * 5 : w - 8 - R() * 5), py = Y + 4 + R() * (h - 8), g = x.createRadialGradient(px, py, 0, px, py, 5); g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(px - 5, py - 5, 10, 10); } x.restore(); // frost creeping in from the sides
      for (const sx of [-5, 5]) K.box(cx + sx - 1.2, Y - 2, 2.4, 6, '#8a9aa2', { r: 1, sh: 1 }); K.disc(X + w - 6, Y + h - 6, 1.6, '#5fffd0', { ec: 0, gl: .5 }); return;
    case 'tube': // a connecting tunnel: a pale cylinder lit along its near side, ribbed every so often, collars at the ends
      x.fillStyle = K.lin(...(hz ? [0, Y, 0, Y + h] : [X, 0, X + w, 0]), [[0, shade(c, -.12)], [.28, shade(c, .22)], [.55, c], [1, shade(c, -.32)]]); x.fillRect(X, Y, w, h);
      for (let p = 8; p < L - 4; p += 14) { const q = (hz ? X : Y) + p; x.fillStyle = 'rgba(0,0,0,.16)'; hz ? x.fillRect(q, Y, 1.4, h) : x.fillRect(X, q, w, 1.4); x.fillStyle = 'rgba(255,255,255,.18)'; hz ? x.fillRect(q - .9, Y, .9, h) : x.fillRect(X, q - .9, w, .9); }
      for (const e of [0, L - 3.5]) K.box(hz ? X + e : X - .6, hz ? Y - .6 : Y + e, hz ? 3.5 : w + 1.2, hz ? h + 1.2 : 3.5, shade(c, -.15), { r: .6, bev: .6 });
      x.strokeStyle = shade(c, -.5); x.lineWidth = .7; x.beginPath(); hz ? (x.moveTo(X, Y + .35), x.lineTo(X + w, Y + .35), x.moveTo(X, Y + h - .35), x.lineTo(X + w, Y + h - .35)) : (x.moveTo(X + .35, Y), x.lineTo(X + .35, Y + h), x.moveTo(X + w - .35, Y), x.lineTo(X + w - .35, Y + h)); x.stroke(); return;
    case 'module': { // a habitat module: hull panels in a grid, each a shade apart, portholes along its edge, a hatch at each end
      K.box(X, Y, w, h, shade(c, -.12), { r: 5 }); K.box(X + 3, Y + 3, w - 6, h - 6, c, { r: 3.5, bev: 1 });
      x.save(); K.rr(X + 3, Y + 3, w - 6, h - 6, 3.5); x.clip(); for (let px = X + 3; px < X + w - 3; px += 20) for (let py = Y + 3; py < Y + h - 3; py += 20) { x.fillStyle = R() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'; x.fillRect(px, py, 20, 20); }
      x.strokeStyle = 'rgba(0,0,0,.14)'; x.lineWidth = .7; x.beginPath(); for (let px = X + 23; px < X + w - 3; px += 20) { x.moveTo(px, Y + 3); x.lineTo(px, Y + h - 3); } for (let py = Y + 23; py < Y + h - 3; py += 20) { x.moveTo(X + 3, py); x.lineTo(X + w - 3, py); } x.stroke();
      for (let px = X + 23; px < X + w - 3; px += 20) for (let py = Y + 23; py < Y + h - 3; py += 20) K.bolt(px, py, .55); x.restore();
      if (o.command) { const tx = X + 40, ty = Y + 40, tw = w - 80, th = h - 80; for (let q = tx + 14; q < tx + tw - 6; q += 26) { chair(x, q, ty - 7, Math.PI / 2, '#3c4250', { office: true, s: 9 }); chair(x, q, ty + th + 7, -Math.PI / 2, '#3c4250', { office: true, s: 9 }); }
        K.box(tx, ty, tw, th, '#2b3240', { r: 10, sh: 2 }); K.box(tx + 6, ty + 6, tw - 12, th - 12, '#1d222c', { r: 6, bev: .8 }); for (let p = X + 50; p < X + w - 50; p += 18) K.box(p, Y + 48, 12, 6, '#5fbfff', { r: .5, bev: 0, ec: 0, fill: K.lin(0, Y + 48, 0, Y + 54, [[0, '#a6dcff'], [1, '#3f8fd0']]) }); }
      for (const f of [.25, .5, .75]) { const wx = X + w * f; K.box(wx - 6, Y + .6, 12, 3.6, '#4a6b8a', { r: 1.6, fill: K.lin(wx - 6, 0, wx + 6, 0, [[0, '#7da4c6'], [1, '#2f4c68']]), ec: '#2a3a48', ew: .5 }); }
      for (const ex of [X + 1, X + w - 5]) K.box(ex, cy - 7, 4, 14, shade(c, -.2), { r: 1, bev: .6 });
      return; }
    case 'solar': // a solar array: dark cells in an aluminium frame, the sky's sheen sliding across them
      K.box(X, Y, w, h, '#a5acb5', { r: .8 }); K.rr(X + 2, Y + 2, w - 4, h - 4); x.fillStyle = K.lin(X, Y, X + w, Y + h, [[0, '#3a5490'], [.45, '#1f2f5c'], [1, '#162246']]); x.fill();
      x.save(); K.rr(X + 2, Y + 2, w - 4, h - 4); x.clip(); x.strokeStyle = 'rgba(170,195,255,.32)'; x.lineWidth = .5; x.beginPath(); for (let p = X + 2; p < X + w; p += 8) { x.moveTo(p, Y + 2); x.lineTo(p, Y + h - 2); } for (let p = Y + 2; p < Y + h; p += 8) { x.moveTo(X + 2, p); x.lineTo(X + w - 2, p); } x.stroke();
      x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.moveTo(X + w * .15, Y); x.lineTo(X + w * .45, Y); x.lineTo(X + w * .3, Y + h); x.lineTo(X, Y + h); x.fill(); x.restore(); return;
    case 'tent': inFrame(x, cx, cy, along, K => { const x = K.x, x0 = -L / 2, y0 = -D / 2; // a ridge tent: two fly panels (one in the sun), guy lines out to pegs, the door's zip at one end
      x.strokeStyle = 'rgba(60,40,20,.55)'; x.lineWidth = .6; x.beginPath(); for (const [dx, dy] of [[-L / 2 - 8, -D / 2 - 6], [L / 2 + 8, -D / 2 - 6], [-L / 2 - 8, D / 2 + 6], [L / 2 + 8, D / 2 + 6]]) { x.moveTo(Math.sign(dx) * L / 2 * .9, Math.sign(dy) * D / 2); x.lineTo(dx, dy); } x.stroke();
      for (const [dx, dy] of [[-L / 2 - 8, -D / 2 - 6], [L / 2 + 8, -D / 2 - 6], [-L / 2 - 8, D / 2 + 6], [L / 2 + 8, D / 2 + 6]]) K.disc(dx, dy, .9, '#8a8f95', { ec: 0 });
      for (const sg of [-1, 1]) { const f = () => { x.beginPath(); x.moveTo(x0, 0); x.lineTo(-x0, 0); x.quadraticCurveTo(-x0 + 1, sg * D / 2 * .5, -x0, sg * D / 2); x.lineTo(x0, sg * D / 2); x.quadraticCurveTo(x0 - 1, sg * D / 2 * .5, x0, 0); x.closePath(); };
        f(); x.fillStyle = K.lin(0, 0, 0, sg * D / 2, [[0, shade(c, .14 * K.face([0, sg]) + .06)], [1, shade(c, .14 * K.face([0, sg]) - .12)]]); x.fill();
        x.save(); f(); x.clip(); x.strokeStyle = 'rgba(0,0,0,.1)'; x.lineWidth = .8; for (let u = x0 + 8; u < -x0; u += 9) { x.beginPath(); x.moveTo(u, 0); x.quadraticCurveTo(u + 2, sg * D * .25, u - 1, sg * D / 2); x.stroke(); } x.restore(); f(); K.edge(shade(c, -.45), .7); }
      x.strokeStyle = shade(c, -.4); x.lineWidth = 1.3; x.beginPath(); x.moveTo(x0, 0); x.lineTo(-x0, 0); x.stroke(); x.strokeStyle = shade(c, .3); x.lineWidth = .4; x.beginPath(); x.moveTo(x0, -.6); x.lineTo(-x0, -.6); x.stroke();
      x.fillStyle = '#3a2a1a'; x.beginPath(); x.moveTo(-x0, -5); x.quadraticCurveTo(-x0 - 6, 0, -x0, 5); x.fill(); }); return;
    case 'generator': // a diesel generator: a steel housing, its louvres, the exhaust stack, a control panel and its amber warning lamp
      K.metal(X, Y, w, h, c, true, { r: 2.4 }); K.box(X + 4, Y + 4, w - 8, 10, shade(c, .12), { r: 1.2 });
      for (let p = Y + 20; p < Y + h - 6; p += 7) { K.box(X + 8, p, w - 16, 3.2, '#1b1d20', { r: .8, bev: 0, ec: 0 }); x.fillStyle = 'rgba(255,255,255,.14)'; x.fillRect(X + 8, p + 3.2, w - 16, .7); }
      K.disc(X + w * .2, Y + 9, 4, '#2a2c2f', { sh: 1.6, gl: .3 }); K.hole(X + w * .2, Y + 9, 2.4, '#0f1012');
      K.box(X + w * .35, Y + 5.5, w * .25, 7, '#22252a', { r: .8 }); for (let q = 0; q < 3; q++) K.disc(X + w * .38 + q * 4, Y + 9, .9, ['#5fd06a', '#ff5a4a', '#ffffff'][q], { ec: 0 });
      K.box(X + w - 14, Y + 4, 8, 8, '#3a3a3e', { r: 1.4 }); K.disc(X + w - 10, Y + 8, 2.9, '#e8b326', { hi: .55, lo: -.2, gl: .6, ec: '#7a5a10', ew: .4 });
      hazard(x, X + 2, Y + h - 5, Math.min(30, w * .3), 3); return;
    case 'dj': // the DJ booth: two turntables with spinning vinyl and tone arms, the mixer between them, faders and lit pads
      K.box(X, Y, w, h, c, { r: 2.4 });
      for (const fx of [.2, .8]) { const tx = X + w * fx, ty = cy; K.box(tx - 17, ty - 17, 34, 34, '#2a2830', { r: 2, sh: 1.4, bev: .7 }); K.disc(tx, ty, 14, '#0c0a0e', { flat: 1, hi: .3, lo: -.2, ec: '#000' });
        x.strokeStyle = 'rgba(255,255,255,.06)'; x.lineWidth = .4; for (let rr = 5; rr < 13.6; rr += 1.1) { K.round(tx, ty, rr); x.stroke(); }
        x.save(); x.beginPath(); x.moveTo(tx, ty); x.arc(tx, ty, 13.6, Math.PI * 1.1, Math.PI * 1.35); x.closePath(); x.fillStyle = 'rgba(255,255,255,.1)'; x.fill(); x.restore(); // the light sliding round the grooves
        K.disc(tx, ty, 4.2, '#c9a227', { hi: .3, ec: '#5a4a10', ew: .4 }); K.disc(tx, ty, .9, '#d8d8d8', { ec: 0 });
        x.strokeStyle = '#c8ccd2'; x.lineWidth = 1; x.lineCap = 'round'; x.beginPath(); x.moveTo(tx + 13, ty - 13); x.lineTo(tx + 12, ty + 2); x.lineTo(tx + 6, ty + 6); x.stroke(); K.box(tx + 4.5, ty + 4.5, 3.4, 2.4, '#6a6e74', { r: .5 }); K.disc(tx + 13, ty - 13, 2, '#3a3c40', { gl: .4 }); }
      K.box(X + w * .38, Y + 8, w * .24, h - 16, '#2b2733', { r: 1.4, sh: 1.4 }); x.fillStyle = '#0b0a0d'; for (let p = 0; p < 4; p++) x.fillRect(X + w * .41 + p * 7 + 1.4, Y + 17, 1.1, h - 30);
      x.fillStyle = '#ff3fa4'; for (let p = 0; p < 4; p++) x.fillRect(X + w * .41 + p * 7, Y + 12, 4, 3); for (let p = 0; p < 4; p++) K.box(X + w * .41 + p * 7 + .2, Y + 21 + (p * 5 % 9), 3.6, 2.2, '#d8dade', { r: .4, bev: 0, ec: 'rgba(0,0,0,.5)', ew: .3 });
      x.fillStyle = '#3fd4ff'; x.fillRect(X + w * .41, Y + h - 16, 26, 2); return;
    case 'speaker': { // a club speaker: a black cabinet, big woofer cones in their surrounds, corner guards
      K.box(X, Y, w, h, c, { r: 2.4 }); x.save(); K.rr(X + 2, Y + 2, w - 4, h - 4, 1.6); x.clip(); x.fillStyle = 'rgba(255,255,255,.035)'; for (let p = X; p < X + w; p += 2) x.fillRect(p, Y, .8, h); x.restore();
      const big = Math.min(w, h) * .32, cones = h >= w ? [[cx, Y + h * .3], [cx, Y + h * .72]] : [[X + w * .3, cy], [X + w * .72, cy]];
      for (const [px, py] of cones) { K.disc(px, py, big, '#26232c', { flat: 1, ec: '#000' }); K.hole(px, py, big * .82, '#1a181e'); K.disc(px, py, big * .34, '#121015', { hi: .5, lo: -.2, gl: .3, ec: 0 }); for (let q = 0; q < 4; q++) K.bolt(px + Math.cos(q * TAU / 4 + .78) * big * .92, py + Math.sin(q * TAU / 4 + .78) * big * .92, .55); }
      for (const [ex, ey] of [[X, Y], [X + w, Y], [X, Y + h], [X + w, Y + h]]) K.disc(ex + (ex > X ? -2.6 : 2.6), ey + (ey > Y ? -2.6 : 2.6), 2.2, '#4a4850', { gl: .3 }); return; }
    case 'bar': inFrame(x, cx, cy, along, K => { const x = K.x, wood = isWood(c); // a bar: the counter's top (wood or brushed steel), bottles and glasses along it
      K.box(-L / 2, -D / 2, L, D, shade(c, -.25), { r: 2 }); if (wood) K.plank(-L / 2 + 3, -D / 2 + 3, L - 6, D - 6, c, true, propSeed(o)); else K.metal(-L / 2 + 3, -D / 2 + 3, L - 6, D - 6, c, true);
      const BOTTLES = ['#4f7f36', '#a8822a', '#7a2626', '#c8dceb', '#3a2a1a'];
      for (let p = -L / 2 + 10; p < L / 2 - 6; p += 13) { const v = R(); if (v < .62) { const col = BOTTLES[Math.floor(R() * BOTTLES.length)]; K.disc(p, (R() - .5) * D * .3, 2.6, col, { hi: .4, lo: -.35, sh: 1.2, ec: shade(col, -.55), ew: .4, gl: .6 }); } else if (v < .85) { const gx = p, gy = (R() - .5) * D * .3; K.round(gx, gy, 2.2); x.fillStyle = 'rgba(220,235,245,.35)'; x.fill(); K.edge('rgba(255,255,255,.55)', .5); } } }); return;
    case 'barrier': { const top = [cx, Y + 3.5], bot = [cx, Y + h - 3.5]; // a velvet rope between two brass posts
      x.strokeStyle = '#5a0f1c'; x.lineWidth = 2.6; x.lineCap = 'round'; x.beginPath(); x.moveTo(...top); x.quadraticCurveTo(cx + 4, cy, ...bot); x.stroke(); x.strokeStyle = '#a8283c'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(top[0] - .6, top[1]); x.quadraticCurveTo(cx + 3.2, cy, bot[0] - .6, bot[1]); x.stroke();
      for (const [px, py] of [top, bot]) K.disc(px, py, 3.4, c, { hi: .55, lo: -.3, sh: 1.2, gl: .6, ec: '#6a5410' }); return; }
    case 'slide': inFrame(x, cx, cy, along, K => { const x = K.x; // a playground slide: the chute between raised rails, the ladder at its top
      K.box(-L / 2, -D / 2, L, D, shade(c, -.1), { r: 3 }); K.box(-L / 2 + 2, -D / 2 + 2.6, L - 4, D - 5.2, c, { r: 2, bev: 0, fill: K.lin(0, -D / 2, 0, D / 2, [[0, shade(c, -.2)], [.5, shade(c, .22)], [1, shade(c, -.05)]]) });
      x.strokeStyle = '#7d848c'; x.lineWidth = 1; x.beginPath(); x.moveTo(-L / 2 - 7, -D / 2 + 1); x.lineTo(-L / 2, -D / 2 + 1); x.moveTo(-L / 2 - 7, D / 2 - 1); x.lineTo(-L / 2, D / 2 - 1); for (let q = -L / 2 - 6; q < -L / 2; q += 2.2) { x.moveTo(q, -D / 2 + 1); x.lineTo(q, D / 2 - 1); } x.stroke(); x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = .4; x.stroke(); }); return;
    case 'table':
      if (o.lab) { K.metal(X, Y, w, h, c, hz, { r: 1.6 }); for (let p = (hz ? X : Y) + 12; p < (hz ? X + w : Y + h) - 6; p += 26) { const px = hz ? p : cx, py = hz ? Y + h * .45 : p; K.box(px - 4, py - 6, 8, 12, '#d8eef2', { r: 2.6, a: .7, fill: 'rgba(216,238,242,.55)', ec: 'rgba(255,255,255,.7)', ew: .5 }); K.box(px - 3, py, 6, 5, '#7fffc8', { r: 2, bev: 0, ec: 0, fill: K.lin(0, py, 0, py + 5, [[0, '#a8ffe0'], [1, '#3fbf8f']]) }); K.glint(px, py - 2, 5, .5); } return; } // a lab bench: steel, beakers of something glowing
      { const wood = isWood(c), n = Math.max(1, Math.round((L - 16) / 26)); // a long table with chairs down both sides
        for (let q = 0; q < n; q++) { const u = (hz ? X : Y) + 8 + (q + .5) * (L - 16) / n; for (const sg of [-1, 1]) chair(x, hz ? u : (sg < 0 ? X - 6 : X + w + 6), hz ? (sg < 0 ? Y - 6 : Y + h + 6) : u, hz ? (sg < 0 ? Math.PI / 2 : -Math.PI / 2) : (sg < 0 ? 0 : Math.PI), wood ? shade(c, -.25) : '#3c4250', { s: 9, office: !wood }); }
        if (wood) K.plank(X, Y, w, h, c, hz, propSeed(o), { r: 2, sh: 1.4 }); else K.metal(X, Y, w, h, c, hz, { r: 2 });
        if (L > 60) for (let q = 0; q < Math.round(L / 50); q++) { const u = (hz ? X : Y) + L * (.15 + R() * .7), v = (hz ? Y : X) + D * (.3 + R() * .4), px = hz ? u : v, py = hz ? v : u; if (R() < .5) { x.save(); x.translate(px, py); x.rotate((R() - .5) * .8); K.box(-3.5, -4.5, 7, 9, '#f6f4ef', { r: .3, sh: 1, bev: 0, ec: 'rgba(0,0,0,.2)', ew: .4 }); x.restore(); } else { K.disc(px, py, 2.2, '#f2efe8', { sh: 1, ec: '#9a948a', ew: .4 }); K.hole(px, py, 1.5, '#3e2414'); } } } // papers and mugs
      return;
    default: // walls: a lit top edge, a shaded far one, so they read as height
      K.box(X, Y, w, h, c, { r: 0, bev: Math.min(1.6, D * .14), ha: .22, la: .3, hi: .06, lo: -.08, ec: shade(c, -.45), ew: .7 });
  }
}

function drawDetail(x, o) { // street furniture and markings, drawn to fit their box
  const { x: X, y: Y, w, h } = o, cx = X + w / 2, cy = Y + h / 2, m = Math.min(w, h), K = propKit(x), R = seeded(propSeed(o));
  x.save();
  try { switch (o.d) {
    case 'hazard': { // a painted corridor: dark floor, hazard stripes down both long edges, a dashed center line. Runs along its longer side
      const hz = w >= h, L = hz ? w : h, D = hz ? h : w, e = Math.min(5, D * .12);
      x.translate(cx, cy); if (!hz) x.rotate(Math.PI / 2); x.translate(-L / 2, -D / 2);
      x.fillStyle = '#2f2a28'; x.fillRect(0, 0, L, D);
      x.fillStyle = '#c9a227'; for (let k = 4; k + 20 <= L - 4; k += 40) x.fillRect(k, D / 2 - 1.5, 20, 3);
      if (D > 14) { hazard(x, 0, 0, L, e); hazard(x, 0, D - e, L, e); }
      return; }
    case 'zebra': // a zebra crossing: painted bars, a little worn where the tyres run
      for (let k = 0, n = w > h ? Math.floor((w - 8) / 9) + 1 : Math.floor((h - 8) / 9) + 1; k < n; k++) { const bx = w > h ? X + 4 + k * 9 : X + 2, by = w > h ? Y + 2 : Y + 4 + k * 9, bw = w > h ? 5 : w - 4, bh = w > h ? h - 4 : 5;
        x.fillStyle = 'rgba(236,236,232,.9)'; x.fillRect(bx, by, bw, bh); x.fillStyle = 'rgba(60,60,64,.22)'; for (let q = 0; q < 3; q++) x.fillRect(bx + R() * bw * .7, by + R() * bh * .7, 1 + R() * 2, 1 + R() * 2); }
      return;
    case 'manhole': K.disc(cx, cy, m / 2, '#3c3c42', { flat: 1, hi: .2, lo: -.2, ec: '#1c1c20', ew: .6 }); x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = .4; K.round(cx, cy, m / 2 - 1.4); x.stroke(); x.save(); K.round(cx, cy, m / 2 - 1.6); x.clip(); x.strokeStyle = 'rgba(255,255,255,.12)'; x.beginPath(); for (let q = -m; q < m; q += 1.6) { x.moveTo(cx + q, cy - m); x.lineTo(cx + q + m, cy + m); } x.stroke(); x.restore(); K.hole(cx - m * .18, cy, .7, '#0e0e10'); K.hole(cx + m * .18, cy, .7, '#0e0e10'); return; // an iron cover: a ring, a cross-hatched grip, two lifting holes
    case 'drain': K.box(X, Y, w, h, '#3a3a40', { r: .5, bev: .4 }); x.fillStyle = '#0f0f12'; if (w >= h) for (let q = X + 1.2; q < X + w - 1; q += 1.8) x.fillRect(q, Y + 1, 1, h - 2); else for (let q = Y + 1.2; q < Y + h - 1; q += 1.8) x.fillRect(X + 1, q, w - 2, 1); return; // a storm drain's grate
    case 'mailbox': K.box(X, Y, w, h * .6, '#c9433a', { r: w * .45, hi: .3, lo: -.25, ec: '#6a1d18', ew: .5 }); x.fillStyle = '#2a1a18'; x.fillRect(cx - w * .25, Y + h * .22, w * .5, .6); K.glint(cx, Y + h * .3, w / 2, .5); x.fillStyle = '#3a3a3a'; x.fillRect(cx - .5, Y + h * .6, 1, h * .4); return; // a round-topped mailbox on its post
    case 'hydrant': K.disc(cx, cy, m / 2, '#c0392b', { hi: .4, lo: -.35, ec: '#5a1610', ew: .4 }); for (const sg of [-1, 1]) K.box(cx + sg * m * .42 - m * .14, cy - m * .12, m * .28, m * .24, '#a8322a', { r: .3, bev: 0, ec: '#5a1610', ew: .3 }); K.disc(cx, cy, m / 4.4, '#e8b326', { hi: .45, ec: '#6a5010', ew: .3 }); return; // a fire hydrant: the red barrel, side caps, the bonnet's nut
    case 'pole': K.disc(cx, cy, m / 2, '#6b5642', { hi: .3, lo: -.3, ec: '#33281e', ew: .4 }); x.strokeStyle = 'rgba(40,28,18,.4)'; x.lineWidth = .3; for (const f of [.2, .32]) { K.round(cx, cy, m * f); x.stroke(); } return; // a wooden pole's sawn top
    case 'stopsign': { const pts = []; for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + TAU / 16; pts.push([cx + Math.cos(a) * w / 2, cy + Math.sin(a) * h / 2]); } K.poly(pts); x.fillStyle = K.lit(X, Y, w, h, '#c0392b', .25, -.25); x.fill(); x.strokeStyle = '#f4f0ea'; x.lineWidth = .5; x.save(); x.translate(cx, cy); x.scale(.82, .82); x.translate(-cx, -cy); K.poly(pts); x.stroke(); x.restore(); K.poly(pts); K.edge('#5a1610', .3); return; } // a stop sign: red octagon, white border
    case 'busstop': K.box(X, Y, w, h * .4, '#4a7fb5', { r: .6, fill: K.lin(X, Y, X + w, Y + h * .4, [[0, '#7fb0de'], [1, '#2f5f92']]), ec: '#1f3550', ew: .4 }); x.fillStyle = 'rgba(255,255,255,.4)'; x.fillRect(X + .6, Y + .6, w * .4, .5); x.fillStyle = '#2b2b30'; x.fillRect(cx - .6, Y + h * .4, 1.2, h * .6); K.disc(cx, Y + h * .92, 1.4, '#e8b326', { ec: '#5a4a10', ew: .3 }); return; // a bus shelter's glass roof, the stop's sign on its pole
    case 'priceboard': K.box(X, Y, w, h, '#c0392b', { r: .8, ec: '#5a1610', ew: .4 }); K.box(X + 1.2, Y + 1.2, w - 2.4, h - 2.4, '#2a1c18', { r: .4, bev: 0, ec: 0 }); x.fillStyle = '#ffd36a'; x.font = `bold ${m / 3}px sans-serif`; x.textAlign = 'center'; x.fillText('3.49', cx, cy + m / 9); return;
    case 'icechest': K.box(X, Y, w, h, '#4f7aa6', { r: .8, ec: '#223a54', ew: .4 }); K.box(X + .8, Y + .8, w - 1.6, h * .34, '#eef2f5', { r: .5, bev: .3, ec: 0 }); x.fillStyle = '#c0392b'; x.fillRect(X + 1.2, Y + h * .55, w - 2.4, .9); return; // an ice merchandiser: white lid, a red band
    case 'carts': x.strokeStyle = '#9aa1aa'; x.lineWidth = .5; for (let k = 0; k < 3; k++) { const bx = X + k * w * .3; x.strokeRect(bx, Y, w * .39, h); x.beginPath(); for (let q = bx + 1.2; q < bx + w * .39; q += 1.4) { x.moveTo(q, Y); x.lineTo(q, Y + h); } x.stroke(); } x.strokeStyle = '#c0392b'; x.lineWidth = .8; x.beginPath(); x.moveTo(X + w, Y); x.lineTo(X + w, Y + h); x.stroke(); return; // shopping carts nested in a row, the last one's red handle
    case 'cross': { const f = () => { x.beginPath(); x.rect(cx - 1.1, Y, 2.2, h); x.rect(X, Y + h * .3, w, 2.2); }; K.drop(f, .9, .3); f(); x.fillStyle = K.lit(X, Y, w, h, '#ddd6c8', .15, -.2); x.fill(); x.strokeStyle = 'rgba(90,80,70,.5)'; x.lineWidth = .3; x.stroke(); return; } // a stone churchyard cross
    case 'grave': K.box(X, Y, w, h, '#8f9196', { r: Math.min(1.5, m / 2), hi: .25, lo: -.25, ec: '#4a4c50', ew: .35 }); x.fillStyle = 'rgba(60,62,66,.4)'; x.fillRect(X + w * .25, Y + h * .45, w * .5, .35); return; // a headstone
    default: x.fillStyle = o.color; x.fillRect(X, Y, w, h);
  } } finally { x.restore(); }
}

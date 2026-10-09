/* =========================================================
   SNAKE SKINS
   Every skin is painted in body space. u runs down the body from the nose, in body radii (so a pattern keeps its
   proportions at any size and segment spacing); v runs across it, -1 one flank, 0 the spine, 1 the other flank.
   A marking is a shape in (u, v) mapped onto the bent, tapering tube: bands wrap the body, saddles bend with it, and
   the tail's markings shrink with the taper. Colors come from your primary (P) and secondary (S) and shades of them.
     base(u, cfg, uEnd): the ground color at u (drawn as the body's bands, and what segColor hands to other code)
     paint(x, F, uA, uB, cfg): the markings anchored in uA..uB. The caller clips to that stretch of body (plus two
       segments either side), so each marking is drawn exactly once and may reach a little past its stretch.
     scales: faint scale rows on top; gloss: how strong the wet sheen along the spine is (1 = normal)
   ========================================================= */
const SKIN_H = (k, s = 0) => { let h = Math.imul((k | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((s | 0) + 1, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; }; // a fixed random number per marking, so the pattern never flickers
const SKIN_PAL = new Map();
function skinPal(cfg, key, make) { // colors derived from P and S, worked out once per color pair, not every frame
  const k = key + cfg.color + cfg.color2; let p = SKIN_PAL.get(k);
  if (!p) { if (SKIN_PAL.size > 300) SKIN_PAL.clear(); p = make(cfg.color, cfg.color2); SKIN_PAL.set(k, p); }
  return p;
}
const lumOf = hex => { const v = parseInt(hex.slice(1), 16); return (.299 * (v >> 16) + .587 * (v >> 8 & 255) + .114 * (v & 255)) / 255; };
const readOn = (col, bg, P) => Math.abs(lumOf(col) - lumOf(bg)) > .2 ? col : lumOf(bg) > .45 ? shade(P, -.65) : mixColor(P, '#ffffff', .6); // your second color, unless it would vanish on this ground
const rgbaOf = (hex, a) => { const v = parseInt(hex.slice(1), 16); return `rgba(${v >> 16},${v >> 8 & 255},${v & 255},${a})`; };
function skinFrame(pts, n, B) { // body-space coordinates for one drawn snake
  const s = new Float64Array(Math.max(1, n));
  for (let i = 1; i < n; i++) s[i] = s[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const R0 = Math.max(.5, segR(Math.min(2, n - 1), n)), tail = B.tr * 1.6 + 3, end = s[n - 1] || 0;
  const F = { n, R0, uEnd: (end + tail) / R0, X: 0, Y: 0, r: R0, uSeg: i => s[i] / R0 };
  F.at = (u, v) => { // the point at (u, v); also leaves the local radius in F.r
    const d = u * R0; let px, py, nx, ny, r;
    if (n < 2 || d <= 0) { const g = pts[0], b = n < 2 ? 0 : Math.min(-d, 2 * R0); px = g.x + Math.cos(g.a) * b; py = g.y + Math.sin(g.a) * b; nx = B.N[0]; ny = B.N[1]; r = B.rad[0]; }
    else if (d >= end) { const g = pts[n - 1], e = d - end; px = g.x - Math.cos(g.a) * e; py = g.y - Math.sin(g.a) * e; nx = B.N[2 * n - 2]; ny = B.N[2 * n - 1]; r = B.rad[n - 1] * Math.max(0, 1 - e / tail); } // past the last segment: on to the tail's tip
    else {
      let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m] <= d) lo = m; else hi = m; }
      const L = s[hi] - s[lo], f = L > 1e-6 ? (d - s[lo]) / L : 0, p = pts[lo], q = pts[hi];
      px = p.x + (q.x - p.x) * f; py = p.y + (q.y - p.y) * f;
      nx = B.N[2 * lo] * (1 - f) + B.N[2 * hi] * f; ny = B.N[2 * lo + 1] * (1 - f) + B.N[2 * hi + 1] * f; const k = Math.hypot(nx, ny) || 1; nx /= k; ny /= k;
      r = B.rad[lo] * (1 - f) + B.rad[hi] * f;
    }
    F.X = px + nx * r * v; F.Y = py + ny * r * v; F.r = r;
  };
  const mv = (x, u, v) => { F.at(u, v); x.moveTo(F.X, F.Y); }, ln = (x, u, v) => { F.at(u, v); x.lineTo(F.X, F.Y); };
  F.each = (uA, uB, start, per, fn) => { // fn(u, k) for every anchor start + k*per that lies in uA..uB (and on the body)
    const k0 = Math.max(0, Math.ceil((uA - start) / per)), kEnd = Math.floor((F.uEnd + .5 - start) / per), k1 = uB === Infinity ? kEnd : Math.min(kEnd, Math.ceil((uB - start) / per) - 1);
    for (let k = k0; k <= k1; k++) fn(start + k * per, k);
  };
  F.band = (x, front, back, v0 = -1.3, v1 = 1.3, steps = 8) => { // the area between two edges that cross the body: u = front(v) and u = back(v)
    for (let k = 0; k <= steps; k++) { const v = v0 + (v1 - v0) * k / steps; k ? ln(x, front(v), v) : mv(x, front(v), v); }
    for (let k = steps; k >= 0; k--) { const v = v0 + (v1 - v0) * k / steps; ln(x, back(v), v); }
    x.closePath();
  };
  F.poly = (x, c, sub = 3) => { // a polygon with corners [u, v], each side split so it bends with the body
    for (let i = 0; i < c.length; i++) { const a = c[i], b = c[(i + 1) % c.length]; for (let k = 0; k < sub; k++) { const t = k / sub, u = a[0] + (b[0] - a[0]) * t, v = a[1] + (b[1] - a[1]) * t; (i || k) ? ln(x, u, v) : mv(x, u, v); } }
    x.closePath();
  };
  F.blob = (x, uc, vc, ru, rv, seed, rough = .22, m = 14) => { // an irregular rounded patch; shrinks with the tail
    F.at(uc, 0); const kr = F.r / R0;
    for (let k = 0; k <= m; k++) { const t = k / m * TAU, j = 1 + rough * (.6 * Math.sin(2 * t + seed * 6.3) + .4 * Math.sin(3 * t + seed * 11.7)), u = uc + Math.cos(t) * ru * kr * j, v = vc + Math.sin(t) * rv * j; k ? ln(x, u, v) : mv(x, u, v); }
    x.closePath();
  };
  F.dot = (x, u, v, rr) => { F.at(u, v); const r = rr * F.r; x.moveTo(F.X + r, F.Y); x.arc(F.X, F.Y, r, 0, TAU); };
  F.strip = (x, u0, u1, v0, v1, step = .45, tip = 0) => { // a stripe running down the body between v0 and v1 (tip: starts in a point that long)
    if (u1 <= u0) return; const s0 = Math.min(u1, u0 + tip), m = Math.max(1, Math.ceil((u1 - s0) / step)), us = k => s0 + (u1 - s0) * k / m;
    if (tip) mv(x, u0, (v0 + v1) / 2);
    for (let k = 0; k <= m; k++) (k || tip) ? ln(x, us(k), v0) : mv(x, us(k), v0);
    for (let k = m; k >= 0; k--) ln(x, us(k), v1);
    x.closePath();
  };
  F.line = (x, u0, u1, v, step = .4) => { if (u1 <= u0) return; const m = Math.max(1, Math.ceil((u1 - u0) / step)); for (let k = 0; k <= m; k++) { const u = u0 + (u1 - u0) * k / m; k ? ln(x, u, v) : mv(x, u, v); } };
  F.cross = (x, u, v0, v1, bow = 0, steps = 6) => { for (let k = 0; k <= steps; k++) { const v = v0 + (v1 - v0) * k / steps; k ? ln(x, u + bow * v * v, v) : mv(x, u + bow * v * v, v); } }; // a line across the body
  return F;
}
const fillP = (x, col, draw) => { x.beginPath(); draw(); x.fillStyle = col; x.fill(); }; // one path, one fill: every marking of a color at once
const ring = (F, x, uc, w, bow = 0, wob = 0, seed = 0) => F.band(x, v => uc - w / 2 + bow * v * v + wob * Math.sin(v * 3 + seed * 9), v => uc + w / 2 + bow * v * v + wob * Math.sin(v * 3.4 + seed * 7));
const SNAKE_SKINS = {
  Solid: { scales: 1, base: (u, c) => c.color },
  Stripes: { scales: 1, base: (u, c) => c.color, // even rings in your second color, each with a darker edge
    paint(x, F, A, B, c) {
      const p = skinPal(c, 'st', (P, S) => ({ e: mixColor(S, P, .45), s: S }));
      fillP(x, p.e, () => F.each(A, B, 2.3, 3, u => ring(F, x, u, 1.25, .16)));
      fillP(x, p.s, () => F.each(A, B, 2.3, 3, u => ring(F, x, u, 1.02, .16)));
    } },
  Spots: { scales: 1, base: (u, c) => c.color, // rounded blotches in two staggered rows down the back, small ones on the spine between
    paint(x, F, A, B, c) {
      const p = skinPal(c, 'sp', (P, S) => ({ e: mixColor(S, shade(P, -.5), .4), s: S }));
      const spots = sc => F.each(A, B, 2, 1.3, (u, k) => { const h = SKIN_H(k, 3), h2 = SKIN_H(k, 4), sd = k % 2 ? 1 : -1;
        F.blob(x, u + (h2 - .5) * .25, sd * (.44 + h * .16), (.36 + h2 * .14) * sc, (.32 + h * .1) * sc, h * 7, .2);
        if (k % 3 === 1) F.blob(x, u + .65, (h - .5) * .2, .15 * sc, .14 * sc, h2 * 5, .15); });
      fillP(x, p.e, () => spots(1.22)); fillP(x, p.s, () => spots(1));
    } },
  Gradient: { base: (u, c, end) => mixColor(c.color, c.color2, sstep(.15, .95, u / Math.max(1, end))) }, // primary at the head easing into secondary at the tail
  Zebra: { scales: 1, base: (u, c) => c.color, // narrow wavy stripes that thin toward the flanks, some of them forking
    paint(x, F, A, B, c) {
      fillP(x, c.color2, () => F.each(A, B, 1.9, 1.15, (u, k) => {
        const h = SKIN_H(k, 5), h2 = SKIN_H(k, 6), w = .3 + .22 * h, wv = v => .14 * Math.sin(v * 2.4 + h * 9) + .05 * Math.sin(v * 5.5 + h2 * 7);
        F.band(x, v => u - w / 2 * (1 - .35 * v * v) + wv(v), v => u + w / 2 * (1 - .35 * v * v) + wv(v), -1.3, 1.3, 10);
        if (k % 4 === 2) { const sd = h2 < .5 ? -1 : 1, v0 = sd * .1, v1 = sd * 1.3, f = u - .55; F.band(x, v => f - .12 * Math.abs((v - v0) / (v1 - v0)) + wv(v), v => f + .12 * Math.abs((v - v0) / (v1 - v0)) + wv(v), Math.min(v0, v1), Math.max(v0, v1), 6); }
      }));
    } },
  Checker: { scales: 1, base: (u, c) => c.color, // a true checkerboard, two squares across, wrapping round the body
    paint(x, F, A, B, c) {
      fillP(x, c.color2, () => F.each(A, B, 1.5, 1.4, (u, k) => { const sd = k % 2 ? 1 : -1; F.poly(x, [[u - .7, 0], [u + .7, 0], [u + .7, sd * 1.4], [u - .7, sd * 1.4]], 3); }));
    } },
  Diamond: { scales: 1, base: (u, c) => c.color, // a chain of diamonds down the spine, each with a dark heart, small triangles on the flanks where they meet
    paint(x, F, A, B, c) {
      const p = skinPal(c, 'di', (P, S) => ({ s: S, core: shade(P, -.42), side: shade(P, -.25) }));
      const dia = (u, l, w) => F.poly(x, [[u - l, 0], [u, -w], [u + l, 0], [u, w]], 4), per = 2.3;
      fillP(x, p.side, () => F.each(A, B, 2, per, u => { const j = u + per / 2; F.poly(x, [[j - .55, -1.35], [j, -.8], [j + .55, -1.35]], 2); F.poly(x, [[j - .55, 1.35], [j, .8], [j + .55, 1.35]], 2); }));
      fillP(x, p.s, () => F.each(A, B, 2, per, u => dia(u, 1.15, .8)));
      fillP(x, p.core, () => F.each(A, B, 2, per, u => dia(u, .52, .36)));
    } },
  Neon: { gloss: .25, base: (u, c) => skinPal(c, 'ne', P => ({ d: mixColor(shade(P, -.8), '#000000', .35) })).d, // a dark tube lit by glowing rails, with light running down the spine
    paint(x, F, A, B, c) {
      const u0 = Math.max(A, .9), u1 = Math.min(B, F.uEnd - .5); if (u1 <= u0) return;
      x.save(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round'; x.lineJoin = 'round';
      for (const v of [-.64, .64]) { x.beginPath(); F.line(x, u0, u1, v); x.strokeStyle = rgbaOf(c.color, .26); x.lineWidth = F.R0 * .36; x.stroke(); x.strokeStyle = rgbaOf(c.color, .95); x.lineWidth = F.R0 * .13; x.stroke(); }
      for (const [lo, al] of [[0, .3], [.55, .65], [.85, 1]]) { // the pulse: dashes on the spine brighten as a wave of light runs down the body
        x.beginPath(); F.each(u0, u1, 1, .7, u => { const w = (Math.cos((u - T * 9) * .42) + 1) / 2; if (w >= lo && w < (lo ? lo + .3 : .55)) F.line(x, u, Math.min(u1, u + .38), 0, .2); });
        x.strokeStyle = rgbaOf(c.color2, al); x.lineWidth = F.R0 * (.12 + .1 * al); x.stroke();
      }
      x.restore();
    } },
  Rainbow: { gloss: 1.2, base: u => hsl2hex(((u * 24 - T * 70) % 360 + 360) % 360, 80, 56) }, // the full spectrum flowing down the body
  Lava: { gloss: .35, // cracked black crust over molten rock that glows in the gaps, the glow pulsing down the body
    base: (u, c) => { const p = lavaPal(c); return mixColor(p.g1, p.g2, .5 + .5 * Math.sin(u * 1.3 - T * 2.4)); },
    paint(x, F, A, B, c) {
      const p = lavaPal(c), L = 1.45;
      const top = (k, v) => k * L + .26 * Math.sin(v * 2.1 + SKIN_H(k, 20) * 9) + .14 * Math.sin(v * 4.7 + SKIN_H(k, 21) * 7); // each crack across the body wanders
      const plates = sh => F.each(A, B, L / 2, L, (u, k) => {
        const n3 = SKIN_H(k, 22) < .3, sp = n3 ? [-.5 + (SKIN_H(k, 23) - .5) * .4, .45 + (SKIN_H(k, 24) - .5) * .4] : [(SKIN_H(k, 23) - .5) * .9], drift = (SKIN_H(k, 25) - .5) * .5; // two or three plates across, split on a slant
        const edges = [-1.6, ...sp, 1.6];
        for (let j = 0; j + 1 < edges.length; j++) {
          const vl = edges[j], vr = edges[j + 1], dl = j ? drift : 0, dr = j + 1 < edges.length - 1 ? drift : 0, q = [];
          for (let m = 0; m <= 4; m++) { const v = vl + (vr - vl) * m / 4; q.push([top(k, v), v]); }
          q.push([top(k + 1, vr + dr), vr + dr]);
          for (let m = 4; m >= 0; m--) { const v = vl + dl + (vr + dr - vl - dl) * m / 4; q.push([top(k + 1, v), v]); }
          q.push([top(k, vl), vl]);
          const cu = q.reduce((a, b) => a + b[0], 0) / q.length, cv = q.reduce((a, b) => a + b[1], 0) / q.length;
          F.poly(x, q.map(([a, b]) => [cu + (a - cu) * sh, cv + (b - cv) * sh]), 1);
        }
      });
      fillP(x, p.crust, () => plates(.84));
    } },
  Galaxy: { gloss: .5, // deep space: drifting nebulae in your colors and a field of stars, some twinkling
    base: (u, c) => { const p = galPal(c); return mixColor(p.d, p.d2, .5 + .5 * Math.sin(u * .7)); },
    paint(x, F, A, B, c) {
      F.each(A, B, .8, 2.1, (u, k) => { const h = SKIN_H(k, 40), h2 = SKIN_H(k, 41); F.at(u + (h - .5) * .5, (h2 - .5) * 1.1); const R = F.r * (1 + .5 * h);
        const g = x.createRadialGradient(F.X, F.Y, 0, F.X, F.Y, R), col = h2 < .5 ? c.color : c.color2; g.addColorStop(0, rgbaOf(col, .42)); g.addColorStop(.6, rgbaOf(col, .14)); g.addColorStop(1, rgbaOf(col, 0)); x.fillStyle = g; x.beginPath(); x.arc(F.X, F.Y, R, 0, TAU); x.fill(); });
      const lv = [[], [], []], bright = [];
      F.each(A, B, .3, .44, (u, k) => { const h = SKIN_H(k, 42), h2 = SKIN_H(k, 43), h3 = SKIN_H(k, 44); const tw = Math.abs(Math.sin(T * 1.6 + h * 20)); lv[tw > .66 ? 2 : tw > .33 ? 1 : 0].push([u + h * .44, (h2 * 2 - 1) * .92, .035 + h3 * .045]); if (h3 > .9) bright.push([u + h * .44, (h2 * 2 - 1) * .8]); });
      lv.forEach((l, i) => { if (!l.length) return; fillP(x, `rgba(255,255,255,${[.35, .65, .95][i]})`, () => l.forEach(([u, v, r]) => F.dot(x, u, v, r))); });
      if (bright.length) { x.beginPath(); for (const [u, v] of bright) { F.at(u, v); const r = F.r * .3; x.moveTo(F.X - r, F.Y); x.lineTo(F.X + r, F.Y); x.moveTo(F.X, F.Y - r); x.lineTo(F.X, F.Y + r); } x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = F.R0 * .05; x.stroke(); }
    } },
  Garter: { scales: 1, // a bright stripe down the spine and one down each side, rows of dark checks between them
    base: (u, c) => skinPal(c, 'ga', P => ({ b: shade(P, -.5) })).b,
    paint(x, F, A, B, c) {
      const p = skinPal(c, 'ga2', (P, S) => { const b = readOn(S, shade(P, -.5), P); return { s: b, lat: mixColor(b, P, .35), sp: shade(P, -.74) }; }), u0 = Math.max(A, 1), u1 = Math.min(B + .05, F.uEnd), first = A <= 1;
      fillP(x, p.sp, () => F.each(A, B, 1.5, .8, (u, k) => { const sd = k % 2 ? 1 : -1; F.poly(x, [[u - .2, sd * .3], [u + .2, sd * .3], [u + .2, sd * .53], [u - .2, sd * .53]], 2); F.poly(x, [[u + .2, -sd * .92], [u + .55, -sd * .92], [u + .55, -sd * 1.3], [u + .2, -sd * 1.3]], 2); }));
      fillP(x, p.lat, () => { F.strip(x, u0, u1, .64, .84, .45, first ? .8 : 0); F.strip(x, u0, u1, -.84, -.64, .45, first ? .8 : 0); });
      fillP(x, p.s, () => F.strip(x, u0, u1, -.19, .19, .45, first ? .7 : 0));
    } },
  Kingsnake: { scales: 1, // pale bands on a dark body, narrow on the back and widening down the flanks, with darker edges
    base: (u, c) => skinPal(c, 'ki', P => ({ d: shade(P, -.62) })).d,
    paint(x, F, A, B, c) {
      const p = skinPal(c, 'ki2', (P, S) => { const d = shade(P, -.62), b = readOn(S, d, P); return { s: b, e: mixColor(b, d, .45) }; });
      const bands = g => F.each(A, B, 2.3, 2.5, (u, k) => { const h = SKIN_H(k, 50), w = v => (.36 + .34 * v * v) / 2 + g, wb = v => .04 * Math.sin(v * 4 + h * 8);
        F.band(x, v => u - w(v) + wb(v), v => u + w(v) + wb(v), -1.3, 1.3, 10); });
      fillP(x, p.e, () => bands(.07)); fillP(x, p.s, () => bands(0));
    } },
  Coral: { scales: 1, // rings: wide primary, a thin secondary, a broad black, a thin secondary; a black snout; black flecks on the primary
    base: (u, c) => c.color,
    paint(x, F, A, B, c) {
      const p = skinPal(c, 'co', (P, S) => ({ k: mixColor(shade(P, -.8), '#000000', .5), s: S, f: shade(P, -.45) })), per = 3.6;
      if (A <= .5) { fillP(x, p.k, () => F.band(x, () => -2, v => .8 + .12 * v * v)); fillP(x, p.s, () => F.band(x, v => .8 + .12 * v * v, v => 1.3 + .12 * v * v)); }
      fillP(x, p.s, () => F.each(A, B, 3.3, per, u => ring(F, x, u, 1.85, .12)));
      fillP(x, p.k, () => F.each(A, B, 3.3, per, u => ring(F, x, u, 1.15, .12)));
      fillP(x, p.f, () => F.each(A, B, 1.6, .5, (u, k) => { const m = ((u - 3.3) % per + per) % per; if (m < 1.1 || m > per - 1.1) return; const h = SKIN_H(k, 60); if (h < .5) F.dot(x, u + h * .4, (SKIN_H(k, 61) * 2 - 1) * .85, .07); }));
    } },
  Emerald: { scales: 1, gloss: 1.35, base: (u, c) => c.color, // bold pale bars across the spine, wide on the back and tapering down the flanks, sometimes broken; pale flecks low on the sides
    paint(x, F, A, B, c) {
      fillP(x, skinPal(c, 'em', (P, S) => ({ m: readOn(S, P, P) })).m, () => {
        F.each(A, B, 1.8, 1.9, (u, k) => { const h = SKIN_H(k, 70), h2 = SKIN_H(k, 71), tilt = (h - .5) * .45, w = v => .19 * (1 - .6 * Math.abs(v) / .66), zig = v => .07 * Math.sin(v * 6 + h2 * 9);
          const bar = (v0, v1) => F.band(x, v => u + tilt * v + zig(v) - w(v), v => u + tilt * v + zig(v) + w(v), v0, v1, 6);
          if (h2 > .72) { bar(-.66, -.1); bar(.1, .66); } else bar(-.66, .66); });
        F.each(A, B, 2.4, 1.3, (u, k) => { const h = SKIN_H(k, 72); F.dot(x, u + h * .5, (k % 2 ? 1 : -1) * (.72 + .16 * h), .07 + .04 * SKIN_H(k, 73)); });
      });
    } },
  Python: { scales: 1, gloss: .9, // light saddles with pale rims on a dark body, smaller blotches with dark hearts down each side
    base: (u, c) => skinPal(c, 'py', P => ({ d: shade(P, -.62) })).d,
    paint(x, F, A, B, c) {
      const p = skinPal(c, 'py2', (P, S) => ({ s: P, rim: mixColor(P, S, .55), eye: shade(P, -.7) })), per = 2.3;
      const saddles = sc => F.each(A, B, 1.7, per, (u, k) => { const h = SKIN_H(k, 80), h2 = SKIN_H(k, 81); F.blob(x, u, (h - .5) * .25, .82 * sc, .64 * sc, h2 * 9, .3); });
      const sides = sc => F.each(A, B, 1.7 + per / 2, per, (u, k) => { const h = SKIN_H(k, 82); F.blob(x, u, -1, .5 * sc, .44 * sc, h * 5, .25); F.blob(x, u + .2, 1, .5 * sc, .44 * sc, h * 7, .25); });
      fillP(x, p.rim, () => { saddles(1.12); sides(1.14); }); fillP(x, p.s, () => { saddles(1); sides(1); });
      fillP(x, p.eye, () => F.each(A, B, 1.7 + per / 2, per, u => { F.dot(x, u, -.92, .15); F.dot(x, u + .2, .92, .15); }));
    } },
  Diamondback: { scales: 1, // pale-edged dark diamonds down the back, dark marks on the flanks, and a ringed tail
    base: (u, c) => c.color,
    paint(x, F, A, B, c) {
      const p = skinPal(c, 'db', (P, S) => ({ e: S, d: shade(P, -.55), m: shade(P, -.3), r2: mixColor('#17130f', P, .15) })), per = 2.25, rat = Math.min(4.2, F.uEnd * .25), uR = F.uEnd - rat;
      const dia = (u, l, w) => F.poly(x, [[u - l, 0], [u, -w], [u + l, 0], [u, w]], 4), on = u => u < uR - 1.2;
      fillP(x, p.d, () => F.each(A, B, 2, per, u => { if (!on(u)) return; const j = u + per / 2; F.poly(x, [[j - .45, -1.35], [j, -.84], [j + .45, -1.35]], 2); F.poly(x, [[j - .45, 1.35], [j, .84], [j + .45, 1.35]], 2); }));
      fillP(x, p.e, () => F.each(A, B, 2, per, u => on(u) && dia(u, 1.17, .92)));
      fillP(x, p.d, () => F.each(A, B, 2, per, u => on(u) && dia(u, .98, .76)));
      fillP(x, p.m, () => F.each(A, B, 2, per, u => on(u) && dia(u, .48, .37)));
      fillP(x, p.e, () => F.each(A, B, uR, .9, u => ring(F, x, u + .22, .45)));
      fillP(x, p.r2, () => F.each(A, B, uR, .9, u => ring(F, x, u + .67, .45)));
    } },
  'Rat Fur': { gloss: .35, // short hair lying back along the body, fading into a bare, ringed tail in your second color
    base: (u, c, end) => mixColor(c.color, c.color2, sstep(end * .58, end * .58 + 2, u)),
    paint(x, F, A, B, c) {
      const p = skinPal(c, 'ra', (P, S) => ({ dk: rgbaOf(shade(P, -.42), .75), lt: rgbaOf(mixColor(P, '#ffffff', .3), .6), tr: rgbaOf(shade(S, -.3), .7) })), ts = F.uEnd * .58;
      x.lineCap = 'round'; x.lineWidth = F.R0 * .08;
      for (const [col, o] of [[p.dk, 0], [p.lt, 1]]) { x.beginPath(); F.each(A, Math.min(B, ts + 1), .9, .22, (u, k) => { for (const [j, v] of [[0, -.7], [1, -.35], [2, 0], [3, .35], [4, .7]]) { if ((k + j + o) % 2) continue; const h = SKIN_H(k * 5 + j, 90); F.line(x, u + h * .1, u + .36 + h * .14, v + (h - .5) * .2, .18); } }); x.strokeStyle = col; x.stroke(); }
      x.beginPath(); F.each(A, B, ts + 1, .36, u => F.cross(x, u, -1.3, 1.3)); x.strokeStyle = p.tr; x.lineWidth = F.R0 * .06; x.stroke();
    } },
  'Gold Plated': { gloss: 1.5, // overlapping metal plates with a lit top edge and a shadow beneath, and a glint sweeping down the body
    base: (u, c, end) => { const p = goldPal(c), g = (T * 7) % (end + 8) - 4, k = Math.max(0, 1 - Math.abs(u - g) / 2.4); return mixColor(p.m, p.hi, k * k * .75); },
    paint(x, F, A, B, c) {
      const p = goldPal(c); x.lineCap = 'round';
      x.beginPath(); F.each(A, B, .8, .95, u => F.cross(x, u + .42, -1.3, 1.3, .28)); x.strokeStyle = p.lo; x.lineWidth = F.R0 * .11; x.stroke();
      x.beginPath(); F.each(A, B, .8, .95, u => F.cross(x, u - .36, -1.1, 1.1, .28)); x.strokeStyle = p.hiA; x.lineWidth = F.R0 * .06; x.stroke();
    } },
  'Blood Soaked': { gloss: 1.3, // soaked dark red: clots along the back, runs dripping down the flanks, wet highlights
    base: u => mixColor('#5c0a0a', '#3a0606', .5 + .5 * Math.sin(u * 1.7)),
    paint(x, F, A, B) {
      fillP(x, '#260404', () => F.each(A, B, 1.2, 1.4, (u, k) => { const h = SKIN_H(k, 100), h2 = SKIN_H(k, 101); F.blob(x, u + (h2 - .5) * .4, (h - .5) * .9, .3 + .25 * h2, .26 + .2 * h, h * 8, .35); }));
      fillP(x, '#7d0d0d', () => F.each(A, B, 1.6, 1.05, (u, k) => { const h = SKIN_H(k, 102), sd = k % 2 ? 1 : -1, v0 = sd * (.15 + .3 * h), v1 = sd * 1.35, w = v => .06 + .1 * ((v - v0) / (v1 - v0)) ** 3;
        F.band(x, v => u - w(v), v => u + w(v), Math.min(v0, v1), Math.max(v0, v1), 6); }));
      x.beginPath(); F.each(A, B, 1.4, .9, (u, k) => { const h = SKIN_H(k, 103); F.at(u + h * .4, (h - .5) * .5); const r = F.r; x.moveTo(F.X - r * .42, F.Y - r * .3); x.ellipse(F.X - r * .3, F.Y - r * .3, r * .14, r * .06, -.7, 0, TAU); });
      x.fillStyle = 'rgba(255,215,215,.32)'; x.fill();
    } },
  Hazard: { scales: 0, base: (u, c) => c.color, // diagonal warning stripes, like hazard tape wrapped round the body
    paint(x, F, A, B, c) { fillP(x, c.color2, () => F.each(A, B, 1.6, 1.9, u => F.band(x, v => u - .48 + .5 * v, v => u + .48 + .5 * v, -1.3, 1.3, 4))); } },
  Lunar: { gloss: .5, // grey dust with dark maria and craters lit from the same side as everything else
    base: (u, c) => lunPal(c).b,
    paint(x, F, A, B, c) {
      const p = lunPal(c);
      fillP(x, p.mare, () => F.each(A, B, 1.4, 3.1, (u, k) => { const h = SKIN_H(k, 110); F.blob(x, u, (h - .5) * .8, .9, .55, h * 9, .35); }));
      const cr = []; F.each(A, B, 1, .7, (u, k) => { const h = SKIN_H(k, 111); if (h < .72) { F.at(u + (SKIN_H(k, 112) - .5) * .4, (SKIN_H(k, 113) * 2 - 1) * .74); cr.push([F.X, F.Y, F.r * (.11 + .2 * SKIN_H(k, 114))]); } });
      for (const [col, o, k] of [[p.lit, .12, .95], [p.sh, -.12, .92], [p.fl, .03, .72]]) fillP(x, col, () => cr.forEach(([X, Y, r]) => { x.moveTo(X + o * r + r * k, Y + o * r); x.arc(X + o * r, Y + o * r, r * k, 0, TAU); }));
    } },
  Martian: { gloss: .6, // rust-red dust: darker patches, pale wind streaks and grit
    base: (u, c) => marPal(c).b,
    paint(x, F, A, B, c) {
      const p = marPal(c);
      fillP(x, p.rust, () => F.each(A, B, 1.3, 2.1, (u, k) => { const h = SKIN_H(k, 120); F.blob(x, u, (h - .5) * .9, .6 + .3 * SKIN_H(k, 121), .45, h * 9, .4); }));
      fillP(x, p.dust, () => F.each(A, B, 1.8, 1.6, (u, k) => { const h = SKIN_H(k, 122); F.blob(x, u, (h - .5) * 1.3, 1.1, .1, h * 5, .2); }));
      fillP(x, p.rock, () => F.each(A, B, 1, .42, (u, k) => { const h = SKIN_H(k, 123); F.dot(x, u + h * .4, (SKIN_H(k, 124) * 2 - 1) * .85, .04 + .05 * SKIN_H(k, 125)); }));
    } },
};
const lavaPal = c => skinPal(c, 'la', P => { const g1 = mixColor(P, '#ffffff', .12); return { g1, g2: mixColor(P, '#fff6d8', .62), crust: mixColor(shade(P, -.85), '#140e0c', .55) }; });
const galPal = c => skinPal(c, 'gx', P => { const d = mixColor(shade(P, -.86), '#05040c', .45); return { d, d2: mixColor(d, P, .12) }; });
const goldPal = c => skinPal(c, 'go', P => { const m = mixColor('#d6a93a', P, .14); return { m, hi: mixColor(m, '#fffbe6', .7), hiA: rgbaOf(mixColor(m, '#fffbe6', .75), .75), lo: shade(m, -.45) }; });
const lunPal = c => skinPal(c, 'lu', P => { const b = mixColor('#b2b0aa', P, .18); return { b, mare: shade(b, -.18), lit: shade(b, .2), sh: shade(b, -.42), fl: shade(b, -.2) }; });
const marPal = c => skinPal(c, 'ma', (P, S) => { const b = mixColor('#b4532f', P, .18); return { b, rust: shade(b, -.3), dust: mixColor('#e8c9a0', b, .45), rock: shade(b, -.5) }; });
const skinOf = cfg => SNAKE_SKINS[cfg.pattern] || SNAKE_SKINS.Solid;
function segColor(i, n, cfg) { return skinOf(cfg).base(i * .9, cfg, n * .9); } // the skin's ground color at segment i, for code that wants one color (eyes, after-images)

/* =========================================================
   SNAKE SKINS
   Every skin is painted in body space. u runs down the body from the nose, in body radii (so a pattern keeps its
   proportions at any size and segment spacing); v runs across it, -1 one flank, 0 the spine, 1 the other flank.
   A marking is a shape in (u, v) mapped onto the bent, tapering tube: bands wrap the body, saddles bend with it, and
   the tail's markings shrink with the taper. Every color comes from your primary (P) and secondary (S): the two
   themselves, mixes between them where a skin needs more tones, and lighter or darker shades of those for depth.
     base(u, cfg, uEnd): the ground color at u (drawn as the body's bands, and what segColor hands to other code)
     paint(x, F, uA, uB, cfg): the markings anchored in uA..uB. The caller clips to that stretch of body (plus two
       segments either side), so each marking is drawn exactly once and may reach a little past its stretch.
     scales: faint scale rows on top; gloss: how strong the wet sheen along the spine is (1 = normal)
     tex: a noise texture for the ground instead of a flat color (see NOISE TEXTURES): { k, field, pal, color, flow }
   ========================================================= */
const SKIN_H = (k, s = 0) => { let h = Math.imul((k | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((s | 0) + 1, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; }; // a fixed random number per marking, so the pattern never flickers
const SKIN_PAL = new Map();
function skinPal(cfg, key, make) { // colors derived from P and S, worked out once per color pair, not every frame
  const k = key + cfg.color + cfg.color2; let p = SKIN_PAL.get(k);
  if (!p) { if (SKIN_PAL.size > 300) SKIN_PAL.clear(); p = make(cfg.color, cfg.color2); SKIN_PAL.set(k, p); }
  return p;
}
const lumOf = hex => { const v = parseInt(hex.slice(1), 16); return (.299 * (v >> 16) + .587 * (v >> 8 & 255) + .114 * (v & 255)) / 255; };
const keepSeen = (col, bg) => Math.abs(lumOf(col) - lumOf(bg)) > .1 ? col : lumOf(bg) > .5 ? shade(col, -.5) : mixColor(col, '#ffffff', .45); // your color as it is; only nudged darker or lighter when it would vanish on this ground
const darkLight = (P, S) => lumOf(P) > lumOf(S) ? [S, P] : [P, S]; // your two colors, darker first: glows run from the darker toward the brighter
const hexHsl = hex => { const [r, g, b] = rgbOf(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let h = 0, s = 0;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = 60 * (mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4); }
  return [h, s * 100, l * 100]; };
function hslPath(P, S, long) { // t (0-1) -> a color between your two round the color wheel, so a blend stays vivid instead of greying out in the middle (long: the other way round)
  const a = hexHsl(P), b = hexHsl(S); if (a[1] < 6) a[0] = b[0]; if (b[1] < 6) b[0] = a[0]; // a grey takes the other color's hue
  let d = ((b[0] - a[0]) % 360 + 540) % 360 - 180; if (long) d = d >= 0 ? d - 360 : d + 360; // (long with the same hue twice: the whole wheel)
  return t => hsl2hex(((a[0] + d * t) % 360 + 360) % 360, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}
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
/* ---- NOISE TEXTURES: a strip of body-space noise (u down the body, v across it) worked out once per skin, colored once per
   color pair, and mapped onto each band of the body as a pattern: the ground is filled with it instead of a flat color, so it
   costs little extra drawing: each band is two triangles, each mapped exactly onto its corners (texTri), so the texture bends with
   the body without a seam anywhere. It repeats every TEX.L body radii down the body, and can flow along it (flow: radii per second) ---- */
const TEX = { L: 64, ppu: 12, v0: 1.3, h: 32 }; TEX.w = TEX.L * TEX.ppu;
function texNoise(seed, fu, fv, oct = 4) { // fractal gradient noise at (u, v), about -1..1; seamless down the body every TEX.L radii (TEX.L * fu must be whole)
  const GX = [], GY = [], G = [], FU = [], FV = [], AMP = []; let tot = 0;
  for (let o = 0; o < oct; o++) {
    const f = 1 << o, gx = Math.round(TEX.L * fu * f), gy = Math.ceil(8 * fv * f) + 2, g = new Float32Array(gx * gy * 2);
    for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) { const a = SKIN_H(i * 92821 + j * 68917 + o * 7919, seed) * TAU; g[2 * (j * gx + i)] = Math.cos(a); g[2 * (j * gx + i) + 1] = Math.sin(a); }
    GX.push(gx); GY.push(gy); G.push(g); FU.push(fu * f); FV.push(fv * f); AMP.push(1 / f); tot += 1 / f;
  }
  const k = 1.6 / tot;
  return (u, v) => { let s = 0;
    for (let o = 0; o < oct; o++) {
      const x = u * FU[o], y = (v + 4) * FV[o], xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, g = G[o], gx = GX[o];
      let x0 = xi % gx; if (x0 < 0) x0 += gx; const x1 = x0 + 1 === gx ? 0 : x0 + 1, y0 = yi < 0 ? 0 : yi > GY[o] - 2 ? GY[o] - 2 : yi, r0 = y0 * gx, r1 = r0 + gx;
      const a = 2 * (r0 + x0), b = 2 * (r0 + x1), c = 2 * (r1 + x0), d = 2 * (r1 + x1);
      const sx = fx * fx * fx * (fx * (fx * 6 - 15) + 10), sy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
      const n00 = g[a] * fx + g[a + 1] * fy, n10 = g[b] * (fx - 1) + g[b + 1] * fy, n01 = g[c] * fx + g[c + 1] * (fy - 1), n11 = g[d] * (fx - 1) + g[d + 1] * (fy - 1);
      const n0 = n00 + sx * (n10 - n00), n1 = n01 + sx * (n11 - n01); s += (n0 + sy * (n1 - n0)) * AMP[o];
    }
    return s * k; };
}
function texRamp(stops, t, o) { // o = the color at t along stops [[t, [r, g, b]], ...]
  let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
  const [t0, a] = stops[i], [t1, b] = stops[i + 1], k = clamp((t - t0) / (t1 - t0 || 1), 0, 1);
  o[0] = a[0] + (b[0] - a[0]) * k; o[1] = a[1] + (b[1] - a[1]) * k; o[2] = a[2] + (b[2] - a[2]) * k; return o;
}
const texMix = (o, c, k) => { o[0] += (c[0] - o[0]) * k; o[1] += (c[1] - o[1]) * k; o[2] += (c[2] - o[2]) * k; return o; };
const TEX_CACHE = new Map(), TEX_PAT = new WeakMap();
function texFields(t) { // the noise itself: once per skin, whatever the colors
  if (t.vals) return;
  const { w, h, ppu, v0 } = TEX, k = t.k || 1, f = t.field(), vals = new Float32Array(w * h * k), o = new Float32Array(k);
  for (let y = 0; y < h; y++) { const v = -v0 + (y + .5) / h * 2 * v0; for (let x = 0; x < w; x++) { f((x + .5) / ppu, v, o); vals.set(o, (y * w + x) * k); } }
  t.vals = vals;
}
function skinTex(name, cfg) { // the texture canvas for this skin in these colors
  const t = SNAKE_SKINS[name].tex, key = name + cfg.color + cfg.color2, { w, h } = TEX, k = t.k || 1;
  let c = TEX_CACHE.get(key); if (c) return c;
  texFields(t);
  c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), im = g.createImageData(w, h), d = im.data, pal = t.pal(cfg.color, cfg.color2), rgb = [0, 0, 0];
  for (let i = 0; i < w * h; i++) { t.color(t.vals, i * k, pal, rgb, i); d[4 * i] = rgb[0]; d[4 * i + 1] = rgb[1]; d[4 * i + 2] = rgb[2]; d[4 * i + 3] = 255; }
  g.putImageData(im, 0, 0);
  if (TEX_CACHE.size >= 24) TEX_CACHE.delete(TEX_CACHE.keys().next().value);
  TEX_CACHE.set(key, c); return c;
}
function skinPattern(x, cfg) { // a pattern of the texture for this canvas (patterns are made per context)
  const c = skinTex(cfg.pattern, cfg); let m = TEX_PAT.get(x); if (!m) TEX_PAT.set(x, m = new Map());
  let p = m.get(c); if (!p) { if (m.size > 24) m.clear(); p = x.createPattern(c, 'repeat'); m.set(c, p); }
  return p;
}
function texBand(p, F, pts, B, i, u0) { // fallback: lays the texture over band i in segment i's own frame (u0: the texture's offset down the body)
  const g = pts[i], ca = Math.cos(g.a), sn = Math.sin(g.a), k = F.R0 / TEX.ppu, r = B.rad[i], q = r * 2 * TEX.v0 / TEX.h, u = F.uSeg(i) - u0;
  p.setTransform({ a: -ca * k, b: -sn * k, c: -sn * q, d: ca * q, e: g.x + ca * F.R0 * u + sn * r * TEX.v0, f: g.y + sn * F.R0 * u - ca * r * TEX.v0 });
  return p;
}
function texTri(p, u0, v0, u1, v1, u2, v2, x0, y0, x1, y1, x2, y2) { // maps the texture's (u, v) at three corners exactly onto three points. Triangles that share two
  const ku = TEX.ppu, kv = TEX.h / (2 * TEX.v0), a0 = u0 * ku, b0 = (v0 + TEX.v0) * kv;   // corners agree all along the line through them, so the texture runs on without a seam
  const a = (u1 - u0) * ku, b = (v1 - v0) * kv, c = (u2 - u0) * ku, d = (v2 - v0) * kv, det = a * d - b * c;
  if (Math.abs(det) < 1e-6) return false;
  const e1x = x1 - x0, e1y = y1 - y0, e2x = x2 - x0, e2y = y2 - y0, A = (e1x * d - e2x * b) / det, C = (e2x * a - e1x * c) / det, Bm = (e1y * d - e2y * b) / det, D = (e2y * a - e1y * c) / det;
  p.setTransform({ a: A, b: Bm, c: C, d: D, e: x0 - A * a0 - C * b0, f: y0 - Bm * a0 - D * b0 });
  return true;
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
  Gradient: { base: (u, c, end) => skinPal(c, 'gr', (P, S) => ({ f: hslPath(P, S) })).f(sstep(.15, .95, u / Math.max(1, end))) }, // primary at the head easing into secondary at the tail, round the color wheel
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
  Neon: { gloss: .25, base: (u, c) => skinPal(c, 'ne', (P, S) => ({ d: shade(mixColor(P, S, .3), -.82) })).d, // a dark tube lit by glowing rails in your first color, with light in your second running down the spine
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
  Rainbow: { gloss: 1.2, // a spectrum flowing down the body: from your first color the long way round the color wheel to your second, and back
    base: (u, c) => skinPal(c, 'rb', (P, S) => ({ f: hslPath(P, S, true) })).f(.5 - .5 * Math.cos(u * .4 - T * 2.4)) },
  Lava: { gloss: .35, // cracked dark crust over molten rock: the melt runs from your darker color to your brighter one, swirls white-hot and flows down the body in the gaps
    base: (u, c) => lavaPal(c).g1,
    tex: { k: 2, flow: 1.1,
      field() { const w1 = texNoise(11, .125, .5, 3), w2 = texNoise(12, .125, .5, 3), rd = texNoise(13, .1875, .9, 4), lo = texNoise(14, .0625, .45, 2); // features drawn out along the body, the way it flows
        return (u, v, o) => { const wu = w1(u, v) * 2.2, wv = w2(u, v) * .45, r = 1 - Math.abs(rd(u + wu, v + wv)); o[0] = r * r; o[1] = lo(u + wu * .5, v); }; },
      pal: (P, S) => { const [C, H] = darkLight(P, S); return [[0, rgbOf(shade(C, -.6))], [.25, rgbOf(C)], [.55, rgbOf(mixColor(C, H, .5))], [.8, rgbOf(H)], [1, rgbOf(mixColor(H, '#ffffff', .4))]]; },
      color: (f, i, pal, o) => texRamp(pal, clamp(.3 + .72 * f[i] * f[i] + .3 * f[i + 1], 0, 1), o) },
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
      fillP(x, p.rim, () => plates(.86)); fillP(x, p.crust, () => plates(.78)); // wide enough cracks to watch the melt flow; each plate's edge glows from the heat
    } },
  Galaxy: { gloss: .5, // deep space: nebulae in your colors drifting down the body through dark dust, faint far stars, and bright ones twinkling
    base: (u, c) => galPal(c).d,
    tex: { k: 3, flow: .22,
      field() { const a = texNoise(21, .125, .6, 4), b = texNoise(22, .125, .6, 4), d = texNoise(23, .25, 1.2, 3); return (u, v, o) => { o[0] = a(u, v); o[1] = b(u, v); o[2] = d(u, v); }; },
      pal: (P, S) => { const g = galPal({ color: P, color2: S }); return { d: rgbOf(g.d), p: rgbOf(P), s: rgbOf(S), w: rgbOf(g.star), m: rgbOf(mixColor(mixColor(P, S, .5), '#ffffff', .45)) }; },
      color: (f, i, p, o, t) => {
        const a = sstep(-.12, .6, f[i]), b = sstep(-.05, .65, f[i + 1]), dust = 1 - .65 * sstep(.15, .7, f[i + 2]);
        o[0] = p.d[0]; o[1] = p.d[1]; o[2] = p.d[2]; texMix(o, p.p, a * .6 * dust); texMix(o, p.s, b * .5 * dust);
        if (a * b > .3) texMix(o, p.m, (a * b - .3) * .6 * dust); // brighter, and both colors at once, where two clouds meet
        const st = SKIN_H(t, 77); if (st > .986) texMix(o, p.w, (st - .986) / .014 * .85); // far stars
        return o; } },
    paint(x, F, A, B, c) {
      // each star lives a few seconds: it swells in, glows, shrinks away, and comes back somewhere else in its patch of sky
      const lv = [[], [], [], []], bright = [];
      F.each(A, B, .3, .44, (u, k) => {
        const h = SKIN_H(k, 42), ph = T * (.22 + .2 * h) + h * 9, cy = Math.floor(ph), e = Math.sin(Math.PI * (ph - cy)), id = k * 977 + cy;
        if (e < .05) return;
        const su = u + SKIN_H(id, 43) * .44, sv = (SKIN_H(id, 44) * 2 - 1) * .9, big = SKIN_H(id, 45);
        lv[Math.min(3, e * 4 | 0)].push([su, sv, (.035 + big * .045) * (.35 + .65 * e)]);
        if (big > .9) bright.push([su, sv, e]);
      });
      const st = galPal(c).star; // starlight: white, tinted by your brighter color
      lv.forEach((l, i) => { if (!l.length) return; fillP(x, rgbaOf(st, [.3, .55, .8, .97][i]), () => l.forEach(([u, v, r]) => F.dot(x, u, v, r))); });
      if (bright.length) { x.beginPath(); for (const [u, v, e] of bright) { F.at(u, v); const r = F.r * .34 * e; x.moveTo(F.X - r, F.Y); x.lineTo(F.X + r, F.Y); x.moveTo(F.X, F.Y - r); x.lineTo(F.X, F.Y + r); } x.strokeStyle = rgbaOf(st, .8); x.lineWidth = F.R0 * .05; x.stroke(); }
    } },
  Garter: { scales: 1, // a stripe of your second color down the spine and one down each side, rows of dark checks between them
    base: (u, c) => c.color,
    paint(x, F, A, B, c) {
      const p = skinPal(c, 'ga2', (P, S) => { const b = keepSeen(S, P); return { s: b, lat: mixColor(b, P, .35), sp: shade(mixColor(P, S, .25), -.5) }; }), u0 = Math.max(A, 1), u1 = Math.min(B + .05, F.uEnd), first = A <= 1;
      fillP(x, p.sp, () => F.each(A, B, 1.5, .8, (u, k) => { const sd = k % 2 ? 1 : -1; F.poly(x, [[u - .2, sd * .3], [u + .2, sd * .3], [u + .2, sd * .53], [u - .2, sd * .53]], 2); F.poly(x, [[u + .2, -sd * .92], [u + .55, -sd * .92], [u + .55, -sd * 1.3], [u + .2, -sd * 1.3]], 2); }));
      fillP(x, p.lat, () => { F.strip(x, u0, u1, .64, .84, .45, first ? .8 : 0); F.strip(x, u0, u1, -.84, -.64, .45, first ? .8 : 0); });
      fillP(x, p.s, () => F.strip(x, u0, u1, -.19, .19, .45, first ? .7 : 0));
    } },
  Kingsnake: { scales: 1, // bands of your second color round your first, narrow on the back and widening down the flanks, with darker edges
    base: (u, c) => c.color,
    paint(x, F, A, B, c) {
      const p = skinPal(c, 'ki2', (P, S) => { const b = keepSeen(S, P); return { s: b, e: shade(mixColor(P, b, .5), -.4) }; });
      const bands = g => F.each(A, B, 2.3, 2.5, (u, k) => { const h = SKIN_H(k, 50), w = v => (.36 + .34 * v * v) / 2 + g, wb = v => .04 * Math.sin(v * 4 + h * 8);
        F.band(x, v => u - w(v) + wb(v), v => u + w(v) + wb(v), -1.3, 1.3, 10); });
      fillP(x, p.e, () => bands(.07)); fillP(x, p.s, () => bands(0));
    } },
  Coral: { scales: 1, // rings: wide primary, a thin secondary, a broad dark one (both colors, darkened), a thin secondary; a dark snout; dark flecks on the primary
    base: (u, c) => c.color,
    paint(x, F, A, B, c) {
      const p = skinPal(c, 'co', (P, S) => ({ k: shade(mixColor(P, S, .5), -.78), s: S, f: shade(P, -.45) })), per = 3.6;
      if (A <= .5) { fillP(x, p.k, () => F.band(x, () => -2, v => .8 + .12 * v * v)); fillP(x, p.s, () => F.band(x, v => .8 + .12 * v * v, v => 1.3 + .12 * v * v)); }
      fillP(x, p.s, () => F.each(A, B, 3.3, per, u => ring(F, x, u, 1.85, .12)));
      fillP(x, p.k, () => F.each(A, B, 3.3, per, u => ring(F, x, u, 1.15, .12)));
      fillP(x, p.f, () => F.each(A, B, 1.6, .5, (u, k) => { const m = ((u - 3.3) % per + per) % per; if (m < 1.1 || m > per - 1.1) return; const h = SKIN_H(k, 60); if (h < .5) F.dot(x, u + h * .4, (SKIN_H(k, 61) * 2 - 1) * .85, .07); }));
    } },
  Emerald: { scales: 1, gloss: 1.35, base: (u, c) => c.color, // bold bars of your second color across the spine, wide on the back and tapering down the flanks, sometimes broken; flecks low on the sides
    paint(x, F, A, B, c) {
      fillP(x, skinPal(c, 'em', (P, S) => ({ m: keepSeen(S, P) })).m, () => {
        F.each(A, B, 1.8, 1.9, (u, k) => { const h = SKIN_H(k, 70), h2 = SKIN_H(k, 71), tilt = (h - .5) * .45, w = v => .19 * (1 - .6 * Math.abs(v) / .66), zig = v => .07 * Math.sin(v * 6 + h2 * 9);
          const bar = (v0, v1) => F.band(x, v => u + tilt * v + zig(v) - w(v), v => u + tilt * v + zig(v) + w(v), v0, v1, 6);
          if (h2 > .72) { bar(-.66, -.1); bar(.1, .66); } else bar(-.66, .66); });
        F.each(A, B, 2.4, 1.3, (u, k) => { const h = SKIN_H(k, 72); F.dot(x, u + h * .5, (k % 2 ? 1 : -1) * (.72 + .16 * h), .07 + .04 * SKIN_H(k, 73)); });
      });
    } },
  Python: { scales: 1, gloss: .9, // saddles of your second color with rims between the two on your first, smaller blotches with dark hearts down each side
    base: (u, c) => c.color,
    paint(x, F, A, B, c) {
      const p = skinPal(c, 'py2', (P, S) => { const s = keepSeen(S, P); return { s, rim: mixColor(P, s, .5), eye: shade(mixColor(P, s, .5), -.6) }; }), per = 2.3;
      const saddles = sc => F.each(A, B, 1.7, per, (u, k) => { const h = SKIN_H(k, 80), h2 = SKIN_H(k, 81); F.blob(x, u, (h - .5) * .25, .82 * sc, .64 * sc, h2 * 9, .3); });
      const sides = sc => F.each(A, B, 1.7 + per / 2, per, (u, k) => { const h = SKIN_H(k, 82); F.blob(x, u, -1, .5 * sc, .44 * sc, h * 5, .25); F.blob(x, u + .2, 1, .5 * sc, .44 * sc, h * 7, .25); });
      fillP(x, p.rim, () => { saddles(1.12); sides(1.14); }); fillP(x, p.s, () => { saddles(1); sides(1); });
      fillP(x, p.eye, () => F.each(A, B, 1.7 + per / 2, per, u => { F.dot(x, u, -.92, .15); F.dot(x, u + .2, .92, .15); }));
    } },
  Diamondback: { scales: 1, // pale-edged dark diamonds down the back, dark marks on the flanks, and a ringed tail
    base: (u, c) => c.color,
    paint(x, F, A, B, c) {
      const p = skinPal(c, 'db', (P, S) => ({ e: S, d: shade(P, -.55), m: shade(P, -.3), r2: shade(mixColor(P, S, .3), -.75) })), per = 2.25, rat = Math.min(4.2, F.uEnd * .25), uR = F.uEnd - rat;
      const sz = u => 1 - sstep(uR - 2.8, uR - 1, u); // the diamonds shrink away into the rattle (a hard cut-off made them pop in and out as the body flexed)
      const dia = (u, l, w) => { const f = sz(u); if (f > .04) F.poly(x, [[u - l * f, 0], [u, -w * f], [u + l * f, 0], [u, w * f]], 4); };
      fillP(x, p.d, () => F.each(A, B, 2, per, u => { const j = u + per / 2, f = sz(j); if (f < .04) return; const a = .45 * f, b = 1.35 - .51 * f; F.poly(x, [[j - a, -1.35], [j, -b], [j + a, -1.35]], 2); F.poly(x, [[j - a, 1.35], [j, b], [j + a, 1.35]], 2); }));
      fillP(x, p.e, () => F.each(A, B, 2, per, u => dia(u, 1.17, .92)));
      fillP(x, p.d, () => F.each(A, B, 2, per, u => dia(u, .98, .76)));
      fillP(x, p.m, () => F.each(A, B, 2, per, u => dia(u, .48, .37)));
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
  'Gold Plated': { gloss: 1.5, // overlapping metal plates in your first color, trimmed with your second along the lit top edge, a shadow beneath, and a glint sweeping down the body
    base: (u, c) => { const p = goldPal(c), L = 40, d = ((u - T * 7) % L + L) % L, k = Math.max(0, 1 - Math.min(d, L - d) / 2.4); return mixColor(p.m, p.hi, k * k * .75); }, // a glint every 40 radii, sweeping at a steady 7 radii a second (tied to the body's length, it jumped as the body flexed)
    paint(x, F, A, B, c) {
      const p = goldPal(c); x.lineCap = 'round';
      x.beginPath(); F.each(A, B, .8, .95, u => F.cross(x, u + .42, -1.3, 1.3, .28)); x.strokeStyle = p.lo; x.lineWidth = F.R0 * .11; x.stroke();
      x.beginPath(); F.each(A, B, .8, .95, u => F.cross(x, u - .36, -1.1, 1.1, .28)); x.strokeStyle = p.hiA; x.lineWidth = F.R0 * .06; x.stroke();
    } },
  'Blood Soaked': { gloss: 1.3, // soaked through: your first color, mottled darker and slowly oozing down the body; clots along the back, runs of your second color dripping down the flanks, wet highlights
    base: (u, c) => shade(c.color, -.3),
    tex: { k: 3, flow: .18,
      field() { const a = texNoise(31, .25, .7, 4), b = texNoise(32, .09375, 1.6, 3), c = texNoise(33, .75, 1.6, 2); return (u, v, o) => { o[0] = a(u, v); o[1] = 1 - Math.abs(b(u, v)); o[2] = c(u, v); }; },
      pal: (P, S) => ({ r: [[0, rgbOf(shade(P, -.68))], [.4, rgbOf(shade(P, -.4))], [.72, rgbOf(shade(P, -.12))], [1, rgbOf(mixColor(P, S, .2))]], hi: rgbOf(mixColor(S, P, .35)) }),
      color: (f, i, p, o) => { texRamp(p.r, clamp(.55 + .6 * f[i] + .14 * f[i + 2], 0, 1), o); const s = f[i + 1]; if (s > .8) texMix(o, p.hi, (s - .8) * 2.4); return o; } },
    paint(x, F, A, B, c) {
      const p = skinPal(c, 'bs', (P, S) => ({ clot: shade(P, -.62), run: mixColor(P, S, .6), wet: rgbaOf(mixColor(mixColor(P, S, .5), '#ffffff', .65), .32) }));
      fillP(x, p.clot, () => F.each(A, B, 1.2, 1.4, (u, k) => { const h = SKIN_H(k, 100), h2 = SKIN_H(k, 101); F.blob(x, u + (h2 - .5) * .4, (h - .5) * .9, .3 + .25 * h2, .26 + .2 * h, h * 8, .35); }));
      fillP(x, p.run, () => F.each(A, B, 1.6, 1.05, (u, k) => { const h = SKIN_H(k, 102), sd = k % 2 ? 1 : -1, v0 = sd * (.15 + .3 * h), v1 = sd * 1.35, w = v => .06 + .1 * ((v - v0) / (v1 - v0)) ** 3;
        F.band(x, v => u - w(v), v => u + w(v), Math.min(v0, v1), Math.max(v0, v1), 6); }));
      x.beginPath(); F.each(A, B, 1.4, .9, (u, k) => { const h = SKIN_H(k, 103); F.at(u + h * .4, (h - .5) * .5); const r = F.r; x.moveTo(F.X - r * .42, F.Y - r * .3); x.ellipse(F.X - r * .3, F.Y - r * .3, r * .14, r * .06, -.7, 0, TAU); });
      x.fillStyle = p.wet; x.fill();
    } },
  Hazard: { scales: 0, base: (u, c) => c.color, // diagonal warning stripes, like hazard tape wrapped round the body
    paint(x, F, A, B, c) { fillP(x, c.color2, () => F.each(A, B, 1.6, 1.9, u => F.band(x, v => u - .48 + .5 * v, v => u + .48 + .5 * v, -1.3, 1.3, 4))); } },
  Lunar: { gloss: .5, // regolith in your first color, maria mixed toward your second, and craters lit from the same side as everything else
    base: (u, c) => lunPal(c).b,
    tex: { k: 2,
      field() { const a = texNoise(51, .125, .45, 3), b = texNoise(52, .5, 1.3, 4); return (u, v, o) => { o[0] = a(u, v); o[1] = b(u, v); }; },
      pal: (P, S) => { const m = lunPal({ color: P, color2: S }); return { b: rgbOf(m.b), mare: rgbOf(m.mare), lit: rgbOf(m.lit) }; },
      color: (f, i, p, o, t) => { o[0] = p.b[0]; o[1] = p.b[1]; o[2] = p.b[2]; texMix(o, p.mare, sstep(-.05, .4, f[i]) * .85);
        const g = 1 + f[i + 1] * .13, sp = SKIN_H(t, 55); o[0] *= g; o[1] *= g; o[2] *= g; if (sp > .975) texMix(o, sp > .9875 ? p.lit : p.mare, .55); return o; } },
    paint(x, F, A, B, c) {
      const p = lunPal(c);
      const cr = []; F.each(A, B, 1, .7, (u, k) => { const h = SKIN_H(k, 111); if (h < .72) { F.at(u + (SKIN_H(k, 112) - .5) * .4, (SKIN_H(k, 113) * 2 - 1) * .74); cr.push([F.X, F.Y, F.r * (.11 + .2 * SKIN_H(k, 114))]); } });
      for (const [col, o, k] of [[p.lit, .12, .95], [p.sh, -.12, .92], [p.fl, .03, .72]]) fillP(x, col, () => cr.forEach(([X, Y, r]) => { x.moveTo(X + o * r + r * k, Y + o * r); x.arc(X + o * r, Y + o * r, r * k, 0, TAU); }));
    } },
  Martian: { gloss: .6, // dust in your first color: patches mixed toward your second, wind streaks of your second, and grit
    base: (u, c) => marPal(c).b,
    tex: { k: 3,
      field() { const a = texNoise(41, .1875, .6, 4), b = texNoise(42, .0625, 2.4, 3), c = texNoise(43, 1, 2.2, 2); return (u, v, o) => { o[0] = a(u, v); o[1] = b(u, v); o[2] = c(u, v); }; },
      pal: (P, S) => { const m = marPal({ color: P, color2: S }); return { b: rgbOf(m.b), rust: rgbOf(m.rust), dust: rgbOf(m.dust) }; },
      color: (f, i, p, o) => { o[0] = p.b[0]; o[1] = p.b[1]; o[2] = p.b[2]; texMix(o, p.rust, sstep(-.1, .5, f[i]) * .85); texMix(o, p.dust, sstep(.05, .6, f[i + 1]) * .6);
        const g = 1 + f[i + 2] * .16; o[0] *= g; o[1] *= g; o[2] *= g; return o; } },
    paint(x, F, A, B, c) {
      const p = marPal(c);
      fillP(x, p.rock, () => F.each(A, B, 1, .42, (u, k) => { const h = SKIN_H(k, 123); F.dot(x, u + h * .4, (SKIN_H(k, 124) * 2 - 1) * .85, .04 + .05 * SKIN_H(k, 125)); }));
    } },
  Plasma: { gloss: .45, // a dark tube full of crackling plasma in your two colors, the filaments racing down the body
    base: (u, c) => shade(mixColor(c.color, c.color2, .3), -.86),
    tex: { k: 2, flow: 2.6,
      field() { const w1 = texNoise(61, .125, .7, 3), w2 = texNoise(62, .125, .7, 3), r = texNoise(63, .125, 1.1, 4), m = texNoise(64, .0625, .5, 2);
        return (u, v, o) => { o[0] = Math.max(0, 1 - 1.5 * Math.abs(r(u + w1(u, v) * 2.5, v + w2(u, v) * .55))); o[1] = m(u, v); }; }, // thin filaments in the dark
      pal: (P, S) => ({ d: rgbOf(shade(mixColor(P, S, .3), -.86)), p: rgbOf(P), s: rgbOf(S), c: [0, 0, 0], w: rgbOf(mixColor(darkLight(P, S)[1], '#ffffff', .6)) }), // the hottest cores: your brighter color, nearly white
      color: (f, i, p, o) => { const q = f[i], m = sstep(-.35, .35, f[i + 1]), c = p.c;
        c[0] = p.p[0] + (p.s[0] - p.p[0]) * m; c[1] = p.p[1] + (p.s[1] - p.p[1]) * m; c[2] = p.p[2] + (p.s[2] - p.p[2]) * m;
        o[0] = p.d[0]; o[1] = p.d[1]; o[2] = p.d[2]; const q2 = q * q, q4 = q2 * q2; texMix(o, c, Math.min(1, q4 * 1.3 + q * .1)); texMix(o, p.w, q4 * q4 * q4 * .85); return o; } } },
  Obsidian: { gloss: .15, // volcanic glass, your second color nearly black, with veins of your first glowing through it: crisp broken reflections along the top instead of a soft sheen, a faint glow of the veins along the far edge, and sharp glints where it fractured
    base: (u, c) => shade(c.color2, -.82),
    tex: { k: 2, flow: .3,
      field() { const a = texNoise(71, .125, .6, 4), r = texNoise(72, .125, .9, 4), w = texNoise(73, .125, .6, 2); return (u, v, o) => { o[0] = a(u, v); o[1] = 1 - Math.abs(r(u + w(u, v) * 2, v)); }; },
      pal: (P, S) => ({ g0: rgbOf(shade(S, -.9)), g1: rgbOf(shade(mixColor(S, P, .15), -.72)), vein: rgbOf(P), core: rgbOf(mixColor(mixColor(P, S, .25), '#ffffff', .55)) }),
      color: (f, i, p, o) => { const k = sstep(-.35, .55, f[i]), q = f[i + 1];
        o[0] = p.g0[0] + (p.g1[0] - p.g0[0]) * k; o[1] = p.g0[1] + (p.g1[1] - p.g0[1]) * k; o[2] = p.g0[2] + (p.g1[2] - p.g0[2]) * k;
        texMix(o, p.vein, sstep(.9, .98, q) * .95); texMix(o, p.core, sstep(.975, .998, q) * .9); return o; } },
    paint(x, F, A, B, c) {
      const u0 = Math.max(A, .4), u1 = Math.min(B, F.uEnd - .6); x.lineCap = 'round';
      if (u1 > u0) { x.beginPath(); F.line(x, u0, u1, .74); x.strokeStyle = rgbaOf(c.color, .16); x.lineWidth = F.R0 * .12; x.stroke(); } // the veins' glow caught along the far edge
      x.beginPath(); F.each(A, B, .5, 3.4, (u, k) => { const h = SKIN_H(k, 132), h2 = SKIN_H(k, 133); F.line(x, u, Math.min(u + 2 + 1.1 * h2, F.uEnd - .5), -.5 + (h - .5) * .14, .25); }); // a polished face: one long reflection, broken here and there where the glass was chipped
      x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = F.R0 * .34; x.stroke(); x.strokeStyle = 'rgba(255,255,255,.1)'; x.lineWidth = F.R0 * .16; x.stroke(); x.strokeStyle = 'rgba(255,255,255,.42)'; x.lineWidth = F.R0 * .05; x.stroke();
      fillP(x, 'rgba(255,255,255,.12)', () => F.each(A, B, 1.1, 1.7, (u, k) => { const h = SKIN_H(k, 130), sd = h < .5 ? -1 : 1, v = sd * (.2 + .3 * SKIN_H(k, 131)); F.poly(x, [[u, v], [u + .55 + .3 * h, v + sd * .1], [u + .18, v + sd * .32]], 1); }));
    } },
  Camo: { scales: 1, gloss: .45, // woodland camouflage in your colors: broad patches of a darker mix, bright ones of your second color and black brush strokes, all with soft, torn edges
    base: (u, c) => camoPal(c).b,
    tex: { k: 3,
      field() { const w1 = texNoise(81, .125, .5, 2), w2 = texNoise(82, .125, .5, 2), a = texNoise(83, .375, .8, 3), b = texNoise(84, .25, .9, 3), d = texNoise(85, .375, 1.2, 3);
        return (u, v, o) => { const uu = u + w1(u, v) * .9, vv = v + w2(u, v) * .35; o[0] = a(uu, vv); o[1] = b(uu + 7.25, vv); o[2] = d(uu + 3.125, vv * 1.1 + .4); }; }, // (the patches warped, so their edges tear like a real print's)
      pal: (P, S) => { const m = camoPal({ color: P, color2: S }); return { b: rgbOf(m.b), m: rgbOf(m.m), l: rgbOf(m.l), d: rgbOf(m.d) }; },
      color: (f, i, p, o) => { o[0] = p.b[0]; o[1] = p.b[1]; o[2] = p.b[2];
        texMix(o, p.m, sstep(-.04, .03, f[i])); texMix(o, p.l, sstep(.22, .29, f[i + 1])); texMix(o, p.d, sstep(.29, .36, f[i + 2])); return o; } } },
  Bones: { gloss: .55, // the skeleton showing through dark skin: a chain of vertebrae down the spine, ribs curving back down the flanks, the tail's bones shrinking to its tip. The bones in your second color, the skin your first, nearly black
    base: (u, c) => bonePal(c).g,
    paint(x, F, A, B, c) {
      const p = bonePal(c), per = .84, ribEnd = Math.max(3, F.uEnd * .62), lo = Math.max(A, 1.9 - per);
      const rib = (u, sd, g, f) => { const t = v => (Math.abs(v) - .16) / 1.0, w = v => ((.17 - .08 * t(v)) / 2 + g) * f, cu = v => u + .52 * Math.pow(t(v), 1.5) + .05; // from the spine out and back, thinning toward its end
        F.band(x, v => cu(v) - w(v), v => cu(v) + w(v), sd > 0 ? .16 : -1.16, sd > 0 ? 1.16 : -.16, 8); };
      const ribs = g => F.each(lo, Math.min(B, ribEnd), 1.25, per, u => { if (u < 1.9) return; const f = 1 - sstep(ribEnd - 3, ribEnd, u); if (f < .15) return; rib(u, 1, g, f); rib(u, -1, g, f); }); // (they thin away at the back of the ribcage)
      const verts = k => F.each(A, B, 1.25, per, (u, j) => F.blob(x, u, 0, .27 * k, .21 * k, .3 + (j % 5) * .1, .12, 12)); // the vertebrae
      const wings = k => F.each(A, Math.min(B, ribEnd + 2), 1.25, per, u => F.poly(x, [[u - .075 * k, -.4 * k], [u + .075 * k, -.4 * k], [u + .075 * k, .4 * k], [u - .075 * k, .4 * k]], 2)); // and their wings
      fillP(x, p.glow, () => { ribs(.075); verts(1.75); wings(1.6); }); // the faint glow of bone through skin
      fillP(x, p.rim, () => { ribs(.03); verts(1.25); wings(1.25); });
      fillP(x, p.bone, () => { ribs(0); verts(1); wings(1); });
      fillP(x, p.mar, () => F.each(A, B, 1.25, per, u => F.dot(x, u, 0, .07))); // the marrow
    } },
  'Stained Glass': { gloss: 1.25, // leaded glass: panes in every shade between your two colors (round the color wheel), each glowing brighter in its middle, set in dark lead, with a soft gleam sliding down the body
    base: (u, c) => mixColor(c.color, c.color2, .5),
    tex: { k: 3,
      field: () => glassField(91),
      pal: (P, S) => { const f = hslPath(P, S), ramp = []; for (let i = 0; i < 12; i++) ramp.push(rgbOf(f(i / 11))); return { ramp, lead: rgbOf(shade(mixColor(P, S, .5), -.86)), hi: [255, 255, 255] }; },
      color: (f, i, p, o) => { const h = f[i], c = p.ramp[Math.min(11, h * 12 | 0)], lk = .8 + .38 * SKIN_H(h * 1e6 | 0, 92); // each pane its own shade
        o[0] = c[0] * lk; o[1] = c[1] * lk; o[2] = c[2] * lk; texMix(o, p.hi, Math.max(0, .6 - f[i + 2]) * .45); // brighter toward its middle
        texMix(o, p.lead, 1 - sstep(.05, .11, f[i + 1])); return o; } },
    paint(x, F, A, B, c) { // a gleam of light sliding slowly down the panes
      const u0 = Math.max(A, .6), u1 = Math.min(B, F.uEnd - .4); if (u1 <= u0) return;
      x.save(); x.globalCompositeOperation = 'lighter';
      fillP(x, 'rgba(255,255,255,.08)', () => F.each(u0, u1, (T * 1.6) % 7.5 - 7.5, 7.5, u => F.band(x, v => u - .5 + .35 * v, v => u + .5 + .35 * v, -1.3, 1.3, 4)));
      x.restore();
    } },
};
const lavaPal = c => skinPal(c, 'la', (P, S) => { const [C, H] = darkLight(P, S), crust = shade(mixColor(C, H, .2), -.8); return { g1: mixColor(C, H, .6), crust, rim: mixColor(crust, H, .4) }; });
const galPal = c => skinPal(c, 'gx', (P, S) => ({ d: shade(mixColor(P, S, .3), -.88), star: mixColor(darkLight(P, S)[1], '#ffffff', .75) }));
const goldPal = c => skinPal(c, 'go', (P, S) => ({ m: P, hi: mixColor(mixColor(P, S, .3), '#ffffff', .6), hiA: rgbaOf(mixColor(S, '#ffffff', .2), .75), lo: shade(P, -.45) }));
const lunPal = c => skinPal(c, 'lu', (P, S) => ({ b: P, mare: shade(mixColor(P, S, .55), -.2), lit: mixColor(P, '#ffffff', .25), sh: shade(P, -.42), fl: shade(mixColor(P, S, .3), -.2) }));
const marPal = c => skinPal(c, 'ma', (P, S) => ({ b: P, rust: shade(mixColor(P, S, .45), -.2), dust: S, rock: shade(mixColor(P, S, .5), -.55) }));
const camoPal = c => skinPal(c, 'cm', (P, S) => { const [D] = darkLight(P, S); return { b: P, m: shade(mixColor(P, S, .45), -.28), l: mixColor(keepSeen(S, P), P, .15), d: shade(mixColor(D, P, .5), -.72) }; });
const bonePal = c => skinPal(c, 'bn', (P, S) => { const g = shade(mixColor(P, S, .12), -.74), bone = mixColor(keepSeen(S, g), '#ffffff', .18); return { g, bone, rim: mixColor(g, bone, .38), glow: rgbaOf(bone, .13), mar: shade(mixColor(bone, P, .3), -.35) }; });
function glassField(seed) { // Voronoi panes in body space, seamless down the body: o[0] the pane's own number, o[1] how far it is to the lead (the gap to the next-nearest pane), o[2] how far from the pane's middle
  const nu = 56, rows = 3, su = TEX.L / nu, sv = 2 * TEX.v0 / rows, pt = (i, j) => { const m = ((i % nu) + nu) % nu, k = m * 131 + (j + 2) * 977; return [(i + .15 + .7 * SKIN_H(k, seed)) * su, -TEX.v0 + (j + .15 + .7 * SKIN_H(k, seed + 1)) * sv, SKIN_H(k, seed + 2)]; };
  return (u, v, o) => {
    const ci = Math.floor(u / su), cj = Math.floor((v + TEX.v0) / sv); let d1 = 1e9, d2 = 1e9, h = 0;
    for (let di = -2; di <= 2; di++) for (let dj = -1; dj <= 1; dj++) { const [px, py, ph] = pt(ci + di, cj + dj), d = Math.hypot(u - px, v - py); if (d < d1) { d2 = d1; d1 = d; h = ph; } else if (d < d2) d2 = d; }
    o[0] = h; o[1] = d2 - d1; o[2] = d1 / (su * .62);
  };
}
const skinOf = cfg => SNAKE_SKINS[cfg.pattern] || SNAKE_SKINS.Solid;
function segColor(i, n, cfg) { return skinOf(cfg).base(i * .9, cfg, n * .9); } // the skin's ground color at segment i, for code that wants one color (eyes, after-images)
setTimeout(() => { // after loading, work the noise out in idle moments, one skin at a time, so the shop never stalls showing them
  const idle = f => window.requestIdleCallback ? requestIdleCallback(f, { timeout: 5000 }) : setTimeout(f, 300);
  const todo = Object.values(SNAKE_SKINS).filter(sk => sk.tex), step = () => { const sk = todo.shift(); if (!sk) return; texFields(sk.tex); idle(step); };
  idle(step);
}, 2500);

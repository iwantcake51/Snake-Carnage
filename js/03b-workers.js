/* =========================================================
   WORKERS: heavy number-crunching on the other CPU cores.
   The game itself (logic, drawing) has to live on the page's main thread, but pure per-pixel maths doesn't: it goes to
   a small pool of Web Workers (one per spare core, up to 4) and comes back as typed arrays. Today that's the snow
   (building a winter map's snow cover, split by rows across every worker at once, and re-shading the patches the
   snake and the crowd churn up while playing). Kernels are plain functions with no outside references: the same code
   runs inside a worker or, if workers are unavailable, right here on the main thread.
   ========================================================= */
const PX_KERNELS = {
  // the clouds over an outdoor map (18b-clouds): a seamless cloud cover as an alpha mask, n x n. Periodic gradient noise, a little
  // domain warp so the edges go wispy, then a soft threshold: cov is how much of the sky is cloud
  cloudTile(a) {
    const { n, seed, cov } = a, px = new Uint8ClampedArray(n * n * 4); let s = (seed | 0) % 2147483646 + 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const G = new Float32Array(512), P = new Uint16Array(512); for (let i = 0; i < 256; i++) { const t = rnd() * Math.PI * 2; G[i * 2] = Math.cos(t); G[i * 2 + 1] = Math.sin(t); P[i] = i; }
    for (let i = 255; i > 0; i--) { const j = rnd() * (i + 1) | 0, t = P[i]; P[i] = P[j]; P[j] = t; } for (let i = 0; i < 256; i++) P[i + 256] = P[i];
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const noise = (x, y, per) => { x = ((x % per) + per) % per; y = ((y % per) + per) % per; const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fade(fx), v = fade(fy);
      const d = (cx, cy, ox, oy) => { const h = P[P[cx % per] + cy % per] * 2; return G[h] * ox + G[h + 1] * oy; };
      const a0 = d(ix, iy, fx, fy), a1 = d(ix + 1, iy, fx - 1, fy), b0 = d(ix, iy + 1, fx, fy - 1), b1 = d(ix + 1, iy + 1, fx - 1, fy - 1), top = a0 + (a1 - a0) * u; return top + (b0 + (b1 - b0) * u - top) * v; };
    const fbm = (x, y, per, oct) => { let t = 0, amp = .5, f = 1; for (let o = 0; o < oct; o++) { t += noise(x * f, y * f, per * f) * amp; amp *= .5; f *= 2; } return t; };
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const u = i / n * 4, v = j / n * 4, wx = fbm(u + 3.1, v + 7.7, 4, 2), wy = fbm(u + 11.3, v + 1.9, 4, 2);
      const grp = fbm(i / n * 2 + 5.3, j / n * 2 + 9.1, 2, 2), c = cov + grp * .95, lo = 1 - c - .08, hi = lo + .3; // a slow swell of cover: clouds bunch up into groups, clear sky between them
      const t = fbm(u + wx * .45, v + wy * .45, 4, 4) * .95 + .5, e = Math.min(1, Math.max(0, (t - lo) / (hi - lo))), dd = e * e * (3 - 2 * e);
      const o = (j * n + i) * 4; px[o] = 16; px[o + 1] = 24; px[o + 2] = 38; px[o + 3] = Math.round(Math.pow(dd, 1.15) * 255);
    }
    return { px };
  },
  // the season's recolor of the floor (09-seasons gradeGround): how grassy each half-size cell is (soft-edged), and for
  // each tint pass the color and strength to lay over it. d: the half-size floor (RGBA); mix: a coarse noise grid (nw wide, NG px a cell)
  gradeMasks(a) {
    const { d, sw, sh, mix, nw, NG, tints } = a, clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v, gf = new Float32Array(sw * sh);
    for (let k = 0; k < sw * sh; k++) gf[k] = clamp((d[k * 4 + 1] - Math.max(d[k * 4], d[k * 4 + 2]) - 6) / 30, 0, 1);
    for (let pass = 0; pass < 2; pass++) for (const [di, dj] of [[1, 0], [0, 1]]) { const src = gf.slice(); for (let j = 3; j < sh - 3; j++) for (let i = 3; i < sw - 3; i++) { let s = 0; for (let t = -3; t <= 3; t++) s += src[(j + dj * t) * sw + i + di * t]; gf[j * sw + i] = s / 7; } } // soft edges, no stair steps
    const M = new Float32Array(sw * sh);
    for (let j = 0; j < sh; j++) { const fy = j / NG, j0 = fy | 0, ty = fy - j0; for (let i = 0; i < sw; i++) { const fx = i / NG, i0 = fx | 0, tx = fx - i0, q = j0 * nw + i0; M[j * sw + i] = (mix[q] * (1 - tx) + mix[q + 1] * tx) * (1 - ty) + (mix[q + nw] * (1 - tx) + mix[q + nw + 1] * tx) * ty; } }
    const out = { gf };
    tints.forEach(([A0, A1, A2, B0, B1, B2, kg, ko], n) => { const P = new Uint8ClampedArray(sw * sh * 4), dr = B0 - A0, dg = B1 - A1, db = B2 - A2;
      for (let k = 0, o = 0; k < sw * sh; k++, o += 4) { const m = M[k]; P[o] = A0 + dr * m; P[o + 1] = A1 + dg * m; P[o + 2] = A2 + db * m; P[o + 3] = 255 * (ko + (kg - ko) * gf[k]); }
      out['t' + n] = P; });
    return out;
  },
  // the sky's echo for the air strikes (38c airVerb): a long, dark, diffuse stereo tail of filtered noise
  skyVerb(a) {
    const { sr, len } = a, out = {};
    for (const ch of ['L', 'R']) { const d = new Float32Array(len); let lp = 0; for (let i = 0; i < len; i++) { const t = i / sr; lp += (Math.random() * 2 - 1 - lp) * (.32 - .2 * Math.min(1, t / 3)); d[i] = lp * Math.exp(-t * 1.25) * (t < .08 ? t / .08 : 1); } out[ch] = d; } // darker as it fades, with a soft onset
    return out;
  },
  // a frozen pond's ice sheet (08-water drawIce), a pixel at a time: thick and white at the shore, clearing to deep blue
  // over the water, clouds of frost, windows of clear black ice, wind-polished streaks, a fine grain. D: distance from the
  // shore on a cs-px grid (gw x gh) starting at (ox, oy); ramp: [depth, r, g, b, a, ...]
  iceSheet(a) {
    const { D, gw, gh, cs, ox, oy, w, h, span, ramp, thin, sd, ca, sa } = a, out = new Uint8ClampedArray(w * h * 4), nR = ramp.length / 5;
    const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
    const P = new Uint8Array(512); { let s = Math.floor(sd * 1000) | 0; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; const p = Array.from({ length: 256 }, (_, i) => i); for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10), grad = (hh, x, y) => { const g = hh & 7, u = g < 4 ? x : y, v = g < 4 ? y : x; return ((g & 1) ? -u : u) + ((g & 2) ? -2 * v : 2 * v); };
    const perlin = (x, y) => { const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y); const u = fade(x), v = fade(y), A = P[X] + Y, B = P[X + 1] + Y;
      const l1 = grad(P[A], x, y) + u * (grad(P[B], x - 1, y) - grad(P[A], x, y)), l2 = grad(P[A + 1], x, y - 1) + u * (grad(P[B + 1], x - 1, y - 1) - grad(P[A + 1], x, y - 1)); return (l1 + v * (l2 - l1)) * .35; }; // about -1..1
    const fbm = (x, y, o) => { let s = 0, am = .5, f = 1, n = 0; for (let k = 0; k < o; k++) { s += perlin(x * f, y * f) * am; n += am; am *= .5; f *= 2.03; } return s / n; };
    const at = (x, y) => { const fx = (x - ox) / cs, fy = (y - oy) / cs, i = clamp(fx | 0, 0, gw - 2), j = clamp(fy | 0, 0, gh - 2), tx = clamp(fx - i, 0, 1), ty = clamp(fy - j, 0, 1), q = j * gw + i; return (D[q] * (1 - tx) + D[q + 1] * tx) * (1 - ty) + (D[q + gw] * (1 - tx) + D[q + gw + 1] * tx) * ty - cs * .5; };
    const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const wx = ox + px + .5, wy = oy + py + .5, dd = at(wx, wy); if (dd < -.75) continue; // (the edge itself is cut cleanly by the shore's path when it's drawn)
      const dn = clamp(dd / span, 0, 1); let q = 1; while (q < nR - 1 && ramp[q * 5] < dn) q++;
      const a0 = (q - 1) * 5, a1 = q * 5, t = clamp((dn - ramp[a0]) / (ramp[a1] - ramp[a0]), 0, 1);
      let R = ramp[a0 + 1] + (ramp[a1 + 1] - ramp[a0 + 1]) * t, G = ramp[a0 + 2] + (ramp[a1 + 2] - ramp[a0 + 2]) * t, B = ramp[a0 + 3] + (ramp[a1 + 3] - ramp[a0 + 3]) * t, al = ramp[a0 + 4] + (ramp[a1 + 4] - ramp[a0 + 4]) * t;
      const frost = fbm(wx / 52 + sd, wy / 52 - sd, 3), clear = fbm(wx / 28 - sd, wy / 28 + sd, 2), streak = perlin((wx * ca + wy * sa) / 90 + sd, (-wx * sa + wy * ca) / 11) * clamp(.5 + fbm(wx / 70 - sd, wy / 70, 2) * 1.6, 0, 1);
      const fr = clamp(.1 + frost * 1.25 + (1 - dn) * .3 - Math.max(0, clear) * .9, 0, 1) * (thin ? .4 : .8); // milky frost in clouds, thinning where the ice is clear
      const win = Math.max(0, clear - .08) * (1 - fr) * dn * (thin ? .5 : .55); R *= 1 - win; G *= 1 - win * .85; B *= 1 - win * .6; // windows of clear black ice
      R += (240 - R) * fr; G += (247 - G) * fr; B += (251 - B) * fr; al += (1 - al) * fr * .5;
      const st = Math.max(0, streak - .18) * (thin ? .2 : .32); R += (250 - R) * st; G += (253 - G) * st; B += (255 - B) * st; // polished by the wind, all one way
      const gn = (hash(px * 7.13 + py * 91.7 + sd) - .5) * 7, n = (py * w + px) * 4; out[n] = R + gn; out[n + 1] = G + gn; out[n + 2] = B + gn; out[n + 3] = al * 255;
    }
    return { px: out };
  },
  // snow depth and ambient occlusion for rows [j0, j1): the expensive part of building the snow cover
  snowField(a) {
    const { SNW, SN, SG, GW, GH, dist, NZ, LZ, nw, NC, green, gw, late, pines, ice, j0, j1 } = a;
    const sstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
    const up = (A, i, j) => { const fx = i / NC, fy = j / NC, i0 = fx | 0, jj = fy | 0, tx = fx - i0, ty = fy - jj, q = jj * nw + i0; return (A[q] * (1 - tx) + A[q + 1] * tx) * (1 - ty) + (A[q + nw] * (1 - tx) + A[q + nw + 1] * tx) * ty; };
    const rows = j1 - j0, D = new Float32Array(rows * SNW), AO = new Float32Array(rows * SNW);
    for (let j = j0; j < j1; j++) for (let i = 0; i < SNW; i++) {
      const x = i * SN + 1, y = j * SN + 1, k = (j - j0) * SNW + i, gk = (y / SG | 0) * GW + (x / SG | 0);
      if (dist[gk] === 0) continue;
      const gx = clamp(x / SG - .5, 0, GW - 1.001), gy = clamp(y / SG - .5, 0, GH - 1.001), gi = gx | 0, gj = gy | 0, tx = gx - gi, ty = gy - gj, g0 = gj * GW + gi;
      const dd = (dist[g0] * (1 - tx) + dist[g0 + 1] * tx) * (1 - ty) + (dist[g0 + GW] * (1 - tx) + dist[g0 + GW + 1] * tx) * ty;
      const n = up(NZ, i, j);
      let d = (late ? sstep(.16, .36, n) : sstep(-.38, -.04, n)) * up(LZ, i, j);
      const gr = green[(j * SN >> 1) * gw + (i * SN >> 1)] || 0; d *= (late ? .25 : .3) + (late ? .75 : .7) * gr;
      if (!late && dd < 40) d += .4 * Math.exp(-(dd - SG) / 10) * sstep(-.7, -.1, n);
      for (let p = 0; p < pines.length; p += 3) { const r = Math.hypot(x - pines[p], y - pines[p + 1]), pr = pines[p + 2] * 1.15; if (r < pr) d *= .3 + .7 * (r / pr) ** 2; }
      d *= sstep(SG * .5, SG * 2.2, dd);
      const e = ice ? (ice[g0] * (1 - tx) + ice[g0 + 1] * tx) * (1 - ty) + (ice[g0 + GW] * (1 - tx) + ice[g0 + GW + 1] * tx) * ty : -1; // (a signed distance, so it's smooth between the grid's cells)
      if (e > 0) { d = Math.min(1, d * 2.2) * (.85 * sstep(9 + 5 * n, 1, e) + .45 * sstep(.68, .9, up(LZ, i, j))); d = Math.min(d, .8); } // frozen water: drifted up against the bank, a few wind-blown patches further out, the rest swept clear
      D[k] = late ? d * .75 : Math.min(1.25, d); AO[k] = 1 - .38 * Math.exp(-dd / 7);
    }
    return { D, AO, j0, j1 };
  },
  // the snow's surface detail (textures/ground/snow_detail.jpg, from ambientCG's Snow003): kept in each worker (and on the page) for snowShade
  snowTexSet(a) { globalThis.__snowTex = a.T; globalThis.__snowTexN = a.n; return {}; },
  // snow colors for a rectangle. The inputs are a window of the snow grid (w x h, starting at ox, oy) with at least
  // 8 cells of margin where the map has them; the output is RGBA for [x0, x1) x [y0, y1) in map cells.
  snowShade(a) {
    const { D, AO, S, C3, w, h, ox, oy, SNW, SNH, x0, y0, x1, y1 } = a;
    const sstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
    const ow = x1 - x0, P = new Uint8ClampedArray(ow * (y1 - y0) * 4);
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
      const k = (j - oy) * w + (i - ox), d = D[k], o = ((j - y0) * ow + (i - x0)) * 4;
      if (d < .025) { P[o + 3] = 0; continue; }
      const at = (di, dj) => { const ii = i + di, jj = j + dj; return ii < 0 || jj < 0 || ii >= SNW || jj >= SNH || ii < ox || jj < oy || ii >= ox + w || jj >= oy + h ? d : D[(jj - oy) * w + (ii - ox)]; };
      const lit = clamp(1 + (at(4, 0) - at(-4, 0) + at(0, 4) - at(0, -4)) * 1.5, .5, 1.3);
      const far = (at(-8, 0) + at(8, 0) + at(0, -8) + at(0, 8)) * .25;
      const cav = clamp((far - d) * 2.2, 0, .5), rim = 1 - sstep(.03, .3, d);
      const L = clamp(lit * AO[k] * (1 - cav * (1 - rim * .7)) * (1 - .1 * rim) + rim * .08, .38, 1.25);
      const pk = .86 + .14 * sstep(.22, .42, d);
      let R = (148 + 95 * Math.min(1, L)) * pk, G = (166 + 81 * Math.min(1, L)) * pk, B = (204 + 49 * Math.min(1, L)) * (pk * .5 + .5);
      if (L > 1) { const e = (L - 1) * 40; R += e; G += e; B += e * .5; }
      const TX = globalThis.__snowTex; if (TX) { const n = globalThis.__snowTexN, q = ((j % n) * n + (i % n)) * 3, q2 = (((i + 97) % n) * n + (n - 1 - (j + 53) % n)) * 3, f = (.35 + .65 * sstep(.05, .4, d)) * 2.5 / 170; // real snow's crystals and relief, anchored to the map, fainter on a thin dusting (the tile is soft: x2.5 makes it just noticeable, about +-5%)
        const w = .5 + .5 * Math.sin(i * .011 + Math.sin(j * .007) * 2) * Math.sin(j * .013 + 1.3), v = 1 - w; // and the same texture turned a quarter, mixed in by a slow drift across the map: no grid of repeats
        R *= 1 + (TX[q] * v + TX[q2] * w - 170) * f; G *= 1 + (TX[q + 1] * v + TX[q2 + 1] * w - 170) * f; B *= 1 + (TX[q + 2] * v + TX[q2 + 2] * w - 170) * f; }
      const s = S ? S[k] : 0;
      if (s > .01) { const t = Math.min(.96, s * .85), dk = (1 - .42 * sstep(.9, 3.2, s)) * clamp(L, .7, 1.05); R += (C3[k * 3] * dk - R) * t; G += (C3[k * 3 + 1] * dk - G) * t; B += (C3[k * 3 + 2] * dk - B) * t; }
      P[o] = R; P[o + 1] = G; P[o + 2] = B; P[o + 3] = 255 * sstep(.025, .26, d) * .97;
    }
    return { P, x0, y0, x1, y1 };
  },
};
const PX = (() => { // the pool
  const n = (() => { try { return Math.max(0, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)); } catch (e) { return 0; } })();
  const pool = [], waiting = new Map(); let seq = 0, rr = 0, ok = n > 0 && typeof Worker === 'function' && typeof Blob === 'function';
  if (ok) {
    try {
      const src = `const K = {${Object.entries(PX_KERNELS).map(([k, f]) => `${k}: ${f.toString().replace(/^\w+\s*\(/, 'function (')}`).join(',\n')}};
        onmessage = e => { const { id, k, a } = e.data; try { const r = K[k](a), tr = []; for (const v of Object.values(r)) if (v && v.buffer instanceof ArrayBuffer) tr.push(v.buffer); postMessage({ id, r }, tr); } catch (err) { postMessage({ id, err: String(err) }); } };`;
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      for (let i = 0; i < n; i++) { const w = new Worker(url); w.onmessage = e => { const q = waiting.get(e.data.id); if (!q) return; waiting.delete(e.data.id); w.busy--; e.data.err ? q.rej(new Error(e.data.err)) : q.res(e.data.r); }; w.onerror = () => { ok = false; }; w.busy = 0; pool.push(w); }
    } catch (e) { ok = false; }
  }
  return {
    get size() { return ok ? pool.length : 0; },
    all(k, a) { // the same call on every worker (state they keep, like the snow's texture); nothing comes back
      if (!ok) return; for (const w of pool) { const id = ++seq; w.busy++; waiting.set(id, { res() {}, rej() {} }); try { w.postMessage({ id, k, a }); } catch (e) { waiting.delete(id); w.busy--; } }
    },
    run(k, a, transfer) { // a promise of the kernel's result; runs here if there are no workers
      if (!ok || !pool.length) return new Promise((res, rej) => { try { res(PX_KERNELS[k](a)); } catch (e) { rej(e); } });
      const w = pool.reduce((b, x) => x.busy < b.busy ? x : b, pool[rr++ % pool.length]), id = ++seq; w.busy++;
      return new Promise((res, rej) => { waiting.set(id, { res, rej }); try { w.postMessage({ id, k, a }, transfer || []); } catch (e) { waiting.delete(id); w.busy--; try { res(PX_KERNELS[k](a)); } catch (x) { rej(x); } } });
    },
  };
})();

/* =========================================================
   WORKERS: heavy number-crunching on the other CPU cores.
   The game itself (logic, drawing) has to live on the page's main thread, but pure per-pixel maths doesn't: it goes to
   a small pool of Web Workers (one per spare core, up to 4) and comes back as typed arrays. Today that's the snow
   (building a winter map's snow cover, split by rows across every worker at once, and re-shading the patches the
   snake and the crowd churn up while playing). Kernels are plain functions with no outside references: the same code
   runs inside a worker or, if workers are unavailable, right here on the main thread.
   ========================================================= */
const PX_KERNELS = {
  // snow depth and ambient occlusion for rows [j0, j1): the expensive part of building the snow cover
  snowField(a) {
    const { SNW, SN, SG, GW, GH, dist, NZ, LZ, nw, NC, green, gw, late, pines, j0, j1 } = a;
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
      const TX = globalThis.__snowTex; if (TX) { const n = globalThis.__snowTexN, q = ((j % n) * n + (i % n)) * 3, q2 = (((i + 97) % n) * n + (n - 1 - (j + 53) % n)) * 3, f = (.35 + .65 * sstep(.05, .4, d)) / 170; // real snow's crystals and relief, anchored to the map, fainter on a thin dusting
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

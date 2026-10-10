/* =========================================================
   BLOOD SYSTEM
   ========================================================= */
/* BLOOD TEXTURE: blood isn't one flat color. Each blood color gets a seamless 128 px tile, built once: the color itself on
   average, darker where it pooled thicker, clotted flecks, the odd lighter streak where it ran thin. Splats and pools fill with
   it as a pattern anchored to the world, so overlapping splats share one texture and never show a seam (a fill costs the same) */
function tileNoise(n, cells, seed, oct = 3) { // periodic value noise, n x n, about 0..1, wrapping at the edges
  const out = new Float32Array(n * n); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++, amp *= .5) {
    const c = cells << o, g = new Float32Array(c * c); for (let i = 0; i < c * c; i++) { const h = Math.sin((i + 1) * 12.9898 + seed * 78.233 + o * 37.7) * 43758.5453; g[i] = h - Math.floor(h); }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const fx = x / n * c, fy = y / n * c, ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[iy * c + ix], b = g[iy * c + (ix + 1) % c], d = g[((iy + 1) % c) * c + ix], e = g[((iy + 1) % c) * c + (ix + 1) % c];
      out[y * n + x] += ((a + (b - a) * sx) * (1 - sy) + (d + (e - d) * sx) * sy) * amp;
    }
    tot += amp;
  }
  for (let i = 0; i < n * n; i++) out[i] /= tot; return out;
}
const BLOOD_TILE = new Map(), BLOOD_PAT = new WeakMap();
function bloodTile(col) {
  let c = BLOOD_TILE.get(col); if (c) return c;
  const N = 128, [r, g, b] = rgbOf2(col), thick = tileNoise(N, 4, 3), mid = tileNoise(N, 12, 7, 2), fine = tileNoise(N, 16, 5, 2), run = tileNoise(N, 3, 9, 2);
  c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), im = x.createImageData(N, N), d = im.data;
  for (let i = 0; i < N * N; i++) {
    const t = thick[i], f = fine[i], clot = f > .66 ? Math.min(1, (f - .66) * 3.2) : 0, thin = Math.max(0, run[i] - .58) * 2.2; // clots: fine dark flecks; thin: where it ran out
    const k = (.78 + .44 * t) * (.86 + .28 * mid[i]) * (1 - clot * .6) * (1 + thin * .5) * (.94 + .12 * f); // about 1 on average: still the blood's own color
    d[4 * i] = Math.min(255, r * k + thin * 34); d[4 * i + 1] = Math.min(255, g * k + thin * 6); d[4 * i + 2] = Math.min(255, b * k + thin * 6); d[4 * i + 3] = 255;
  }
  x.putImageData(im, 0, 0); if (BLOOD_TILE.size > 48) BLOOD_TILE.delete(BLOOD_TILE.keys().next().value); BLOOD_TILE.set(col, c); return c;
}
setTimeout(() => { // the usual blood colors' tiles are built in quiet moments after loading, not on the first kill or blast
  const todo = [BLOOD, '#a50d16', '#c8161e', '#7c0710', '#b8101a', '#6e0710', ...GOLD_BLOOD, '#3f9a1c', '#4fae24', '#58b82c'], idle = f => window.requestIdleCallback ? requestIdleCallback(f, { timeout: 5000 }) : setTimeout(f, 300);
  const step = () => { const c = todo.shift(); if (!c) return; bloodTile(c); idle(step); }; idle(step);
}, 3000);
function bloodWarmSnake() { // a run is starting: your snake bursts in its own two colors (and their shades), so their tiles are built now, in quiet moments, not on the first hit (~11 ms)
  const cfg = SETTINGS.snake || {}, P = cfg.color || '#4e7cf6', Q = cfg.color2 || shade(P, .3), todo = [P, shade(P, -.2), shade(P, -.4), Q, shade(Q, -.25)].filter(c => !BLOOD_TILE.has(c));
  const idle = f => window.requestIdleCallback ? requestIdleCallback(f, { timeout: 4000 }) : setTimeout(f, 200), step = () => { const c = todo.shift(); if (!c) return; try { bloodTile(c); } catch (e) {} idle(step); }; idle(step);
}
function bloodFill(x, col, px = 0, py = 0, a = 0) { // the textured fill for this blood color on this canvas, lined up with the world under a local translate/rotate
  col = col || BLOOD; if (!col.startsWith('#')) return col;
  let m = BLOOD_PAT.get(x); if (!m) BLOOD_PAT.set(x, m = new Map());
  let p = m.get(col); if (!p) { p = x.createPattern(bloodTile(col), 'repeat'); m.set(col, p); }
  p.setTransform(a ? new DOMMatrix().rotateSelf(-a * 180 / Math.PI).translateSelf(-px, -py) : new DOMMatrix([1, 0, 0, 1, -px, -py]));
  return p;
}
function splat(x, px, py, vx, vy, r, c, onWall) { // flat single-color splats with organic, directional shapes
  const sp = Math.hypot(vx, vy), a = Math.atan2(vy, vx), st = 1 + Math.min(sp / 170, onWall ? 1.1 : 2.4), dq = BQ().detail; // dq: shape detail by blood quality (0 plain, 1 some, 2 full)
  x.save(); x.translate(px, py); x.rotate(a); x.fillStyle = bloodFill(x, c, px, py, a); x.globalAlpha = 1; // (textured, lined up with the world)
  if (!dq) { if (sp < 110 || r > 3.2) { circ(x, 0, 0, r); circ(x, r * .4, 0, r * .6); } else { ell(x, 0, 0, r * st, r * .9); circ(x, r * st * 1.4, 0, r * .3); } x.restore(); return; } // Low: one cheap shape per drop
  if (sp < 110 || r > 3.2) { // slow or heavy drop: lumpy round blob, big ones get a crown of spikes
    circ(x, 0, 0, r);
    for (let k = dq > 1 ? randi(3, 6) : 2; k > 0; k--) { const la = rand(0, TAU), ld = r * rand(.35, .75); circ(x, Math.cos(la) * ld, Math.sin(la) * ld, r * rand(.45, .75)); }
    if (r > 2.6) for (let k = dq > 1 ? randi(4, 8) : randi(2, 3); k > 0; k--) {
      const la = rand(0, TAU), len = r * rand(1.3, 2.4), w = r * rand(.12, .25);
      x.beginPath(); x.moveTo(Math.cos(la + 1.57) * w, Math.sin(la + 1.57) * w); x.lineTo(Math.cos(la) * len, Math.sin(la) * len); x.lineTo(Math.cos(la - 1.57) * w, Math.sin(la - 1.57) * w); x.fill();
      if (Math.random() < .5) circ(x, Math.cos(la) * (len + r * .5), Math.sin(la) * (len + r * .5), r * rand(.12, .25));
    }
  } else { // fast drop: stretched body, tapered tail pointing the way it flew, droplets thrown ahead
    const L = r * st, ry = r * (onWall ? 1.15 : rand(.8, 1));
    ell(x, 0, 0, L, ry);
    circ(x, -L * .45, rand(-.25, .25) * ry, ry * rand(.75, 1));
    const tail = L + r * rand(1.2, 2.6) * st * .6;
    x.beginPath(); x.moveTo(L * .55, -ry * .45); x.quadraticCurveTo(tail * .8, rand(-.3, .3), tail, rand(-.4, .4)); x.quadraticCurveTo(tail * .8, rand(-.3, .3), L * .55, ry * .45); x.fill();
    for (let k = randi(1, 3); k > 0; k--) circ(x, tail + r * rand(.8, 3) * st * .5, rand(-r, r) * .5, r * rand(.15, .35));
    if (Math.random() < .4) circ(x, rand(-L, L * .5), (Math.random() < .5 ? -1 : 1) * ry * rand(1.4, 2.2), r * rand(.12, .25)); // side fleck
  }
  if (r > 2.2 && !onWall && dq > 1) for (let k = randi(2, 6); k > 0; k--) circ(x, rand(-r * 4, r * 5), rand(-r * 3, r * 3), rand(.3, .7)); // fine mist
  x.restore();
  if (!onWall && r > 1.5 && dq > 1 && grassAt(px, py)) { // a few blades of grass poking through
    const g = grassColAt(px, py); x.strokeStyle = `rgb(${g[0] + 12},${g[1] + 14},${g[2]})`; x.lineWidth = .8; x.globalAlpha = .9;
    for (let k = randi(1, 3); k > 0; k--) { const bx = px + rand(-r * 1.6, r * 1.6), by = py + rand(-r, r); x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + rand(-1, 1), by - rand(1.5, 3.2)); x.stroke(); }
    x.globalAlpha = 1;
  }
}

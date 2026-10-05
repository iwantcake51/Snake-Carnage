/* =========================================================
   MATERIALS: reusable procedural surfaces for the Canvas 2D renderer (the "custom shaders" of this game).
   A material is plain, serializable data, never code:
     { v: 1, name, opacity, glow, glowColor, layers: [ layer, ... ] }   (bottom layer first)
   A layer is one step of the stack:
     t:      solid | linear | radial | noise | checker | stripes | speckle | grain | waves | cells
     c, c2:  its two colors (stops: [[0, '#hex'], [1, '#hex'], ...] for gradients, any number of them)
     a:      opacity 0..1        blend: any canvas composite mode ('source-over', 'multiply', 'screen', 'lighter', ...)
     scale:  texture scale       ox, oy: offset (px)      rot: rotation (deg)
     speed:  [sx, sy] px/s scroll (flowing / scrolling textures)       wobble: px of shimmer (heat haze, water)
     wspeed: shimmer speed       oct: noise octaves       nscale: noise feature size       density: speckle amount
     cycle:  [colors] + cspeed   (the color drifts through them: neon, hologram)
   How it's drawn: "tile" layers (noise, checker, stripes, speckle, grain, waves, cells, solid) are baked ONCE into a
   seamless 128px tile, cached by their content, and laid as a pattern in world space; animation only moves the pattern
   transform each frame (smooth, nearly free). Gradients are laid across the shape's own box. Glow is an additive halo.
   The same stack maps one-to-one onto a fragment shader (each layer = one function of uv and time, blended in order),
   so a future WebGL effect layer could compile these materials instead of re-authoring them.
   ========================================================= */
const MAT_TILE = 128;
const matTiles = new Map(); // layer content key -> baked tile canvas
const hexRgb = h => { h = (h || '#888888').replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h.slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgbHex = c => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const lerpHex = (a, b, t) => { const A = hexRgb(a), Bc = hexRgb(b); return rgbHex(A.map((v, i) => v + (Bc[i] - v) * t)); };
function periodicNoise(seed, size, cells, oct) { // seamless fractal value noise in 0..1 (wraps at the tile edge)
  const r = seeded(seed), acc = new Float32Array(size * size); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) { const g = Math.max(1, cells << o), v = new Float32Array(g * g); for (let i = 0; i < v.length; i++) v[i] = r();
    for (let py = 0; py < size; py++) { const fy = py / size * g, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), y1 = (y0 + 1) % g;
      for (let px = 0; px < size; px++) { const fx = px / size * g, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % g;
        const a = v[y0 * g + x0] + (v[y0 * g + x1] - v[y0 * g + x0]) * sx, b = v[y1 * g + x0] + (v[y1 * g + x1] - v[y1 * g + x0]) * sx; acc[py * size + px] += (a + (b - a) * sy) * amp; } }
    tot += amp; amp *= .5; }
  for (let i = 0; i < acc.length; i++) acc[i] /= tot;
  return acc;
}
const TILE_LAYERS = new Set(['solid', 'noise', 'checker', 'stripes', 'speckle', 'grain', 'waves', 'cells']);
function layerTile(L) { // bake one tile layer (cached by what it looks like, so identical layers share a tile)
  const key = JSON.stringify([L.t, L.c, L.c2, L.oct, L.nscale, L.density, L.seed, L.width]);
  let c = matTiles.get(key); if (c) return c;
  const S = MAT_TILE; c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const A = hexRgb(L.c || '#888888'), Bc = hexRgb(L.c2 || L.c || '#444444');
  if (L.t === 'solid') { x.fillStyle = L.c || '#888'; x.fillRect(0, 0, S, S); }
  else if (L.t === 'checker') { const n = 2 * Math.max(1, Math.round(L.density || 2)), q = S / n; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { x.fillStyle = (i + j) % 2 ? L.c2 || '#222' : L.c || '#ddd'; x.fillRect(i * q, j * q, q, q); } }
  else if (L.t === 'stripes') { const n = Math.max(1, Math.round(L.density || 4)), q = S / n, w = clamp(L.width ?? .5, .05, .95); x.fillStyle = L.c2 || '#222'; x.fillRect(0, 0, S, S); x.fillStyle = L.c || '#ddd'; for (let i = 0; i < n; i++) x.fillRect(i * q, 0, q * w, S); }
  else { // per-pixel layers
    const img = x.createImageData(S, S), d = img.data, n = L.t === 'noise' || L.t === 'waves' || L.t === 'cells' ? periodicNoise((L.seed || 7) * 131 + 17, S, Math.max(1, Math.round(L.nscale || 4)), clamp(L.oct || 4, 1, 6)) : null, r = seeded((L.seed || 3) * 977 + 5);
    for (let i = 0; i < S * S; i++) {
      let t;
      if (L.t === 'noise') t = n[i];
      else if (L.t === 'waves') { const py = (i / S | 0), px = i % S; t = .5 + .5 * Math.sin((py / S * (L.density || 3) + n[i] * 1.6) * TAU); t = t * t; }
      else if (L.t === 'cells') t = Math.abs(n[i] - .5) * 2 < .08 ? 1 : 0; // thin wandering lines (crackle, caustics)
      else if (L.t === 'speckle') t = r() < (L.density ?? .08) ? 1 : 0;
      else t = r(); // grain
      const k = i * 4, alpha = L.t === 'speckle' || L.t === 'cells' ? t : 1;
      d[k] = A[0] + (Bc[0] - A[0]) * t; d[k + 1] = A[1] + (Bc[1] - A[1]) * t; d[k + 2] = A[2] + (Bc[2] - A[2]) * t; d[k + 3] = (L.t === 'grain' ? .35 : alpha) * 255;
    }
    x.putImageData(img, 0, 0);
  }
  matTiles.set(key, c); if (matTiles.size > 200) matTiles.delete(matTiles.keys().next().value);
  return c;
}
const patCache = new WeakMap(); // context -> (tile -> pattern): patterns are made once per canvas, not per frame
function tilePattern(x, tile) { let m = patCache.get(x); if (!m) patCache.set(x, m = new Map()); let p = m.get(tile); if (!p) { p = x.createPattern(tile, 'repeat'); m.set(tile, p); } return p; }
const matAnimated = mat => !!mat && mat.layers.some(L => (L.speed && (L.speed[0] || L.speed[1])) || L.wobble || (L.cycle && L.cycle.length > 1)) || !!(mat && mat.pulse);
function layerColor(L, t) { if (!L.cycle || L.cycle.length < 2) return L.c; const f = (t * (L.cspeed || .3)) % L.cycle.length, i = Math.floor(f); return lerpHex(L.cycle[i], L.cycle[(i + 1) % L.cycle.length], f - i); }
/* paint a material inside the current path of x. box = [x0, y0, x1, y1] of the shape (gradients span it), t = time */
function paintMaterial(x, mat, box, t = T) {
  if (!mat || !mat.layers) return;
  x.save(); x.clip();
  const [x0, y0, x1, y1] = box, bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0), base = x.globalAlpha * (mat.opacity ?? 1);
  for (const L of mat.layers) {
    if (L.off) continue;
    x.globalAlpha = base * (L.a ?? 1); x.globalCompositeOperation = L.blend || 'source-over';
    if (L.t === 'linear' || L.t === 'radial') {
      const stops = L.stops && L.stops.length ? L.stops : [[0, L.c || '#ffffff'], [1, L.c2 || '#000000']];
      let g;
      if (L.t === 'linear') { const a = (L.rot || 0) * Math.PI / 180 + (L.speed ? t * (L.speed[0] || 0) * .02 : 0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(bw, bh) / 2; g = x.createLinearGradient(cx - Math.cos(a) * R, cy - Math.sin(a) * R, cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
      else { const cx = x0 + bw * (.5 + (L.ox || 0) / 100), cy = y0 + bh * (.5 + (L.oy || 0) / 100); g = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(bw, bh) / 2 * (L.scale || 1)); }
      const sh = L.speed && L.t === 'radial' ? (t * (L.speed[0] || 0) * .05) % 1 : 0; // a radial gradient can pulse outward
      for (const [p, c] of stops) g.addColorStop(clamp((p + sh) % 1.0001, 0, 1), c);
      x.fillStyle = g; x.fillRect(x0 - 2, y0 - 2, bw + 4, bh + 4); continue;
    }
    if (!TILE_LAYERS.has(L.t)) continue;
    const cyc = L.cycle && L.cycle.length > 1 ? layerColor(L, t) : null;
    if (L.t === 'solid' || cyc && L.t === 'solid') { x.fillStyle = cyc || L.c || '#888'; x.fillRect(x0 - 2, y0 - 2, bw + 4, bh + 4); continue; }
    const pat = tilePattern(x, layerTile(L)), s = (L.scale || 1), wob = L.wobble ? Math.sin(t * (L.wspeed || 2.3)) * L.wobble : 0, wob2 = L.wobble ? Math.cos(t * (L.wspeed || 2.3) * .7 + 1) * L.wobble * .6 : 0;
    if (pat.setTransform) pat.setTransform(new DOMMatrix().translate((L.ox || 0) + (L.speed ? L.speed[0] * t : 0) + wob, (L.oy || 0) + (L.speed ? L.speed[1] * t : 0) + wob2).rotate(L.rot || 0).scale(s, s));
    x.fillStyle = pat; x.fillRect(x0 - 2, y0 - 2, bw + 4, bh + 4);
    if (cyc) { x.globalCompositeOperation = 'source-atop'; x.globalAlpha = base * .5; x.fillStyle = cyc; x.fillRect(x0 - 2, y0 - 2, bw + 4, bh + 4); } // tint drifting through its colors
  }
  x.restore();
  if (mat.glow) { // emission: a soft halo around the shape, added on top
    x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = (mat.pulse ? .65 + .35 * Math.sin(t * mat.pulse) : 1) * .5; x.shadowBlur = mat.glow; x.shadowColor = mat.glowColor || '#ffffff'; x.strokeStyle = mat.glowColor || '#ffffff'; x.lineWidth = 1.5; x.stroke(); x.restore();
  }
}
/* simple flat style for strokes (a material's first layer as a pattern or color) */
function matStroke(x, mat) { const L = mat && mat.layers && mat.layers.find(l => !l.off); if (!L) return '#888'; if (TILE_LAYERS.has(L.t) && L.t !== 'solid') return tilePattern(x, layerTile(L)); return L.c || (L.stops && L.stops[0][1]) || '#888'; }
/* ---- premade materials and effects: every one is just a layer stack, so all of it can be edited ---- */
const MAT_PRESETS = {
  water: { name: 'Water', glow: 0, layers: [{ t: 'solid', c: '#2f7fb8' }, { t: 'noise', c: '#2a6ea3', c2: '#5fb2e6', nscale: 3, oct: 3, a: .7, speed: [6, 3] }, { t: 'cells', c: '#e8f6ff', nscale: 4, oct: 2, a: .35, speed: [-4, 5], wobble: 2 }] },
  neon: { name: 'Neon', glow: 14, glowColor: '#ff3fd2', pulse: 2.2, layers: [{ t: 'solid', c: '#ff3fd2', cycle: ['#ff3fd2', '#3fe0ff', '#b6ff3f'], cspeed: .25 }, { t: 'linear', stops: [[0, 'rgba(255,255,255,.0)'], [.5, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']], rot: 90, a: .7 }] },
  emissive: { name: 'Emissive', glow: 18, glowColor: '#ffcf6a', layers: [{ t: 'radial', stops: [[0, '#fff6d8'], [.6, '#ffcf6a'], [1, '#d88a20']] }] },
  hologram: { name: 'Holographic', glow: 8, glowColor: '#7ff0ff', layers: [{ t: 'solid', c: '#3fb8ff', a: .45, cycle: ['#3fb8ff', '#b07bff', '#3fffd0'], cspeed: .4 }, { t: 'stripes', c: '#ffffff', c2: 'rgba(0,0,0,0)', density: 16, width: .2, a: .35, speed: [0, 22], rot: 90 }, { t: 'grain', c: '#ffffff', c2: '#7ff0ff', a: .3, speed: [40, 13] }] },
  heat: { name: 'Heat shimmer', layers: [{ t: 'noise', c: '#ffb070', c2: '#fff0c0', nscale: 5, oct: 2, a: .25, wobble: 3, wspeed: 9, speed: [0, -18], blend: 'screen' }] },
  noiseAnim: { name: 'Animated noise', layers: [{ t: 'noise', c: '#1d1d26', c2: '#5c5c78', nscale: 4, oct: 4, speed: [14, 9] }] },
  flow: { name: 'Flowing texture', layers: [{ t: 'solid', c: '#5a3a1e' }, { t: 'waves', c: '#7a5230', c2: '#c9965a', density: 4, nscale: 3, oct: 3, a: .9, speed: [24, 0] }] },
  bloodWet: { name: 'Blood-wet surface', layers: [{ t: 'solid', c: '#6e0808' }, { t: 'noise', c: '#4a0404', c2: '#9a1010', nscale: 4, oct: 3, a: .8 }, { t: 'linear', stops: [[0, 'rgba(255,255,255,0)'], [.45, 'rgba(255,210,210,.0)'], [.5, 'rgba(255,220,220,.35)'], [.55, 'rgba(255,210,210,0)'], [1, 'rgba(255,255,255,0)']], rot: 35, speed: [8, 0], a: .8 }] },
  snow: { name: 'Snow', layers: [{ t: 'solid', c: '#e9eef5' }, { t: 'noise', c: '#d6dee9', c2: '#ffffff', nscale: 3, oct: 4, a: .9 }, { t: 'speckle', c: '#ffffff', density: .05, a: .8 }] },
  glass: { name: 'Glass', opacity: .55, layers: [{ t: 'solid', c: '#a9d4e6', a: .55 }, { t: 'linear', stops: [[0, 'rgba(255,255,255,0)'], [.38, 'rgba(255,255,255,.0)'], [.42, 'rgba(255,255,255,.55)'], [.5, 'rgba(255,255,255,.1)'], [.56, 'rgba(255,255,255,.35)'], [.6, 'rgba(255,255,255,0)']], rot: 30 }] },
  shine: { name: 'Reflective highlight', layers: [{ t: 'solid', c: '#7a828c' }, { t: 'linear', stops: [[0, 'rgba(255,255,255,0)'], [.48, 'rgba(255,255,255,0)'], [.5, 'rgba(255,255,255,.6)'], [.52, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']], rot: 45, speed: [3, 0] }] },
  scroll: { name: 'Scrolling texture', layers: [{ t: 'checker', c: '#d9d4c8', c2: '#3a3532', density: 3, speed: [30, 0] }] },
  lava: { name: 'Lava', glow: 12, glowColor: '#ff5a1f', layers: [{ t: 'solid', c: '#3a0a02' }, { t: 'noise', c: '#ff3d00', c2: '#ffd36a', nscale: 3, oct: 3, a: .9, speed: [5, 3], wobble: 1.5 }, { t: 'cells', c: '#1a0400', nscale: 4, oct: 2, a: .8, speed: [5, 3] }] },
  grass: { name: 'Grass', layers: [{ t: 'solid', c: '#7fae3c' }, { t: 'noise', c: '#6c9a33', c2: '#9ccb52', nscale: 6, oct: 4, a: .9 }, { t: 'speckle', c: '#b6dc6a', density: .04, a: .7 }] },
  concrete: { name: 'Concrete', layers: [{ t: 'solid', c: '#9a978f' }, { t: 'noise', c: '#8a877f', c2: '#aeaba3', nscale: 8, oct: 4, a: .7 }, { t: 'grain', c: '#000000', c2: '#ffffff', a: .25 }] },
  carpet: { name: 'Carpet', layers: [{ t: 'solid', c: '#5f7fa8' }, { t: 'grain', c: '#40587a', c2: '#7a98c0', a: .9 }] },
  metal: { name: 'Brushed metal', layers: [{ t: 'solid', c: '#6a717c' }, { t: 'stripes', c: '#7c838e', c2: '#5c636e', density: 40, width: .5, a: .5, rot: 0 }, { t: 'linear', stops: [[0, 'rgba(255,255,255,.0)'], [.5, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']], rot: 20 }] },
};
for (const k in MAT_PRESETS) MAT_PRESETS[k].v = 1;
/* every material the game knows: the presets plus the ones you saved (and the ones a custom map carries with it) */
let userMatCache = null; // read once, kept until a material is saved (getMaterial runs while drawing)
function userMaterials() { if (!userMatCache) { try { userMatCache = JSON.parse(localStorage.getItem('snakeCarnageMaterials')) || {}; } catch (e) { userMatCache = {}; } } return userMatCache; }
function saveUserMaterial(id, mat) { const all = { ...userMaterials() }; if (mat) all[id] = mat; else delete all[id]; userMatCache = all; try { localStorage.setItem('snakeCarnageMaterials', JSON.stringify(all)); } catch (e) {} }
let mapMaterials = {}; // the ones the current custom map carries
function getMaterial(ref) { if (!ref) return null; if (typeof ref === 'object') return ref; return mapMaterials[ref] || userMaterials()[ref] || MAT_PRESETS[ref] || null; }

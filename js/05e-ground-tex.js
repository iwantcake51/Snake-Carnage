/* =========================================================
   GROUND TEXTURES: photo textures of the ground, from the texture packs in texture-packs/ (Screaming Brain Studios' Tiny
   Texture Packs, CC0), copied to textures/ground/ as small JPEGs. A floor never shows one tile repeating: groundTex lays
   a set's first texture over the whole floor, then each of the others in large soft patches (a low-resolution noise mask,
   stretched, so their edges are soft), every layer at its own random angle and offset so the tile grid never lines up,
   with a faint light and shade over the lot. Each world build rolls its own, so no two runs' fields look the same.
   Until the images are in, and always on file:// (an image from disk would taint the floor, which the game reads back),
   the map paints its own procedural ground instead.
   ========================================================= */
const GTEX = { img: {}, ok: false, drawn: new WeakSet(), sets: { // drawn: the floor being built right now already has it (so a wide map's strips and middle lay it once)
  meadow: ['grass_16', 'grass_17', 'grass_09', 'grass_08'], // Open Field: fresh green, a second fresh green, a drier yellow-green, a deep lush green
  wild: ['grass_09', 'grass_16', 'grass_21', 'grass_10'], // Meadow: long, drier grass, fresh green in the hollows, olive tussocks
  lawn: ['grass_17', 'grass_16', 'grass_06'], // Park: a kept lawn, darker where the mower missed
  pasture: ['grass_09', 'grass_05', 'grass_16'], // Farm: grazed pasture, olive where the cows have been
  dirt: ['dirt_trail', 'dirt_sand', 'dirt_dark'], // trails and yard roads: packed tan, sandier and darker patches
  soil: ['soil', 'dirt_dark'], mud: ['mud', 'soil'], // ploughed earth; the pig pen
  mars: ['mars_rock', 'mars_dust', 'mars_stone'], // rust-red rock and dust, darker stony ground
  moon: ['moon_regolith', 'moon_dust', 'moon_rock'], // grey regolith, paler dust, darker rubble
  road: ['road_a', 'road_b', 'asphalt'], // Town's streets: worn road, patches with tyre streaks along the street, a little cracked asphalt
  lot: ['asphalt', 'road_a'], // parking lots and yards: cracked asphalt, smoother patches
  walk: ['concrete'], // sidewalks, the forecourt, driveway aprons (ambientCG, CC0)
}, cover: { meadow: [.42, .36, .15], wild: [.42, .25, .3], lawn: [.4, .14], pasture: [.22, .3], dirt: [.34, .22], soil: [.3], mud: [.35], mars: [.42, .3], moon: [.4, .28], road: [.42, .14], lot: [.3] }, // how much of the floor each further texture covers
  scale: { road: .6, lot: .6, walk: .5 }, // the ambientCG ones are finer (256 px): laid smaller so their grain is street-sized
  ox: 0 }; // while a wide map's middle is drawn in its own coordinates, how far it's shifted (so its textures line up with the strips')
if (location.protocol !== 'file:') {
  const names = [...new Set(Object.values(GTEX.sets).flat())]; let left = names.length;
  for (const n of names) { const im = new Image(); im.onload = () => { GTEX.img[n] = im; if (--left === 0) groundTexReady(); }; im.onerror = () => --left; im.src = `textures/ground/${n}.jpg?v=` + GAME_VERSION; }
}
function groundTexReady() { // every image is in: menu pictures already drawn with the stand-in ground are drawn again
  GTEX.ok = true;
  if (typeof thumbCache === 'undefined') return;
  for (const m of MAPS) { thumbCache.delete(thumbKey(m)); artCache.delete(thumbKey(m)); } // (trails and yards are on most outdoor maps)
  if (state === 'menu' && MAPS[mapIdx]) menuBackdrop(mapIdx);
  if (!thumbs) return; let i = 0; // the map browser's pictures, redrawn one at a time in the background (never emptied: the browser reads them at any moment)
  const step = () => { if (!thumbs || i >= Math.min(MAPS.length, thumbs.length)) return; const m = MAPS[i], key = thumbKey(m);
    if (!thumbCache.has(key)) thumbCache.set(key, mapThumb(m)); thumbs[i] = thumbCache.get(key);
    const img = document.querySelector(`.mbr-t[data-map="${i}"] img`); if (img) img.src = thumbs[i];
    i++; setTimeout(step, 40); };
  setTimeout(step, 40);
}
function gtexPat(x, name, r, sc, ang) { // a pattern of one texture at a random angle and offset (and size sc); ang: only that way or its reverse (streaks along a street)
  const p = x.createPattern(GTEX.img[name], 'repeat'), a = ang != null ? ang + (r() < .5 ? 0 : Math.PI) : r() * Math.PI * 2, c = Math.cos(a) * sc, s = Math.sin(a) * sc;
  p.setTransform({ a: c, b: s, c: -s, d: c, e: r() * 128, f: r() * 128 }); return p;
}
function gtexMask(r, cover, soft, scale) { // a small canvas of noise, transparent where the layer shouldn't show: stretched over the floor, its edges come out soft
  const mw = Math.ceil(W / 16), mh = Math.ceil(H / 16), c = document.createElement('canvas'); c.width = mw; c.height = mh;
  const g = c.getContext('2d'), im = g.createImageData(mw, mh), d = im.data, ox = r() * 500, oy = r() * 500, t = .32 - cover * .64;
  for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) { const k = (j * mw + i) * 4, v = fbm(ox + i * 16 / scale, oy + j * 16 / scale, 3); d[k] = d[k + 1] = d[k + 2] = 0; d[k + 3] = 255 * sstep(t - soft, t + soft, v); }
  g.putImageData(im, 0, 0); return c;
}
function groundTex(x, set, seed, sc = GTEX.scale[set] || 1, ang) { // fills the floor with a blend of a set's textures; false (nothing drawn) until they're in
  const names = GTEX.sets[set]; if (!GTEX.ok || !names || !names.every(n => GTEX.img[n])) return false;
  const r = seeded(seed), L = document.createElement('canvas'); L.width = W; L.height = H; const lx = L.getContext('2d');
  x.save(); x.fillStyle = gtexPat(x, names[0], r, sc, ang); x.fillRect(0, 0, W, H);
  names.slice(1).forEach((n, k) => { // each other texture in its own patches: drawn whole, then cut to the mask
    lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, W, H); lx.fillStyle = gtexPat(lx, n, r, sc, ang); lx.fillRect(0, 0, W, H);
    const m = gtexMask(r, (GTEX.cover[set] || [])[k] ?? .25, .12, 150 + 90 * r()); lx.globalCompositeOperation = 'destination-in'; lx.imageSmoothingQuality = 'high'; lx.drawImage(m, 0, 0, W, H); freeCanvas(m);
    x.drawImage(L, 0, 0);
  });
  freeCanvas(L);
  const sh = gtexMask(r, .45, .35, 260); x.globalAlpha = .1; x.imageSmoothingQuality = 'high'; x.drawImage(sh, 0, 0, W, H); freeCanvas(sh); // a faint, broad light and shade, like the ground rolling a little
  x.restore(); GTEX.drawn.add(x); queueMicrotask(() => GTEX.drawn.delete(x)); return true; // (marked only while this floor is being built)
}
function mapGround(x, set, extra, seed) { // a map's whole floor in a set, across the whole width (a wide map's strips and middle are one ground); false until the textures are in
  if (GTEX.drawn.has(x)) return true;
  if (!groundTex(x, set, seed ?? (1 + Math.random() * 1e6 | 0))) return false; // blended at random: new ground every run (seed: the same every time, for custom maps and the editor)
  if (extra) extra(x); return true;
}
GTEX.tmp = new Map();
function texSet(x, set, seed, ang) { // a set's whole ground for the floor being built right now: made once, shared by every shape on that floor (gone after this moment)
  let m = GTEX.tmp.get(x); if (!m) { m = new Map(); GTEX.tmp.set(x, m); queueMicrotask(() => { for (const c of m.values()) if (c) freeCanvas(c); GTEX.tmp.delete(x); }); }
  const ox = GTEX.ox, w0 = W, k = set + ':' + (seed ?? '') + ':' + (ang ?? ''); if (m.has(k)) return m.get(k);
  W = w0 + 2 * ox; // always the whole floor's width, so a wide map's middle and its strips share one ground
  try { const c = document.createElement('canvas'); c.width = W; c.height = H;
    if (!groundTex(c.getContext('2d'), set, seed ?? (1 + Math.random() * 1e6 | 0), undefined, ang)) { freeCanvas(c); m.set(k, null); return null; }
    m.set(k, c); return c; } finally { W = w0; }
}
function texShape(x, set, mask, seed, ang) { // a set's ground only inside a shape: mask(ctx) fills the shape in any color; false until the textures are in (ang: see gtexPat)
  if (!GTEX.ok) return false; const src = texSet(x, set, seed, ang); if (!src) return false;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(src, -GTEX.ox, 0);
  const m = document.createElement('canvas'); m.width = W; m.height = H; const mg = m.getContext('2d'); mg.fillStyle = '#000'; mg.strokeStyle = '#000'; mask(mg); // the whole shape first (every stroke and fill of it), then one cut
  g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0);
  x.drawImage(c, 0, 0, W, H); freeCanvas(c, m); return true;
}
const STYLE_GTEX = { grass: 'lawn', dirt: 'dirt', mud: 'mud', red: 'mars', moon: 'moon', asphalt: 'lot' }; // the editor's floor styles that have a real texture

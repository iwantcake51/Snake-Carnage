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
  meadow: ['grass_16', 'grass_17', 'grass_09', 'grass_08'], // fresh green, a second fresh green, a drier yellow-green, a deep lush green
} };
if (location.protocol !== 'file:') {
  const names = [...new Set(Object.values(GTEX.sets).flat())]; let left = names.length;
  for (const n of names) { const im = new Image(); im.onload = () => { GTEX.img[n] = im; if (--left === 0) groundTexReady(); }; im.onerror = () => --left; im.src = `textures/ground/${n}.jpg?v=` + GAME_VERSION; }
}
function groundTexReady() { // every image is in: menu pictures already drawn with the stand-in ground are drawn again
  GTEX.ok = true;
  if (typeof thumbCache === 'undefined') return;
  for (const m of MAPS) if (m.groundTex) { thumbCache.delete(thumbKey(m)); artCache.delete(thumbKey(m)); }
  thumbs = null;
  if (state === 'menu' && MAPS[mapIdx] && MAPS[mapIdx].groundTex) menuBackdrop(mapIdx);
}
function gtexPat(x, name, r, sc) { // a pattern of one texture at a random angle and offset (and size sc)
  const p = x.createPattern(GTEX.img[name], 'repeat'), a = r() * Math.PI * 2, c = Math.cos(a) * sc, s = Math.sin(a) * sc;
  p.setTransform({ a: c, b: s, c: -s, d: c, e: r() * 128, f: r() * 128 }); return p;
}
function gtexMask(r, cover, soft, scale) { // a small canvas of noise, transparent where the layer shouldn't show: stretched over the floor, its edges come out soft
  const mw = Math.ceil(W / 16), mh = Math.ceil(H / 16), c = document.createElement('canvas'); c.width = mw; c.height = mh;
  const g = c.getContext('2d'), im = g.createImageData(mw, mh), d = im.data, ox = r() * 500, oy = r() * 500, t = .32 - cover * .64;
  for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) { const k = (j * mw + i) * 4, v = fbm(ox + i * 16 / scale, oy + j * 16 / scale, 3); d[k] = d[k + 1] = d[k + 2] = 0; d[k + 3] = 255 * sstep(t - soft, t + soft, v); }
  g.putImageData(im, 0, 0); return c;
}
function groundTex(x, set, seed, sc = 1) { // fills the floor with a blend of a set's textures; false (nothing drawn) until they're in
  const names = GTEX.sets[set]; if (!GTEX.ok || !names || !names.every(n => GTEX.img[n])) return false;
  const r = seeded(seed), L = document.createElement('canvas'); L.width = W; L.height = H; const lx = L.getContext('2d');
  x.save(); x.fillStyle = gtexPat(x, names[0], r, sc); x.fillRect(0, 0, W, H);
  names.slice(1).forEach((n, k) => { // each other texture in its own patches: drawn whole, then cut to the mask
    lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, W, H); lx.fillStyle = gtexPat(lx, n, r, sc); lx.fillRect(0, 0, W, H);
    const m = gtexMask(r, [.42, .36, .15][k] ?? .25, .12, 150 + 90 * r()); lx.globalCompositeOperation = 'destination-in'; lx.imageSmoothingQuality = 'high'; lx.drawImage(m, 0, 0, W, H); freeCanvas(m);
    x.drawImage(L, 0, 0);
  });
  freeCanvas(L);
  const sh = gtexMask(r, .45, .35, 260); x.globalAlpha = .1; x.imageSmoothingQuality = 'high'; x.drawImage(sh, 0, 0, W, H); freeCanvas(sh); // a faint, broad light and shade, like the ground rolling a little
  x.restore(); GTEX.drawn.add(x); queueMicrotask(() => GTEX.drawn.delete(x)); return true; // (marked only while this floor is being built)
}

/* =========================================================
   YOUR ART: edited pictures that take over from the game's own drawing (the other half of Export art, 40h-asset-export).
   Every file keeps the path Export art gave it under editable/ (hats/top-hat.png, props/bench.png, people/human/body-1.png),
   and each kind of picture has a fixed frame (ART_FRAME), so the game knows where it goes whatever size it was saved at.
   Pictures come from the repo's art/ folder (listed in art/manifest.json, which tools/art-apply.mjs writes; the live
   build inlines it as ART_MANIFEST) and from art loaded in this browser to try out (Settings › Display › Your art: kept in
   IndexedDB, on top of the repo's). Anything without a picture is drawn by the game as always. The drawing code asks
   artImg(key) (the path without its extension) wherever a thing is drawn: hats, eyes, trail particles, props and trees,
   skins, people's and animals' parts, blood and meat, ground photos, Kenney sprites. All of it is loaded before the first
   menu (41-boot waits on ART_READY, a few seconds at most).
   ========================================================= */
const ARTO = { map: new Map(), repo: 0, local: 0, bodies: new Map(), skins: new Map(), tiles: new Map() };
const ART_FRAME = { // the world units each kind of picture covers (its middle is the thing's own center unless said otherwise)
  hat: 64, eyes: 24, trail: 16, arm: 12, foot: 10, leg: [10, 5], tail: [24, 12], body: r => r * 4, propMargin: 1 / 3, treeMargin: .5, // props: the box fills the middle 60%, a third of its size spare on every side; trees and bushes the middle half (their crowns spread past their trunks)
};
const artName = s => String(s).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unnamed';
const artImg = key => ARTO.map.get(key);
const ART_FLAG_SKIP = new Set(['noCollide', 'noOutline', 'noShadow', 'solid', 'fromShape', 'dyn', 'fixed', 'lit', 'on']);
function artPropKey(o) { // a kind and its look: kind, detail, roof and whatever flags it's drawn with (a pine is its own)
  if (o.kind === 'tree' && typeof treeInfo === 'function' && treeInfo(o).pine) return 'pine';
  const flags = Object.keys(o).filter(k => o[k] === true && !ART_FLAG_SKIP.has(k)).sort();
  return artName([o.kind, o.d, o.roof, ...flags].filter(Boolean).join('-'));
}
const ART_PK = new WeakMap(), artProp = o => { if (!ARTO.map.size) return; let k = ART_PK.get(o); if (!k) ART_PK.set(o, k = artPropKey(o)); return artImg('props/' + k); }; // (the key kept off the object: maps are saved from their objects)
function artCreature(c) { // the pictures for this person or animal, if there are any: the body's look picked by the creature's own seed
  if (!ARTO.map.size) return null; if (c._art !== undefined) return c._art;
  const base = (c.def.human ? 'people/' : 'animals/') + c.type + '/', bodies = ARTO.bodies.get(base);
  const A = { body: bodies && bodies[Math.floor((c.seed ?? .5) * bodies.length) % bodies.length], arm: artImg(base + 'arm'), foot: artImg(base + 'foot'), leg: artImg(base + 'leg'), tail: artImg(base + 'tail') };
  return c._art = A.body || A.arm || A.foot || A.leg ? A : null; // (any part on its own works: the rest is drawn as always; an animal's feet and tail only go with its body)
}
function artSkin(name) { // a skin's texture strip, painted over: laid on a canvas the size the game's own texture is (or a multiple, if it was saved bigger)
  if (!ARTO.map.size) return null; let c = ARTO.skins.get(name); if (c !== undefined) return c;
  const im = artImg('skins/' + artName(name)); if (!im) { ARTO.skins.set(name, null); return null; }
  const res = Math.max(1, Math.min(4, Math.round(im.width / TEX.w))); c = document.createElement('canvas'); c.width = TEX.w * res; c.height = TEX.h * res; c.res = res;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, c.width, c.height); ARTO.skins.set(name, c); return c;
}
function artTile(kind, col, N) { // a blood or meat tile, painted over: resampled to the tile's own size so its scale on the ground stays the same
  if (!ARTO.map.size) return null; const key = kind + col; let c = ARTO.tiles.get(key); if (c !== undefined) return c;
  const im = artImg(`textures/${kind}-${col.slice(1).toLowerCase()}`); if (!im) { ARTO.tiles.set(key, null); return null; }
  c = document.createElement('canvas'); c.width = c.height = N; c.getContext('2d').drawImage(im, 0, 0, N, N); ARTO.tiles.set(key, c); return c;
}
/* ---- where they come from ---- */
function artDb() { return new Promise((res, rej) => { const r = indexedDB.open('snakeArt', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function artLocalAll() { // [[path, Blob]] loaded in this browser
  const db = await artDb(); return new Promise((res, rej) => { const out = [], rq = db.transaction('files').objectStore('files').openCursor();
    rq.onsuccess = () => { const c = rq.result; if (c) { out.push([c.key, c.value]); c.continue(); } else res(out); }; rq.onerror = () => rej(rq.error); });
}
async function artLocalSave(files) { // what this browser has, replaced: [[path, Blob]]
  const db = await artDb(); return new Promise((res, rej) => { const t = db.transaction('files', 'readwrite'), st = t.objectStore('files'); st.clear(); for (const [p, b] of files) st.put(b, p); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
}
const artKey = p => p.replace(/^.*?editable\//, '').replace(/\.(png|jpe?g|webp)$/i, '').toLowerCase(); // a file's path, wherever it sat in the zip, as the key the game asks for
const artLoadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im.width ? im : null); im.onerror = () => res(null); im.src = src; });
function artIndex() { // the bodies of each kind of creature, in order (body, body-1, body-2...)
  ARTO.bodies.clear();
  for (const k of ARTO.map.keys()) { const m = k.match(/^((?:people|animals)\/[a-z0-9-]+\/)body(?:-(\d+))?$/); if (!m) continue; const l = ARTO.bodies.get(m[1]) || []; l.push([+(m[2] || 0), ARTO.map.get(k)]); ARTO.bodies.set(m[1], l); }
  for (const [b, l] of ARTO.bodies) ARTO.bodies.set(b, l.sort((p, q) => p[0] - q[0]).map(e => e[1]));
}
const ART_READY = (async () => {
  try {
    const list = typeof ART_MANIFEST !== 'undefined' ? ART_MANIFEST : location.protocol === 'file:' ? [] : await fetch('art/manifest.json?v=' + GAME_VERSION).then(r => r.ok ? r.json() : []).catch(() => []);
    for (const [p, im] of await Promise.all((list || []).map(async p => [p, await artLoadImg('art/' + p + '?v=' + GAME_VERSION)]))) if (im) { ARTO.map.set(artKey(p), im); ARTO.repo++; }
    let local = []; try { local = await artLocalAll(); } catch (e) {} // (private windows and file:// have no IndexedDB: only the repo's art)
    for (const [p, b] of local) { const im = await artLoadImg(URL.createObjectURL(b)); if (im) { ARTO.map.set(artKey(p), im); ARTO.local++; } }
    artIndex();
  } catch (e) { console.warn('art:', e); }
})();
const artReadyBy = ms => Promise.race([ART_READY, new Promise(r => setTimeout(r, ms))]);

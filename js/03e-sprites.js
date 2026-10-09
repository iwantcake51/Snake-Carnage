/* =========================================================
   KENNEY SPRITES (kenney.nl, CC0): one atlas, sprites/kenney.png, packed by tools/kenney-atlas.py from the packs in kenney/.
   They're white and grey shapes, tinted here and cached, so one smoke texture serves every dust color. Everything drawn
   with them keeps its own procedural look until the atlas has loaded, and for good when the game is opened straight from
   disk (a file:// image would taint the floor canvases, which the game reads back).
   ========================================================= */
const KSPR_NAMES = [ // the atlas order: keep in step with NAMES in tools/kenney-atlas.py
  'smoke_04', 'smoke_05', 'smoke_07', 'smoke_08', 'fire_01', 'fire_02', 'flame_01', 'flame_02', 'flame_03', 'flame_04',
  'scorch_01', 'scorch_02', 'scorch_03', 'dirt_01', 'dirt_02', 'dirt_03', 'muzzle_01', 'muzzle_02', 'muzzle_03', 'star_06', 'star_08', 'flare_01', 'circle_05',
  'leaf_1', 'leaf_2', 'leaf_3', 'leaf_4', 'leaf_5', 'leaf_6', 'leaf_7', 'leaf_8', 'leaf_9', // foliage sprite_0081-0089: leaves, long to maple
  'plant_1', 'plant_2', 'plant_3', 'plant_4', 'petals_1', 'petals_2', // sprite_0096-0101: low plants seen from above, scattered petals
  'cone_e_noise', 'circle_a_noise', 'window_e_noise', 'caustics_1', 'caustics_2' // Light Masks: a flashlight cone, a lamp's pool, window panes, water caustics (seamless)
];
const KSPR_CELL = 128, KSPR_COLS = 8, KSPR_IX = Object.fromEntries(KSPR_NAMES.map((n, i) => [n, i]));
const KSPR = { img: null, ok: false, tints: new Map(), masks: new Map(), ready: [] }; // ready: what to redo once the atlas is in
const K_SMOKE = ['smoke_04', 'smoke_05', 'smoke_07', 'smoke_08'], K_LEAF = KSPR_NAMES.filter(n => n.startsWith('leaf_')), K_PLANT = ['plant_1', 'plant_2', 'plant_3']; // plant_4 reads as frost: it's in the atlas, never scattered
if (location.protocol !== 'file:') { const im = new Image(); im.onload = () => { KSPR.img = im; KSPR.ok = true; for (const f of KSPR.ready) try { f(); } catch (e) { console.warn(e); } }; im.src = 'sprites/kenney.png?v=' + GAME_VERSION; }
const kReady = f => KSPR.ok ? f() : KSPR.ready.push(f);
function kMask(name, size, dense) { // the sprite alone at this size (drawn `dense` times over itself, to thicken a faint one)
  const key = name + '|' + size + '|' + dense; let c = KSPR.masks.get(key); if (c) return c;
  const i = KSPR_IX[name]; if (i === undefined) return null;
  c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), sx = i % KSPR_COLS * KSPR_CELL, sy = (i / KSPR_COLS | 0) * KSPR_CELL;
  for (let k = 0; k < dense; k++) x.drawImage(KSPR.img, sx, sy, KSPR_CELL, KSPR_CELL, 0, 0, size, size);
  KSPR.masks.set(key, c); return c;
}
// one sprite in a color (its greys darken it, its alpha stays), as a cached canvas `size` px across; null until the atlas is in
function kTint(name, col, size = KSPR_CELL, dense = 1) {
  if (!KSPR.ok) return null;
  const cs = Array.isArray(col) ? `rgb(${col.map(v => clamp(v | 0, 0, 255)).join(',')})` : col, key = name + '|' + cs + '|' + size + '|' + dense;
  let c = KSPR.tints.get(key); if (c) return c;
  const m = kMask(name, size, dense); if (!m) return null;
  if (KSPR.tints.size > 800) KSPR.tints.clear();
  c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  x.drawImage(m, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = cs; x.fillRect(0, 0, size, size);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(m, 0, 0);
  KSPR.tints.set(key, c); return c;
}
// a sprite's alpha laid over an existing mask canvas, in place: alpha becomes alpha x (lo + (1 - lo) x the sprite's), turned by rot (quarter turns)
function kModulate(c, name, lo, rot = 0) {
  const i = KSPR_IX[name], w = c.width, h = c.height; if (!KSPR.ok || i === undefined) return;
  const t = document.createElement('canvas'); t.width = w; t.height = h; const tx = t.getContext('2d'), q = rot & 1, sw = q ? h : w, sh = q ? w : h;
  tx.translate(w / 2, h / 2); tx.rotate(rot * Math.PI / 2); tx.drawImage(KSPR.img, i % KSPR_COLS * KSPR_CELL, (i / KSPR_COLS | 0) * KSPR_CELL, KSPR_CELL, KSPR_CELL, -sw / 2, -sh / 2, sw, sh);
  const a = tx.getImageData(0, 0, w, h).data, x = c.getContext('2d'), img = x.getImageData(0, 0, w, h), d = img.data; let mx = 1;
  for (let k = 3; k < a.length; k += 4) if (a[k] > mx) mx = a[k];
  for (let k = 3; k < d.length; k += 4) d[k] = d[k] * (lo + (1 - lo) * a[k] / mx);
  x.putImageData(img, 0, 0);
}
const KPAT = new Map();
function kPattern(x, name, col) { // a tinted sprite as a repeating pattern (the seamless ones: water caustics)
  const key = name + col; let p = KPAT.get(key); if (p) return p;
  const s = kTint(name, col); if (!s) return null; p = x.createPattern(s, 'repeat'); KPAT.set(key, p); return p;
}
// draw a tinted sprite centered on (cx, cy), w x h, turned by rot; false when it isn't loaded (draw your own instead)
function kDraw(x, name, col, cx, cy, w, h, rot, size, dense) {
  const s = kTint(name, col, size, dense); if (!s) return false;
  if (rot) { x.save(); x.translate(cx, cy); x.rotate(rot); x.drawImage(s, -w / 2, -h / 2, w, h); x.restore(); } else x.drawImage(s, cx - w / 2, cy - h / 2, w, h);
  return true;
}

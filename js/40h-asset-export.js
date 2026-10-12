/* =========================================================
   YOUR ART (Settings › Display): Export art, and try your edits. Export puts every piece of the game's art in one .zip:
   editable/ holds the pictures the game can take back (03h-art reads them), each in a fixed frame (ART_FRAME) so it knows
   where the picture goes: skins as flat strips, hats, eyes, trail particles, props and trees, people in parts (body in
   several looks, arm, leg, shoe) so they still walk and run, animals, blood and meat tiles, ground photos and Kenney
   sprites. reference/ holds pictures to look at (skins on a snake, whole people and animals, icons, map pictures). It
   exports what the game shows now, your own art included, drawn by the game's own code at ART.k pixels a unit.
   Try your edits loads a .zip (or a folder) of edited pictures into this browser (IndexedDB) and reloads; for everyone,
   the same files go in the repo's art/ folder (tools/art-apply.mjs). A README in the zip says all of it.
   ========================================================= */
const ART = { k: 4, busy: false, cats: null };
const ART_CATS = [ // [id, name, what it holds, ticked to begin with]
  ['skins', 'Skins', 'Every skin as a flat strip to paint, and on a snake to look at (real snakes too)', 1],
  ['hats', 'Hats', 'Every hat on its own, and on a snake to look at', 1],
  ['eyes', 'Eyes', 'Every eye style on its own, and on a snake to look at', 1],
  ['trails', 'Trails', 'Each trail\'s particle, and a spray of them to look at', 1],
  ['props', 'Props and trees', 'One of each kind and look on the maps, trees, pines and bushes included', 1],
  ['people', 'People', 'For each kind of person: the body in six looks, an arm, a leg and a shoe', 1],
  ['animals', 'Animals', 'Every animal, whole', 1],
  ['ground', 'Ground textures', 'The photo textures the floors are laid from', 1],
  ['tiles', 'Blood and meat', 'The seamless tiles blood pools and torn meat are filled with', 1],
  ['sprites', 'Kenney sprites', 'Every sprite the effects use, and the sheet they come on', 1],
  ['icons', 'Icons', 'Every skill, menu and HUD icon, as SVG, to look at', 1],
  ['maps', 'Map pictures', 'Each whole map, to look at. Large', 0],
];

/* ---- a .zip: stored when it's made here (PNG and JPEG are compressed already), stored or deflated when it's read ---- */
const ART_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const artCrc = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = ART_CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function artZip(files) { // [{ name, data: Uint8Array }] -> a Blob
  const enc = new TextEncoder(), parts = [], cen = [], d = new Date(); let off = 0;
  const tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const nm = enc.encode(f.name), crc = artCrc(f.data), n = f.data.length, h = new DataView(new ArrayBuffer(30)), c = new DataView(new ArrayBuffer(46));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, crc, true); h.setUint32(18, n, true); h.setUint32(22, n, true); h.setUint16(26, nm.length, true);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true); c.setUint32(16, crc, true); c.setUint32(20, n, true); c.setUint32(24, n, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    parts.push(h, nm, f.data); cen.push(c, nm); off += 30 + nm.length + n;
  }
  const size = cen.reduce((a, p) => a + p.byteLength, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, e], { type: 'application/zip' });
}
const artInflate = async raw => new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
async function artUnzip(buf) { // a .zip's files, [[path, Uint8Array]]: stored or deflated, as file managers and editors make them
  const u8 = new Uint8Array(buf), dv = new DataView(buf), dec = new TextDecoder(); let e = u8.length - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--; if (e < 0) throw new Error('that isn\'t a .zip');
  const out = []; let p = dv.getUint32(e + 16, true);
  for (let i = 0, n = dv.getUint16(e + 10, true); i < n && dv.getUint32(p, true) === 0x02014b50; i++) {
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), off = dv.getUint32(p + 42, true), name = dec.decode(u8.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
    if (name.endsWith('/') || (method !== 0 && method !== 8)) continue;
    const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true), raw = u8.subarray(start, start + size);
    out.push([name, method ? await artInflate(raw) : raw]);
  }
  return out;
}

/* ---- drawing one thing ---- */
function artCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return [c, c.getContext('2d')]; }
function artTrim(c, pad = 6) { // (reference pictures) cropped to what they cover, plus a little room
  const x = c.getContext('2d'), { width: w, height: h } = c, d = x.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let i = y * w * 4 + 3, xx = 0; xx < w; xx++, i += 4) if (d[i] > 2) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return c;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const [t, tx] = artCanvas(x1 - x0 + 1, y1 - y0 + 1); tx.drawImage(c, -x0, -y0); freeCanvas(c); return t;
}
function artStill(draw) { const keep = T; T = 1.3; try { draw(); } finally { T = keep; } } // a fixed moment, so animated art holds still
function artFrame(w, h, draw, key) { // (editable pictures) a fixed frame w x h units, its middle the thing's own center, never cropped: your picture of it if there is one, else the game's drawing
  const k = ART.k, [c, x] = artCanvas(w * k, h * k), im = key && artImg(key);
  if (im) x.drawImage(im, 0, 0, c.width, c.height); else { x.setTransform(k, 0, 0, k, w / 2 * k, h / 2 * k); artStill(() => draw(x)); }
  return c;
}
function artSnake(cfg, n, sp, room = 44) { // (reference) a straight snake heading right, as the shop draws them, only big
  const k = ART.k, len = (n - 1) * sp, [c, x] = artCanvas((len + room * 2) * k, room * 2 * k);
  x.setTransform(k, 0, 0, k, (len + room) * k, room * k);
  artStill(() => drawSnake(x, previewSnake(n, 0, 0, sp, 0), { ...cfg, trail: 'None' }));
  return artTrim(c);
}
const artLook = () => { const c = lookAfter('pattern'); delete c.real; delete c.realPrev; return { ...c, hat: 'None' }; }; // your own colors (not a real snake's you might be wearing)
function artRest(type, i) { const c = makeCreature(type, 0, 0, null); c.a = 0; c.phase = 0; c.moveAmt = 0; c.seed = (i + .5) / 6; return c; } // one of a kind standing still, facing right
function artCopy(im) { const [c, x] = artCanvas(im.naturalWidth || im.width, im.naturalHeight || im.height); x.drawImage(im, 0, 0); return c; }
const artBox = o => o.t === 'r' ? [o.w, o.h] : [o.r * 2, o.r * 2];
const ART_TREE = new Set(['tree', 'bush']);

/* ---- what goes in: each category yields [path, () => canvas | bytes | text] ---- */
const ART_MAKE = {
  *skins() {
    const look = artLook();
    for (const [name] of SHOP.pattern) {
      yield [`editable/skins/${artName(name)}.png`, () => artCopy(artSkin(name) || skinStrip(name, look))]; // (your own strip if you've painted one: re-exporting keeps it)
      yield [`reference/skins/${artName(name)}.png`, () => artSnake({ ...look, pattern: name }, 26, 6.6)];
    }
    for (const r of REAL_SNAKES) yield [`reference/real-snakes/${artName(r.name)}.png`, () => artSnake({ ...look, pattern: r.pattern, color: r.color, color2: r.color2 }, 26, 6.6)];
  },
  *hats() {
    for (const name of Object.keys(HATS)) {
      if (name === 'None') continue;
      yield [`editable/hats/${artName(name)}.png`, () => artFrame(ART_FRAME.hat, ART_FRAME.hat, x => drawHat(x, name))]; // seen from above, the head's center in the middle, pointing right
      yield [`reference/hats-on-a-snake/${artName(name)}.png`, () => artSnake({ ...artLook(), hat: name }, 6, 8)];
    }
  },
  *eyes() {
    for (const [name] of SHOP.eyes) {
      yield [`editable/eyes/${artName(name)}.png`, () => { const l = { ...artLook(), eyes: name }; return artFrame(ART_FRAME.eyes, ART_FRAME.eyes, x => drawEyes(x, l, l.color)); }];
      yield [`reference/eyes-on-a-snake/${artName(name)}.png`, () => artSnake({ ...artLook(), eyes: name }, 6, 8)];
    }
  },
  *trails() {
    for (const [name] of SHOP.trail) {
      if (name === 'None') continue;
      const one = (x, list) => { const keep = trail; trail = list; try { drawTrail(x); } finally { trail = keep; x.globalAlpha = 1; } };
      yield [`editable/trails/${artName(name)}.png`, () => artFrame(ART_FRAME.trail, ART_FRAME.trail, x => one(x, [{ x: 0, y: 0, t: 0, life: 1.1, rot: 0, type: name, c: '#ffd23f' }]))];
      yield [`reference/trails/${artName(name)}.png`, () => {
        const k = ART.k, [c, x] = artCanvas(130 * k, 70 * k), up = name === 'Embers' || name === 'Bubbles' || name === 'Hearts' ? -1 : name === 'Blood Drip' ? 1 : 0;
        x.setTransform(k, 0, 0, k, 115 * k, 35 * k);
        artStill(() => one(x, Array.from({ length: 22 }, (_, i) => ({ x: -3 - i * 4.4 + Math.sin(i * 2.1) * 2.5, y: Math.cos(i * 1.7) * 6 + up * i * .7, t: i * .045, life: 1.1, rot: i, type: name, c: ['#ff4f8b', '#ffd23f', '#3fd4ff', '#7dff6a', '#b07bff'][i % 5] }))));
        return artTrim(c);
      }];
    }
  },
  *props() {
    const seen = new Map();
    for (const m of MAPS) { let b; try { b = m.build(); } catch (e) { continue; } // every map's props: one of each kind and look
      for (const o of b.obs || []) { if (!o || !o.kind || o.kind === 'border' || o.kind === 'shape' || o.kind === 'water' || o.poly || o.shp) continue; const key = artPropKey(o); if (!seen.has(key)) seen.set(key, o); } }
    for (const [key, o0] of [...seen].sort((a, b) => a[0] < b[0] ? -1 : 1)) yield [`editable/props/${key}.png`, () => {
      const o = JSON.parse(JSON.stringify(o0)), [bw, bh] = artBox(o), tree = ART_TREE.has(o.kind), m = tree ? ART_FRAME.treeMargin : ART_FRAME.propMargin, w = bw * (1 + 2 * m), h = bh * (1 + 2 * m); delete o.rot;
      if (o.t === 'r') { o.x = -bw / 2; o.y = -bh / 2; } else o.x = o.y = 0; // its box in the frame's middle
      return artFrame(w, h, x => { if (tree && treeStill(x, o)) return; drawObstacle(x, o); });
    }];
  },
  *people() {
    for (const type of Object.keys(TYPES)) {
      if (!TYPES[type].human) continue; const base = `people/${type}/`, S = ART_FRAME.body(TYPES[type].r);
      for (let i = 0; i < 6; i++) yield [`editable/${base}body-${i + 1}.png`, () => { const c = artRest(type, i), [a1, b1] = armPos(c); return artFrame(S, S, x => humanTorso(x, c, a1, b1), base + 'body-' + (i + 1)); }]; // the torso and head: everything above the legs, without the arms
      const c0 = () => artRest(type, 0);
      yield [`editable/${base}arm.png`, () => { const c = c0(), [, b1] = armPos(c); return artFrame(ART_FRAME.arm, ART_FRAME.arm, x => { x.translate(0, -b1); humanArm(x, c.look, 0, b1); }, base + 'arm'); }]; // the left arm, its hand in the middle (the right one is this, mirrored)
      yield [`editable/${base}leg.png`, () => { const L = c0().look, [w, h] = ART_FRAME.leg, [cv, x] = artCanvas(w * ART.k, h * ART.k), im = artImg(base + 'leg'); if (im) { x.drawImage(im, 0, 0, cv.width, cv.height); return cv; }
        x.setTransform(ART.k, 0, 0, ART.k, 0, h / 2 * ART.k); x.strokeStyle = L.pants; x.lineWidth = 3.6; x.lineCap = 'round'; x.beginPath(); x.moveTo(1.9, 0); x.lineTo(w - 1.9, 0); x.stroke(); return cv; }]; // hip at the left edge, the foot end at the right: stretched from one to the other as they walk
      yield [`editable/${base}foot.png`, () => { const L = c0().look; return artFrame(ART_FRAME.foot, ART_FRAME.foot, x => { x.fillStyle = L.shoes; ell(x, 0, 0, 2.5, 1.7); }, base + 'foot'); }];
      for (let i = 0; i < 6; i++) yield [`reference/people/${type}-${i + 1}.png`, () => { const k = ART.k, [c, x] = artCanvas(S * k, S * k), cr = artRest(type, i); cr.phase = 1.2; cr.moveAmt = .6; cr.a = -Math.PI / 2; x.setTransform(k, 0, 0, k, S / 2 * k, S / 2 * k); const keep = T; T = 0; try { drawCreature(x, cr, true); } finally { T = keep; } return artTrim(c); }];
    }
  },
  *animals() {
    for (const type of Object.keys(TYPES)) {
      if (TYPES[type].human) continue; const base = `animals/${type}/`, S = ART_FRAME.body(TYPES[type].r);
      yield [`editable/${base}body.png`, () => { const c = artRest(type, 0); return artFrame(S, S, x => { const keep = T; T = 0; try { drawAnimal(x, c); } finally { T = keep; } }, base + 'body'); }]; // the whole animal, facing right
      for (const part of ['tail', 'foot']) if (artImg(base + part)) yield [`editable/${base}${part}.png`, () => artCopy(artImg(base + part))]; // (ones you've added)
    }
  },
  *ground() {
    for (const n of [...new Set([...Object.values(GTEX.sets).flat(), 'snow_detail'])]) yield [`editable/textures/ground/${n}.jpg`, async () => {
      const im = artImg('textures/ground/' + n); if (!im) return artFetch(`textures/ground/${n}.jpg`); // the photo as it is; yours re-encoded
      const c = artCopy(im), b = await new Promise(r => c.toBlob(r, 'image/jpeg', .92)); return new Uint8Array(await b.arrayBuffer());
    }];
  },
  *tiles() {
    const blood = [...new Set([BLOOD, ...CONFIG.bloodColors, ...GOLD_BLOOD.slice(0, 1), ...ALIEN_BLOOD.slice(0, 1)].map(c => c.toLowerCase()))];
    for (const col of blood) yield [`editable/textures/blood-${col.slice(1)}.png`, () => artCopy(bloodTile(col))];
    for (const col of blood) yield [`editable/textures/meat-${col.slice(1)}.png`, () => artCopy(fleshTile(col))];
  },
  *sprites() {
    if (!KSPR.ok) return;
    yield ['reference/sprites/kenney-sheet.png', () => artFetch('sprites/kenney.png')];
    for (let i = 0; i < KSPR_NAMES.length; i++) yield [`editable/sprites/${artName(KSPR_NAMES[i])}.png`, () => { const ov = artImg('sprites/' + artName(KSPR_NAMES[i])); if (ov) return artCopy(ov); const [c, x] = artCanvas(KSPR_CELL, KSPR_CELL); x.drawImage(KSPR.img, i % KSPR_COLS * KSPR_CELL, (i / KSPR_COLS | 0) * KSPR_CELL, KSPR_CELL, KSPR_CELL, 0, 0, KSPR_CELL, KSPR_CELL); return c; }];
  },
  *icons() {
    for (const k of Object.keys(GI)) yield [`reference/icons/game-icons/${artName(k)}.svg`, () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" fill="#000000">${GI[k]}</svg>\n`];
    for (const k of Object.keys(KI)) yield [`reference/icons/kenney/${artName(k)}.svg`, () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${KI[k][0]}" width="512" height="512" fill="#000000"><path d="${KI[k][1]}"/></svg>\n`];
  },
  *maps() { for (const m of MAPS) yield [`reference/maps/${artName(m.name)}.png`, () => mapStill(m, Math.min(2, ART.k / 2))]; },
};
async function artFetch(url) { const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status); return new Uint8Array(await r.arrayBuffer()); }
async function artBytes(v) { // a canvas (drawn for the export, freed once it's encoded: never one the game keeps), bytes or text, as file bytes
  if (v instanceof Uint8Array) return v;
  if (typeof v === 'string') return new TextEncoder().encode(v);
  const b = await new Promise(res => v.toBlob(res, 'image/png')); freeCanvas(v); if (!b) throw new Error('could not draw it');
  return new Uint8Array(await b.arrayBuffer());
}
function artReadme(cats, skipped) {
  const L = ['SNAKE: CARNAGE, the art as image files', `Version ${GAME_VERSION}, exported ${new Date().toLocaleString()}.`, '',
    'editable/   pictures the game can take back. Edit them, keep their names and folders, and load them in the game.',
    'reference/  pictures to look at (skins on a snake, whole people and animals, icons, map pictures). The game does not read these.', '',
    'HOW TO EDIT',
    '- Keep each file\'s name and folder. Keep its shape (width to height); any size works, the game scales it.',
    '- Paint on a transparent background. Every picture has a fixed frame, so the game knows where it goes:',
    `  hats/       ${ART_FRAME.hat} game units square, the snake's head in the middle, pointing right.`,
    `  eyes/       ${ART_FRAME.eyes} units square, the head in the middle, pointing right.`,
    `  trails/     one particle, ${ART_FRAME.trail} units square, in the middle. The game sprays, turns and fades it.`,
    '  props/      the prop\'s own box is the middle 60% of the picture (trees, pines and bushes: the middle half);',
    '              props of the same kind but another size are stretched to fit. pine.png is every pine, tree.png every other tree.',
    '  skins/      the skin unrolled: left to right runs down the body from the nose, 64 body widths, then it repeats;',
    '              top and bottom are the two sides, the middle row the spine. The game still shades it round the body.',
    '              Your strip keeps the colors you paint (it no longer takes the two colors from the shop).',
    '  people/     body-1 ... body-6: the torso and head, without arms or legs, facing right, its center in the middle.',
    '              Add body-7.png, body-8.png ... for more looks: each person picks one. arm.png: the left arm, its hand in',
    '              the middle (the right arm is it mirrored). foot.png: the left shoe. leg.png: the hip at the left edge, the',
    '              foot at the right; it is stretched from one to the other as they walk. They all walk, run, bob and lean as now.',
    '  animals/    body.png: the whole animal, facing right. To make its feet step or its tail wag, rub them out of the body',
    `              and add foot.png (one foot in a ${ART_FRAME.foot} unit square) and tail.png (${ART_FRAME.tail[0]} by ${ART_FRAME.tail[1]} units, the tail's root`,
    '              at the right edge, halfway down, the tail running left).',
    '  textures/   blood-*, meat-*: seamless tiles (they repeat on every side). ground/: the floor photos; keep their size.',
    '  sprites/    white and grey on purpose: the game tints them.', '',
    'TRY THEM: Settings > Display > Your art > Load .zip, and pick this .zip zipped up again (or Folder, and pick the editable',
    'folder). Only this browser sees them; Remove puts the game\'s own back. Loading replaces what you loaded before, so keep',
    'all your changes in one .zip. Leave the files you didn\'t change in, and originals.json: it tells the game which pictures',
    'you changed, and only those are used (the rest stay the game\'s own drawing, so a skin you didn\'t touch keeps taking',
    'the shop\'s colors). Delete a picture from your zip to have the game draw that thing itself again.', '',
    'IN THE GAME FOR EVERYONE: add the .zip to the game\'s repository (a folder named art-edits is fine) and ask for it to go in.',
    'tools/art-apply.mjs copies the pictures you changed into art/, which every copy of the game loads.', '',
    `Drawn art is at ${ART.k} pixels per game unit. Exported: ${cats.join(', ')}.`, '',
    'Credits: icons from game-icons.net (CC BY 3.0, by Lorc, Delapouite and others); sprites from Kenney (kenney.nl, CC0); ground photos from ambientCG and other free packs (CC0).'];
  if (skipped.length) L.push('', 'Not included (could not be drawn here):', ...skipped.map(s => '  ' + s));
  return L.join('\n') + '\n';
}
async function artExport(cats, onStep) { // draws everything picked and hands back the .zip
  const list = []; for (const id of cats) for (const it of ART_MAKE[id]()) list.push(it);
  const files = [], skipped = [], orig = {}, keepSpr = SPR_X, had = new Set(CANOPY.keys()); SPR_X = Math.max(SPR, Math.min(8, ART.k)); // trees drawn at the export's size for once
  try {
    for (let i = 0; i < list.length; i++) {
      const [path, make] = list[i];
      try { const yours = path.startsWith('editable/') && artImg(artKey(path)), data = await artBytes(await make()); files.push({ name: 'snake-carnage-art/' + path, data });
        if (path.startsWith('editable/') && !yours) orig[path.slice(9)] = artCrc(data); } catch (e) { skipped.push(path + (e && e.message ? ` (${e.message})` : '')); }
      if (onStep) onStep(i + 1, list.length, path);
      if (i % 3 === 2) await new Promise(r => setTimeout(r, 0)); // breathe: the page stays alive and the bar moves
    }
  } finally { SPR_X = keepSpr; for (const key of Object.keys(STAMPS)) if (key.includes('@')) delete STAMPS[key]; for (const key of [...CANOPY.keys()]) if (!had.has(key)) CANOPY.delete(key); } // the export's big tree sprites go; the game's own stay
  files.push({ name: 'snake-carnage-art/editable/originals.json', data: new TextEncoder().encode(JSON.stringify(orig)) }); // what each picture the game drew looked like (its CRC), so loading it back takes only the ones you changed
  files.push({ name: 'snake-carnage-art/README.txt', data: new TextEncoder().encode(artReadme(cats, skipped)) });
  return { blob: artZip(files), n: files.length - 1, skipped };
}
/* ---- trying your edits: pictures from a .zip or a folder, into this browser ---- */
const ART_DIRS = /^(hats|eyes|trails|props|skins|people|animals|textures|sprites)\//;
const artMime = p => /\.png$/i.test(p) ? 'image/png' : /\.jpe?g$/i.test(p) ? 'image/jpeg' : /\.webp$/i.test(p) ? 'image/webp' : '';
const artU8 = async d => d instanceof Uint8Array ? d : new Uint8Array(await d.arrayBuffer());
async function artTake(entries) { // [[path, bytes or Blob]] -> the ones the game can use that you changed, saved in this browser (in place of what was loaded before)
  const o = entries.find(([p]) => /(^|\/)originals\.json$/i.test(p)); let orig = {}; try { if (o) orig = JSON.parse(new TextDecoder().decode(await artU8(o[1]))); } catch (e) {}
  const keep = []; let same = 0;
  for (const [p, d] of entries) {
    const key = artKey(p), mime = artMime(p); if (!mime || !ART_DIRS.test(key) || /(^|\/)(__macosx|\.)/i.test(p)) continue;
    const u8 = await artU8(d), ext = p.slice(p.lastIndexOf('.')).toLowerCase(); if (orig[key + ext] === artCrc(u8)) { same++; continue; } // as the game drew it: left to the game (a recolorable skin keeps taking your colors)
    keep.push([key + ext, new Blob([u8], { type: mime })]);
  }
  if (!keep.length) throw new Error(same ? 'every picture in there is as the game drew it: change one, save it under the same name and load again' : 'no pictures the game knows in there: keep the names and folders Export art gave them');
  await artLocalSave(keep); return keep.length;
}

/* ---- the screen: Settings › Display › Your art ---- */
function showArtExport() {
  ART.cats = ART.cats || Object.fromEntries(ART_CATS.map(([id, , , on]) => [id, !!on]));
  overlay.className = 'menuMode';
  overlay.innerHTML = `<div class="panel artexp"><h2>Your art</h2>
    <p class="lead">Every piece of the game's art as image files in one .zip, to edit in GIMP, Photoshop, Pixlr or any editor, and your edited pictures loaded back in to see them in the game.</p>
    <h3 class="ax-h">Try your edits</h3>
    <div class="srow2"><div><b>Load edited art</b><small>A .zip from Export art (or its editable folder) with your changes: the game uses your pictures in place of its own, in this browser. ${ARTO.local ? `<em class="ax-on">${ARTO.local} of your pictures in use.</em>` : ''}${ARTO.repo ? ` ${ARTO.repo} come with the game.` : ''}</small></div>
      <div class="ax-btns"><button class="mm-q" id="axZip">Load .zip</button><button class="mm-q" id="axDir">Folder</button>${ARTO.local ? '<button class="mm-q" id="axOff">Remove</button>' : ''}</div></div>
    <p class="ax-msg" hidden></p>
    <p class="ax-note">To put your art in the game for everyone, add the same .zip to the game's repository and ask for it to go in. The README in the zip explains each picture's frame.</p>
    <h3 class="ax-h">Export art</h3>
    <div class="ax-list">${ART_CATS.map(([id, name, what], i) => `<label class="ax-row" style="--i:${i}"><input type="checkbox" data-c="${id}" ${ART.cats[id] ? 'checked' : ''}><span><b>${name}</b><small>${what}</small></span></label>`).join('')}</div>
    <div class="srow2"><div><b>Size</b><small>Pixels per game unit for the drawn art. Bigger is easier to edit, and a bigger download.</small></div><div class="sseg" id="axK"><i class="sthumb"></i>${[2, 4, 8].map(v => `<button class="${v === ART.k ? 'on' : ''}" data-sfx="tab" data-v="${v}">${v}x</button>`).join('')}</div></div>
    <div class="ax-prog" hidden><div class="ax-bar"><i></i></div><span></span></div>
    <input type="file" id="axFile" accept=".zip,application/zip" hidden><input type="file" id="axFolder" webkitdirectory multiple hidden>
    <div class="ax-foot"><button class="btn alt" id="axBack" data-sfx="close">Back</button><button class="btn" id="axGo">Download .zip</button></div></div>`;
  const q = s => overlay.querySelector(s), seg = q('#axK'), pr = q('.ax-prog'), txt = pr.querySelector('span'), bar = pr.querySelector('i');
  const say = t => { const m = q('.ax-msg'); m.hidden = false; m.textContent = t; }; // (loading's own line, by its buttons)
  overlay.querySelectorAll('.ax-row input').forEach(i => i.onchange = () => { ART.cats[i.dataset.c] = i.checked; });
  seg.querySelectorAll('button').forEach(b => b.onclick = () => { ART.k = +b.dataset.v; seg.querySelectorAll('button').forEach(o => o.classList.toggle('on', o === b)); if (typeof placeThumb === 'function') placeThumb(seg); });
  requestAnimationFrame(() => { if (typeof placeThumb === 'function') placeThumb(seg, true); });
  q('#axBack').onclick = () => { if (!ART.busy) showSettings('Display'); };
  const load = async get => { if (ART.busy) return; ART.busy = true; try { say('Reading…'); const n = await artTake(await get()); say(`Loaded ${n} pictures. Starting over with them…`); setTimeout(() => location.reload(), 700); } catch (e) { say('Couldn\'t load that: ' + (e && e.message || e)); } finally { ART.busy = false; } };
  q('#axZip').onclick = () => q('#axFile').click(); q('#axDir').onclick = () => q('#axFolder').click();
  q('#axFile').onchange = e => { const f = e.target.files[0]; if (f) load(async () => artUnzip(await f.arrayBuffer())); };
  q('#axFolder').onchange = e => { const fs = [...e.target.files]; if (fs.length) load(async () => fs.map(f => [f.webkitRelativePath || f.name, f])); };
  if (q('#axOff')) q('#axOff').onclick = async () => { if (ART.busy) return; await artLocalSave([]); say('Your pictures are gone from this browser. Starting over…'); setTimeout(() => location.reload(), 600); };
  q('#axGo').onclick = async () => {
    const cats = ART_CATS.map(c => c[0]).filter(id => ART.cats[id]); if (ART.busy || !cats.length) return;
    if (location.protocol === 'file:' && cats.some(c => c === 'ground' || c === 'sprites')) toast('Ground textures and sprites need the game served from a web address, not opened as a file');
    ART.busy = true; const go = q('#axGo'); go.disabled = true; pr.hidden = false;
    try {
      const { blob, n, skipped } = await artExport(cats, (i, of, path) => { bar.style.width = (i / of * 100).toFixed(1) + '%'; txt.textContent = `Drawing ${i} of ${of}: ${path}`; });
      txt.textContent = `Packing ${n} files…`; await new Promise(r => setTimeout(r, 0));
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `snake-carnage-art-v${GAME_VERSION}.zip`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 120000);
      txt.textContent = `Done: ${n} files, ${(blob.size / 1048576).toFixed(1)} MB${skipped.length ? `, ${skipped.length} skipped (listed in the README)` : ''}.`;
    } catch (e) { console.error(e); txt.textContent = 'Something went wrong: ' + (e && e.message || e); }
    finally { ART.busy = false; go.disabled = false; }
  };
}
document.addEventListener('click', e => { if (e.target.closest('[data-act="artExport"]')) showArtExport(); }); // (Settings › Display)

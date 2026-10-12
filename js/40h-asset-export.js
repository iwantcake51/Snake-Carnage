/* =========================================================
   ART EXPORT: every piece of the game's art as image files in one .zip, to open and edit in GIMP, Photoshop, Pixlr or
   anything else (Settings › Display › Export art). Most of the art is drawn by code (skins, hats, eyes, trails, props,
   trees, people and animals, blood and meat): each is drawn on its own, big (ART.k pixels per game unit), on a
   transparent background, exactly as the game draws it, and cropped to what it covers. The image files the game loads go
   in as they are (the photo ground textures, the Kenney sprite atlas), the atlas also cut into its sprites, and every
   icon as an SVG. A README in the zip says what's where. The game keeps drawing its own art: these are copies to edit.
   ========================================================= */
const ART = { k: 4, busy: false, cats: null };
const ART_CATS = [ // [id, name, what it holds, ticked to begin with]
  ['skins', 'Skins', 'Every skin on a straight snake in your two colors, and the textures the living skins are painted from', 1],
  ['real', 'Real snakes', 'The real-snake looks, in their own colors', 1],
  ['hats', 'Hats', 'Every hat on its own, and on a snake head', 1],
  ['eyes', 'Eyes', 'Every eye style on a snake head', 1],
  ['trails', 'Trails', 'A spray of every trail\'s particles', 1],
  ['props', 'Props', 'Everything standing on the maps, one of each kind and look, trees and bushes included', 1],
  ['creatures', 'People and animals', 'Every kind, from above, and a few different people', 1],
  ['ground', 'Ground textures', 'The photo textures the floors are laid from, as they are', 1],
  ['tiles', 'Blood and meat', 'The seamless tiles blood pools and torn meat are filled with', 1],
  ['sprites', 'Kenney sprites', 'The sprite sheet the effects use, and each sprite on its own', 1],
  ['icons', 'Icons', 'Every skill, menu and HUD icon, as SVG', 1],
  ['maps', 'Map pictures', 'Each whole map, ground and props, no people. Large', 0],
];

/* ---- a .zip, stored (PNG and JPEG are compressed already) ---- */
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

/* ---- drawing one thing big ---- */
function artCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return [c, c.getContext('2d')]; }
function artTrim(c, pad = 6) { // cropped to what it covers, plus a little room
  const x = c.getContext('2d'), { width: w, height: h } = c, d = x.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let i = y * w * 4 + 3, xx = 0; xx < w; xx++, i += 4) if (d[i] > 2) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return c;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const [t, tx] = artCanvas(x1 - x0 + 1, y1 - y0 + 1); tx.drawImage(c, -x0, -y0); freeCanvas(c); return t;
}
const artName = s => String(s).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unnamed';
function artStill(draw) { const keep = T; T = 1.3; try { draw(); } finally { T = keep; } } // a fixed moment, so animated art holds still
function artSnake(cfg, n, sp, room = 44) { // a straight snake heading right, as the shop draws them, only big: head at the right
  const k = ART.k, len = (n - 1) * sp, [c, x] = artCanvas((len + room * 2) * k, room * 2 * k);
  x.setTransform(k, 0, 0, k, (len + room) * k, room * k);
  artStill(() => drawSnake(x, previewSnake(n, 0, 0, sp, 0), { ...cfg, trail: 'None' }));
  return artTrim(c);
}
const artLook = () => { const c = lookAfter('pattern'); delete c.real; delete c.realPrev; return { ...c, hat: 'None' }; }; // your own colors (not a real snake's you might be wearing)

/* ---- what goes in: each category yields [path, canvas] or [path, bytes] or [path, text] ---- */
const ART_MAKE = {
  *skins() {
    const look = artLook();
    for (const [name] of SHOP.pattern) {
      yield [`skins/${artName(name)}.png`, () => artSnake({ ...look, pattern: name }, 26, 6.6)];
      if (SNAKE_SKINS[name] && SNAKE_SKINS[name].tex) yield [`skins/textures/${artName(name)}.png`, () => { const t = skinTex(name, look), [c, x] = artCanvas(t.width, t.height); x.drawImage(t, 0, 0); return c; }]; // what the body is wrapped in: across is down the body, up and down goes round it
    }
  },
  *real() { for (const r of REAL_SNAKES) yield [`real-snakes/${artName(r.name)}.png`, () => artSnake({ ...artLook(), pattern: r.pattern, color: r.color, color2: r.color2 }, 26, 6.6)]; },
  *hats() {
    for (const name of Object.keys(HATS)) {
      if (name === 'None') continue;
      yield [`hats/${artName(name)}.png`, () => { const k = ART.k, [c, x] = artCanvas(90 * k, 90 * k); x.setTransform(k, 0, 0, k, 45 * k, 45 * k); artStill(() => drawHat(x, name)); return artTrim(c); }]; // seen from above, the head pointing right
      yield [`hats/on-a-snake/${artName(name)}.png`, () => artSnake({ ...artLook(), hat: name }, 6, 8)];
    }
  },
  *eyes() { for (const [name] of SHOP.eyes) yield [`eyes/${artName(name)}.png`, () => artSnake({ ...artLook(), eyes: name }, 6, 8)]; },
  *trails() {
    for (const [name] of SHOP.trail) {
      if (name === 'None') continue;
      yield [`trails/${artName(name)}.png`, () => {
        const k = ART.k, [c, x] = artCanvas(130 * k, 70 * k), up = name === 'Embers' || name === 'Bubbles' || name === 'Hearts' ? -1 : name === 'Blood Drip' ? 1 : 0, keep = trail;
        x.setTransform(k, 0, 0, k, 115 * k, 35 * k);
        trail = Array.from({ length: 22 }, (_, i) => ({ x: -3 - i * 4.4 + Math.sin(i * 2.1) * 2.5, y: Math.cos(i * 1.7) * 6 + up * i * .7, t: i * .045, life: 1.1, rot: i, type: name, c: ['#ff4f8b', '#ffd23f', '#3fd4ff', '#7dff6a', '#b07bff'][i % 5] }));
        try { artStill(() => drawTrail(x)); } finally { trail = keep; x.globalAlpha = 1; }
        return artTrim(c);
      }];
    }
  },
  *props() {
    const seen = new Map(), skip = new Set(['border', 'shape']);
    for (const m of MAPS) { let b; try { b = m.build(); } catch (e) { continue; } // every map's props: one of each kind and look
      for (const o of b.obs || []) { if (!o || !o.kind || skip.has(o.kind) || o.poly || o.shp) continue; const key = artPropKey(o); if (!seen.has(key)) seen.set(key, o); } }
    for (const [key, o0] of [...seen].sort((a, b) => a[0] < b[0] ? -1 : 1)) yield [`props/${key}.png`, () => artProp(o0)];
  },
  *creatures() {
    for (const type of Object.keys(TYPES)) {
      const n = TYPES[type].human ? 6 : 1; // a few different people: clothes, skin and hair are picked for each
      for (let i = 0; i < n; i++) yield [`people-and-animals/${artName(type)}${n > 1 ? '-' + (i + 1) : ''}.png`, () => {
        const k = ART.k, S = 90, [c, x] = artCanvas(S * k, S * k), cr = makeCreature(type, 0, 0, null); cr.a = -Math.PI / 2; cr.phase = 1.2; cr.moveAmt = .6;
        x.setTransform(k, 0, 0, k, S / 2 * k, S / 2 * k); const keep = T; T = 0; try { drawCreature(x, cr, true); } finally { T = keep; } return artTrim(c);
      }];
    }
  },
  *ground() { for (const n of [...new Set([...Object.values(GTEX.sets).flat(), 'snow_detail'])]) yield [`textures/ground/${n}.jpg`, () => artFetch(`textures/ground/${n}.jpg`)]; },
  *tiles() {
    const blood = [...new Set([BLOOD, ...CONFIG.bloodColors, ...GOLD_BLOOD.slice(0, 1), ...ALIEN_BLOOD.slice(0, 1)])];
    for (const col of blood) yield [`textures/blood-${col.slice(1)}.png`, () => { const t = bloodTile(col), [c, x] = artCanvas(t.width, t.height); x.drawImage(t, 0, 0); return c; }];
    for (const col of blood) yield [`textures/meat-${col.slice(1)}.png`, () => { const t = fleshTile(col), [c, x] = artCanvas(t.width, t.height); x.drawImage(t, 0, 0); return c; }];
  },
  *sprites() {
    if (!KSPR.ok) return;
    yield ['sprites/kenney-atlas.png', () => artFetch('sprites/kenney.png')];
    for (let i = 0; i < KSPR_NAMES.length; i++) yield [`sprites/kenney/${artName(KSPR_NAMES[i])}.png`, () => { const [c, x] = artCanvas(KSPR_CELL, KSPR_CELL); x.drawImage(KSPR.img, i % KSPR_COLS * KSPR_CELL, (i / KSPR_COLS | 0) * KSPR_CELL, KSPR_CELL, KSPR_CELL, 0, 0, KSPR_CELL, KSPR_CELL); return c; }];
  },
  *icons() {
    for (const k of Object.keys(GI)) yield [`icons/game-icons/${artName(k)}.svg`, () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" fill="#000000">${GI[k]}</svg>\n`];
    for (const k of Object.keys(KI)) yield [`icons/kenney/${artName(k)}.svg`, () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${KI[k][0]}" width="512" height="512" fill="#000000"><path d="${KI[k][1]}"/></svg>\n`];
  },
  *maps() { for (const m of MAPS) yield [`maps/${artName(m.name)}.png`, () => mapStill(m, Math.min(2, ART.k / 2))]; },
};
const ART_FLAG_SKIP = new Set(['noCollide', 'noOutline', 'noShadow', 'solid', 'fromShape', 'dyn', 'fixed', 'lit', 'on']);
function artPropKey(o) { // a kind and its look: kind, detail, roof and whatever flags it's drawn with
  const flags = Object.keys(o).filter(k => o[k] === true && !ART_FLAG_SKIP.has(k)).sort();
  return artName([o.kind, o.d, o.roof, ...flags].filter(Boolean).join('-'));
}
function artProp(o0) { // one prop on its own, upright, its box at the origin (with room for anything that reaches past it)
  const o = JSON.parse(JSON.stringify(o0)), k = ART.k, m = 40; delete o.rot;
  let w, h; if (o.t === 'r') { o.x = m; o.y = m; w = o.w + m * 2; h = o.h + m * 2; } else { o.x = o.y = o.r + m; w = h = o.r * 2 + m * 2; }
  const [c, x] = artCanvas(w * k, h * k); x.setTransform(k, 0, 0, k, 0, 0);
  artStill(() => { if ((o.kind === 'tree' || o.kind === 'bush') && treeStill(x, o)) return; drawObstacle(x, o); });
  return artTrim(c);
}
async function artFetch(url) { const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status); return new Uint8Array(await r.arrayBuffer()); }
async function artBytes(v) { // a canvas, bytes or text, as file bytes
  if (v instanceof Uint8Array) return v;
  if (typeof v === 'string') return new TextEncoder().encode(v);
  const b = await new Promise(res => v.toBlob(res, 'image/png')); freeCanvas(v); if (!b) throw new Error('could not draw it');
  return new Uint8Array(await b.arrayBuffer());
}
function artReadme(cats, skipped) {
  const L = ['SNAKE: CARNAGE, the art as image files', `Version ${GAME_VERSION}, exported ${new Date().toLocaleString()}.`, '',
    `Drawn art is at ${ART.k} pixels per game unit, on a transparent background, cropped to what it covers.`, 'Skins, hats and eyes are in your own two colors; real snakes in theirs.', '',
    'What is where:'];
  for (const [id, name, what] of ART_CATS) if (cats.includes(id)) L.push(`  ${name}: ${what}.`);
  L.push('', 'Notes:', '  skins/textures: the noise the living skins are painted from. Left to right runs down the body, top to bottom goes round it; it repeats left to right.',
    '  props: one of each kind and look found on the maps, drawn upright (unturned), lit from the top-left like in the game.',
    '  textures/blood-*, meat-*: seamless tiles (they repeat on every side).', '  sprites/kenney: white and grey on purpose; the game tints them.',
    '  icons: SVG. GIMP, Photoshop and Pixlr open them at any size.', '',
    'Credits: icons from game-icons.net (CC BY 3.0, by Lorc, Delapouite and others); sprites from Kenney (kenney.nl, CC0); ground photos from ambientCG and other free packs (CC0).',
    'The game keeps drawing its own art: these are copies to edit.');
  if (skipped.length) L.push('', 'Not included (could not be drawn here):', ...skipped.map(s => '  ' + s));
  return L.join('\n') + '\n';
}
async function artExport(cats, onStep) { // draws everything picked and hands back the .zip
  const list = []; for (const id of cats) for (const it of ART_MAKE[id]()) list.push(it);
  const files = [], skipped = [], keepSpr = SPR_X, had = new Set(CANOPY.keys()); SPR_X = Math.max(SPR, Math.min(8, ART.k)); // trees drawn at the export's size for once
  try {
    for (let i = 0; i < list.length; i++) {
      const [path, make] = list[i];
      try { files.push({ name: 'snake-carnage-art/' + path, data: await artBytes(await make()) }); } catch (e) { skipped.push(path + (e && e.message ? ` (${e.message})` : '')); }
      if (onStep) onStep(i + 1, list.length, path);
      if (i % 3 === 2) await new Promise(r => setTimeout(r, 0)); // breathe: the page stays alive and the bar moves
    }
  } finally { SPR_X = keepSpr; for (const key of Object.keys(STAMPS)) if (key.includes('@')) delete STAMPS[key]; for (const key of [...CANOPY.keys()]) if (!had.has(key)) CANOPY.delete(key); } // the export's big tree sprites go; the game's own stay
  files.push({ name: 'snake-carnage-art/README.txt', data: new TextEncoder().encode(artReadme(cats, skipped)) });
  return { blob: artZip(files), n: files.length - 1, skipped };
}

/* ---- the screen: Settings › Display › Export art ---- */
function showArtExport() {
  ART.cats = ART.cats || Object.fromEntries(ART_CATS.map(([id, , , on]) => [id, !!on]));
  overlay.className = 'menuMode';
  overlay.innerHTML = `<div class="panel artexp"><h2>Export art</h2>
    <p class="lead">Every piece of the game's art as image files in one .zip, to open in GIMP, Photoshop, Pixlr or any editor. The game keeps drawing its own: these are copies to edit.</p>
    <div class="ax-list">${ART_CATS.map(([id, name, what], i) => `<label class="ax-row" style="--i:${i}"><input type="checkbox" data-c="${id}" ${ART.cats[id] ? 'checked' : ''}><span><b>${name}</b><small>${what}</small></span></label>`).join('')}</div>
    <div class="srow2"><div><b>Size</b><small>Pixels per game unit for the drawn art. Bigger is easier to edit, and a bigger download.</small></div><div class="sseg" id="axK"><i class="sthumb"></i>${[2, 4, 8].map(v => `<button class="${v === ART.k ? 'on' : ''}" data-sfx="tab" data-v="${v}">${v}x</button>`).join('')}</div></div>
    <div class="ax-prog" hidden><div class="ax-bar"><i></i></div><span></span></div>
    <div class="ax-foot"><button class="btn alt" id="axBack" data-sfx="close">Back</button><button class="btn" id="axGo">Download .zip</button></div></div>`;
  const q = s => overlay.querySelector(s), seg = q('#axK');
  overlay.querySelectorAll('.ax-row input').forEach(i => i.onchange = () => { ART.cats[i.dataset.c] = i.checked; });
  seg.querySelectorAll('button').forEach(b => b.onclick = () => { ART.k = +b.dataset.v; seg.querySelectorAll('button').forEach(o => o.classList.toggle('on', o === b)); if (typeof placeThumb === 'function') placeThumb(seg); });
  requestAnimationFrame(() => { if (typeof placeThumb === 'function') placeThumb(seg, true); });
  q('#axBack').onclick = () => { if (!ART.busy) showSettings('Display'); };
  q('#axGo').onclick = async () => {
    const cats = ART_CATS.map(c => c[0]).filter(id => ART.cats[id]); if (ART.busy || !cats.length) return;
    if (location.protocol === 'file:' && cats.some(c => c === 'ground' || c === 'sprites')) toast('Ground textures and sprites need the game served from a web address, not opened as a file');
    ART.busy = true; const go = q('#axGo'), pr = q('.ax-prog'), bar = pr.querySelector('i'), txt = pr.querySelector('span'); go.disabled = true; pr.hidden = false;
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

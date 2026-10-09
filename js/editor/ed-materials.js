/* =========================================================
   MATERIAL EDITOR (editor only): build a material as a stack of layers and watch it live.
   Materials are plain data (see 09b-materials). Three places they can live:
     presets (built in, read-only: editing one makes a copy), "mine" (saved in this browser, usable on every map),
     and "this map" (carried inside the map, so a shared map looks the same everywhere).
   ========================================================= */
const MAT_LAYER_T = { solid: 'Solid color', linear: 'Linear gradient', radial: 'Radial gradient', noise: 'Noise', checker: 'Checker', stripes: 'Stripes', speckle: 'Speckle', grain: 'Grain', waves: 'Waves', cells: 'Cells / caustics' };
const MAT_BLENDS = ['source-over', 'multiply', 'screen', 'overlay', 'lighter', 'darken', 'lighten', 'color-dodge', 'soft-light', 'hard-light', 'difference'];
function edMaterialList() { // [id, material] for every material a shape can use, this map's first
  const out = [], seen = new Set(), add = (id, m, src) => { if (!m || seen.has(id)) return; seen.add(id); out.push([id, m, src]); };
  for (const [id, m] of Object.entries(ED.materials || {})) add(id, m, 'map');
  for (const [id, m] of Object.entries(userMaterials())) add(id, m, 'mine');
  for (const [id, m] of Object.entries(MAT_PRESETS)) add(id, m, 'preset');
  return out;
}
const edMatSrc = id => ED.materials && ED.materials[id] ? 'map' : userMaterials()[id] ? 'mine' : MAT_PRESETS[id] ? 'preset' : null;
function edShapeSwatch(s) { const m = getMaterial(s.fill || s.stroke), L = m && m.layers && m.layers.find(l => !l.off); return L ? L.c || (L.stops && L.stops[0][1]) || '#888' : '#666'; }
/* a material a map uses must travel with it: copy the ones from "mine" into the map's own list when it's saved */
function edUsedMaterials() {
  const used = new Set(); for (const s of ED.shapes || []) for (const r of [s.fill, s.stroke]) if (typeof r === 'string') used.add(r);
  for (const p of Object.values(edMapProps ? edMapProps() : {})) for (const sh of p.shapes || []) if (typeof sh.mat === 'string') used.add(sh.mat);
  for (const o of ED.obs || []) if (typeof o.mat === 'string') used.add(o.mat); // walls and blocks wearing a material
  if (typeof ED.base === 'string' && ED.base.startsWith('mat:')) used.add(ED.base.slice(4)); // the whole floor as one material
  const out = { ...(ED.materials || {}) }; for (const id of used) if (!out[id] && userMaterials()[id]) out[id] = edClone(userMaterials()[id]);
  return out;
}
function edMatPreview(cv, mat, t = 0) { // a swatch: the material in a rounded square over a checkerboard (so transparency shows)
  const x = cv.getContext('2d'), w = cv.width, h = cv.height; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h);
  for (let j = 0; j < h; j += 8) for (let i = 0; i < w; i += 8) { x.fillStyle = (i + j) % 16 ? '#2b2830' : '#38343e'; x.fillRect(i, j, 8, 8); }
  const p = Math.round(Math.min(w, h) * .12); x.beginPath(); if (x.roundRect) x.roundRect(p, p, w - p * 2, h - p * 2, 6); else x.rect(p, p, w - p * 2, h - p * 2);
  try { paintMaterial(x, mat, [p, p, w - p, h - p], t); } catch (e) {}
}
const ME = {}; // the open material editor
function openMaterialEditor(id, onPick) {
  document.querySelectorAll('#matEd').forEach(m => m.remove());
  const src = id && edMatSrc(id), base = id && getMaterial(id);
  ME.id = src === 'preset' ? null : id; ME.from = id; ME.src = src === 'preset' ? null : src; ME.onPick = onPick; ME.sel = 0; ME.dirty = false;
  ME.mat = edClone(base || { v: 1, name: 'New material', layers: [{ t: 'solid', c: '#8a8f99' }] }); if (src === 'preset') ME.mat.name = ME.mat.name + ' (copy)';
  const box = document.createElement('div'); box.id = 'matEd'; ME.box = box;
  box.innerHTML = `<div class="pewin mewin"><div class="pehead">${edSvg('layers', 18)}<b>Materials</b><span class="edmuted">A material is a stack of layers, bottom first. Presets are copied when you change them.</span><button class="mecancel edghost">Cancel</button><button class="meuse edprimary">Use this material</button></div>
    <div class="pebody"><div class="pelistw"><input class="edsearch mesearch" placeholder="Search materials…"><div class="melist"></div><button class="menew edghost edwide">+ New blank material</button></div>
      <div class="pemain"><div class="pestage"><canvas class="mebig" width="560" height="380"></canvas></div>
        <div class="pebgs"><span>Preview as</span><button data-mv="tile" class="on">Swatch</button><button data-mv="floor">Floor patch</button><button data-mv="path">Path</button><button data-mv="blob">Blob</button></div>
        <p class="edhint">Moving materials (scroll, shimmer, color cycles, pulsing glow) animate here and in the game. Still ones cost nothing per frame.</p></div>
      <div class="peside meside"></div></div></div>`;
  document.body.appendChild(box);
  box.onkeydown = e => e.stopPropagation(); ME.view = 'tile';
  box.querySelector('.mecancel').onclick = () => edMatClose();
  box.querySelector('.meuse').onclick = () => { const id2 = edMatCommit(ME.src || 'map'); const f = ME.onPick; edMatClose(); if (f && id2) f(id2); };
  box.querySelector('.menew').onclick = () => { ME.id = null; ME.src = null; ME.from = null; ME.sel = 0; ME.mat = { v: 1, name: 'New material', layers: [{ t: 'solid', c: '#8a8f99' }] }; ME.dirty = true; edMatSide(); edMatList(); };
  box.querySelector('.mesearch').oninput = edMatList;
  box.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { ME.view = b.dataset.mv; box.querySelectorAll('[data-mv]').forEach(c => c.classList.toggle('on', c === b)); });
  edMatList(); edMatSide();
  const t0 = performance.now(), loop = () => { if (!box.isConnected) return; ME.raf = requestAnimationFrame(loop); edMatDraw((performance.now() - t0) / 1000); };
  loop();
}
function edMatClose() { cancelAnimationFrame(ME.raf); if (ME.box) ME.box.remove(); ME.box = null; }
function edMatCommit(where) { // store the working copy; returns its id
  const m = edClone(ME.mat); m.v = 1;
  if (!ME.dirty && ME.from) return ME.from; // untouched: just use it where it already is
  let id = ME.id; if (!id || (where !== ME.src && ME.src)) id = (where === 'mine' ? 'u_' : 'm_') + (m.name || 'mat').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 14) + Date.now().toString(36).slice(-4);
  if (where === 'mine') saveUserMaterial(id, m);
  else { edPush(); ED.materials = ED.materials || {}; ED.materials[id] = m; mapMaterials = ED.materials; }
  ME.id = id; ME.src = where; ME.dirty = false; edFloor(true);
  return id;
}
function edMatList() {
  const el = ME.box.querySelector('.melist'), q = (ME.box.querySelector('.mesearch').value || '').toLowerCase(), groups = { map: 'This map', mine: 'Mine (every map)', preset: 'Presets and effects' };
  const all = edMaterialList().filter(([id, m]) => !q || (m.name || id).toLowerCase().includes(q));
  el.innerHTML = Object.entries(groups).map(([g, n]) => { const rows = all.filter(r => r[2] === g); return rows.length ? `<h5>${n}</h5>${rows.map(([id, m]) => `<button data-m="${id}" class="${id === (ME.id || ME.from) ? 'on' : ''}"><canvas width="40" height="40"></canvas><span>${(m.name || id).replace(/</g, '&lt;')}</span>${matAnimated(m) ? '<i title="animated">∿</i>' : ''}</button>`).join('')}` : ''; }).join('');
  el.querySelectorAll('[data-m]').forEach(b => { const m = getMaterial(b.dataset.m); edMatPreview(b.querySelector('canvas'), m);
    b.onclick = () => { const id = b.dataset.m, s = edMatSrc(id); ME.from = id; ME.id = s === 'preset' ? null : id; ME.src = s === 'preset' ? null : s; ME.mat = edClone(getMaterial(id)); if (s === 'preset') ME.mat.name += ' (copy)'; ME.sel = 0; ME.dirty = false; edMatSide(); edMatList(); }; });
}
function edMatDraw(t) {
  const c = ME.box.querySelector('.mebig'); if (!c) return; const x = c.getContext('2d'), w = c.width, h = c.height;
  x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#1b1920'; x.fillRect(0, 0, w, h);
  for (let j = 0; j < h; j += 16) for (let i = 0; i < w; i += 16) if ((i + j) % 32) { x.fillStyle = '#211f27'; x.fillRect(i, j, 16, 16); }
  const m = ME.mat;
  try {
    if (ME.view === 'path') { const s = { kind: 'path', nodes: [[60, 300, 0, 0, 0, 0], [220, 90, 0, 0, 0, 0], [360, 290, 0, 0, 0, 0], [500, 80, 0, 0, 0, 0]], curve: 'smooth', w: 46 }; vecTrace(x, vecStrokePoly(vecFlat(s), 46), true); paintMaterial(x, m, [40, 60, 520, 320], t); }
    else if (ME.view === 'blob') { const s = { kind: 'poly', closed: true, curve: 'smooth', nodes: [[140, 90], [330, 60], [470, 160], [420, 310], [200, 330], [90, 220]].map(p => [...p, 0, 0, 0, 0]) }; vecTrace(x, vecFlat(s), true); paintMaterial(x, m, [90, 60, 470, 330], t); }
    else if (ME.view === 'floor') { x.beginPath(); x.rect(0, 0, w, h); paintMaterial(x, m, [0, 0, w, h], t); }
    else { x.beginPath(); if (x.roundRect) x.roundRect(130, 40, 300, 300, 18); else x.rect(130, 40, 300, 300); paintMaterial(x, m, [130, 40, 430, 340], t); }
  } catch (e) {}
}
function edMatSide() {
  const el = ME.box.querySelector('.meside'), m = ME.mat, L = m.layers[ME.sel];
  const num = (k, lab, min, max, st, v, cls = 'mek') => `<label class="merow">${lab}<input type="range" class="${cls}" data-k="${k}" min="${min}" max="${max}" step="${st}" value="${v ?? 0}"><output>${v ?? 0}</output></label>`;
  const col = (k, lab, v) => `<label class="merow">${lab}<input type="color" class="mec" data-k="${k}" value="${edHex(v || '#888888')}"></label>`;
  const where = ME.src === 'map' ? 'Saved in this map' : ME.src === 'mine' ? 'Saved in your materials' : ME.from ? 'A preset: changes make a copy' : 'Not saved yet';
  el.innerHTML = `<div class="pettl"><input class="mename" value="${(m.name || '').replace(/"/g, '&quot;')}"><span class="pebadge ${ME.dirty ? '' : 'off'}">${ME.dirty ? 'Changed' : where}</span></div>
    <section><h4>Whole material</h4>${num('opacity', 'Opacity', 0, 1, .05, m.opacity ?? 1, 'mem')}${num('glow', 'Glow', 0, 40, 1, m.glow || 0, 'mem')}${col('glowColor', 'Glow color', m.glowColor || '#ffffff').replace('mec', 'memc')}${num('pulse', 'Pulse speed', 0, 8, .1, m.pulse || 0, 'mem')}</section>
    <section><h4>Layers <small>bottom first</small></h4><div class="melayers">${m.layers.map((l, i) => `<div class="melay ${i === ME.sel ? 'on' : ''} ${l.off ? 'off' : ''}" data-l="${i}"><i style="background:${l.c || (l.stops && l.stops[0][1]) || '#888'}"></i><span>${i + 1}. ${MAT_LAYER_T[l.t] || l.t}</span><button data-la="vis" title="Show / hide">${l.off ? '○' : '●'}</button></div>`).reverse().join('')}</div>
      <div class="edbtns"><select class="meadd"><option value="">+ Add layer…</option>${Object.entries(MAT_LAYER_T).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select><button data-la="up">Up</button><button data-la="down">Down</button><button data-la="dup">Copy</button><button data-la="del">Delete</button></div></section>
    <section class="melayer">${L ? edMatLayerForm(L, num, col) : '<p class="edhint">No layers.</p>'}</section>
    <div class="pefoot"><button class="mesavemine edghost" title="Keep it in your materials: every map can use it">Save to my materials</button><button class="mesavemap edghost" title="Keep it inside this map">Save in this map</button>${ME.src ? '<button class="medel edghost warn">Delete</button>' : ''}</div>`;
  const set = () => { ME.dirty = true; el.querySelector('.pebadge').textContent = 'Changed'; el.querySelector('.pebadge').classList.remove('off'); };
  el.querySelector('.mename').oninput = e => { m.name = e.target.value; set(); };
  el.querySelectorAll('.mem').forEach(r => r.oninput = () => { m[r.dataset.k] = +r.value; if (!+r.value && r.dataset.k !== 'opacity') delete m[r.dataset.k]; r.nextElementSibling.textContent = r.value; set(); });
  el.querySelector('.memc').oninput = e => { m.glowColor = e.target.value; set(); };
  el.querySelectorAll('.melay').forEach(r => r.onclick = e => { const i = +r.dataset.l; if (e.target.closest('[data-la="vis"]')) { m.layers[i].off = !m.layers[i].off; if (!m.layers[i].off) delete m.layers[i].off; set(); } ME.sel = i; edMatSide(); });
  el.querySelector('.meadd').onchange = e => { const t = e.target.value; if (!t) return; const nl = { t, c: '#ffffff', c2: '#000000', a: t === 'solid' ? 1 : .6 }; if (t === 'noise' || t === 'waves' || t === 'cells') Object.assign(nl, { nscale: 4, oct: 3 }); if (t === 'stripes' || t === 'checker') nl.density = 4; if (t === 'speckle') nl.density = .06;
    m.layers.splice(ME.sel + 1, 0, nl); ME.sel++; set(); edMatSide(); };
  el.querySelectorAll('.edbtns [data-la]').forEach(b => b.onclick = () => { const a = m.layers, i = ME.sel; if (!a[i]) return;
    if (b.dataset.la === 'del' && a.length > 1) { a.splice(i, 1); ME.sel = Math.max(0, i - 1); } if (b.dataset.la === 'dup') { a.splice(i + 1, 0, edClone(a[i])); ME.sel = i + 1; }
    if (b.dataset.la === 'up' && i < a.length - 1) { [a[i], a[i + 1]] = [a[i + 1], a[i]]; ME.sel = i + 1; } if (b.dataset.la === 'down' && i > 0) { [a[i], a[i - 1]] = [a[i - 1], a[i]]; ME.sel = i - 1; }
    set(); edMatSide(); });
  const lay = el.querySelector('.melayer');
  lay.querySelectorAll('.mek').forEach(r => r.oninput = () => { const k = r.dataset.k, v = +r.value; if (k === 'sx' || k === 'sy') { L.speed = L.speed || [0, 0]; L.speed[k === 'sx' ? 0 : 1] = v; if (!L.speed[0] && !L.speed[1]) delete L.speed; } else L[k] = v; r.nextElementSibling.textContent = r.value; set(); });
  lay.querySelectorAll('.mec').forEach(r => r.oninput = () => { L[r.dataset.k] = r.value; set(); });
  const ty = lay.querySelector('.metype'); if (ty) ty.onchange = () => { L.t = ty.value; set(); edMatSide(); };
  const bl = lay.querySelector('.meblend'); if (bl) bl.onchange = () => { L.blend = bl.value; if (L.blend === 'source-over') delete L.blend; set(); };
  const cy = lay.querySelector('.mecycle'); if (cy) cy.onchange = () => { const v = cy.value.split(/[\s,]+/).filter(c => /^#[0-9a-f]{3,8}$/i.test(c)); if (v.length > 1) L.cycle = v; else delete L.cycle; set(); };
  const sp = lay.querySelector('.mestops'); if (sp) sp.onchange = () => { const st = sp.value.split(',').map(p => p.trim().split(/\s+/)).filter(p => p.length === 2 && !isNaN(+p[0])).map(([a, c]) => [clamp(+a, 0, 1), c]); if (st.length > 1) L.stops = st; else delete L.stops; set(); };
  el.querySelector('.mesavemine').onclick = () => { ME.dirty = true; edMatCommit('mine'); edMatSide(); edMatList(); edStatus('Saved to your materials'); };
  el.querySelector('.mesavemap').onclick = () => { ME.dirty = true; edMatCommit('map'); edMatSide(); edMatList(); edStatus('Saved in this map'); };
  const del = el.querySelector('.medel'); if (del) del.onclick = () => { if (ME.src === 'mine') saveUserMaterial(ME.id, null); else if (ED.materials) { edPush(); delete ED.materials[ME.id]; } ME.id = null; ME.src = null; ME.dirty = true; edMatSide(); edMatList(); edFloor(true); };
}
function edMatLayerForm(L, num, col) {
  const grad = L.t === 'linear' || L.t === 'radial', tile = !grad && L.t !== 'solid', pix = L.t === 'noise' || L.t === 'waves' || L.t === 'cells';
  return `<h4>Layer ${ME.sel + 1}</h4>
    <label class="merow">Type <select class="metype">${Object.entries(MAT_LAYER_T).map(([k, n]) => `<option value="${k}" ${k === L.t ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    ${grad ? `<label class="merow mewide">Stops <input class="mestops" placeholder="0 #ffffff, 1 #000000" value="${(L.stops || []).map(([p, c]) => `${p} ${c}`).join(', ')}"></label>` : ''}
    ${col('c', grad ? 'From' : 'Color', L.c)}${L.t === 'solid' ? '' : col('c2', grad ? 'To' : 'Second color', L.c2)}
    ${num('a', 'Opacity', 0, 1, .05, L.a ?? 1)}
    <label class="merow">Blend <select class="meblend">${MAT_BLENDS.map(b => `<option ${b === (L.blend || 'source-over') ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
    ${tile || L.t === 'radial' ? num('scale', 'Scale', .1, 6, .05, L.scale ?? 1) : ''}${tile ? num('ox', 'Offset X', -128, 128, 1, L.ox || 0) + num('oy', 'Offset Y', -128, 128, 1, L.oy || 0) : ''}
    ${tile || L.t === 'linear' ? num('rot', 'Rotation', -180, 180, 1, L.rot || 0) : ''}
    ${pix ? num('nscale', 'Feature size', 1, 16, 1, L.nscale || 4) + num('oct', 'Detail', 1, 6, 1, L.oct || 4) + num('seed', 'Seed', 1, 99, 1, L.seed || 7) : ''}
    ${L.t === 'stripes' || L.t === 'checker' || L.t === 'waves' ? num('density', 'Count', 1, 40, 1, L.density || 4) : ''}${L.t === 'stripes' ? num('width', 'Stripe width', .05, .95, .05, L.width ?? .5) : ''}${L.t === 'speckle' ? num('density', 'Amount', .005, .5, .005, L.density ?? .08) : ''}
    <h4>Motion</h4>
    ${num('sx', 'Scroll X', -80, 80, 1, (L.speed || [])[0] || 0)}${num('sy', 'Scroll Y', -80, 80, 1, (L.speed || [])[1] || 0)}
    ${tile ? num('wobble', 'Shimmer', 0, 8, .1, L.wobble || 0) + num('wspeed', 'Shimmer speed', .2, 12, .1, L.wspeed || 2.3) : ''}
    <label class="merow mewide">Color cycle <input class="mecycle" placeholder="#ff3fd2 #3fe0ff" value="${(L.cycle || []).join(' ')}"></label>${num('cspeed', 'Cycle speed', 0, 2, .05, L.cspeed || .3)}`;
}

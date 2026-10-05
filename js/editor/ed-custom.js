/* =========================================================
   CUSTOM MAPS AND CUSTOM PROPS (editor only)
   - File → New map: a blank Indoor or Outdoor map with sensible defaults (09d-custom-maps), saved as data.
   - Map settings (nothing selected, on a custom map): name, inside or outside, light, weather, crowd, where the
     snake starts and spawn zones.
   - My custom maps: open, download, import, delete.
   - Prop editor: brand-new props built from pieces with materials, with their own collision and interaction
     geometry (separate from the drawing) and pivot.
   ========================================================= */
ED_MENUS.File.unshift(['newmap', 'New map…', 'Ctrl+N'], ['mymaps', 'My custom maps…'], '-');
ED_MENUS.Tools.push('-', ['newprop', 'New prop…'], ['matEd', 'Materials…']);
const _edCmdC = edCmd;
edCmd = function (c) {
  const A = { newmap: edNewMapDlg, mymaps: edCustomLib, newprop: () => edNewPropDlg(), matEd: () => openMaterialEditor(null, null) };
  return A[c] ? A[c]() : _edCmdC(c);
};
function edReopen(i) { // switch the editor to another map
  cancelAnimationFrame(ED.raf); if (ED.root) ED.root.remove(); removeEventListener('keydown', edKey, true); removeEventListener('keyup', edKey, true);
  document.querySelectorAll('.edpop,#propEd,#matEd,.edmodal').forEach(p => p.remove()); openEditor(i);
}
/* ---- opening a custom map: bring it to this screen's width once, so the editor works in plain world coordinates ---- */
const _openEditorC = openEditor;
openEditor = function (idx = mapIdx) {
  edSyncCustomProps();
  _openEditorC(idx);
  ED.zoneType = ED.zoneType || 'human';
  if (ED.custom) {
    const dx = ED.dx || 0;
    if (dx) {
      const sx = p => p.map(([a, b]) => [a + dx, b]);
      for (const o of [...ED.obs, ...ED.lights]) { if (typeof o.x === 'number') o.x += dx; if (o.poly) { o.poly = sx(o.poly); polyBounds(o); } }
      for (const t of ED.trails) t.pts = sx(t.pts);
      for (const a of ED.areas) { a.poly = sx(a.poly); polyBounds(a); }
      for (const s of ED.shapes) edShapeMoveBy(s, dx, 0);
      if (ED.custom.spawn) ED.custom.spawn.x += dx; for (const z of ED.custom.zones || []) z.x += dx;
      ED.dx = 0; edFloor(true);
    }
    ED.custom.w = W; ED.custom.h = H;
    ED.border = ED.custom.border || ED.border;
  }
  mapMaterials = ED.materials; // shapes drawn in the editor find this map's own materials
  edPanel();
};
/* ---- File → New map ---- */
function edNewMapDlg() {
  const m = edModal('New map', `<p>Start from an empty map. You can change everything later in the map settings (click empty ground).</p>
    <div class="ednewenv"><button data-env="outdoor" class="on"><b>🌳 Outdoor</b><small>Grass, open sky, sunlight and night, seasons and snow. Starts with a few people and animals.</small></button>
      <button data-env="indoor"><b>🏠 Indoor</b><small>Tiled floor, ceiling lights, no weather, controlled lighting. Starts with office workers, a rat and a cat.</small></button></div>
    <label class="edfield">Name <input type="text" class="ednewname" maxlength="40" placeholder="My map"></label>`,
    [['Cancel', null, ''], ['Create', mm => {
      const env = mm.querySelector('.ednewenv .on').dataset.env, name = mm.querySelector('.ednewname').value.trim();
      if (ED.dirtySave) edSave();
      const d = blankCustomMap(env, name); if (!saveCustomMap(d)) return edStatus('Could not create the map (storage full?)');
      const i = MAPS.findIndex(q => q.custom === d.id); if (i >= 0) { edReopen(i); edStatus(`New ${env} map: ${d.name}. Click empty ground for its settings.`); }
    }, 'edprimary']]);
  m.querySelectorAll('[data-env]').forEach(b => b.onclick = () => m.querySelectorAll('[data-env]').forEach(c => c.classList.toggle('on', c === b)));
  const inp = m.querySelector('.ednewname'); inp.focus(); inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') m.querySelector('.edprimary').click(); };
}
/* ---- My custom maps ---- */
function edCustomFile(d) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' })); a.download = (d.name || 'map').replace(/[^\w\- ]+/g, '') + '.scmap.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
function edImportCustom(raw) {
  const d = migrateCustomMap(raw); if (!d || d.format !== 'snake-carnage-map') return false;
  const all = customMaps(); if (all[d.id] && JSON.stringify(all[d.id]) !== JSON.stringify(d)) { d.id = 'cm' + Date.now().toString(36); d.name += ' (imported)'; }
  if (!saveCustomMap(d)) { edStatus('Could not import (storage full?)'); return true; }
  const i = MAPS.findIndex(q => q.custom === d.id); if (i >= 0) edReopen(i); edStatus(`Imported ${d.name}`); return true;
}
const _edOpenFileC = edOpenFile;
edOpenFile = function () {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,.txt,.js';
  inp.onchange = () => inp.files[0] && inp.files[0].text().then(t => { try { const d = JSON.parse(t); if (d && d.format === 'snake-carnage-map') { document.querySelectorAll('.edmodal').forEach(x => x.remove()); return edImportCustom(d); } if (d.snakeCarnageMap) { document.querySelectorAll('.edmodal').forEach(x => x.remove()); return edLoadSnap(d); } } catch (e) {} edImport(inp.files[0]); });
  inp.click();
};
function edCustomLib() {
  const all = customMaps(), list = Object.values(all).sort((a, b) => ((b.meta || {}).modified || 0) - ((a.meta || {}).modified || 0));
  const m = edModal('My custom maps', list.length ? `<div class="edlib">${list.map(d => `<div class="edlibrow" data-id="${d.id}"><div><b>${(d.name || '').replace(/</g, '&lt;')}</b><small>${d.env === 'indoor' ? 'Indoor' : 'Outdoor'} · ${(d.objects || []).length} objects · ${(d.shapes || []).length} shapes · changed ${new Date((d.meta || {}).modified || 0).toLocaleDateString()}</small></div><button class="ld">Open</button><button class="dl">Download</button><button class="rm warn">Delete</button></div>`).join('')}</div>`
    : '<p>No custom maps yet. <b>File → New map</b> makes one.</p>', [['Close', null, ''], ['Open a map file…', () => edOpenFile(), ''], ['New map…', () => edNewMapDlg(), 'edprimary']]);
  m.querySelectorAll('.edlibrow').forEach(r => { const id = r.dataset.id;
    r.querySelector('.ld').onclick = () => { m.remove(); if (ED.dirtySave) edSave(); const i = MAPS.findIndex(q => q.custom === id); if (i >= 0) edReopen(i); };
    r.querySelector('.dl').onclick = () => edCustomFile(customMaps()[id]);
    r.querySelector('.rm').onclick = () => edModal('Delete this map?', `<p>${(all[id].name || '').replace(/</g, '&lt;')} will be gone from this browser. Download it first if you might want it back.</p>`, [['Cancel', null, ''], ['Delete', () => {
      const editing = ED.custom && ED.custom.id === id; deleteCustomMap(id); r.remove();
      if (editing) { ED.dirtySave = false; edReopen(0); } else { const sel = ED.root.querySelector('.edmap'); if (sel) sel.innerHTML = MAPS.map((mm, i) => `<option value="${i}" ${i === ED.map ? 'selected' : ''}>${mm.name}</option>`).join(''); }
    }, 'warn']]); });
}
/* ---- map settings: shown when nothing is selected on a custom map ---- */
const _edPanelC = edPanel;
edPanel = function () {
  _edPanelC();
  const p = ED.root && ED.root.querySelector('.edpanel'); if (!p || ED.sel.length || !ED.custom) return;
  const c = ED.custom, indoor = c.env === 'indoor', types = Object.keys(TYPES).sort(), W8 = c.weather || (c.weather = { seasons: !indoor, snow: !indoor });
  const tsel = (cls, v) => `<select class="${cls}">${types.map(t => `<option ${t === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  const box = document.createElement('div'); box.className = 'edmapset';
  box.innerHTML = `<h4>Map settings</h4>
    <label class="edfield">Name <input type="text" class="cmname" maxlength="40" value="${(c.name || '').replace(/"/g, '&quot;')}"></label>
    <div class="peseg cmenv"><button data-env="outdoor" class="${indoor ? '' : 'on'}">🌳 Outdoor</button><button data-env="indoor" class="${indoor ? 'on' : ''}">🏠 Indoor</button></div>
    <label class="edfield">Edge color <input type="color" class="cmborder" value="${edHex(c.border || '#4f7a33')}"></label>
    <p class="edhint">Ground texture: the Ground button in the toolbar. Roads, rooms and rivers: the Shapes tab.</p>
    ${indoor ? `<h4>Light</h4><label class="edfield">Room light <input type="range" class="cmamb" min="0" max="1" step=".05" value="${c.ambient ?? .3}"><output>${c.ambient ?? .3}</output></label>
      <div class="edbtns"><button data-addl="panel">+ Ceiling panel</button><button data-addl="skylight">+ Skylight</button><button data-addl="window">+ Window light</button></div>
      <p class="edhint">Skylights and windows follow the time of day: bright at noon, dark at night.</p>`
    : `<h4>Weather</h4><label class="petog sm"><span><b>Seasons</b><small>Autumn leaves, spring blossom, winter.</small></span><input type="checkbox" class="cmseas" ${W8.seasons !== false ? 'checked' : ''}><i></i></label>
      <label class="petog sm"><span><b>Snow in winter</b></span><input type="checkbox" class="cmsnow" ${W8.snow !== false ? 'checked' : ''}><i></i></label>
      <label class="edfield">Grass tufts <input type="range" class="cmgrass" min="0" max="400" step="10" value="${c.grass ?? 140}"><output>${c.grass ?? 140}</output></label>`}
    <h4>Crowd</h4><div class="cmpop">${(c.population || []).map(([t, n], i) => `<div class="cmrow" data-i="${i}">${tsel('cmpt', t)}<input type="number" class="cmpn" min="0" max="80" value="${n}"><button class="cmpx" title="Remove">×</button></div>`).join('')}</div>
    <div class="edbtns"><button class="cmpadd">+ Add creatures</button></div>
    <label class="edfield">Walkers <input type="number" class="cmwalk" min="0" max="40" value="${c.walkers || 0}"></label>
    <h4>Snake start</h4><div class="edbtns"><button class="cmspawn ${ED.tool === 'spawn' ? 'on' : ''}">Place the start</button></div>
    <label class="edfield">Facing <input type="range" class="cmang" min="-180" max="180" step="15" value="${Math.round(((c.spawn || {}).a || 0) * 180 / Math.PI)}"><output>${Math.round(((c.spawn || {}).a || 0) * 180 / Math.PI)}°</output></label>
    <h4>Spawn zones <small>creatures that start in one area</small></h4><div class="cmzones">${(c.zones || []).map((z, i) => `<div class="cmrow" data-i="${i}">${tsel('cmzt', z.type)}<input type="number" class="cmzn" min="0" max="60" value="${z.n}"><button class="cmzx" title="Remove">×</button></div>`).join('')}</div>
    <div class="edbtns">${tsel('cmznew', ED.zoneType)}<button class="cmzone ${ED.tool === 'zone' ? 'on' : ''}">Draw a zone</button></div>`;
  p.appendChild(box);
  const ch = f => { edPush(); f(); edDirty(); };
  box.querySelector('.cmname').onchange = e => ch(() => { c.name = e.target.value.trim() || c.name; });
  box.querySelectorAll('.cmenv [data-env]').forEach(b => b.onclick = () => { if (b.dataset.env === c.env) return; ch(() => { const D = CUSTOM_DEFAULTS[b.dataset.env]; c.env = b.dataset.env; c.ambient = D.ambient; c.weather = { ...D.weather }; c.grass = D.grass; if (Object.values(CUSTOM_DEFAULTS).some(q => q.border === c.border)) { c.border = D.border; ED.border = D.border; } MAPS[ED.map].indoor = c.env === 'indoor'; }); edPanel(); });
  box.querySelector('.cmborder').oninput = e => { c.border = ED.border = e.target.value; ED.dirtySave = true; };
  box.querySelector('.cmborder').onchange = () => edDirty();
  const rng = (cls, f) => { const r = box.querySelector(cls); if (!r) return; r.oninput = () => { r.nextElementSibling.textContent = r.value; }; r.onchange = () => ch(() => f(+r.value)); };
  rng('.cmamb', v => { c.ambient = v; }); rng('.cmgrass', v => { c.grass = v; });
  const ck = (cls, k) => { const el = box.querySelector(cls); if (el) el.onchange = () => ch(() => { c.weather[k] = el.checked; }); }; ck('.cmseas', 'seasons'); ck('.cmsnow', 'snow');
  box.querySelectorAll('[data-addl]').forEach(b => b.onclick = () => { const r = ED.cv.getBoundingClientRect(), [wx, wy] = edW(r.width / 2, r.height / 2), k = b.dataset.addl; edPush();
    ED.lights.push(k === 'panel' ? { x: Math.round(wx), y: Math.round(wy), r: 200, kind: 'fluor', fix: 'panel' } : { x: Math.round(wx), y: Math.round(wy), r: k === 'window' ? 120 : 170, kind: 'skylight', fix: 'none', win: k === 'window' || undefined });
    ED.sel = [{ t: 'l', i: ED.lights.length - 1 }]; edDirty(); edPanel(); });
  box.querySelectorAll('.cmpop .cmrow').forEach(r => { const i = +r.dataset.i;
    r.querySelector('.cmpt').onchange = e => ch(() => { c.population[i][0] = e.target.value; });
    r.querySelector('.cmpn').onchange = e => ch(() => { c.population[i][1] = clamp(Math.round(+e.target.value || 0), 0, 80); });
    r.querySelector('.cmpx').onclick = () => { ch(() => c.population.splice(i, 1)); edPanel(); }; });
  box.querySelector('.cmpadd').onclick = () => { ch(() => (c.population = c.population || []).push([indoor ? 'human' : 'rabbit', 3])); edPanel(); };
  box.querySelector('.cmwalk').onchange = e => ch(() => { c.walkers = clamp(Math.round(+e.target.value || 0), 0, 40); });
  box.querySelector('.cmspawn').onclick = () => { edTool(ED.tool === 'spawn' ? 'select' : 'spawn'); edPanel(); };
  const ang = box.querySelector('.cmang'); ang.oninput = () => { ang.nextElementSibling.textContent = ang.value + '°'; c.spawn = c.spawn || { x: W / 2, y: H / 2 }; c.spawn.a = +ang.value * Math.PI / 180; }; ang.onchange = () => edDirty();
  box.querySelectorAll('.cmzones .cmrow').forEach(r => { const i = +r.dataset.i;
    r.querySelector('.cmzt').onchange = e => ch(() => { c.zones[i].type = e.target.value; });
    r.querySelector('.cmzn').onchange = e => ch(() => { c.zones[i].n = clamp(Math.round(+e.target.value || 0), 0, 60); });
    r.querySelector('.cmzx').onclick = () => { ch(() => c.zones.splice(i, 1)); edPanel(); }; });
  box.querySelector('.cmznew').onchange = e => { ED.zoneType = e.target.value; };
  box.querySelector('.cmzone').onclick = () => { edTool(ED.tool === 'zone' ? 'select' : 'zone'); edPanel(); };
};
/* ---- the start and zone tools, and drawing them on the map ---- */
const _edShapeDownC = edShapeDown, _edShapeMoveC = edShapeMove, _edShapeUpC = edShapeUp, _edShapeOverlayC = edShapeOverlay;
edShapeDown = function (e, sx, sy, wx, wy, dbl) {
  if (ED.custom && ED.tool === 'spawn') { edPush(); ED.custom.spawn = { ...(ED.custom.spawn || {}), x: Math.round(wx), y: Math.round(wy) }; edDirty(); edTool('select'); edPanel(); return true; }
  if (ED.custom && ED.tool === 'zone') { ED.drag = { k: 'zone', x0: edSnap(wx), y0: edSnap(wy), x1: edSnap(wx), y1: edSnap(wy) }; return true; }
  return _edShapeDownC(e, sx, sy, wx, wy, dbl);
};
edShapeMove = function (e, wx, wy) { const d = ED.drag; if (d && d.k === 'zone') { d.x1 = edSnap(wx); d.y1 = edSnap(wy); return true; } return _edShapeMoveC(e, wx, wy); };
edShapeUp = function () {
  const d = ED.drag; if (!(d && d.k === 'zone')) return _edShapeUpC();
  ED.drag = null; const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1), w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
  if (w > 16 && h > 16) { edPush(); (ED.custom.zones = ED.custom.zones || []).push({ type: ED.zoneType || 'human', n: 4, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }); edDirty(); }
  edTool('select'); edPanel(); return true;
};
edShapeOverlay = function (x, px) {
  _edShapeOverlayC(x, px);
  if (!ED.custom) return;
  x.save(); x.font = `${11 * px}px sans-serif`; x.lineWidth = 1.5 * px;
  for (const z of ED.custom.zones || []) { x.setLineDash([6 * px, 4 * px]); x.strokeStyle = '#7fd0ff'; x.fillStyle = 'rgba(127,208,255,.08)'; x.fillRect(z.x, z.y, z.w, z.h); x.strokeRect(z.x, z.y, z.w, z.h); x.setLineDash([]); x.fillStyle = '#7fd0ff'; x.fillText(`${z.n} × ${z.type}`, z.x + 4 * px, z.y + 13 * px); }
  const d = ED.drag; if (d && d.k === 'zone') { x.setLineDash([6 * px, 4 * px]); x.strokeStyle = '#7fd0ff'; x.strokeRect(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0)); x.setLineDash([]); }
  const s = ED.custom.spawn; if (s) { const a = s.a || 0; x.translate(s.x, s.y); x.rotate(a); x.fillStyle = 'rgba(80,220,120,.25)'; x.strokeStyle = '#50dc78'; x.beginPath(); x.arc(0, 0, 12, 0, TAU); x.fill(); x.stroke(); x.beginPath(); x.moveTo(16, 0); x.lineTo(6, -6); x.lineTo(6, 6); x.closePath(); x.fillStyle = '#50dc78'; x.fill(); x.rotate(-a); x.fillText('start', -12, -16); }
  x.restore();
};
/* ---- custom props: in the palette like any other ---- */
function edSyncCustomProps() {
  const defs = propDefs();
  for (let i = ED_PROPS.length - 1; i >= 0; i--) if (ED_PROPS[i].customProp && !(defs[ED_PROPS[i][1]] && defs[ED_PROPS[i][1]].custom)) ED_PROPS.splice(i, 1);
  for (const [k, p] of Object.entries(defs)) { if (!p.custom) continue;
    const e = [p.name || k, k, p.base === 'c' ? 'c' : 'r', p.w || 40, p.base === 'c' ? 0 : p.h || 30, p.color || '#888888']; e.customProp = true;
    const i = ED_PROPS.findIndex(q => q[1] === k); if (i >= 0) ED_PROPS[i] = e; else ED_PROPS.push(e); }
  const el = ED.root && ED.root.querySelector('.edprops'); if (!el) return;
  el.innerHTML = ED_PROPS.map((p, i) => `<button class="edprop" data-p="${i}" title="${p[0]}: click, then click the map (Shift keeps placing)"><canvas width="68" height="68"></canvas><span>${p[0]}</span></button>`).join('');
  el.querySelectorAll('.edprop').forEach(b => b.onclick = () => edTool('prop', ED_PROPS[+b.dataset.p])); edPreviews();
}
function edNewPropDlg(from) {
  const m = edModal(from ? 'Copy as a new prop' : 'New prop', `<p>Build it from pieces (rectangles, circles, polygons…), each with a color or a material. Its collision and the area the Battering Ram hits are set separately from how it looks.</p>
    <label class="edfield">Name <input type="text" class="npname" maxlength="30" value="${from ? ((propDefs()[from] || {}).name || from) + ' 2' : ''}" placeholder="Vending machine"></label>
    <div class="peseg npbase"><button data-b="r" class="on">Box</button><button data-b="c">Round</button></div>`,
    [['Cancel', null, ''], ['Create', mm => {
      const name = mm.querySelector('.npname').value.trim() || 'Prop', base = mm.querySelector('.npbase .on').dataset.b, kind = 'cp_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12) + Date.now().toString(36).slice(-4);
      const src = from && propDefs()[from], def = src ? { ...edClone(src), name, custom: true } : { custom: true, name, base, w: base === 'c' ? 16 : 40, h: base === 'c' ? 0 : 30, color: '#8a8f99', hideBase: true,
        shapes: [{ type: base === 'c' ? 'circle' : 'rect', x: .5, y: .5, w: 1, h: 1, rot: 0, c: '#8a8f99', a: 1, lw: .08 }, { type: base === 'c' ? 'circle' : 'rect', x: .5, y: .45, w: .7, h: .6, rot: 0, c: '#b4b9c2', a: 1, lw: .08 }] };
      let loc = {}; try { loc = JSON.parse(localStorage.getItem('snakeCarnagePropDefs')) || {}; } catch (e) {}
      peHistNote(peRaw(), null); loc[kind] = def; try { localStorage.setItem('snakeCarnagePropDefs', JSON.stringify(loc)); } catch (e) {} propApply(); edSyncCustomProps(); openPropEditor(kind);
    }, 'edprimary']]);
  m.querySelectorAll('.npbase [data-b]').forEach(b => b.onclick = () => m.querySelectorAll('.npbase [data-b]').forEach(c => c.classList.toggle('on', c === b)));
  const inp = m.querySelector('.npname'); inp.focus(); inp.select(); inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') m.querySelector('.edprimary').click(); };
}
const _openPropEditorC = openPropEditor;
openPropEditor = function (kind) {
  edSyncCustomProps(); _openPropEditorC(kind);
  const head = PE.box.querySelector('.pehead .pedocks'), b = document.createElement('button'); b.className = 'edghost penew'; b.textContent = '+ New prop'; b.onclick = () => edNewPropDlg(); head.before(b);
  const mb = document.createElement('button'); mb.className = 'edghost'; mb.textContent = 'Materials…'; mb.onclick = () => openMaterialEditor(null, null); head.before(mb);
  const done = PE.box.querySelector('.peclose'), was = done.onclick; done.onclick = () => { was(); edSyncCustomProps(); };
};
/* the extra prop editor controls: per piece (material, size, layer, visible) and per kind (geometry, pivot, custom prop basics) */
const GEO_T = [['', 'Same as its box'], ['rect', 'Box'], ['circle', 'Circle / oval'], ['poly', 'Polygon'], ['none', 'None']];
const _peSideC = peSide;
peSide = function () {
  _peSideC();
  const el = PE.box.querySelector('.peside'), p = peGet(), foot = el.querySelector('.pefoot'), mats = edMaterialList();
  const sl = (cls, k, lab, min, max, st, v) => `<label class="merow">${lab}<input type="range" class="${cls}" data-k="${k}" min="${min}" max="${max}" step="${st}" value="${v}"><output>${v}</output></label>`;
  const geo = which => { const g = p[which] || {}; return `<div class="pegeo" data-g="${which}"><select class="pegt">${GEO_T.map(([k, n]) => `<option value="${k}" ${k === (g.type || '') ? 'selected' : ''}>${n}</option>`).join('')}</select>
    ${g.type === 'rect' || g.type === 'circle' ? ['x', 'y', 'w', 'h'].map(k => sl('pegk', k, { x: 'Across', y: 'Down', w: 'Width', h: 'Height' }[k], k === 'w' || k === 'h' ? .05 : 0, k === 'w' || k === 'h' ? 1.5 : 1, .01, g[k] ?? (k === 'w' || k === 'h' ? 1 : .5))).join('') : ''}
    ${g.type === 'poly' ? `<label class="merow mewide">Points (0..1) <input class="pegp" value="${(g.pts || []).map(q => q.join(' ')).join(', ')}"></label><button class="pegtrace edghost">Fit around the pieces</button>` : ''}</div>`; };
  const sec = document.createElement('section'); sec.className = 'pecustom';
  sec.innerHTML = `${p.custom ? `<h4>Your prop</h4><label class="edfield">Name <input class="pecname" value="${(p.name || '').replace(/"/g, '&quot;')}"></label>
      ${p.base === 'c' ? sl('pecs2', 'w', 'Size (radius)', 3, 80, 1, p.w || 16) : sl('pecs2', 'w', 'Width', 4, 240, 1, p.w || 40) + sl('pecs2', 'h', 'Height', 4, 240, 1, p.h || 30)}
      <div class="edbtns"><button class="pecdup">Copy as new prop</button><button class="pecdel warn">Delete prop</button></div>` : ''}
    <h4>Collision <small>what blocks the snake and people</small></h4>${geo('hit')}
    <h4>Interaction <small>where the Battering Ram and smashes hit it</small></h4>${geo('interact')}
    <h4>Pivot <small>where it turns when rotated</small></h4>${sl('pepv', 0, 'Across', 0, 1, .05, (p.pivot || [.5, .5])[0])}${sl('pepv', 1, 'Down', 0, 1, .05, (p.pivot || [.5, .5])[1])}
    <p class="edhint">In the preview: red dashed = collision, blue dashed = interaction, yellow cross = pivot.</p>`;
  if (foot) foot.before(sec); else el.appendChild(sec);
  const save = q => { peSet(q); }, side = q => { peSet(q); peSide(); };
  const nm = sec.querySelector('.pecname'); if (nm) nm.onchange = () => { const q = peGet(); q.name = nm.value.trim() || q.name; side(q); edSyncCustomProps(); };
  sec.querySelectorAll('.pecs2').forEach(r => { r.oninput = () => { r.nextElementSibling.textContent = r.value; const q = peGet(); q[r.dataset.k] = +r.value; const e = ED_PROPS.find(z => z[1] === PE.kind); if (e) e[r.dataset.k === 'w' ? 3 : 4] = +r.value; save(q); }; r.onchange = () => edSyncCustomProps(); });
  const dup = sec.querySelector('.pecdup'); if (dup) dup.onclick = () => edNewPropDlg(PE.kind);
  const del = sec.querySelector('.pecdel'); if (del) del.onclick = () => edModal('Delete this prop?', `<p>Every ${(p.name || PE.kind).replace(/</g, '&lt;')} placed on your maps stops drawing until you remove them.</p>`, [['Cancel', null, ''], ['Delete', () => {
    let loc = {}; try { loc = JSON.parse(localStorage.getItem('snakeCarnagePropDefs')) || {}; } catch (e) {} peHistNote(peRaw(), null); delete loc[PE.kind]; try { localStorage.setItem('snakeCarnagePropDefs', JSON.stringify(loc)); } catch (e) {} propApply(); edSyncCustomProps(); openPropEditor('tree'); }, 'warn']]);
  sec.querySelectorAll('.pegeo').forEach(g => { const which = g.dataset.g;
    g.querySelector('.pegt').onchange = e => { const q = peGet(), t = e.target.value; if (!t) delete q[which]; else q[which] = { type: t, x: .5, y: .5, w: 1, h: 1, ...(t === 'poly' ? { pts: [[0, 0], [1, 0], [1, 1], [0, 1]] } : {}) }; side(q); };
    g.querySelectorAll('.pegk').forEach(r => r.oninput = () => { r.nextElementSibling.textContent = r.value; const q = peGet(); q[which][r.dataset.k] = +r.value; save(q); });
    const pp = g.querySelector('.pegp'); if (pp) pp.onchange = () => { const pts = pp.value.split(',').map(s => s.trim().split(/\s+/).map(Number)).filter(a => a.length === 2 && a.every(isFinite)); if (pts.length > 2) { const q = peGet(); q[which].pts = pts; save(q); } };
    const tr = g.querySelector('.pegtrace'); if (tr) tr.onclick = () => { const q = peGet(), pts = []; for (const s of q.shapes || []) { if (s.off) continue; const k = s.sc || 1, hw = s.w * k / 2, hh = s.h * k / 2, a = (s.rot || 0) * Math.PI / 180;
        for (const [u, v] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) pts.push([s.x + u * Math.cos(a) - v * Math.sin(a), s.y + u * Math.sin(a) + v * Math.cos(a)]); }
      if (pts.length > 2) { q[which].pts = edHull(pts).map(([u, v]) => [Math.round(u * 100) / 100, Math.round(v * 100) / 100]); side(q); } }; });
  sec.querySelectorAll('.pepv').forEach(r => r.oninput = () => { r.nextElementSibling.textContent = r.value; const q = peGet(); q.pivot = q.pivot || [.5, .5]; q.pivot[+r.dataset.k] = +r.value; if (q.pivot[0] === .5 && q.pivot[1] === .5) delete q.pivot; save(q); });
  // the selected piece: material, size, layer, visible
  const s = (p.shapes || [])[PE.selShape], pb = el.querySelector('.peshape'); if (!s || !pb) return;
  const ex = document.createElement('div'); ex.className = 'pepiece';
  ex.innerHTML = `<label class="merow">Material <select class="pemat"><option value="">Plain color</option>${mats.map(([id, m]) => `<option value="${id}" ${id === s.mat ? 'selected' : ''}>${m.name || id}</option>`).join('')}</select></label><div class="edbtns"><button class="pematEd">Edit materials…</button></div>
    ${sl('pesk', 'sc', 'Scale', .1, 3, .05, s.sc ?? 1)}${sl('pesk', 'z', 'Layer', -10, 10, 1, s.z || 0)}
    <label class="petog sm"><span><b>Visible</b></span><input type="checkbox" class="peoff" ${s.off ? '' : 'checked'}><i></i></label>`;
  pb.appendChild(ex);
  ex.querySelector('.pemat').onchange = e => { const q = peGet(); if (e.target.value) q.shapes[PE.selShape].mat = e.target.value; else delete q.shapes[PE.selShape].mat; save(q); };
  ex.querySelector('.pematEd').onclick = () => openMaterialEditor(s.mat || null, id => { const q = peGet(); q.shapes[PE.selShape].mat = id; if (!userMaterials()[id] && ED.materials && ED.materials[id]) { saveUserMaterial(id, ED.materials[id]); } side(q); }); // props are used on every map, so their materials live in "mine"
  ex.querySelectorAll('.pesk').forEach(r => r.oninput = () => { r.nextElementSibling.textContent = r.value; const q = peGet(), v = +r.value; q.shapes[PE.selShape][r.dataset.k] = v; if ((r.dataset.k === 'sc' && v === 1) || (r.dataset.k === 'z' && !v)) delete q.shapes[PE.selShape][r.dataset.k]; save(q); });
  ex.querySelector('.peoff').onchange = e => { const q = peGet(); if (e.target.checked) delete q.shapes[PE.selShape].off; else q.shapes[PE.selShape].off = true; save(q); };
};
function edHull(P) { // convex hull (monotone chain)
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const _peDrawC = peDraw;
peDraw = function () {
  _peDrawC();
  const v = peView(), x = v.c.getContext('2d'), o = v.o, S = (px, py) => [v.ox + px * v.s, v.oy + py * v.s];
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.lineWidth = 2;
  for (const [which, col] of [['hit', '#ff4d6a'], ['interact', '#4dc3ff']]) { const P = propHitPoly(o, which); if (!P || P === 'none') continue; x.setLineDash(which === 'hit' ? [6, 4] : [2, 4]); x.strokeStyle = col; x.beginPath(); P.forEach(([a, b], k) => { const [sx, sy] = S(a, b); k ? x.lineTo(sx, sy) : x.moveTo(sx, sy); }); x.closePath(); x.stroke(); }
  x.setLineDash([]); const [pxw, pyw] = objPivot(o), [px, py] = S(pxw, pyw); x.strokeStyle = '#ffd34d'; x.beginPath(); x.moveTo(px - 7, py); x.lineTo(px + 7, py); x.moveTo(px, py - 7); x.lineTo(px, py + 7); x.stroke();
  x.restore();
};
edSyncCustomProps();

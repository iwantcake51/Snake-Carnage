/* =========================================================
   MAP EDITOR
   Opens from the main menu (Map editor). Edits the current map's objects (walls, props, furniture...) and its lights,
   on top of the map's ground. Saved per map and world width in this browser; Export writes 05c-map-overrides.js so
   the edits can ship with the game. loadMap applies them (see mapOverride in 05c).
   ========================================================= */
const ED_PROPS = [ // palette: [label, kind, shape, size..., color, extra]
  ['Wall', 'wall', 'r', 120, 14, '#6d6875'], ['Fence', 'fence', 'r', 120, 6, '#8b6b45'], ['Hedge', 'hedge', 'r', 120, 14, '#3a6b28'],
  ['Building', 'building', 'r', 90, 64, '#9a8a6a', { roof: 'gable' }], ['Glass wall', 'glass', 'r', 14, 120, '#a9d4e6'],
  ['Tree', 'tree', 'c', 24, 0, '#3d7a2a'], ['Bush', 'bush', 'c', 16, 0, '#3d7a2a'], ['Rock', 'rock', 'c', 16, 0, '#6e7178'], ['Hay', 'hay', 'c', 13, 0, '#e3c565'],
  ['Water', 'water', 'c', 60, 0, '#4aa3df'], ['Lamp post', 'lamp', 'c', 5, 0, '#3a3a3a'], ['Bin', 'bin', 'c', 5, 0, '#3a3a40'], ['Bench', 'bench', 'r', 40, 8, '#7a5a38'],
  ['Table', 'table', 'c', 16, 0, '#9a6c3e'], ['Long table', 'table', 'r', 120, 40, '#6d4a2e'], ['Desk', 'desk', 'r', 84, 30, '#9c7550'], ['Couch', 'couch', 'r', 90, 34, '#6a7fa6'],
  ['Shelf', 'shelf', 'r', 30, 100, '#5c3d22'], ['Crate', 'crate', 'r', 30, 30, '#6a5a3a'], ['Car', 'car', 'r', 24, 44, '#c0392b'], ['Plant', 'plant', 'c', 12, 0, '#3d7a2a'],
  ['Bed', 'bed', 'r', 90, 24, '#4e5a42'], ['Console', 'console', 'r', 100, 22, '#28343a'], ['Counter / bar', 'bar', 'r', 160, 30, '#8a8f99'], ['Pillar', 'pillar', 'c', 14, 0, '#2e2a36'],
  ['Barrier', 'barrier', 'r', 8, 24, '#c9a227'], ['Tent', 'tent', 'r', 44, 30, '#c9763a'], ['Generator', 'generator', 'r', 80, 70, '#3c4044'], ['Speaker', 'speaker', 'r', 60, 64, '#141218'],
  ['Booth', 'booth', 'r', 40, 100, '#5a1a3a'], ['Campfire', 'campfire', 'c', 14, 0, '#6d6a63'], ['Pod', 'pod', 'c', 20, 0, '#7fffc8'], ['Cryo tube', 'cryo', 'r', 36, 70, '#a9c4cc'], ['Silo', 'silo', 'c', 36, 0, '#b8b8c0'],
];
const ED_KINDS = [...new Set(ED_PROPS.map(p => p[1]).concat(['barn', 'module', 'tube', 'solar', 'dome', 'lander', 'gazebo', 'slide', 'chess', 'dj', 'holo', 'saucer', 'reactor']))].sort();
const ED_VARIANTS = { // looks a kind can take: [flag, name]; '' is the plain one
  car: [['', 'Car'], ['taxi', 'Taxi'], ['van', 'Van'], ['tractor', 'Tractor'], ['rover', 'Rover']],
  crate: [['', 'Crate'], ['dumpster', 'Dumpster'], ['pump', 'Fuel pump'], ['printer', 'Printer'], ['trough', 'Water trough']],
  shelf: [['', 'Shelf'], ['fridge', 'Fridge'], ['plants', 'Plant rack'], ['suits', 'Suit lockers']],
  table: [['', 'Table'], ['umbrella', 'Parasol table'], ['lab', 'Lab bench']], bed: [['', 'Bed'], ['med', 'Hospital bed']], desk: [['', 'Desk'], ['reception', 'Reception desk']],
  rock: [['', 'Rock'], ['antenna', 'Antenna']], lamp: [['', 'Street lamp'], ['lantern', 'Lantern'], ['mast', 'Floodlight mast']],
  water: [['', 'Pond / pool'], ['fountain', 'Fountain'], ['tank', 'Specimen tank']], building: [['', 'Building'], ['market', 'Supermarket'], ['diner', 'Diner']],
  dome: [['', 'Dome'], ['green', 'Greenhouse']], lander: [['', 'Lander'], ['rocket', 'Rocket']], module: [['', 'Module'], ['command', 'Command module']],
};
const edVariant = o => { const v = ED_VARIANTS[o.kind]; if (!v) return null; return v.find(([f]) => f && o[f]) || v[0]; };
const ED_FIX = ['panel', 'strip', 'cage', 'spot', 'pool', 'exit', 'none'];
const ED = { open: false };
const ED_RUNTIME = new Set(['tinfo', 'wb', 'iceC', 'iceK', 'group', 'cracked', 'src', 'snk', 'z', 'cx', 'cy', 'br', 'dropped', 'ext', 'mask', 'tint', 'size', 'cur', 'fl', 'dead', 'dynNow', 'enc', 'o', 'c0']);
const edHex = c => { if (!c) return '#ffffff'; if (c[0] === '#') return c.length === 4 ? '#' + [...c.slice(1)].map(h => h + h).join('') : c.slice(0, 7); const m = c.match(/\d+/g) || [255, 255, 255]; return '#' + m.slice(0, 3).map(v => (+v).toString(16).padStart(2, '0')).join(''); };
const edRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
const edClone = v => JSON.parse(JSON.stringify(v));
const edLightCol = l => l.c || LCOL[l.kind || (MAPS[ED.map].indoor ? 'fluor' : 'fixed')] || '255,214,150';

function openEditor(idx = mapIdx) {
  ED.map = idx; ED.open = true; ED.tool = 'select'; ED.sel = []; ED.undo = []; ED.redo = []; ED.snaps = edLoadSnaps(); ED.grid = ED.snaps.move.step; ED.showGrid = true; ED.lit = false; ED.help = true; ED.pal = null; ED.pathW = 20; ED.pathStyle = 'dirt'; ED.draft = null; ED.fitted = false;
  state = 'editor'; overlay.style.display = 'none'; season = null;
  loadMap(idx); creatures = [];
  ED.obs = edClone(curPre); ED.lights = edClone(curMapLights);
  const b = MAPS[idx].build(), ov = mapOverride(MAPS[idx].name);
  ED.trails = ov && ov.trails ? edClone(ov.trails) : captureTrails(b); ED.areas = ov && ov.areas ? edClone(ov.areas) : []; ED.base = ov && ov.base || '';
  ED.areas.forEach(polyBounds); // the map's painted trails, as editable paths
  ED.floorBase = makeLayer()[0]; { const x = ED.floorBase.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0); trailMute = true; try { b.floor(x); } finally { trailMute = false; } }
  ED.floor = makeLayer()[0]; edFloor(true); ED.decorFn = b.decor || null; // signs, crosses, hydrants...: painted over the objects, as in the game
  ED.border = MAPS[idx].border;
  edBuildUI(); edFit(); edLoop();
  clearInterval(ED.autoT); ED.autoT = setInterval(() => { if (ED.open && ED.dirtySave) edSave(); }, 300000); // autosave every 5 minutes
}
function closeEditor(play) {
  ED.open = false; cancelAnimationFrame(ED.raf); ED.root.remove(); document.querySelectorAll('.edpop,#propEd').forEach(p => p.remove()); removeEventListener('keydown', edKey, true);
  overlay.style.display = '';
  if (play) { mapIdx = ED.map; edTesting = ED.map; showMenu(); startGame({ test: true }); } else { mapIdx = ED.map; loadMap(ED.map); showMenu(); }
}
/* ---- edits: undo history, saving ---- */
function edPush() { ED.undo.push(edClone({ o: ED.obs, l: ED.lights, t: ED.trails, a: ED.areas, b: ED.base })); if (ED.undo.length > 200) ED.undo.shift(); ED.redo = []; edDirty(); }
function edUndo(dir) {
  const from = dir < 0 ? ED.undo : ED.redo, to = dir < 0 ? ED.redo : ED.undo; if (!from.length) return;
  to.push(edClone({ o: ED.obs, l: ED.lights, t: ED.trails, a: ED.areas, b: ED.base })); const s = from.pop(); ED.obs = s.o; ED.lights = s.l; ED.trails = s.t || ED.trails; ED.areas = s.a || []; ED.base = s.b || ''; ED.areas.forEach(polyBounds); ED.sel = []; edFloor(true); edDirty(); edPanel();
}
function edDirty() { ED.unshared = true; ED.dirtySave = true; edStatus('Unsaved changes · Ctrl+S to save (autosaves every 5 minutes)'); }
function edSave() {
  const all = edDrafts(); const clean = list => list.map(o => { const c = {}; for (const k in o) if (!ED_RUNTIME.has(k)) c[k] = o[k]; return c; }); // only what was authored, not what the game worked out at runtime
  all[mapEditKey(MAPS[ED.map].name)] = { obs: clean(ED.obs), lights: clean(ED.lights), trails: ED.trails, areas: ED.areas.map(a => ({ poly: a.poly, tex: a.tex, sharp: a.sharp || undefined, edge: a.edge })), base: ED.base || undefined };
  try { localStorage.setItem('snakeCarnageEdDrafts', JSON.stringify(all)); ED.dirtySave = false; edStatus(`Saved ${new Date().toLocaleTimeString()} · in the editor only (File → Use in my game to play it normally)`); } catch (e) { edStatus('Could not save (storage full?)'); }
}
function edReset() {
  if (!confirm('Throw away your edits to ' + MAPS[ED.map].name + ' and go back to the original layout?')) return;
  const all = edDrafts(); delete all[mapEditKey(MAPS[ED.map].name)]; try { localStorage.setItem('snakeCarnageEdDrafts', JSON.stringify(all)); } catch (e) {}
  const keep = MAP_OVERRIDES[mapEditKey(MAPS[ED.map].name)]; if (keep) delete MAP_OVERRIDES[mapEditKey(MAPS[ED.map].name)];
  loadMap(ED.map); ED.obs = edClone(curPre); ED.lights = edClone(curMapLights); ED.trails = captureTrails(MAPS[ED.map].build()); ED.areas = []; ED.base = ''; edFloor(true); ED.undo = []; ED.redo = []; ED.sel = []; edPanel(); edStatus('Back to the original');
}
function edExport() {
  edSave();
  const text = edShareText();
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' })); a.download = '05c-map-overrides.js'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  edStatus('Exported 05c-map-overrides.js: put it in the js folder to ship these edits');
}
function edImport(file) {
  file.text().then(t => {
    if (/^SNAKE CARNAGE EDITS/.test(t)) { const d = JSON.parse(t.slice(t.indexOf('{'))); localStorage.setItem('snakeCarnageEdDrafts', JSON.stringify({ ...edDrafts(), ...(d.maps || {}) })); localStorage.setItem('snakeCarnagePropDefs', JSON.stringify({ ...edLocalProps(), ...(d.props || {}) })); propApply();
      const ov = mapOverride(MAPS[ED.map].name); if (ov) { edPush(); ED.obs = edClone(ov.obs); ED.lights = edClone(ov.lights); if (ov.trails) ED.trails = edClone(ov.trails); edFloor(true); } edPreviews(); edPanel(); return edStatus(`Imported ${Object.keys(d.maps || {}).length} map(s) and ${Object.keys(d.props || {}).length} prop(s)`); } const m = t.match(/MAP_OVERRIDES = (\{[\s\S]*?\});\n/), pm = t.match(/PROP_OVERRIDES = (\{[\s\S]*?\});/); const data = JSON.parse(m ? m[1] : t);
    if (pm) { try { localStorage.setItem('snakeCarnagePropDefs', JSON.stringify({ ...propDefs(), ...JSON.parse(pm[1]) })); propApply(); } catch (e) {} }
    const all = { ...edDrafts(), ...data }; localStorage.setItem('snakeCarnageEdDrafts', JSON.stringify(all));
    const ov = mapOverride(MAPS[ED.map].name); if (ov) { edPush(); ED.obs = edClone(ov.obs); ED.lights = edClone(ov.lights); if (ov.trails) ED.trails = edClone(ov.trails); edFloor(true); } edStatus('Imported ' + Object.keys(data).length + ' map(s)'); edPanel(); })
    .catch(() => edStatus('That file is not a map export'));
}
/* ---- view: pan and zoom ---- */
function edFit() { const r = ED.cv.getBoundingClientRect(); ED.z = Math.min(r.width / W, r.height / H) * .95; ED.px = (r.width - W * ED.z) / 2; ED.py = (r.height - H * ED.z) / 2; }
const edW = (sx, sy) => [(sx - ED.px) / ED.z, (sy - ED.py) / ED.z];
function edZoom(f, sx, sy) { const [wx, wy] = edW(sx, sy); ED.z = clamp(ED.z * f, .15, 24); ED.px = sx - wx * ED.z; ED.py = sy - wy * ED.z; }
const edSnapOn = k => !!ED.snaps[k].on !== !!ED.invSnap; // Ctrl held: snapping flips for this drag
const edSnap = (v, force) => edSnapOn('move') || force ? Math.round(v / ED.snaps.move.step) * ED.snaps.move.step : Math.round(v * 2) / 2;
/* ---- hit testing ---- */
const edBox = o => { if (isRot(o)) { const P = obsCorners(o), xs = P.map(p => p[0]), ys = P.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; } return o.t === 'r' ? [o.x, o.y, o.x + o.w, o.y + o.h] : [o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r]; };
function edHit(wx, wy) {
  const pad = 4 / ED.z;
  for (let i = ED.lights.length - 1; i >= 0; i--) { const l = ED.lights[i]; if (l._hide || l._lock) continue; if (Math.hypot(wx - l.x, wy - l.y) < 9 / ED.z + 3) return { t: 'l', i }; }
  for (let i = ED.obs.length - 1; i >= 0; i--) { const o = ED.obs[i]; if (o._hide || o._lock) continue;
    if (o.poly) { if (pointInPoly(polyShape(o), wx, wy)) return { t: 'o', i }; continue; }
    if (isRot(o)) { if (pointInPoly(obsCorners({ ...o, x: o.x - pad, y: o.y - pad, w: o.w + pad * 2, h: o.h + pad * 2 }), wx, wy)) return { t: 'o', i }; continue; }
    if (o.t === 'r' ? wx >= o.x - pad && wx <= o.x + o.w + pad && wy >= o.y - pad && wy <= o.y + o.h + pad : Math.hypot(wx - o.x, wy - o.y) <= o.r + pad) return { t: 'o', i }; }
  for (let i = ED.areas.length - 1; i >= 0; i--) { const a = ED.areas[i]; if (a._hide || a._lock) continue; if (pointInPoly(polyShape(a), wx, wy) && !(ED.trails.some(t => !t._hide && trailPoints(t.pts).some(([u, v]) => Math.hypot(wx - u, wy - v) < t.w / 2)))) return { t: 'a', i }; }
  if (ED.layerPaths !== false) for (let i = ED.trails.length - 1; i >= 0; i--) { const t = ED.trails[i]; if (t._hide || t._lock) continue; if (trailPoints(t.pts).some(([a, b]) => Math.hypot(wx - a, wy - b) < t.w / 2 + 3 / ED.z)) return { t: 'p', i }; }
  return null;
}
const edItem = s => s.t === 'o' ? ED.obs[s.i] : s.t === 'p' ? ED.trails[s.i] : s.t === 'a' ? ED.areas[s.i] : ED.lights[s.i];
const edSame = (a, b) => a.t === b.t && a.i === b.i;
function edHandles() { // resize handles for a single selected object or light
  if (ED.sel.length !== 1) return [];
  const s = ED.sel[0], o = edItem(s);
  if (s.t === 'p') return o.pts.map(([x, y], i) => ({ k: 'pt', i, x, y }));
  if (o.poly) return o.poly.map(([x, y], i) => ({ k: 'pt', i, x, y }));
  if (s.t === 'l') return [{ k: 'lr', x: o.x + o.r, y: o.y }];
  if (o.t === 'c') return [{ k: 'r', x: o.x + o.r, y: o.y }];
  if (isRot(o)) return []; // turned objects resize with the gizmo
  const { x, y, w, h } = o; return [['nw', x, y], ['n', x + w / 2, y], ['ne', x + w, y], ['e', x + w, y + h / 2], ['se', x + w, y + h], ['s', x + w / 2, y + h], ['sw', x, y + h], ['w', x, y + h / 2]].map(([k, hx, hy]) => ({ k, x: hx, y: hy }));
}
/* ---- drawing ---- */
function edLoop() {
  ED.raf = requestAnimationFrame(edLoop);
  const c = ED.cv, x = ED.x, d = devicePixelRatio || 1, r = c.getBoundingClientRect();
  if (c.width !== Math.round(r.width * d) || c.height !== Math.round(r.height * d)) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); }
  if (!(ED.z > 0) || !ED.fitted) { if (r.width < 10) return; edFit(); ED.fitted = true; } // first frame with a real size: fit the map
  x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#121014'; x.fillRect(0, 0, c.width, c.height);
  x.setTransform(d * ED.z, 0, 0, d * ED.z, d * ED.px, d * ED.py);
  x.imageSmoothingEnabled = ED.z < 3;
  x.fillStyle = ED.border; x.fillRect(0, 0, W, H);
  if (ED.floorDirty && performance.now() - (ED.floorT || 0) > 90) edFloor(true);
  x.drawImage(ED.floor, 0, 0, W, H);
  x.fillStyle = ED.border; x.fillRect(0, 0, W, B); x.fillRect(0, H - B, W, B); x.fillRect(0, 0, B, H); x.fillRect(W - B, 0, B, H);
  for (const o of ED.obs) { if (o._hide) continue; try { drawObstacle(x, o); } catch (e) { x.fillStyle = o.color || '#888'; o.t === 'r' ? x.fillRect(o.x, o.y, o.w, o.h) : circ(x, o.x, o.y, o.r); }
    if (o.kind === 'tree' || o.kind === 'bush') { x.globalAlpha = .55; x.fillStyle = o.color; circ(x, o.x, o.y, o.r); x.globalAlpha = 1; } }
  if (ED.decorFn) try { ED.decorFn(x); } catch (e) {}
  for (const o of ED.obs) if (o.chance != null && !o._hide) { const b = edBox(o); x.save(); x.setLineDash([4 / ED.z, 3 / ED.z]); x.strokeStyle = '#ffd34d'; x.lineWidth = 1.5 / ED.z; x.strokeRect(b[0] - 2, b[1] - 2, b[2] - b[0] + 4, b[3] - b[1] + 4); x.fillStyle = '#ffd34d'; x.font = `${10 / ED.z}px sans-serif`; x.fillText(o.chance + '%', b[0], b[1] - 4 / ED.z); x.restore(); }
  for (const l of ED.lights) if (!l._hide) try { fixture(x, l); } catch (e) {}
  if (ED.lit) { // night preview: darkness with every light's pool cut out in its own color
    x.save(); x.globalAlpha = .78; x.fillStyle = '#05060c'; x.fillRect(0, 0, W, H); x.globalAlpha = 1; x.globalCompositeOperation = 'lighter';
    const all = [...ED.lights, ...ED.obs.filter(o => o.kind === 'lamp').map(o => ({ x: o.x, y: o.y, r: o.lr || 130, c: o.lc || (o.mast ? LCOL.flood : o.lantern ? LCOL.fire : LCOL.street) }))];
    for (const l of all) { const g = x.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r); const c2 = edLightCol(l); g.addColorStop(0, `rgba(${c2},.55)`); g.addColorStop(.5, `rgba(${c2},.22)`); g.addColorStop(1, `rgba(${c2},0)`); x.fillStyle = g; x.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); }
    x.restore();
  }
  const px = 1 / ED.z;
  if (ED.showGrid && (ED.grid = ED.snaps.move.step) * ED.z >= 6) { // grid, every 4th line stronger
    x.lineWidth = px; const [a0, b0] = edW(0, 0), [a1, b1] = edW(r.width, r.height);
    for (let gx = Math.max(0, Math.floor(a0 / ED.grid) * ED.grid); gx <= Math.min(W, a1); gx += ED.grid) { x.strokeStyle = gx % (ED.grid * 4) ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.14)'; x.beginPath(); x.moveTo(gx, Math.max(0, b0)); x.lineTo(gx, Math.min(H, b1)); x.stroke(); }
    for (let gy = Math.max(0, Math.floor(b0 / ED.grid) * ED.grid); gy <= Math.min(H, b1); gy += ED.grid) { x.strokeStyle = gy % (ED.grid * 4) ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.14)'; x.beginPath(); x.moveTo(Math.max(0, a0), gy); x.lineTo(Math.min(W, a1), gy); x.stroke(); }
  }
  if (XO > 0) { x.setLineDash([6 * px, 6 * px]); x.strokeStyle = 'rgba(255,90,200,.35)'; x.lineWidth = px; for (const sx of [XO, XO + MW]) { x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx, H); x.stroke(); } x.setLineDash([]); }
  // lights: a dot, and the reach of the selected ones
  for (const [i, l] of ED.lights.entries()) { if (l._hide) continue; const on = ED.sel.some(s => s.t === 'l' && s.i === i), c2 = edLightCol(l);
    if (on || ED.lightsLayer) { x.strokeStyle = `rgba(${c2},.7)`; x.lineWidth = px * 1.5; x.setLineDash([5 * px, 4 * px]); x.beginPath(); x.arc(l.x, l.y, l.r, 0, TAU); x.stroke(); x.setLineDash([]); }
    x.fillStyle = `rgb(${c2})`; x.strokeStyle = on ? '#fff' : '#000'; x.lineWidth = px * 2; x.beginPath(); x.arc(l.x, l.y, 7 * px, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = '#000'; x.font = `${9 * px}px sans-serif`; x.textAlign = 'center'; x.fillText('✹', l.x, l.y + 3 * px); }
  for (const s of ED.sel) { if (s.t !== 'o') continue; const o = ED.obs[s.i]; if (!o) continue; const [x0, y0, x1, y1] = edBox(o);
    x.strokeStyle = '#ff4d6a'; x.lineWidth = px * 2; x.setLineDash([]); if (isRot(o)) { const P = obsCorners(o); x.beginPath(); P.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.stroke(); } else if (o.t === 'r') x.strokeRect(x0, y0, x1 - x0, y1 - y0); else { x.beginPath(); x.arc(o.x, o.y, o.r, 0, TAU); x.stroke(); } }
  for (const s of ED.sel) if (s.t === 'p') { const t = ED.trails[s.i]; if (!t) continue; const P = trailPoints(t.pts);
    x.strokeStyle = 'rgba(255,77,106,.9)'; x.lineWidth = px * 2; x.beginPath(); P.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke();
    x.setLineDash([4 * px, 4 * px]); x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = px; for (const off of [-1, 1]) { x.beginPath(); P.forEach(([a, b], k) => { const q = P[Math.min(P.length - 1, k + 1)], r0 = P[Math.max(0, k - 1)], dx = q[0] - r0[0], dy = q[1] - r0[1], L = Math.hypot(dx, dy) || 1, ox = -dy / L * t.w / 2 * off, oy = dx / L * t.w / 2 * off; k ? x.lineTo(a + ox, b + oy) : x.moveTo(a + ox, b + oy); }); x.stroke(); } x.setLineDash([]);
    x.strokeStyle = 'rgba(255,255,255,.25)'; x.beginPath(); t.pts.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); }
  for (const s of ED.sel) if (s.t === 'o' && ED.obs[s.i] && ED.obs[s.i].poly) { const o = ED.obs[s.i]; x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = px; x.beginPath(); o.poly.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.stroke(); }
  if (ED.draft) { const d = ED.draft, mw = ED.mouse ? edW(...ED.mouse).map(v => edSnap(v)) : null, pts = mw ? [...d.pts, mw] : d.pts;
    if (d.kind === 'path' && pts.length > 1) { x.globalAlpha = .55; x.strokeStyle = '#d8c08a'; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = d.w; x.beginPath(); trailPoints(pts).forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); x.globalAlpha = 1; }
    if (d.kind !== 'path' && pts.length > 2) { x.globalAlpha = .5; x.fillStyle = d.kind === 'area' ? x.createPattern(styleTile(ED.areaTex || 'grass'), 'repeat') : '#4aa3df'; const S = smoothClosed(pts); x.beginPath(); S.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill(); x.globalAlpha = 1; }
    x.strokeStyle = '#fff'; x.lineWidth = px * 1.5; x.setLineDash([5 * px, 4 * px]); x.beginPath(); pts.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); x.setLineDash([]);
    for (const [k, [a, b]] of d.pts.entries()) { x.fillStyle = k === 0 && d.kind === 'water' && d.pts.length > 2 ? '#7aff9a' : '#fff'; x.beginPath(); x.arc(a, b, 5 * px, 0, TAU); x.fill(); } }
  for (const h of edHandles()) { x.fillStyle = '#fff'; x.strokeStyle = '#ff4d6a'; x.lineWidth = px * 1.5; if (h.k === 'pt') { x.beginPath(); x.arc(h.x, h.y, 5 * px, 0, TAU); x.fill(); x.stroke(); } else { x.fillRect(h.x - 4 * px, h.y - 4 * px, 8 * px, 8 * px); x.strokeRect(h.x - 4 * px, h.y - 4 * px, 8 * px, 8 * px); } }
  edGizmoDraw(x, px);
  const dr = ED.drag;
  if (dr && (dr.k === 'box' || dr.k === 'wall' || dr.k === 'rect')) { const [ax, ay, bx, by] = [Math.min(dr.x0, dr.x1), Math.min(dr.y0, dr.y1), Math.max(dr.x0, dr.x1), Math.max(dr.y0, dr.y1)];
    x.fillStyle = dr.k === 'box' ? 'rgba(120,170,255,.12)' : 'rgba(255,77,106,.25)'; x.fillRect(ax, ay, bx - ax, by - ay); x.strokeStyle = dr.k === 'box' ? '#7aaaff' : '#ff4d6a'; x.lineWidth = px; x.strokeRect(ax, ay, bx - ax, by - ay);
    x.fillStyle = '#fff'; x.font = `${11 * px}px sans-serif`; x.textAlign = 'left'; x.fillText(`${Math.round(bx - ax)} × ${Math.round(by - ay)}`, bx + 6 * px, by + 12 * px); }
  if (ED.ghost && ED.mouse) { const [mx, my] = edW(...ED.mouse), p = ED.ghost; x.globalAlpha = .6; try { drawObstacle(x, edSample(p, p[2] === 'r' ? edSnap(mx - p[3] / 2) : edSnap(mx), p[2] === 'r' ? edSnap(my - p[4] / 2) : edSnap(my))); } catch (e) {} x.globalAlpha = 1; }
  edStatusBar(r);
  if (ED.mini && ED.mm) edMinimap(r);
}
/* ---- mouse ---- */
function edDown(e) {
  const r = ED.cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, [wx, wy] = edW(sx, sy);
  ED.cv.setPointerCapture(e.pointerId); ED.noSnap = e.altKey;
  const now = performance.now(), dbl = ED.lastDown && now - ED.lastDown[0] < 350 && Math.hypot(sx - ED.lastDown[1], sy - ED.lastDown[2]) < 6; ED.lastDown = dbl ? null : [now, sx, sy]; // pointer events don't count clicks
  if (e.button === 1 || e.button === 2 || ED.space || ED.tool === 'pan') { ED.drag = { k: 'pan', sx, sy, px: ED.px, py: ED.py, btn: e.button, cx: e.clientX, cy: e.clientY, wx, wy }; return; }
  if (ED.tool === 'wall' || ED.tool === 'rect') { ED.drag = { k: ED.tool, x0: edSnap(wx), y0: edSnap(wy), x1: edSnap(wx), y1: edSnap(wy) }; return; }
  if (ED.tool === 'path' || ED.tool === 'water' || ED.tool === 'area') { const pt = [edSnap(wx), edSnap(wy)];
    if (!ED.draft) { ED.draft = { kind: ED.tool, pts: [], w: ED.pathW, style: ED.pathStyle };
      if (ED.tool === 'path') for (const [i, t] of ED.trails.entries()) for (const end of [0, 1]) { const q = end ? t.pts[t.pts.length - 1] : t.pts[0]; if (Math.hypot(q[0] - wx, q[1] - wy) < 14 / ED.z + 4) { ED.draft.extend = { i, end }; ED.draft.w = t.w; ED.draft.style = t.style; ED.draft.pts = [q.slice()]; return; } } } // start at a path's end: carry it on
    const d = ED.draft;
    if (d.kind !== 'path' && d.pts.length > 2 && Math.hypot(d.pts[0][0] - wx, d.pts[0][1] - wy) < 10 / ED.z + 3) return edFinishDraft();
    if (dbl && d.kind === 'path' && d.pts.length > 1) return edFinishDraft();
    d.pts.push(pt); return; }
  if (ED.tool === 'light') { edPush(); ED.lights.push({ x: edSnap(wx), y: edSnap(wy), r: 140, kind: MAPS[ED.map].indoor ? 'fluor' : 'fixed', fix: MAPS[ED.map].indoor ? 'panel' : 'none' }); ED.sel = [{ t: 'l', i: ED.lights.length - 1 }]; edPanel(); return; }
  if (ED.tool === 'prop' && ED.ghost) { const p = ED.ghost; edPush();
    const o = p[2] === 'r' ? R(edSnap(wx - p[3] / 2), edSnap(wy - p[4] / 2), p[3], p[4], p[5], p[1], p[6] && edClone(p[6])) : C(edSnap(wx), edSnap(wy), p[3], p[5], p[1], p[6] && edClone(p[6]));
    ED.obs.push(o); ED.sel = [{ t: 'o', i: ED.obs.length - 1 }]; edPanel(); if (!e.shiftKey) edTool('select'); return; }
  ED.invSnap = e.ctrlKey || e.metaKey;
  if (ED.tool === 'select' && edGizmoDown(sx, sy, wx, wy)) return;
  for (const h of edHandles()) if (Math.abs(wx - h.x) < 7 / ED.z && Math.abs(wy - h.y) < 7 / ED.z) {
    if (h.k === 'pt') { const o = edItem(ED.sel[0]), arr = o.pts || o.poly;
      if (e.altKey || e.button === 2) { if (arr.length > (o.pts ? 2 : 3)) { edPush(); arr.splice(h.i, 1); edShapeChanged(o); } return; } // Alt-click a point: remove it
      edPush(); ED.drag = { k: 'pt', o, i: h.i }; return; }
    edPush(); ED.drag = { k: 'resize', h: h.k, s: ED.sel[0], o0: edClone(edItem(ED.sel[0])) }; return; }
  if (dbl && ED.sel.length === 1) { const o = edItem(ED.sel[0]), arr = o && (o.pts || o.poly); // double-click on the line: add a point there
    if (arr) { let best = -1, bd = 1e9; const n = arr.length, segs = o.pts ? n - 1 : n;
      for (let i = 0; i < segs; i++) { const [ax, ay] = arr[i], [bx, by] = arr[(i + 1) % n], L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1, t = clamp(((wx - ax) * (bx - ax) + (wy - ay) * (by - ay)) / L2, 0, 1), d = Math.hypot(wx - ax - t * (bx - ax), wy - ay - t * (by - ay)); if (d < bd) { bd = d; best = i; } }
      if (best >= 0 && bd < 60 / ED.z + 20) { edPush(); arr.splice(best + 1, 0, [edSnap(wx), edSnap(wy)]); edShapeChanged(o); ED.drag = { k: 'pt', o, i: best + 1 }; return; } } }
  const hit = edHit(wx, wy);
  if (hit) {
    const on = ED.sel.some(s => edSame(s, hit));
    if (e.shiftKey || e.ctrlKey || e.metaKey) ED.sel = on ? ED.sel.filter(s => !edSame(s, hit)) : [...ED.sel, hit];
    else if (!on) ED.sel = [hit];
    edPanel(); if (!ED.sel.length) return;
    if (e.altKey && !on) { /* alt-drag duplicates */ }
    ED.drag = { k: 'move', wx, wy, pushed: false, start: ED.sel.map(s => { const o = edItem(s); return o.pts ? [0, 0, edClone(o.pts)] : o.poly ? [o.x, o.y, edClone(o.poly)] : [o.x, o.y]; }) };
    if (e.altKey) { edDuplicate(0); ED.drag.start = ED.sel.map(s => { const o = edItem(s); return [o.x, o.y]; }); ED.drag.pushed = true; }
    return;
  }
  if (!e.shiftKey) ED.sel = [];
  edPanel(); ED.drag = { k: 'box', x0: wx, y0: wy, x1: wx, y1: wy, add: e.shiftKey };
}
function edMove(e) {
  const r = ED.cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, [wx, wy] = edW(sx, sy);
  ED.mouse = [sx, sy]; ED.noSnap = e.altKey && ED.drag && ED.drag.k !== 'move';
  const d = ED.drag; if (!d) { const h = edHandles().find(h => Math.abs(wx - h.x) < 7 / ED.z && Math.abs(wy - h.y) < 7 / ED.z); ED.cv.style.cursor = ED.space || ED.tool === 'pan' ? 'grab' : h ? (h.k === 'r' || h.k === 'lr' || h.k === 'e' || h.k === 'w' ? 'ew-resize' : h.k === 'n' || h.k === 's' ? 'ns-resize' : h.k === 'nw' || h.k === 'se' ? 'nwse-resize' : 'nesw-resize') : ED.tool === 'select' ? (edHit(wx, wy) ? 'move' : 'default') : 'crosshair'; return; }
  if (d.k === 'pan') { ED.px = d.px + sx - d.sx; ED.py = d.py + sy - d.sy; return; }
  if (d.k === 'gizmo') { ED.invSnap = e.ctrlKey || e.metaKey; edGizmoMove(d, sx, sy, wx, wy, e); return; }
  if (d.k === 'box' || d.k === 'wall' || d.k === 'rect') { d.x1 = d.k === 'box' ? wx : edSnap(wx); d.y1 = d.k === 'box' ? wy : edSnap(wy); return; }
  if (d.k === 'move') {
    let dx = wx - d.wx, dy = wy - d.wy; if (Math.hypot(dx, dy) * ED.z < 3 && !d.moved) return;
    if (!d.pushed) { edPush(); d.pushed = true; } d.moved = true;
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; } // lock to an axis
    ED.invSnap = e.ctrlKey || e.metaKey; const [fx, fy] = d.start[0], snapOn = edSnapOn('move') && !d.start[0][2], nx = snapOn ? edSnap(fx + dx, true) - fx : edSnapOn('move') ? Math.round(dx / ED.snaps.move.step) * ED.snaps.move.step : dx, ny = snapOn ? edSnap(fy + dy, true) - fy : edSnapOn('move') ? Math.round(dy / ED.snaps.move.step) * ED.snaps.move.step : dy;
    ED.sel.forEach((s, k) => { const o = edItem(s), st = d.start[k]; if (st[2]) { const arr = st[2].map(([a, b]) => [a + nx, b + ny]); if (o.pts) o.pts = arr; else { o.poly = arr; polyBounds(o); if (o.tex) ED.floorDirty = true; } if (o.pts) ED.floorDirty = true; } else { o.x = st[0] + nx; o.y = st[1] + ny; } }); edPanelVals(); return;
  }
  if (d.k === 'pt') { const arr = d.o.pts || d.o.poly; arr[d.i] = [edSnap(wx), edSnap(wy)]; edShapeChanged(d.o, true); return; }
  if (d.k === 'resize') {
    const o = edItem(d.s), o0 = d.o0, X = edSnap(wx), Y = edSnap(wy);
    if (d.h === 'r') { o.r = Math.max(2, Math.round(Math.hypot(wx - o.x, wy - o.y))); }
    else if (d.h === 'lr') { o.r = Math.max(20, Math.round(Math.hypot(wx - o.x, wy - o.y))); }
    else { let x0 = o0.x, y0 = o0.y, x1 = o0.x + o0.w, y1 = o0.y + o0.h;
      if (d.h.includes('w')) x0 = Math.min(X, x1 - 2); if (d.h.includes('e')) x1 = Math.max(X, x0 + 2); if (d.h.includes('n')) y0 = Math.min(Y, y1 - 2); if (d.h.includes('s')) y1 = Math.max(Y, y0 + 2);
      o.x = x0; o.y = y0; o.w = x1 - x0; o.h = y1 - y0; }
    edPanelVals();
  }
}
function edUp(e) {
  const d = ED.drag; ED.drag = null; if (!d) return;
  if (d.k === 'pan' && d.btn === 2 && e && Math.hypot(e.clientX - d.cx, e.clientY - d.cy) < 4) return edContext(d.cx, d.cy, d.wx, d.wy); // a right-click that didn't pan
  if (d.k === 'box') { const [ax, ay, bx, by] = [Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.max(d.x0, d.x1), Math.max(d.y0, d.y1)]; if (bx - ax < 2 && by - ay < 2) return;
    const got = []; ED.obs.forEach((o, i) => { const q = edBox(o); if (q[0] < bx && q[2] > ax && q[1] < by && q[3] > ay) got.push({ t: 'o', i }); });
    ED.lights.forEach((l, i) => { if (l.x > ax && l.x < bx && l.y > ay && l.y < by) got.push({ t: 'l', i }); });
    ED.sel = d.add ? [...ED.sel, ...got.filter(g => !ED.sel.some(s => edSame(s, g)))] : got; edPanel(); }
  if (d.k === 'wall' || d.k === 'rect') { let [ax, ay, bx, by] = [Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.max(d.x0, d.x1), Math.max(d.y0, d.y1)];
    if (d.k === 'wall') { const t = ED.wallT; if (bx - ax >= by - ay) { by = ay + t; } else { bx = ax + t; } } // a wall: drag its length, thickness is fixed
    if (bx - ax < 4 || by - ay < 4) return;
    edPush(); const p = ED.rectKind || ['Wall', 'wall', 'r', 0, 0, ED.wallCol];
    ED.obs.push(R(ax, ay, bx - ax, by - ay, d.k === 'wall' ? ED.wallCol : p[5], d.k === 'wall' ? ED.wallKind : p[1], p[6] && edClone(p[6]))); ED.sel = [{ t: 'o', i: ED.obs.length - 1 }]; edPanel(); }
  if (d.k === 'move' && d.moved) edDirty();
  if (d.k === 'gizmo') { edDirty(); if (ED.sel.some(s => s.t === 'p' || s.t === 'a')) edFloor(true); edPanel(); }
  if (d.k === 'resize' || d.k === 'pt') { edDirty(); if (d.o && d.o.pts) edFloor(true); }
  if (d.k === 'move' && d.moved && ED.sel.some(s => s.t === 'p' || s.t === 'a')) edFloor(true);
}
/* ---- commands ---- */
function edDelete() { if (!ED.sel.length) return; edPush(); const ob = new Set(ED.sel.filter(s => s.t === 'o').map(s => s.i)), li = new Set(ED.sel.filter(s => s.t === 'l').map(s => s.i)), pa = new Set(ED.sel.filter(s => s.t === 'p').map(s => s.i)), ar = new Set(ED.sel.filter(s => s.t === 'a').map(s => s.i)); if (pa.size) ED.trails = ED.trails.filter((_, i) => !pa.has(i)); if (ar.size) ED.areas = ED.areas.filter((_, i) => !ar.has(i)); if (pa.size || ar.size) edFloor(true);
  ED.obs = ED.obs.filter((_, i) => !ob.has(i)); ED.lights = ED.lights.filter((_, i) => !li.has(i)); ED.sel = []; edPanel(); }
function edDuplicate(off = 16) { if (!ED.sel.length) return; edPush(); const out = [];
  for (const s of ED.sel) { const c = edClone(edItem(s)); if (s.t === 'p') { c.pts = c.pts.map(([a, b]) => [a + off, b + off]); ED.trails.push(c); out.push({ t: 'p', i: ED.trails.length - 1 }); edFloor(true); continue; } if (s.t === 'a') { c.poly = c.poly.map(([a, b]) => [a + off, b + off]); polyBounds(c); ED.areas.push(c); out.push({ t: 'a', i: ED.areas.length - 1 }); edFloor(true); continue; } c.x += off; c.y += off; if (c.poly) c.poly = c.poly.map(([a, b]) => [a + off, b + off]); if (s.t === 'o') { ED.obs.push(c); out.push({ t: 'o', i: ED.obs.length - 1 }); } else { ED.lights.push(c); out.push({ t: 'l', i: ED.lights.length - 1 }); } }
  ED.sel = out; edPanel(); }
function edCopy() { ED.clip = ED.sel.map(s => ({ t: s.t, v: edClone(edItem(s)) })); edStatus(`Copied ${ED.clip.length}`); }
function edPaste() { if (!ED.clip || !ED.clip.length) return; edPush(); const [mx, my] = ED.mouse ? edW(...ED.mouse) : [W / 2, H / 2];
  const cx = ED.clip.reduce((a, c) => a + c.v.x, 0) / ED.clip.length, cy = ED.clip.reduce((a, c) => a + c.v.y, 0) / ED.clip.length; ED.sel = [];
  for (const c of ED.clip) { const v = edClone(c.v); v.x = edSnap(v.x - cx + mx); v.y = edSnap(v.y - cy + my); if (c.t === 'o') { ED.obs.push(v); ED.sel.push({ t: 'o', i: ED.obs.length - 1 }); } else { ED.lights.push(v); ED.sel.push({ t: 'l', i: ED.lights.length - 1 }); } } edPanel(); }
function edNudge(dx, dy) { if (!ED.sel.length) return; edPush(); for (const s of ED.sel) { const o = edItem(s); if (o.tex) ED.floorDirty = true; if (o.pts) { o.pts = o.pts.map(([a, b]) => [a + dx, b + dy]); ED.floorDirty = true; continue; } o.x += dx; o.y += dy; if (o.poly) o.poly = o.poly.map(([a, b]) => [a + dx, b + dy]); } edPanelVals(); }
function edScale(f, shape) { if (!ED.sel.length) return; edPush(); for (const s of ED.sel) { const o = edItem(s); if (o.pts && !shape) { o.w = clamp(Math.round(o.w * f), 4, 200); ED.floorDirty = true; continue; } const arr = o.pts || o.poly; if (arr) { const cx = arr.reduce((a, p) => a + p[0], 0) / arr.length, cy = arr.reduce((a, p) => a + p[1], 0) / arr.length; arr.forEach(p => { p[0] = cx + (p[0] - cx) * f; p[1] = cy + (p[1] - cy) * f; }); edShapeChanged(o); continue; } if (s.t === 'l' || o.t === 'c') o.r = Math.max(2, Math.round(o.r * f)); else { const cx = o.x + o.w / 2, cy = o.y + o.h / 2; o.w = Math.max(2, Math.round(o.w * f)); o.h = Math.max(2, Math.round(o.h * f)); o.x = cx - o.w / 2; o.y = cy - o.h / 2; } } edPanelVals(); }
let edRotate = function () { if (!ED.sel.length) return; edPush(); for (const s of ED.sel) { const o = edItem(s); const arr = o.pts || o.poly; if (arr) { const cx = arr.reduce((a, p) => a + p[0], 0) / arr.length, cy = arr.reduce((a, p) => a + p[1], 0) / arr.length; arr.forEach(p => { const dx = p[0] - cx, dy = p[1] - cy; p[0] = cx - dy; p[1] = cy + dx; }); edShapeChanged(o); continue; } if (s.t === 'o' && o.t === 'r') { const cx = o.x + o.w / 2, cy = o.y + o.h / 2; [o.w, o.h] = [o.h, o.w]; o.x = cx - o.w / 2; o.y = cy - o.h / 2; if (o.kind === 'desk') o.flip = !o.flip; } } edPanelVals(); }
function edOrder(top) { if (!ED.sel.length) return; edPush(); const ids = ED.sel.filter(s => s.t === 'o').map(s => s.i), picked = ids.map(i => ED.obs[i]), rest = ED.obs.filter((_, i) => !ids.includes(i));
  ED.obs = top ? [...rest, ...picked] : [...picked, ...rest]; ED.sel = picked.map(o => ({ t: 'o', i: ED.obs.indexOf(o) })); edPanel(); }
function edAlign(how) { const os = ED.sel.filter(s => s.t === 'o').map(edItem); if (os.length < 2) return; edPush(); const bx = os.map(edBox);
  const v = { l: Math.min(...bx.map(b => b[0])), r: Math.max(...bx.map(b => b[2])), t: Math.min(...bx.map(b => b[1])), b: Math.max(...bx.map(b => b[3])) };
  os.forEach((o, k) => { const b = bx[k], w = b[2] - b[0], h = b[3] - b[1], off = o.t === 'r' ? 0 : o.r;
    if (how === 'l') o.x = v.l + off; if (how === 'r') o.x = v.r - w + off; if (how === 't') o.y = v.t + (o.t === 'r' ? 0 : o.r); if (how === 'b') o.y = v.b - h + (o.t === 'r' ? 0 : o.r);
    if (how === 'cx') o.x = (v.l + v.r) / 2 - w / 2 + off; if (how === 'cy') o.y = (v.t + v.b) / 2 - h / 2 + (o.t === 'r' ? 0 : o.r); });
  edPanelVals(); }
function edTool(t, prop) { if (ED.draft && t !== ED.draft.kind) edFinishDraft(); ED.tool = t; ED.ghost = t === 'prop' ? prop : null; ED.root.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t)); ED.root.querySelectorAll('.edprop').forEach(b => b.classList.toggle('on', t === 'prop' && b.dataset.p == ED_PROPS.indexOf(prop))); }
/* ---- keys ---- */
function edKey(e) {
  if (!ED.open) return;
  const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'select' || tag === 'textarea') { if (e.key === 'Escape') e.target.blur(); return; }
  e.stopPropagation(); const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey, step = e.shiftKey ? 10 : 1;
  if (e.type === 'keyup') { if (e.code === 'Space') ED.space = false; return; }
  if (e.code === 'Space') { ED.space = true; e.preventDefault(); return; }
  if (mod && k === 'z') { e.preventDefault(); edUndo(e.shiftKey ? 1 : -1); return; } if (mod && k === 'y') { e.preventDefault(); edUndo(1); return; }
  if (mod && k === 'd') { e.preventDefault(); edDuplicate(); return; } if (mod && k === 'c') { edCopy(); return; } if (mod && k === 'v') { edPaste(); return; }
  if (mod && k === 's') { e.preventDefault(); e.shiftKey ? edSaveAs() : edSave(); return; }
  if (mod && k === 'o') { e.preventDefault(); edLibrary(); return; }
  if (mod && k === 'l') { e.preventDefault(); edFlagSel('_lock'); return; } if (mod && k === 'h') { e.preventDefault(); edFlagSel('_hide'); return; } if (mod && k === 'a') { e.preventDefault(); ED.sel = ED.obs.map((_, i) => ({ t: 'o', i })); edPanel(); return; }
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); edDelete(); return; }
  if (k === 'escape' && document.querySelector('.edpop')) { document.querySelectorAll('.edpop').forEach(p => p.remove()); return; }
  if (k === 'enter' && ED.draft) { edFinishDraft(); return; }
  if (k === 'escape' && ED.draft) { ED.draft = null; return; }
  if (k === 'escape') { if (ED.sel.length || ED.tool !== 'select') { ED.sel = []; edTool('select'); edPanel(); } else closeEditor(); return; }
  if (k.startsWith('arrow')) { e.preventDefault(); const st = ED.snaps.move.on ? ED.snaps.move.step * (e.shiftKey ? 4 : 1) : step; edNudge(k === 'arrowleft' ? -st : k === 'arrowright' ? st : 0, k === 'arrowup' ? -st : k === 'arrowdown' ? st : 0); return; }
  const map = { v: () => edTool('select'), w: () => edTool('wall'), b: () => edTool('rect'), l: () => edTool('light'), h: () => edToggle('help'), m: () => edToggle('mini'), g: () => edToggle('showGrid'), s: () => { ED.snaps.move.on = !ED.snaps.move.on; edSaveSnaps(); const c = ED.root.querySelector('[data-sn="move"]'); c.checked = ED.snaps.move.on; c.parentElement.classList.toggle('on', ED.snaps.move.on); }, n: () => edToggle('lit'), o: () => edToggle('lightsLayer'),
    q: () => edRotateBy(e.shiftKey ? -ED.snaps.rot.step : ED.snaps.rot.step), a: edAddPointKey, e: edEndPathKey, ']': () => edScale(1 + ED.snaps.scale.step / 100 * (e.shiftKey ? 2.5 : 1), e.shiftKey), '[': () => edScale(1 / (1 + ED.snaps.scale.step / 100 * (e.shiftKey ? 2.5 : 1)), e.shiftKey), '{': () => edScale(.8, true), '}': () => edScale(1.25, true), t: () => edTool('path'), y: () => edTool('water'), u: () => edTool('area'), '=': () => edZoomC(1.25), '+': () => edZoomC(1.25), '-': () => edZoomC(.8), '0': edFit, f: edFocus, p: () => closeEditor(true) };
  if (map[k]) { e.preventDefault(); map[k](); }
}
function edZoomC(f) { const r = ED.cv.getBoundingClientRect(); edZoom(f, r.width / 2, r.height / 2); }
function edFocus() { if (!ED.sel.length) return edFit(); const bx = ED.sel.map(s => s.t === 'l' ? [edItem(s).x - edItem(s).r, edItem(s).y - edItem(s).r, edItem(s).x + edItem(s).r, edItem(s).y + edItem(s).r] : edBox(edItem(s)));
  const x0 = Math.min(...bx.map(b => b[0])), y0 = Math.min(...bx.map(b => b[1])), x1 = Math.max(...bx.map(b => b[2])), y1 = Math.max(...bx.map(b => b[3])), r = ED.cv.getBoundingClientRect();
  ED.z = clamp(Math.min(r.width / (x1 - x0 + 80), r.height / (y1 - y0 + 80)), .15, 24); ED.px = r.width / 2 - (x0 + x1) / 2 * ED.z; ED.py = r.height / 2 - (y0 + y1) / 2 * ED.z; }
function edToggle(k) { ED[k] = !ED[k]; if (k === 'mini' && ED.mm) ED.mm.style.display = ED.mini ? '' : 'none';
  if (k === 'help') { try { localStorage.setItem('snakeEdHelp', ED.help ? '1' : '0'); } catch (e) {} ED.root.querySelector('.edhelpbtn').style.display = ED.help ? 'none' : ''; } ED.root.querySelectorAll(`[data-tg="${k}"]`).forEach(b => b.classList.toggle('on', !!ED[k])); if (k === 'help') ED.root.querySelector('.edhelp').style.display = ED.help ? '' : 'none'; }
function edStatus(t) { if (ED.stat) ED.stat.textContent = t; }
/* ---- UI ---- */
const ED_ICON = { // small line icons for the toolbar and menus
  area: 'M4 6l7-3 9 4-2 11-9 3-5-6z',
  select: 'M5 3l13 8-6 1.5L9 19z', wall: 'M3 9h18v6H3z', rect: 'M4 5h16v14H4z', path: 'M4 19c3-9 6-2 8-8s5-5 8-6', water: 'M12 3c4 5 7 8 7 12a7 7 0 01-14 0c0-4 3-7 7-12z', light: 'M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0012 3z', pan: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  grid: 'M4 4h16v16H4zM4 10h16M4 16h16M10 4v16M16 4v16', night: 'M20 14A8 8 0 0110 4a8 8 0 1010 10z', reach: 'M12 12m-8 0a8 8 0 1016 0 8 8 0 10-16 0M12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0', help: 'M12 21a9 9 0 110-18 9 9 0 010 18zM9.5 9a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01',
  undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3', redo: 'M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3', play: 'M7 4l13 8-13 8z', share: 'M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13', exit: 'M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 17l-5-5 5-5M5 12h11',
  props: 'M4 7l8-4 8 4-8 4zM4 7v10l8 4 8-4V7', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0', lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3', map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14', mini: 'M3 5h18v14H3zM13 11h6v6h-6z',
};
const edSvg = (k, s = 16) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ED_ICON[k]}"/></svg>`;
const ED_TOOLS = [['select', 'Select / move', 'V'], ['wall', 'Draw wall', 'W'], ['rect', 'Draw block', 'B'], ['path', 'Draw path', 'T'], ['water', 'Draw water', 'Y'], ['area', 'Floor area', 'U'], ['light', 'Add light', 'L'], ['pan', 'Pan', 'Space']];
const ED_MENUS = {
  File: [['save', 'Save', 'Ctrl+S'], ['saveas', 'Save a copy as…', 'Ctrl+Shift+S'], ['library', 'My saved maps…', 'Ctrl+O'], '-', ['dlmap', 'Download this map as a file'], ['openfile', 'Open a map file…'], '-', ['apply', 'Use in my game'], ['unapply', 'Go back to the original in my game'], '-', ['share', 'Share…'], ['export', 'Download edits file'], ['import', 'Import…'], '-', ['reset', 'Reset this map…'], '-', ['play', 'Play test', 'P'], ['exit', 'Exit editor', 'Esc']],
  Edit: [['undo', 'Undo', 'Ctrl+Z'], ['redo', 'Redo', 'Ctrl+Y'], '-', ['copy', 'Copy', 'Ctrl+C'], ['paste', 'Paste', 'Ctrl+V'], ['dup', 'Duplicate', 'Ctrl+D'], ['del', 'Delete', 'Del'], '-', ['all', 'Select all', 'Ctrl+A'], ['none', 'Select none', 'Esc'], '-', ['lock', 'Lock / unlock selection', 'Ctrl+L'], ['hide', 'Hide / show selection', 'Ctrl+H'], ['unhideall', 'Show everything']],
  View: [['fit', 'Fit map', '0'], ['focus', 'Focus selection', 'F'], ['zin', 'Zoom in', '+'], ['zout', 'Zoom out', '-'], '-', ['tg:showGrid', 'Grid', 'G'], ['tg:lit', 'Night preview', 'N'], ['tg:lightsLayer', 'Light reach', 'O'], ['tg:mini', 'Minimap', 'M'], ['tg:help', 'Controls', 'H']],
  Tools: [...[['select', 'Select / move', 'V'], ['wall', 'Draw wall', 'W'], ['rect', 'Draw block', 'B'], ['path', 'Draw path', 'T'], ['water', 'Draw water', 'Y'], ['light', 'Add light', 'L']].map(([t, n, k]) => ['tool:' + t, n, k]), '-', ['propEd', 'Prop editor…']],
};
function edCmd(c) {
  if (c.startsWith('tool:')) return edTool(c.slice(5)); if (c.startsWith('tg:')) return edToggle(c.slice(3));
  const A = { apply: edApply, unapply: edUnapply, saveas: edSaveAs, library: edLibrary, dlmap: edDownloadMap, openfile: () => edOpenFile(), save: edSave, share: () => edShare(), export: edExport, import: () => ED.root.querySelector('.edimp input').click(), reset: edReset, play: () => closeEditor(true), exit: () => closeEditor(),
    undo: () => edUndo(-1), redo: () => edUndo(1), copy: edCopy, paste: edPaste, dup: () => edDuplicate(), del: edDelete, all: () => { ED.sel = [...ED.obs.map((o, i) => ({ t: 'o', i })), ...ED.lights.map((l, i) => ({ t: 'l', i })), ...ED.trails.map((t, i) => ({ t: 'p', i }))].filter(s => !edItem(s)._lock && !edItem(s)._hide); edPanel(); }, none: () => { ED.sel = []; edPanel(); },
    lock: () => edFlagSel('_lock'), hide: () => edFlagSel('_hide'), unhideall: () => { edPush(); for (const o of [...ED.obs, ...ED.lights, ...ED.trails]) delete o._hide; edFloor(true); edLayers(); },
    fit: edFit, focus: edFocus, zin: () => edZoomC(1.25), zout: () => edZoomC(.8), propEd: () => openPropEditor(ED.sel.length === 1 && ED.sel[0].t === 'o' ? edItem(ED.sel[0]).kind : 'tree') };
  if (A[c]) A[c]();
}
function edFlagSel(f) { if (!ED.sel.length) return; edPush(); const on = !ED.sel.every(s => edItem(s)[f]); for (const s of ED.sel) { const o = edItem(s); if (on) o[f] = true; else delete o[f]; } if (f === '_hide' && ED.sel.some(s => s.t === 'p')) edFloor(true); if (on) ED.sel = []; edPanel(); edStatus(on ? (f === '_lock' ? 'Locked: it can no longer be clicked on the map (unlock it in Layers)' : 'Hidden in the editor (it is still in the game)') : 'Done'); }
function edBuildUI() {
  const m = MAPS[ED.map], walls = curPre.filter(o => o.kind === 'wall'); ED.wallCol = walls.length ? walls[0].color : m.indoor ? '#6d6875' : '#8b6b45'; ED.wallKind = m.indoor || walls.length ? 'wall' : 'fence'; ED.wallT = ED.wallKind === 'wall' ? 14 : 6;
  if (ED.mini === undefined) ED.mini = true; ED.rtab = ED.rtab || 'props'; ED.ltab = ED.ltab || 'props';
  const root = ED.root = document.createElement('div'); root.id = 'editor';
  root.innerHTML = `<div class="edbar"><div class="edbrand">${edSvg('map', 18)}<b>Map Editor</b></div>
      <nav class="edmenus">${Object.keys(ED_MENUS).map(n => `<div class="edmenu"><button class="edmb">${n}</button><div class="edmlist">${ED_MENUS[n].map(it => it === '-' ? '<hr>' : `<button data-cmd="${it[0]}"><span>${it[1]}</span>${it[2] ? `<kbd>${it[2]}</kbd>` : ''}</button>`).join('')}</div></div>`).join('')}</nav>
      <label class="edmapsel">${edSvg('map', 14)}<select class="edmap">${MAPS.map((mm, i) => `<option value="${i}" ${i === ED.map ? 'selected' : ''}>${mm.name}</option>`).join('')}</select></label>
      <span class="edsp"></span>
      <button class="edib edundo" title="Undo (Ctrl+Z)">${edSvg('undo')}</button><button class="edib edredo" title="Redo (Ctrl+Y)">${edSvg('redo')}</button>
      <button class="edsave edghost" title="Save (Ctrl+S)">Save</button><label class="edimp" hidden><input type="file" accept=".js,.json,.txt" hidden></label>
      <button class="edshare edghost" title="Share your edits">${edSvg('share', 14)} Share</button><button class="edexp" hidden></button><button class="edreset" hidden></button>
      <button class="edplay edprimary" title="Play test (P)">${edSvg('play', 14)} Play test</button><button class="edclose edib" title="Exit (Esc)">${edSvg('exit')}</button></div>
    <div class="edtools"><div class="edtgrp">${ED_TOOLS.map(([t, n, k]) => `<button data-tool="${t}" class="edtool" title="${n} (${k})">${edSvg(t)}<span>${n}</span></button>`).join('')}</div>
      <div class="edtgrp">${[['showGrid', 'grid', 'Grid (G)'], ['lit', 'night', 'Night preview (N)'], ['lightsLayer', 'reach', 'Light reach (O)'], ['mini', 'mini', 'Minimap (M)'], ['help', 'help', 'Controls (H)']].map(([t, ic, n]) => `<button data-tg="${t}" class="edtool icon ${ED[t] ? 'on' : ''}" title="${n}">${edSvg(ic)}</button>`).join('')}</div>
      <div class="edtgrp edsnaps"><span class="edlbl">Snap</span>${[['move', 'Move', 'px'], ['rot', 'Rotate', '°'], ['scale', 'Scale', '%']].map(([k, n, u]) => `<label class="edsn ${ED.snaps[k].on ? 'on' : ''}" title="${n} snapping: tick to turn it on and set the step. Ctrl flips it while dragging"><input type="checkbox" data-sn="${k}" ${ED.snaps[k].on ? 'checked' : ''}>${n}<input type="number" data-snv="${k}" value="${ED.snaps[k].step}" min="${k === 'move' ? 1 : .5}" max="${k === 'rot' ? 180 : 200}" step="${k === 'move' ? 1 : .5}"><i>${u}</i></label>`).join('')}</div>
      <div class="edtgrp"><button class="edpe edghost" title="Change a whole kind of prop">${edSvg('props', 14)} Prop editor</button></div></div>
    <div class="edbody"><aside class="edleft"><div class="edtabs">${[['props', 'Props'], ['paths', 'Paths'], ['walls', 'Walls'], ['water', 'Water'], ['floor', 'Floor']].map(([k, n]) => `<button data-lt="${k}" class="${ED.ltab === k ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div class="edlt" data-lt="props"><input class="edsearch edpsearch" placeholder="Search props…"><div class="edprops">${ED_PROPS.map((p, i) => `<button class="edprop" data-p="${i}" title="${p[0]}: click, then click the map (Shift keeps placing)"><canvas width="68" height="68"></canvas><span>${p[0]}</span></button>`).join('')}</div></div>
        <div class="edlt" data-lt="paths"><p class="edhint">Press <kbd>T</kbd> (or pick a style), then click points. <kbd>A</kbd> adds a point at the cursor, <kbd>E</kbd> or Enter ends it. Start on a path's end to extend it. Paths of one style merge where they meet.</p><div class="edrow"><label>Style <button class="edpick edps-btn"></button></label><label>Width <input type="number" class="edpw" value="${ED.pathW}" min="4" max="200"></label></div><button class="edghost edwide" data-tool="path">${edSvg('path', 14)} Draw a path</button></div>
        <div class="edlt" data-lt="walls"><p class="edhint">Press <kbd>W</kbd> and drag along the wall's length. Thickness stays fixed. <kbd>B</kbd> draws a free-size block.</p><div class="edrow"><label>Kind <select class="edwk">${['wall', 'fence', 'hedge', 'glass', 'building'].map(k => `<option ${k === ED.wallKind ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
          <label>Thickness <input type="number" class="edwt" value="${ED.wallT}" min="2" max="80"></label><label>Color <input type="color" class="edwc" value="${edHex(ED.wallCol)}"></label></div><button class="edghost edwide" data-tool="wall">${edSvg('wall', 14)} Draw a wall</button></div>
        <div class="edlt" data-lt="water"><p class="edhint">Press <kbd>Y</kbd> and click points round the shape. Click the first point (or press Enter) to fill it. Drag points later to reshape; double-click an edge to add one.</p><button class="edghost edwide" data-tool="water">${edSvg('water', 14)} Draw water</button></div>
        <div class="edlt" data-lt="floor"><p class="edhint">Floor areas repaint the ground in any shape: press <kbd>U</kbd>, click points round it, click the first point (or Enter) to fill. Draw one over a road, lawn or floor to change its texture. Edit the points later like water.</p>
          <div class="edrow"><label>Texture <button class="edpick edat-btn"></button></label></div><button class="edghost edwide" data-tool="area">${edSvg('area', 14)} Draw a floor area</button>
          <h4>Whole map ground</h4><p class="edhint">Replace the map's entire painted ground (roads, lawns, markings and all) with one texture. Your floor areas and paths go on top.</p><div class="edrow"><label>Ground <button class="edpick edbase-btn"></button></label></div></div></aside>
      <main class="edview"><canvas class="edmain"></canvas><div class="edkeys"></div><canvas class="edminimap" width="220" height="120" title="Click or drag to move the view"></canvas>
        <button class="edhelpbtn edghost" title="Show controls (H)">${edSvg('help', 14)} Controls</button><div class="edhelp"><button class="edhelpx" title="Hide (H)">×</button><b>Controls</b>
          <p><kbd>Wheel</kbd> zoom · <kbd>Space</kbd>/<kbd>Middle</kbd>/<kbd>Right</kbd>-drag pan · <kbd>0</kbd> fit · <kbd>F</kbd> focus · right-click for actions</p>
          <p><kbd>Click</kbd> select · <kbd>Shift</kbd>+click add · drag empty space to box-select · <kbd>Ctrl+A</kbd> all</p>
          <p>Gizmo: <b style="color:#ff5a5a">red</b>/<b style="color:#5aff7a">green</b> arrows move on an axis, yellow square moves freely, cubes scale (white: evenly), ring rotates · <kbd>Ctrl</kbd> flips snapping</p>
          <p><kbd>Arrows</kbd> nudge · <kbd>[</kbd><kbd>]</kbd> size · <kbd>Q</kbd> rotate · <kbd>Alt</kbd>+drag duplicates</p>
          <p><kbd>Del</kbd> delete · <kbd>Ctrl+D</kbd> duplicate · <kbd>Ctrl+C</kbd>/<kbd>V</kbd> copy/paste · <kbd>Ctrl+Z</kbd>/<kbd>Y</kbd> undo/redo · <kbd>Ctrl+L</kbd> lock · <kbd>Ctrl+H</kbd> hide</p>
          <p><kbd>T</kbd> path · <kbd>Y</kbd> water · <kbd>A</kbd> add point · <kbd>E</kbd> end path · <kbd>Alt</kbd>+click a point removes it · double-click a line adds one</p>
          <p><kbd>U</kbd> floor area · <kbd>W</kbd> wall · <kbd>B</kbd> block · <kbd>L</kbd> light · <kbd>N</kbd> night · <kbd>M</kbd> minimap · <kbd>P</kbd> play test · <kbd>Esc</kbd> deselect / exit</p></div></main>
      <aside class="edright2"><div class="edtabs">${[['props', 'Properties'], ['layers', 'Layers']].map(([k, n]) => `<button data-rt="${k}" class="${ED.rtab === k ? 'on' : ''}">${n}</button>`).join('')}</div><div class="edpanel"></div><div class="edlayers"></div></aside></div>
    <footer class="edstatus"><span class="edst-tool"></span><span class="edst-sel"></span><span class="edcoords"></span><span class="edsp"></span><span class="edstat">Edits save in this browser automatically</span>
      <span class="edzoom"><button data-cmd="zout">−</button><span class="edzv">100%</span><button data-cmd="zin">+</button><button data-cmd="fit" title="Fit (0)">Fit</button></span></footer>`;
  document.body.appendChild(root);
  ED.cv = root.querySelector('.edmain'); ED.x = ED.cv.getContext('2d'); ED.coords = root.querySelector('.edcoords'); ED.stat = root.querySelector('.edstat'); ED.mm = root.querySelector('.edminimap'); ED.mm.getContext('2d', { willReadFrequently: true });
  ED.cv.addEventListener('pointerdown', edDown); ED.cv.addEventListener('pointermove', edMove); ED.cv.addEventListener('pointerup', edUp); ED.cv.addEventListener('pointercancel', edUp);
  ED.cv.addEventListener('pointerleave', () => { ED.mouse = null; }); ED.cv.addEventListener('contextmenu', e => e.preventDefault());
  ED.cv.addEventListener('wheel', e => { e.preventDefault(); const r = ED.cv.getBoundingClientRect(); if (e.ctrlKey || !e.shiftKey && Math.abs(e.deltaX) < 1) edZoom(Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0018)), e.clientX - r.left, e.clientY - r.top); else { ED.px -= e.deltaX || e.deltaY; } }, { passive: false });
  const mmGo = e => { const r = ED.mm.getBoundingClientRect(), s = Math.min(r.width / W, r.height / H), vr = ED.cv.getBoundingClientRect(), wx = (e.clientX - r.left) / s, wy = (e.clientY - r.top) / s; ED.px = vr.width / 2 - wx * ED.z; ED.py = vr.height / 2 - wy * ED.z; };
  ED.mm.onpointerdown = e => { ED.mm.setPointerCapture(e.pointerId); mmGo(e); ED.mm.onpointermove = mmGo; }; ED.mm.onpointerup = () => { ED.mm.onpointermove = null; };
  root.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => edTool(b.dataset.tool));
  root.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => edToggle(b.dataset.tg));
  root.querySelectorAll('[data-cmd]').forEach(b => b.onclick = () => { root.querySelectorAll('.edmenu.open').forEach(m => m.classList.remove('open')); edCmd(b.dataset.cmd); });
  root.querySelectorAll('.edmb').forEach(b => { b.onclick = () => { const m = b.parentElement, was = m.classList.contains('open'); root.querySelectorAll('.edmenu.open').forEach(x => x.classList.remove('open')); if (!was) m.classList.add('open'); }; b.onpointerenter = () => { if (root.querySelector('.edmenu.open') && !b.parentElement.classList.contains('open')) { root.querySelectorAll('.edmenu.open').forEach(x => x.classList.remove('open')); b.parentElement.classList.add('open'); } }; });
  root.addEventListener('pointerdown', e => { if (!e.target.closest('.edmenu')) root.querySelectorAll('.edmenu.open').forEach(m => m.classList.remove('open')); }, true);
  const setL = k => { ED.ltab = k; root.querySelectorAll('[data-lt]').forEach(b => b.classList.toggle('on', b.dataset.lt === k)); root.querySelectorAll('.edlt').forEach(d => d.style.display = d.dataset.lt === k ? '' : 'none'); };
  root.querySelectorAll('.edtabs [data-lt]').forEach(b => b.onclick = () => setL(b.dataset.lt)); setL(ED.ltab);
  const setR = k => { ED.rtab = k; root.querySelectorAll('[data-rt]').forEach(b => b.classList.toggle('on', b.dataset.rt === k)); root.querySelector('.edpanel').style.display = k === 'props' ? '' : 'none'; root.querySelector('.edlayers').style.display = k === 'layers' ? '' : 'none'; if (k === 'layers') edLayers(); };
  root.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => setR(b.dataset.rt)); ED.setR = setR; setR(ED.rtab);
  root.querySelector('.edpsearch').oninput = e => { const q = e.target.value.toLowerCase(); root.querySelectorAll('.edprop').forEach(b => { const p = ED_PROPS[+b.dataset.p]; b.style.display = (p[0] + ' ' + p[1]).toLowerCase().includes(q) ? '' : 'none'; }); };
  root.querySelectorAll('.edprop').forEach(b => b.onclick = () => edTool('prop', ED_PROPS[+b.dataset.p]));
  const atb = root.querySelector('.edat-btn'), atSet = () => edPickBtn(atb, 'floor', ED.areaTex || 'grass'); atSet(); atb.onclick = () => edPicker(atb, 'floor', ED.areaTex || 'grass', v => { ED.areaTex = v; atSet(); edTool('area'); });
  const bab = root.querySelector('.edbase-btn'), baSet = () => edPickBtn(bab, 'base', ED.base || ''); baSet(); bab.onclick = () => edPicker(bab, 'base', ED.base || '', v => { edPush(); ED.base = v; baSet(); edFloor(true); });
  const psb = root.querySelector('.edps-btn'); const psSet = () => edPickBtn(psb, 'style', ED.pathStyle); psSet(); psb.onclick = () => edPicker(psb, 'style', ED.pathStyle, v => { ED.pathStyle = v; psSet(); edTool('path'); }); root.querySelector('.edpw').onchange = e => { ED.pathW = clamp(+e.target.value || 20, 4, 200); };
  root.querySelectorAll('[data-sn]').forEach(c => c.onchange = () => { ED.snaps[c.dataset.sn].on = c.checked; c.parentElement.classList.toggle('on', c.checked); edSaveSnaps(); });
  root.querySelectorAll('[data-snv]').forEach(c => c.onchange = () => { ED.snaps[c.dataset.snv].step = Math.max(+c.min, +c.value || 1); c.value = ED.snaps[c.dataset.snv].step; ED.grid = ED.snaps.move.step; edSaveSnaps(); });
  root.querySelector('.edwk').onchange = e => { ED.wallKind = e.target.value; const p = ED_PROPS.find(p => p[1] === ED.wallKind); if (p) { ED.wallCol = p[5]; ED.wallT = Math.min(p[3], p[4]) || 14; root.querySelector('.edwc').value = edHex(ED.wallCol); root.querySelector('.edwt').value = ED.wallT; } edTool('wall'); };
  root.querySelector('.edwt').onchange = e => { ED.wallT = clamp(+e.target.value || 14, 2, 80); };
  root.querySelector('.edwc').oninput = e => { ED.wallCol = e.target.value; };
  root.querySelector('.edundo').onclick = () => edUndo(-1); root.querySelector('.edredo').onclick = () => edUndo(1);
  root.querySelector('.edsave').onclick = edSave; root.querySelector('.edshare').onclick = () => edShare();
  root.querySelector('.edimp input').onchange = e => e.target.files[0] && edImport(e.target.files[0]);
  root.querySelector('.edplay').onclick = () => closeEditor(true); root.querySelector('.edclose').onclick = () => closeEditor();
  root.querySelector('.edmap').onchange = e => { if (ED.dirtySave) edSave(); const i = +e.target.value; cancelAnimationFrame(ED.raf); root.remove(); removeEventListener('keydown', edKey, true); removeEventListener('keyup', edKey, true); openEditor(i); };
  addEventListener('keydown', edKey, true); addEventListener('keyup', edKey, true);
  root.querySelector('.edpe').onclick = () => edCmd('propEd');
  { // the controls panel: drag it by its title, resize it from the corner; both remembered
    const h = root.querySelector('.edhelp'), t = h.querySelector('b'); t.classList.add('edhdrag'); t.title = 'Drag to move';
    try { const g = JSON.parse(localStorage.getItem('snakeEdHelpBox')); if (g) { h.style.left = g.l + 'px'; h.style.setProperty('top', g.t + 'px', 'important'); h.style.width = g.w + 'px'; if (g.h) h.style.height = g.h + 'px'; } } catch (e) {}
    const keep = () => { const v = root.querySelector('.edview').getBoundingClientRect(), r = h.getBoundingClientRect();
      const l = clamp(r.left - v.left, 0, Math.max(0, v.width - 80)), tp = clamp(r.top - v.top, 0, Math.max(0, v.height - 40)); h.style.left = l + 'px'; h.style.setProperty('top', tp + 'px', 'important');
      try { localStorage.setItem('snakeEdHelpBox', JSON.stringify({ l, t: tp, w: r.width, h: h.style.height ? r.height : 0 })); } catch (e) {} };
    t.onpointerdown = e => { e.preventDefault(); t.setPointerCapture(e.pointerId); const v = root.querySelector('.edview').getBoundingClientRect(), r = h.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
      t.onpointermove = ev => { h.style.left = clamp(ev.clientX - v.left - ox, 0, v.width - 80) + 'px'; h.style.setProperty('top', clamp(ev.clientY - v.top - oy, 0, v.height - 40) + 'px', 'important'); h.style.right = 'auto'; };
      t.onpointerup = () => { t.onpointermove = null; keep(); }; };
    new ResizeObserver(() => { if (h.offsetWidth) { clearTimeout(h._t); h._t = setTimeout(keep, 200); } }).observe(h);
  }
  root.querySelector('.edhelpx').onclick = () => edToggle('help'); root.querySelector('.edhelpbtn').onclick = () => edToggle('help');
  try { if (localStorage.getItem('snakeEdHelp') === '0') { ED.help = true; edToggle('help'); } else root.querySelector('.edhelpbtn').style.display = 'none'; } catch (e) {}
  edPreviews(); edTool('select'); edPanel();
}
/* properties of the selection */
function edPanel() {
  if (ED.rtab === 'layers') edLayers();
  const p = ED.root && ED.root.querySelector('.edpanel'); if (!p) return;
  if (!ED.sel.length) { p.innerHTML = `<h4>Nothing selected</h4><p class="edmuted">Click an object or a light (✹) to edit it. Drag on empty space to select many.</p><h4>Map</h4><p class="edmuted">${MAPS[ED.map].name} · world ${W} × ${H}${XO ? ` · the dashed pink lines mark the original map's edges` : ''}</p>`; return; }
  if (ED.sel.length > 1) { p.innerHTML = `<h4>${ED.sel.length} selected</h4><div class="edbtns"><button data-a="dup">Duplicate</button><button data-a="del">Delete</button><button data-a="rot">Rotate 90°</button><button data-a="up">Bigger</button><button data-a="dn">Smaller</button></div>
      <h4>Align</h4><div class="edbtns">${[['l', 'Left'], ['cx', 'Centre ↔'], ['r', 'Right'], ['t', 'Top'], ['cy', 'Middle ↕'], ['b', 'Bottom']].map(([k, n]) => `<button data-al="${k}">${n}</button>`).join('')}</div>
      <h4>Color all</h4><input type="color" class="edallc" value="${edHex(edItem(ED.sel[0]).color || '#888888')}">`;
    edPanelBtns(p); p.querySelector('.edallc').oninput = e => { if (!p._pushed) { edPush(); p._pushed = true; } for (const s of ED.sel) if (s.t === 'o') edItem(s).color = e.target.value; else edItem(s).c = edRgb(e.target.value); };
    p.querySelectorAll('[data-al]').forEach(b => b.onclick = () => edAlign(b.dataset.al)); return; }
  const s0 = ED.sel[0];
  if (s0.t === 'p') { const t = edItem(s0);
    p.innerHTML = `<h4>Path</h4><label>Style <button class="edpick pst"></button></label>
      <label>Width <input type="range" class="pwr" min="4" max="200" value="${t.w}"><output>${t.w}</output></label>
      <p class="edmuted">${t.pts.length} points. Drag a point to bend the path, double-click the line to add a point, Alt-click a point to remove it. Start a new path on one of its ends (T) to extend it. Overlapping paths of the same style merge into one.</p>
      <div class="edbtns"><button data-a="dup">Duplicate</button><button data-a="del">Delete</button><button class="prev">Reverse</button></div>`;
    const pb = p.querySelector('.pst'); edPickBtn(pb, 'style', t.style || 'dirt'); pb.onclick = () => edPicker(pb, 'style', t.style || 'dirt', v => { edPush(); t.style = v; edFloor(true); edPanel(); });
    const r = p.querySelector('.pwr'); r.oninput = () => { if (!r._p) { edPush(); r._p = true; } t.w = +r.value; r.nextElementSibling.textContent = r.value; ED.floorDirty = true; }; r.onchange = () => { r._p = false; edFloor(true); edDirty(); };
    p.querySelector('.prev').onclick = () => { edPush(); t.pts.reverse(); edFloor(true); };
    edPanelBtns(p); return; }
  if (s0.t === 'a') { const a = edItem(s0);
    p.innerHTML = `<h4>Floor area</h4><label>Texture <button class="edpick atex"></button></label><label class="edck"><input type="checkbox" class="ash" ${a.sharp ? 'checked' : ''}> Sharp corners</label><label class="edck"><input type="checkbox" class="aed" ${a.edge === false ? '' : 'checked'}> Soft dark edge</label>
      <p class="edmuted">${a.poly.length} points. Drag points to reshape, double-click the edge to add one, Alt-click to remove one.</p><div class="edbtns"><button data-a="dup">Duplicate</button><button data-a="del">Delete</button></div>`;
    const tb = p.querySelector('.atex'); edPickBtn(tb, 'floor', a.tex || 'grass'); tb.onclick = () => edPicker(tb, 'floor', a.tex || 'grass', v => { edPush(); a.tex = v; edFloor(true); edPanel(); });
    p.querySelector('.ash').onchange = e => { edPush(); a.sharp = e.target.checked; edFloor(true); }; p.querySelector('.aed').onchange = e => { edPush(); a.edge = e.target.checked; edFloor(true); };
    edPanelBtns(p); return; }
  if (s0.t === 'o' && edItem(s0).poly) { const o = edItem(s0);
    p.innerHTML = `<h4>Water</h4><label>Color <input type="color" class="wcol" value="${edHex(o.color)}"></label><label class="edck"><input type="checkbox" class="wsh" ${o.sharp ? 'checked' : ''}> Sharp corners (no smoothing)</label>
      <p class="edmuted">${o.poly.length} points. Drag points to reshape, double-click the edge to add one, Alt-click to remove one. Shift+[ ] resizes, Q turns it.</p>
      <div class="edbtns"><button data-a="dup">Duplicate</button><button data-a="del">Delete</button><button data-a="front">To front</button><button data-a="back">To back</button></div>`;
    const c = p.querySelector('.wcol'); c.oninput = () => { if (!c._p) { edPush(); c._p = true; } o.color = c.value; }; c.onchange = () => { c._p = false; edDirty(); };
    p.querySelector('.wsh').onchange = e => { edPush(); o.sharp = e.target.checked; edShapeChanged(o); };
    edPanelBtns(p); return; }
  const s = ED.sel[0], o = edItem(s), num = (k, lab, min = -9999) => `<label>${lab}<input type="number" step="1" min="${min}" data-k="${k}" value="${Math.round((o[k] ?? 0) * 10) / 10}"></label>`;
  if (s.t === 'l') {
    p.innerHTML = `<h4>Light</h4><div class="edgrid2">${num('x', 'X')}${num('y', 'Y')}${num('r', 'Reach', 10)}</div>
      <label>Color <input type="color" data-lc value="${edHex(edLightCol(o))}"></label>
      <label>Type <button class="edpick lkind"></button></label>
      <label>Fixture <select data-ks="fix">${ED_FIX.map(k => `<option ${k === (o.fix || 'panel') ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <label class="edck"><input type="checkbox" data-ck="flick" ${o.flick ? 'checked' : ''}> Flickers</label>
      <div class="edbtns"><button data-a="dup">Duplicate</button><button data-a="del">Delete</button><button data-a="clr">Use type's color</button></div>`;
  } else {
    const lamp = o.kind === 'lamp';
    const vr = edVariant(o), vlist = ED_VARIANTS[o.kind];
    p.innerHTML = `<h4>${vr ? vr[1] : o.kind}${vr && vr[0] ? ` <small>(a ${o.kind})</small>` : ''}</h4><label>Kind <button class="edpick okind"></button></label>${vlist ? `<label>Type <select class="ovar">${vlist.map(([f, n]) => `<option value="${f}" ${vr && vr[0] === f ? 'selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}
      <div class="edgrid2">${num('x', 'X')}${num('y', 'Y')}${o.t === 'r' ? num('w', 'Width', 2) + num('h', 'Height', 2) : num('r', 'Radius', 2)}</div>
      <label>Size <input type="range" min="25" max="400" value="100" class="edsz"><output>100%</output></label>
      <label>Color <input type="color" data-c value="${edHex(o.color)}"></label>
      ${o.kind === 'building' ? `<label>Roof <select data-ks="roof">${['gable', 'hip', 'flat'].map(k => `<option ${k === o.roof ? 'selected' : ''}>${k}</option>`).join('')}</select></label>` : ''}
      ${lamp ? `<h4>Lamp light</h4><label>Light color <input type="color" data-lampc value="${edHex(o.lc || (o.mast ? LCOL.flood : o.lantern ? LCOL.fire : LCOL.street))}"></label>${num('lr', 'Reach', 20).replace(`value="0"`, `value="${o.lr || (o.lantern ? 105 : 130)}"`)}` : ''}
      ${num('rot', 'Rotation °')}
      <label>Spawn chance <input type="range" class="ochance" min="0" max="100" step="5" value="${o.chance ?? 100}"><output>${o.chance ?? 100}%</output></label>
      <label class="edck"><input type="checkbox" data-ckn="noCollide" ${o.noCollide ? '' : 'checked'}> Solid (blocks movement)</label>
      <label class="edck"><input type="checkbox" data-ckn="noOutline" ${o.noOutline ? '' : 'checked'}> Outline</label>
      <label class="edck"><input type="checkbox" data-ckn="noShadow" ${o.noShadow ? '' : 'checked'}> Casts shadows</label>
      <div class="edbtns"><button data-a="dup">Duplicate</button><button data-a="del">Delete</button><button data-a="rot">Rotate ${ED.snaps.rot.step}°</button><button data-a="front">To front</button><button data-a="back">To back</button></div>`;
    const sz = p.querySelector('.edsz'), base = edClone(o); sz.oninput = () => { if (!sz._p) { edPush(); sz._p = true; } const f = sz.value / 100; sz.nextElementSibling.textContent = sz.value + '%';
      if (o.t === 'c') o.r = Math.max(2, Math.round(base.r * f)); else { const cx = base.x + base.w / 2, cy = base.y + base.h / 2; o.w = Math.max(2, Math.round(base.w * f)); o.h = Math.max(2, Math.round(base.h * f)); o.x = cx - o.w / 2; o.y = cy - o.h / 2; } edPanelVals(true); };
    sz.onchange = () => { sz._p = false; edDirty(); };
  }
  const lk = p.querySelector('.lkind'); if (lk) { edPickBtn(lk, 'light', o.kind); lk.onclick = () => edPicker(lk, 'light', o.kind, v => { edPush(); o.kind = v; delete o.c; edPanel(); }); }
  const ov = p.querySelector('.ovar'); if (ov) ov.onchange = () => { edPush(); for (const [f] of ED_VARIANTS[o.kind]) if (f) delete o[f]; if (ov.value) o[ov.value] = o.kind === 'chess' ? ov.value : true; edPanel(); };
  const ok = p.querySelector('.okind'); if (ok) { edPickBtn(ok, 'kind', o.kind); ok.onclick = () => edPicker(ok, 'kind', o.kind, v => { edPush(); o.kind = v; const pp = ED_PROPS.find(q => q[1] === v); if (pp && pp[2] === o.t) o.color = pp[5]; edPanel(); }); }
  p.querySelectorAll('input[data-k]').forEach(inp => inp.onchange = () => { edPush(); o[inp.dataset.k] = +inp.value; });
  p.querySelectorAll('select[data-ks]').forEach(sel => sel.onchange = () => { edPush(); o[sel.dataset.ks] = sel.value; if (s.t === 'l' && sel.dataset.ks === 'kind') delete o.c; edPanel(); });
  p.querySelectorAll('input[data-ck]').forEach(c => c.onchange = () => { edPush(); o[c.dataset.ck] = c.checked; });
  const oc = p.querySelector('.ochance'); if (oc) { oc.oninput = () => { if (!oc._p) { edPush(); oc._p = true; } const v = +oc.value; if (v >= 100) delete o.chance; else o.chance = v; oc.nextElementSibling.textContent = v + '%'; }; oc.onchange = () => { oc._p = false; edDirty(); }; }
  p.querySelectorAll('input[data-ckn]').forEach(c => c.onchange = () => { edPush(); if (c.checked) delete o[c.dataset.ckn]; else o[c.dataset.ckn] = true; });
  const col = (sel, set) => { const el = p.querySelector(sel); if (!el) return; el.oninput = () => { if (!el._p) { edPush(); el._p = true; } set(el.value); }; el.onchange = () => { el._p = false; edDirty(); }; };
  col('[data-c]', v => { o.color = v; }); col('[data-lc]', v => { o.c = edRgb(v); }); col('[data-lampc]', v => { o.lc = edRgb(v); });
  edPanelBtns(p);
}
function edPanelBtns(p) {
  const act = { dup: () => edDuplicate(), del: edDelete, rot: () => edRotateBy(ED.snaps.rot.step), up: () => edScale(1.1), dn: () => edScale(1 / 1.1), front: () => edOrder(true), back: () => edOrder(false), clr: () => { edPush(); delete edItem(ED.sel[0]).c; edPanel(); } };
  p.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act[b.dataset.a]());
}
function edPanelVals(keepSize) { // refresh the numbers while dragging, without rebuilding the panel
  if (ED.sel.length !== 1) return; const o = edItem(ED.sel[0]);
  ED.root.querySelectorAll('.edpanel input[data-k]').forEach(inp => { if (document.activeElement !== inp) inp.value = Math.round((o[inp.dataset.k] ?? 0) * 10) / 10; });
}
/* the menu entry */
let edTesting = null; // the map being play-tested from the editor: quitting goes back to the editor
const _edShowMenu = showMenu;
showMenu = function () {
  _edShowMenu.apply(this, arguments);
  if (edTesting !== null && state === 'menu' && !ED.open && ED.leaving) { const i = edTesting; edTesting = null; ED.leaving = false; const was = edTestData; openEditor(i); if (was) { ED.dirtySave = ED.unshared = true; edStatus('Back from the play test: your unsaved changes are still here (Ctrl+S to save)'); } edTestData = null; return; }
  if (edTesting === null) edTestData = null;
  const row = document.getElementById('setBtn'); if (!row || document.getElementById('edBtn')) return;
  const b = document.createElement('button'); b.className = 'ghost'; b.id = 'edBtn'; b.dataset.sfx = 'open'; b.textContent = 'Map editor';
  b.onclick = () => openEditor(mapIdx); row.parentElement.appendChild(b);
};

/* =========================================================
   PROP EDITOR
   Changes a whole kind of prop everywhere: its color, whether (and how hard) the Battering Ram breaks it, extra
   shapes painted on top, or replacing its drawing entirely. Saved in this browser; Export ships it in 05c.
   ========================================================= */
const RAM_DEFAULT = { small: [...RAM_SMALL], large: [...RAM_LARGE], heavy: [...RAM_HEAVY] };
const ED_SHAPES = ['rect', 'circle', 'ellipse', 'triangle', 'line', 'ring', 'cross'];
function propApply() { // rebuild the Battering Ram's lists from the defaults plus every kind's setting
  const d = propDefs(), lists = { small: RAM_SMALL, large: RAM_LARGE, heavy: RAM_HEAVY };
  for (const [k, arr] of Object.entries(lists)) { arr.length = 0; arr.push(...RAM_DEFAULT[k]); }
  for (const [kind, p] of Object.entries(d)) if (p.breakable && p.breakable !== 'default') { for (const arr of Object.values(lists)) { const i = arr.indexOf(kind); if (i >= 0) arr.splice(i, 1); } if (lists[p.breakable]) lists[p.breakable].push(kind); }
  RAM_KINDS[1] = new Set(RAM_SMALL); RAM_KINDS[2] = new Set([...RAM_SMALL, ...RAM_LARGE]); RAM_KINDS[3] = RAM_KINDS[4] = new Set([...RAM_SMALL, ...RAM_LARGE, ...RAM_HEAVY]);
  propCache = d;
}
const breakClass = kind => RAM_DEFAULT.heavy.includes(kind) ? 'heavy' : RAM_DEFAULT.large.includes(kind) ? 'large' : RAM_DEFAULT.small.includes(kind) ? 'small' : 'never';
function drawPropShapes(x, o, shapes) { // shapes live in the object's box: 0..1 across and down
  const [x0, y0, x1, y1] = o.t === 'r' ? [o.x, o.y, o.x + o.w, o.y + o.h] : [o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r], bw = x1 - x0, bh = y1 - y0;
  for (const s of shapes) {
    const cx = x0 + s.x * bw, cy = y0 + s.y * bh, w = Math.max(.5, s.w * bw), h = Math.max(.5, s.h * bh);
    x.save(); x.globalAlpha *= s.a ?? 1; x.translate(cx, cy); x.rotate((s.rot || 0) * Math.PI / 180); x.fillStyle = x.strokeStyle = (s.base && propCache[o.kind] && propCache[o.kind].color) || s.c || '#ffffff'; x.lineWidth = Math.max(.5, (s.lw ?? .08) * Math.min(bw, bh)); x.lineCap = 'round';
    x.beginPath();
    if (s.type === 'rect') x.rect(-w / 2, -h / 2, w, h);
    else if (s.type === 'circle') x.arc(0, 0, Math.min(w, h) / 2, 0, TAU);
    else if (s.type === 'ellipse') x.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU);
    else if (s.type === 'poly' && s.pts) { s.pts.forEach(([u, v], k) => { const px = (u - .5) * w, py = (v - .5) * h; k ? x.lineTo(px, py) : x.moveTo(px, py); }); if (s.closed !== false) x.closePath(); }
    else if (s.type === 'triangle') { x.moveTo(0, -h / 2); x.lineTo(w / 2, h / 2); x.lineTo(-w / 2, h / 2); x.closePath(); }
    if (s.type === 'poly' && s.stroke) { x.lineJoin = 'round'; x.stroke(); }
    else if (s.type === 'line') { x.moveTo(-w / 2, 0); x.lineTo(w / 2, 0); x.stroke(); }
    else if (s.type === 'ring') { x.arc(0, 0, Math.min(w, h) / 2, 0, TAU); x.stroke(); }
    else if (s.type === 'cross') { x.moveTo(-w / 2, 0); x.lineTo(w / 2, 0); x.moveTo(0, -h / 2); x.lineTo(0, h / 2); x.stroke(); }
    else x.fill();
    x.restore();
  }
}
const _drawObstacle = drawObstacle;
drawObstacle = function (x, o) { // every obstacle drawing goes through here, so a kind's changes show everywhere
  if (o && o.rot && !o.poly && o.rot % 360) { // turned: draw it upright about its centre, inside a rotated frame
    const cx = o.t === 'r' ? o.x + o.w / 2 : o.x, cy = o.t === 'r' ? o.y + o.h / 2 : o.y;
    x.save(); x.translate(cx, cy); x.rotate(o.rot * Math.PI / 180); x.translate(-cx, -cy); try { drawObstacleUpright(x, o); } finally { x.restore(); } return;
  }
  return drawObstacleUpright(x, o);
};
function drawObstacleUpright(x, o) {
  const p = o && propCache[o.kind];
  if (!p) return _drawObstacle(x, o);
  const q = p.color ? { ...o, color: p.color } : o;
  if (!p.hideBase) _drawObstacle(x, q);
  else if (p.shapes && p.shapes.length === 0) { x.fillStyle = q.color; o.t === 'r' ? x.fillRect(o.x, o.y, o.w, o.h) : circ(x, o.x, o.y, o.r); }
  if (p.shapes && p.shapes.length) drawPropShapes(x, o, p.shapes);
}
propApply();
/* ---- previews ---- */
function edSample(p, X, Y) { return p[2] === 'r' ? R(X, Y, p[3], p[4], p[5], p[1], p[6] && edClone(p[6])) : C(X, Y, p[3], p[5], p[1], p[6] && edClone(p[6])); }
function drawPreview(cv, o) { // fits one object into a small canvas
  const x = cv.getContext('2d'), w = cv.width, h = cv.height, [x0, y0, x1, y1] = o.t === 'r' ? [o.x, o.y, o.x + o.w, o.y + o.h] : [o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r];
  const s = Math.min((w - 8) / (x1 - x0), (h - 8) / (y1 - y0), 6);
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h); x.setTransform(s, 0, 0, s, w / 2 - (x0 + x1) / 2 * s, h / 2 - (y0 + y1) / 2 * s);
  try { drawObstacle(x, o); if (o.kind === 'tree' || o.kind === 'bush') { x.globalAlpha = .7; x.fillStyle = (propCache[o.kind] && propCache[o.kind].color) || o.color; circ(x, o.x, o.y, o.r); x.globalAlpha = 1; } } catch (e) { x.fillStyle = o.color; o.t === 'r' ? x.fillRect(o.x, o.y, o.w, o.h) : circ(x, o.x, o.y, o.r); }
}
function edPreviews() { if (!ED.root) return; ED.root.querySelectorAll('.edprop').forEach(b => { const p = ED_PROPS[+b.dataset.p]; drawPreview(b.querySelector('canvas'), edSample(p, 0, 0)); }); }
const kindSample = kind => { const p = ED_PROPS.find(p => p[1] === kind); if (p) return p; const o = (ED.obs || []).find(o => o.kind === kind); return o ? (o.t === 'r' ? ['', kind, 'r', o.w, o.h, o.color] : ['', kind, 'c', o.r, 0, o.color]) : ['', kind, 'r', 60, 40, '#888888']; };
/* ---- the window ---- */
function openPropEditor(kind) {
  const old = document.getElementById('propEd'); if (old) old.remove();
  const kinds = [...new Set([...ED_PROPS.map(p => p[1]), ...ED_KINDS, ...(ED.obs || []).map(o => o.kind)])].filter(k => k !== 'border' && k !== 'water').sort();
  const box = document.createElement('div'); box.id = 'propEd';
  box.innerHTML = `<div class="pewin"><div class="pehead">${edSvg('props', 18)}<b>Prop editor</b><span class="edmuted">Pick a kind of prop on the left. Changes apply to every one of them, on every map.</span>
      <button class="peshareall edghost">${edSvg('share', 14)} Share…</button><button class="peclose edprimary">Done</button></div>
    <div class="pebody"><div class="pelistw"><input class="edsearch pesearch" placeholder="Search props…"><div class="edchips"><button data-pf="all" class="on">All</button><button data-pf="edited">Edited</button></div>
        <div class="pelist">${kinds.map(k => `<button data-k="${k}"><canvas width="44" height="44"></canvas><span>${(ED_PROPS.find(p => p[1] === k) || [k])[0]}</span><i class="ped">●</i></button>`).join('')}</div></div>
      <div class="pemain"><div class="pestage"><canvas class="pebig" width="560" height="380"></canvas><div class="pecmp"><span>Before</span><canvas class="pebefore" width="120" height="90"></canvas></div></div>
        <div class="pebgs"><span>Preview on</span><button data-bg="#2a2a30" class="on">Dark</button><button data-bg="#93bf55">Grass</button><button data-bg="#b9b3a7">Pavement</button><button data-bg="#d9d4c8">Tiles</button><button data-bg="#3a3532">Concrete</button></div>
        <p class="edhint">Tip: drag a shape in the preview to move it. Everything here can be undone with Reset.</p></div>
      <div class="peside"></div></div></div>`;
  document.body.appendChild(box);
  PE.kind = kinds.includes(kind) ? kind : kinds[0]; PE.bg = '#2a2a30'; PE.box = box; PE.selShape = -1; PE.filter = 'all';
  box.querySelector('.peclose').onclick = () => { box.remove(); edPreviews(); if (ED.open) { edFloor(true); edPanel(); } };
  box.querySelector('.peshareall').onclick = () => edShare('p:' + PE.kind);
  const filt = () => { const q = box.querySelector('.pesearch').value.toLowerCase(), loc = edLocalProps(); box.querySelectorAll('.pelist button').forEach(b => { b.style.display = (b.textContent.toLowerCase().includes(q) || b.dataset.k.includes(q)) && (PE.filter === 'all' || loc[b.dataset.k]) ? '' : 'none'; }); };
  box.querySelector('.pesearch').oninput = filt;
  box.querySelectorAll('[data-pf]').forEach(b => b.onclick = () => { PE.filter = b.dataset.pf; box.querySelectorAll('[data-pf]').forEach(c => c.classList.toggle('on', c === b)); filt(); });
  box.querySelectorAll('.pelist button').forEach(b => { b.onclick = () => { PE.kind = b.dataset.k; PE.selShape = -1; peSide(); peDraw(); peList(); }; });
  box.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => { PE.bg = b.dataset.bg; box.querySelectorAll('[data-bg]').forEach(c => c.classList.toggle('on', c === b)); peDraw(); });
  const big = box.querySelector('.pebig'); big.onpointerdown = peDown; big.onpointermove = peMove; big.onpointerup = () => { PE.drag = null; };
  box.onkeydown = e => e.stopPropagation();
  peSide(); peDraw(); peList(); const cur = box.querySelector(`.pelist [data-k="${PE.kind}"]`); if (cur) cur.scrollIntoView({ block: 'center' });
}
const PE = {};
const peGet = () => edClone(propDefs()[PE.kind] || {});
function peSet(p) { let loc = {}; try { loc = JSON.parse(localStorage.getItem('snakeCarnagePropDefs')) || {}; } catch (e) {}
  const empty = !p.color && (!p.breakable || p.breakable === 'default') && !p.hideBase && !p.noCollide && !p.noOutline && !p.noShadow && !(p.shapes && p.shapes.length);
  if (empty) { delete loc[PE.kind]; if (PROP_OVERRIDES[PE.kind]) loc[PE.kind] = {}; } else loc[PE.kind] = p;
  try { localStorage.setItem('snakeCarnagePropDefs', JSON.stringify(loc)); } catch (e) {} propApply(); peDraw(); peList(); }
function peList() { const loc = edLocalProps(); PE.box.querySelectorAll('.pelist button').forEach(b => { b.classList.toggle('on', b.dataset.k === PE.kind); b.classList.toggle('edited', !!loc[b.dataset.k]); drawPreview(b.querySelector('canvas'), edSample(kindSample(b.dataset.k), 0, 0)); }); }
function peObj() { const p = kindSample(PE.kind); return edSample(p, p[2] === 'r' ? -p[3] / 2 : 0, p[2] === 'r' ? -p[4] / 2 : 0); }
function peView() { const c = PE.box.querySelector('.pebig'), o = peObj(), [x0, y0, x1, y1] = o.t === 'r' ? [o.x, o.y, o.x + o.w, o.y + o.h] : [o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r];
  const s = Math.min((c.width - 80) / (x1 - x0), (c.height - 80) / (y1 - y0), 12); return { c, o, s, ox: c.width / 2, oy: c.height / 2, x0, y0, bw: x1 - x0, bh: y1 - y0 }; }
function peDraw() {
  const bc = PE.box.querySelector('.pebefore'); if (bc) { const keep = propCache[PE.kind]; delete propCache[PE.kind]; const x0 = bc.getContext('2d'); x0.fillStyle = PE.bg; x0.fillRect(0, 0, bc.width, bc.height); const tmp = document.createElement('canvas'); tmp.width = bc.width; tmp.height = bc.height; drawPreview(tmp, peObj()); x0.drawImage(tmp, 0, 0); if (keep) propCache[PE.kind] = keep; }
  const v = peView(), x = v.c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = PE.bg; x.fillRect(0, 0, v.c.width, v.c.height);
  x.setTransform(v.s, 0, 0, v.s, v.ox, v.oy);
  try { drawObstacle(x, v.o); if ((v.o.kind === 'tree' || v.o.kind === 'bush') && !(propCache[v.o.kind] || {}).hideBase) { x.globalAlpha = .7; x.fillStyle = (propCache[v.o.kind] || {}).color || v.o.color; circ(x, v.o.x, v.o.y, v.o.r); x.globalAlpha = 1; } } catch (e) {}
  x.setTransform(1, 0, 0, 1, 0, 0); x.strokeStyle = 'rgba(255,255,255,.25)'; x.setLineDash([4, 4]); x.strokeRect(v.ox + v.x0 * v.s, v.oy + v.y0 * v.s, v.bw * v.s, v.bh * v.s); x.setLineDash([]);
  const sh = (peGet().shapes || [])[PE.selShape]; if (sh) { const cx = v.ox + (v.x0 + sh.x * v.bw) * v.s, cy = v.oy + (v.y0 + sh.y * v.bh) * v.s; x.strokeStyle = '#ff4d6a'; x.lineWidth = 2; x.strokeRect(cx - sh.w * v.bw * v.s / 2, cy - sh.h * v.bh * v.s / 2, sh.w * v.bw * v.s, sh.h * v.bh * v.s); }
}
function peDown(e) { const p = peGet(), sh = p.shapes || []; if (!sh.length) return; const v = peView(), r = v.c.getBoundingClientRect(), mx = (e.clientX - r.left) * v.c.width / r.width, my = (e.clientY - r.top) * v.c.height / r.height;
  const ux = ((mx - v.ox) / v.s - v.x0) / v.bw, uy = ((my - v.oy) / v.s - v.y0) / v.bh;
  let best = -1; sh.forEach((s, i) => { if (Math.abs(ux - s.x) <= s.w / 2 + .03 && Math.abs(uy - s.y) <= s.h / 2 + .03) best = i; });
  if (best >= 0) { PE.selShape = best; PE.drag = { ux, uy, x: sh[best].x, y: sh[best].y }; v.c.setPointerCapture(e.pointerId); peSide(); peDraw(); } }
function peMove(e) { if (!PE.drag) return; const p = peGet(), s = p.shapes[PE.selShape], v = peView(), r = v.c.getBoundingClientRect(), mx = (e.clientX - r.left) * v.c.width / r.width, my = (e.clientY - r.top) * v.c.height / r.height;
  const ux = ((mx - v.ox) / v.s - v.x0) / v.bw, uy = ((my - v.oy) / v.s - v.y0) / v.bh; s.x = Math.round((PE.drag.x + ux - PE.drag.ux) * 100) / 100; s.y = Math.round((PE.drag.y + uy - PE.drag.uy) * 100) / 100; peSet(p); peSideVals(); }
function peSide() {
  const p = peGet(), el = PE.box.querySelector('.peside'), def = breakClass(PE.kind), sh = p.shapes || [];
  const bn = { default: `Default (${def === 'never' ? "can't break" : def})`, never: "Can't break", small: 'Breakable: small (Ram I)', large: 'Breakable: large (Ram II)', heavy: 'Breakable: heavy (Ram III)' };
  const name = (ED_PROPS.find(q => q[1] === PE.kind) || [PE.kind])[0], base = edHex(kindSample(PE.kind)[5]), edited = !!edLocalProps()[PE.kind];
  const SW = ['#ffffff', '#1d1d22', '#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2f6fb0', '#8e44ad', '#7a5a38', '#95a5a6'];
  const sw = (cls, cur) => `<div class="peswatch">${SW.map(c => `<button class="${cls}" data-c="${c}" style="background:${c}" ${edHex(cur) === c ? 'aria-pressed="true"' : ''}></button>`).join('')}</div>`;
  const tog = (f, on, t, d) => `<label class="petog"><span><b>${t}</b><small>${d}</small></span><input type="checkbox" class="pef" data-f="${f}" ${on ? 'checked' : ''}><i></i></label>`;
  const SHI = { rect: '<rect x="5" y="7" width="14" height="10" rx="1"/>', circle: '<circle cx="12" cy="12" r="6"/>', ellipse: '<ellipse cx="12" cy="12" rx="8" ry="5"/>', triangle: '<path d="M12 5l7 13H5z"/>', line: '<path d="M5 12h14"/>', ring: '<circle cx="12" cy="12" r="6" fill="none"/>', cross: '<path d="M12 5v14M5 12h14"/>' };
  el.innerHTML = `<div class="pettl"><h3>${name}</h3>${edited ? '<span class="pebadge">Edited</span>' : '<span class="pebadge off">Default</span>'}</div>
    <section><h4>Color</h4><div class="pecolrow"><label class="petog sm"><span><b>Recolor every ${name.toLowerCase()}</b></span><input type="checkbox" class="pecol" ${p.color ? 'checked' : ''}><i></i></label><input type="color" class="pecolv" value="${edHex(p.color || base)}" ${p.color ? '' : 'disabled'}></div>${p.color ? sw('pecs', p.color) : ''}</section>
    <section><h4>Behaviour</h4>${tog('noCollide', !p.noCollide, 'Solid', 'Blocks the snake and people. Off: walk right through it.')}${tog('noOutline', !p.noOutline, 'Outline', 'The dark edge drawn around things you can crash into.')}${tog('noShadow', !p.noShadow, 'Shadows', 'Casts sun and lamp shadows.')}</section>
    <section><h4>Battering Ram</h4><div class="peseg">${[['default', 'Default'], ['never', 'Never'], ['small', 'Ram I'], ['large', 'Ram II'], ['heavy', 'Ram III']].map(([k, n]) => `<button data-brk="${k}" class="${k === (p.breakable || 'default') ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p class="edhint">${(p.breakable || 'default') === 'default' ? `Default for this prop: ${def === 'never' ? "can't be broken" : `breaks from ${{ small: 'Ram I', large: 'Ram II', heavy: 'Ram III' }[def]}`}.` : (p.breakable === 'never' ? "Nothing can break it." : `Breaks once you have ${{ small: 'Ram I', large: 'Ram II', heavy: 'Ram III' }[p.breakable]}.`)} Very large trees and boulders always hold.</p></section>
    <section><h4>Extra shapes <small>painted on top of the prop</small></h4><div class="peadd">${ED_SHAPES.map(t => `<button data-add="${t}" title="Add a ${t}"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round">${SHI[t]}</svg><span>${t}</span></button>`).join('')}</div>
      <button class="pebreak edghost edwide" title="Turns the prop's own drawing into shapes you can move, recolor, resize or delete">${edSvg('layers', 14)} ${p.hideBase && sh.length ? 'Shapes are the drawing now' : 'Edit the original drawing'}</button>
      <p class="edhint">${p.hideBase && sh.length ? `The original drawing was split into ${sh.length} shapes. Click one in the list (or in the preview) to change it.` : 'Splits the prop\'s own look into its pieces, so you can change the original shapes instead of adding on top.'}</p>
      ${tog('hideBase', !!p.hideBase, 'Replace the drawing', 'Hide the original look so only your shapes show.').replace('class="pef"', 'class="pehide"')}
    <div class="peshapes">${sh.map((s, i) => `<button data-s="${i}" class="${i === PE.selShape ? 'on' : ''}"><i style="background:${s.c}"></i>${i + 1}. ${s.type}</button>`).join('')}</div>
    <div class="peshape"></div>
    </section><div class="pefoot"><button class="pereset edghost">Reset to default</button><button class="peshare1 edghost">${edSvg('share', 14)} Share this prop</button></div>`;
  el.querySelector('.pecol').onchange = e => { const q = peGet(); if (e.target.checked) q.color = el.querySelector('.pecolv').value; else delete q.color; peSet(q); peSide(); };
  el.querySelector('.pecolv').oninput = e => { const q = peGet(); q.color = e.target.value; peSet(q); };
  el.querySelectorAll('.pef').forEach(c => c.onchange = () => { const q = peGet(); if (c.checked) delete q[c.dataset.f]; else q[c.dataset.f] = true; peSet(q); peSide(); });
  el.querySelector('.pebreak').onclick = () => { const q = peGet(); if (q.hideBase && (q.shapes || []).length) return; const parts = recordProp(PE.kind); if (!parts.length) return edModal('Nothing to split', '<p>This prop has no drawing I can split up.</p>', [['OK', null, 'edprimary']]);
    const baseC = edHex(kindSample(PE.kind)[5]); for (const sh of parts) if (sh.c === baseC) sh.base = true; // pieces in the prop's main color follow 'Recolor every…'
    q.shapes = [...parts, ...(q.shapes || [])]; q.hideBase = true; PE.selShape = -1; peSet(q); peSide(); };
  el.querySelectorAll('[data-brk]').forEach(b => b.onclick = () => { const q = peGet(); q.breakable = b.dataset.brk; peSet(q); peSide(); });
  el.querySelectorAll('.pecs').forEach(b => b.onclick = () => { const q = peGet(); q.color = b.dataset.c; peSet(q); peSide(); });
  el.querySelector('.peshare1').onclick = () => edLocalProps()[PE.kind] ? edShare('p:' + PE.kind) : edModal('Nothing to share', `<p>You haven't changed the ${PE.kind} yet.</p>`, [['OK', null, 'edprimary']]);
  el.querySelector('.pehide').onchange = e => { const q = peGet(); q.hideBase = e.target.checked; peSet(q); peSide(); };
  el.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const q = peGet(); (q.shapes = q.shapes || []).push({ type: b.dataset.add, x: .5, y: .5, w: .4, h: .4, rot: 0, c: '#ffffff', a: 1, lw: .08 }); PE.selShape = q.shapes.length - 1; peSet(q); peSide(); });
  el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { PE.selShape = +b.dataset.s; peSide(); peDraw(); });
  el.querySelector('.pereset').onclick = () => { PE.selShape = -1; peSet({}); peSide(); };
  const s = sh[PE.selShape], box = el.querySelector('.peshape'); if (!s) return;
  const sl = (k, lab, min, max, st) => `<label>${lab}<input type="range" data-sk="${k}" min="${min}" max="${max}" step="${st}" value="${s[k] ?? 0}"><output>${s[k] ?? 0}</output></label>`;
  box.innerHTML = `<h4>Shape ${PE.selShape + 1}: ${s.type} <small>drag it in the preview to move</small></h4>
    <label>Type <select data-st>${ED_SHAPES.map(t => `<option ${t === s.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    ${sl('x', 'Across', -.5, 1.5, .01)}${sl('y', 'Down', -.5, 1.5, .01)}${sl('w', 'Width', .02, 2, .01)}${sl('h', 'Height', .02, 2, .01)}${sl('rot', 'Rotation', -180, 180, 1)}${sl('a', 'Opacity', 0, 1, .05)}${sl('lw', 'Line width', .01, .4, .01)}
    <label>Color <input type="color" data-sc value="${edHex(s.c)}"></label>
    <div class="edbtns"><button data-sa="up">Move up</button><button data-sa="down">Move down</button><button data-sa="dup">Duplicate</button><button data-sa="del">Delete</button></div>`;
  box.querySelectorAll('[data-sk]').forEach(r => r.oninput = () => { const q = peGet(); q.shapes[PE.selShape][r.dataset.sk] = +r.value; r.nextElementSibling.textContent = r.value; peSet(q); });
  box.querySelector('[data-st]').onchange = e => { const q = peGet(); q.shapes[PE.selShape].type = e.target.value; peSet(q); peSide(); };
  box.querySelector('[data-sc]').oninput = e => { const q = peGet(); q.shapes[PE.selShape].c = e.target.value; peSet(q); };
  box.querySelectorAll('[data-sa]').forEach(b => b.onclick = () => { const q = peGet(), a = q.shapes, i = PE.selShape;
    if (b.dataset.sa === 'del') { a.splice(i, 1); PE.selShape = -1; } if (b.dataset.sa === 'dup') { a.splice(i + 1, 0, edClone(a[i])); PE.selShape = i + 1; }
    if (b.dataset.sa === 'up' && i < a.length - 1) { [a[i], a[i + 1]] = [a[i + 1], a[i]]; PE.selShape = i + 1; } if (b.dataset.sa === 'down' && i > 0) { [a[i], a[i - 1]] = [a[i - 1], a[i]]; PE.selShape = i - 1; }
    peSet(q); peSide(); });
}
function peSideVals() { const s = (peGet().shapes || [])[PE.selShape]; if (!s) return; PE.box.querySelectorAll('[data-sk]').forEach(r => { r.value = s[r.dataset.sk] ?? 0; r.nextElementSibling.textContent = r.value; }); }

/* play test: Quit and Menu go back to the editor, Retry stays a play test */
const _edStart = startGame;
startGame = function (opts = {}) { if (edTesting !== null && !opts.test && !opts.mystery) opts = { ...opts, test: true }; return _edStart.call(this, opts); };
const _edToMenu = returnToMenu;
returnToMenu = function () { if (edTesting !== null) ED.leaving = true; return _edToMenu.apply(this, arguments); };
for (const [fn, id, label] of [['showPause', 'pMenuBtn', 'Back to editor'], ['showDead', 'menuBtn2', 'Editor']]) {
  const orig = window[fn];
  window[fn] = function () { const r = orig.apply(this, arguments); if (edTesting !== null) { const b = document.getElementById(id); if (b) b.textContent = label; } return r; };
}
/* sending edits back: everything as one block of text, ready to paste into a chat or save as a file */
function edShareText() {
  return `/* =========================================================\n   MAP EDITS (exported from the map editor)\n   Maps changed in the map editor (40b-editor). Each entry replaces that map's objects and lights at one world width.\n   ========================================================= */\nconst MAP_OVERRIDES = ${JSON.stringify({ ...MAP_OVERRIDES, ...localMapEdits(), ...edDrafts() })};\nconst PROP_OVERRIDES = ${JSON.stringify(propDefs())}; // per kind: { color, breakable, hideBase, shapes }\nconst mapEditKey = name => name + '@' + W;\nfunction localMapEdits() { try { return JSON.parse(localStorage.getItem('snakeCarnageMapEdits')) || {}; } catch (e) { return {}; } }\nfunction mapOverride(name) { const k = mapEditKey(name); return localMapEdits()[k] || MAP_OVERRIDES[k] || null; }\nfunction propDefs() { let loc = {}; try { loc = JSON.parse(localStorage.getItem('snakeCarnagePropDefs')) || {}; } catch (e) {} return { ...PROP_OVERRIDES, ...loc }; }\n`;
}
function edShare() {
  edSave(); const text = edShareText(), maps = Object.keys({ ...MAP_OVERRIDES, ...localMapEdits(), ...edDrafts() }), props = Object.keys(propDefs());
  const box = document.createElement('div'); box.id = 'propEd';
  box.innerHTML = `<div class="pewin" style="height:auto;max-height:90vh;width:min(760px,94vw)"><div class="pehead"><b>Share your edits</b><button class="peclose">Close</button></div>
    <div style="padding:14px;display:flex;flex-direction:column;gap:10px;overflow:auto">
      <p>${maps.length} map edit${maps.length === 1 ? '' : 's'}${maps.length ? ` (${maps.join(', ')})` : ''} and ${props.length} prop change${props.length === 1 ? '' : 's'}${props.length ? ` (${props.join(', ')})` : ''}.</p>
      <p class="edmuted">Copy this and paste it into your chat with Claude (or attach the downloaded file) and ask for it to be added to the game. It becomes <code>js/05c-map-overrides.js</code>, so everyone gets your maps in the next update.</p>
      <textarea readonly style="width:100%;height:240px;background:#0e0c10;color:#cfc6c0;border:1px solid #3a3035;border-radius:8px;font:11px/1.4 ui-monospace,monospace;padding:8px">${text.replace(/</g, '&lt;')}</textarea>
      <div class="edbtns"><button class="sh-copy">Copy to clipboard</button><button class="sh-dl">Download file</button><span class="sh-msg edmuted"></span></div></div></div>`;
  document.body.appendChild(box);
  const msg = box.querySelector('.sh-msg'); box.querySelector('.peclose').onclick = () => box.remove();
  box.querySelector('.sh-copy').onclick = () => { const ta = box.querySelector('textarea'); (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).catch(() => { ta.select(); document.execCommand('copy'); }).finally(() => { msg.textContent = 'Copied. Paste it into the chat.'; }); };
  box.querySelector('.sh-dl').onclick = edExport;
}

/* ---- paths and water: drafting, live floor ---- */
function edShapeChanged(o, live) { if (o.poly) polyBounds(o); if (o.tex) { if (live) ED.floorDirty = true; else edFloor(true); } if (o.pts) { if (live) ED.floorDirty = true; else edFloor(true); } }
function edFloor(now) { // the ground with every path painted, rebuilt at most ~10 times a second while dragging
  if (!now) { ED.floorDirty = true; return; }
  ED.floorDirty = false; ED.floorT = performance.now();
  const x = ED.floor.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, ED.floor.width, ED.floor.height); if (ED.base) { x.setTransform(DPR, 0, 0, DPR, 0, 0); paintBase(x, ED.base); x.setTransform(1, 0, 0, 1, 0, 0); } else x.drawImage(ED.floorBase, 0, 0);
  x.setTransform(DPR, 0, 0, DPR, 0, 0); try { paintAreas(x, ED.areas); } catch (e) {} try { paintTrails(x, ED.trails.filter(t => !t._hide)); } catch (e) { console.warn(e); }
}
function edFinishDraft() {
  const d = ED.draft; ED.draft = null; if (!d) return;
  if (d.kind === 'path') { if (d.pts.length < 2) return; edPush();
    if (d.extend) { const t = ED.trails[d.extend.i], add = d.pts.slice(1); t.pts = d.extend.end ? [...t.pts, ...add] : [...add.reverse(), ...t.pts]; ED.sel = [{ t: 'p', i: d.extend.i }]; }
    else { ED.trails.push({ pts: d.pts, w: d.w, style: d.style, seed: Math.floor(Math.random() * 999) }); ED.sel = [{ t: 'p', i: ED.trails.length - 1 }]; }
    edFloor(true); }
  else if (d.kind === 'area') { if (d.pts.length < 3) return; edPush(); ED.areas.push(polyBounds({ poly: d.pts.map(p => [p[0], p[1]]), tex: ED.areaTex || 'grass' })); ED.sel = [{ t: 'a', i: ED.areas.length - 1 }]; edFloor(true); }
  else { if (d.pts.length < 3) return; edPush(); ED.obs.push(makeWater(d.pts)); ED.sel = [{ t: 'o', i: ED.obs.length - 1 }]; }
  edTool('select'); edPanel();
}

/* ---- snapping steps (kept between sessions) ---- */
function edLoadSnaps() { const d = { move: { on: true, step: 8 }, rot: { on: true, step: 15 }, scale: { on: true, step: 10 } }; try { const s = JSON.parse(localStorage.getItem('snakeEdSnaps')); if (s) for (const k in d) Object.assign(d[k], s[k]); } catch (e) {} return d; }
function edSaveSnaps() { try { localStorage.setItem('snakeEdSnaps', JSON.stringify(ED.snaps)); } catch (e) {} }
const edSnapRot = a => edSnapOn('rot') ? Math.round(a / ED.snaps.rot.step) * ED.snaps.rot.step : Math.round(a * 10) / 10;
const edSnapScale = f => { if (!edSnapOn('scale')) return Math.max(.05, f); const st = ED.snaps.scale.step / 100; return Math.max(st, Math.round(f / st) * st); };
/* ---- transform gizmo: arrows move along an axis, the square moves freely, cubes scale, the ring rotates ---- */
function edSelCenter() {
  const bx = ED.sel.map(s => { const o = edItem(s); if (!o) return null; if (s.t === 'l') return [o.x, o.y, o.x, o.y]; const arr = o.pts || null; if (arr) { const xs = arr.map(p => p[0]), ys = arr.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; } return edBox(o); }).filter(Boolean);
  if (!bx.length) return null; const x0 = Math.min(...bx.map(b => b[0])), y0 = Math.min(...bx.map(b => b[1])), x1 = Math.max(...bx.map(b => b[2])), y1 = Math.max(...bx.map(b => b[3]));
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rr: Math.hypot(x1 - x0, y1 - y0) / 2 };
}
function edGizmo() {
  if (!ED.sel.length || ED.draft || ED.tool !== 'select' || ED.gizmoOff) return null; const c = edSelCenter(); if (!c) return null;
  const sx = ED.px + c.cx * ED.z, sy = ED.py + c.cy * ED.z, ring = Math.max(104, c.rr * ED.z + 22);
  return { ...c, sx, sy, ring, parts: { mx: [sx + 74, sy], my: [sx, sy - 74], sclx: [sx - 58, sy], scly: [sx, sy + 58], scl: [sx + 44, sy + 44], free: [sx, sy] } };
}
function edGizmoDraw(x, px) {
  const g = edGizmo(); if (!g) return; const d = devicePixelRatio || 1, act = ED.drag && ED.drag.k === 'gizmo' ? ED.drag.part : null;
  x.save(); x.setTransform(d, 0, 0, d, 0, 0); x.lineCap = 'round';
  x.strokeStyle = act === 'rot' ? '#fff27a' : 'rgba(255,224,60,.85)'; x.lineWidth = act === 'rot' ? 4 : 2.5; x.beginPath(); x.arc(g.sx, g.sy, g.ring, 0, TAU); x.stroke(); // rotation ring
  if (act === 'rot' && ED.drag.ang != null) { x.fillStyle = 'rgba(255,224,60,.15)'; x.beginPath(); x.moveTo(g.sx, g.sy); x.arc(g.sx, g.sy, g.ring, ED.drag.a0, ED.drag.a0 + ED.drag.ang * Math.PI / 180, ED.drag.ang < 0); x.closePath(); x.fill();
    x.fillStyle = '#fff'; x.font = '12px sans-serif'; x.fillText(`${ED.drag.ang > 0 ? '+' : ''}${ED.drag.ang}°`, g.sx + g.ring + 8, g.sy - 6); }
  const arrow = ([ex, ey], col, on) => { x.strokeStyle = col; x.fillStyle = col; x.lineWidth = on ? 4 : 3; x.beginPath(); x.moveTo(g.sx, g.sy); x.lineTo(ex, ey); x.stroke();
    const a = Math.atan2(ey - g.sy, ex - g.sx); x.beginPath(); x.moveTo(ex + Math.cos(a) * 12, ey + Math.sin(a) * 12); x.lineTo(ex + Math.cos(a + 2.5) * 10, ey + Math.sin(a + 2.5) * 10); x.lineTo(ex + Math.cos(a - 2.5) * 10, ey + Math.sin(a - 2.5) * 10); x.closePath(); x.fill(); };
  const cube = ([cx, cy], col, on) => { x.strokeStyle = '#555'; x.lineWidth = 2; x.beginPath(); x.moveTo(g.sx, g.sy); x.lineTo(cx, cy); x.stroke(); x.fillStyle = col; const r = on ? 8 : 6.5; x.fillRect(cx - r, cy - r, r * 2, r * 2); x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 1; x.strokeRect(cx - r, cy - r, r * 2, r * 2); };
  cube(g.parts.sclx, '#ff4040', act === 'sclx'); cube(g.parts.scly, '#40e060', act === 'scly'); cube(g.parts.scl, '#f2f2f2', act === 'scl');
  arrow(g.parts.mx, '#ff4040', act === 'mx'); arrow(g.parts.my, '#40e060', act === 'my');
  x.fillStyle = act === 'free' ? '#fff27a' : '#ffe03c'; x.fillRect(g.sx - 7, g.sy - 7, 14, 14); x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 1; x.strokeRect(g.sx - 7, g.sy - 7, 14, 14);
  x.restore();
}
function edGizmoDown(sx, sy, wx, wy) {
  const g = edGizmo(); if (!g) return false; const near = ([a, b], r = 11) => Math.hypot(sx - a, sy - b) < r;
  let part = near(g.parts.free, 10) ? 'free' : near(g.parts.mx, 14) || (Math.abs(sy - g.sy) < 7 && sx > g.sx + 10 && sx < g.sx + 86) ? 'mx' : near(g.parts.my, 14) || (Math.abs(sx - g.sx) < 7 && sy < g.sy - 10 && sy > g.sy - 86) ? 'my'
    : near(g.parts.sclx) ? 'sclx' : near(g.parts.scly) ? 'scly' : near(g.parts.scl) ? 'scl' : Math.abs(Math.hypot(sx - g.sx, sy - g.sy) - g.ring) < 7 ? 'rot' : null;
  if (!part) return false;
  edPush(); ED.drag = { k: 'gizmo', part, g, sx0: sx, sy0: sy, a0: Math.atan2(sy - g.sy, sx - g.sx), d0: Math.max(8, Math.hypot(sx - g.sx, sy - g.sy)), start: ED.sel.map(s => edClone(edItem(s))) };
  return true;
}
function edGizmoMove(d, sx, sy, wx, wy, e) {
  const g = d.g; let dx = 0, dy = 0, rot = 0, kx = 1, ky = 1;
  if (d.part === 'free' || d.part === 'mx' || d.part === 'my') {
    dx = (sx - d.sx0) / ED.z; dy = (sy - d.sy0) / ED.z; if (d.part === 'mx') dy = 0; if (d.part === 'my') dx = 0;
    if (edSnapOn('move')) { const st = ED.snaps.move.step; dx = Math.round(dx / st) * st; dy = Math.round(dy / st) * st; }
  } else if (d.part === 'rot') { let a = (Math.atan2(sy - g.sy, sx - g.sx) - d.a0) * 180 / Math.PI; a = ((a + 540) % 360) - 180; rot = edSnapRot(a); d.ang = rot; }
  else { const f = d.part === 'sclx' ? (d.sx0 - g.sx === 0 ? 1 : (sx - g.sx) / (d.sx0 - g.sx)) : d.part === 'scly' ? (d.sy0 - g.sy === 0 ? 1 : (sy - g.sy) / (d.sy0 - g.sy)) : Math.hypot(sx - g.sx, sy - g.sy) / d.d0;
    const k = edSnapScale(Math.max(.05, f)); if (d.part !== 'scly') kx = k; if (d.part !== 'sclx') ky = k; d.scale = k; }
  edApplyXf(d.start, { cx: g.cx, cy: g.cy, dx, dy, rot, kx, ky });
}
function edApplyXf(starts, t) { // move / rotate / scale every selected thing about the selection's centre, from their state at drag start
  const a = t.rot * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
  const tp = (x, y) => { const u = (x - t.cx) * t.kx, v = (y - t.cy) * t.ky; return [t.cx + u * c - v * sn + t.dx, t.cy + u * sn + v * c + t.dy]; };
  ED.sel.forEach((s, i) => { const o0 = starts[i], o = edItem(s); if (!o || !o0) return;
    if (s.t === 'p') { o.pts = o0.pts.map(([x, y]) => tp(x, y).map(v => Math.round(v * 10) / 10)); ED.floorDirty = true; return; }
    if (o0.poly) { o.poly = o0.poly.map(([x, y]) => tp(x, y).map(v => Math.round(v * 10) / 10)); polyBounds(o); if (o.tex) ED.floorDirty = true; return; }
    if (s.t === 'l') { [o.x, o.y] = tp(o0.x, o0.y); o.r = Math.max(10, Math.round(o0.r * (t.kx + t.ky) / 2)); return; }
    if (o0.t === 'c') { [o.x, o.y] = tp(o0.x, o0.y); o.r = Math.max(2, Math.round(o0.r * (t.kx + t.ky) / 2 * 2) / 2); if (t.rot) o.rot = (((o0.rot || 0) + t.rot) % 360 + 360) % 360; return; }
    const [cx, cy] = tp(o0.x + o0.w / 2, o0.y + o0.h / 2), r0 = (o0.rot || 0) * Math.PI / 180, lc = Math.abs(Math.cos(r0)), ls = Math.abs(Math.sin(r0)); // scale along the object's own sides
    const sw = lc * t.kx + ls * t.ky, sh = ls * t.kx + lc * t.ky;
    o.w = Math.max(2, Math.round(o0.w * sw)); o.h = Math.max(2, Math.round(o0.h * sh)); o.x = cx - o.w / 2; o.y = cy - o.h / 2;
    o.rot = (((o0.rot || 0) + t.rot) % 360 + 360) % 360; if (!o.rot) delete o.rot; });
  edPanelVals();
}
function edRotateBy(deg) { if (!ED.sel.length) return; const c = edSelCenter(); if (!c) return; edPush(); edApplyXf(ED.sel.map(s => edClone(edItem(s))), { cx: c.cx, cy: c.cy, dx: 0, dy: 0, rot: deg, kx: 1, ky: 1 }); if (ED.sel.some(s => s.t === 'p')) edFloor(true); edDirty(); }
edRotate = () => edRotateBy(90);
/* ---- path keys: A adds a point at the cursor, E ends the path at the cursor ---- */
function edAddPointKey() {
  if (!ED.mouse) return; const [wx, wy] = edW(...ED.mouse), pt = [edSnap(wx), edSnap(wy)];
  if (ED.draft) { ED.draft.pts.push(pt); return; }
  if (ED.tool === 'path' || ED.tool === 'water') { ED.draft = { kind: ED.tool, pts: [pt], w: ED.pathW, style: ED.pathStyle }; return; }
  if (ED.sel.length !== 1) { edStatus('Select a path or water shape first (or press T to start a path)'); return; }
  const o = edItem(ED.sel[0]), arr = o && (o.pts || o.poly); if (!arr) return;
  edPush(); const n = arr.length, segs = o.pts ? n - 1 : n; let best = 0, bd = 1e9;
  for (let i = 0; i < segs; i++) { const [ax, ay] = arr[i], [bx, by] = arr[(i + 1) % n], L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1, t = clamp(((wx - ax) * (bx - ax) + (wy - ay) * (by - ay)) / L2, 0, 1), d = Math.hypot(wx - ax - t * (bx - ax), wy - ay - t * (by - ay)); if (d < bd) { bd = d; best = i; } }
  if (o.pts && Math.hypot(wx - arr[n - 1][0], wy - arr[n - 1][1]) <= bd + .01 && Math.hypot(wx - arr[n - 1][0], wy - arr[n - 1][1]) < Math.hypot(wx - arr[0][0], wy - arr[0][1])) arr.push(pt); // past the end: carry on
  else if (o.pts && Math.hypot(wx - arr[0][0], wy - arr[0][1]) <= bd + .01) arr.unshift(pt);
  else arr.splice(best + 1, 0, pt);
  edShapeChanged(o); edDirty();
}
function edEndPathKey() { if (!ED.draft) return; if (ED.mouse) { const [wx, wy] = edW(...ED.mouse), pt = [edSnap(wx), edSnap(wy)], L = ED.draft.pts[ED.draft.pts.length - 1]; if (!L || Math.hypot(L[0] - pt[0], L[1] - pt[1]) > 2) ED.draft.pts.push(pt); } edFinishDraft(); }
/* ---- visual pickers (kind, path style, light type) ---- */
const PICK_SETS = {
  kind: () => [...new Set([...ED_PROPS.map(p => p[1]), ...ED_KINDS, ...(ED.obs || []).map(o => o.kind)])].filter(k => k !== 'border' && k !== 'water').sort().map(k => ({ v: k, label: (ED_PROPS.find(p => p[1] === k) || [k])[0], draw: cv => drawPreview(cv, edSample(kindSample(k), 0, 0)) })),
  style: () => Object.entries(PATH_STYLES).map(([k, n]) => ({ v: k, label: n, draw: cv => { const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); x.save(); x.lineCap = 'round'; x.lineWidth = cv.height * .5; x.strokeStyle = EDGE_COL[k] || '#8a6e44'; x.beginPath(); x.moveTo(6, cv.height * .7); x.quadraticCurveTo(cv.width / 2, cv.height * .1, cv.width - 6, cv.height * .6); x.stroke(); x.lineWidth = cv.height * .4; x.strokeStyle = x.createPattern(styleTile(k === 'dirt' ? 'dirt' : k), 'repeat'); x.stroke(); x.restore(); } })),
  floor: () => Object.entries(FLOOR_TEX).map(([k, n]) => ({ v: k, label: n, draw: cv => { const x = cv.getContext('2d'); x.fillStyle = x.createPattern(styleTile(k), 'repeat'); x.fillRect(0, 0, cv.width, cv.height); } })),
  base: () => [{ v: '', label: 'Map default', draw: cv => { const x = cv.getContext('2d'); x.drawImage(ED.floorBase, 0, 0, cv.width, cv.height); } }, ...PICK_SETS.floor()],
  light: () => Object.entries(LCOL).map(([k, c]) => ({ v: k, label: k, draw: cv => { const x = cv.getContext('2d'), w = cv.width, h = cv.height; x.clearRect(0, 0, w, h); x.fillStyle = '#0c0b10'; x.fillRect(0, 0, w, h); const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, `rgba(${c},1)`); g.addColorStop(.4, `rgba(${c},.45)`); g.addColorStop(1, `rgba(${c},0)`); x.fillStyle = g; x.fillRect(0, 0, w, h); } })),
};
function edPickBtn(btn, set, v) { const it = PICK_SETS[set]().find(i => i.v === v) || { v, label: v, draw: cv => drawPreview(cv, edSample(kindSample(v), 0, 0)) }; btn.innerHTML = `<canvas width="56" height="40"></canvas><span>${it.label}</span><i>▾</i>`; it.draw(btn.querySelector('canvas')); }
function edPicker(anchor, set, cur, onPick) {
  document.querySelectorAll('.edpop').forEach(p => p.remove());
  const items = PICK_SETS[set](), pop = document.createElement('div'); pop.className = 'edpop';
  pop.innerHTML = `${items.length > 10 ? '<input class="edpops" placeholder="Search…">' : ''}<div class="edpopg">${items.map(i => `<button data-v="${i.v}" class="${i.v === cur ? 'on' : ''}"><canvas width="84" height="60"></canvas><span>${i.label}</span></button>`).join('')}</div>`;
  document.body.appendChild(pop);
  pop.querySelectorAll('button').forEach((b, k) => { items[k].draw(b.querySelector('canvas')); b.onclick = () => { pop.remove(); onPick(b.dataset.v); }; });
  const r = anchor.getBoundingClientRect(), pw = Math.min(460, innerWidth - 16); pop.style.width = pw + 'px';
  pop.style.left = clamp(r.right - pw, 8, innerWidth - pw - 8) + 'px'; pop.style.top = Math.min(r.bottom + 6, innerHeight - 340) + 'px';
  const q = pop.querySelector('.edpops'); if (q) { q.focus(); q.oninput = () => pop.querySelectorAll('button').forEach(b => { b.style.display = b.textContent.toLowerCase().includes(q.value.toLowerCase()) || b.dataset.v.includes(q.value.toLowerCase()) ? '' : 'none'; }); }
  setTimeout(() => { const off = ev => { if (!pop.contains(ev.target)) { pop.remove(); removeEventListener('pointerdown', off, true); } }; addEventListener('pointerdown', off, true); }, 0);
}

/* ---- status bar, minimap ---- */
const ED_KEYS = { // the keys that matter for each tool, shown in the corner of the map view
  select: [['Click', 'select'], ['Shift+click', 'add to selection'], ['Drag', 'move / box-select'], ['Alt+drag', 'duplicate'], ['Arrows', 'nudge'], ['Q', 'rotate'], ['[ ]', 'size'], ['Del', 'delete'], ['Ctrl+D', 'duplicate'], ['F', 'focus']],
  selPath: [['Drag point', 'bend'], ['Dbl-click line', 'add point'], ['A', 'add point at cursor'], ['Alt+click point', 'remove point'], ['[ ]', 'width'], ['Shift+[ ]', 'resize shape'], ['Q', 'rotate'], ['Del', 'delete']],
  selPoly: [['Drag point', 'reshape'], ['Dbl-click edge', 'add point'], ['A', 'add point at cursor'], ['Alt+click point', 'remove point'], ['Shift+[ ]', 'resize'], ['Q', 'rotate'], ['Del', 'delete']],
  wall: [['Drag', 'draw along its length'], ['Alt', 'no snap'], ['V', 'back to select'], ['Esc', 'cancel']],
  rect: [['Drag', 'draw a block'], ['Alt', 'no snap'], ['V', 'back to select'], ['Esc', 'cancel']],
  path: [['Click', 'place point'], ['A', 'point at cursor'], ['E', 'end at cursor'], ['Enter / dbl-click', 'finish'], ['Click a path end', 'extend it'], ['Esc', 'cancel']],
  water: [['Click', 'place point'], ['A', 'point at cursor'], ['Click first point', 'fill'], ['Enter', 'fill'], ['Esc', 'cancel']],
  area: [['Click', 'place point'], ['A', 'point at cursor'], ['Click first point', 'fill'], ['Enter', 'fill'], ['Esc', 'cancel']],
  light: [['Click', 'add a light'], ['V', 'back to select'], ['Esc', 'cancel']],
  prop: [['Click', 'place'], ['Shift+click', 'keep placing'], ['Alt', 'no snap'], ['Esc', 'cancel']],
  pan: [['Drag', 'pan'], ['Wheel', 'zoom'], ['0', 'fit'], ['V', 'back to select']],
  view: [['Wheel', 'zoom'], ['Space+drag', 'pan'], ['Right-click', 'actions'], ['Ctrl+Z', 'undo']],
};
function edKeyTips() {
  const el = ED.root && ED.root.querySelector('.edkeys'); if (!el) return;
  let k = ED.tool; if (k === 'select' && ED.sel.length === 1) { const s0 = ED.sel[0], o = edItem(s0); if (s0.t === 'p') k = 'selPath'; else if (o && o.poly) k = 'selPoly'; }
  const list = [...(ED_KEYS[k] || []), ...ED_KEYS.view], key = k + ':' + ED.sel.length; if (el._k === key) return; el._k = key;
  el.innerHTML = list.map(([a, b]) => `<span><kbd>${a}</kbd>${b}</span>`).join('');
}
function edStatusBar(r) {
  edKeyTips();
  const R = ED.root; if (!R) return; const t = ED_TOOLS.find(q => q[0] === ED.tool);
  R.querySelector('.edst-tool').textContent = ED.draft ? (ED.draft.kind === 'path' ? `Drawing a path · ${ED.draft.pts.length} points · A add point · E/Enter end · Esc cancel` : `Drawing ${ED.draft.kind === 'area' ? 'a floor area' : 'water'} · ${ED.draft.pts.length} points · click the first point or Enter to fill`) : ED.tool === 'prop' && ED.ghost ? `Placing: ${ED.ghost[0]} (Shift keeps placing)` : (t ? t[1] : '');
  R.querySelector('.edst-sel').textContent = ED.sel.length ? `${ED.sel.length} selected` : `${ED.obs.length} objects · ${ED.lights.length} lights · ${ED.trails.length} paths`;
  if (ED.mouse) { const [mx, my] = edW(...ED.mouse); ED.coords.textContent = `x ${Math.round(mx)}  y ${Math.round(my)}`; }
  R.querySelector('.edzv').textContent = Math.round(ED.z * 100 / (Math.min(r.width / W, r.height / H) * .95)) + '%';
}
function edMinimap(r) {
  const c = ED.mm, x = c.getContext('2d'), s = Math.min(c.width / W, c.height / H);
  if (!ED.mmT || performance.now() - ED.mmT > 400) { ED.mmT = performance.now(); // the map itself is redrawn twice a second
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height); x.setTransform(s, 0, 0, s, 0, 0); x.drawImage(ED.floor, 0, 0, W, H);
    for (const o of ED.obs) if (!o._hide) { x.fillStyle = o.kind === 'water' ? '#4aa3df' : o.color || '#888'; fillObs(x, o); } ED.mmImg = x.getImageData(0, 0, c.width, c.height); }
  else if (ED.mmImg) x.putImageData(ED.mmImg, 0, 0);
  x.setTransform(1, 0, 0, 1, 0, 0); const [a0, b0] = edW(0, 0), [a1, b1] = edW(r.width, r.height);
  x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.strokeRect(a0 * s, b0 * s, (a1 - a0) * s, (b1 - b0) * s);
}
/* ---- layers ---- */
function edLayerName(t, o) { const v = t === 'o' && edVariant(o); return t === 'a' ? `Floor · ${FLOOR_TEX[o.tex] || o.tex}` : t === 'l' ? `Light · ${o.kind || 'fixed'}` : t === 'p' ? `Path · ${PATH_STYLES[o.style || 'dirt']}` : o.poly ? 'Water (shape)' : v && v[0] ? v[1] : ((ED_PROPS.find(p => p[1] === o.kind) || [o.kind])[0]); }
function edLayers() {
  const el = ED.root && ED.root.querySelector('.edlayers'); if (!el || el.style.display === 'none') return;
  const q = (ED.layQ || '').toLowerCase(), f = ED.layF || 'all';
  const rows = [...ED.obs.map((o, i) => ['o', i, o]), ...ED.lights.map((o, i) => ['l', i, o]), ...ED.trails.map((o, i) => ['p', i, o]), ...ED.areas.map((o, i) => ['a', i, o])]
    .filter(([t, i, o]) => (f === 'all' || (f === 'props' && t === 'o' && !o.poly) || (f === 'lights' && t === 'l') || (f === 'paths' && t === 'p') || (f === 'water' && t === 'o' && o.poly) || (f === 'floor' && t === 'a')) && edLayerName(t, o).toLowerCase().includes(q)).reverse();
  el.innerHTML = `<input class="edsearch edlq" placeholder="Search layers…" value="${q}"><div class="edchips">${['all', 'props', 'lights', 'paths', 'water', 'floor'].map(k => `<button data-lf="${k}" class="${f === k ? 'on' : ''}">${k}</button>`).join('')}</div>
    <div class="edlrows">${rows.slice(0, 400).map(([t, i, o]) => { const on = ED.sel.some(s => s.t === t && s.i === i); return `<div class="edlrow ${on ? 'on' : ''} ${o._hide ? 'hid' : ''}" data-t="${t}" data-i="${i}"><i class="sw" style="background:${t === 'a' ? '#7a9a5a' : t === 'l' ? `rgb(${edLightCol(o)})` : t === 'p' ? (EDGE_COL[o.style] || '#b79a68') : o.poly ? '#4aa3df' : o.color}"></i><span>${edLayerName(t, o)}</span>
      <button class="lv ${o._hide ? '' : 'on'}" title="Show / hide in the editor">${edSvg('eye', 13)}</button><button class="lk ${o._lock ? 'on' : ''}" title="Lock: can't be clicked on the map">${edSvg('lock', 13)}</button></div>`; }).join('')}${rows.length > 400 ? `<p class="edhint">${rows.length - 400} more… search to narrow it down</p>` : ''}${rows.length ? '' : '<p class="edhint">Nothing here.</p>'}</div>`;
  const lq = el.querySelector('.edlq'); lq.oninput = () => { ED.layQ = lq.value; edLayers(); const n = ED.root.querySelector('.edlq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  el.querySelectorAll('[data-lf]').forEach(b => b.onclick = () => { ED.layF = b.dataset.lf; edLayers(); });
  el.querySelectorAll('.edlrow').forEach(r => { const t = r.dataset.t, i = +r.dataset.i, o = edItem({ t, i });
    r.onclick = e => { if (e.target.closest('button')) return; const it = { t, i }; ED.sel = e.shiftKey || e.ctrlKey ? (ED.sel.some(s => edSame(s, it)) ? ED.sel.filter(s => !edSame(s, it)) : [...ED.sel, it]) : [it]; edPanel(); };
    r.ondblclick = () => { ED.sel = [{ t, i }]; edFocus(); edPanel(); };
    r.querySelector('.lv').onclick = () => { edPush(); if (o._hide) delete o._hide; else o._hide = true; if (t === 'p') edFloor(true); edLayers(); };
    r.querySelector('.lk').onclick = () => { edPush(); if (o._lock) delete o._lock; else o._lock = true; edLayers(); }; });
}
/* ---- right-click menu ---- */
function edContext(cx, cy, wx, wy) {
  document.querySelectorAll('.edctx').forEach(m => m.remove());
  const hit = edHit(wx, wy); if (hit && !ED.sel.some(s => edSame(s, hit))) { ED.sel = [hit]; edPanel(); }
  const has = ED.sel.length > 0, items = has ? [['dup', 'Duplicate', 'Ctrl+D'], ['copy', 'Copy', 'Ctrl+C'], ['paste', 'Paste here', 'Ctrl+V'], ['del', 'Delete', 'Del'], '-', ['rotL', `Rotate −${ED.snaps.rot.step}°`, 'Shift+Q'], ['rotR', `Rotate +${ED.snaps.rot.step}°`, 'Q'], ['front', 'Bring to front'], ['back', 'Send to back'], '-', ['focus', 'Focus', 'F'], ['lock', 'Lock', 'Ctrl+L'], ['hide', 'Hide', 'Ctrl+H'], ...(ED.sel.length === 1 && ED.sel[0].t === 'o' ? [['propEd', `Edit every ${edItem(ED.sel[0]).kind}…`]] : [])]
    : [['paste', 'Paste here', 'Ctrl+V'], ['all', 'Select all', 'Ctrl+A'], '-', ['tool:wall', 'Draw wall', 'W'], ['tool:path', 'Draw path', 'T'], ['tool:water', 'Draw water', 'Y'], ['tool:light', 'Add light', 'L'], '-', ['fit', 'Fit map', '0']];
  const m = document.createElement('div'); m.className = 'edctx edmlist';
  m.innerHTML = items.map(it => it === '-' ? '<hr>' : `<button data-c="${it[0]}"><span>${it[1]}</span>${it[2] ? `<kbd>${it[2]}</kbd>` : ''}</button>`).join('');
  document.body.appendChild(m); m.style.left = Math.min(cx, innerWidth - 230) + 'px'; m.style.top = Math.min(cy, innerHeight - m.offsetHeight - 8) + 'px';
  const extra = { rotL: () => edRotateBy(-ED.snaps.rot.step), rotR: () => edRotateBy(ED.snaps.rot.step), front: () => edOrder(true), back: () => edOrder(false) };
  m.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { m.remove(); const c = b.dataset.c; if (extra[c]) extra[c](); else edCmd(c); });
  setTimeout(() => { const off = ev => { if (!m.contains(ev.target)) { m.remove(); removeEventListener('pointerdown', off, true); } }; addEventListener('pointerdown', off, true); }, 0);
}
/* ---- leaving: offer to share first ---- */
function edModal(title, body, buttons) { // a small dialog; buttons: [label, fn, style]
  document.querySelectorAll('.edmodal').forEach(m => m.remove());
  const m = document.createElement('div'); m.className = 'edmodal';
  m.innerHTML = `<div class="edmwin"><h3>${title}</h3><div class="edmbody">${body}</div><div class="edmbtns">${buttons.map(([l, , st], i) => `<button data-b="${i}" class="${st || ''}">${l}</button>`).join('')}</div></div>`;
  document.body.appendChild(m); m.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { const f = buttons[+b.dataset.b][1]; if (f !== 'keep') m.remove(); if (typeof f === 'function') f(m); });
  m.onpointerdown = e => { if (e.target === m) m.remove(); };
  return m;
}
const _edClose = closeEditor;
closeEditor = function (play) {
  if (play) { const k = mapEditKey(MAPS[ED.map].name), all = {}; const keep = edDrafts; // build the test copy from the editor as it is now
    const clean = list => list.map(o => { const c = {}; for (const q in o) if (!ED_RUNTIME.has(q)) c[q] = o[q]; return c; });
    edTestData = { k, d: edClone({ obs: clean(ED.obs), lights: clean(ED.lights), trails: ED.trails, areas: ED.areas.map(a => ({ poly: a.poly, tex: a.tex, sharp: a.sharp, edge: a.edge })), base: ED.base || undefined }) };
    return _edClose(true); }
  if (ED.dirtySave) return edModal('Save your changes?', `<p>You have unsaved changes to ${MAPS[ED.map].name}.</p>`, [['Cancel', null, ''], ["Don't save", () => { ED.dirtySave = false; closeEditor(); }, 'warn'], ['Save', () => { edSave(); closeEditor(); }, 'edprimary']]);
  clearInterval(ED.autoT);
  if (!ED.unshared) return _edClose(play);
  edModal('Leave the map editor?', `<p>Your changes are saved in this browser, but you haven't shared them yet. Share them so they can be added to the game for everyone.</p>`,
    [['Stay', null, ''], ['Leave without sharing', () => { ED.unshared = false; _edClose(); }, 'warn'], ['Share first', () => edShare(), 'edprimary']]);
};
/* ---- sharing: everything you edited, or just one thing ---- */
function edLocalProps() { try { return JSON.parse(localStorage.getItem('snakeCarnagePropDefs')) || {}; } catch (e) { return {}; } }
function edShareItems() { const maps = { ...localMapEdits(), ...edDrafts() }, props = edLocalProps();
  return [...Object.keys(maps).map(k => ({ id: 'm:' + k, label: `Map: ${k.split('@')[0]}`, sub: `${k.split('@')[1]} wide · ${maps[k].obs.length} objects, ${(maps[k].lights || []).length} lights, ${(maps[k].trails || []).length} paths` })),
    ...Object.keys(props).map(k => ({ id: 'p:' + k, label: `Prop: ${k}`, sub: Object.keys(props[k]).join(', ') || 'reset to default' }))]; }
function edSharePayload(ids) { const maps = { ...localMapEdits(), ...edDrafts() }, props = edLocalProps(), out = { maps: {}, props: {} };
  for (const id of ids) { const [t, k] = [id.slice(0, 1), id.slice(2)]; if (t === 'm') out.maps[k] = maps[k]; else out.props[k] = props[k]; }
  return `SNAKE CARNAGE EDITS v1 (paste this to Claude to add it to the game)\n${JSON.stringify(out)}`; }
edShare = function (only) {
  if (ED.open) edSave(); const items = edShareItems();
  if (!items.length) return edModal('Nothing to share yet', '<p>Edit a map or a prop first. Only things you changed are shared.</p>', [['OK', null, 'edprimary']]);
  const m = edModal('Share your edits', `<div class="edshopt"><label class="edrad"><input type="radio" name="shs" value="all" ${only ? '' : 'checked'}><span><b>Everything I've edited</b><small>${items.map(i => i.label).join(' · ')}</small></span></label>
      <label class="edrad"><input type="radio" name="shs" value="one" ${only ? 'checked' : ''}><span><b>Just one</b><select class="edsh1">${items.map(i => `<option value="${i.id}" ${i.id === only ? 'selected' : ''}>${i.label} (${i.sub})</option>`).join('')}</select></span></label></div>
    <textarea readonly class="edshtxt"></textarea><p class="edhint edshmsg">Copy this and paste it into your chat with Claude, or download it as a file and attach that.</p>`,
    [['Close', null, ''], ['Download file', mm => { const t = mm.querySelector('.edshtxt').value, a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = 'snake-carnage-edits.txt'; a.click(); ED.unshared = false; mm.querySelector('.edshmsg').textContent = 'Downloaded snake-carnage-edits.txt: attach it in the chat.'; }, 'keepopen'],
     ['Copy to clipboard', mm => { const ta = mm.querySelector('.edshtxt'); (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).catch(() => { ta.select(); document.execCommand('copy'); }).finally(() => { ED.unshared = false; mm.querySelector('.edshmsg').textContent = 'Copied. Paste it into the chat.'; }); }, 'edprimary keepopen']]);
  const upd = () => { const all = m.querySelector('input[value="all"]').checked; m.querySelector('.edsh1').disabled = all; m.querySelector('.edshtxt').value = edSharePayload(all ? items.map(i => i.id) : [m.querySelector('.edsh1').value]); };
  m.querySelectorAll('input[name="shs"],.edsh1').forEach(el => el.onchange = upd); upd();
  // the two action buttons stay open (they report what happened)
  const btns = m.querySelectorAll('[data-b]'); btns[1].onclick = () => { const t = m.querySelector('.edshtxt').value, a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = 'snake-carnage-edits.txt'; a.click(); ED.unshared = false; m.querySelector('.edshmsg').textContent = 'Downloaded snake-carnage-edits.txt: attach it in the chat.'; };
  btns[2].onclick = () => { const ta = m.querySelector('.edshtxt'); (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).catch(() => { ta.select(); document.execCommand('copy'); }).finally(() => { ED.unshared = false; m.querySelector('.edshmsg').textContent = 'Copied. Paste it into the chat.'; }); };
};

/* ---- turning a prop's original drawing into editable shapes ----
   The game's drawing code runs against a recording context: every filled or stroked rect, circle, ellipse and path
   becomes a shape in the prop's box (0..1), keeping its color. Gradients become their middle color. */
function recordProp(kind) {
  const smp = kindSample(kind), o = edSample(smp, 0, 0), [x0, y0, x1, y1] = o.t === 'r' ? [o.x, o.y, o.x + o.w, o.y + o.h] : [o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r], bw = x1 - x0, bh = y1 - y0;
  const out = [], col = v => typeof v === 'string' ? v : (v && v._mid) || '#888888';
  let M = new DOMMatrix(), st = [], path = [], sub = null, S = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1 };
  const P = (x, y) => { const q = M.transformPoint({ x, y }); return [(q.x - x0) / bw, (q.y - y0) / bh]; };
  const sc = () => Math.hypot(M.a, M.b);
  const shapeOf = (pts, closed) => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), mx = Math.min(...xs), Mx = Math.max(...xs), my = Math.min(...ys), My = Math.max(...ys), w = Math.max(.001, Mx - mx), h = Math.max(.001, My - my);
    return { type: 'poly', x: (mx + Mx) / 2, y: (my + My) / 2, w, h, rot: 0, pts: pts.map(([u, v]) => [Math.round((u - mx) / w * 1000) / 1000, Math.round((v - my) / h * 1000) / 1000]), closed }; };
  const push = (sh, c, stroke) => { sh.c = edHex(col(c)); sh.a = Math.round(S.globalAlpha * 100) / 100; if (stroke) { sh.stroke = true; sh.lw = Math.max(.005, S.lineWidth * sc() / Math.min(bw, bh)); } out.push(sh); };
  const arcPts = (cx, cy, r, a0, a1, ccw) => { const n = 24, pts = []; let d = a1 - a0; if (ccw && d > 0) d -= TAU; if (!ccw && d < 0) d += TAU; for (let k = 0; k <= n; k++) { const a = a0 + d * k / n; pts.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); } return pts; };
  const grad = (stops) => { const g = { _mid: '#888888', addColorStop(t, c) { if (!g._s || Math.abs(t - .5) < Math.abs(g._s - .5)) { g._s = t; g._mid = c; } } }; return g; };
  const rec = new Proxy({}, { get(_, k) {
    if (k in S) return S[k];
    const f = {
      save() { st.push([M, { ...S }]); }, restore() { const t = st.pop(); if (t) { M = t[0]; S = t[1]; } },
      translate(x, y) { M = M.translate(x, y); }, rotate(a) { M = M.rotate(a * 180 / Math.PI); }, scale(a, b) { M = M.scale(a, b); }, setTransform() {}, transform() {},
      beginPath() { path = []; sub = null; }, moveTo(x, y) { sub = [P(x, y)]; path.push(sub); }, lineTo(x, y) { if (!sub) { sub = []; path.push(sub); } sub.push(P(x, y)); },
      quadraticCurveTo(cx, cy, x, y) { f.lineTo(x, y); }, bezierCurveTo(a, b, c, d, x, y) { f.lineTo(x, y); }, closePath() { if (sub) sub.closed = true; },
      arc(cx, cy, r, a0, a1, ccw) { const pts = arcPts(cx, cy, r, a0, a1, ccw); if (sub && sub.length) sub.push(...pts); else { sub = pts; path.push(sub); } },
      ellipse(cx, cy, rx, ry, rot, a0, a1) { const pts = []; for (let k = 0; k <= 24; k++) { const a = a0 + (a1 - a0) * k / 24; pts.push(P(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)); } sub = pts; path.push(sub); },
      rect(x, y, w, h) { sub = [P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)]; sub.closed = true; path.push(sub); },
      fill() { for (const p of path) if (p.length > 2) push(shapeOf(p, true), S.fillStyle); },
      stroke() { for (const p of path) if (p.length > 1) push(shapeOf(p, !!p.closed), S.strokeStyle, true); },
      fillRect(x, y, w, h) { push(shapeOf([P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)], true), S.fillStyle); },
      strokeRect(x, y, w, h) { push(shapeOf([P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)], true), S.strokeStyle, true); },
      createLinearGradient: grad, createRadialGradient: grad, createPattern: () => '#888888', clip() {}, fillText() {}, strokeText() {}, measureText: () => ({ width: 0 }), setLineDash() {}, drawImage() {}, getTransform: () => M,
    };
    return f[k] || (() => {});
  }, set(_, k, v) { S[k] = v; return true; } });
  const keep = propCache[kind]; delete propCache[kind];
  try { _drawObstacle(rec, o); if (kind === 'tree' || kind === 'bush') { S.fillStyle = o.color; S.globalAlpha = .9; rec.beginPath(); rec.arc(o.x, o.y, o.r, 0, TAU); rec.fill(); } } finally { if (keep) propCache[kind] = keep; }
  return out.filter(s => s.w * s.h > 1e-5 || s.stroke).slice(0, 300);
}

/* ---- your own saved maps: named copies in this browser, plus map files you can keep anywhere ----
   (there are no online accounts in the game, so a file is how a map goes to another computer) */
const LIB_KEY = 'snakeCarnageMapLib';
function edLib() { try { return JSON.parse(localStorage.getItem(LIB_KEY)) || {}; } catch (e) { return {}; } }
function edSnapshot() { edSave(); return { map: MAPS[ED.map].name, w: W, date: Date.now(), data: edDrafts()[mapEditKey(MAPS[ED.map].name)] }; }
function edSaveAs() {
  const def = `${MAPS[ED.map].name} ${new Date().toLocaleDateString()}`;
  const m = edModal('Save a copy', `<p>Keeps this version of ${MAPS[ED.map].name} under a name, in this browser. You can load it again from <b>File → My saved maps</b>.</p><input type="text" class="libname" value="${def}" maxlength="60">`,
    [['Cancel', null, ''], ['Save', mm => { const n = mm.querySelector('.libname').value.trim() || def, lib = edLib(); const go = () => { lib[n] = edSnapshot(); try { localStorage.setItem(LIB_KEY, JSON.stringify(lib)); edStatus(`Saved as "${n}"`); } catch (e) { edStatus('Could not save (browser storage full?): download it as a file instead'); } };
      if (lib[n]) edModal('Replace it?', `<p>You already have a map saved as "${n}".</p>`, [['Cancel', null, ''], ['Replace', go, 'edprimary']]); else go(); }, 'edprimary']]);
  const inp = m.querySelector('.libname'); inp.focus(); inp.select(); inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') m.querySelector('.edprimary').click(); };
}
function edLoadSnap(sn) {
  const i = MAPS.findIndex(q => q.name === sn.map); if (i < 0) return edStatus('That map no longer exists');
  if (sn.w !== W) edStatus(`Made on a ${sn.w}-wide world; this screen's world is ${W} wide, so the sides may differ`);
  const all = edDrafts(); all[mapEditKey(sn.map)] = sn.data; localStorage.setItem('snakeCarnageEdDrafts', JSON.stringify(all));
  cancelAnimationFrame(ED.raf); ED.root.remove(); removeEventListener('keydown', edKey, true); removeEventListener('keyup', edKey, true); openEditor(i); ED.unshared = true;
}
function edLibrary() {
  const lib = edLib(), names = Object.keys(lib).sort((a, b) => lib[b].date - lib[a].date);
  const m = edModal('My saved maps', names.length ? `<div class="edlib">${names.map(n => `<div class="edlibrow" data-n="${encodeURIComponent(n)}"><div><b>${n.replace(/</g, '&lt;')}</b><small>${lib[n].map} · ${new Date(lib[n].date).toLocaleString()}</small></div><button class="ld edprimary">Open</button><button class="dl">Download</button><button class="rm warn">Delete</button></div>`).join('')}</div><p class="edhint">Opening one replaces the current edits of that map (save a copy first if you want to keep them).</p>`
    : '<p>Nothing saved yet. Use <b>File → Save a copy as…</b> (Ctrl+Shift+S).</p>', [['Close', null, ''], ['Open a map file…', () => edOpenFile(), '']]);
  m.querySelectorAll('.edlibrow').forEach(r => { const n = decodeURIComponent(r.dataset.n);
    r.querySelector('.ld').onclick = () => { m.remove(); edLoadSnap(edLib()[n]); };
    r.querySelector('.dl').onclick = () => edDownloadSnap(edLib()[n], n);
    r.querySelector('.rm').onclick = () => { const l = edLib(); delete l[n]; localStorage.setItem(LIB_KEY, JSON.stringify(l)); r.remove(); }; });
}
function edDownloadSnap(sn, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ snakeCarnageMap: 1, ...sn })], { type: 'application/json' })); a.download = (name || sn.map).replace(/[^\w\- ]+/g, '') + '.scmap.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
function edDownloadMap() { edDownloadSnap(edSnapshot(), MAPS[ED.map].name); edStatus('Downloaded: keep the file anywhere, open it again with File → Open a map file'); }
function edOpenFile() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,.txt,.js';
  inp.onchange = () => inp.files[0] && inp.files[0].text().then(t => { try { const d = JSON.parse(t); if (d.snakeCarnageMap) { document.querySelectorAll('.edmodal').forEach(x => x.remove()); return edLoadSnap(d); } } catch (e) {} edImport(inp.files[0]); });
  inp.click();
}

/* ---- editor saves stay in the editor until you choose to play them in the game ---- */
function edApply() {
  if (ED.dirtySave) edSave(); const k = mapEditKey(MAPS[ED.map].name), d = edDrafts()[k]; if (!d) return edStatus('Nothing saved to apply yet');
  const all = localMapEdits(); all[k] = d; localStorage.setItem('snakeCarnageMapEdits', JSON.stringify(all));
  edModal('Using your version', `<p>Normal runs on ${MAPS[ED.map].name} now use your edited map (in this browser). <b>File → Go back to the original in my game</b> undoes it.</p>`, [['OK', null, 'edprimary']]);
}
function edUnapply() { const all = localMapEdits(); delete all[mapEditKey(MAPS[ED.map].name)]; localStorage.setItem('snakeCarnageMapEdits', JSON.stringify(all)); edStatus(`Normal runs on ${MAPS[ED.map].name} use the original map again (your editor copy is kept)`); }
try { if (!localStorage.getItem('snakeCarnageEdDrafts') && localStorage.getItem('snakeCarnageMapEdits')) localStorage.setItem('snakeCarnageEdDrafts', localStorage.getItem('snakeCarnageMapEdits')); } catch (e) {} // edits from before drafts existed

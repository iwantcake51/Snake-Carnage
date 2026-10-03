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
  ['Booth', 'booth', 'r', 40, 100, '#5a1a3a'], ['Pod', 'pod', 'c', 20, 0, '#7fffc8'], ['Cryo tube', 'cryo', 'r', 36, 70, '#a9c4cc'], ['Silo', 'silo', 'c', 36, 0, '#b8b8c0'],
];
const ED_KINDS = [...new Set(ED_PROPS.map(p => p[1]).concat(['barn', 'module', 'tube', 'solar', 'dome', 'lander', 'gazebo', 'slide', 'chess', 'dj', 'holo', 'saucer', 'reactor']))].sort();
const ED_FIX = ['panel', 'strip', 'cage', 'spot', 'pool', 'exit', 'none'];
const ED = { open: false };
const edHex = c => { if (!c) return '#ffffff'; if (c[0] === '#') return c.length === 4 ? '#' + [...c.slice(1)].map(h => h + h).join('') : c.slice(0, 7); const m = c.match(/\d+/g) || [255, 255, 255]; return '#' + m.slice(0, 3).map(v => (+v).toString(16).padStart(2, '0')).join(''); };
const edRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
const edClone = v => JSON.parse(JSON.stringify(v));
const edLightCol = l => l.c || LCOL[l.kind || (MAPS[ED.map].indoor ? 'fluor' : 'fixed')] || '255,214,150';

function openEditor(idx = mapIdx) {
  ED.map = idx; ED.open = true; ED.tool = 'select'; ED.sel = []; ED.undo = []; ED.redo = []; ED.grid = 8; ED.snap = true; ED.showGrid = true; ED.lit = false; ED.help = true; ED.pal = null;
  state = 'editor'; overlay.style.display = 'none'; season = null;
  loadMap(idx); creatures = [];
  ED.obs = edClone(curPre); ED.lights = edClone(curMapLights);
  const b = MAPS[idx].build(); ED.floor = makeLayer()[0]; { const x = ED.floor.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0); b.floor(x); }
  ED.border = MAPS[idx].border;
  edBuildUI(); edFit(); edLoop();
}
function closeEditor(play) {
  ED.open = false; cancelAnimationFrame(ED.raf); ED.root.remove(); removeEventListener('keydown', edKey, true);
  overlay.style.display = '';
  if (play) { mapIdx = ED.map; showMenu(); startGame(); } else { mapIdx = ED.map; loadMap(ED.map); showMenu(); }
}
/* ---- edits: undo history, saving ---- */
function edPush() { ED.undo.push(edClone({ o: ED.obs, l: ED.lights })); if (ED.undo.length > 200) ED.undo.shift(); ED.redo = []; edDirty(); }
function edUndo(dir) {
  const from = dir < 0 ? ED.undo : ED.redo, to = dir < 0 ? ED.redo : ED.undo; if (!from.length) return;
  to.push(edClone({ o: ED.obs, l: ED.lights })); const s = from.pop(); ED.obs = s.o; ED.lights = s.l; ED.sel = []; edDirty(); edPanel();
}
function edDirty() { clearTimeout(ED.saveT); ED.saveT = setTimeout(edSave, 400); edStatus('Unsaved changes…'); }
function edSave() {
  const all = localMapEdits(); all[mapEditKey(MAPS[ED.map].name)] = { obs: ED.obs, lights: ED.lights };
  try { localStorage.setItem('snakeCarnageMapEdits', JSON.stringify(all)); edStatus('Saved in this browser'); } catch (e) { edStatus('Could not save (storage full?)'); }
}
function edReset() {
  if (!confirm('Throw away your edits to ' + MAPS[ED.map].name + ' and go back to the original layout?')) return;
  const all = localMapEdits(); delete all[mapEditKey(MAPS[ED.map].name)]; try { localStorage.setItem('snakeCarnageMapEdits', JSON.stringify(all)); } catch (e) {}
  const keep = MAP_OVERRIDES[mapEditKey(MAPS[ED.map].name)]; if (keep) delete MAP_OVERRIDES[mapEditKey(MAPS[ED.map].name)];
  loadMap(ED.map); ED.obs = edClone(curPre); ED.lights = edClone(curMapLights); ED.undo = []; ED.redo = []; ED.sel = []; edPanel(); edStatus('Back to the original');
}
function edExport() {
  edSave(); const all = { ...MAP_OVERRIDES, ...localMapEdits() };
  const src = document.getElementById('editorSrc') ? '' : '';
  const text = `/* =========================================================\n   MAP EDITS (exported from the map editor)\n   ========================================================= */\nconst MAP_OVERRIDES = ${JSON.stringify(all)};\nconst mapEditKey = name => name + '@' + W;\nfunction localMapEdits() { try { return JSON.parse(localStorage.getItem('snakeCarnageMapEdits')) || {}; } catch (e) { return {}; } }\nfunction mapOverride(name) { const k = mapEditKey(name); return localMapEdits()[k] || MAP_OVERRIDES[k] || null; }\n` + src;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' })); a.download = '05c-map-overrides.js'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  edStatus('Exported 05c-map-overrides.js: put it in the js folder to ship these edits');
}
function edImport(file) {
  file.text().then(t => { const m = t.match(/MAP_OVERRIDES = (\{[\s\S]*?\});\n/); const data = JSON.parse(m ? m[1] : t);
    const all = { ...localMapEdits(), ...data }; localStorage.setItem('snakeCarnageMapEdits', JSON.stringify(all));
    const ov = mapOverride(MAPS[ED.map].name); if (ov) { edPush(); ED.obs = edClone(ov.obs); ED.lights = edClone(ov.lights); } edStatus('Imported ' + Object.keys(data).length + ' map(s)'); edPanel(); })
    .catch(() => edStatus('That file is not a map export'));
}
/* ---- view: pan and zoom ---- */
function edFit() { const r = ED.cv.getBoundingClientRect(); ED.z = Math.min(r.width / W, r.height / H) * .95; ED.px = (r.width - W * ED.z) / 2; ED.py = (r.height - H * ED.z) / 2; }
const edW = (sx, sy) => [(sx - ED.px) / ED.z, (sy - ED.py) / ED.z];
function edZoom(f, sx, sy) { const [wx, wy] = edW(sx, sy); ED.z = clamp(ED.z * f, .15, 24); ED.px = sx - wx * ED.z; ED.py = sy - wy * ED.z; }
const edSnap = (v, force) => (ED.snap && !ED.noSnap) || force ? Math.round(v / ED.grid) * ED.grid : Math.round(v * 2) / 2;
/* ---- hit testing ---- */
const edBox = o => o.t === 'r' ? [o.x, o.y, o.x + o.w, o.y + o.h] : [o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r];
function edHit(wx, wy) {
  const pad = 4 / ED.z;
  for (let i = ED.lights.length - 1; i >= 0; i--) { const l = ED.lights[i]; if (Math.hypot(wx - l.x, wy - l.y) < 9 / ED.z + 3) return { t: 'l', i }; }
  for (let i = ED.obs.length - 1; i >= 0; i--) { const o = ED.obs[i];
    if (o.t === 'r' ? wx >= o.x - pad && wx <= o.x + o.w + pad && wy >= o.y - pad && wy <= o.y + o.h + pad : Math.hypot(wx - o.x, wy - o.y) <= o.r + pad) return { t: 'o', i }; }
  return null;
}
const edItem = s => s.t === 'o' ? ED.obs[s.i] : ED.lights[s.i];
const edSame = (a, b) => a.t === b.t && a.i === b.i;
function edHandles() { // resize handles for a single selected object or light
  if (ED.sel.length !== 1) return [];
  const s = ED.sel[0], o = edItem(s);
  if (s.t === 'l') return [{ k: 'lr', x: o.x + o.r, y: o.y }];
  if (o.t === 'c') return [{ k: 'r', x: o.x + o.r, y: o.y }];
  const { x, y, w, h } = o; return [['nw', x, y], ['n', x + w / 2, y], ['ne', x + w, y], ['e', x + w, y + h / 2], ['se', x + w, y + h], ['s', x + w / 2, y + h], ['sw', x, y + h], ['w', x, y + h / 2]].map(([k, hx, hy]) => ({ k, x: hx, y: hy }));
}
/* ---- drawing ---- */
function edLoop() {
  ED.raf = requestAnimationFrame(edLoop);
  const c = ED.cv, x = ED.x, d = devicePixelRatio || 1, r = c.getBoundingClientRect();
  if (c.width !== Math.round(r.width * d) || c.height !== Math.round(r.height * d)) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); }
  x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#121014'; x.fillRect(0, 0, c.width, c.height);
  x.setTransform(d * ED.z, 0, 0, d * ED.z, d * ED.px, d * ED.py);
  x.imageSmoothingEnabled = ED.z < 3;
  x.fillStyle = ED.border; x.fillRect(0, 0, W, H);
  x.drawImage(ED.floor, 0, 0, W, H);
  x.fillStyle = ED.border; x.fillRect(0, 0, W, B); x.fillRect(0, H - B, W, B); x.fillRect(0, 0, B, H); x.fillRect(W - B, 0, B, H);
  for (const o of ED.obs) { try { drawObstacle(x, o); } catch (e) { x.fillStyle = o.color || '#888'; o.t === 'r' ? x.fillRect(o.x, o.y, o.w, o.h) : circ(x, o.x, o.y, o.r); }
    if (o.kind === 'tree' || o.kind === 'bush') { x.globalAlpha = .55; x.fillStyle = o.color; circ(x, o.x, o.y, o.r); x.globalAlpha = 1; } }
  for (const l of ED.lights) try { fixture(x, l); } catch (e) {}
  if (ED.lit) { // night preview: darkness with every light's pool cut out in its own color
    x.save(); x.globalAlpha = .78; x.fillStyle = '#05060c'; x.fillRect(0, 0, W, H); x.globalAlpha = 1; x.globalCompositeOperation = 'lighter';
    const all = [...ED.lights, ...ED.obs.filter(o => o.kind === 'lamp').map(o => ({ x: o.x, y: o.y, r: o.lr || 130, c: o.lc || (o.mast ? LCOL.flood : o.lantern ? LCOL.fire : LCOL.street) }))];
    for (const l of all) { const g = x.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r); const c2 = edLightCol(l); g.addColorStop(0, `rgba(${c2},.55)`); g.addColorStop(.5, `rgba(${c2},.22)`); g.addColorStop(1, `rgba(${c2},0)`); x.fillStyle = g; x.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); }
    x.restore();
  }
  const px = 1 / ED.z;
  if (ED.showGrid && ED.grid * ED.z >= 6) { // grid, every 4th line stronger
    x.lineWidth = px; const [a0, b0] = edW(0, 0), [a1, b1] = edW(r.width, r.height);
    for (let gx = Math.max(0, Math.floor(a0 / ED.grid) * ED.grid); gx <= Math.min(W, a1); gx += ED.grid) { x.strokeStyle = gx % (ED.grid * 4) ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.14)'; x.beginPath(); x.moveTo(gx, Math.max(0, b0)); x.lineTo(gx, Math.min(H, b1)); x.stroke(); }
    for (let gy = Math.max(0, Math.floor(b0 / ED.grid) * ED.grid); gy <= Math.min(H, b1); gy += ED.grid) { x.strokeStyle = gy % (ED.grid * 4) ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.14)'; x.beginPath(); x.moveTo(Math.max(0, a0), gy); x.lineTo(Math.min(W, a1), gy); x.stroke(); }
  }
  if (XO > 0) { x.setLineDash([6 * px, 6 * px]); x.strokeStyle = 'rgba(255,90,200,.35)'; x.lineWidth = px; for (const sx of [XO, XO + MW]) { x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx, H); x.stroke(); } x.setLineDash([]); }
  // lights: a dot, and the reach of the selected ones
  for (const [i, l] of ED.lights.entries()) { const on = ED.sel.some(s => s.t === 'l' && s.i === i), c2 = edLightCol(l);
    if (on || ED.lightsLayer) { x.strokeStyle = `rgba(${c2},.7)`; x.lineWidth = px * 1.5; x.setLineDash([5 * px, 4 * px]); x.beginPath(); x.arc(l.x, l.y, l.r, 0, TAU); x.stroke(); x.setLineDash([]); }
    x.fillStyle = `rgb(${c2})`; x.strokeStyle = on ? '#fff' : '#000'; x.lineWidth = px * 2; x.beginPath(); x.arc(l.x, l.y, 7 * px, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = '#000'; x.font = `${9 * px}px sans-serif`; x.textAlign = 'center'; x.fillText('✹', l.x, l.y + 3 * px); }
  for (const s of ED.sel) { if (s.t !== 'o') continue; const o = ED.obs[s.i]; if (!o) continue; const [x0, y0, x1, y1] = edBox(o);
    x.strokeStyle = '#ff4d6a'; x.lineWidth = px * 2; x.setLineDash([]); if (o.t === 'r') x.strokeRect(x0, y0, x1 - x0, y1 - y0); else { x.beginPath(); x.arc(o.x, o.y, o.r, 0, TAU); x.stroke(); } }
  for (const h of edHandles()) { x.fillStyle = '#fff'; x.strokeStyle = '#ff4d6a'; x.lineWidth = px * 1.5; x.fillRect(h.x - 4 * px, h.y - 4 * px, 8 * px, 8 * px); x.strokeRect(h.x - 4 * px, h.y - 4 * px, 8 * px, 8 * px); }
  const dr = ED.drag;
  if (dr && (dr.k === 'box' || dr.k === 'wall' || dr.k === 'rect')) { const [ax, ay, bx, by] = [Math.min(dr.x0, dr.x1), Math.min(dr.y0, dr.y1), Math.max(dr.x0, dr.x1), Math.max(dr.y0, dr.y1)];
    x.fillStyle = dr.k === 'box' ? 'rgba(120,170,255,.12)' : 'rgba(255,77,106,.25)'; x.fillRect(ax, ay, bx - ax, by - ay); x.strokeStyle = dr.k === 'box' ? '#7aaaff' : '#ff4d6a'; x.lineWidth = px; x.strokeRect(ax, ay, bx - ax, by - ay);
    x.fillStyle = '#fff'; x.font = `${11 * px}px sans-serif`; x.textAlign = 'left'; x.fillText(`${Math.round(bx - ax)} × ${Math.round(by - ay)}`, bx + 6 * px, by + 12 * px); }
  if (ED.ghost && ED.mouse) { const [mx, my] = edW(...ED.mouse), p = ED.ghost; x.globalAlpha = .5; x.fillStyle = p[5]; if (p[2] === 'r') x.fillRect(edSnap(mx - p[3] / 2), edSnap(my - p[4] / 2), p[3], p[4]); else circ(x, edSnap(mx), edSnap(my), p[3]); x.globalAlpha = 1; }
  if (ED.mouse) { const [mx, my] = edW(...ED.mouse); ED.coords.textContent = `x ${Math.round(mx)}  y ${Math.round(my)}  ·  zoom ${(ED.z * 100 / (Math.min(r.width / W, r.height / H) * .95)).toFixed(0)}%  ·  ${ED.obs.length} objects, ${ED.lights.length} lights`; }
}
/* ---- mouse ---- */
function edDown(e) {
  const r = ED.cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, [wx, wy] = edW(sx, sy);
  ED.cv.setPointerCapture(e.pointerId); ED.noSnap = e.altKey;
  if (e.button === 1 || e.button === 2 || ED.space || ED.tool === 'pan') { ED.drag = { k: 'pan', sx, sy, px: ED.px, py: ED.py }; return; }
  if (ED.tool === 'wall' || ED.tool === 'rect') { ED.drag = { k: ED.tool, x0: edSnap(wx), y0: edSnap(wy), x1: edSnap(wx), y1: edSnap(wy) }; return; }
  if (ED.tool === 'light') { edPush(); ED.lights.push({ x: edSnap(wx), y: edSnap(wy), r: 140, kind: MAPS[ED.map].indoor ? 'fluor' : 'fixed', fix: MAPS[ED.map].indoor ? 'panel' : 'none' }); ED.sel = [{ t: 'l', i: ED.lights.length - 1 }]; edPanel(); return; }
  if (ED.tool === 'prop' && ED.ghost) { const p = ED.ghost; edPush();
    const o = p[2] === 'r' ? R(edSnap(wx - p[3] / 2), edSnap(wy - p[4] / 2), p[3], p[4], p[5], p[1], p[6] && edClone(p[6])) : C(edSnap(wx), edSnap(wy), p[3], p[5], p[1], p[6] && edClone(p[6]));
    ED.obs.push(o); ED.sel = [{ t: 'o', i: ED.obs.length - 1 }]; edPanel(); if (!e.shiftKey) edTool('select'); return; }
  for (const h of edHandles()) if (Math.abs(wx - h.x) < 7 / ED.z && Math.abs(wy - h.y) < 7 / ED.z) { edPush(); ED.drag = { k: 'resize', h: h.k, s: ED.sel[0], o0: edClone(edItem(ED.sel[0])) }; return; }
  const hit = edHit(wx, wy);
  if (hit) {
    const on = ED.sel.some(s => edSame(s, hit));
    if (e.shiftKey || e.ctrlKey || e.metaKey) ED.sel = on ? ED.sel.filter(s => !edSame(s, hit)) : [...ED.sel, hit];
    else if (!on) ED.sel = [hit];
    edPanel(); if (!ED.sel.length) return;
    if (e.altKey && !on) { /* alt-drag duplicates */ }
    ED.drag = { k: 'move', wx, wy, pushed: false, start: ED.sel.map(s => { const o = edItem(s); return [o.x, o.y]; }) };
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
  if (d.k === 'box' || d.k === 'wall' || d.k === 'rect') { d.x1 = d.k === 'box' ? wx : edSnap(wx); d.y1 = d.k === 'box' ? wy : edSnap(wy); return; }
  if (d.k === 'move') {
    let dx = wx - d.wx, dy = wy - d.wy; if (Math.hypot(dx, dy) * ED.z < 3 && !d.moved) return;
    if (!d.pushed) { edPush(); d.pushed = true; } d.moved = true;
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; } // lock to an axis
    const first = edItem(ED.sel[0]), [fx, fy] = d.start[0], nx = (ED.snap && !e.ctrlKey) ? edSnap(fx + dx, true) - fx : dx, ny = (ED.snap && !e.ctrlKey) ? edSnap(fy + dy, true) - fy : dy;
    ED.sel.forEach((s, k) => { const o = edItem(s); o.x = d.start[k][0] + nx; o.y = d.start[k][1] + ny; }); edPanelVals(); return;
  }
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
function edUp() {
  const d = ED.drag; ED.drag = null; if (!d) return;
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
  if (d.k === 'resize') edDirty();
}
/* ---- commands ---- */
function edDelete() { if (!ED.sel.length) return; edPush(); const ob = new Set(ED.sel.filter(s => s.t === 'o').map(s => s.i)), li = new Set(ED.sel.filter(s => s.t === 'l').map(s => s.i));
  ED.obs = ED.obs.filter((_, i) => !ob.has(i)); ED.lights = ED.lights.filter((_, i) => !li.has(i)); ED.sel = []; edPanel(); }
function edDuplicate(off = 16) { if (!ED.sel.length) return; edPush(); const out = [];
  for (const s of ED.sel) { const c = edClone(edItem(s)); c.x += off; c.y += off; if (s.t === 'o') { ED.obs.push(c); out.push({ t: 'o', i: ED.obs.length - 1 }); } else { ED.lights.push(c); out.push({ t: 'l', i: ED.lights.length - 1 }); } }
  ED.sel = out; edPanel(); }
function edCopy() { ED.clip = ED.sel.map(s => ({ t: s.t, v: edClone(edItem(s)) })); edStatus(`Copied ${ED.clip.length}`); }
function edPaste() { if (!ED.clip || !ED.clip.length) return; edPush(); const [mx, my] = ED.mouse ? edW(...ED.mouse) : [W / 2, H / 2];
  const cx = ED.clip.reduce((a, c) => a + c.v.x, 0) / ED.clip.length, cy = ED.clip.reduce((a, c) => a + c.v.y, 0) / ED.clip.length; ED.sel = [];
  for (const c of ED.clip) { const v = edClone(c.v); v.x = edSnap(v.x - cx + mx); v.y = edSnap(v.y - cy + my); if (c.t === 'o') { ED.obs.push(v); ED.sel.push({ t: 'o', i: ED.obs.length - 1 }); } else { ED.lights.push(v); ED.sel.push({ t: 'l', i: ED.lights.length - 1 }); } } edPanel(); }
function edNudge(dx, dy) { if (!ED.sel.length) return; edPush(); for (const s of ED.sel) { const o = edItem(s); o.x += dx; o.y += dy; } edPanelVals(); }
function edScale(f) { if (!ED.sel.length) return; edPush(); for (const s of ED.sel) { const o = edItem(s); if (s.t === 'l' || o.t === 'c') o.r = Math.max(2, Math.round(o.r * f)); else { const cx = o.x + o.w / 2, cy = o.y + o.h / 2; o.w = Math.max(2, Math.round(o.w * f)); o.h = Math.max(2, Math.round(o.h * f)); o.x = cx - o.w / 2; o.y = cy - o.h / 2; } } edPanelVals(); }
function edRotate() { if (!ED.sel.length) return; edPush(); for (const s of ED.sel) { const o = edItem(s); if (s.t === 'o' && o.t === 'r') { const cx = o.x + o.w / 2, cy = o.y + o.h / 2; [o.w, o.h] = [o.h, o.w]; o.x = cx - o.w / 2; o.y = cy - o.h / 2; if (o.kind === 'desk') o.flip = !o.flip; } } edPanelVals(); }
function edOrder(top) { if (!ED.sel.length) return; edPush(); const ids = ED.sel.filter(s => s.t === 'o').map(s => s.i), picked = ids.map(i => ED.obs[i]), rest = ED.obs.filter((_, i) => !ids.includes(i));
  ED.obs = top ? [...rest, ...picked] : [...picked, ...rest]; ED.sel = picked.map(o => ({ t: 'o', i: ED.obs.indexOf(o) })); edPanel(); }
function edAlign(how) { const os = ED.sel.filter(s => s.t === 'o').map(edItem); if (os.length < 2) return; edPush(); const bx = os.map(edBox);
  const v = { l: Math.min(...bx.map(b => b[0])), r: Math.max(...bx.map(b => b[2])), t: Math.min(...bx.map(b => b[1])), b: Math.max(...bx.map(b => b[3])) };
  os.forEach((o, k) => { const b = bx[k], w = b[2] - b[0], h = b[3] - b[1], off = o.t === 'r' ? 0 : o.r;
    if (how === 'l') o.x = v.l + off; if (how === 'r') o.x = v.r - w + off; if (how === 't') o.y = v.t + (o.t === 'r' ? 0 : o.r); if (how === 'b') o.y = v.b - h + (o.t === 'r' ? 0 : o.r);
    if (how === 'cx') o.x = (v.l + v.r) / 2 - w / 2 + off; if (how === 'cy') o.y = (v.t + v.b) / 2 - h / 2 + (o.t === 'r' ? 0 : o.r); });
  edPanelVals(); }
function edTool(t, prop) { ED.tool = t; ED.ghost = t === 'prop' ? prop : null; ED.root.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t)); ED.root.querySelectorAll('.edprop').forEach(b => b.classList.toggle('on', t === 'prop' && b.dataset.p == ED_PROPS.indexOf(prop))); }
/* ---- keys ---- */
function edKey(e) {
  if (!ED.open) return;
  const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'select' || tag === 'textarea') { if (e.key === 'Escape') e.target.blur(); return; }
  e.stopPropagation(); const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey, step = e.shiftKey ? 10 : 1;
  if (e.type === 'keyup') { if (e.code === 'Space') ED.space = false; return; }
  if (e.code === 'Space') { ED.space = true; e.preventDefault(); return; }
  if (mod && k === 'z') { e.preventDefault(); edUndo(e.shiftKey ? 1 : -1); return; } if (mod && k === 'y') { e.preventDefault(); edUndo(1); return; }
  if (mod && k === 'd') { e.preventDefault(); edDuplicate(); return; } if (mod && k === 'c') { edCopy(); return; } if (mod && k === 'v') { edPaste(); return; }
  if (mod && k === 's') { e.preventDefault(); edSave(); return; } if (mod && k === 'a') { e.preventDefault(); ED.sel = ED.obs.map((_, i) => ({ t: 'o', i })); edPanel(); return; }
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); edDelete(); return; }
  if (k === 'escape') { if (ED.sel.length || ED.tool !== 'select') { ED.sel = []; edTool('select'); edPanel(); } else closeEditor(); return; }
  if (k.startsWith('arrow')) { e.preventDefault(); edNudge(k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0, k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0); return; }
  const map = { v: () => edTool('select'), w: () => edTool('wall'), b: () => edTool('rect'), l: () => edTool('light'), h: () => edToggle('help'), g: () => edToggle('showGrid'), s: () => edToggle('snap'), n: () => edToggle('lit'), o: () => edToggle('lightsLayer'),
    q: edRotate, ']': () => edScale(e.shiftKey ? 1.25 : 1.05), '[': () => edScale(e.shiftKey ? .8 : 1 / 1.05), '=': () => edZoomC(1.25), '+': () => edZoomC(1.25), '-': () => edZoomC(.8), '0': edFit, f: edFocus, p: () => closeEditor(true) };
  if (map[k]) { e.preventDefault(); map[k](); }
}
function edZoomC(f) { const r = ED.cv.getBoundingClientRect(); edZoom(f, r.width / 2, r.height / 2); }
function edFocus() { if (!ED.sel.length) return edFit(); const bx = ED.sel.map(s => s.t === 'l' ? [edItem(s).x - edItem(s).r, edItem(s).y - edItem(s).r, edItem(s).x + edItem(s).r, edItem(s).y + edItem(s).r] : edBox(edItem(s)));
  const x0 = Math.min(...bx.map(b => b[0])), y0 = Math.min(...bx.map(b => b[1])), x1 = Math.max(...bx.map(b => b[2])), y1 = Math.max(...bx.map(b => b[3])), r = ED.cv.getBoundingClientRect();
  ED.z = clamp(Math.min(r.width / (x1 - x0 + 80), r.height / (y1 - y0 + 80)), .15, 24); ED.px = r.width / 2 - (x0 + x1) / 2 * ED.z; ED.py = r.height / 2 - (y0 + y1) / 2 * ED.z; }
function edToggle(k) { ED[k] = !ED[k]; ED.root.querySelectorAll(`[data-tg="${k}"]`).forEach(b => b.classList.toggle('on', !!ED[k])); if (k === 'help') ED.root.querySelector('.edhelp').style.display = ED.help ? '' : 'none'; }
function edStatus(t) { if (ED.stat) ED.stat.textContent = t; }
/* ---- UI ---- */
function edBuildUI() {
  const m = MAPS[ED.map], walls = curPre.filter(o => o.kind === 'wall'); ED.wallCol = walls.length ? walls[0].color : m.indoor ? '#6d6875' : '#8b6b45'; ED.wallKind = m.indoor || walls.length ? 'wall' : 'fence'; ED.wallT = ED.wallKind === 'wall' ? 14 : 6;
  const root = ED.root = document.createElement('div'); root.id = 'editor';
  root.innerHTML = `<div class="edtop"><b>Map editor</b><select class="edmap">${MAPS.map((mm, i) => `<option value="${i}" ${i === ED.map ? 'selected' : ''}>${mm.name}</option>`).join('')}</select>
      <span class="edgrp">${[['select', 'Select / move', 'V'], ['wall', 'Draw wall', 'W'], ['rect', 'Draw block', 'B'], ['light', 'Add light', 'L'], ['pan', 'Pan', 'Space']].map(([t, n, k]) => `<button data-tool="${t}" title="${n} (${k})">${n}<kbd>${k}</kbd></button>`).join('')}</span>
      <span class="edgrp">${[['showGrid', 'Grid', 'G'], ['snap', 'Snap', 'S'], ['lit', 'Night preview', 'N'], ['lightsLayer', 'Light reach', 'O'], ['help', 'Controls', 'H']].map(([t, n, k]) => `<button data-tg="${t}" class="${ED[t] ? 'on' : ''}" title="${n} (${k})">${n}<kbd>${k}</kbd></button>`).join('')}
        <label class="edgs">grid <select class="edgridsz">${[2, 4, 8, 16, 32].map(g => `<option ${g === ED.grid ? 'selected' : ''}>${g}</option>`).join('')}</select></label></span>
      <span class="edgrp edright"><button class="edundo" title="Undo (Ctrl+Z)">↶</button><button class="edredo" title="Redo (Ctrl+Y)">↷</button><button class="edsave">Save</button><button class="edexp" title="Download 05c-map-overrides.js">Export</button><label class="edimp">Import<input type="file" accept=".js,.json" hidden></label><button class="edreset">Reset map</button><button class="edplay">Play test <kbd>P</kbd></button><button class="edclose">Exit <kbd>Esc</kbd></button></span></div>
    <div class="edbody"><div class="edleft"><h4>Props <small>click, then click the map · Shift keeps placing</small></h4><div class="edprops">${ED_PROPS.map((p, i) => `<button class="edprop" data-p="${i}"><i style="background:${p[5]};border-radius:${p[2] === 'c' ? '50%' : '2px'}"></i>${p[0]}</button>`).join('')}</div>
        <h4>Walls</h4><div class="edrow"><label>Wall kind <select class="edwk">${['wall', 'fence', 'hedge', 'glass', 'building'].map(k => `<option ${k === ED.wallKind ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
        <label>Thickness <input type="number" class="edwt" value="${ED.wallT}" min="2" max="80"></label><label>Color <input type="color" class="edwc" value="${edHex(ED.wallCol)}"></label></div></div>
      <div class="edview"><canvas></canvas><div class="edcoords"></div><div class="edstat">Edits save in this browser automatically</div>
        <div class="edhelp"><b>Controls</b>
          <p><kbd>Wheel</kbd> zoom at cursor · <kbd>Space</kbd>/<kbd>Right</kbd>/<kbd>Middle</kbd> drag pan · <kbd>0</kbd> fit · <kbd>F</kbd> focus selection · <kbd>+</kbd><kbd>-</kbd> zoom</p>
          <p><kbd>Click</kbd> select · <kbd>Shift</kbd>/<kbd>Ctrl</kbd>+click add · drag empty space to box-select · <kbd>Ctrl+A</kbd> all</p>
          <p>Drag to move (<kbd>Shift</kbd> locks axis, <kbd>Ctrl</kbd> no snap) · <kbd>Alt</kbd>+drag duplicates · handles resize</p>
          <p><kbd>Arrows</kbd> nudge 1 (<kbd>Shift</kbd> 10) · <kbd>[</kbd> <kbd>]</kbd> size (<kbd>Shift</kbd> bigger steps) · <kbd>Q</kbd> rotate 90°</p>
          <p><kbd>Del</kbd> delete · <kbd>Ctrl+D</kbd> duplicate · <kbd>Ctrl+C</kbd>/<kbd>V</kbd> copy/paste at cursor · <kbd>Ctrl+Z</kbd>/<kbd>Y</kbd> undo/redo</p>
          <p><kbd>W</kbd> draw wall · <kbd>B</kbd> draw block · <kbd>L</kbd> add light · <kbd>N</kbd> night preview · <kbd>P</kbd> play test · <kbd>Esc</kbd> deselect / exit</p></div></div>
      <div class="edright2"><div class="edpanel"></div></div></div>`;
  document.body.appendChild(root);
  ED.cv = root.querySelector('canvas'); ED.x = ED.cv.getContext('2d'); ED.coords = root.querySelector('.edcoords'); ED.stat = root.querySelector('.edstat');
  ED.cv.addEventListener('pointerdown', edDown); ED.cv.addEventListener('pointermove', edMove); ED.cv.addEventListener('pointerup', edUp); ED.cv.addEventListener('pointercancel', edUp);
  ED.cv.addEventListener('pointerleave', () => { ED.mouse = null; }); ED.cv.addEventListener('contextmenu', e => e.preventDefault());
  ED.cv.addEventListener('wheel', e => { e.preventDefault(); const r = ED.cv.getBoundingClientRect(); if (e.ctrlKey || !e.shiftKey && Math.abs(e.deltaX) < 1) edZoom(Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0018)), e.clientX - r.left, e.clientY - r.top); else { ED.px -= e.deltaX || e.deltaY; } }, { passive: false });
  root.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => edTool(b.dataset.tool));
  root.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => edToggle(b.dataset.tg));
  root.querySelectorAll('.edprop').forEach(b => b.onclick = () => edTool('prop', ED_PROPS[+b.dataset.p]));
  root.querySelector('.edgridsz').onchange = e => { ED.grid = +e.target.value; };
  root.querySelector('.edwk').onchange = e => { ED.wallKind = e.target.value; const p = ED_PROPS.find(p => p[1] === ED.wallKind); if (p) { ED.wallCol = p[5]; ED.wallT = Math.min(p[3], p[4]) || 14; root.querySelector('.edwc').value = edHex(ED.wallCol); root.querySelector('.edwt').value = ED.wallT; } edTool('wall'); };
  root.querySelector('.edwt').onchange = e => { ED.wallT = clamp(+e.target.value || 14, 2, 80); };
  root.querySelector('.edwc').oninput = e => { ED.wallCol = e.target.value; };
  root.querySelector('.edundo').onclick = () => edUndo(-1); root.querySelector('.edredo').onclick = () => edUndo(1);
  root.querySelector('.edsave').onclick = edSave; root.querySelector('.edexp').onclick = edExport; root.querySelector('.edreset').onclick = edReset;
  root.querySelector('.edimp input').onchange = e => e.target.files[0] && edImport(e.target.files[0]);
  root.querySelector('.edplay').onclick = () => closeEditor(true); root.querySelector('.edclose').onclick = () => closeEditor();
  root.querySelector('.edmap').onchange = e => { edSave(); const i = +e.target.value; cancelAnimationFrame(ED.raf); root.remove(); removeEventListener('keydown', edKey, true); removeEventListener('keyup', edKey, true); openEditor(i); };
  addEventListener('keydown', edKey, true); addEventListener('keyup', edKey, true);
  edTool('select'); edPanel();
}
/* properties of the selection */
function edPanel() {
  const p = ED.root && ED.root.querySelector('.edpanel'); if (!p) return;
  if (!ED.sel.length) { p.innerHTML = `<h4>Nothing selected</h4><p class="edmuted">Click an object or a light (✹) to edit it. Drag on empty space to select many.</p><h4>Map</h4><p class="edmuted">${MAPS[ED.map].name} · world ${W} × ${H}${XO ? ` · the dashed pink lines mark the original map's edges` : ''}</p>`; return; }
  if (ED.sel.length > 1) { p.innerHTML = `<h4>${ED.sel.length} selected</h4><div class="edbtns"><button data-a="dup">Duplicate</button><button data-a="del">Delete</button><button data-a="rot">Rotate 90°</button><button data-a="up">Bigger</button><button data-a="dn">Smaller</button></div>
      <h4>Align</h4><div class="edbtns">${[['l', 'Left'], ['cx', 'Centre ↔'], ['r', 'Right'], ['t', 'Top'], ['cy', 'Middle ↕'], ['b', 'Bottom']].map(([k, n]) => `<button data-al="${k}">${n}</button>`).join('')}</div>
      <h4>Color all</h4><input type="color" class="edallc" value="${edHex(edItem(ED.sel[0]).color || '#888888')}">`;
    edPanelBtns(p); p.querySelector('.edallc').oninput = e => { if (!p._pushed) { edPush(); p._pushed = true; } for (const s of ED.sel) if (s.t === 'o') edItem(s).color = e.target.value; else edItem(s).c = edRgb(e.target.value); };
    p.querySelectorAll('[data-al]').forEach(b => b.onclick = () => edAlign(b.dataset.al)); return; }
  const s = ED.sel[0], o = edItem(s), num = (k, lab, min = -9999) => `<label>${lab}<input type="number" step="1" min="${min}" data-k="${k}" value="${Math.round((o[k] ?? 0) * 10) / 10}"></label>`;
  if (s.t === 'l') {
    p.innerHTML = `<h4>Light</h4><div class="edgrid2">${num('x', 'X')}${num('y', 'Y')}${num('r', 'Reach', 10)}</div>
      <label>Color <input type="color" data-lc value="${edHex(edLightCol(o))}"></label>
      <label>Type <select data-ks="kind">${Object.keys(LCOL).map(k => `<option ${k === o.kind ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <label>Fixture <select data-ks="fix">${ED_FIX.map(k => `<option ${k === (o.fix || 'panel') ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <label class="edck"><input type="checkbox" data-ck="flick" ${o.flick ? 'checked' : ''}> Flickers</label>
      <div class="edbtns"><button data-a="dup">Duplicate</button><button data-a="del">Delete</button><button data-a="clr">Use type's color</button></div>`;
  } else {
    const lamp = o.kind === 'lamp';
    p.innerHTML = `<h4>${o.kind}</h4><label>Kind <select data-ks="kind">${[...new Set([o.kind, ...ED_KINDS])].map(k => `<option ${k === o.kind ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <div class="edgrid2">${num('x', 'X')}${num('y', 'Y')}${o.t === 'r' ? num('w', 'Width', 2) + num('h', 'Height', 2) : num('r', 'Radius', 2)}</div>
      <label>Size <input type="range" min="25" max="400" value="100" class="edsz"><output>100%</output></label>
      <label>Color <input type="color" data-c value="${edHex(o.color)}"></label>
      ${o.kind === 'building' ? `<label>Roof <select data-ks="roof">${['gable', 'hip', 'flat'].map(k => `<option ${k === o.roof ? 'selected' : ''}>${k}</option>`).join('')}</select></label>` : ''}
      ${lamp ? `<h4>Lamp light</h4><label>Light color <input type="color" data-lampc value="${edHex(o.lc || (o.mast ? LCOL.flood : o.lantern ? LCOL.fire : LCOL.street))}"></label>${num('lr', 'Reach', 20).replace(`value="0"`, `value="${o.lr || (o.lantern ? 105 : 130)}"`)}` : ''}
      <div class="edbtns"><button data-a="dup">Duplicate</button><button data-a="del">Delete</button>${o.t === 'r' ? '<button data-a="rot">Rotate 90°</button>' : ''}<button data-a="front">To front</button><button data-a="back">To back</button></div>`;
    const sz = p.querySelector('.edsz'), base = edClone(o); sz.oninput = () => { if (!sz._p) { edPush(); sz._p = true; } const f = sz.value / 100; sz.nextElementSibling.textContent = sz.value + '%';
      if (o.t === 'c') o.r = Math.max(2, Math.round(base.r * f)); else { const cx = base.x + base.w / 2, cy = base.y + base.h / 2; o.w = Math.max(2, Math.round(base.w * f)); o.h = Math.max(2, Math.round(base.h * f)); o.x = cx - o.w / 2; o.y = cy - o.h / 2; } edPanelVals(true); };
    sz.onchange = () => { sz._p = false; edDirty(); };
  }
  p.querySelectorAll('input[data-k]').forEach(inp => inp.onchange = () => { edPush(); o[inp.dataset.k] = +inp.value; });
  p.querySelectorAll('select[data-ks]').forEach(sel => sel.onchange = () => { edPush(); o[sel.dataset.ks] = sel.value; if (s.t === 'l' && sel.dataset.ks === 'kind') delete o.c; edPanel(); });
  p.querySelectorAll('input[data-ck]').forEach(c => c.onchange = () => { edPush(); o[c.dataset.ck] = c.checked; });
  const col = (sel, set) => { const el = p.querySelector(sel); if (!el) return; el.oninput = () => { if (!el._p) { edPush(); el._p = true; } set(el.value); }; el.onchange = () => { el._p = false; edDirty(); }; };
  col('[data-c]', v => { o.color = v; }); col('[data-lc]', v => { o.c = edRgb(v); }); col('[data-lampc]', v => { o.lc = edRgb(v); });
  edPanelBtns(p);
}
function edPanelBtns(p) {
  const act = { dup: () => edDuplicate(), del: edDelete, rot: edRotate, up: () => edScale(1.1), dn: () => edScale(1 / 1.1), front: () => edOrder(true), back: () => edOrder(false), clr: () => { edPush(); delete edItem(ED.sel[0]).c; edPanel(); } };
  p.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act[b.dataset.a]());
}
function edPanelVals(keepSize) { // refresh the numbers while dragging, without rebuilding the panel
  if (ED.sel.length !== 1) return; const o = edItem(ED.sel[0]);
  ED.root.querySelectorAll('.edpanel input[data-k]').forEach(inp => { if (document.activeElement !== inp) inp.value = Math.round((o[inp.dataset.k] ?? 0) * 10) / 10; });
}
/* the menu entry */
const _edShowMenu = showMenu;
showMenu = function () {
  _edShowMenu.apply(this, arguments);
  const row = document.getElementById('setBtn'); if (!row || document.getElementById('edBtn')) return;
  const b = document.createElement('button'); b.className = 'ghost'; b.id = 'edBtn'; b.dataset.sfx = 'open'; b.textContent = 'Map editor';
  b.onclick = () => openEditor(mapIdx); row.parentElement.appendChild(b);
};

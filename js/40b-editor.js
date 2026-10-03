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
const ED_FIX = ['panel', 'strip', 'cage', 'spot', 'pool', 'exit', 'none'];
const ED = { open: false };
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
  ED.trails = ov && ov.trails ? edClone(ov.trails) : captureTrails(b); // the map's painted trails, as editable paths
  ED.floorBase = makeLayer()[0]; { const x = ED.floorBase.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0); trailMute = true; try { b.floor(x); } finally { trailMute = false; } }
  ED.floor = makeLayer()[0]; edFloor(true);
  ED.border = MAPS[idx].border;
  edBuildUI(); edFit(); edLoop();
}
function closeEditor(play) {
  ED.open = false; cancelAnimationFrame(ED.raf); ED.root.remove(); document.querySelectorAll('.edpop,#propEd').forEach(p => p.remove()); removeEventListener('keydown', edKey, true);
  overlay.style.display = '';
  if (play) { mapIdx = ED.map; edTesting = ED.map; showMenu(); startGame({ test: true }); } else { mapIdx = ED.map; loadMap(ED.map); showMenu(); }
}
/* ---- edits: undo history, saving ---- */
function edPush() { ED.undo.push(edClone({ o: ED.obs, l: ED.lights, t: ED.trails })); if (ED.undo.length > 200) ED.undo.shift(); ED.redo = []; edDirty(); }
function edUndo(dir) {
  const from = dir < 0 ? ED.undo : ED.redo, to = dir < 0 ? ED.redo : ED.undo; if (!from.length) return;
  to.push(edClone({ o: ED.obs, l: ED.lights, t: ED.trails })); const s = from.pop(); ED.obs = s.o; ED.lights = s.l; ED.trails = s.t || ED.trails; ED.sel = []; edFloor(true); edDirty(); edPanel();
}
function edDirty() { clearTimeout(ED.saveT); ED.saveT = setTimeout(edSave, 400); edStatus('Unsaved changes…'); }
function edSave() {
  const all = localMapEdits(); all[mapEditKey(MAPS[ED.map].name)] = { obs: ED.obs, lights: ED.lights, trails: ED.trails };
  try { localStorage.setItem('snakeCarnageMapEdits', JSON.stringify(all)); edStatus('Saved in this browser'); } catch (e) { edStatus('Could not save (storage full?)'); }
}
function edReset() {
  if (!confirm('Throw away your edits to ' + MAPS[ED.map].name + ' and go back to the original layout?')) return;
  const all = localMapEdits(); delete all[mapEditKey(MAPS[ED.map].name)]; try { localStorage.setItem('snakeCarnageMapEdits', JSON.stringify(all)); } catch (e) {}
  const keep = MAP_OVERRIDES[mapEditKey(MAPS[ED.map].name)]; if (keep) delete MAP_OVERRIDES[mapEditKey(MAPS[ED.map].name)];
  loadMap(ED.map); ED.obs = edClone(curPre); ED.lights = edClone(curMapLights); ED.trails = captureTrails(MAPS[ED.map].build()); edFloor(true); ED.undo = []; ED.redo = []; ED.sel = []; edPanel(); edStatus('Back to the original');
}
function edExport() {
  edSave();
  const text = edShareText();
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' })); a.download = '05c-map-overrides.js'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  edStatus('Exported 05c-map-overrides.js: put it in the js folder to ship these edits');
}
function edImport(file) {
  file.text().then(t => { const m = t.match(/MAP_OVERRIDES = (\{[\s\S]*?\});\n/), pm = t.match(/PROP_OVERRIDES = (\{[\s\S]*?\});/); const data = JSON.parse(m ? m[1] : t);
    if (pm) { try { localStorage.setItem('snakeCarnagePropDefs', JSON.stringify({ ...propDefs(), ...JSON.parse(pm[1]) })); propApply(); } catch (e) {} }
    const all = { ...localMapEdits(), ...data }; localStorage.setItem('snakeCarnageMapEdits', JSON.stringify(all));
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
  for (let i = ED.lights.length - 1; i >= 0; i--) { const l = ED.lights[i]; if (Math.hypot(wx - l.x, wy - l.y) < 9 / ED.z + 3) return { t: 'l', i }; }
  for (let i = ED.obs.length - 1; i >= 0; i--) { const o = ED.obs[i];
    if (o.poly) { if (pointInPoly(polyShape(o), wx, wy)) return { t: 'o', i }; continue; }
    if (isRot(o)) { if (pointInPoly(obsCorners({ ...o, x: o.x - pad, y: o.y - pad, w: o.w + pad * 2, h: o.h + pad * 2 }), wx, wy)) return { t: 'o', i }; continue; }
    if (o.t === 'r' ? wx >= o.x - pad && wx <= o.x + o.w + pad && wy >= o.y - pad && wy <= o.y + o.h + pad : Math.hypot(wx - o.x, wy - o.y) <= o.r + pad) return { t: 'o', i }; }
  if (ED.layerPaths !== false) for (let i = ED.trails.length - 1; i >= 0; i--) { const t = ED.trails[i]; if (trailPoints(t.pts).some(([a, b]) => Math.hypot(wx - a, wy - b) < t.w / 2 + 3 / ED.z)) return { t: 'p', i }; }
  return null;
}
const edItem = s => s.t === 'o' ? ED.obs[s.i] : s.t === 'p' ? ED.trails[s.i] : ED.lights[s.i];
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
  if (ED.showGrid && (ED.grid = ED.snaps.move.step) * ED.z >= 6) { // grid, every 4th line stronger
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
    x.strokeStyle = '#ff4d6a'; x.lineWidth = px * 2; x.setLineDash([]); if (isRot(o)) { const P = obsCorners(o); x.beginPath(); P.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.stroke(); } else if (o.t === 'r') x.strokeRect(x0, y0, x1 - x0, y1 - y0); else { x.beginPath(); x.arc(o.x, o.y, o.r, 0, TAU); x.stroke(); } }
  for (const s of ED.sel) if (s.t === 'p') { const t = ED.trails[s.i]; if (!t) continue; const P = trailPoints(t.pts);
    x.strokeStyle = 'rgba(255,77,106,.9)'; x.lineWidth = px * 2; x.beginPath(); P.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke();
    x.setLineDash([4 * px, 4 * px]); x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = px; for (const off of [-1, 1]) { x.beginPath(); P.forEach(([a, b], k) => { const q = P[Math.min(P.length - 1, k + 1)], r0 = P[Math.max(0, k - 1)], dx = q[0] - r0[0], dy = q[1] - r0[1], L = Math.hypot(dx, dy) || 1, ox = -dy / L * t.w / 2 * off, oy = dx / L * t.w / 2 * off; k ? x.lineTo(a + ox, b + oy) : x.moveTo(a + ox, b + oy); }); x.stroke(); } x.setLineDash([]);
    x.strokeStyle = 'rgba(255,255,255,.25)'; x.beginPath(); t.pts.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); }
  for (const s of ED.sel) if (s.t === 'o' && ED.obs[s.i] && ED.obs[s.i].poly) { const o = ED.obs[s.i]; x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = px; x.beginPath(); o.poly.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.stroke(); }
  if (ED.draft) { const d = ED.draft, mw = ED.mouse ? edW(...ED.mouse).map(v => edSnap(v)) : null, pts = mw ? [...d.pts, mw] : d.pts;
    if (d.kind === 'path' && pts.length > 1) { x.globalAlpha = .55; x.strokeStyle = '#d8c08a'; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = d.w; x.beginPath(); trailPoints(pts).forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); x.globalAlpha = 1; }
    if (d.kind === 'water' && pts.length > 2) { x.globalAlpha = .5; x.fillStyle = '#4aa3df'; const S = smoothClosed(pts); x.beginPath(); S.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill(); x.globalAlpha = 1; }
    x.strokeStyle = '#fff'; x.lineWidth = px * 1.5; x.setLineDash([5 * px, 4 * px]); x.beginPath(); pts.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); x.setLineDash([]);
    for (const [k, [a, b]] of d.pts.entries()) { x.fillStyle = k === 0 && d.kind === 'water' && d.pts.length > 2 ? '#7aff9a' : '#fff'; x.beginPath(); x.arc(a, b, 5 * px, 0, TAU); x.fill(); } }
  for (const h of edHandles()) { x.fillStyle = '#fff'; x.strokeStyle = '#ff4d6a'; x.lineWidth = px * 1.5; if (h.k === 'pt') { x.beginPath(); x.arc(h.x, h.y, 5 * px, 0, TAU); x.fill(); x.stroke(); } else { x.fillRect(h.x - 4 * px, h.y - 4 * px, 8 * px, 8 * px); x.strokeRect(h.x - 4 * px, h.y - 4 * px, 8 * px, 8 * px); } }
  edGizmoDraw(x, px);
  const dr = ED.drag;
  if (dr && (dr.k === 'box' || dr.k === 'wall' || dr.k === 'rect')) { const [ax, ay, bx, by] = [Math.min(dr.x0, dr.x1), Math.min(dr.y0, dr.y1), Math.max(dr.x0, dr.x1), Math.max(dr.y0, dr.y1)];
    x.fillStyle = dr.k === 'box' ? 'rgba(120,170,255,.12)' : 'rgba(255,77,106,.25)'; x.fillRect(ax, ay, bx - ax, by - ay); x.strokeStyle = dr.k === 'box' ? '#7aaaff' : '#ff4d6a'; x.lineWidth = px; x.strokeRect(ax, ay, bx - ax, by - ay);
    x.fillStyle = '#fff'; x.font = `${11 * px}px sans-serif`; x.textAlign = 'left'; x.fillText(`${Math.round(bx - ax)} × ${Math.round(by - ay)}`, bx + 6 * px, by + 12 * px); }
  if (ED.ghost && ED.mouse) { const [mx, my] = edW(...ED.mouse), p = ED.ghost; x.globalAlpha = .6; try { drawObstacle(x, edSample(p, p[2] === 'r' ? edSnap(mx - p[3] / 2) : edSnap(mx), p[2] === 'r' ? edSnap(my - p[4] / 2) : edSnap(my))); } catch (e) {} x.globalAlpha = 1; }
  if (ED.mouse) { const [mx, my] = edW(...ED.mouse); ED.coords.textContent = `x ${Math.round(mx)}  y ${Math.round(my)}  ·  zoom ${(ED.z * 100 / (Math.min(r.width / W, r.height / H) * .95)).toFixed(0)}%  ·  ${ED.obs.length} objects, ${ED.lights.length} lights`; }
}
/* ---- mouse ---- */
function edDown(e) {
  const r = ED.cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, [wx, wy] = edW(sx, sy);
  ED.cv.setPointerCapture(e.pointerId); ED.noSnap = e.altKey;
  const now = performance.now(), dbl = ED.lastDown && now - ED.lastDown[0] < 350 && Math.hypot(sx - ED.lastDown[1], sy - ED.lastDown[2]) < 6; ED.lastDown = dbl ? null : [now, sx, sy]; // pointer events don't count clicks
  if (e.button === 1 || e.button === 2 || ED.space || ED.tool === 'pan') { ED.drag = { k: 'pan', sx, sy, px: ED.px, py: ED.py }; return; }
  if (ED.tool === 'wall' || ED.tool === 'rect') { ED.drag = { k: ED.tool, x0: edSnap(wx), y0: edSnap(wy), x1: edSnap(wx), y1: edSnap(wy) }; return; }
  if (ED.tool === 'path' || ED.tool === 'water') { const pt = [edSnap(wx), edSnap(wy)];
    if (!ED.draft) { ED.draft = { kind: ED.tool, pts: [], w: ED.pathW, style: ED.pathStyle };
      if (ED.tool === 'path') for (const [i, t] of ED.trails.entries()) for (const end of [0, 1]) { const q = end ? t.pts[t.pts.length - 1] : t.pts[0]; if (Math.hypot(q[0] - wx, q[1] - wy) < 14 / ED.z + 4) { ED.draft.extend = { i, end }; ED.draft.w = t.w; ED.draft.style = t.style; ED.draft.pts = [q.slice()]; return; } } } // start at a path's end: carry it on
    const d = ED.draft;
    if (d.kind === 'water' && d.pts.length > 2 && Math.hypot(d.pts[0][0] - wx, d.pts[0][1] - wy) < 10 / ED.z + 3) return edFinishDraft();
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
    ED.sel.forEach((s, k) => { const o = edItem(s), st = d.start[k]; if (st[2]) { const arr = st[2].map(([a, b]) => [a + nx, b + ny]); if (o.pts) o.pts = arr; else { o.poly = arr; polyBounds(o); } if (o.pts) ED.floorDirty = true; } else { o.x = st[0] + nx; o.y = st[1] + ny; } }); edPanelVals(); return;
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
  if (d.k === 'gizmo') { edDirty(); if (ED.sel.some(s => s.t === 'p')) edFloor(true); edPanel(); }
  if (d.k === 'resize' || d.k === 'pt') { edDirty(); if (d.o && d.o.pts) edFloor(true); }
  if (d.k === 'move' && d.moved && ED.sel.some(s => s.t === 'p')) edFloor(true);
}
/* ---- commands ---- */
function edDelete() { if (!ED.sel.length) return; edPush(); const ob = new Set(ED.sel.filter(s => s.t === 'o').map(s => s.i)), li = new Set(ED.sel.filter(s => s.t === 'l').map(s => s.i)), pa = new Set(ED.sel.filter(s => s.t === 'p').map(s => s.i)); if (pa.size) { ED.trails = ED.trails.filter((_, i) => !pa.has(i)); edFloor(true); }
  ED.obs = ED.obs.filter((_, i) => !ob.has(i)); ED.lights = ED.lights.filter((_, i) => !li.has(i)); ED.sel = []; edPanel(); }
function edDuplicate(off = 16) { if (!ED.sel.length) return; edPush(); const out = [];
  for (const s of ED.sel) { const c = edClone(edItem(s)); if (s.t === 'p') { c.pts = c.pts.map(([a, b]) => [a + off, b + off]); ED.trails.push(c); out.push({ t: 'p', i: ED.trails.length - 1 }); edFloor(true); continue; } c.x += off; c.y += off; if (c.poly) c.poly = c.poly.map(([a, b]) => [a + off, b + off]); if (s.t === 'o') { ED.obs.push(c); out.push({ t: 'o', i: ED.obs.length - 1 }); } else { ED.lights.push(c); out.push({ t: 'l', i: ED.lights.length - 1 }); } }
  ED.sel = out; edPanel(); }
function edCopy() { ED.clip = ED.sel.map(s => ({ t: s.t, v: edClone(edItem(s)) })); edStatus(`Copied ${ED.clip.length}`); }
function edPaste() { if (!ED.clip || !ED.clip.length) return; edPush(); const [mx, my] = ED.mouse ? edW(...ED.mouse) : [W / 2, H / 2];
  const cx = ED.clip.reduce((a, c) => a + c.v.x, 0) / ED.clip.length, cy = ED.clip.reduce((a, c) => a + c.v.y, 0) / ED.clip.length; ED.sel = [];
  for (const c of ED.clip) { const v = edClone(c.v); v.x = edSnap(v.x - cx + mx); v.y = edSnap(v.y - cy + my); if (c.t === 'o') { ED.obs.push(v); ED.sel.push({ t: 'o', i: ED.obs.length - 1 }); } else { ED.lights.push(v); ED.sel.push({ t: 'l', i: ED.lights.length - 1 }); } } edPanel(); }
function edNudge(dx, dy) { if (!ED.sel.length) return; edPush(); for (const s of ED.sel) { const o = edItem(s); if (o.pts) { o.pts = o.pts.map(([a, b]) => [a + dx, b + dy]); ED.floorDirty = true; continue; } o.x += dx; o.y += dy; if (o.poly) o.poly = o.poly.map(([a, b]) => [a + dx, b + dy]); } edPanelVals(); }
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
  if (mod && k === 's') { e.preventDefault(); edSave(); return; } if (mod && k === 'a') { e.preventDefault(); ED.sel = ED.obs.map((_, i) => ({ t: 'o', i })); edPanel(); return; }
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); edDelete(); return; }
  if (k === 'escape' && document.querySelector('.edpop')) { document.querySelectorAll('.edpop').forEach(p => p.remove()); return; }
  if (k === 'enter' && ED.draft) { edFinishDraft(); return; }
  if (k === 'escape' && ED.draft) { ED.draft = null; return; }
  if (k === 'escape') { if (ED.sel.length || ED.tool !== 'select') { ED.sel = []; edTool('select'); edPanel(); } else closeEditor(); return; }
  if (k.startsWith('arrow')) { e.preventDefault(); const st = ED.snaps.move.on ? ED.snaps.move.step * (e.shiftKey ? 4 : 1) : step; edNudge(k === 'arrowleft' ? -st : k === 'arrowright' ? st : 0, k === 'arrowup' ? -st : k === 'arrowdown' ? st : 0); return; }
  const map = { v: () => edTool('select'), w: () => edTool('wall'), b: () => edTool('rect'), l: () => edTool('light'), h: () => edToggle('help'), g: () => edToggle('showGrid'), s: () => { ED.snaps.move.on = !ED.snaps.move.on; edSaveSnaps(); const c = ED.root.querySelector('[data-sn="move"]'); c.checked = ED.snaps.move.on; c.parentElement.classList.toggle('on', ED.snaps.move.on); }, n: () => edToggle('lit'), o: () => edToggle('lightsLayer'),
    q: () => edRotateBy(e.shiftKey ? -ED.snaps.rot.step : ED.snaps.rot.step), a: edAddPointKey, e: edEndPathKey, ']': () => edScale(1 + ED.snaps.scale.step / 100 * (e.shiftKey ? 2.5 : 1), e.shiftKey), '[': () => edScale(1 / (1 + ED.snaps.scale.step / 100 * (e.shiftKey ? 2.5 : 1)), e.shiftKey), '{': () => edScale(.8, true), '}': () => edScale(1.25, true), t: () => edTool('path'), y: () => edTool('water'), '=': () => edZoomC(1.25), '+': () => edZoomC(1.25), '-': () => edZoomC(.8), '0': edFit, f: edFocus, p: () => closeEditor(true) };
  if (map[k]) { e.preventDefault(); map[k](); }
}
function edZoomC(f) { const r = ED.cv.getBoundingClientRect(); edZoom(f, r.width / 2, r.height / 2); }
function edFocus() { if (!ED.sel.length) return edFit(); const bx = ED.sel.map(s => s.t === 'l' ? [edItem(s).x - edItem(s).r, edItem(s).y - edItem(s).r, edItem(s).x + edItem(s).r, edItem(s).y + edItem(s).r] : edBox(edItem(s)));
  const x0 = Math.min(...bx.map(b => b[0])), y0 = Math.min(...bx.map(b => b[1])), x1 = Math.max(...bx.map(b => b[2])), y1 = Math.max(...bx.map(b => b[3])), r = ED.cv.getBoundingClientRect();
  ED.z = clamp(Math.min(r.width / (x1 - x0 + 80), r.height / (y1 - y0 + 80)), .15, 24); ED.px = r.width / 2 - (x0 + x1) / 2 * ED.z; ED.py = r.height / 2 - (y0 + y1) / 2 * ED.z; }
function edToggle(k) { ED[k] = !ED[k]; if (k === 'help') { try { localStorage.setItem('snakeEdHelp', ED.help ? '1' : '0'); } catch (e) {} ED.root.querySelector('.edhelpbtn').style.display = ED.help ? 'none' : ''; } ED.root.querySelectorAll(`[data-tg="${k}"]`).forEach(b => b.classList.toggle('on', !!ED[k])); if (k === 'help') ED.root.querySelector('.edhelp').style.display = ED.help ? '' : 'none'; }
function edStatus(t) { if (ED.stat) ED.stat.textContent = t; }
/* ---- UI ---- */
function edBuildUI() {
  const m = MAPS[ED.map], walls = curPre.filter(o => o.kind === 'wall'); ED.wallCol = walls.length ? walls[0].color : m.indoor ? '#6d6875' : '#8b6b45'; ED.wallKind = m.indoor || walls.length ? 'wall' : 'fence'; ED.wallT = ED.wallKind === 'wall' ? 14 : 6;
  const root = ED.root = document.createElement('div'); root.id = 'editor';
  root.innerHTML = `<div class="edtop"><b>Map editor</b><select class="edmap">${MAPS.map((mm, i) => `<option value="${i}" ${i === ED.map ? 'selected' : ''}>${mm.name}</option>`).join('')}</select>
      <span class="edgrp">${[['select', 'Select / move', 'V'], ['wall', 'Draw wall', 'W'], ['rect', 'Draw block', 'B'], ['path', 'Draw path', 'T'], ['water', 'Draw water', 'Y'], ['light', 'Add light', 'L'], ['pan', 'Pan', 'Space']].map(([t, n, k]) => `<button data-tool="${t}" title="${n} (${k})">${n}<kbd>${k}</kbd></button>`).join('')}</span>
      <span class="edgrp">${[['showGrid', 'Grid', 'G'], ['lit', 'Night preview', 'N'], ['lightsLayer', 'Light reach', 'O'], ['help', 'Controls', 'H']].map(([t, n, k]) => `<button data-tg="${t}" class="${ED[t] ? 'on' : ''}" title="${n} (${k})">${n}<kbd>${k}</kbd></button>`).join('')}
</span><span class="edgrp edsnaps"><b>Snap</b>${[['move', 'Move', 'px'], ['rot', 'Rotate', '°'], ['scale', 'Scale', '%']].map(([k, n, u]) => `<label class="edsn ${ED.snaps[k].on ? 'on' : ''}" title="${n} snapping: tick to turn on, set the step. Hold Ctrl to flip it while dragging"><input type="checkbox" data-sn="${k}" ${ED.snaps[k].on ? 'checked' : ''}>${n}<input type="number" data-snv="${k}" value="${ED.snaps[k].step}" min="${k === 'move' ? 1 : .5}" max="${k === 'rot' ? 180 : 200}" step="${k === 'move' ? 1 : .5}"><i>${u}</i></label>`).join('')}</span>
      <span class="edgrp"><button class="edpe" title="Change how a kind of prop looks and breaks, everywhere">Prop editor</button></span><span class="edgrp edright"><button class="edundo" title="Undo (Ctrl+Z)">↶</button><button class="edredo" title="Redo (Ctrl+Y)">↷</button><button class="edsave">Save</button><button class="edshare" title="Copy or download your map and prop edits to send them in">Share</button><button class="edexp" title="Download 05c-map-overrides.js">Export</button><label class="edimp">Import<input type="file" accept=".js,.json" hidden></label><button class="edreset">Reset map</button><button class="edplay">Play test <kbd>P</kbd></button><button class="edclose">Exit <kbd>Esc</kbd></button></span></div>
    <div class="edbody"><div class="edleft"><h4>Props <small>click, then click the map · Shift keeps placing</small></h4><div class="edprops">${ED_PROPS.map((p, i) => `<button class="edprop" data-p="${i}"><canvas width="68" height="68"></canvas><span>${p[0]}</span></button>`).join('')}</div>
        <h4>Paths <small>T: click points, double-click or Enter to finish · start on a path's end to extend it</small></h4><div class="edrow"><label>Style <button class="edpick edps-btn" data-pick="style"></button></label><label>Width <input type="number" class="edpw" value="${ED.pathW}" min="4" max="200"></label></div>
        <h4>Water <small>Y: click points round the shape, click the first point (or Enter) to fill it</small></h4>
        <h4>Walls</h4><div class="edrow"><label>Wall kind <select class="edwk">${['wall', 'fence', 'hedge', 'glass', 'building'].map(k => `<option ${k === ED.wallKind ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
        <label>Thickness <input type="number" class="edwt" value="${ED.wallT}" min="2" max="80"></label><label>Color <input type="color" class="edwc" value="${edHex(ED.wallCol)}"></label></div></div>
      <div class="edview"><canvas></canvas><div class="edcoords"></div><div class="edstat">Edits save in this browser automatically</div>
        <button class="edhelpbtn" title="Show controls (H)">? Controls</button><div class="edhelp"><button class="edhelpx" title="Hide (H)">×</button><b>Controls</b>
          <p><kbd>Wheel</kbd> zoom at cursor · <kbd>Space</kbd>/<kbd>Right</kbd>/<kbd>Middle</kbd> drag pan · <kbd>0</kbd> fit · <kbd>F</kbd> focus selection · <kbd>+</kbd><kbd>-</kbd> zoom</p>
          <p><kbd>Click</kbd> select · <kbd>Shift</kbd>/<kbd>Ctrl</kbd>+click add · drag empty space to box-select · <kbd>Ctrl+A</kbd> all</p>
          <p>Drag to move (<kbd>Shift</kbd> locks axis, <kbd>Ctrl</kbd> no snap) · <kbd>Alt</kbd>+drag duplicates · handles resize</p>
          <p><kbd>Arrows</kbd> nudge 1 (<kbd>Shift</kbd> 10) · <kbd>[</kbd> <kbd>]</kbd> size (<kbd>Shift</kbd> bigger steps) · <kbd>Q</kbd> rotate</p>
          <p><kbd>Del</kbd> delete · <kbd>Ctrl+D</kbd> duplicate · <kbd>Ctrl+C</kbd>/<kbd>V</kbd> copy/paste at cursor · <kbd>Ctrl+Z</kbd>/<kbd>Y</kbd> undo/redo</p>
          <p>Gizmo: drag the <b style="color:#ff5a5a">red</b>/<b style="color:#5aff7a">green</b> arrows to move along an axis, the yellow square to move freely, the cubes to scale (white: all ways), the ring to rotate · <kbd>Q</kbd> rotate by the snap step (<kbd>Shift</kbd> the other way) · <kbd>Ctrl</kbd> while dragging flips snapping</p>
          <p><kbd>A</kbd> add a point at the cursor · <kbd>E</kbd> end the path at the cursor</p>
          <p><kbd>T</kbd> draw path · <kbd>Y</kbd> draw water · drag points · <kbd>Alt</kbd>+click a point removes it · double-click a line adds one · <kbd>[</kbd><kbd>]</kbd> path width, <kbd>Shift</kbd> resizes the shape</p>
          <p><kbd>W</kbd> draw wall · <kbd>B</kbd> draw block · <kbd>L</kbd> add light · <kbd>N</kbd> night preview · <kbd>P</kbd> play test · <kbd>Esc</kbd> deselect / exit</p></div></div>
      <div class="edright2"><div class="edpanel"></div></div></div>`;
  document.body.appendChild(root);
  ED.cv = root.querySelector('.edview canvas'); ED.x = ED.cv.getContext('2d'); ED.coords = root.querySelector('.edcoords'); ED.stat = root.querySelector('.edstat');
  ED.cv.addEventListener('pointerdown', edDown); ED.cv.addEventListener('pointermove', edMove); ED.cv.addEventListener('pointerup', edUp); ED.cv.addEventListener('pointercancel', edUp);
  ED.cv.addEventListener('pointerleave', () => { ED.mouse = null; }); ED.cv.addEventListener('contextmenu', e => e.preventDefault());
  ED.cv.addEventListener('wheel', e => { e.preventDefault(); const r = ED.cv.getBoundingClientRect(); if (e.ctrlKey || !e.shiftKey && Math.abs(e.deltaX) < 1) edZoom(Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0018)), e.clientX - r.left, e.clientY - r.top); else { ED.px -= e.deltaX || e.deltaY; } }, { passive: false });
  root.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => edTool(b.dataset.tool));
  root.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => edToggle(b.dataset.tg));
  root.querySelectorAll('.edprop').forEach(b => b.onclick = () => edTool('prop', ED_PROPS[+b.dataset.p]));
  const psb = root.querySelector('.edps-btn'); const psSet = () => edPickBtn(psb, 'style', ED.pathStyle); psSet(); psb.onclick = () => edPicker(psb, 'style', ED.pathStyle, v => { ED.pathStyle = v; psSet(); edTool('path'); }); root.querySelector('.edpw').onchange = e => { ED.pathW = clamp(+e.target.value || 20, 4, 200); };
  root.querySelectorAll('[data-sn]').forEach(c => c.onchange = () => { ED.snaps[c.dataset.sn].on = c.checked; c.parentElement.classList.toggle('on', c.checked); edSaveSnaps(); });
  root.querySelectorAll('[data-snv]').forEach(c => c.onchange = () => { ED.snaps[c.dataset.snv].step = Math.max(+c.min, +c.value || 1); c.value = ED.snaps[c.dataset.snv].step; ED.grid = ED.snaps.move.step; edSaveSnaps(); });
  root.querySelector('.edwk').onchange = e => { ED.wallKind = e.target.value; const p = ED_PROPS.find(p => p[1] === ED.wallKind); if (p) { ED.wallCol = p[5]; ED.wallT = Math.min(p[3], p[4]) || 14; root.querySelector('.edwc').value = edHex(ED.wallCol); root.querySelector('.edwt').value = ED.wallT; } edTool('wall'); };
  root.querySelector('.edwt').onchange = e => { ED.wallT = clamp(+e.target.value || 14, 2, 80); };
  root.querySelector('.edwc').oninput = e => { ED.wallCol = e.target.value; };
  root.querySelector('.edundo').onclick = () => edUndo(-1); root.querySelector('.edredo').onclick = () => edUndo(1);
  root.querySelector('.edsave').onclick = edSave; root.querySelector('.edshare').onclick = edShare; root.querySelector('.edexp').onclick = edExport; root.querySelector('.edreset').onclick = edReset;
  root.querySelector('.edimp input').onchange = e => e.target.files[0] && edImport(e.target.files[0]);
  root.querySelector('.edplay').onclick = () => closeEditor(true); root.querySelector('.edclose').onclick = () => closeEditor();
  root.querySelector('.edmap').onchange = e => { edSave(); const i = +e.target.value; cancelAnimationFrame(ED.raf); root.remove(); removeEventListener('keydown', edKey, true); removeEventListener('keyup', edKey, true); openEditor(i); };
  addEventListener('keydown', edKey, true); addEventListener('keyup', edKey, true);
  root.querySelector('.edpe').onclick = () => openPropEditor(ED.sel.length === 1 && ED.sel[0].t === 'o' ? edItem(ED.sel[0]).kind : 'tree');
  root.querySelector('.edhelpx').onclick = () => edToggle('help'); root.querySelector('.edhelpbtn').onclick = () => edToggle('help');
  try { if (localStorage.getItem('snakeEdHelp') === '0') { ED.help = true; edToggle('help'); } else root.querySelector('.edhelpbtn').style.display = 'none'; } catch (e) {}
  edPreviews(); edTool('select'); edPanel();
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
    p.innerHTML = `<h4>${o.kind}</h4><label>Kind <button class="edpick okind"></button></label>
      <div class="edgrid2">${num('x', 'X')}${num('y', 'Y')}${o.t === 'r' ? num('w', 'Width', 2) + num('h', 'Height', 2) : num('r', 'Radius', 2)}</div>
      <label>Size <input type="range" min="25" max="400" value="100" class="edsz"><output>100%</output></label>
      <label>Color <input type="color" data-c value="${edHex(o.color)}"></label>
      ${o.kind === 'building' ? `<label>Roof <select data-ks="roof">${['gable', 'hip', 'flat'].map(k => `<option ${k === o.roof ? 'selected' : ''}>${k}</option>`).join('')}</select></label>` : ''}
      ${lamp ? `<h4>Lamp light</h4><label>Light color <input type="color" data-lampc value="${edHex(o.lc || (o.mast ? LCOL.flood : o.lantern ? LCOL.fire : LCOL.street))}"></label>${num('lr', 'Reach', 20).replace(`value="0"`, `value="${o.lr || (o.lantern ? 105 : 130)}"`)}` : ''}
      ${num('rot', 'Rotation °')}
      <label class="edck"><input type="checkbox" data-ckn="noCollide" ${o.noCollide ? '' : 'checked'}> Solid (blocks movement)</label>
      <label class="edck"><input type="checkbox" data-ckn="noOutline" ${o.noOutline ? '' : 'checked'}> Outline</label>
      <label class="edck"><input type="checkbox" data-ckn="noShadow" ${o.noShadow ? '' : 'checked'}> Casts shadows</label>
      <div class="edbtns"><button data-a="dup">Duplicate</button><button data-a="del">Delete</button><button data-a="rot">Rotate ${ED.snaps.rot.step}°</button><button data-a="front">To front</button><button data-a="back">To back</button></div>`;
    const sz = p.querySelector('.edsz'), base = edClone(o); sz.oninput = () => { if (!sz._p) { edPush(); sz._p = true; } const f = sz.value / 100; sz.nextElementSibling.textContent = sz.value + '%';
      if (o.t === 'c') o.r = Math.max(2, Math.round(base.r * f)); else { const cx = base.x + base.w / 2, cy = base.y + base.h / 2; o.w = Math.max(2, Math.round(base.w * f)); o.h = Math.max(2, Math.round(base.h * f)); o.x = cx - o.w / 2; o.y = cy - o.h / 2; } edPanelVals(true); };
    sz.onchange = () => { sz._p = false; edDirty(); };
  }
  const lk = p.querySelector('.lkind'); if (lk) { edPickBtn(lk, 'light', o.kind); lk.onclick = () => edPicker(lk, 'light', o.kind, v => { edPush(); o.kind = v; delete o.c; edPanel(); }); }
  const ok = p.querySelector('.okind'); if (ok) { edPickBtn(ok, 'kind', o.kind); ok.onclick = () => edPicker(ok, 'kind', o.kind, v => { edPush(); o.kind = v; const pp = ED_PROPS.find(q => q[1] === v); if (pp && pp[2] === o.t) o.color = pp[5]; edPanel(); }); }
  p.querySelectorAll('input[data-k]').forEach(inp => inp.onchange = () => { edPush(); o[inp.dataset.k] = +inp.value; });
  p.querySelectorAll('select[data-ks]').forEach(sel => sel.onchange = () => { edPush(); o[sel.dataset.ks] = sel.value; if (s.t === 'l' && sel.dataset.ks === 'kind') delete o.c; edPanel(); });
  p.querySelectorAll('input[data-ck]').forEach(c => c.onchange = () => { edPush(); o[c.dataset.ck] = c.checked; });
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
  if (edTesting !== null && state === 'menu' && !ED.open && ED.leaving) { const i = edTesting; edTesting = null; ED.leaving = false; openEditor(i); return; }
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
    x.save(); x.globalAlpha *= s.a ?? 1; x.translate(cx, cy); x.rotate((s.rot || 0) * Math.PI / 180); x.fillStyle = x.strokeStyle = s.c || '#ffffff'; x.lineWidth = Math.max(.5, (s.lw ?? .08) * Math.min(bw, bh)); x.lineCap = 'round';
    x.beginPath();
    if (s.type === 'rect') x.rect(-w / 2, -h / 2, w, h);
    else if (s.type === 'circle') x.arc(0, 0, Math.min(w, h) / 2, 0, TAU);
    else if (s.type === 'ellipse') x.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU);
    else if (s.type === 'triangle') { x.moveTo(0, -h / 2); x.lineTo(w / 2, h / 2); x.lineTo(-w / 2, h / 2); x.closePath(); }
    if (s.type === 'line') { x.moveTo(-w / 2, 0); x.lineTo(w / 2, 0); x.stroke(); }
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
  const kinds = [...new Set([...ED_KINDS, ...(ED.obs || []).map(o => o.kind)])].filter(k => k !== 'border').sort();
  const box = document.createElement('div'); box.id = 'propEd';
  box.innerHTML = `<div class="pewin"><div class="pehead"><b>Prop editor</b><span class="edmuted">Changes apply to every prop of that kind, on every map</span><button class="peclose">Done</button></div>
    <div class="pebody"><div class="pelist">${kinds.map(k => `<button data-k="${k}"><canvas width="44" height="44"></canvas><span>${k}</span>${propCache[k] ? '<i>●</i>' : ''}</button>`).join('')}</div>
      <div class="pemain"><canvas class="pebig" width="520" height="360"></canvas><div class="pebgs">Background <button data-bg="#2a2a30">Dark</button><button data-bg="#93bf55">Grass</button><button data-bg="#b9b3a7">Pavement</button><button data-bg="#d9d4c8">Tiles</button></div></div>
      <div class="peside"></div></div></div>`;
  document.body.appendChild(box);
  PE.kind = kind; PE.bg = '#2a2a30'; PE.box = box; PE.selShape = -1;
  box.querySelector('.peclose').onclick = () => { box.remove(); edPreviews(); };
  box.querySelectorAll('.pelist button').forEach(b => { drawPreview(b.querySelector('canvas'), edSample(kindSample(b.dataset.k), 0, 0)); b.onclick = () => { PE.kind = b.dataset.k; PE.selShape = -1; peSide(); peDraw(); peList(); }; });
  box.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => { PE.bg = b.dataset.bg; peDraw(); });
  const big = box.querySelector('.pebig'); big.onpointerdown = peDown; big.onpointermove = peMove; big.onpointerup = () => { PE.drag = null; };
  peSide(); peDraw(); peList();
}
const PE = {};
const peGet = () => edClone(propDefs()[PE.kind] || {});
function peSet(p) { let loc = {}; try { loc = JSON.parse(localStorage.getItem('snakeCarnagePropDefs')) || {}; } catch (e) {}
  const empty = !p.color && (!p.breakable || p.breakable === 'default') && !p.hideBase && !p.noCollide && !p.noOutline && !p.noShadow && !(p.shapes && p.shapes.length);
  if (empty) { delete loc[PE.kind]; if (PROP_OVERRIDES[PE.kind]) loc[PE.kind] = {}; } else loc[PE.kind] = p;
  try { localStorage.setItem('snakeCarnagePropDefs', JSON.stringify(loc)); } catch (e) {} propApply(); peDraw(); peList(); }
function peList() { PE.box.querySelectorAll('.pelist button').forEach(b => { b.classList.toggle('on', b.dataset.k === PE.kind); drawPreview(b.querySelector('canvas'), edSample(kindSample(b.dataset.k), 0, 0)); }); }
function peObj() { const p = kindSample(PE.kind); return edSample(p, p[2] === 'r' ? -p[3] / 2 : 0, p[2] === 'r' ? -p[4] / 2 : 0); }
function peView() { const c = PE.box.querySelector('.pebig'), o = peObj(), [x0, y0, x1, y1] = o.t === 'r' ? [o.x, o.y, o.x + o.w, o.y + o.h] : [o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r];
  const s = Math.min((c.width - 80) / (x1 - x0), (c.height - 80) / (y1 - y0), 12); return { c, o, s, ox: c.width / 2, oy: c.height / 2, x0, y0, bw: x1 - x0, bh: y1 - y0 }; }
function peDraw() {
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
  el.innerHTML = `<h4>${PE.kind}</h4>
    <label class="edck"><input type="checkbox" class="pecol" ${p.color ? 'checked' : ''}> Recolor every ${PE.kind}</label><input type="color" class="pecolv" value="${edHex(p.color || kindSample(PE.kind)[5])}" ${p.color ? '' : 'disabled'}>
    <h4>Behaviour</h4><label class="edck"><input type="checkbox" class="pef" data-f="noCollide" ${p.noCollide ? '' : 'checked'}> Solid: blocks the snake and people</label>
    <label class="edck"><input type="checkbox" class="pef" data-f="noOutline" ${p.noOutline ? '' : 'checked'}> Dark outline around it</label>
    <label class="edck"><input type="checkbox" class="pef" data-f="noShadow" ${p.noShadow ? '' : 'checked'}> Casts sun and lamp shadows</label>
    <h4>Breaking</h4><select class="pebrk">${Object.entries(bn).map(([k, n]) => `<option value="${k}" ${k === (p.breakable || 'default') ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <p class="edmuted">Which Battering Ram level can smash through it. Very large trees and boulders still hold.</p>
    <h4>Shapes on top</h4><div class="edbtns">${ED_SHAPES.map(t => `<button data-add="${t}">+ ${t}</button>`).join('')}</div>
    <label class="edck"><input type="checkbox" class="pehide" ${p.hideBase ? 'checked' : ''}> Hide the original drawing (shapes only)</label>
    <div class="peshapes">${sh.map((s, i) => `<button data-s="${i}" class="${i === PE.selShape ? 'on' : ''}">${i + 1}. ${s.type}</button>`).join('')}</div>
    <div class="peshape"></div>
    <div class="edbtns" style="margin-top:12px"><button class="pereset">Reset ${PE.kind}</button></div>`;
  el.querySelector('.pecol').onchange = e => { const q = peGet(); if (e.target.checked) q.color = el.querySelector('.pecolv').value; else delete q.color; peSet(q); peSide(); };
  el.querySelector('.pecolv').oninput = e => { const q = peGet(); q.color = e.target.value; peSet(q); };
  el.querySelectorAll('.pef').forEach(c => c.onchange = () => { const q = peGet(); if (c.checked) delete q[c.dataset.f]; else q[c.dataset.f] = true; peSet(q); });
  el.querySelector('.pebrk').onchange = e => { const q = peGet(); q.breakable = e.target.value; peSet(q); };
  el.querySelector('.pehide').onchange = e => { const q = peGet(); q.hideBase = e.target.checked; peSet(q); };
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
  return `/* =========================================================\n   MAP EDITS (exported from the map editor)\n   Maps changed in the map editor (40b-editor). Each entry replaces that map's objects and lights at one world width.\n   ========================================================= */\nconst MAP_OVERRIDES = ${JSON.stringify({ ...MAP_OVERRIDES, ...localMapEdits() })};\nconst PROP_OVERRIDES = ${JSON.stringify(propDefs())}; // per kind: { color, breakable, hideBase, shapes }\nconst mapEditKey = name => name + '@' + W;\nfunction localMapEdits() { try { return JSON.parse(localStorage.getItem('snakeCarnageMapEdits')) || {}; } catch (e) { return {}; } }\nfunction mapOverride(name) { const k = mapEditKey(name); return localMapEdits()[k] || MAP_OVERRIDES[k] || null; }\nfunction propDefs() { let loc = {}; try { loc = JSON.parse(localStorage.getItem('snakeCarnagePropDefs')) || {}; } catch (e) {} return { ...PROP_OVERRIDES, ...loc }; }\n`;
}
function edShare() {
  edSave(); const text = edShareText(), maps = Object.keys({ ...MAP_OVERRIDES, ...localMapEdits() }), props = Object.keys(propDefs());
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
function edShapeChanged(o, live) { if (o.poly) polyBounds(o); if (o.pts) { if (live) ED.floorDirty = true; else edFloor(true); } }
function edFloor(now) { // the ground with every path painted, rebuilt at most ~10 times a second while dragging
  if (!now) { ED.floorDirty = true; return; }
  ED.floorDirty = false; ED.floorT = performance.now();
  const x = ED.floor.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, ED.floor.width, ED.floor.height); x.drawImage(ED.floorBase, 0, 0);
  x.setTransform(DPR, 0, 0, DPR, 0, 0); try { paintTrails(x, ED.trails); } catch (e) { console.warn(e); }
}
function edFinishDraft() {
  const d = ED.draft; ED.draft = null; if (!d) return;
  if (d.kind === 'path') { if (d.pts.length < 2) return; edPush();
    if (d.extend) { const t = ED.trails[d.extend.i], add = d.pts.slice(1); t.pts = d.extend.end ? [...t.pts, ...add] : [...add.reverse(), ...t.pts]; ED.sel = [{ t: 'p', i: d.extend.i }]; }
    else { ED.trails.push({ pts: d.pts, w: d.w, style: d.style, seed: Math.floor(Math.random() * 999) }); ED.sel = [{ t: 'p', i: ED.trails.length - 1 }]; }
    edFloor(true); }
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
    if (o0.poly) { o.poly = o0.poly.map(([x, y]) => tp(x, y).map(v => Math.round(v * 10) / 10)); polyBounds(o); return; }
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

/* =========================================================
   EDITOR QUALITY OF LIFE: layered over ed-core without changing how anything is stored.
   Map editor
     Ctrl+K (or /)   command palette: type to find any prop (and its variants), tool, command, map or prop to edit
     smart guides    dragging lines things up with the edges and centres of what's around them (and the map's middle)
     hover           what's under the cursor is outlined and named; dragging shows its size and position
     camera          zoom and Fit / Focus glide instead of jumping; dragging near the view's edge scrolls it
     clipboard       copy / paste works for everything (objects, lights, paths, floor areas, shapes) and between maps;
                     Ctrl+Shift+V pastes in place
     Ctrl+D again    duplicates by the step you moved the last copy (a row of fence posts in three keypresses)
     select similar  Ctrl+Shift+A, or right-click: every object of the same kind
     placing         R / Shift+R turns the prop before you place it; Ctrl+drag paints it like a brush (trees, rocks...
                     get a little size and color variety); recently used props sit at the top of the palette
     undo            names what it undid; a run of arrow-key nudges is one step
     autosave        a few seconds after you stop changing things, and when the page closes
     number fields   drag a field's label left/right to scrub its value (Shift: faster, Alt: finer)
   Prop editor
     wheel zooms the preview; the selected shape has handles to resize it; shapes snap to the middle and to each other
     (Alt: no snapping); arrows nudge, [ ] size, Q turns, Ctrl+D duplicates, Tab picks the next shape
   ========================================================= */
const QOL = { recent: [], ghostRot: 0, act: null, cam: null, last: null, guides: null, ptr: null, dup: null, scatter: null, nudgeT: 0, saveT: 0, toastT: 0, t: 0 };
try { QOL.recent = JSON.parse(localStorage.getItem('snakeEdRecent')) || []; } catch (e) {}
const qolSmooth = () => !(typeof SETTINGS !== 'undefined' && SETTINGS.reduceMotion);
const qolSelKey = () => ED.sel.map(s => s.t + s.i).join(',');
const qolLists = { o: () => ED.obs, l: () => ED.lights, p: () => ED.trails, a: () => ED.areas, s: () => ED.shapes };

/* ---- a little message that floats up and fades ---- */
function edToast(msg) {
  let t = document.querySelector('.edtoast'); if (!t) { t = document.createElement('div'); t.className = 'edtoast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.remove('out'); void t.offsetWidth; t.classList.add('on'); clearTimeout(QOL.toastT); QOL.toastT = setTimeout(() => t.classList.add('out'), 1500);
}

/* ---- undo that says what it undid ---- */
const qolAct = (name, fn) => function () { const p = QOL.act; QOL.act = p || name; try { return fn.apply(this, arguments); } finally { QOL.act = p; } };
function qolGuessAct() {
  const d = ED.drag;
  if (d) return { move: 'Move', resize: 'Resize', pt: 'Edit points', gizmo: 'Transform', wall: 'Draw wall', rect: 'Draw block' }[d.k] || 'Edit';
  if (ED.tool === 'prop' && ED.ghost) return 'Place ' + ED.ghost[0].toLowerCase();
  return { light: 'Add light', wall: 'Draw wall', rect: 'Draw block', path: 'Draw path', water: 'Draw water', area: 'Floor area' }[ED.tool] || 'Edit';
}
const _qPush = edPush;
edPush = function () { _qPush(); const u = ED.undo[ED.undo.length - 1]; if (u) u._lbl = QOL.act || qolGuessAct(); };
const _qUndo = edUndo;
edUndo = function (dir) {
  const from = dir < 0 ? ED.undo : ED.redo; if (!from.length) return edToast(dir < 0 ? 'Nothing to undo' : 'Nothing to redo');
  const lbl = from[from.length - 1]._lbl || 'Edit'; _qUndo(dir);
  const to = dir < 0 ? ED.redo : ED.undo; if (to.length) to[to.length - 1]._lbl = lbl;
  edToast(`${dir < 0 ? 'Undo' : 'Redo'}: ${lbl}`);
};
edDelete = qolAct('Delete', edDelete); edPaste = qolAct('Paste', edPaste); edScale = qolAct('Resize', edScale); edOrder = qolAct('Reorder', edOrder); edAlign = qolAct('Align', edAlign);
edRotateBy = qolAct('Rotate', edRotateBy); edFlagSel = qolAct('Lock / hide', edFlagSel);
const _qNudge = edNudge;
edNudge = function (dx, dy) { // held arrows: one undo step for the whole run
  const now = performance.now(), key = qolSelKey(), same = now - QOL.nudgeT < 900 && QOL.nudgeKey === key; QOL.nudgeT = now; QOL.nudgeKey = key;
  const keep = edPush; if (same) edPush = () => edDirty(); QOL.act = 'Nudge';
  try { _qNudge(dx, dy); } finally { edPush = keep; QOL.act = null; }
};

/* ---- autosave: a moment after you stop, and on the way out ---- */
const _qDirty = edDirty;
edDirty = function () { _qDirty(); clearTimeout(QOL.saveT); QOL.saveT = setTimeout(function tick() { if (!ED.open || !ED.dirtySave) return; if (ED.drag || ED.draft || ED.sdraft) { QOL.saveT = setTimeout(tick, 1500); return; } edSave(); }, 3000); };
addEventListener('beforeunload', () => { try { if (ED.open && ED.dirtySave) edSave(); } catch (e) {} });

/* ---- moving anything by an offset (no undo step of its own) ---- */
function qolMoveItem(t, o, dx, dy) {
  if (t === 's') return edShapeMoveBy(o, dx, dy);
  if (o.pts) { o.pts = o.pts.map(([a, b]) => [a + dx, b + dy]); return; }
  if (o.poly) { o.poly = o.poly.map(([a, b]) => [a + dx, b + dy]); if (t === 'a') { polyBounds(o); return; } }
  o.x += dx; o.y += dy;
}
function qolItemBox(t, o) {
  if (t === 's') return vecBox(o);
  const arr = o.pts || (t === 'a' ? o.poly : null); if (arr) { const xs = arr.map(p => p[0]), ys = arr.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
  if (t === 'l') return [o.x - 6, o.y - 6, o.x + 6, o.y + 6];
  return edBox(o);
}
function qolBoxOf(items) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [t, o] of items) { const b = qolItemBox(t, o); x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); } return [x0, y0, x1, y1]; }
const qolSelItems = () => ED.sel.map(s => [s.t, edItem(s)]).filter(([, o]) => o);
const qolSelCentre = () => { const b = qolBoxOf(qolSelItems()); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };

/* ---- clipboard: everything, between maps, in place ---- */
edCopy = function () {
  const clip = qolSelItems().map(([t, o]) => ({ t, v: edClone(o) })); if (!clip.length) return;
  ED.clip = clip; try { localStorage.setItem('snakeEdClip', JSON.stringify(clip)); } catch (e) {} edToast(`Copied ${clip.length}`);
};
const qolClip = () => { try { const c = JSON.parse(localStorage.getItem('snakeEdClip')); if (c && c.length) return c; } catch (e) {} return ED.clip; };
edPaste = function (inPlace) {
  const clip = qolClip(); if (!clip || !clip.length) return edToast('Nothing copied yet');
  QOL.act = inPlace === true ? 'Paste in place' : 'Paste'; edPush(); QOL.act = null;
  const b = qolBoxOf(clip.map(c => [c.t, c.v])), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  let dx = 0, dy = 0; if (inPlace !== true) { const [mx, my] = ED.mouse ? edW(...ED.mouse) : [W / 2, H / 2]; dx = edSnap(mx - cx); dy = edSnap(my - cy); }
  ED.sel = []; let floor = false;
  for (const c of clip) { const L = qolLists[c.t] && qolLists[c.t](); if (!L) continue; const v = edClone(c.v); delete v._lock; delete v._hide; qolMoveItem(c.t, v, dx, dy); L.push(v); ED.sel.push({ t: c.t, i: L.length - 1 }); if (c.t === 'p' || c.t === 'a') floor = true; }
  if (floor) edFloor(true); edPanel(); edToast(`Pasted ${ED.sel.length}`);
};

/* ---- Ctrl+D again: repeat the step ---- */
const _qDup = edDuplicate;
edDuplicate = function (off = 16) {
  if (!ED.sel.length) return;
  if (off === 0) { QOL.act = QOL.act || 'Duplicate'; try { return _qDup(0); } finally { QOL.act = null; } } // Alt+drag
  const d = QOL.dup, key = qolSelKey(), c0 = qolSelCentre();
  QOL.act = 'Duplicate';
  try {
    if (d && d.key === key) { // these are the copies made last time: copy again by however far they were moved
      const dx = c0[0] - d.from[0], dy = c0[1] - d.from[1]; _qDup(0); for (const s of ED.sel) qolMoveItem(s.t, edItem(s), dx, dy);
      if (ED.sel.some(s => s.t === 'p' || s.t === 'a')) edFloor(true); edPanelVals(); edToast('Duplicated again (same step)');
    } else _qDup(off);
  } finally { QOL.act = null; }
  QOL.dup = { key: qolSelKey(), from: c0 };
};

/* ---- select similar ---- */
function qolSelectSimilar() {
  if (!ED.sel.length) return; const kinds = new Set(), lk = new Set();
  for (const s of ED.sel) { const o = edItem(s); if (s.t === 'o') { const v = edVariant(o); kinds.add(o.kind + ':' + (o.poly ? 'poly' : v && v[0] || '')); } if (s.t === 'l') lk.add(o.kind || 'fixed'); }
  const out = [];
  ED.obs.forEach((o, i) => { if (o._hide || o._lock) return; const v = edVariant(o); if (kinds.has(o.kind + ':' + (o.poly ? 'poly' : v && v[0] || ''))) out.push({ t: 'o', i }); });
  ED.lights.forEach((l, i) => { if (!l._hide && !l._lock && lk.has(l.kind || 'fixed')) out.push({ t: 'l', i }); });
  ED.sel = out; edPanel(); edToast(`Selected ${out.length} alike`);
}
const _qCtx = edContext;
edContext = function (cx, cy, wx, wy) {
  _qCtx(cx, cy, wx, wy); const m = document.querySelector('.edctx'); if (!m) return;
  const add = (label, kbd, fn) => { const b = document.createElement('button'); b.innerHTML = `<span>${label}</span>${kbd ? `<kbd>${kbd}</kbd>` : ''}`; b.onclick = () => { m.remove(); fn(); }; m.appendChild(b); };
  m.appendChild(document.createElement('hr'));
  if (ED.sel.length) add('Select all like this', 'Ctrl+Shift+A', qolSelectSimilar);
  add('Paste in place', 'Ctrl+Shift+V', () => edPaste(true));
  add('Command palette…', 'Ctrl+K', qolPalette);
  m.style.top = Math.min(cy, innerHeight - m.offsetHeight - 8) + 'px';
};

/* ---- smooth camera ---- */
edZoom = function (f, sx, sy) {
  const A = QOL.cam || { z: ED.z, px: ED.px, py: ED.py }, wx = (sx - A.px) / A.z, wy = (sy - A.py) / A.z, z = clamp(A.z * f, .15, 24);
  QOL.cam = { z, px: sx - wx * z, py: sy - wy * z }; if (!qolSmooth()) { Object.assign(ED, QOL.cam); QOL.cam = null; }
};
const qolGlide = fn => function () { if (!ED.fitted || !qolSmooth()) return fn.apply(this, arguments); const s = { z: ED.z, px: ED.px, py: ED.py }; fn.apply(this, arguments); QOL.cam = { z: ED.z, px: ED.px, py: ED.py }; Object.assign(ED, s); };
edFit = qolGlide(edFit); edFocus = qolGlide(edFocus);
function qolCamStep(dt) {
  const c = QOL.cam, L = QOL.last;
  if (c && L) { if (ED.z === L.z) { c.px += ED.px - L.px; c.py += ED.py - L.py; } else { QOL.cam = null; } } // panned (or moved some other way) meanwhile: carry the target along
  if (QOL.cam) { const k = 1 - Math.exp(-dt * 16); ED.z += (c.z - ED.z) * k; ED.px += (c.px - ED.px) * k; ED.py += (c.py - ED.py) * k;
    if (Math.abs(c.z - ED.z) / c.z < .002 && Math.abs(c.px - ED.px) < .5 && Math.abs(c.py - ED.py) < .5) { Object.assign(ED, c); QOL.cam = null; } }
  QOL.last = { z: ED.z, px: ED.px, py: ED.py };
}
function qolEdgePan(dt) { // dragging near the edge of the view scrolls it
  const d = ED.drag, p = QOL.ptr; if (!d || !p || !/^(move|box|resize|pt|wall|rect|gizmo)$/.test(d.k)) return;
  const r = ED.cv.getBoundingClientRect(), mx = p.clientX - r.left, my = p.clientY - r.top, m = 34;
  const vx = mx < m ? m - mx : mx > r.width - m ? r.width - m - mx : 0, vy = my < m ? m - my : my > r.height - m ? r.height - m - my : 0;
  if (!vx && !vy) return; ED.px += vx * dt * 14; ED.py += vy * dt * 14; if (QOL.cam) { QOL.cam.px += vx * dt * 14; QOL.cam.py += vy * dt * 14; }
  QOL.inEdge = true; try { edMove(p); } finally { QOL.inEdge = false; }
}

/* ---- smart guides: line up with what's around ---- */
function qolGuides() {
  QOL.guides = null; const items = qolSelItems(); if (!items.length || items.some(([t, o]) => !(t === 'o' || t === 'l') || o.poly)) return;
  const sb = qolBoxOf(items), thr = 6 / ED.z, near = 700;
  const mv = { x: [sb[0], (sb[0] + sb[2]) / 2, sb[2]], y: [sb[1], (sb[1] + sb[3]) / 2, sb[3]] };
  const cands = [[0, 0, W, H, true]];
  ED.obs.forEach((o, i) => { if (o._hide || ED.sel.some(s => s.t === 'o' && s.i === i)) return; const b = edBox(o); if (b[0] > sb[2] + near || b[2] < sb[0] - near || b[1] > sb[3] + near || b[3] < sb[1] - near) return; cands.push(b); });
  let bx = null, by = null;
  for (const b of cands) {
    const tx = b[4] ? [W / 2] : [b[0], (b[0] + b[2]) / 2, b[2]], ty = b[4] ? [H / 2] : [b[1], (b[1] + b[3]) / 2, b[3]];
    for (const t of tx) for (const m of mv.x) { const d = t - m; if (Math.abs(d) < thr && (!bx || Math.abs(d) < Math.abs(bx.d))) bx = { d, t, b }; }
    for (const t of ty) for (const m of mv.y) { const d = t - m; if (Math.abs(d) < thr && (!by || Math.abs(d) < Math.abs(by.d))) by = { d, t, b }; }
  }
  if (!bx && !by) return;
  const dx = bx ? bx.d : 0, dy = by ? by.d : 0; for (const [t, o] of items) qolMoveItem(t, o, dx, dy);
  const g = []; if (bx) g.push(['v', bx.t, Math.min(sb[1] + dy, bx.b[1]), Math.max(sb[3] + dy, bx.b[3])]); if (by) g.push(['h', by.t, Math.min(sb[0] + dx, by.b[0]), Math.max(sb[2] + dx, by.b[2])]);
  QOL.guides = g; edPanelVals();
}

/* ---- pointer: guides, scatter brush, ghost rotation, scrubbing ---- */
const qolOrganic = new Set(['tree', 'bush', 'rock', 'plant', 'hay']);
function qolPlace(p, wx, wy, scatter) {
  let o = p[2] === 'r' ? R(scatter ? wx - p[3] / 2 : edSnap(wx - p[3] / 2), scatter ? wy - p[4] / 2 : edSnap(wy - p[4] / 2), p[3], p[4], p[5], p[1], p[6] && edClone(p[6])) : C(scatter ? wx : edSnap(wx), scatter ? wy : edSnap(wy), p[3], p[5], p[1], p[6] && edClone(p[6]));
  if (o.t === 'r' && (QOL.ghostRot || scatter && qolOrganic.has(o.kind))) o.rot = scatter && qolOrganic.has(o.kind) ? Math.round(rand(0, 360)) : QOL.ghostRot;
  if (scatter && qolOrganic.has(o.kind)) { if (o.t === 'c') o.r = Math.max(3, Math.round(o.r * rand(.78, 1.28))); o.color = shade(edHex(o.color), rand(-.09, .07)); } // a little variety, like real growth
  ED.obs.push(o); return o;
}
function qolRemember(p) { const i = ED_PROPS.indexOf(p); if (i < 0) return; QOL.recent = [i, ...QOL.recent.filter(j => j !== i)].slice(0, 8); try { localStorage.setItem('snakeEdRecent', JSON.stringify(QOL.recent)); } catch (e) {} qolRecentRow(); }
const _qDown = edDown;
edDown = function (e) {
  QOL.cam = null; QOL.guides = null; QOL.ptr = e;
  if (e.button === 0 && ED.tool === 'prop' && ED.ghost && (e.ctrlKey || e.metaKey) && !ED.space) { // Ctrl+drag: paint
    const r = ED.cv.getBoundingClientRect(), [wx, wy] = edW(e.clientX - r.left, e.clientY - r.top), p = ED.ghost;
    ED.cv.setPointerCapture(e.pointerId); QOL.act = 'Paint ' + p[0].toLowerCase(); edPush(); QOL.act = null;
    const sz = p[2] === 'r' ? Math.max(p[3], p[4]) : p[3] * 2; QOL.scatter = { x: wx, y: wy, gap: Math.max(10, sz * 1.15), n: 1 }; qolPlace(p, wx, wy, true); qolRemember(p); return;
  }
  const wasProp = ED.tool === 'prop' && ED.ghost, p = ED.ghost, n0 = ED.obs.length;
  if (wasProp && e.button === 0) QOL.act = 'Place ' + p[0].toLowerCase();
  try { _qDown(e); } finally { QOL.act = null; }
  if (wasProp && ED.obs.length > n0) { const o = ED.obs[ED.obs.length - 1]; if (QOL.ghostRot && o.t === 'r') o.rot = QOL.ghostRot; qolRemember(p); }
};
const _qMove = edMove;
edMove = function (e) {
  if (!QOL.inEdge) QOL.ptr = { clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey, pointerId: e.pointerId };
  const sc = QOL.scatter;
  if (sc) { const r = ED.cv.getBoundingClientRect(), [wx, wy] = edW(e.clientX - r.left, e.clientY - r.top); ED.mouse = [e.clientX - r.left, e.clientY - r.top];
    const dx = wx - sc.x, dy = wy - sc.y, d = Math.hypot(dx, dy);
    if (d >= sc.gap) { const steps = Math.min(20, Math.floor(d / sc.gap)); for (let k = 1; k <= steps; k++) { const f = k * sc.gap / d, j = sc.gap * .3; qolPlace(ED.ghost, sc.x + dx * f + rand(-j, j), sc.y + dy * f + rand(-j, j), true); sc.n++; } sc.x += dx * steps * sc.gap / d; sc.y += dy * steps * sc.gap / d; }
    return; }
  _qMove(e);
  if (ED.drag && ED.drag.k === 'move' && ED.drag.moved && ED.snaps.guides !== false && !e.altKey) qolGuides(); else QOL.guides = null;
};
const _qUp = edUp;
edUp = function (e) {
  if (QOL.scatter) { const n = QOL.scatter.n; QOL.scatter = null; edDirty(); edPanel(); edToast(`Painted ${n}`); return; }
  QOL.guides = null; _qUp(e);
};
// R turns the prop you're about to place
const qolTurnGhost = d => { QOL.ghostRot = ((QOL.ghostRot + d) % 360 + 360) % 360; edToast(`Placing at ${QOL.ghostRot}°`); };
const _qTool = edTool;
edTool = function (t, prop) { if (t !== 'prop' || prop !== ED.ghost) QOL.ghostRot = 0; return _qTool(t, prop); };

/* ---- keys ---- */
const _qKey = edKey;
edKey = function (e) {
  if (e.type === 'keydown' && ED.open && !(PE.active && PE.box && PE.box.isConnected)) {
    const tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'select' || tag === 'textarea', k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (!typing && !document.querySelector('.edcmdk')) {
      if ((mod && k === 'k') || (!mod && k === '/')) { e.preventDefault(); e.stopPropagation(); return qolPalette(); }
      if (mod && e.shiftKey && k === 'v') { e.preventDefault(); e.stopPropagation(); return edPaste(true); }
      if (mod && e.shiftKey && k === 'a') { e.preventDefault(); e.stopPropagation(); return qolSelectSimilar(); }
      if (!mod && k === 'r' && ED.tool === 'prop' && ED.ghost) { e.preventDefault(); e.stopPropagation(); return qolTurnGhost(e.shiftKey ? -ED.snaps.rot.step : ED.snaps.rot.step); }
    }
  }
  return _qKey(e);
};

/* ---- drawing: guides, hover, measurements, the turned ghost ---- */
function qolDrawGhost(x) {
  const p = ED.ghost; if (!p || !ED.mouse || ED.tool !== 'prop' || QOL.scatter) return; const [mx, my] = edW(...ED.mouse);
  const o = edSample(p, p[2] === 'r' ? edSnap(mx - p[3] / 2) : edSnap(mx), p[2] === 'r' ? edSnap(my - p[4] / 2) : edSnap(my)); if (o.t === 'r') o.rot = QOL.ghostRot;
  x.globalAlpha = .6; try { drawObstacle(x, o); } catch (e) {} x.globalAlpha = 1;
}
function qolLabel(x, d, sx, sy, text, col = '#fff', bg = 'rgba(14,11,16,.85)') {
  x.setTransform(d, 0, 0, d, 0, 0); x.font = '600 11px system-ui, sans-serif'; const w = x.measureText(text).width + 10;
  x.fillStyle = bg; x.beginPath(); if (x.roundRect) x.roundRect(sx, sy, w, 18, 5); else x.rect(sx, sy, w, 18); x.fill(); x.fillStyle = col; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(text, sx + 5, sy + 9.5);
}
function qolOverlay() {
  const x = ED.x, d = devicePixelRatio || 1, px = 1 / ED.z, wv = () => x.setTransform(d * ED.z, 0, 0, d * ED.z, d * ED.px, d * ED.py), scr = (wx, wy) => [wx * ED.z + ED.px, wy * ED.z + ED.py];
  wv(); qolDrawGhost(x);
  if (QOL.guides) { x.strokeStyle = '#ff3bd5'; x.lineWidth = px * 1.2; x.setLineDash([]); for (const [k, v, a, b] of QOL.guides) { x.beginPath(); if (k === 'v') { x.moveTo(v, a - 8 * px); x.lineTo(v, b + 8 * px); } else { x.moveTo(a - 8 * px, v); x.lineTo(b + 8 * px, v); } x.stroke(); } }
  const dr = ED.drag;
  if (!dr && ED.tool === 'select' && ED.mouse && !ED.space) { // hover: outline and name what you'd pick
    const [mx, my] = edW(...ED.mouse), h = edHit(mx, my);
    if (h && !ED.sel.some(s => edSame(s, h))) { const o = edItem(h), b = qolItemBox(h.t, o); wv(); x.strokeStyle = 'rgba(140,200,255,.9)'; x.lineWidth = px * 1.5; x.setLineDash([4 * px, 3 * px]);
      if (h.t === 'o' && isRot(o)) { const P = obsCorners(o); x.beginPath(); P.forEach(([a, c], k) => k ? x.lineTo(a, c) : x.moveTo(a, c)); x.closePath(); x.stroke(); } else if (h.t === 'o' && o.t === 'c') { x.beginPath(); x.arc(o.x, o.y, o.r + 2 * px, 0, TAU); x.stroke(); } else x.strokeRect(b[0] - 2 * px, b[1] - 2 * px, b[2] - b[0] + 4 * px, b[3] - b[1] + 4 * px);
      x.setLineDash([]); const [sx, sy] = scr(b[0], b[1]); qolLabel(x, d, sx, sy - 22, `${edLayerName(h.t, o)}${h.t === 'o' && !o.poly ? ` · ${o.t === 'r' ? `${Math.round(o.w)}×${Math.round(o.h)}` : `r ${Math.round(o.r)}`}` : ''}`, '#cfe6ff'); }
  }
  if (dr && /^(move|resize|gizmo)$/.test(dr.k) && ED.sel.length) { // size and position while dragging
    const items = qolSelItems(), b = qolBoxOf(items), [sx, sy] = scr(b[2], b[3]), o = items[0][1];
    const t = items.length === 1 && items[0][0] === 'o' && !o.poly ? (o.t === 'r' ? `${Math.round(o.w)} × ${Math.round(o.h)} · x ${Math.round(o.x)} y ${Math.round(o.y)}` : `r ${Math.round(o.r)} · x ${Math.round(o.x)} y ${Math.round(o.y)}`) : `${Math.round(b[2] - b[0])} × ${Math.round(b[3] - b[1])} · x ${Math.round(b[0])} y ${Math.round(b[1])}`;
    qolLabel(x, d, sx + 8, sy + 6, t, '#ffd6e2');
  }
  if (ED.tool === 'prop' && ED.ghost && ED.mouse) { const [sx, sy] = ED.mouse; qolLabel(x, d, sx + 14, sy + 14, `${ED.ghost[0]}${QOL.ghostRot ? ` · ${QOL.ghostRot}°` : ''} · R turns · Shift+click keeps placing · Ctrl+drag paints`, '#eee'); }
  x.setTransform(1, 0, 0, 1, 0, 0);
}
const _qLoop = edLoop;
edLoop = function () {
  const now = performance.now(), dt = Math.min(.05, (now - (QOL.t || now)) / 1000); QOL.t = now;
  if (ED.fitted) { qolCamStep(dt); qolEdgePan(dt); }
  const g = ED.ghost; if (g && ED.tool === 'prop') ED.ghost = null; // drawn here instead, turned
  try { _qLoop(); } finally { ED.ghost = g; }
  if (ED.open && ED.x) try { qolOverlay(); } catch (e) {}
};

/* ---- the palette: recently used props on top ---- */
function qolRecentRow() {
  const host = ED.root && ED.root.querySelector('.edlt[data-lt="props"]'); if (!host) return;
  let row = host.querySelector('.edrecent'); const list = QOL.recent.filter(i => ED_PROPS[i]);
  if (!list.length) { if (row) row.remove(); return; }
  if (!row) { row = document.createElement('div'); row.className = 'edrecent'; host.querySelector('.edpsearch').after(row); }
  row.innerHTML = `<h5 class="edpgh">Recent</h5><div class="edrecl">${list.map(i => `<button class="edrec" data-p="${i}" title="${ED_PROPS[i][0]}"><canvas width="40" height="40"></canvas></button>`).join('')}</div>`;
  row.querySelectorAll('.edrec').forEach(b => { const p = ED_PROPS[+b.dataset.p]; try { drawPreview(b.querySelector('canvas'), edSample(p, 0, 0)); } catch (e) {} b.onclick = () => edTool('prop', p); });
}

/* ---- scrubbing numbers: drag a field's label ---- */
function qolScrubInit(root) {
  root.addEventListener('pointerdown', e => {
    const lab = e.target.closest && e.target.closest('.edpanel label, .peside label'); if (!lab || e.button !== 0 || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return;
    const inp = lab.querySelector('input[type=number]'); if (!inp) return;
    e.preventDefault(); const x0 = e.clientX, v0 = +inp.value || 0, st = +inp.step || 1; let moved = false;
    const move = ev => { const dx = ev.clientX - x0; if (!moved && Math.abs(dx) < 3) return; if (!moved) { moved = true; edPush(); }
      const k = ev.shiftKey ? 10 : ev.altKey ? .1 : 1, v = Math.round((v0 + dx * st * k * .5) * 10) / 10, mn = inp.min !== '' ? +inp.min : -Infinity;
      inp.value = Math.max(mn, v); const o = ED.sel.length === 1 && edItem(ED.sel[0]); if (o && inp.dataset.k) o[inp.dataset.k] = +inp.value; else inp.dispatchEvent(new Event('change')); };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); document.body.classList.remove('edscrubbing'); if (moved) edDirty(); };
    document.body.classList.add('edscrubbing'); addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
}
const _qBuild = edBuildUI;
edBuildUI = function () {
  _qBuild(); qolRecentRow(); qolScrubInit(ED.root); QOL.cam = null; QOL.last = null;
  if (ED.snaps.guides === undefined) ED.snaps.guides = true;
  const snaps = ED.root.querySelector('.edsnaps'); if (snaps) { // a Guides switch next to the snapping steps
    const l = document.createElement('label'); l.className = 'edsn' + (ED.snaps.guides ? ' on' : ''); l.title = 'Smart guides: line things up with what\'s around them while you drag (Alt: off for one drag)';
    l.innerHTML = `<input type="checkbox" ${ED.snaps.guides ? 'checked' : ''}>Guides`; snaps.appendChild(l);
    l.querySelector('input').onchange = ev => { ED.snaps.guides = ev.target.checked; l.classList.toggle('on', ED.snaps.guides); edSaveSnaps(); };
  }
  const bar = ED.root.querySelector('.edbar .edsp'); if (bar) { const b = document.createElement('button'); b.className = 'edcmdbtn edghost'; b.title = 'Find anything: props, tools, commands, maps (Ctrl+K)'; b.innerHTML = `<span>Search everything…</span><kbd>Ctrl K</kbd>`; b.onclick = qolPalette; bar.before(b); }
};
const _qClose = closeEditor;
closeEditor = function () { clearTimeout(QOL.saveT); document.querySelectorAll('.edcmdk,.edtoast').forEach(n => n.remove()); return _qClose.apply(this, arguments); };

/* ---- command palette ---- */
function qolCommands() {
  const out = [], kbd = {}; for (const m of Object.values(ED_MENUS)) for (const it of m) if (it !== '-') kbd[it[0]] = it[2];
  ED_PROPS.forEach((p, i) => { out.push({ n: p[0], tag: p[1] === 'detail' ? 'Detail' : 'Prop', p, run: () => { edTool('prop', p); } });
    const v = ED_VARIANTS[p[1]]; if (v && ED_PROPS.findIndex(q => q[1] === p[1]) === i) for (const [f, name] of v) if (f) out.push({ n: name, sub: p[0], tag: 'Prop', p, run: () => { const q = [...p]; q[6] = { ...(p[6] || {}), [f]: p[1] === 'chess' ? f : true }; q[0] = name; edTool('prop', q); } }); });
  for (const [t, n, k] of ED_TOOLS) out.push({ n, tag: 'Tool', k, run: () => edTool(t) });
  if (typeof SHAPE_TOOLS !== 'undefined') for (const [t, n, k] of SHAPE_TOOLS) out.push({ n: n + ' shape', tag: 'Tool', k: 'Shift+' + k, run: () => edTool(t) });
  for (const [menu, items] of Object.entries(ED_MENUS)) for (const it of items) if (it !== '-' && !it[0].startsWith('tool:')) out.push({ n: it[1].replace('…', ''), sub: menu, tag: 'Command', k: it[2], run: () => edCmd(it[0]) });
  if (typeof openAnimEditor === 'function') out.push({ n: 'Animation editor', sub: 'how everything moves', tag: 'Command', run: openAnimEditor });
  out.push({ n: 'Select all like this', tag: 'Command', k: 'Ctrl+Shift+A', run: qolSelectSimilar }, { n: 'Paste in place', tag: 'Command', k: 'Ctrl+Shift+V', run: () => edPaste(true) });
  MAPS.forEach((m, i) => { if (i !== ED.map) out.push({ n: 'Open ' + m.name, tag: 'Map', run: () => { const s = ED.root.querySelector('.edmap'); s.value = i; s.dispatchEvent(new Event('change')); } }); });
  for (const k of ED_KINDS) out.push({ n: 'Edit every ' + ((ED_PROPS.find(p => p[1] === k) || [k])[0]).toLowerCase(), tag: 'Prop editor', run: () => openPropEditor(k) });
  return out;
}
function qolScore(q, s) { // fuzzy: every letter in order, rewarding starts of words and runs
  if (!q) return 1; s = s.toLowerCase(); const at = s.indexOf(q);
  if (at >= 0) return 100 + (at === 0 ? 40 : s[at - 1] === ' ' ? 25 : 0) - s.length * .1; // the words themselves beat letters scattered through them
  let i = 0, sc = 0, run = 0;
  for (const ch of q) { const j = s.indexOf(ch, i); if (j < 0) return 0; run = j === i ? run + 1 : 0; sc += 1 + run * 2 + (j === 0 || s[j - 1] === ' ' ? 3 : 0); i = j + 1; }
  return sc - s.length * .02;
}
function qolPalette() {
  document.querySelectorAll('.edcmdk').forEach(n => n.remove());
  const all = qolCommands(), recent = JSON.parse((() => { try { return localStorage.getItem('snakeEdCmdRecent') || '[]'; } catch (e) { return '[]'; } })());
  const m = document.createElement('div'); m.className = 'edcmdk';
  m.innerHTML = `<div class="edcmdw"><input placeholder="Search props, tools, commands, maps…" spellcheck="false"><div class="edcmdl"></div><div class="edcmdf"><span><kbd>↑</kbd><kbd>↓</kbd> choose</span><span><kbd>Enter</kbd> run</span><span><kbd>Esc</kbd> close</span></div></div>`;
  document.body.appendChild(m);
  const inp = m.querySelector('input'), list = m.querySelector('.edcmdl'); let shown = [], cur = 0;
  const render = () => {
    const q = inp.value.trim().toLowerCase();
    shown = q ? all.map(c => ({ c, s: Math.max(qolScore(q, c.n), qolScore(q, (c.sub || '') + ' ' + c.n) - 1, qolScore(q, c.tag + ' ' + c.n) - 2) })).filter(r => r.s > 0).sort((a, b) => b.s - a.s).slice(0, 40).map(r => r.c)
      : [...recent.map(n => all.find(c => c.tag + c.n === n)).filter(Boolean), ...all.filter(c => c.tag === 'Tool' || c.tag === 'Command').slice(0, 14)].filter((c, i, a) => a.indexOf(c) === i).slice(0, 20);
    cur = Math.min(cur, Math.max(0, shown.length - 1));
    list.innerHTML = shown.length ? shown.map((c, i) => `<button class="edcmdi ${i === cur ? 'on' : ''}" data-i="${i}">${c.p ? '<canvas width="28" height="28"></canvas>' : `<i class="edcmdic">${c.tag[0]}</i>`}<span><b>${c.n}</b>${c.sub ? `<small>${c.sub}</small>` : ''}</span><em>${c.tag}</em>${c.k ? `<kbd>${c.k}</kbd>` : ''}</button>`).join('') : '<p class="edhint">Nothing matches</p>';
    list.querySelectorAll('.edcmdi').forEach(b => { const c = shown[+b.dataset.i]; const cv = b.querySelector('canvas'); if (cv) try { drawPreview(cv, edSample(c.p, 0, 0)); } catch (e) {} b.onclick = () => go(c); b.onmousemove = () => { if (cur !== +b.dataset.i) { cur = +b.dataset.i; list.querySelectorAll('.edcmdi').forEach(x => x.classList.toggle('on', +x.dataset.i === cur)); } }; });
    const on = list.querySelector('.edcmdi.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  };
  const go = c => { m.remove(); try { localStorage.setItem('snakeEdCmdRecent', JSON.stringify([c.tag + c.n, ...recent.filter(n => n !== c.tag + c.n)].slice(0, 8))); } catch (e) {} c.run(); };
  inp.oninput = () => { cur = 0; render(); };
  inp.onkeydown = e => { e.stopPropagation();
    if (e.key === 'ArrowDown') { e.preventDefault(); cur = Math.min(shown.length - 1, cur + 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cur = Math.max(0, cur - 1); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[cur]) go(shown[cur]); }
    else if (e.key === 'Escape') { e.preventDefault(); m.remove(); } };
  m.onpointerdown = e => { if (e.target === m) m.remove(); };
  render(); inp.focus();
}

/* =========================================================
   PROP EDITOR
   ========================================================= */
const _qPeView = peView;
peView = function () { const v = _qPeView(); v.s *= PE.zoom || 1; v.ox += PE.panX || 0; v.oy += PE.panY || 0; return v; }; // zoomed and moved by the user
const qolPeLocal = (v, s, ux, uy) => { // a point in the box (0..1 across and down) in the shape's own turned frame, in preview pixels
  const a = -(s.rot || 0) * Math.PI / 180, dx = (ux - s.x) * v.bw * v.s, dy = (uy - s.y) * v.bh * v.s; return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)]; };
const qolPeHalf = (v, s) => { const k = s.sc || 1; return [s.w * k * v.bw * v.s / 2, s.h * k * v.bh * v.s / 2]; };
const qolPeShapeAt = (v, ux, uy, sh) => { let best = -1; sh.forEach((s, i) => { if (s.off) return; const [lx, ly] = qolPeLocal(v, s, ux, uy), [hw, hh] = qolPeHalf(v, s); if (Math.abs(lx) <= hw + 4 && Math.abs(ly) <= hh + 4) best = i; }); return best; };
function qolPeUV(e) { const v = peView(), r = v.c.getBoundingClientRect(), mx = (e.clientX - r.left) * v.c.width / r.width, my = (e.clientY - r.top) * v.c.height / r.height; return { v, mx, my, ux: ((mx - v.ox) / v.s - v.x0) / v.bw, uy: ((my - v.oy) / v.s - v.y0) / v.bh }; }
function qolPeHandles(v, s) { // the selected shape's corners, on the canvas
  const cx = v.ox + (v.x0 + s.x * v.bw) * v.s, cy = v.oy + (v.y0 + s.y * v.bh) * v.s, [hw, hh] = qolPeHalf(v, s), r = (s.rot || 0) * Math.PI / 180, c = Math.cos(r), n = Math.sin(r);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({ a, b, x: cx + a * hw * c - b * hh * n, y: cy + a * hw * n + b * hh * c }));
}
const _qPeDown = peDown;
peDown = function (e) {
  const p = peGet(), sh = p.shapes || [], { v, mx, my, ux, uy } = qolPeUV(e), s = sh[PE.selShape];
  if (e.button === 1 || e.button === 2 || (e.button === 0 && PE.space)) { e.preventDefault(); PE.pan = { x: e.clientX, y: e.clientY, px: PE.panX || 0, py: PE.panY || 0, k: v.c.width / v.c.getBoundingClientRect().width, go: true }; v.c.setPointerCapture(e.pointerId); return; } // moving the view
  if (s) for (const h of qolPeHandles(v, s)) if (Math.abs(mx - h.x) < 8 && Math.abs(my - h.y) < 8) { // a corner: resize about the centre
    PE.rs = { w: s.w, h: s.h, ux, uy, sx: s.x, sy: s.y, rot: s.rot || 0, a: h.a, b: h.b }; v.c.setPointerCapture(e.pointerId); return; }
  _qPeDown(e);
  if (!sh.length || qolPeShapeAt(v, ux, uy, sh) < 0) { // empty space: let go of the shape, and a drag from there moves the view
    if (PE.selShape >= 0) { PE.selShape = -1; peSide(); peDraw(); }
    if (!PE.drag && e.button === 0) { PE.pan = { x: e.clientX, y: e.clientY, px: PE.panX || 0, py: PE.panY || 0, k: v.c.width / v.c.getBoundingClientRect().width, go: false }; v.c.setPointerCapture(e.pointerId); }
  }
};
const _qPeMove = peMove;
peMove = function (e) {
  if (PE.pan) { const P = PE.pan, dx = e.clientX - P.x, dy = e.clientY - P.y; if (!P.go && Math.hypot(dx, dy) < 4) return; P.go = true;
    PE.panX = P.px + dx * P.k; PE.panY = P.py + dy * P.k; const c = PE.box.querySelector('.pebig'); if (c) c.style.cursor = 'grabbing'; peDraw(); return; }
  const { v, ux, uy, mx, my } = qolPeUV(e);
  if (PE.rs) { const p = peGet(), s = p.shapes[PE.selShape]; if (!s) return; const r = PE.rs;
    const o = { x: r.sx, y: r.sy, rot: r.rot }, [ax, ay] = qolPeLocal(v, o, r.ux, r.uy), [bx, by] = qolPeLocal(v, o, ux, uy), k = s.sc || 1; // dragged along the shape's own sides, however it's turned
    let w = Math.max(.02, r.w + (bx - ax) * r.a * 2 / (v.bw * v.s * k)), h = Math.max(.02, r.h + (by - ay) * r.b * 2 / (v.bh * v.s * k));
    if (e.shiftKey) { const k = Math.max(w / r.w, h / r.h); w = r.w * k; h = r.h * k; }
    s.w = Math.round(w * 100) / 100; s.h = Math.round(h * 100) / 100; PE.drag = PE.drag || 'resize'; peSet(p); peSideVals(); return; }
  if (!PE.drag) { const sh = peGet().shapes || [], i = qolPeShapeAt(v, ux, uy, sh), s = sh[PE.selShape]; PE.hover = i; v.c.style.cursor = s && qolPeHandles(v, s).some(h => Math.abs(mx - h.x) < 8 && Math.abs(my - h.y) < 8) ? 'nwse-resize' : i >= 0 ? 'move' : ''; peDraw(); return; }
  _qPeMove(e);
  if (!e.altKey && typeof PE.drag === 'object') { // snap to the middle, the edges and the other shapes' centres
    const p = peGet(), s = p.shapes[PE.selShape]; if (!s) return; const tx = [.5, 0, 1], ty = [.5, 0, 1]; p.shapes.forEach((q, i) => { if (i !== PE.selShape) { tx.push(q.x); ty.push(q.y); } });
    const pick = (val, ts) => { let b = null; for (const t of ts) if (Math.abs(t - val) < .025 && (b === null || Math.abs(t - val) < Math.abs(b - val))) b = t; return b; };
    const gx = pick(s.x, tx), gy = pick(s.y, ty); PE.guide = [gx, gy]; if (gx !== null) s.x = gx; if (gy !== null) s.y = gy; if (gx !== null || gy !== null) { peSet(p); peSideVals(); } }
};
const _qPeDraw = peDraw;
peDraw = function () {
  _qPeDraw(); if (!PE.box) return; const p = peGet(), sh = p.shapes || [], v = peView(), x = v.c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0);
  const hv = sh[PE.hover]; if (hv && PE.hover !== PE.selShape && !PE.drag) { const H = qolPeHandles(v, hv); x.strokeStyle = 'rgba(140,200,255,.9)'; x.setLineDash([4, 3]); x.lineWidth = 1.5; x.beginPath(); H.forEach((h, i) => i ? x.lineTo(h.x, h.y) : x.moveTo(h.x, h.y)); x.closePath(); x.stroke(); x.setLineDash([]); }
  const s = sh[PE.selShape]; if (s) { x.fillStyle = '#fff'; x.strokeStyle = '#ff4d6a'; x.lineWidth = 1.5; for (const h of qolPeHandles(v, s)) { x.fillRect(h.x - 4, h.y - 4, 8, 8); x.strokeRect(h.x - 4, h.y - 4, 8, 8); } }
  if (PE.drag && PE.guide) { x.strokeStyle = '#ff3bd5'; x.lineWidth = 1; const [gx, gy] = PE.guide; if (gx !== null) { const X = v.ox + (v.x0 + gx * v.bw) * v.s; x.beginPath(); x.moveTo(X, 0); x.lineTo(X, v.c.height); x.stroke(); } if (gy !== null) { const Y = v.oy + (v.y0 + gy * v.bh) * v.s; x.beginPath(); x.moveTo(0, Y); x.lineTo(v.c.width, Y); x.stroke(); } }
  if ((PE.zoom || 1) !== 1) { const y = v.c.height - 28; x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(8, y, 50, 20); x.fillStyle = '#fff'; x.font = '600 11px system-ui'; x.textAlign = 'center'; x.fillText(Math.round(PE.zoom * 100) + '%', 33, y + 14); x.textAlign = 'left'; }
};
const _qOpenPE = openPropEditor;
openPropEditor = function (kind) {
  PE.panX = PE.panY = 0; PE.pan = null; PE.space = false;
  _qOpenPE(kind); const big = PE.box && PE.box.querySelector('.pebig'); if (!big) return;
  big.onpointerup = () => { PE.drag = null; PE.rs = null; PE.guide = null; if (PE.pan) { PE.pan = null; big.style.cursor = ''; } peDraw(); };
  big.addEventListener('contextmenu', e => e.preventDefault()); // right-drag moves the view
  PE.box.addEventListener('keydown', e => { if (e.code === 'Space' && !/^(input|textarea|select)$/i.test(e.target.tagName)) { PE.space = true; big.style.cursor = 'grab'; e.preventDefault(); } });
  PE.box.addEventListener('keyup', e => { if (e.code === 'Space') { PE.space = false; big.style.cursor = ''; } });
  big.onpointerleave = () => { PE.hover = -1; if (!PE.drag) peDraw(); };
  big.addEventListener('wheel', e => { e.preventDefault(); // zoom toward the cursor
    const r = big.getBoundingClientRect(), mx = (e.clientX - r.left) * big.width / r.width, my = (e.clientY - r.top) * big.height / r.height, v = peView(), z0 = PE.zoom || 1, z1 = clamp(z0 * Math.exp(-e.deltaY * .0015), .5, 6), k = z1 / z0;
    PE.panX = (PE.panX || 0) + (mx - v.ox) * (1 - k); PE.panY = (PE.panY || 0) + (my - v.oy) * (1 - k); PE.zoom = z1; peDraw(); }, { passive: false });
  big.ondblclick = () => { PE.zoom = 1; PE.panX = PE.panY = 0; peDraw(); };
  qolScrubInit(PE.box);
  const hint = PE.box.querySelector('.pemain .edhint'); if (hint) hint.innerHTML = 'Drag a shape to move it (it snaps to the middle and to the others; <kbd>Alt</kbd> frees it), its corners to resize (<kbd>Shift</kbd> keeps the shape). Wheel zooms, drag empty space (or right-drag, or Space+drag) to move the view, double-click resets. <kbd>Arrows</kbd> nudge · <kbd>[</kbd> <kbd>]</kbd> size · <kbd>Q</kbd> turn · <kbd>Ctrl+D</kbd> duplicate · <kbd>Tab</kbd> next shape · <kbd>Ctrl+Z</kbd> undo';
};
const _qPeKey = peKey;
peKey = function (e) {
  if (!e.__pe && PE.active && PE.box && PE.box.isConnected && e.type === 'keydown' && !document.querySelector('.edmodal,#matEd')) {
    const t = e.target, tag = (t.tagName || '').toLowerCase(), k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    const typing = tag === 'textarea' || (tag === 'input' && /^(text|search|number)$/.test(t.type));
    const p = peGet(), sh = p.shapes || [], s = sh[PE.selShape];
    if (!typing && sh.length) {
      const edit = f => { e.preventDefault(); e.__pe = true; f(); peSet(p); peSide(); return true; };
      if (k === 'tab') return edit(() => { PE.selShape = (PE.selShape + (e.shiftKey ? -1 : 1) + sh.length) % sh.length; });
      if (s && k.startsWith('arrow')) { const st = e.shiftKey ? .05 : .01; return edit(() => { s.x = Math.round((s.x + (k === 'arrowleft' ? -st : k === 'arrowright' ? st : 0)) * 100) / 100; s.y = Math.round((s.y + (k === 'arrowup' ? -st : k === 'arrowdown' ? st : 0)) * 100) / 100; }); }
      if (s && (k === '[' || k === ']')) { const f = k === ']' ? 1.1 : 1 / 1.1; return edit(() => { s.w = Math.max(.02, Math.round(s.w * f * 100) / 100); s.h = Math.max(.02, Math.round(s.h * f * 100) / 100); }); }
      if (s && k === 'q') return edit(() => { s.rot = ((((s.rot || 0) + (e.shiftKey ? -15 : 15)) + 180) % 360 + 360) % 360 - 180; });
      if (s && mod && k === 'd') return edit(() => { sh.splice(PE.selShape + 1, 0, { ...edClone(s), x: s.x + .04, y: s.y + .04 }); PE.selShape++; });
    }
  }
  return _qPeKey(e);
};

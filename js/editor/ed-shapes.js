/* =========================================================
   EDITOR: VECTOR DRAWING TOOLS
   Freehand, straight segments / polyline, polygon, rectangle, ellipse and a Bezier pen. Everything stays vector data
   (see 09c-vector-shapes): points can be dragged, Bezier handles pulled, widths and materials changed at any time.
   A shape's "use" decides what it becomes in the game: floor paint (roads, sidewalks, paths, floor regions),
   decoration, a decoration mask, a solid wall, or water (pools; an open path makes a river).
   ========================================================= */
const SHAPE_TOOLS = [['s-free', 'Freehand', 'F'], ['s-line', 'Polyline', 'I'], ['s-poly', 'Polygon', 'K'], ['s-rect', 'Rectangle', 'R'], ['s-ellipse', 'Ellipse', 'O'], ['s-bez', 'Bezier pen', 'J']];
const SHAPE_USES = { floor: 'Floor paint', decor: 'Decoration (on top)', mask: 'Decoration mask', wall: 'Solid wall', water: 'Water' };
const SHAPE_ICON = { 's-free': 'M4 16c2-6 4 0 6-4s3-7 6-5 2 6 4 6', 's-line': 'M4 18l6-8 5 4 5-8', 's-poly': 'M5 5l12 2 2 10-9 3-6-7z', 's-rect': 'M4 6h16v12H4z', 's-ellipse': 'M12 6c5 0 8 3 8 6s-3 6-8 6-8-3-8-6 3-6 8-6z', 's-bez': 'M4 18C8 4 16 20 20 6M4 18l3-3M20 6l-3 1' };
for (const k in SHAPE_ICON) ED_ICON[k] = SHAPE_ICON[k];
ED.shapeDef = ED.shapeDef || { use: 'floor', fill: 'concrete', stroke: null, w: 24, curve: 'smooth' }; // what new shapes start as
const edT = () => performance.now() / 1000; // the editor has no game clock running: animate previews on wall time
/* ---- drawing them in the editor view ---- */
function edDrawShapes(x, layer) { // layer: 'floor' (under objects) or 'top' (decoration, walls, water)
  for (const s of ED.shapes || []) {
    if (s._hide) continue; const use = s.use || 'floor', top = use === 'decor' || use === 'wall' || use === 'water';
    if ((layer === 'top') !== top) continue;
    try { if (use === 'water') { x.save(); vecTrace(x, vecOutline(s), true); x.fillStyle = s.color || '#4aa3df'; x.globalAlpha = .85; x.fill(); x.restore(); } else drawVecShape(x, use === 'mask' && !s.fill ? { ...s, fill: MASK_FILL } : s, edT()); } catch (e) {}
    if (use === 'wall') { x.save(); vecTrace(x, vecOutline(s), true); x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 1.2 / ED.z; x.stroke(); x.restore(); }
  }
}
function edShapeOverlay(x, px) { // the selected shapes' points and Bezier handles, and the shape being drawn
  for (const sel of ED.sel) { if (sel.t !== 's') continue; const s = ED.shapes[sel.i]; if (!s) continue;
    x.save(); x.strokeStyle = '#ff4d6a'; x.lineWidth = px * 2; vecTrace(x, vecFlat(s), !vecOpen(s)); x.stroke();
    if (vecOpen(s)) { x.setLineDash([4 * px, 4 * px]); x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = px; vecTrace(x, vecOutline(s), true); x.stroke(); x.setLineDash([]); }
    x.restore(); }
  if (ED.sel.length === 1 && ED.sel[0].t === 's') { const s = ED.shapes[ED.sel[0].i], H = s && edShapeHandles(s); if (H) for (const h of H) { // its points (white) and Bezier handles (blue)
      if (h.k === 'shand') { const n = s.nodes[h.i]; x.strokeStyle = '#7fd4ff'; x.lineWidth = px; x.beginPath(); x.moveTo(n[0], n[1]); x.lineTo(h.x, h.y); x.stroke(); x.fillStyle = '#7fd4ff'; x.beginPath(); x.arc(h.x, h.y, 3.5 * px, 0, TAU); x.fill(); }
      else { x.fillStyle = '#fff'; x.strokeStyle = '#ff4d6a'; x.lineWidth = px * 1.5; x.beginPath(); x.arc(h.x, h.y, 5 * px, 0, TAU); x.fill(); x.stroke(); } } }
  const d = ED.sdraft; if (!d) return;
  const mw = ED.mouse ? edW(...ED.mouse) : null;
  x.save(); x.lineWidth = px * 1.5; x.strokeStyle = '#fff'; x.setLineDash([5 * px, 4 * px]);
  if (d.kind === 'rect' || d.kind === 'ellipse') { const s = edDraftBoxShape(d); if (s) { x.globalAlpha = .5; drawVecShape(x, s, edT()); x.globalAlpha = 1; vecTrace(x, vecFlat(s), true); x.stroke(); } }
  else { const pts = d.nodes.map(n => [n[0], n[1]]), all = mw && !d.free ? [...pts, mw] : pts, tmp = { ...d, nodes: all.map((p, k) => d.nodes[k] ? d.nodes[k] : [p[0], p[1], 0, 0, 0, 0]) };
    if (all.length > 1) { x.globalAlpha = .45; try { drawVecShape(x, tmp, edT()); } catch (e) {} x.globalAlpha = 1; vecTrace(x, vecFlat(tmp), false); x.stroke(); }
    x.setLineDash([]); for (const n of d.nodes) { x.fillStyle = '#fff'; x.beginPath(); x.arc(n[0], n[1], 4 * px, 0, TAU); x.fill(); if (n[4] || n[5]) { x.strokeStyle = '#7fd4ff'; x.beginPath(); x.moveTo(n[0] + n[2], n[1] + n[3]); x.lineTo(n[0] + n[4], n[1] + n[5]); x.stroke(); } } }
  x.restore();
}
/* ---- making them ---- */
const edShapeTool = t => t && t.startsWith('s-');
function edDraftBoxShape(d) { const x0 = Math.min(d.x0, d.x1), y0 = Math.min(d.y0, d.y1), w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0); if (w < 2 || h < 2) return null; return { kind: d.kind, x: x0, y: y0, w, h, ...edNewShapeBase(true) }; }
function edNewShapeBase(closed) { const D = ED.shapeDef; return { use: D.use, fill: D.fill, stroke: D.stroke || undefined, w: D.w, curve: D.curve, closed, soft: D.use === 'floor' ? 0 : undefined }; }
function edShapeDown(e, sx, sy, wx, wy, dbl) { // returns true if it handled the click
  if (!edShapeTool(ED.tool)) return false;
  const t = ED.tool, P = [edSnap(wx), edSnap(wy)];
  if (t === 's-rect' || t === 's-ellipse') { ED.sdraft = { kind: t === 's-rect' ? 'rect' : 'ellipse', x0: P[0], y0: P[1], x1: P[0], y1: P[1], box: true }; ED.drag = { k: 'sbox' }; return true; }
  if (t === 's-free') { ED.sdraft = { kind: 'path', free: true, nodes: [[wx, wy, 0, 0, 0, 0]], ...edNewShapeBase(false), curve: 'smooth' }; ED.drag = { k: 'sfree' }; return true; }
  const d = ED.sdraft || (ED.sdraft = { kind: t === 's-poly' ? 'poly' : 'path', nodes: [], ...edNewShapeBase(t === 's-poly'), curve: t === 's-bez' ? 'bezier' : t === 's-poly' ? ED.shapeDef.curve : ED.shapeDef.curve === 'smooth' ? 'smooth' : 'line' });
  if (d.nodes.length > 2 && d.kind === 'poly' && Math.hypot(d.nodes[0][0] - wx, d.nodes[0][1] - wy) < 10 / ED.z + 3) { edFinishShape(); return true; } // back to the first point: close it
  if (dbl && d.nodes.length > 1) { edFinishShape(); return true; }
  d.nodes.push([P[0], P[1], 0, 0, 0, 0]);
  if (t === 's-bez') ED.drag = { k: 'sbezh', n: d.nodes[d.nodes.length - 1] }; // drag out from a new point to pull its handles
  return true;
}
function edShapeMove(e, wx, wy) {
  const d = ED.drag; if (!d) return false;
  if (d.k === 'sbox' && ED.sdraft) { let X = edSnap(wx), Y = edSnap(wy); if (e.shiftKey) { const s = Math.max(Math.abs(X - ED.sdraft.x0), Math.abs(Y - ED.sdraft.y0)); X = ED.sdraft.x0 + Math.sign(X - ED.sdraft.x0 || 1) * s; Y = ED.sdraft.y0 + Math.sign(Y - ED.sdraft.y0 || 1) * s; } ED.sdraft.x1 = X; ED.sdraft.y1 = Y; return true; } // Shift: square / circle
  if (d.k === 'sfree' && ED.sdraft) { const L = ED.sdraft.nodes[ED.sdraft.nodes.length - 1]; if (Math.hypot(L[0] - wx, L[1] - wy) * ED.z > 7) ED.sdraft.nodes.push([wx, wy, 0, 0, 0, 0]); return true; }
  if (d.k === 'sbezh') { const n = d.n, hx = wx - n[0], hy = wy - n[1]; n[4] = hx; n[5] = hy; n[2] = e.altKey ? n[2] : -hx; n[3] = e.altKey ? n[3] : -hy; return true; } // Alt: a cusp (only the out handle moves)
  if (d.k === 'snode') { const s = d.s, n = s.nodes[d.i]; n[0] = edSnap(wx); n[1] = edSnap(wy); edShapeDirty(s); return true; }
  if (d.k === 'shand') { const s = d.s, n = s.nodes[d.i], hx = wx - n[0], hy = wy - n[1], [a, b] = d.out ? [4, 5] : [2, 3], [c, dd] = d.out ? [2, 3] : [4, 5]; n[a] = hx; n[b] = hy; if (!e.altKey) { const L = Math.hypot(n[c], n[dd]) || Math.hypot(hx, hy); const k = L / (Math.hypot(hx, hy) || 1); n[c] = -hx * k; n[dd] = -hy * k; } edShapeDirty(s); return true; } // handles stay opposite unless Alt breaks them
  return false;
}
function edShapeUp() {
  const d = ED.drag; if (!d) return false;
  if (d.k === 'sbox') { ED.drag = null; const s = ED.sdraft && edDraftBoxShape(ED.sdraft); ED.sdraft = null; if (s) edAddShape(s); return true; }
  if (d.k === 'sfree') { ED.drag = null; const sd = ED.sdraft; ED.sdraft = null; if (sd && sd.nodes.length > 2) { sd.nodes = edSimplify(sd.nodes.map(n => [n[0], n[1]]), 2.5 / Math.max(.5, ED.z) + 1).map(p => [p[0], p[1], 0, 0, 0, 0]); delete sd.free; edAddShape(sd); } return true; }
  if (d.k === 'sbezh') { ED.drag = null; return true; }
  if (d.k === 'snode' || d.k === 'shand') { ED.drag = null; edDirty(); edShapeDirty(d.s, true); return true; }
  return false;
}
function edFinishShape() { const d = ED.sdraft; ED.sdraft = null; if (!d || d.box) return; const need = d.kind === 'poly' ? 3 : 2; if (d.nodes.length < need) return; edAddShape(d); }
function edAddShape(s) { edPush(); (ED.shapes = ED.shapes || []).push(s); ED.sel = [{ t: 's', i: ED.shapes.length - 1 }]; edShapeDirty(s, true); if (!ED.keepTool) edTool('select'); edPanel(); }
function edShapeDirty(s, now) { if ((s.use || 'floor') !== 'floor' && s.use !== 'mask') return; } // floor shapes are drawn live in the editor; nothing is baked until the map loads
function edSimplify(P, tol) { // Ramer-Douglas-Peucker: a freehand stroke keeps its shape with far fewer points
  if (P.length < 3) return P; const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
  const st = [[0, P.length - 1]];
  while (st.length) { const [a, b] = st.pop(); let md = 0, mi = -1; const [ax, ay] = P[a], [bx, by] = P[b], L = Math.hypot(bx - ax, by - ay) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (ay - P[i][1]) - (ax - P[i][0]) * (by - ay)) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); } }
  return P.filter((_, i) => keep[i]);
}
/* ---- picking and editing them ---- */
function edShapeHit(wx, wy) {
  for (let i = (ED.shapes || []).length - 1; i >= 0; i--) { const s = ED.shapes[i]; if (s._hide || s._lock) continue;
    const P = vecOutline(s); if (P.length > 2 && pointInPoly(P, wx, wy)) return { t: 's', i };
    if (vecOpen(s)) { const C = vecFlat(s); for (let k = 1; k < C.length; k++) { const [ax, ay] = C[k - 1], [bx, by] = C[k], L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1, u = clamp(((wx - ax) * (bx - ax) + (wy - ay) * (by - ay)) / L2, 0, 1); if (Math.hypot(wx - ax - u * (bx - ax), wy - ay - u * (by - ay)) < (s.w || 12) / 2 + 5 / ED.z) return { t: 's', i }; } } }
  return null;
}
function edShapeHandles(s) { // node points (and Bezier handles) of one selected shape
  if (!s.nodes) return null; const out = [];
  s.nodes.forEach((n, i) => { out.push({ k: 'snode', i, x: n[0], y: n[1] }); if (s.curve === 'bezier') { out.push({ k: 'shand', i, out: false, x: n[0] + n[2], y: n[1] + n[3] }, { k: 'shand', i, out: true, x: n[0] + n[4], y: n[1] + n[5] }); } });
  return out;
}
function edShapeHandleDown(e, wx, wy) { // grabbing a point or handle of the selected shape
  if (ED.sel.length !== 1 || ED.sel[0].t !== 's') return false; const s = ED.shapes[ED.sel[0].i]; const H = s && edShapeHandles(s); if (!H) return false;
  for (const h of H) if (Math.abs(wx - h.x) < 8 / ED.z && Math.abs(wy - h.y) < 8 / ED.z) {
    if (h.k === 'snode' && (e.altKey || e.button === 2)) { if (s.nodes.length > (s.closed === false || s.kind === 'path' ? 2 : 3)) { edPush(); s.nodes.splice(h.i, 1); } return true; } // Alt-click: remove the point
    edPush(); ED.drag = h.k === 'snode' ? { k: 'snode', s, i: h.i } : { k: 'shand', s, i: h.i, out: h.out }; return true; }
  return false;
}
function edShapeAddPoint(s, wx, wy) { // double-click on its line: a new point there
  if (!s.nodes) return false; const C = s.nodes, n = C.length, segs = vecOpen(s) ? n - 1 : n; let best = -1, bd = 1e9;
  for (let i = 0; i < segs; i++) { const [ax, ay] = C[i], [bx, by] = C[(i + 1) % n], L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1, u = clamp(((wx - ax) * (bx - ax) + (wy - ay) * (by - ay)) / L2, 0, 1), d = Math.hypot(wx - ax - u * (bx - ax), wy - ay - u * (by - ay)); if (d < bd) { bd = d; best = i; } }
  if (best < 0 || bd > 40 / ED.z + 10) return false; edPush(); C.splice(best + 1, 0, [edSnap(wx), edSnap(wy), 0, 0, 0, 0]); ED.drag = { k: 'snode', s, i: best + 1 }; return true;
}
function edShapeToNodes(s) { // a rectangle or ellipse becomes free points (so it can be bent)
  if (s.nodes) return; const P = s.kind === 'rect' ? vecFlat(s) : vecFlat(s).filter((_, k, a) => k % Math.max(1, Math.round(a.length / 12)) === 0);
  const was = s.kind; s.nodes = P.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, 0, 0, 0, 0]); s.kind = 'poly'; s.closed = true; s.curve = was === 'rect' ? 'line' : 'smooth'; delete s.x; delete s.y; delete s.h; delete s.rot; s.w = ED.shapeDef.w;
}
function edShapeMoveBy(s, dx, dy, from) { const f = from || s; if (f.nodes) s.nodes = f.nodes.map(n => [n[0] + dx, n[1] + dy, ...n.slice(2)]); else { s.x = f.x + dx; s.y = f.y + dy; } }
function edShapeXf(s, s0, tp, t) { // the transform gizmo on a shape: points move/rotate/scale about the selection centre; handles turn and scale with them
  if (s0.nodes) { const a = t.rot * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), H = (hx, hy) => { const u = hx * t.kx, v = hy * t.ky; return [u * c - v * sn, u * sn + v * c]; };
    s.nodes = s0.nodes.map(n => { const [px, py] = tp(n[0], n[1]), [ix, iy] = H(n[2], n[3]), [ox, oy] = H(n[4], n[5]); return [px, py, ix, iy, ox, oy].map(v => Math.round(v * 10) / 10); });
    if (vecOpen(s) && (t.kx !== 1 || t.ky !== 1)) s.w = Math.max(1, Math.round(s0.w * (t.kx + t.ky) / 2)); return; }
  const [cx, cy] = tp(s0.x + s0.w / 2, s0.y + s0.h / 2), r0 = (s0.rot || 0) * Math.PI / 180, lc = Math.abs(Math.cos(r0)), ls = Math.abs(Math.sin(r0));
  s.w = Math.max(2, Math.round(s0.w * (lc * t.kx + ls * t.ky))); s.h = Math.max(2, Math.round(s0.h * (ls * t.kx + lc * t.ky))); s.x = cx - s.w / 2; s.y = cy - s.h / 2; s.rot = (((s0.rot || 0) + t.rot) % 360 + 360) % 360; if (!s.rot) delete s.rot;
}
/* ---- the properties panel for a shape ---- */
function edShapePanel(p, s) {
  const mats = edMaterialList(), mopt = cur => `<option value="">None</option>${mats.map(([id, m]) => `<option value="${id}" ${id === cur ? 'selected' : ''}>${m.name || id}</option>`).join('')}`;
  const nodes = s.nodes ? s.nodes.length : 0, open = vecOpen(s);
  p.innerHTML = `<h4>Shape <small>(${s.kind}${nodes ? ` · ${nodes} points` : ''})</small></h4>
    <label>Use <select class="shuse">${Object.entries(SHAPE_USES).map(([k, n]) => `<option value="${k}" ${k === (s.use || 'floor') ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    ${s.use === 'water' ? `<label>Water color <input type="color" class="shwc" value="${edHex(s.color || '#4aa3df')}"></label>` : `<label>Fill <select class="shfill">${mopt(typeof s.fill === 'string' ? s.fill : '')}</select></label><button class="edghost shmatEd">Edit material…</button>
    <label>Outline <select class="shstroke">${mopt(typeof s.stroke === 'string' ? s.stroke : '')}</select></label>`}
    ${open ? `<label>Width <input type="range" class="shw" min="2" max="240" value="${s.w || 12}"><output>${s.w || 12}</output></label>` : ''}
    ${s.nodes ? `<label>Curve <select class="shcurve">${[['line', 'Straight segments'], ['smooth', 'Smooth curve'], ['bezier', 'Bezier (drag handles)']].map(([k, n]) => `<option value="${k}" ${k === (s.curve || 'line') ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="edck"><input type="checkbox" class="shclosed" ${!open ? 'checked' : ''} ${s.kind === 'path' && !s.closed ? '' : ''}> Closed shape</label>` : `<div class="edgrid2"><label>Rotation °<input type="number" class="shrot" value="${s.rot || 0}"></label></div><button class="edghost shbend">Convert to editable points</button>`}
    ${(s.use || 'floor') === 'floor' && !open ? `<label>Soft edge <input type="range" class="shsoft" min="0" max="12" value="${s.soft || 0}"><output>${s.soft || 0}</output></label>` : ''}
    <p class="edmuted">${s.nodes ? 'Drag a point to move it, double-click the line to add one, Alt-click a point to remove it.' + (s.curve === 'bezier' ? ' Drag the blue handles to bend; Alt moves one handle alone.' : '') : 'Use the gizmo to move, turn and resize it.'}</p>
    <div class="edbtns"><button data-a="dup">Duplicate</button><button data-a="del">Delete</button><button class="shfront">To front</button><button class="shback">To back</button><button class="shdef">Use as default</button></div>`;
  const ch = (sel, f) => { const el = p.querySelector(sel); if (el) el.onchange = () => { edPush(); f(el); edPanel(); }; };
  ch('.shuse', el => { s.use = el.value; if (s.use === 'water' && !s.color) s.color = '#4aa3df'; });
  ch('.shfill', el => { s.fill = el.value || undefined; }); ch('.shstroke', el => { s.stroke = el.value || undefined; });
  ch('.shwc', el => { s.color = el.value; }); ch('.shcurve', el => { s.curve = el.value; });
  ch('.shclosed', el => { s.closed = el.checked; s.kind = el.checked ? 'poly' : 'path'; }); ch('.shrot', el => { s.rot = +el.value || 0; });
  const rng = (sel, k) => { const r = p.querySelector(sel); if (!r) return; r.oninput = () => { if (!r._p) { edPush(); r._p = true; } s[k] = +r.value; r.nextElementSibling.textContent = r.value; }; r.onchange = () => { r._p = false; edDirty(); }; };
  rng('.shw', 'w'); rng('.shsoft', 'soft');
  const b = p.querySelector('.shbend'); if (b) b.onclick = () => { edPush(); edShapeToNodes(s); edPanel(); };
  const me = p.querySelector('.shmatEd'); if (me) me.onclick = () => openMaterialEditor(typeof s.fill === 'string' ? s.fill : null, id => { edPush(); s.fill = id; edPanel(); });
  p.querySelector('.shfront').onclick = () => { edPush(); const i = ED.shapes.indexOf(s); ED.shapes.splice(i, 1); ED.shapes.push(s); ED.sel = [{ t: 's', i: ED.shapes.length - 1 }]; edPanel(); };
  p.querySelector('.shback').onclick = () => { edPush(); const i = ED.shapes.indexOf(s); ED.shapes.splice(i, 1); ED.shapes.unshift(s); ED.sel = [{ t: 's', i: 0 }]; edPanel(); };
  p.querySelector('.shdef').onclick = () => { Object.assign(ED.shapeDef, { use: s.use || 'floor', fill: s.fill, stroke: s.stroke, w: s.w || ED.shapeDef.w, curve: s.curve || ED.shapeDef.curve }); edStatus('New shapes will look like this one'); edShapeSidebar(); };
  edPanelBtns(p);
}
/* ---- the left "Shapes" tab ---- */
function edShapeSidebar() {
  const el = ED.root && ED.root.querySelector('.edlt[data-lt="shapes"]'); if (!el) return;
  const D = ED.shapeDef, mats = edMaterialList();
  el.innerHTML = `<p class="edhint">Draw shapes that stay editable: roads, sidewalks, floor regions, rivers, pools, walls, decorations. Pick what it becomes, then a tool. <kbd>Enter</kbd> or a double-click finishes a line; click the first point to close a polygon.</p>
    <div class="edshtools">${SHAPE_TOOLS.map(([t, n, k]) => `<button data-tool="${t}" class="edtool ${ED.tool === t ? 'on' : ''}" title="${n} (Shift+${k})">${edSvg(t)}<span>${n}</span></button>`).join('')}</div>
    <div class="edrow"><label>Becomes <select class="sduse">${Object.entries(SHAPE_USES).map(([k, n]) => `<option value="${k}" ${k === D.use ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <div class="edrow"><label>Material <select class="sdfill">${mats.map(([id, m]) => `<option value="${id}" ${id === D.fill ? 'selected' : ''}>${m.name || id}</option>`).join('')}</select></label></div>
    <div class="edrow"><label>Line width <input type="number" class="sdw" min="2" max="240" value="${D.w}"></label><label>Curve <select class="sdcurve">${[['line', 'Straight'], ['smooth', 'Smooth']].map(([k, n]) => `<option value="${k}" ${k === D.curve ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <label class="edck"><input type="checkbox" class="sdkeep" ${ED.keepTool ? 'checked' : ''}> Keep the tool after each shape</label>
    <div class="edbtns"><button class="sdmat">Materials & effects…</button></div>`;
  el.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => edTool(b.dataset.tool));
  el.querySelector('.sduse').onchange = e => { D.use = e.target.value; };
  el.querySelector('.sdfill').onchange = e => { D.fill = e.target.value; };
  el.querySelector('.sdw').onchange = e => { D.w = clamp(+e.target.value || 24, 2, 240); };
  el.querySelector('.sdcurve').onchange = e => { D.curve = e.target.value; };
  el.querySelector('.sdkeep').onchange = e => { ED.keepTool = e.target.checked; };
  el.querySelector('.sdmat').onclick = () => openMaterialEditor(D.fill, id => { D.fill = id; edShapeSidebar(); });
}

/* =========================================================
   EDITOR: BUILDING LAYER (loads last, wraps ed-core / ed-qol)
   - Random prop brush (J): paints a random mix of the props you pick inside the brush, never too close to each other or
     to what's already there; Alt+drag clears them again.
   - Room (R): drag a box, get four walls with a doorway (and a floor, if you pick one).
   - Wall line (I): click from corner to corner; any angle (Shift: 45° steps); double-click, Enter or the first point ends it.
   - Doorway (D): click a wall to cut a gap in it.
   - The whole floor can be one material (Ground › Whole floor), and walls and blocks can wear a material too.
   - Pictures in dropdowns: materials, props, creatures and maps (DD_THUMBS, 03c-dropdown).
   - A redrawn move / rotate / scale gizmo.
   - Prop editor: a smaller "Before" you can resize, and Shift+click to pick several parts and change them all at once.
   ========================================================= */
const EB = {
  brush: (() => { const d = { r: 70, gap: 30, rate: 2, set: ['Tree', 'Bush', 'Rock'] }; try { return { ...d, ...JSON.parse(localStorage.getItem('snakeEdBrush')) }; } catch (e) { return d; } })(),
  room: { door: 's', doorW: 80, floor: '' }, wl: null, doorHover: null,
};
const ebSaveBrush = () => { try { localStorage.setItem('snakeEdBrush', JSON.stringify(EB.brush)); } catch (e) {} };
ED_TOOLS.splice(ED_TOOLS.findIndex(t => t[0] === 'pan'), 0, ['scatter', 'Prop brush', 'J'], ['room', 'Room', 'R'], ['wline', 'Wall line', 'I'], ['door', 'Doorway', 'D']);
Object.assign(ED_ICON, {
  scatter: 'M5 19l3-3M12 4a3 3 0 100 6 3 3 0 100-6zM17 12a2.5 2.5 0 100 5 2.5 2.5 0 100-5zM7 9a2 2 0 100 4 2 2 0 100-4z',
  room: 'M3 3h18v18H3zM3 3v18M10 21v-5h4v5',
  wline: 'M4 18L10 6l6 10 4-8M4 18h.01M10 6h.01M16 16h.01M20 8h.01',
  door: 'M3 12h6M15 12h6M9 8v8M15 8v8M12 5v3M12 16v3',
});
Object.assign(ED_KEYS, {
  scatter: [['Drag', 'paint random props'], ['Alt+drag', 'clear them'], ['[ ]', 'brush size'], ['Shift+[ ]', 'spacing']],
  room: [['Drag', 'draw a room'], ['Panel', 'doorway side and floor']],
  wline: [['Click', 'add a corner'], ['Shift', '45° steps'], ['Dbl-click / Enter', 'finish'], ['Click the first point', 'close the loop'], ['Esc', 'cancel']],
  door: [['Click a wall', 'cut a doorway'], ['[ ]', 'doorway width']],
});
const ebPropByName = n => ED_PROPS.find(p => p[0] === n);
const ebWallLike = o => o && o.t === 'r' && !o.poly && ['wall', 'fence', 'hedge', 'glass', 'building', 'bwall', 'barrier'].includes(o.kind);
const ebSize = o => o.t === 'r' ? Math.max(o.w, o.h) / 2 : o.r;
const ebCentre = o => o.t === 'r' ? [o.x + o.w / 2, o.y + o.h / 2] : [o.x, o.y];

/* ---- random prop brush ---- */
function ebScatter(wx, wy, erase) { // one dab of the brush
  const B0 = EB.brush, R0 = B0.r, set = B0.set.map(ebPropByName).filter(Boolean);
  if (erase) { const kinds = new Set(set.map(p => p[1])); let n = 0; for (let i = ED.obs.length - 1; i >= 0; i--) { const o = ED.obs[i], [cx, cy] = ebCentre(o); if (o._lock || (kinds.size && !kinds.has(o.kind))) continue; if (Math.hypot(cx - wx, cy - wy) < R0) { ED.obs.splice(i, 1); n++; } } if (n) ED.sel = []; return -n; }
  if (!set.length) return 0;
  let placed = 0;
  for (let tries = 0; tries < 14 && placed < B0.rate; tries++) {
    const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * R0, x = wx + Math.cos(a) * d, y = wy + Math.sin(a) * d, p = pick(set), s = p[2] === 'r' ? Math.max(p[3], p[4]) / 2 : p[3];
    if (x < B + s || y < B + s || x > W - B - s || y > H - B - s) continue;
    const clear = ED.obs.every(o => { const [cx, cy] = ebCentre(o), os = ebSize(o), d2 = Math.hypot(cx - x, cy - y);
      if (ebWallLike(o) || o.kind === 'building') { const b = edBox(o); return x < b[0] - s - 4 || x > b[2] + s + 4 || y < b[1] - s - 4 || y > b[3] + s + 4; } // never into a wall or a building
      return d2 >= B0.gap + (s + os) * .6; }); // never too close to anything already there
    if (!clear) continue;
    qolPlace(p, x, y, true); placed++;
  }
  return placed;
}
function ebBrushPanel(p) { // the brush's settings, and which props it mixes
  const B0 = EB.brush, names = [...new Set(ED_PROPS.filter(q => !q.customProp || true).map(q => q[0]))];
  const box = document.createElement('div'); box.className = 'ebpanel';
  box.innerHTML = `<h4>Random prop brush</h4><p class="edmuted">Drag on the map: it drops a random mix of the props below inside the brush, spaced out, never into walls. <kbd>Alt</kbd>+drag clears them.</p>
    <label class="edfield">Brush size <input type="range" class="ebr" min="20" max="260" step="5" value="${B0.r}"><output>${B0.r}</output></label>
    <label class="edfield">Spacing <input type="range" class="ebg" min="0" max="160" step="2" value="${B0.gap}"><output>${B0.gap}</output></label>
    <label class="edfield">Density <input type="range" class="ebd" min="1" max="6" step="1" value="${B0.rate}"><output>${B0.rate}</output></label>
    <h4>Props in the mix <small>${B0.set.length} picked</small></h4><input class="edsearch ebq" placeholder="Search props…">
    <div class="ebset">${names.map(n => `<button class="${B0.set.includes(n) ? 'on' : ''}" data-n="${n.replace(/"/g, '&quot;')}" title="${n}"><canvas width="44" height="44"></canvas><span>${n}</span></button>`).join('')}</div>
    <div class="edbtns"><button class="ebnat">Nature</button><button class="ebstreet">Street</button><button class="ebnone">None</button></div>`;
  p.prepend(box);
  box.querySelectorAll('.ebset button').forEach(b => { const q = ebPropByName(b.dataset.n); if (q) try { drawPreview(b.querySelector('canvas'), edSample(q, 0, 0)); } catch (e) {}
    b.onclick = () => { const n = b.dataset.n, i = B0.set.indexOf(n); if (i >= 0) B0.set.splice(i, 1); else B0.set.push(n); b.classList.toggle('on', i < 0); box.querySelector('h4 small').textContent = B0.set.length + ' picked'; ebSaveBrush(); }; });
  const rng = (cls, k) => { const r = box.querySelector(cls); r.oninput = () => { B0[k] = +r.value; r.nextElementSibling.textContent = r.value; ebSaveBrush(); }; };
  rng('.ebr', 'r'); rng('.ebg', 'gap'); rng('.ebd', 'rate');
  box.querySelector('.ebq').oninput = e => { const q = e.target.value.toLowerCase(); box.querySelectorAll('.ebset button').forEach(b => { b.style.display = b.dataset.n.toLowerCase().includes(q) ? '' : 'none'; }); };
  const setTo = list => { B0.set = list.filter(ebPropByName); ebSaveBrush(); edPanel(); };
  box.querySelector('.ebnat').onclick = () => setTo(ED_PROPS.filter(q => qolOrganic.has(q[1])).map(q => q[0]));
  box.querySelector('.ebstreet').onclick = () => setTo(ED_PROPS.filter(q => ['bench', 'bin', 'lamp', 'detail', 'barrier', 'crate'].includes(q[1])).map(q => q[0]).slice(0, 12));
  box.querySelector('.ebnone').onclick = () => setTo([]);
}

/* ---- rooms, wall lines, doorways ---- */
const ebWall = (x, y, w, h, rot) => { const o = R(Math.round(x), Math.round(y), Math.max(2, Math.round(w)), Math.max(2, Math.round(h)), ED.wallCol, ED.wallKind); if (rot) o.rot = Math.round(rot * 10) / 10; return o; };
function ebRoomWalls(ax, ay, bx, by) { // four walls round the box, the chosen side with a doorway in the middle
  const t = ED.wallT, w = bx - ax, h = by - ay, D = Math.min(EB.room.doorW, Math.max(0, (EB.room.door === 'n' || EB.room.door === 's' ? w : h) - t * 2 - 8)), out = [];
  const side = (k, x, y, len, horiz) => { if (EB.room.door !== k || D < 20) { out.push(horiz ? ebWall(x, y, len, t) : ebWall(x, y, t, len)); return; }
    const a = (len - D) / 2; if (a > 3) { out.push(horiz ? ebWall(x, y, a, t) : ebWall(x, y, t, a)); out.push(horiz ? ebWall(x + a + D, y, len - a - D, t) : ebWall(x, y + a + D, t, len - a - D)); } };
  side('n', ax, ay, w, true); side('s', ax, by - t, w, true); side('w', ax, ay + t, h - t * 2, false); side('e', bx - t, ay + t, h - t * 2, false);
  return out;
}
function ebSegWall(a, b) { // one straight run between two corners: a block as long as the run, turned to its angle, reaching a little past each corner so the joins close
  const t = ED.wallT, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 4) return null;
  const ang = Math.atan2(dy, dx) * 180 / Math.PI, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, len = L + t;
  const flat = Math.abs(((ang % 180) + 180) % 180) < .5 || Math.abs(((ang % 180) + 180) % 180 - 180) < .5, up = Math.abs(Math.abs(((ang % 180) + 180) % 180) - 90) < .5;
  if (flat) return ebWall(mx - len / 2, my - t / 2, len, t); if (up) return ebWall(mx - t / 2, my - len / 2, t, len);
  return ebWall(mx - len / 2, my - t / 2, len, t, ang);
}
function ebWlPoint(wx, wy, shift) { const pts = EB.wl && EB.wl.pts; let x = edSnap(wx), y = edSnap(wy);
  if (shift && pts && pts.length) { const [px, py] = pts[pts.length - 1], a = Math.round(Math.atan2(y - py, x - px) / (Math.PI / 4)) * Math.PI / 4, L = Math.hypot(x - px, y - py); x = Math.round(px + Math.cos(a) * L); y = Math.round(py + Math.sin(a) * L); }
  return [x, y]; }
function ebWlFinish(close) {
  const w = EB.wl; EB.wl = null; if (!w || w.pts.length < 2) return;
  const pts = close ? [...w.pts, w.pts[0]] : w.pts; edPush(); const n0 = ED.obs.length;
  for (let i = 0; i + 1 < pts.length; i++) { const o = ebSegWall(pts[i], pts[i + 1]); if (o) ED.obs.push(o); }
  ED.sel = ED.obs.slice(n0).map((_, k) => ({ t: 'o', i: n0 + k })); edDirty(); edPanel(); edToast(`${ED.obs.length - n0} wall${ED.obs.length - n0 === 1 ? '' : 's'}`);
}
function ebDoorAt(wx, wy) { // the wall under the cursor, and where along it the doorway would go
  for (let i = ED.obs.length - 1; i >= 0; i--) { const o = ED.obs[i]; if (!ebWallLike(o) || o._lock || o._hide) continue;
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2, a = -(o.rot || 0) * Math.PI / 180, lx = (wx - cx) * Math.cos(a) - (wy - cy) * Math.sin(a), ly = (wx - cx) * Math.sin(a) + (wy - cy) * Math.cos(a);
    if (Math.abs(lx) <= o.w / 2 + 3 && Math.abs(ly) <= o.h / 2 + 3) return { i, o, along: o.w >= o.h ? lx : ly }; }
  return null;
}
function ebCutDoor(hit) {
  const o = hit.o, horiz = o.w >= o.h, len = horiz ? o.w : o.h, D = Math.min(EB.room.doorW, len - 6); if (D < 16) return edToast('Too short for a doorway');
  const c = clamp(hit.along, -len / 2 + D / 2, len / 2 - D / 2), a0 = -len / 2, a1 = c - D / 2, b0 = c + D / 2, b1 = len / 2, r = (o.rot || 0) * Math.PI / 180, cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  const piece = (s0, s1) => { const L = s1 - s0; if (L < 3) return null; const m = (s0 + s1) / 2, ux = horiz ? m : 0, uy = horiz ? 0 : m, px = cx + ux * Math.cos(r) - uy * Math.sin(r), py = cy + ux * Math.sin(r) + uy * Math.cos(r);
    const q = edClone(o); if (horiz) { q.w = Math.round(L); q.x = Math.round(px - q.w / 2); q.y = Math.round(py - o.h / 2); } else { q.h = Math.round(L); q.y = Math.round(py - q.h / 2); q.x = Math.round(px - o.w / 2); } return q; };
  edPush(); const parts = [piece(a0, a1), piece(b0, b1)].filter(Boolean); ED.obs.splice(hit.i, 1, ...parts); ED.sel = []; edDirty(); edPanel(); edToast('Doorway cut');
}

/* ---- pointer, keys and drawing for the new tools ---- */
const _ebDown = edShapeDown, _ebMove = edShapeMove, _ebUp = edShapeUp, _ebOverlay = edShapeOverlay;
edShapeDown = function (e, sx, sy, wx, wy, dbl) {
  if (e.button === 0 && ED.tool === 'scatter') { edPush(); ED.drag = { k: 'scatter', erase: e.altKey, x: wx, y: wy, n: 0 }; ED.drag.n += ebScatter(wx, wy, e.altKey); return true; }
  if (e.button === 0 && ED.tool === 'room') { ED.drag = { k: 'room', x0: edSnap(wx), y0: edSnap(wy), x1: edSnap(wx), y1: edSnap(wy) }; return true; }
  if (e.button === 0 && ED.tool === 'wline') { const pt = ebWlPoint(wx, wy, e.shiftKey);
    if (!EB.wl) EB.wl = { pts: [pt] };
    else { const w = EB.wl, f = w.pts[0]; if (w.pts.length > 2 && Math.hypot(f[0] - pt[0], f[1] - pt[1]) < 12 / ED.z + 4) { ebWlFinish(true); return true; } if (dbl) { ebWlFinish(false); return true; } const l = w.pts[w.pts.length - 1]; if (Math.hypot(l[0] - pt[0], l[1] - pt[1]) > 2) w.pts.push(pt); }
    return true; }
  if (e.button === 0 && ED.tool === 'door') { const h = ebDoorAt(wx, wy); if (h) ebCutDoor(h); else edToast('Click a wall, fence or hedge'); return true; }
  return _ebDown(e, sx, sy, wx, wy, dbl);
};
edShapeMove = function (e, wx, wy) {
  const d = ED.drag;
  if (d && d.k === 'scatter') { if (Math.hypot(wx - d.x, wy - d.y) >= Math.max(8, EB.brush.r * .3)) { d.x = wx; d.y = wy; d.n += ebScatter(wx, wy, d.erase); } return true; }
  if (d && d.k === 'room') { d.x1 = edSnap(wx); d.y1 = edSnap(wy); return true; }
  if (ED.tool === 'door' && !d) EB.doorHover = ebDoorAt(wx, wy);
  return _ebMove(e, wx, wy);
};
edShapeUp = function () {
  const d = ED.drag;
  if (d && d.k === 'scatter') { ED.drag = null; edDirty(); edPanel(); edToast(d.n < 0 ? `Cleared ${-d.n}` : `Placed ${d.n}`); return true; }
  if (d && d.k === 'room') { ED.drag = null; const ax = Math.min(d.x0, d.x1), ay = Math.min(d.y0, d.y1), bx = Math.max(d.x0, d.x1), by = Math.max(d.y0, d.y1);
    if (bx - ax < ED.wallT * 3 || by - ay < ED.wallT * 3) { edToast('Drag a bigger box for a room'); return true; }
    edPush(); const n0 = ED.obs.length; for (const o of ebRoomWalls(ax, ay, bx, by)) ED.obs.push(o);
    if (EB.room.floor) { const t = ED.wallT, a = { poly: [[ax + t, ay + t], [bx - t, ay + t], [bx - t, by - t], [ax + t, by - t]], tex: EB.room.floor, sharp: true }; ED.areas.push(typeof polyBounds === 'function' ? polyBounds(a) : a); edFloor(true); }
    ED.sel = ED.obs.slice(n0).map((_, k) => ({ t: 'o', i: n0 + k })); edDirty(); edPanel(); edToast('Room built'); return true; }
  return _ebUp();
};
edShapeOverlay = function (x, px) {
  _ebOverlay(x, px);
  const m = ED.mouse && edW(...ED.mouse), d = ED.drag;
  if (ED.tool === 'scatter' && m) { const r = EB.brush.r; x.save(); x.lineWidth = 1.5 * px; x.strokeStyle = d && d.erase || (ED.ptrAlt) ? 'rgba(255,90,90,.9)' : 'rgba(150,230,140,.95)'; x.setLineDash([6 * px, 4 * px]); x.beginPath(); x.arc(m[0], m[1], r, 0, TAU); x.stroke(); x.setLineDash([]);
    x.globalAlpha = .12; x.fillStyle = x.strokeStyle; x.beginPath(); x.arc(m[0], m[1], r, 0, TAU); x.fill(); x.globalAlpha = .6; x.beginPath(); x.arc(m[0], m[1], Math.max(2, EB.brush.gap / 2), 0, TAU); x.stroke(); x.restore(); }
  if (d && d.k === 'room') { const ax = Math.min(d.x0, d.x1), ay = Math.min(d.y0, d.y1), bx = Math.max(d.x0, d.x1), by = Math.max(d.y0, d.y1); x.save();
    if (EB.room.floor) { x.globalAlpha = .45; x.fillStyle = x.createPattern(styleTile(EB.room.floor), 'repeat'); x.fillRect(ax, ay, bx - ax, by - ay); x.globalAlpha = 1; }
    x.fillStyle = 'rgba(255,77,106,.55)'; for (const o of ebRoomWalls(ax, ay, bx, by)) x.fillRect(o.x, o.y, o.w, o.h);
    x.fillStyle = '#fff'; x.font = `${11 * px}px sans-serif`; x.fillText(`${Math.round(bx - ax)} × ${Math.round(by - ay)}`, bx + 6 * px, by + 12 * px); x.restore(); }
  if (EB.wl && ED.tool === 'wline') { const pts = EB.wl.pts, mp = m ? ebWlPoint(m[0], m[1], ED.ptrShift) : null, all = mp ? [...pts, mp] : pts; x.save();
    x.strokeStyle = 'rgba(255,77,106,.6)'; x.lineWidth = ED.wallT; x.lineCap = 'square'; x.lineJoin = 'miter'; x.beginPath(); all.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke();
    x.strokeStyle = '#fff'; x.lineWidth = 1.2 * px; x.setLineDash([5 * px, 4 * px]); x.beginPath(); all.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); x.setLineDash([]);
    pts.forEach(([a, b], k) => { x.fillStyle = k === 0 && pts.length > 2 ? '#7aff9a' : '#fff'; x.beginPath(); x.arc(a, b, 4.5 * px, 0, TAU); x.fill(); });
    if (mp && pts.length) { const [a, b] = pts[pts.length - 1]; x.fillStyle = '#fff'; x.font = `${11 * px}px sans-serif`; x.fillText(`${Math.round(Math.hypot(mp[0] - a, mp[1] - b))}`, (a + mp[0]) / 2 + 6 * px, (b + mp[1]) / 2 - 6 * px); }
    x.restore(); }
  if (ED.tool === 'door' && EB.doorHover && m) { const h = EB.doorHover, o = h.o, horiz = o.w >= o.h, len = horiz ? o.w : o.h, D = Math.min(EB.room.doorW, len - 6), c = clamp(h.along, -len / 2 + D / 2, len / 2 - D / 2);
    x.save(); x.translate(o.x + o.w / 2, o.y + o.h / 2); x.rotate((o.rot || 0) * Math.PI / 180); x.strokeStyle = '#ffd34d'; x.lineWidth = 2 * px; x.strokeRect(-o.w / 2, -o.h / 2, o.w, o.h);
    x.fillStyle = 'rgba(122,255,154,.55)'; if (horiz) x.fillRect(c - D / 2, -o.h / 2 - 2, D, o.h + 4); else x.fillRect(-o.w / 2 - 2, c - D / 2, o.w + 4, D); x.restore(); }
};
const _ebKey = edKey;
edKey = function (e) {
  if (ED.open && e.type === 'keydown' && !(typeof PE !== 'undefined' && PE.active)) {
    const tag = (e.target.tagName || '').toLowerCase(), k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (tag !== 'input' && tag !== 'select' && tag !== 'textarea' && !mod && !e.altKey) {
      if (EB.wl && (k === 'enter' || k === 'escape')) { e.preventDefault(); e.stopPropagation(); if (k === 'enter') ebWlFinish(false); else EB.wl = null; return; }
      const t = !e.shiftKey && ({ j: 'scatter', i: 'wline', d: 'door' }[k] || (k === 'r' && !(ED.tool === 'prop' && ED.ghost) ? 'room' : null));
      if (t) { e.preventDefault(); e.stopPropagation(); edTool(t); edPanel(); return; }
      if ((k === '[' || k === ']' || k === '{' || k === '}') && (ED.tool === 'scatter' || ED.tool === 'door')) { e.preventDefault(); e.stopPropagation(); const up = k === ']' || k === '}';
        if (ED.tool === 'door') EB.room.doorW = clamp(EB.room.doorW + (up ? 8 : -8), 24, 240); else if (e.shiftKey || k === '{' || k === '}') EB.brush.gap = clamp(EB.brush.gap + (up ? 4 : -4), 0, 160); else EB.brush.r = clamp(Math.round(EB.brush.r * (up ? 1.15 : 1 / 1.15)), 20, 260);
        ebSaveBrush(); edToast(ED.tool === 'door' ? `Doorway ${EB.room.doorW}` : `Brush ${EB.brush.r} · spacing ${EB.brush.gap}`); edPanel(); return; }
    }
  }
  if (e.type === 'keydown' || e.type === 'keyup') { ED.ptrShift = e.shiftKey; ED.ptrAlt = e.altKey; }
  return _ebKey(e);
};
const _ebTool = edTool;
edTool = function (t, prop) { if (t !== 'wline') EB.wl = null; if (t !== 'door') EB.doorHover = null; return _ebTool(t, prop); };

/* ---- the panel: tool settings, and materials for walls and blocks ---- */
const _ebPanel = edPanel;
edPanel = function () {
  _ebPanel();
  const p = ED.root && ED.root.querySelector('.edpanel'); if (!p) return;
  if (ED.tool === 'scatter') return ebBrushPanel(p);
  if (ED.tool === 'room' || ED.tool === 'wline' || ED.tool === 'door') return ebBuildPanel(p);
  const objs = ED.sel.filter(s => s.t === 'o').map(edItem).filter(o => o && !o.poly && (o.t === 'r' || o.t === 'c')); if (!objs.length) return;
  const cur = objs.every(o => (o.mat || '') === (objs[0].mat || '')) ? objs[0].mat || '' : '__mixed', mats = edMaterialList();
  const box = document.createElement('div'); box.className = 'ebmat';
  box.innerHTML = `<h4>Material <small>${objs.length > 1 ? `on all ${objs.length}` : 'laid over it'}</small></h4><select class="ebmatsel" data-thumb="mat">${cur === '__mixed' ? '<option value="__mixed" selected>(mixed)</option>' : ''}<option value="">None (its own look)</option>${mats.map(([id, m]) => `<option value="${id}" ${id === cur ? 'selected' : ''}>${(m.name || id).replace(/</g, '&lt;')}</option>`).join('')}</select>
    <div class="edbtns"><button class="ebmatnew">New material…</button>${cur && cur !== '__mixed' ? '<button class="ebmated">Edit this one…</button>' : ''}</div>`;
  p.appendChild(box);
  const apply = id => { edPush(); for (const o of objs) { if (id) o.mat = id; else delete o.mat; } edDirty(); edPanel(); };
  box.querySelector('.ebmatsel').onchange = e => { if (e.target.value !== '__mixed') apply(e.target.value); };
  box.querySelector('.ebmatnew').onclick = () => openMaterialEditor(null, id => apply(id));
  const me = box.querySelector('.ebmated'); if (me) me.onclick = () => openMaterialEditor(cur, id => apply(id));
};
function ebBuildPanel(p) {
  const r = EB.room, box = document.createElement('div'); box.className = 'ebpanel';
  const tips = { room: 'Drag a box on the map: four walls go round it, with a doorway on the side you pick.', wline: 'Click corner after corner; double-click, <kbd>Enter</kbd> or the first point finishes. <kbd>Shift</kbd> keeps to 45° steps.', door: 'Click a wall, fence or hedge to cut a doorway where you click. <kbd>[</kbd> <kbd>]</kbd> change its width.' };
  box.innerHTML = `<h4>${{ room: 'Draw a room', wline: 'Wall line', door: 'Cut a doorway' }[ED.tool]}</h4><p class="edmuted">${tips[ED.tool]}</p>
    <div class="edrow"><label>Kind <select class="ebwk" data-thumb="kind">${['wall', 'fence', 'hedge', 'glass', 'building'].map(k => `<option value="${k}" ${k === ED.wallKind ? 'selected' : ''}>${(ED_PROPS.find(q => q[1] === k) || [k])[0]}</option>`).join('')}</select></label>
      <label>Thickness <input type="number" class="ebwt" value="${ED.wallT}" min="2" max="80"></label><label>Color <input type="color" class="ebwc" value="${edHex(ED.wallCol)}"></label></div>
    ${ED.tool !== 'wline' ? `<label class="edfield">Doorway width <input type="range" class="ebdw" min="24" max="240" step="4" value="${r.doorW}"><output>${r.doorW}</output></label>` : ''}
    ${ED.tool === 'room' ? `<h4>Doorway</h4><div class="peseg ebds">${[['n', 'Top'], ['e', 'Right'], ['s', 'Bottom'], ['w', 'Left'], ['', 'None']].map(([k, n]) => `<button data-d="${k}" class="${r.door === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <h4>Floor inside</h4><div class="ebfl">${[['', 'None'], ...Object.entries(FLOOR_TEX)].map(([k, n]) => `<button data-f="${k}" class="${r.floor === k ? 'on' : ''}" title="${n}"><canvas width="40" height="28"></canvas><span>${n}</span></button>`).join('')}</div>` : ''}`;
  p.prepend(box);
  box.querySelector('.ebwk').onchange = e => { ED.wallKind = e.target.value; const q = ED_PROPS.find(z => z[1] === ED.wallKind); if (q) { ED.wallCol = q[5]; ED.wallT = Math.min(q[3], q[4]) || 14; } edPanel(); };
  box.querySelector('.ebwt').onchange = e => { ED.wallT = clamp(+e.target.value || 14, 2, 80); };
  box.querySelector('.ebwc').oninput = e => { ED.wallCol = e.target.value; };
  const dw = box.querySelector('.ebdw'); if (dw) dw.oninput = () => { r.doorW = +dw.value; dw.nextElementSibling.textContent = dw.value; };
  box.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { r.door = b.dataset.d; box.querySelectorAll('[data-d]').forEach(c => c.classList.toggle('on', c === b)); });
  box.querySelectorAll('[data-f]').forEach(b => { const cv = b.querySelector('canvas'), x = cv.getContext('2d'); if (b.dataset.f) { x.fillStyle = x.createPattern(styleTile(b.dataset.f), 'repeat'); x.fillRect(0, 0, cv.width, cv.height); } else { x.strokeStyle = '#666'; x.setLineDash([3, 3]); x.strokeRect(2, 2, cv.width - 4, cv.height - 4); }
    b.onclick = () => { r.floor = b.dataset.f; box.querySelectorAll('[data-f]').forEach(c => c.classList.toggle('on', c === b)); }; });
}

/* ---- the whole floor as one material ---- */
const _ebBase = PICK_SETS.base;
PICK_SETS.base = () => [..._ebBase(), ...edMaterialList().map(([id, m]) => ({ v: 'mat:' + id, label: (m.name || id) + ' (material)', draw: cv => edMatPreview(cv, m) }))];

/* ---- pictures in dropdowns ---- */
const ebImg = new Map(); // creature and map pictures arrive as data URLs: drawn when they've loaded
function ebDrawUrl(cv, url) { if (!url) return; let im = ebImg.get(url); const go = () => { const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); const k = Math.min(cv.width / im.width, cv.height / im.height); x.drawImage(im, (cv.width - im.width * k) / 2, (cv.height - im.height * k) / 2, im.width * k, im.height * k); };
  if (!im) { im = new Image(); im.src = url; ebImg.set(url, im); } if (im.complete && im.width) go(); else im.addEventListener('load', go, { once: true }); }
Object.assign(DD_THUMBS, {
  mat: (cv, v) => { const m = v && v !== '__mixed' && getMaterial(v); if (m) edMatPreview(cv, m); else { const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); x.strokeStyle = '#777'; x.setLineDash([3, 3]); x.strokeRect(3, 3, cv.width - 6, cv.height - 6); } },
  kind: (cv, v) => { const p = (typeof kindSample === 'function' && kindSample(v)) || ED_PROPS.find(q => q[1] === v); if (p) drawPreview(cv, edSample(p, 0, 0)); },
  creature: (cv, v) => { if (TYPES[v] && typeof creatureIcon === 'function') ebDrawUrl(cv, creatureIcon(v)); },
  map: (cv, v) => { const i = +v; if (typeof thumbs !== 'undefined' && thumbs && thumbs[i]) ebDrawUrl(cv, thumbs[i]); else if (MAPS[i] && typeof mapThumb === 'function') { try { ebDrawUrl(cv, mapThumb(MAPS[i])); } catch (e) {} } },
});
Object.assign(DD_THUMB_CLASS, { pemat: 'mat', shfill: 'mat', shstroke: 'mat', sdfill: 'mat', ebmatsel: 'mat', edwk: 'kind', ebwk: 'kind', cmpt: 'creature', cmzt: 'creature', cmznew: 'creature', edmap: 'map' });
setTimeout(() => document.querySelectorAll('select').forEach(s => { if (s._dd) ddSync(s); }), 0); // the selects already on screen get their pictures

/* ---- the gizmo, redrawn: a slim ring with ticks and a grip to turn it by, outlined arrows, rounded scale knobs, a move puck in the middle; what's under the cursor lights up, and a pill reads out the angle, scale or distance ---- */
function ebGizmoPart(g, sx, sy) { const near = ([a, b], r = 11) => Math.hypot(sx - a, sy - b) < r;
  return near(g.parts.free, 10) ? 'free' : near(g.parts.mx, 14) || (Math.abs(sy - g.sy) < 7 && sx > g.sx + 10 && sx < g.sx + 86) ? 'mx' : near(g.parts.my, 14) || (Math.abs(sx - g.sx) < 7 && sy < g.sy - 10 && sy > g.sy - 86) ? 'my'
    : near(g.parts.sclx) ? 'sclx' : near(g.parts.scly) ? 'scly' : near(g.parts.scl) ? 'scl' : Math.abs(Math.hypot(sx - g.sx, sy - g.sy) - g.ring) < 7 ? 'rot' : null; }
function ebPill(x, text, px, py) { x.font = '600 12px system-ui, sans-serif'; const w = x.measureText(text).width + 14; x.fillStyle = 'rgba(14,12,18,.88)'; x.beginPath(); if (x.roundRect) x.roundRect(px, py - 11, w, 22, 11); else x.rect(px, py - 11, w, 22); x.fill(); x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1; x.stroke(); x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.fillText(text, px + 7, py + .5); }
edGizmoDraw = function (x) {
  const g = edGizmo(); if (!g) return; const d = devicePixelRatio || 1, drag = ED.drag && ED.drag.k === 'gizmo' ? ED.drag : null, act = drag ? drag.part : null;
  const hov = !drag && ED.mouse ? ebGizmoPart(g, ED.mouse[0], ED.mouse[1]) : null, on = k => act === k || hov === k;
  x.save(); x.setTransform(d, 0, 0, d, 0, 0); x.lineCap = 'round'; x.lineJoin = 'round';
  const RED = '#ff5b6e', GRN = '#4fd88a', GOLD = '#ffc94d';
  // the ring: a dark halo under a slim gold line, ticks every 15°, a grip at the top
  x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.arc(g.sx, g.sy, g.ring, 0, TAU); x.stroke();
  x.lineWidth = on('rot') ? 3 : 1.8; x.strokeStyle = on('rot') ? '#ffe28a' : 'rgba(255,201,77,.9)'; x.beginPath(); x.arc(g.sx, g.sy, g.ring, 0, TAU); x.stroke();
  for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12, L = k % 6 === 0 ? 8 : k % 2 === 0 ? 5 : 3; x.strokeStyle = `rgba(255,220,140,${k % 6 === 0 ? .8 : .45})`; x.lineWidth = k % 6 === 0 ? 1.6 : 1; x.beginPath(); x.moveTo(g.sx + Math.cos(a) * (g.ring - L), g.sy + Math.sin(a) * (g.ring - L)); x.lineTo(g.sx + Math.cos(a) * g.ring, g.sy + Math.sin(a) * g.ring); x.stroke(); }
  if (act === 'rot' && drag.ang != null) { const a1 = drag.a0 + drag.ang * Math.PI / 180; x.fillStyle = 'rgba(255,201,77,.16)'; x.beginPath(); x.moveTo(g.sx, g.sy); x.arc(g.sx, g.sy, g.ring, drag.a0, a1, drag.ang < 0); x.closePath(); x.fill();
    x.strokeStyle = GOLD; x.lineWidth = 2; x.beginPath(); x.moveTo(g.sx, g.sy); x.lineTo(g.sx + Math.cos(a1) * g.ring, g.sy + Math.sin(a1) * g.ring); x.stroke(); }
  const ga = act === 'rot' && drag.ang != null ? drag.a0 + drag.ang * Math.PI / 180 : -Math.PI / 2, kx = g.sx + Math.cos(ga) * g.ring, ky = g.sy + Math.sin(ga) * g.ring, kr = on('rot') ? 11 : 9;
  x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 6; x.fillStyle = on('rot') ? '#ffe28a' : GOLD; x.beginPath(); x.arc(kx, ky, kr, 0, TAU); x.fill(); x.shadowBlur = 0; x.shadowColor = 'transparent';
  x.strokeStyle = 'rgba(40,28,0,.85)'; x.lineWidth = 1.6; x.beginPath(); x.arc(kx, ky, kr * .5, -Math.PI * .1, Math.PI * 1.25); x.stroke(); x.fillStyle = 'rgba(40,28,0,.85)'; const ta = Math.PI * 1.25, tx = kx + Math.cos(ta) * kr * .5, ty = ky + Math.sin(ta) * kr * .5; x.beginPath(); x.moveTo(tx - 3, ty - 1); x.lineTo(tx + 2.5, ty - 2.5); x.lineTo(tx + .5, ty + 2.5); x.closePath(); x.fill(); // a turn arrow on the grip
  // move arrows: outlined shafts and heads
  const arrow = ([ex, ey], col, k) => { const a = Math.atan2(ey - g.sy, ex - g.sx), hot = on(k), sx0 = g.sx + Math.cos(a) * 14, sy0 = g.sy + Math.sin(a) * 14;
    x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = hot ? 7 : 6; x.beginPath(); x.moveTo(sx0, sy0); x.lineTo(ex, ey); x.stroke(); x.strokeStyle = hot ? '#fff' : col; x.lineWidth = hot ? 4 : 3; x.beginPath(); x.moveTo(sx0, sy0); x.lineTo(ex, ey); x.stroke();
    const H = hot ? 15 : 13; x.beginPath(); x.moveTo(ex + Math.cos(a) * H, ey + Math.sin(a) * H); x.lineTo(ex + Math.cos(a + 2.4) * 9, ey + Math.sin(a + 2.4) * 9); x.lineTo(ex + Math.cos(a - 2.4) * 9, ey + Math.sin(a - 2.4) * 9); x.closePath(); x.fillStyle = hot ? '#fff' : col; x.fill(); x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 1.2; x.stroke(); };
  const knob = ([cx, cy], col, k, round) => { const hot = on(k), r = hot ? 8 : 6.5; x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1.5; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(g.sx, g.sy); x.lineTo(cx, cy); x.stroke(); x.setLineDash([]);
    x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 5; x.fillStyle = hot ? '#fff' : col; x.beginPath(); if (round) x.arc(cx, cy, r + 1, 0, TAU); else if (x.roundRect) x.roundRect(cx - r, cy - r, r * 2, r * 2, 3); else x.rect(cx - r, cy - r, r * 2, r * 2); x.fill(); x.shadowBlur = 0; x.shadowColor = 'transparent';
    x.strokeStyle = 'rgba(0,0,0,.65)'; x.lineWidth = 1.2; x.stroke(); };
  knob(g.parts.sclx, RED, 'sclx'); knob(g.parts.scly, GRN, 'scly'); knob(g.parts.scl, '#f4f4f4', 'scl', true);
  { const [cx, cy] = g.parts.scl; x.strokeStyle = '#222'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(cx - 3.5, cy - 3.5); x.lineTo(cx + 3.5, cy + 3.5); x.moveTo(cx + 3.5, cy + .5); x.lineTo(cx + 3.5, cy + 3.5); x.lineTo(cx + .5, cy + 3.5); x.moveTo(cx - 3.5, cy - .5); x.lineTo(cx - 3.5, cy - 3.5); x.lineTo(cx - .5, cy - 3.5); x.stroke(); } // a diagonal double arrow: scale both ways
  arrow(g.parts.mx, RED, 'mx'); arrow(g.parts.my, GRN, 'my');
  // the move puck
  const hr = on('free') ? 11 : 9; x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 6; x.fillStyle = on('free') ? '#ffe28a' : GOLD; x.beginPath(); x.arc(g.sx, g.sy, hr, 0, TAU); x.fill(); x.shadowBlur = 0; x.shadowColor = 'transparent'; x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 1.2; x.stroke();
  x.strokeStyle = 'rgba(40,28,0,.9)'; x.lineWidth = 1.4; for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { const ex = g.sx + Math.cos(a) * hr * .62, ey = g.sy + Math.sin(a) * hr * .62; x.beginPath(); x.moveTo(g.sx, g.sy); x.lineTo(ex, ey); x.moveTo(ex - Math.cos(a - .9) * 2.6, ey - Math.sin(a - .9) * 2.6); x.lineTo(ex, ey); x.lineTo(ex - Math.cos(a + .9) * 2.6, ey - Math.sin(a + .9) * 2.6); x.stroke(); }
  // read-outs
  if (act === 'rot' && drag.ang != null) ebPill(x, `${drag.ang > 0 ? '+' : ''}${drag.ang}°`, kx + 14, ky);
  else if (drag && (act === 'scl' || act === 'sclx' || act === 'scly') && drag.scale) ebPill(x, `${Math.round(drag.scale * 100)}%`, g.sx + 18, g.sy + 26);
  else if (drag && (act === 'free' || act === 'mx' || act === 'my') && ED.mouse) { const dx = Math.round((ED.mouse[0] - drag.sx0) / ED.z), dy = Math.round((ED.mouse[1] - drag.sy0) / ED.z); ebPill(x, `${dx >= 0 ? '+' : ''}${act === 'my' ? 0 : dx}, ${dy >= 0 ? '+' : ''}${act === 'mx' ? 0 : dy}`, g.sx + 18, g.sy + 26); }
  else if (hov) ebPill(x, { rot: 'Turn', mx: 'Move across', my: 'Move up and down', sclx: 'Stretch across', scly: 'Stretch up and down', scl: 'Scale', free: 'Move' }[hov], (ED.mouse[0] || 0) + 14, (ED.mouse[1] || 0) + 18);
  x.restore();
};

/* ---- prop editor: a smaller "Before" that you can resize, and several parts at once ---- */
const _ebOpenPE = openPropEditor;
openPropEditor = function (kind) {
  PE.multi = new Set(); PE.multiPrev = null;
  _ebOpenPE(kind); if (!PE.box) return;
  const cmp = PE.box.querySelector('.pecmp'), bc = PE.box.querySelector('.pebefore'); if (!cmp || !bc) return;
  let sz = { w: 84, h: 63 }; try { Object.assign(sz, JSON.parse(localStorage.getItem('snakeEdBefore'))); } catch (e) {}
  bc.style.width = sz.w + 'px'; bc.style.height = sz.h + 'px'; cmp.classList.add('ebcmp');
  const grip = document.createElement('i'); grip.className = 'ebgrip'; grip.title = 'Drag to resize'; cmp.appendChild(grip);
  const fit = () => { const W0 = Math.round(parseFloat(bc.style.width) * (devicePixelRatio || 1)), H0 = Math.round(parseFloat(bc.style.height) * (devicePixelRatio || 1)); if (bc.width !== W0 || bc.height !== H0) { bc.width = W0; bc.height = H0; peDraw(); } };
  fit();
  grip.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); const x0 = e.clientX, y0 = e.clientY, w0 = parseFloat(bc.style.width), h0 = parseFloat(bc.style.height);
    const mv = ev => { const w = clamp(w0 - (ev.clientX - x0), 48, 320), h = clamp(h0 + (ev.clientY - y0), 36, 240); bc.style.width = w + 'px'; bc.style.height = h + 'px'; }; // (it sits in the top-right corner: it grows to the left and down)
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); fit(); try { localStorage.setItem('snakeEdBefore', JSON.stringify({ w: parseFloat(bc.style.width), h: parseFloat(bc.style.height) })); } catch (e) {} };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); };
  cmp.ondblclick = () => { cmp.classList.toggle('ebmin'); }; // double-click: tuck it away to a tab
};
const ebPeTargets = () => { const sh = (peGet().shapes || []); return [PE.selShape, ...(PE.multi || [])].filter((i, k, a) => i >= 0 && i < sh.length && a.indexOf(i) === k); };
const _ebPeSet = peSet;
peSet = function (p) { // with several parts picked, whatever changes on the one you're working on changes on all of them: moves and turns by the same amount, sizes by the same factor, everything else to the same value
  const i = PE.selShape, prev = PE.multiPrev, s = p.shapes && p.shapes[i];
  if (PE.multi && PE.multi.size && prev && s) {
    const keys = new Set([...Object.keys(s), ...Object.keys(prev)]), r2 = v => Math.round(v * 100) / 100;
    for (const k of keys) { if (JSON.stringify(s[k]) === JSON.stringify(prev[k])) continue;
      for (const j of PE.multi) { const q = p.shapes[j]; if (!q || j === i) continue;
        if (k === 'x' || k === 'y') q[k] = r2((q[k] || 0) + (s[k] || 0) - (prev[k] || 0));
        else if (k === 'rot') q.rot = (((r2((q.rot || 0) + (s.rot || 0) - (prev.rot || 0)) + 180) % 360 + 360) % 360) - 180;
        else if (k === 'w' || k === 'h' || k === 'sc') { const f = (s[k] ?? 1) / ((prev[k] ?? 1) || 1); q[k] = Math.max(.02, r2((q[k] ?? 1) * f)); }
        else if (s[k] === undefined) delete q[k]; else q[k] = edClone(s[k]); } }
  }
  _ebPeSet(p);
  PE.multiPrev = s ? edClone(s) : null;
};
const _ebPeSide = peSide;
peSide = function () {
  const sh = peGet().shapes || []; if (PE.multi) for (const j of [...PE.multi]) if (j >= sh.length || j === PE.selShape) PE.multi.delete(j);
  if (PE.selShape < 0 && PE.multi && PE.multi.size) { PE.selShape = [...PE.multi][0]; PE.multi.delete(PE.selShape); }
  _ebPeSide();
  PE.multiPrev = sh[PE.selShape] ? edClone(sh[PE.selShape]) : null;
  const el = PE.box && PE.box.querySelector('.peside'); if (!el) return;
  el.querySelectorAll('.peshapes [data-s]').forEach(b => { const i = +b.dataset.s; b.classList.toggle('multi', !!(PE.multi && PE.multi.has(i)));
    b.onclick = e => { if (e.shiftKey && PE.selShape >= 0 && i !== PE.selShape) { PE.multi.has(i) ? PE.multi.delete(i) : PE.multi.add(i); } else { PE.multi.clear(); PE.selShape = i; } peSide(); peDraw(); }; });
  const list = el.querySelector('.peshapes'); if (!list || !sh.length) return;
  const n = ebPeTargets().length, bar = document.createElement('div'); bar.className = 'pemulti';
  bar.innerHTML = `<span>${n > 1 ? `<b>${n} parts</b> picked: changes go to all of them` : '<kbd>Shift</kbd>+click parts (here or in the preview) to change several at once'}</span>
    <div class="edbtns"><button data-pm="all">All</button><button data-pm="col" ${PE.selShape < 0 ? 'disabled' : ''}>Same colour</button><button data-pm="type" ${PE.selShape < 0 ? 'disabled' : ''}>Same type</button>${n > 1 ? '<button data-pm="one">Just this one</button><button data-pm="del" class="warn">Delete them</button>' : ''}</div>`;
  list.before(bar);
  bar.querySelectorAll('[data-pm]').forEach(b => b.onclick = () => { const q = peGet(), S = q.shapes || [], cur = S[PE.selShape], k = b.dataset.pm;
    if (k === 'all') { if (PE.selShape < 0) PE.selShape = 0; PE.multi = new Set(S.map((_, i) => i).filter(i => i !== PE.selShape)); }
    if (k === 'col' && cur) PE.multi = new Set(S.map((s, i) => edHex(s.c || '#000') === edHex(cur.c || '#000') && i !== PE.selShape ? i : -1).filter(i => i >= 0));
    if (k === 'type' && cur) PE.multi = new Set(S.map((s, i) => s.type === cur.type && i !== PE.selShape ? i : -1).filter(i => i >= 0));
    if (k === 'one') PE.multi.clear();
    if (k === 'del') { const kill = new Set(ebPeTargets()); q.shapes = S.filter((_, i) => !kill.has(i)); PE.multi.clear(); PE.selShape = -1; PE.multiPrev = null; _ebPeSet(q); }
    peSide(); peDraw(); });
};
const _ebPeDown = peDown;
peDown = function (e) {
  if (e.shiftKey && e.button === 0 && PE.selShape >= 0) { const sh = peGet().shapes || [], { v, ux, uy } = qolPeUV(e), i = qolPeShapeAt(v, ux, uy, sh); // Shift+click: add a part to (or take it out of) what you're changing
    if (i >= 0 && i !== PE.selShape) { PE.multi.has(i) ? PE.multi.delete(i) : PE.multi.add(i); peSide(); peDraw(); return; } }
  if (!e.shiftKey) { const sh = peGet().shapes || [], { v, ux, uy } = qolPeUV(e), i = qolPeShapeAt(v, ux, uy, sh); if (i >= 0 && !(PE.multi && PE.multi.has(i)) && i !== PE.selShape) PE.multi && PE.multi.clear(); } // a plain click on a part not in the pick starts over
  return _ebPeDown(e);
};
const _ebPeDraw = peDraw;
peDraw = function () {
  _ebPeDraw(); if (!PE.box || !PE.multi || !PE.multi.size) return;
  const sh = peGet().shapes || [], v = peView(), x = v.c.getContext('2d'); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.strokeStyle = '#ffc94d'; x.lineWidth = 1.6; x.setLineDash([5, 3]);
  for (const j of PE.multi) { const s = sh[j]; if (!s) continue; const H = qolPeHandles(v, s); x.beginPath(); H.forEach((h, k) => k ? x.lineTo(h.x, h.y) : x.moveTo(h.x, h.y)); x.closePath(); x.stroke(); }
  x.restore();
};
const _ebPeKey = peKey;
peKey = function (e) {
  if (PE.active && PE.box && PE.box.isConnected && e.type === 'keydown' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && !/^(input|textarea)$/i.test((e.target.tagName || ''))) { // Ctrl+A: every part
    const S = peGet().shapes || []; if (S.length) { e.preventDefault(); if (PE.selShape < 0) PE.selShape = 0; PE.multi = new Set(S.map((_, i) => i).filter(i => i !== PE.selShape)); peSide(); peDraw(); return true; } }
  return _ebPeKey(e);
};

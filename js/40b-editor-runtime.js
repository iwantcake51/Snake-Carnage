/* =========================================================
   EDITOR RUNTIME: the parts of the map and prop editors the GAME needs, without the editor itself.
   - prop definitions (recolors, extra or replacement shapes, materials per piece, custom props with their own
     collision and interaction geometry and pivot) applied to every obstacle drawn or collided with;
   - play tests started from the editor (quitting goes back to it);
   - the "Map editor" entry: desktop only. The editor's code (js/editor/*) is only fetched when you open it,
     so the normal game never loads or initializes it, and phones never do at all.
   ========================================================= */
const ED = { open: false }; // the editor's state lives here once it's loaded (js/editor/ed-core.js)
/* ---- prop definitions (see the prop editor) ---- */
const RAM_DEFAULT = { touch: [...RAM_TOUCH], small: [...RAM_SMALL], large: [...RAM_LARGE], heavy: [...RAM_HEAVY] };
function propApply() { // rebuild the Battering Ram's lists from the defaults plus every kind's setting
  const d = propDefs(), lists = { touch: RAM_TOUCH, small: RAM_SMALL, large: RAM_LARGE, heavy: RAM_HEAVY };
  for (const [k, arr] of Object.entries(lists)) { arr.length = 0; arr.push(...RAM_DEFAULT[k]); }
  for (const [kind, p] of Object.entries(d)) if (p.breakable && p.breakable !== 'default') { for (const arr of Object.values(lists)) { const i = arr.indexOf(kind); if (i >= 0) arr.splice(i, 1); } if (lists[p.breakable]) lists[p.breakable].push(kind); }
  TOUCH_KINDS.clear(); for (const k of RAM_TOUCH) TOUCH_KINDS.add(k);
  RAM_KINDS[1] = new Set(RAM_SMALL); RAM_KINDS[2] = new Set([...RAM_SMALL, ...RAM_LARGE]); RAM_KINDS[3] = RAM_KINDS[4] = new Set([...RAM_SMALL, ...RAM_LARGE, ...RAM_HEAVY]);
  propCache = d;
}
const breakClass = kind => RAM_DEFAULT.touch.includes(kind) ? 'touch' : RAM_DEFAULT.heavy.includes(kind) ? 'heavy' : RAM_DEFAULT.large.includes(kind) ? 'large' : RAM_DEFAULT.small.includes(kind) ? 'small' : 'never';
function propShapePath(x, s, w, h) { // one piece's outline, centred on 0,0
  x.beginPath();
  if (s.type === 'rect') x.rect(-w / 2, -h / 2, w, h);
  else if (s.type === 'circle') x.arc(0, 0, Math.min(w, h) / 2, 0, TAU);
  else if (s.type === 'ellipse') x.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU);
  else if (s.type === 'poly' && s.pts) { s.pts.forEach(([u, v], k) => { const px = (u - .5) * w, py = (v - .5) * h; k ? x.lineTo(px, py) : x.moveTo(px, py); }); if (s.closed !== false) x.closePath(); }
  else if (s.type === 'triangle') { x.moveTo(0, -h / 2); x.lineTo(w / 2, h / 2); x.lineTo(-w / 2, h / 2); x.closePath(); }
  else if (s.type === 'line') { x.moveTo(-w / 2, 0); x.lineTo(w / 2, 0); }
  else if (s.type === 'ring') x.arc(0, 0, Math.min(w, h) / 2, 0, TAU);
  else if (s.type === 'cross') { x.moveTo(-w / 2, 0); x.lineTo(w / 2, 0); x.moveTo(0, -h / 2); x.lineTo(0, h / 2); }
}
const STROKE_SHAPES = new Set(['line', 'ring', 'cross']);
function drawPropShapes(x, o, shapes) { // pieces live in the object's box: 0..1 across and down; each has its own color or material, order = layering
  const [x0, y0, x1, y1] = o.t === 'r' ? [o.x, o.y, o.x + o.w, o.y + o.h] : [o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r], bw = x1 - x0, bh = y1 - y0;
  const list = shapes.some(s => s.z) ? shapes.slice().sort((a, b) => (a.z || 0) - (b.z || 0)) : shapes;
  for (const s of list) {
    if (s.off) continue;
    const cx = x0 + s.x * bw, cy = y0 + s.y * bh, k = s.sc || 1, w = Math.max(.5, s.w * bw * k), h = Math.max(.5, s.h * bh * k);
    x.save(); x.globalAlpha *= s.a ?? 1; x.translate(cx, cy); x.rotate((s.rot || 0) * Math.PI / 180);
    const mat = s.mat && getMaterial(s.mat), col = (s.base && propCache[o.kind] && propCache[o.kind].color) || s.c || '#ffffff';
    x.fillStyle = x.strokeStyle = mat ? matStroke(x, mat) : col; x.lineWidth = Math.max(.5, (s.lw ?? .08) * Math.min(bw, bh)); x.lineCap = 'round'; x.lineJoin = 'round';
    propShapePath(x, s, w, h);
    if (STROKE_SHAPES.has(s.type) || (s.type === 'poly' && s.stroke)) x.stroke();
    else if (mat) paintMaterial(x, mat, [-w / 2, -h / 2, w / 2, h / 2], T);
    else x.fill();
    x.restore();
  }
}
/* where an object turns about: its centre, or a custom prop's own pivot (0..1 in its box) */
function objPivot(o) { const p = propCache[o.kind], pv = p && p.pivot; if (o.t !== 'r') return [o.x, o.y]; return pv ? [o.x + o.w * pv[0], o.y + o.h * pv[1]] : [o.x + o.w / 2, o.y + o.h / 2]; }
const _drawObstacle = drawObstacle;
drawObstacle = function (x, o) { // every obstacle drawing goes through here, so a kind's changes show everywhere
  if (o && o.rot && !o.poly && o.rot % 360) { // turned: draw it upright about its pivot, inside a rotated frame
    const [cx, cy] = objPivot(o);
    x.save(); x.translate(cx, cy); x.rotate(o.rot * Math.PI / 180); x.translate(-cx, -cy); try { drawObstacleUpright(x, o); } finally { x.restore(); } return;
  }
  return drawObstacleUpright(x, o);
};
function drawObstacleUpright(x, o) {
  if (o && o.kind === 'shape' && o.shp) { drawVecShape(x, o.shp, 0); return; } // a wall drawn with the shape tools, in its own materials
  const p = o && propCache[o.kind];
  if (!p) return _drawObstacle(x, o);
  const q = p.color ? { ...o, color: p.color } : o;
  if (!p.hideBase && !p.custom) _drawObstacle(x, q);
  else if (p.shapes && p.shapes.length === 0) { x.fillStyle = q.color; o.t === 'r' ? x.fillRect(o.x, o.y, o.w, o.h) : circ(x, o.x, o.y, o.r); }
  if (p.shapes && p.shapes.length) drawPropShapes(x, o, p.shapes);
}
/* collision separate from the drawing: a kind's hit geometry (box, circle or polygon, 0..1 in its box), turned with it.
   Returns the outline in world space, 'none' (walk through it), or null (use the object's own box or circle). */
function propHitPoly(o, which = 'hit') {
  const p = propCache[o.kind], g = p && p[which]; if (!g || !g.type) return null;
  if (g.type === 'none') return 'none';
  const key = `${o.x},${o.y},${o.w},${o.h},${o.r},${o.rot},${JSON.stringify(g)}`, slot = which === 'hit' ? '_hp' : '_ip';
  if (o[slot] && o[slot].k === key) return o[slot].P;
  const [x0, y0, bw, bh] = o.t === 'r' ? [o.x, o.y, o.w, o.h] : [o.x - o.r, o.y - o.r, o.r * 2, o.r * 2], U = (u, v) => [x0 + u * bw, y0 + v * bh];
  let P;
  if (g.type === 'poly' && g.pts && g.pts.length > 2) P = g.pts.map(([u, v]) => U(u, v));
  else if (g.type === 'circle') { P = []; for (let k = 0; k < 20; k++) { const a = k / 20 * TAU; P.push(U(g.x + Math.cos(a) * g.w / 2, g.y + Math.sin(a) * g.h / 2)); } }
  else P = [U(g.x - g.w / 2, g.y - g.h / 2), U(g.x + g.w / 2, g.y - g.h / 2), U(g.x + g.w / 2, g.y + g.h / 2), U(g.x - g.w / 2, g.y + g.h / 2)];
  if (o.rot && o.rot % 360) { const [cx, cy] = objPivot(o), a = o.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); P = P.map(([px, py]) => [cx + (px - cx) * c - (py - cy) * s, cy + (px - cx) * s + (py - cy) * c]); }
  Object.defineProperty(o, slot, { value: { k: key, P }, enumerable: false, configurable: true, writable: true });
  return P;
}
propApply();
/* ---- play tests: Quit and Menu go back to the editor, Retry stays a play test ---- */
const _edStart = startGame;
startGame = function (opts = {}) { if (edTesting !== null && !opts.test && !opts.mystery) opts = { ...opts, test: true }; return _edStart.call(this, opts); };
const _edToMenu = returnToMenu;
returnToMenu = function () { if (edTesting !== null) ED.leaving = true; return _edToMenu.apply(this, arguments); };
for (const [fn, id, label] of [['showPause', 'pMenuBtn', 'Back to editor'], ['showDead', 'menuBtn2', 'Editor']]) {
  const orig = window[fn];
  window[fn] = function () { const r = orig.apply(this, arguments); if (edTesting !== null) { const b = document.getElementById(id); if (b) b.textContent = label; } return r; };
}
try { if (!localStorage.getItem('snakeCarnageEdDrafts') && localStorage.getItem('snakeCarnageMapEdits')) localStorage.setItem('snakeCarnageEdDrafts', localStorage.getItem('snakeCarnageMapEdits')); } catch (e) {} // edits from before drafts existed
/* ---- the editor itself: desktop only, loaded on demand ---- */
const EDITOR_FILES = ['js/editor/ed-core.js', 'js/editor/ed-shapes.js', 'js/editor/ed-materials.js', 'js/editor/ed-custom.js'];
let edLoading = null;
const editorAllowed = () => { try { return !IS_TOUCH && !document.body.classList.contains('touch') && matchMedia('(pointer: fine)').matches && innerWidth >= 900; } catch (e) { return false; } };
function loadEditor() { // the editor's scripts, fetched once, in order
  if (typeof openEditor === 'function') return Promise.resolve();
  return edLoading || (edLoading = EDITOR_FILES.reduce((p, src) => p.then(() => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src + '?v=' + GAME_VERSION; s.onload = res; s.onerror = () => rej(new Error('could not load ' + src)); document.head.appendChild(s); })), Promise.resolve()).catch(e => { edLoading = null; throw e; }));
}
function desktopOnly() { // shown instead of the editor on phones and tablets (and when the window is too small)
  if (document.getElementById('edDesk')) return;
  const m = document.createElement('div'); m.id = 'edDesk';
  m.innerHTML = `<div class="edDeskBox"><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/></svg><h2>The map editor needs a computer</h2><p>It's built for a mouse, a keyboard and a big screen, so it isn't available on phones and tablets. Open the game on a desktop or laptop to make maps. Maps you make there play here too.</p><button class="btn" id="edDeskOk">Back to the game</button></div>`;
  document.body.appendChild(m); m.querySelector('#edDeskOk').onclick = () => { m.remove(); if (location.hash === '#editor') history.replaceState(null, '', location.pathname); };
}
function startEditor(i = mapIdx) {
  if (!editorAllowed()) return desktopOnly();
  loadEditor().then(() => openEditor(i)).catch(e => { console.error(e); notify({ kind: 'bad', title: "The map editor couldn't load", dur: 3 }); });
}
const _edShowMenu = showMenu;
showMenu = function () {
  _edShowMenu.apply(this, arguments);
  if (edTesting !== null && state === 'menu' && !ED.open && ED.leaving) { const i = edTesting; edTesting = null; ED.leaving = false; const was = edTestData; openEditor(i); if (was) { ED.dirtySave = ED.unshared = true; edStatus('Back from the play test: your unsaved changes are still here (Ctrl+S to save)'); } return; }
  if (edTesting === null) edTestData = null;
  const row = document.getElementById('setBtn'); if (!row || document.getElementById('edBtn') || !editorAllowed()) return; // no editor entry at all on touch screens
  const b = document.createElement('button'); b.className = 'ghost'; b.id = 'edBtn'; b.dataset.sfx = 'open'; b.textContent = 'Map editor';
  b.onclick = () => startEditor(mapIdx); row.parentElement.appendChild(b);
};
addEventListener('load', () => { if (/^#editor\b/.test(location.hash)) setTimeout(() => startEditor(mapIdx), 50); }); // editor.html sends desktops here

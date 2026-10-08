/* =========================================================
   EDITABLE PATHS AND WATER
   Paths: a list of control points smoothed into a curve, a width and a style. All paths of one style are painted
   together as a single merged shape, so crossings and junctions read as one continuous trail. Textures are laid in
   world space (never stretched), so they keep the same scale however a path is bent or widened.
   Water: a closed polygon of control points, smoothed; stored as a 'water' obstacle with a bounding box (x, y, w, h)
   plus poly. Collision, outlines and the water shader use the real shape.
   ========================================================= */
const PATH_STYLES = { dirt: 'Dirt trail', park: 'Park path', gravel: 'Gravel', paved: 'Paving', sand: 'Sand', asphalt: 'Asphalt', road: 'Road (lined)' };
const FLOOR_TEX = { grass: 'Grass', dirt: 'Dirt', sand: 'Sand', gravel: 'Gravel', paved: 'Paving slabs', concrete: 'Concrete', asphalt: 'Asphalt', tiles: 'Floor tiles', carpet: 'Carpet', wood: 'Wood boards', metal: 'Metal plates', snow: 'Snow', mud: 'Mud', red: 'Mars soil', moon: 'Moon dust' };
/* ---- captured paths: maps paint their trails with dirtTrails; the editor picks them up as editable paths ---- */
let trailCap = null, trailMute = false, trailExt = false;
const _dirtTrails = dirtTrails;
dirtTrails = function (x, list) {
  if (trailCap) { const m = x.getTransform(), d = DPR || 1;
    for (const [pts, w, seed] of list) trailCap.push({ pts: pts.map(([a, b]) => [Math.round((m.a * a + m.c * b + m.e) / d * 10) / 10, Math.round((m.b * a + m.d * b + m.f) / d * 10) / 10]), w, seed, style: 'dirt', ext: trailExt }); }
  if (trailMute) return;
  return _dirtTrails(x, list);
};
function captureTrails(b) { // the map's own painted trails, in world coordinates; carried-on copies replace the pieces they contain
  const c = document.createElement('canvas'); c.width = c.height = 1; const x = c.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0);
  trailCap = []; trailMute = true; try { b.floor(x); } catch (e) {} finally { trailMute = false; }
  const all = trailCap; trailCap = null;
  const ext = all.filter(t => t.ext), near = (p, q) => Math.abs(p[0] - q[0]) < 1.5 && Math.abs(p[1] - q[1]) < 1.5;
  const seen = new Set(); // each strip repaints the carried-on trails: keep one copy of each
  return all.filter(t => t.ext || !ext.some(e => t.pts.every(p => e.pts.some(q => near(p, q))))).filter(t => { const k = JSON.stringify(t.pts); if (seen.has(k)) return false; seen.add(k); return true; }).map(({ ext, ...t }) => t);
}
/* ---- painting ---- */
const tileCache = {};
function styleTile(style) { // a small seamless tile per style, used as a world-anchored pattern
  if (tileCache[style]) return tileCache[style];
  const s = 48, c = document.createElement('canvas'); c.width = c.height = s; const x = c.getContext('2d'), r = seeded(style.length * 977);
  const base = { park: '#dcc493', gravel: '#a8a39a', paved: '#c9c1b0', sand: '#e2cf9a', asphalt: '#4a4a50', road: '#45454c', grass: '#9cc84e', dirt: '#a07c4c', concrete: '#9a978f', tiles: '#d9d4c8', carpet: '#5f7fa8', wood: '#8a6440', metal: '#5a616c', snow: '#eef2f6', mud: '#5e4630', red: '#b0532c', moon: '#8b8e94' }[style] || '#b79a68';
  x.fillStyle = base; x.fillRect(0, 0, s, s);
  const dots = (n, cols, sz) => { for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; const px = r() * s, py = r() * s, z = sz * (.6 + r() * .8); for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) x.fillRect(px + ox, py + oy, z, z); } };
  if (style === 'paved') { x.strokeStyle = 'rgba(120,110,95,.45)'; x.lineWidth = 1; for (let j = 0; j < s; j += 16) { x.beginPath(); x.moveTo(0, j + .5); x.lineTo(s, j + .5); x.stroke(); const off = (j / 16) % 2 ? 12 : 0; for (let i = off; i < s; i += 24) { x.beginPath(); x.moveTo(i + .5, j); x.lineTo(i + .5, j + 16); x.stroke(); } } dots(40, ['rgba(255,255,255,.12)', 'rgba(0,0,0,.06)'], 1.4); }
  else if (style === 'gravel') dots(260, ['#8e8a82', '#bdb8ae', '#6f6b64', '#cfcac0'], 1.8);
  else if (style === 'sand') { dots(160, ['#d4bf86', '#ecdcb0', '#c9b27a'], 1.2); x.strokeStyle = 'rgba(180,150,90,.25)'; for (let j = 6; j < s; j += 12) { x.beginPath(); for (let i = 0; i <= s; i += 4) x.lineTo(i, j + Math.sin(i / s * TAU * 2) * 2); x.stroke(); } }
  else if (style === 'asphalt') dots(220, ['#3e3e44', '#55555c', '#46464c'], 1.2);
  else if (style === 'asphalt' || style === 'road') dots(220, ['#3e3e44', '#55555c', '#46464c'], 1.2);
  else if (style === 'grass') { x.fillStyle = '#a7d455'; x.fillRect(0, 0, 24, 24); x.fillRect(24, 24, 24, 24); dots(70, ['#8fbe45', '#b4dc68'], 1.6); }
  else if (style === 'dirt' || style === 'mud' || style === 'red' || style === 'moon') dots(150, style === 'mud' ? ['#4a3624', '#6e5638'] : style === 'red' ? ['#c86a3a', '#8e3a1a'] : style === 'moon' ? ['#a2a5ab', '#74777d'] : ['#8c6a3e', '#b8945e', '#7a5a34'], 1.6);
  else if (style === 'concrete') { dots(160, ['#8e8b84', '#a7a49c'], 1.1); x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, 0, s, 1); x.fillRect(0, 0, 1, s); }
  else if (style === 'tiles') { x.fillStyle = '#d2ccbf'; x.fillRect(0, 0, 24, 24); x.fillRect(24, 24, 24, 24); x.fillStyle = 'rgba(0,0,0,.12)'; for (const v of [0, 24]) { x.fillRect(v, 0, 1, s); x.fillRect(0, v, s, 1); } }
  else if (style === 'carpet') { x.fillStyle = 'rgba(0,0,0,.06)'; for (let j = 0; j < s; j += 6) x.fillRect(0, j, s, 3); }
  else if (style === 'wood') { x.fillStyle = 'rgba(0,0,0,.18)'; for (let j = 0; j < s; j += 12) { x.fillRect(0, j, s, 1); const o2 = (j / 12) % 2 ? 30 : 8; x.fillRect(o2, j, 1, 12); } dots(40, ['rgba(60,35,15,.25)'], 2); }
  else if (style === 'metal') { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 0, s, 1); x.fillRect(0, 0, 1, s); x.fillStyle = 'rgba(255,255,255,.18)'; for (const [a, b] of [[4, 4], [44, 4], [4, 44], [44, 44]]) x.fillRect(a, b, 1.5, 1.5); }
  else if (style === 'snow') dots(80, ['#ffffff', '#dfe6ee'], 1.6);
  else dots(90, ['#cdb487', '#c9ad78', '#e6d3a6'], 1.6); // park
  return tileCache[style] = c;
}
const EDGE_COL = { park: '#c9ad78', gravel: '#7f7a70', paved: '#9a9282', sand: '#cbb47c', asphalt: '#8e887c', road: '#8e887c' };
function paintTrails(x, trails) { // every style merged into one shape, textured in world space
  const dirt = trails.filter(t => (t.style || 'dirt') === 'dirt');
  if (dirt.length) _dirtTrails(x, dirt.map((t, i) => [t.pts, t.w, t.seed || 30 + i]));
  for (const style of Object.keys(PATH_STYLES)) {
    if (style === 'dirt') continue; const list = trails.filter(t => t.style === style); if (!list.length) continue;
    const m = x.getTransform(), cw = Math.ceil(W * DPR), ch = Math.ceil(H * DPR);
    const mk = () => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.lineCap = 'round'; g.lineJoin = 'round'; return [c, g]; };
    const [ec, ex] = mk(), [fc, fx] = mk();
    const line = (g, P) => { g.beginPath(); P.forEach(([a, b], k) => k ? g.lineTo(a, b) : g.moveTo(a, b)); g.stroke(); };
    for (const t of list) { const P = trailPoints(t.pts); ex.strokeStyle = '#000'; ex.lineWidth = t.w + 6; line(ex, P); fx.strokeStyle = '#000'; fx.lineWidth = t.w; line(fx, P); } // union masks: overlaps merge
    ex.globalCompositeOperation = 'source-in'; ex.fillStyle = EDGE_COL[style]; ex.fillRect(0, 0, W, H);
    fx.globalCompositeOperation = 'source-in'; fx.fillStyle = fx.createPattern(styleTile(style), 'repeat'); fx.fillRect(0, 0, W, H); // pattern anchored at world 0,0
    if (style === 'road') { fx.globalCompositeOperation = 'source-atop'; fx.strokeStyle = '#e8d06a'; fx.lineWidth = 3; fx.setLineDash([22, 18]); fx.lineCap = 'butt'; for (const t of list) if (t.w >= 30) line(fx, trailPoints(t.pts)); fx.setLineDash([]); } // centre line
    x.save(); x.setTransform(m.a / DPR, m.b / DPR, m.c / DPR, m.d / DPR, m.e, m.f); x.globalAlpha = style === 'asphalt' ? 1 : .55; x.drawImage(ec, 0, 0); x.globalAlpha = 1; x.drawImage(fc, 0, 0); x.restore(); freeCanvas(ec, fc);
  }
}
/* ---- polygons (water) ---- */
function smoothClosed(pts, seg = 6) { // closed Catmull-Rom through the control points
  const n = pts.length, out = []; if (n < 3) return pts.slice();
  for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < seg; k++) { const t = k / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } }
  return out;
}
function polyShape(o) { // the smoothed outline, cached until the points change
  const key = o.poly.map(p => p.join(',')).join(';') + (o.sharp ? 's' : '');
  if (o._pk !== key) Object.defineProperty(o, '_ps', { value: o.sharp ? o.poly.slice() : smoothClosed(o.poly), enumerable: false, configurable: true, writable: true }), Object.defineProperty(o, '_pk', { value: key, enumerable: false, configurable: true, writable: true });
  return o._ps;
}
function pointInPoly(P, x, y) { let inside = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } return inside; }
function polyBounds(o) { const P = polyShape(o), xs = P.map(p => p[0]), ys = P.map(p => p[1]); o.x = Math.min(...xs) - 6; o.y = Math.min(...ys) - 6; o.w = Math.max(...xs) - o.x + 6; o.h = Math.max(...ys) - o.y + 6; return o; }
function polyPath(x, o) { const P = polyShape(o); x.beginPath(); P.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); }
function makeWater(pts) { return polyBounds({ t: 'r', kind: 'water', color: '#4aa3df', poly: pts.map(p => [p[0], p[1]]) }); }

/* ---- floor areas: any shape, filled with a ground texture laid in world space ---- */
function paintAreas(x, areas) {
  for (const a of areas) { if (!a.poly || a.poly.length < 3 || a._hide) continue; const P = a.sharp ? a.poly : smoothClosed(a.poly);
    x.save(); x.beginPath(); P.forEach(([u, v], k) => k ? x.lineTo(u, v) : x.moveTo(u, v)); x.closePath();
    x.fillStyle = x.createPattern(styleTile(a.tex || 'grass'), 'repeat'); x.fill();
    if (a.edge !== false) { x.clip(); x.lineWidth = 4; x.strokeStyle = 'rgba(0,0,0,.14)'; x.stroke(); } x.restore(); }
}
function paintBase(x, tex) { if (tex === 'none') return; /* no floor at all: just the map's edge color shows */ x.save(); x.fillStyle = x.createPattern(styleTile(tex), 'repeat'); x.fillRect(0, 0, W, H); x.restore(); }
